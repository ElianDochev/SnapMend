import 'reflect-metadata';

import { readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { Test } from '@nestjs/testing';
import { AppModule } from '../app.module';
import { AnalysisService } from '../services/analysis.service';
import type { RepairCase } from '../types/repair-case';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function includesAny(text: string, variants: string[]): boolean {
  const normalized = text.toLowerCase();
  return variants.some((variant) => normalized.includes(variant.toLowerCase()));
}

async function loadScenarioFile(
  fileName: string,
  mimeType: string,
): Promise<Express.Multer.File> {
  const fullPath = join(process.cwd(), '..', 'test-scenerio', fileName);
  const buffer = await readFile(fullPath);

  return {
    fieldname: fileName.endsWith('.jpg') ? 'image' : 'audio',
    originalname: basename(fullPath),
    encoding: '7bit',
    mimetype: mimeType,
    size: buffer.byteLength,
    buffer,
    stream: undefined as never,
    destination: '',
    filename: basename(fullPath),
    path: fullPath,
  };
}

function validateRealScenario(result: RepairCase): void {
  const combinedText = [
    result.diagnosis,
    result.safetyWarning,
    result.nextAction,
    result.issueEvidence.fromImage,
    result.issueEvidence.fromUserDescription,
    result.issueEvidence.fromVoiceTranscript ?? '',
    ...result.steps,
    ...result.materials,
    ...result.productRecommendations.flatMap((recommendation) => [
      recommendation.item,
      recommendation.whyItIsNeeded,
      recommendation.searchSummary,
      ...recommendation.options.map(
        (option) => `${option.title} ${option.storeName}`,
      ),
    ]),
  ].join('\n');

  assert(
    includesAny(combinedText, ['hinge', 'cabinet hinge']),
    'Expected the real test output to identify the hinge issue.',
  );
  assert(
    includesAny(combinedText, [
      'missing screw',
      'replacement screw',
      'cabinet screw',
    ]),
    'Expected the real test output to mention the missing screw.',
  );
  assert(
    includesAny(combinedText, ['phillips', 'philips']),
    'Expected the real test output to recommend a Phillips screwdriver.',
  );
  assert(
    includesAny(combinedText, [
      'look around',
      'search nearby',
      'find the missing screw',
    ]),
    'Expected the real test output to suggest checking for the missing screw before buying a new one.',
  );

  const urls = result.productRecommendations.flatMap((recommendation) =>
    recommendation.options.map((option) => option.productUrl),
  );
  assert(
    urls.length >= 2,
    'Expected at least two product URLs in the real test result.',
  );
  assert(
    urls.every((url) => /^https?:\/\//.test(url)),
    'Expected all product recommendations to contain valid product links.',
  );
}

async function main(): Promise<void> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  try {
    const analysisService = moduleRef.get(AnalysisService);
    const prompt = await readFile(
      join(process.cwd(), '..', 'test-scenerio', 'test-user-prompt.txt'),
      'utf8',
    );
    const image = await loadScenarioFile('test-image.jpg', 'image/jpeg');
    const audio = await loadScenarioFile('user-prompt-voice.m4a', 'audio/m4a');

    const result = await analysisService.analyze({
      title: 'Cabinet door hinge problem',
      description: prompt.trim(),
      image,
      audio,
    });

    validateRealScenario(result);
    console.log(JSON.stringify(result, null, 2));
    console.log('\nReal scenario passed.');
  } finally {
    await moduleRef.close();
  }
}

void main();
