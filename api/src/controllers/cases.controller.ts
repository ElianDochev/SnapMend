import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { CasesService } from '../services/cases.service';
import type { RepairCase } from '../types/repair-case';

@Controller('cases')
export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  @Get()
  getCases(): RepairCase[] {
    return this.casesService.getAll();
  }

  @Get(':id')
  getCase(@Param('id') id: string): RepairCase {
    const repairCase = this.casesService.getById(id);

    if (!repairCase) {
      throw new NotFoundException(`Case ${id} was not found.`);
    }

    return repairCase;
  }
}
