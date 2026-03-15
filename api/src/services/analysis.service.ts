import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CasesService } from './cases.service';
import type { RepairCase } from '../types/repair-case';

type AnalyzeInput = {
  title: string;
  description?: string;
  image?: Express.Multer.File;
  audio?: Express.Multer.File;
};

@Injectable()
export class AnalysisService {
  constructor(private readonly casesService: CasesService) {}

  analyze(input: AnalyzeInput): RepairCase {
    const timestamp = new Date().toISOString();
    const title = input.title.trim();
    const description = input.description?.trim();
    const imagePresent = Boolean(input.image);
    const audioPresent = Boolean(input.audio);
    const issueType = this.detectIssueType(`${title} ${description ?? ''}`);
    const repairCase: RepairCase = {
      id: randomUUID(),
      createdAt: timestamp,
      title,
      description,
      inputSummary: {
        imageProvided: imagePresent,
        audioProvided: audioPresent,
      },
      diagnosis: this.buildDiagnosis(issueType, imagePresent, audioPresent),
      safetyWarning: this.buildSafetyWarning(issueType),
      steps: this.buildSteps(issueType),
      materials: this.buildMaterials(issueType),
      costEstimate: this.buildCostEstimate(issueType),
      nextAction:
        'Inspect the area carefully before starting, and stop if you find electrical, gas, or structural risk.',
    };

    return this.casesService.save(repairCase);
  }

  private detectIssueType(
    content: string,
  ): 'paint' | 'leak' | 'wall' | 'general' {
    const normalized = content.toLowerCase();

    if (
      normalized.includes('leak') ||
      normalized.includes('pipe') ||
      normalized.includes('drip')
    ) {
      return 'leak';
    }

    if (normalized.includes('paint') || normalized.includes('peel')) {
      return 'paint';
    }

    if (
      normalized.includes('drywall') ||
      normalized.includes('hole') ||
      normalized.includes('crack')
    ) {
      return 'wall';
    }

    return 'general';
  }

  private buildDiagnosis(
    issueType: 'paint' | 'leak' | 'wall' | 'general',
    imagePresent: boolean,
    audioPresent: boolean,
  ): string {
    const sourceContext = [
      imagePresent ? 'photo attached' : 'no photo attached',
      audioPresent ? 'audio attached' : 'no audio attached',
    ].join(', ');

    switch (issueType) {
      case 'leak':
        return `Likely minor plumbing leak or seal failure based on the described symptoms; ${sourceContext}.`;
      case 'paint':
        return `Likely paint adhesion or moisture-related surface damage; ${sourceContext}.`;
      case 'wall':
        return `Likely cosmetic drywall damage that can be patched and refinished; ${sourceContext}.`;
      default:
        return `Likely a low-complexity household repair that needs a closer visual check; ${sourceContext}.`;
    }
  }

  private buildSafetyWarning(
    issueType: 'paint' | 'leak' | 'wall' | 'general',
  ): string {
    switch (issueType) {
      case 'leak':
        return 'Shut off nearby water supply if moisture is active, and keep water away from outlets or appliances.';
      case 'paint':
        return 'Test for hidden moisture before repainting, and ventilate the room while sanding or painting.';
      case 'wall':
        return 'Check for wires or pipes behind the damaged area before cutting or enlarging the opening.';
      default:
        return 'If the issue involves electricity, gas, or load-bearing structures, pause and call a professional.';
    }
  }

  private buildSteps(
    issueType: 'paint' | 'leak' | 'wall' | 'general',
  ): string[] {
    switch (issueType) {
      case 'leak':
        return [
          'Dry the area and identify the exact leak point.',
          'Tighten the connection or remove the damaged seal or fitting.',
          'Install the replacement part and restore water slowly while checking for drips.',
          'Monitor the area for several minutes and again later in the day.',
        ];
      case 'paint':
        return [
          'Scrape loose paint and sand the damaged section smooth.',
          'Prime any bare or repaired surface.',
          'Apply matching paint in thin coats and let each coat dry fully.',
          'Recheck for stains or moisture that could cause repeat peeling.',
        ];
      case 'wall':
        return [
          'Trim loose drywall paper and clean dust from the area.',
          'Apply patch material or a wall patch and let it dry.',
          'Sand smooth, then add a second coat if needed.',
          'Prime and paint to blend with the surrounding wall.',
        ];
      default:
        return [
          'Inspect the damage closely and confirm the affected material.',
          'Clean the area and remove loose or damaged surface material.',
          'Make the smallest repair that fully stabilizes the problem.',
          'Test the fix before putting the space back into normal use.',
        ];
    }
  }

  private buildMaterials(
    issueType: 'paint' | 'leak' | 'wall' | 'general',
  ): string[] {
    switch (issueType) {
      case 'leak':
        return [
          'Adjustable wrench',
          'Replacement washer or seal',
          'PTFE tape',
          'Towel or bucket',
        ];
      case 'paint':
        return [
          'Scraper',
          'Sandpaper',
          'Primer',
          'Matching paint',
          'Brush or roller',
        ];
      case 'wall':
        return [
          'Spackle or joint compound',
          'Putty knife',
          'Sandpaper',
          'Primer',
          'Matching paint',
        ];
      default:
        return [
          'Work gloves',
          'Cleaning cloth',
          'Basic hand tools',
          'Repair material matched to the surface',
        ];
    }
  }

  private buildCostEstimate(
    issueType: 'paint' | 'leak' | 'wall' | 'general',
  ): string {
    switch (issueType) {
      case 'leak':
        return '$15-$60 for a small DIY plumbing repair.';
      case 'paint':
        return '$20-$80 for primer, paint, and surface prep supplies.';
      case 'wall':
        return '$15-$50 for a small drywall patch and paint touch-up.';
      default:
        return '$20-$100 depending on the repair material and tool needs.';
    }
  }
}
