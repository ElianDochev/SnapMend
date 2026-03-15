import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CasesService } from './cases.service';
import { OpenAiRepairService } from './openai-repair.service';
import type { RepairCase } from '../types/repair-case';

type AnalyzeInput = {
  title: string;
  description?: string;
  image?: Express.Multer.File;
  audio?: Express.Multer.File;
};

@Injectable()
export class AnalysisService {
  constructor(
    private readonly casesService: CasesService,
    private readonly openAiRepairService: OpenAiRepairService,
  ) {}

  async analyze(input: AnalyzeInput): Promise<RepairCase> {
    const timestamp = new Date().toISOString();
    const title = input.title.trim();
    const description = input.description?.trim();
    const imagePresent = Boolean(input.image);
    const audioPresent = Boolean(input.audio);
    const transcript = input.audio
      ? await this.openAiRepairService.transcribeAudio(input.audio)
      : undefined;
    const generatedPlan = await this.openAiRepairService.generateRepairPlan({
      title,
      description,
      transcript,
      image: input.image,
    });
    const productRecommendations =
      await this.openAiRepairService.searchProducts({
        title,
        description,
        transcript,
        image: input.image,
        repairPlan: generatedPlan,
      });
    const repairCase: RepairCase = {
      id: randomUUID(),
      createdAt: timestamp,
      title,
      description,
      transcript,
      issueEvidence: {
        ...generatedPlan.issueEvidence,
        fromVoiceTranscript: generatedPlan.issueEvidence.fromVoiceTranscript ?? undefined,
      },
      inputSummary: {
        imageProvided: imagePresent,
        audioProvided: audioPresent,
      },
      diagnosis: generatedPlan.diagnosis,
      safetyWarning: generatedPlan.safetyWarning,
      steps: generatedPlan.steps,
      materials: generatedPlan.materials,
      costEstimate: generatedPlan.costEstimate,
      nextAction: generatedPlan.nextAction,
      productRecommendations: productRecommendations.productRecommendations,
    };

    return this.casesService.save(repairCase);
  }
}
