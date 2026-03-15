import {
  Body,
  Controller,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { AnalyzeRequestDto } from '../dto/analyze-request.dto';
import { AnalysisService } from '../services/analysis.service';
import type { RepairCase } from '../types/repair-case';

type UploadedFieldMap = {
  image?: Express.Multer.File[];
  audio?: Express.Multer.File[];
};

@Controller('analyze')
export class AnalyzeController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'image', maxCount: 1 },
      { name: 'audio', maxCount: 1 },
    ]),
  )
  async analyze(
    @Body() body: AnalyzeRequestDto,
    @UploadedFiles() files: UploadedFieldMap,
  ): Promise<RepairCase> {
    return this.analysisService.analyze({
      title: body.title,
      description: body.description,
      image: files.image?.[0],
      audio: files.audio?.[0],
    });
  }
}
