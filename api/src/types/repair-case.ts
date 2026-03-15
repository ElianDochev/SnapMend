export type RepairCase = {
  id: string;
  createdAt: string;
  title: string;
  description?: string;
  transcript?: string;
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
};
