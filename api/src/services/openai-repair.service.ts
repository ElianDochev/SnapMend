import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import OpenAI from 'openai';
import type { ResponseInputContent } from 'openai/resources/responses/responses';
import { z } from 'zod';
import type { AppEnv } from '../config/env';
import { getAppEnv } from '../config/env';
import type {
  GeneratedProductRecommendations,
  GeneratedRepairPlan,
} from '../types/openai-analysis';
import type { JsonSchema } from '../types/json-schema';

type AnalyzeWithOpenAiInput = {
  title: string;
  description?: string;
  transcript?: string;
  image?: Express.Multer.File;
};

const PRODUCT_SEARCH_TIMEOUT_MS = 25_000;

const repairPlanSchema = z.object({
  issueEvidence: z.object({
    fromImage: z.string().min(1),
    fromUserDescription: z.string().min(1),
    fromVoiceTranscript: z.string().min(1).nullable().optional(),
  }),
  diagnosis: z.string().min(1),
  safetyWarning: z.string().min(1),
  steps: z.array(z.string().min(1)).min(1),
  materials: z.array(z.string().min(1)).min(1),
  costEstimate: z.string().min(1),
  nextAction: z.string().min(1),
});

const productRecommendationsSchema = z.object({
  productRecommendations: z
    .array(
      z.object({
        item: z.string().min(1),
        whyItIsNeeded: z.string().min(1),
        searchSummary: z.string().min(1),
        options: z
          .array(
            z.object({
              title: z.string().min(1),
              storeName: z.string().min(1),
              productUrl: z.string().url(),
            }),
          )
          .min(1),
      }),
    )
    .min(2),
});

const repairPlanJsonSchema: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'issueEvidence',
    'diagnosis',
    'safetyWarning',
    'steps',
    'materials',
    'costEstimate',
    'nextAction',
  ],
  properties: {
    issueEvidence: {
      type: 'object',
      additionalProperties: false,
      required: ['fromImage', 'fromUserDescription', 'fromVoiceTranscript'],
      properties: {
        fromImage: { type: 'string', minLength: 1 },
        fromUserDescription: { type: 'string', minLength: 1 },
        fromVoiceTranscript: { type: ['string', 'null'] },
      },
    },
    diagnosis: { type: 'string', minLength: 1 },
    safetyWarning: { type: 'string', minLength: 1 },
    steps: {
      type: 'array',
      minItems: 1,
      items: { type: 'string', minLength: 1 },
    },
    materials: {
      type: 'array',
      minItems: 1,
      items: { type: 'string', minLength: 1 },
    },
    costEstimate: { type: 'string', minLength: 1 },
    nextAction: { type: 'string', minLength: 1 },
  },
};

const productRecommendationsJsonSchema: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['productRecommendations'],
  properties: {
    productRecommendations: {
      type: 'array',
      minItems: 2,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['item', 'whyItIsNeeded', 'searchSummary', 'options'],
        properties: {
          item: { type: 'string', minLength: 1 },
          whyItIsNeeded: { type: 'string', minLength: 1 },
          searchSummary: { type: 'string', minLength: 1 },
          options: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['title', 'storeName', 'productUrl'],
              properties: {
                title: { type: 'string', minLength: 1 },
                storeName: { type: 'string', minLength: 1 },
                productUrl: { type: 'string', minLength: 1 },
              },
            },
          },
        },
      },
    },
  },
};

@Injectable()
export class OpenAiRepairService {
  private readonly logger = new Logger(OpenAiRepairService.name);
  private readonly env: AppEnv;
  private readonly client: OpenAI;

  private withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage: string,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(errorMessage));
      }, timeoutMs);

      promise
        .then((value) => {
          clearTimeout(timeoutId);
          resolve(value);
        })
        .catch((error: unknown) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  constructor() {
    this.env = getAppEnv();
    this.client = new OpenAI({
      apiKey: this.env.OPENAI_API_KEY,
      timeout: 120_000, // 2 minutes max per call
    });
  }

  async transcribeAudio(audio: Express.Multer.File): Promise<string> {
    try {
      const file = new File(
        [new Uint8Array(audio.buffer)],
        audio.originalname,
        {
          type: audio.mimetype,
        },
      );

      const transcription = await this.client.audio.transcriptions.create({
        file,
        model: this.env.OPENAI_TRANSCRIPTION_MODEL,
      });

      return transcription.text.trim();
    } catch (error) {
      this.logger.error('OpenAI audio transcription failed.', error);
      throw new InternalServerErrorException(
        'SnapMend could not transcribe the uploaded voice message with OpenAI.',
      );
    }
  }

  async generateRepairPlan(
    input: AnalyzeWithOpenAiInput,
  ): Promise<GeneratedRepairPlan> {
    this.logger.log('generateRepairPlan: calling OpenAI...');
    try {
      const userContent: ResponseInputContent[] = [
        {
          type: 'input_text',
          text: [
            `Repair title: ${input.title}`,
            `User description: ${input.description ?? 'No written description provided.'}`,
            `Voice transcript: ${input.transcript ?? 'No voice transcript provided.'}`,
            'Return only valid JSON matching the requested schema.',
          ].join('\n'),
        },
      ];

      if (input.image) {
        userContent.push({
          type: 'input_image',
          image_url: `data:${input.image.mimetype};base64,${input.image.buffer.toString('base64')}`,
          detail: 'auto',
        });
      }

      const response = await this.client.responses.create({
        model: this.env.OPENAI_ANALYSIS_MODEL,
        text: {
          format: {
            type: 'json_schema',
            name: 'repair_plan',
            strict: true,
            schema: repairPlanJsonSchema,
          },
        },
        input: [
          {
            role: 'system',
            content: [
              {
                type: 'input_text',
                text: [
                  'You are SnapMend, a careful home repair assistant.',
                  'Diagnose household repair problems from the image plus any text and transcript.',
                  'Be explicit about what evidence comes from the image versus what comes from the user description or transcript.',
                  'If the issue is a loose hinge, missing screw, stripped cabinet mounting point, or misaligned cabinet hardware, say so directly.',
                  'Produce concise and practical guidance for a homeowner.',
                  'Mention safety risks clearly.',
                  'If a screwdriver is needed, name the likely screwdriver type.',
                  'Return only JSON that matches the provided schema.',
                ].join(' '),
              },
            ],
          },
          {
            role: 'user',
            content: userContent,
          },
        ],
      });

      this.logger.log('generateRepairPlan: received response, parsing...');
      const parsed = repairPlanSchema.parse(JSON.parse(response.output_text));
      this.logger.log('generateRepairPlan: done.');
      return parsed;
    } catch (error) {
      this.logger.error('OpenAI repair analysis failed.', error);
      throw new InternalServerErrorException(
        'SnapMend could not generate a repair plan with OpenAI.',
      );
    }
  }

  async searchProducts(
    input: AnalyzeWithOpenAiInput & {
      repairPlan: GeneratedRepairPlan;
    },
  ): Promise<GeneratedProductRecommendations> {
    this.logger.log('searchProducts: calling OpenAI...');
    const startedAt = Date.now();
    try {
      const response = await this.withTimeout(
        this.client.responses.create({
          model: this.env.OPENAI_PRODUCT_SEARCH_MODEL,
          tools: [{ type: 'web_search' }],
          tool_choice: 'auto',
          include: ['web_search_call.action.sources'],
          text: {
            format: {
              type: 'json_schema',
              name: 'product_recommendations',
              strict: true,
              schema: productRecommendationsJsonSchema,
            },
          },
          input: [
            {
              role: 'system',
              content: [
                {
                  type: 'input_text',
                  text: [
                    'You are SnapMend product lookup.',
                    'Use web search to find practical products that directly support the repair plan.',
                    'Return at least one recommendation for the screwdriver and one recommendation for the replacement screw or cabinet-hinge mounting screw when relevant.',
                    'Prefer reputable hardware or home-improvement stores.',
                    'Every option must include a directly usable product URL.',
                    'Do not invent products or URLs.',
                    'Return only JSON matching the provided schema.',
                  ].join(' '),
                },
              ],
            },
            {
              role: 'user',
              content: [
                {
                  type: 'input_text',
                  text: [
                    `Repair title: ${input.title}`,
                    `Description: ${input.description ?? 'No written description provided.'}`,
                    `Transcript: ${input.transcript ?? 'No voice transcript provided.'}`,
                    `Diagnosis: ${input.repairPlan.diagnosis}`,
                    `Key materials: ${input.repairPlan.materials.join(', ')}`,
                    `Key steps: ${input.repairPlan.steps.join(' | ')}`,
                    'Find purchase links only for the tools and small parts actually needed to do this repair.',
                  ].join('\n'),
                },
              ],
            },
          ],
        }),
        PRODUCT_SEARCH_TIMEOUT_MS,
        `OpenAI product search timed out after ${PRODUCT_SEARCH_TIMEOUT_MS} ms.`,
      );

      this.logger.log(
        `searchProducts: received response after ${Date.now() - startedAt} ms, parsing...`,
      );
      const parsed = productRecommendationsSchema.parse(
        JSON.parse(response.output_text),
      );
      this.logger.log(
        `searchProducts: done after ${Date.now() - startedAt} ms.`,
      );
      return parsed;
    } catch (error) {
      this.logger.warn(
        `searchProducts: continuing without product recommendations after ${Date.now() - startedAt} ms.`,
      );
      this.logger.error('OpenAI product search failed.', error);
      return { productRecommendations: [] };
    }
  }
}
