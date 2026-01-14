export const SF_BASE_URL = 'https://vercel.my.salesforce.com';
export const SF_LIGHTNING_BASE = `${SF_BASE_URL}/lightning`;

/**
 * Mapping from natural language terms to Salesforce API field names
 */
export const FIELD_MAPPINGS: Record<string, string> = {
  // Stage 0→1 fields
  'amount': 'Amount',
  'deal size': 'Amount',
  'deal value': 'Amount',
  'sqo': 'SQO_Date__c',
  'sqo date': 'SQO_Date__c',
  'sales qualified': 'SQO_Date__c',
  'prospector': 'Prospector__c',
  'sdr': 'SDR__c',
  'sales development rep': 'SDR__c',
  'close date': 'CloseDate',
  'expected close': 'CloseDate',
  'closing date': 'CloseDate',
  'new business': 'New_Business_vs_Expansion__c',
  'expansion': 'New_Business_vs_Expansion__c',
  'opp type': 'New_Business_vs_Expansion__c',
  'primary product': 'Primary_Product_Interest__c',
  'product interest': 'Primary_Product_Interest__c',

  // Stage 1→2 fields
  'pain': 'Implicated_Pain__c',
  'pain point': 'Implicated_Pain__c',
  'implicated pain': 'Implicated_Pain__c',
  'pain quality': 'Pain_Quality__c',
  'next step': 'NextStep',
  'next steps': 'NextStep',
  'value driver': 'Value_Driver__c',
  'partner': 'Partner_Identified__c',
  'partner identified': 'Partner_Identified__c',
  'tech stack': 'Tech_Stack__c',
  'technology stack': 'Tech_Stack__c',
  'metrics': 'Metrics__c',

  // Stage 2→3 fields
  'decision process': 'Decision_Process__c',
  'decision criteria': 'Decision_Criteria__c',
  'decision criteria quality': 'Decision_Criteria_Quality__c',
  'identified pain': 'Identified_Pain__c',
  'champion': 'Champion__c',

  // Stage 3→4 fields
  'competition': 'Competition__c',
  'competitor': 'Competitors__c',
  'competitors': 'Competitors__c',
  'workload': 'Workload_URL__c',
  'workload url': 'Workload_URL__c',
  'technical win': 'Technical_Win_Status__c',
  'tech win': 'Technical_Win_Status__c',

  // Stage 4→5 fields
  'economic buyer': 'Economic_Buyer__c',
  'decision maker': 'Economic_Buyer__c',
  'paper process': 'Paper_Process__c',
  'paper process quality': 'Paper_Process_Quality__c',

  // Stage 5→Won fields
  'win reason': 'Win_Reason__c',
  'vercel solution': 'Vercel_Solution__c',
  'closed won checklist': 'Closed_Won_Checklist__c',

  // Common fields
  'account name': 'AccountName',
  'opportunity name': 'Name',
  'owner': 'OwnerId',
  'primary contact': 'Primary_Contact__c',
  'forecast': 'ForecastCategory',
  'probability': 'Probability',
  'type': 'Type',
  'plan': 'Plan__c',
  'team': 'Team__c',
};

/**
 * Map natural language field name to Salesforce API name
 */
export function mapFieldName(naturalLanguage: string): string | null {
  const normalized = naturalLanguage.toLowerCase().trim();
  return FIELD_MAPPINGS[normalized] || null;
}
