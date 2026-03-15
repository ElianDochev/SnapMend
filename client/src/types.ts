export type ProductOption = {
  title: string;
  storeName: string;
  productUrl: string;
};

export type ProductRecommendation = {
  item: string;
  whyItIsNeeded: string;
  searchSummary: string;
  options: ProductOption[];
};

export type RepairCase = {
  id: string;
  createdAt: string;
  title: string;
  description?: string;
  transcript?: string;
  issueEvidence: {
    fromImage: string;
    fromUserDescription: string;
    fromVoiceTranscript?: string;
  };
  inputSummary: {
    imageProvided: boolean;
    audioProvided: boolean;
  };
  diagnosis: string;
  safetyWarning: string;
  steps: string[];
  materials: string[];
  costEstimate: string;
  nextAction: string;
  productRecommendations: ProductRecommendation[];
};
