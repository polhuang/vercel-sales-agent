export type IntentAction = 'create_opportunity' | 'update_opportunity' | 'search_opportunity' | 'unclear';

export interface ParsedIntent {
  action: IntentAction;
  opportunityIdentifier?: string; // Name or account name to search for
  accountName?: string; // For creating new opportunities
  information?: string; // Call notes or information provided
  stageTransition?: {
    targetStage?: string;
    direction?: 'next' | 'specific';
  };
  confidence: 'high' | 'medium' | 'low';
  clarificationNeeded?: string[];
}
