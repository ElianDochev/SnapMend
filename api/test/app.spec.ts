import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { AnalyzeController } from '../src/controllers/analyze.controller';
import { CasesController } from '../src/controllers/cases.controller';
import { HealthController } from '../src/controllers/health.controller';

describe('SnapMend API module', () => {
  let analyzeController: AnalyzeController;
  let casesController: CasesController;
  let healthController: HealthController;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    analyzeController = moduleRef.get(AnalyzeController);
    casesController = moduleRef.get(CasesController);
    healthController = moduleRef.get(HealthController);
  });

  it('returns a healthy status', () => {
    expect(healthController.getHealth()).toEqual({ status: 'ok' });
  });

  it('creates a repair case and exposes it in case history', () => {
    const repairCase = analyzeController.analyze(
      {
        title: 'Leaky sink pipe',
        description: 'There is a drip under the kitchen sink.',
      },
      {},
    );

    expect(repairCase.title).toBe('Leaky sink pipe');
    expect(repairCase.materials).toContain('PTFE tape');

    const cases = casesController.getCases();

    expect(cases).toHaveLength(1);
    expect(cases[0]?.id).toBe(repairCase.id);
    expect(casesController.getCase(repairCase.id)).toEqual(repairCase);
  });

  it('throws for a missing case', () => {
    expect(() => casesController.getCase('does-not-exist')).toThrow(
      NotFoundException,
    );
  });
});
