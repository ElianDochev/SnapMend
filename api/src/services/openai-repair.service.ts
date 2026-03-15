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
import type { GeneratedRepairPlan } from '../types/openai-analysis';

type AnalyzeWithOpenAiInput = {
  title: string;
  description?: string;
  transcript?: string;
  image?: Express.Multer.File;
};

const repairPlanSchema = z.object({
  diagnosis: z.string().min(1),
  safetyWarning: z.string().min(1),
  steps: z.array(z.string().min(1)).min(1),
  materials: z.array(z.string().min(1)).min(1),
  costEstimate: z.string().min(1),
  nextAction: z.string().min(1),
});

@Injectable()
export class OpenAiRepairService {
  private readonly logger = new Logger(OpenAiRepairService.name);
  private readonly env: AppEnv;
  private readonly client: OpenAI;

  constructor() {
    this.env = getAppEnv();
    this.client = new OpenAI({
      apiKey: this.env.OPENAI_API_KEY,
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
        input: [
          {
            role: 'system',
            content: [
              {
                type: 'input_text',
                text: [
                  'You are SnapMend, a careful home repair assistant.',
                  'Produce concise and practical guidance for a homeowner.',
                  'Mention safety risks clearly.',
                  'Return JSON with keys: diagnosis, safetyWarning, steps, materials, costEstimate, nextAction.',
                  'Do not wrap the JSON in markdown.',
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

      const parsed = repairPlanSchema.parse(JSON.parse(response.output_text));
      return parsed;
    } catch (error) {
      this.logger.error('OpenAI repair analysis failed.', error);
      throw new InternalServerErrorException(
        'SnapMend could not generate a repair plan with OpenAI.',
      );
    }
  }
}
