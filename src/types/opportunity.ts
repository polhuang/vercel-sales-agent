export interface OpportunityState {
  id: string;
  name: string;
  stage: string;
  fields: Record<string, any>;
}

export interface FieldUpdate {
  field: string;
  value: any;
  confidence: 'high' | 'medium' | 'low';
  source: string;
}

export interface PageSnapshot {
  success: boolean;
  data: {
    refs: Record<string, any>;
    snapshot: string;
  };
  error: string | null;
}
