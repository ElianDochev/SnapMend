import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AnalyzeController } from '../src/controllers/analyze.controller';
import { CasesController } from '../src/controllers/cases.controller';
import { HealthController } from '../src/controllers/health.controller';
import { AnalysisService } from '../src/services/analysis.service';
import { CasesService } from '../src/services/cases.service';
import { OpenAiRepairService } from '../src/services/openai-repair.service';

describe('SnapMend API module', () => {
  let analyzeController: AnalyzeController;
  let casesController: CasesController;
  let healthController: HealthController;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AnalyzeController, CasesController, HealthController],
      providers: [
        AnalysisService,
        CasesService,
        {
          provide: OpenAiRepairService,
          useValue: {
            transcribeAudio: jest
              .fn()
              .mockResolvedValue('Water is dripping under the sink.'),
            generateRepairPlan: jest.fn().mockResolvedValue({
              diagnosis: 'Likely a loose sink drain connection.',
              safetyWarning:
                'Turn off nearby water supply if the leak gets worse.',
              steps: [
                'Dry the area.',
                'Tighten the connection.',
                'Test again for drips.',
              ],
              materials: ['Adjustable wrench', 'PTFE tape'],
              costEstimate: '$15-$40',
              nextAction:
                'If the leak continues after tightening, replace the seal.',
            }),
          },
        },
      ],
    }).compile();

    analyzeController = moduleRef.get(AnalyzeController);
    casesController = moduleRef.get(CasesController);
    healthController = moduleRef.get(HealthController);
  });

  it('returns a healthy status', () => {
    expect(healthController.getHealth()).toEqual({ status: 'ok' });
  });

  it('creates a repair case and exposes it in case history', async () => {
    const repairCase = await analyzeController.analyze(
      {
        title: 'Leaky sink pipe',
        description: 'There is a drip under the kitchen sink.',
      },
      {
        audio: [
          {
            buffer: Buffer.from('audio'),
            originalname: 'note.webm',
            mimetype: 'audio/webm',
          } as Express.Multer.File,
        ],
      },
    );

    expect(repairCase.title).toBe('Leaky sink pipe');
    expect(repairCase.materials).toContain('PTFE tape');

    const cases = casesController.getCases();

    expect(cases).toHaveLength(1);
    expect(cases[0]?.id).toBe(repairCase.id);
    expect(casesController.getCase(repairCase.id)).toEqual(repairCase);
    expect(repairCase.transcript).toBe('Water is dripping under the sink.');
  });

  it('throws for a missing case', () => {
    expect(() => casesController.getCase('does-not-exist')).toThrow(
      NotFoundException,
    );
  });
});
