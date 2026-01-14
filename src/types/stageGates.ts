export interface StageGateRule {
  fromStage: string;
  toStage: string;
  requiredFields: RequiredField[];
  warningMessage?: string;
}

export interface RequiredField {
  apiName: string;
  displayName: string;
  description: string;
  validation?: (value: any) => boolean;
}

export interface ValidationResult {
  isValid: boolean;
  missingFields: string[];
  warnings: string[];
}
