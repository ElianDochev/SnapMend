import type { ProductRecommendation } from './repair-case';

export type GeneratedRepairPlan = {
  issueEvidence: {
    fromImage: string;
    fromUserDescription: string;
    fromVoiceTranscript?: string;
  };
  diagnosis: string;
  safetyWarning: string;
  steps: string[];
  materials: string[];
  costEstimate: string;
  nextAction: string;
};

export type GeneratedProductRecommendations = {
  productRecommendations: ProductRecommendation[];
};
