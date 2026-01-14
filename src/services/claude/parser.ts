import { ClaudeClient } from './client.js';
import { ClaudeExtraction } from '../../types/updates.js';
import { OpportunityState } from '../../types/opportunity.js';
import { FIELD_MAPPINGS } from '../../config/salesforce.js';
import { STAGE_GATES } from '../../config/stages.js';

export class ParserService {
  private claude: ClaudeClient;

  constructor(claude: ClaudeClient) {
    this.claude = claude;
  }

  /**
   * Parse call notes and extract field updates
   */
  async parseNotes(notes: string, currentState: OpportunityState): Promise<ClaudeExtraction> {
    const systemPrompt = this.buildSystemPrompt(currentState);
    const userPrompt = `Parse these call notes and extract Salesforce field updates:\n\n${notes}`;

    const extraction = await this.claude.sendMessageForJSON<ClaudeExtraction>(systemPrompt, userPrompt);

    // Validate the extraction structure
    if (!extraction.fieldUpdates) {
      extraction.fieldUpdates = [];
    }
    if (!extraction.missingFields) {
      extraction.missingFields = [];
    }
    if (!extraction.suggestions) {
      extraction.suggestions = [];
    }

    return extraction;
  }

  /**
   * Build system prompt with context
   */
  private buildSystemPrompt(currentState: OpportunityState): string {
    const fieldMappingText = Object.entries(FIELD_MAPPINGS)
      .map(([nl, api]) => `- "${nl}" → ${api}`)
      .join('\n');

    const stageGateText = STAGE_GATES.map(rule => {
      const fields = rule.requiredFields.map(f => f.apiName).join(', ');
      return `${rule.fromStage} → ${rule.toStage}: ${fields}`;
    }).join('\n');

    return `You are a Salesforce field extraction assistant for Vercel's sales team.

Your task: Parse call notes and extract structured field updates for Salesforce opportunities.

CURRENT CONTEXT:
- Opportunity: ${currentState.name}
- Current Stage: ${currentState.stage}
- Opportunity ID: ${currentState.id}
- Current Fields: ${JSON.stringify(currentState.fields, null, 2)}

OUTPUT FORMAT:
Return ONLY valid JSON with this EXACT structure:
{
  "stageChange": {
    "from": "current stage name",
    "to": "proposed new stage name",
    "reason": "brief explanation"
  },
  "fieldUpdates": [
    {
      "field": "Salesforce_API_Field_Name",
      "value": "extracted value",
      "confidence": "high",
      "source": "direct quote from notes"
    }
  ],
  "missingFields": ["API names of required fields not yet populated"],
  "suggestions": ["helpful guidance for user"]
}

FIELD MAPPING RULES:
${fieldMappingText}

STAGE-GATE REQUIREMENTS:
${stageGateText}

EXTRACTION RULES:
1. Be conservative - only extract fields you're confident about
2. Use "high" confidence for explicit mentions, "medium" for implied, "low" for uncertain
3. Always include the source quote that supports your extraction
4. For amounts, extract numeric value only (no currency symbols)
5. For dates, use YYYY-MM-DD format
6. Consider the current stage when deciding if a stage change is appropriate
7. Check stage-gate requirements - list missing required fields for target stage
8. If notes suggest readiness for next stage, propose stage change
9. Preserve customer quotes exactly as they appear in notes
10. If information is ambiguous, set low confidence and add to suggestions

EXAMPLES:

Input: "Deal is worth $75k ARR. Champion is Sarah (CTO). Next step: demo on Friday."
Output:
{
  "fieldUpdates": [
    {"field": "Amount", "value": 75000, "confidence": "high", "source": "Deal is worth $75k ARR"},
    {"field": "Champion__c", "value": "Sarah (CTO)", "confidence": "high", "source": "Champion is Sarah (CTO)"},
    {"field": "NextStep", "value": "Demo on Friday", "confidence": "high", "source": "Next step: demo on Friday"}
  ],
  "missingFields": [],
  "suggestions": []
}

Input: "Main pain point is slow deployments taking 2 hours. They want sub-5 minute deploys. Ready to move forward."
Output:
{
  "stageChange": {"from": "Prospect", "to": "Qualification", "reason": "Pain point identified and quantified"},
  "fieldUpdates": [
    {"field": "Implicated_Pain__c", "value": "Slow deployments (2 hours) - want sub-5 minute deploys", "confidence": "high", "source": "Main pain point is slow deployments taking 2 hours. They want sub-5 minute deploys."},
    {"field": "Metrics__c", "value": "Current: 2hr deploys, Target: <5min deploys", "confidence": "high", "source": "slow deployments taking 2 hours. They want sub-5 minute deploys"}
  ],
  "missingFields": ["Pain_Quality__c", "Value_Driver__c"],
  "suggestions": ["Consider asking about pain quality in next conversation"]
}

Now parse the provided call notes and return ONLY the JSON response.`;
  }
}
