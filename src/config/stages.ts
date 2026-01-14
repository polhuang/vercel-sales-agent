import { StageGateRule } from '../types/stageGates.js';

export const SALESFORCE_STAGES = [
  'Prospect',
  'Qualification',
  'Value Alignment',
  'Technical Validation',
  'Business Justification',
  'Negotiate & Trade',
  'Closed Won',
  'Closed Lost',
] as const;

export const STAGE_GATES: StageGateRule[] = [
  {
    fromStage: 'Prospect',
    toStage: 'Qualification',
    requiredFields: [
      { apiName: 'Amount', displayName: 'Amount', description: 'Deal size estimate' },
      { apiName: 'Primary_Contact__c', displayName: 'Primary Contact', description: 'Primary contact for this opportunity' },
    ],
  },
  {
    fromStage: 'Qualification',
    toStage: 'Value Alignment',
    requiredFields: [
      { apiName: 'Implicated_Pain__c', displayName: 'Implicated Pain', description: 'Customer pain point identified' },
      { apiName: 'Pain_Quality__c', displayName: 'Pain Quality', description: 'Quality of pain identified' },
      { apiName: 'NextStep', displayName: 'Next Step', description: 'Next action to take' },
      { apiName: 'Value_Driver__c', displayName: 'Value Driver', description: 'What drives value for customer' },
      { apiName: 'Partner_Identified__c', displayName: 'Partner Identified', description: 'Partner involvement' },
      { apiName: 'Tech_Stack__c', displayName: 'Tech Stack', description: 'Technology stack (enter "None" if no partners)' },
      { apiName: 'Metrics__c', displayName: 'Metrics', description: 'Key metrics for this opportunity' },
    ],
  },
  {
    fromStage: 'Value Alignment',
    toStage: 'Technical Validation',
    requiredFields: [
      { apiName: 'Metrics__c', displayName: 'Metrics', description: 'Key metrics confirmed' },
      { apiName: 'Decision_Process__c', displayName: 'Decision Process', description: 'How they make decisions' },
      { apiName: 'Decision_Criteria__c', displayName: 'Decision Criteria', description: 'What criteria they use' },
      { apiName: 'Decision_Criteria_Quality__c', displayName: 'Decision Criteria Quality', description: 'Quality of criteria understanding' },
      { apiName: 'Identified_Pain__c', displayName: 'Identified Pain', description: 'Confirmed pain point' },
      { apiName: 'Champion__c', displayName: 'Champion', description: 'Internal champion identified' },
    ],
  },
  {
    fromStage: 'Technical Validation',
    toStage: 'Business Justification',
    requiredFields: [
      { apiName: 'Decision_Criteria__c', displayName: 'Decision Criteria', description: 'Decision criteria confirmed' },
      { apiName: 'Decision_Process__c', displayName: 'Decision Process', description: 'Decision process confirmed' },
      { apiName: 'Champion__c', displayName: 'Champion', description: 'Champion confirmed' },
      { apiName: 'Competition__c', displayName: 'Competition', description: 'Competitive landscape' },
      { apiName: 'Workload_URL__c', displayName: 'Workload URL', description: 'Workload or demo URL' },
      { apiName: 'Technical_Win_Status__c', displayName: 'Technical Win Status', description: 'Must be "Yes" or "Bypass"' },
    ],
  },
  {
    fromStage: 'Business Justification',
    toStage: 'Negotiate & Trade',
    requiredFields: [
      { apiName: 'Economic_Buyer__c', displayName: 'Economic Buyer', description: 'Economic decision maker' },
      { apiName: 'Paper_Process__c', displayName: 'Paper Process', description: 'Procurement/contract process' },
      { apiName: 'Paper_Process_Quality__c', displayName: 'Paper Process Quality', description: 'Quality of process understanding' },
    ],
  },
  {
    fromStage: 'Negotiate & Trade',
    toStage: 'Closed Won',
    requiredFields: [
      { apiName: 'Win_Reason__c', displayName: 'Win Reason', description: 'Why we won' },
      { apiName: 'Vercel_Solution__c', displayName: 'Vercel Solution', description: 'Solution provided' },
      { apiName: 'Closed_Won_Checklist__c', displayName: 'Closed Won Checklist', description: 'Pre-closed won checklist completed' },
      { apiName: 'Technical_Win_Status__c', displayName: 'Technical Win Status', description: 'Must be set' },
      { apiName: 'Competitors__c', displayName: 'Competitors', description: 'Competitors identified' },
      { apiName: 'Workload_URL__c', displayName: 'Workload URLs', description: 'Workload URLs provided' },
    ],
  },
];

/**
 * Get stage-gate rule for a transition
 */
export function getStageGateRule(fromStage: string, toStage: string): StageGateRule | null {
  return STAGE_GATES.find(rule => rule.fromStage === fromStage && rule.toStage === toStage) || null;
}

/**
 * Get all required fields for a specific stage
 */
export function getRequiredFieldsForStage(targetStage: string): string[] {
  const rule = STAGE_GATES.find(r => r.toStage === targetStage);
  return rule ? rule.requiredFields.map(f => f.apiName) : [];
}
