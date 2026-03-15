import { Injectable } from '@nestjs/common';
import type { RepairCase } from '../types/repair-case';

@Injectable()
export class CasesService {
  private readonly cases = new Map<string, RepairCase>();

  getAll(): RepairCase[] {
    return Array.from(this.cases.values()).sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt),
    );
  }

  getById(id: string): RepairCase | undefined {
    return this.cases.get(id);
  }

  save(repairCase: RepairCase): RepairCase {
    this.cases.set(repairCase.id, repairCase);
    return repairCase;
  }
}
