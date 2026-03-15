import { Module } from '@nestjs/common';
import { AnalyzeController } from './controllers/analyze.controller';
import { CasesController } from './controllers/cases.controller';
import { HealthController } from './controllers/health.controller';
import { AnalysisService } from './services/analysis.service';
import { CasesService } from './services/cases.service';

@Module({
  controllers: [AnalyzeController, CasesController, HealthController],
  providers: [AnalysisService, CasesService],
})
export class AppModule {}
