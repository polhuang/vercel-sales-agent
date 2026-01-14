import { ClaudeClient } from './client.js';
import { ParsedIntent } from '../../types/intent.js';

export class IntentParserService {
  private claude: ClaudeClient;

  constructor(claude: ClaudeClient) {
    this.claude = claude;
  }

  /**
   * Parse user's natural language intent
   */
  async parseIntent(userInput: string): Promise<ParsedIntent> {
    const systemPrompt = `You are an intent parser for a Salesforce opportunity management system.

Parse the user's natural language request and extract:
1. What action they want to take (create_opportunity, update_opportunity, search_opportunity, or unclear)
2. Which opportunity or account they're referring to
3. Any information or notes they've provided
4. Any stage transition they want to make

OUTPUT FORMAT (JSON only):
{
  "action": "create_opportunity" | "update_opportunity" | "search_opportunity" | "unclear",
  "opportunityIdentifier": "name or account to search for",
  "accountName": "for creating new opportunities",
  "information": "any call notes or information provided",
  "stageTransition": {
    "targetStage": "specific stage name if mentioned",
    "direction": "next" | "specific"
  },
  "confidence": "high" | "medium" | "low",
  "clarificationNeeded": ["list of things that are unclear"]
}

EXAMPLES:

Input: "Update the Tribute Technology opp, moving it to stage 2"
Output: {
  "action": "update_opportunity",
  "opportunityIdentifier": "Tribute Technology",
  "stageTransition": {
    "targetStage": "stage 2",
    "direction": "specific"
  },
  "confidence": "high"
}

Input: "Create a new opportunity for Acme Corp, $50k deal, close date Feb 2026"
Output: {
  "action": "create_opportunity",
  "accountName": "Acme Corp",
  "information": "$50k deal, close date Feb 2026",
  "confidence": "high"
}

Input: "Update Bilt Rewards opportunity with these notes: Had call with CTO. They need better deployment speed."
Output: {
  "action": "update_opportunity",
  "opportunityIdentifier": "Bilt Rewards",
  "information": "Had call with CTO. They need better deployment speed.",
  "confidence": "high"
}

Input: "Move the Tribute opp to the next stage"
Output: {
  "action": "update_opportunity",
  "opportunityIdentifier": "Tribute",
  "stageTransition": {
    "direction": "next"
  },
  "confidence": "high"
}

Return ONLY valid JSON, no other text.`;

    const response = await this.claude.sendMessage(systemPrompt, userInput);

    try {
      // Strip markdown code blocks if present
      let cleanedResponse = response.trim();

      // Remove ```json and ``` markers
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      const parsed = JSON.parse(cleanedResponse);
      return parsed as ParsedIntent;
    } catch (error) {
      throw new Error(`Failed to parse intent response: ${error}`);
    }
  }
}
