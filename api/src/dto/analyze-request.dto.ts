import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class AnalyzeRequestDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title!: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;
}
