import { FieldUpdate } from './opportunity.js';

export interface ClaudeExtraction {
  stageChange?: {
    from: string;
    to: string;
    reason: string;
  };
  fieldUpdates: FieldUpdate[];
  missingFields: string[];
  suggestions: string[];
}
