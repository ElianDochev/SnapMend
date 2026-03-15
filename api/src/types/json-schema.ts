export type JsonSchema = {
  type: string;
  description?: string;
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  required?: string[];
  additionalProperties?: boolean;
  enum?: string[];
  minItems?: number;
  minLength?: number;
};
