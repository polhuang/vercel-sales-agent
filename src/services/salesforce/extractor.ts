import { AgentBrowserService } from './browser.js';
import { OpportunityState } from '../../types/opportunity.js';
import { logger } from '../../utils/logger.js';
import { ClaudeClient } from '../claude/client.js';

export class FieldExtractorService {
  private browser: AgentBrowserService;
  private claude?: ClaudeClient;

  constructor(browser: AgentBrowserService, claude?: ClaudeClient) {
    this.browser = browser;
    this.claude = claude;
  }

  /**
   * Extract current opportunity state from page
   */
  async extractOpportunityState(): Promise<OpportunityState> {
    // Wait a bit more to ensure page is fully loaded
    await this.browser.wait(2000);

    const snapshot = await this.browser.getSnapshot();
    const fields: Record<string, any> = {};

    // Extract opportunity name from page title or header
    let opportunityName = 'Unknown';
    let opportunityId = '';
    let stage = 'Unknown';

    // Try to get current URL to extract ID
    const currentUrl = await this.browser.getCurrentUrl();
    const oppIdMatch = currentUrl.match(/Opportunity\/([a-zA-Z0-9]+)/);
    if (oppIdMatch) {
      opportunityId = oppIdMatch[1];
    }

    const snapshotText = snapshot.data.snapshot;

    logger.debug('Page snapshot length', {
      snapshotLength: snapshotText.length,
      url: currentUrl.substring(0, 100)
    });

    // Try using Claude for extraction if available (more robust)
    if (this.claude) {
      try {
        const claudeExtraction = await this.extractWithClaude(snapshotText);
        if (claudeExtraction.name !== 'Unknown') {
          opportunityName = claudeExtraction.name;
        }
        if (claudeExtraction.stage !== 'Unknown') {
          stage = claudeExtraction.stage;
        }
        if (Object.keys(claudeExtraction.fields).length > 0) {
          Object.assign(fields, claudeExtraction.fields);
        }

        logger.info('Claude extraction successful', {
          name: opportunityName,
          stage: stage,
          fieldCount: Object.keys(fields).length
        });

        return {
          id: opportunityId,
          name: opportunityName,
          stage: stage,
          fields,
        };
      } catch (error) {
        logger.warn('Claude extraction failed, falling back to regex', error);
      }
    }

    // Fallback to regex-based extraction

    // Extract opportunity name from heading or title
    // Look for patterns like "Tribute Technology - IB - Infra - 2026"
    for (const [ref, element] of Object.entries(snapshot.data.refs)) {
      const name = element.name?.toString() || '';
      const role = element.role?.toString() || '';

      // Look for heading with opportunity name
      if (role === 'heading' && name.length > 10 && name.includes('-')) {
        // This is likely the opportunity name
        if (opportunityName === 'Unknown' || name.length > opportunityName.length) {
          opportunityName = name;
        }
      }

      // Look for stage indicator
      if (name.toLowerCase().includes('stage') && name.includes(':')) {
        const stageValue = name.split(':')[1]?.trim();
        if (stageValue && stageValue.length > 2) {
          stage = stageValue;
        }
      }
    }

    // Parse snapshot text for stage if not found
    if (stage === 'Unknown') {
      // Try multiple patterns for stage
      const patterns = [
        /Stage[:\s]+([A-Za-z\s&]+?)(?:\n|,|\||$)/i,
        /Current Stage[:\s]+([A-Za-z\s&]+?)(?:\n|,|\||$)/i,
        /Opportunity Stage[:\s]+([A-Za-z\s&]+?)(?:\n|,|\||$)/i,
      ];

      for (const pattern of patterns) {
        const match = snapshotText.match(pattern);
        if (match) {
          stage = match[1].trim();
          break;
        }
      }
    }

    // Parse snapshot text for opportunity name if not found
    if (opportunityName === 'Unknown') {
      // Look for the opportunity name near the top of the page
      const lines = snapshotText.split('\n').slice(0, 30);
      for (const line of lines) {
        const trimmed = line.trim();
        // Look for lines with dashes, years, or specific patterns
        // Also look for "Test Opp" or other common opportunity naming patterns
        if (trimmed.length > 15 &&
            (trimmed.includes(' - ') ||
             /20\d{2}/.test(trimmed) ||
             /test.*opp/i.test(trimmed) ||
             trimmed.includes('Technology') ||
             trimmed.includes('Corp') ||
             trimmed.includes('Inc')) &&
            !trimmed.toLowerCase().includes('stage') &&
            !trimmed.toLowerCase().includes('home') &&
            !trimmed.toLowerCase().includes('search')) {
          opportunityName = trimmed;
          break;
        }
      }
    }

    // Try to extract common fields from the page
    const fieldPatterns: Record<string, RegExp> = {
      Amount: /Amount[:\s]+\$?([\d,]+)/i,
      CloseDate: /Close Date[:\s]+(\d{1,2}\/\d{1,2}\/\d{4})/i,
      'Implicated_Pain__c': /Implicated Pain[:\s]+([^\n]+)/i,
      'Champion__c': /Champion[:\s]+([^\n]+)/i,
      NextStep: /Next Step[:\s]+([^\n]+)/i,
    };

    for (const [fieldName, pattern] of Object.entries(fieldPatterns)) {
      const match = snapshotText.match(pattern);
      if (match) {
        fields[fieldName] = match[1].trim();
      }
    }

    logger.debug('Extracted opportunity state', {
      id: opportunityId,
      name: opportunityName,
      stage: stage,
      fieldCount: Object.keys(fields).length,
      snapshotPreview: snapshotText.substring(0, 300)
    });

    return {
      id: opportunityId,
      name: opportunityName,
      stage: stage,
      fields,
    };
  }

  /**
   * Extract field value by field name
   */
  async extractField(fieldName: string): Promise<any> {
    const snapshot = await this.browser.getSnapshot();

    for (const [ref, element] of Object.entries(snapshot.data.refs)) {
      if (element.name === fieldName) {
        return element.value || element.name || null;
      }
    }

    return null;
  }

  /**
   * Use Claude to extract opportunity information from page snapshot
   */
  private async extractWithClaude(snapshotText: string): Promise<{
    name: string;
    stage: string;
    fields: Record<string, any>;
  }> {
    if (!this.claude) {
      throw new Error('Claude client not available');
    }

    const systemPrompt = `You are a Salesforce page parser. Extract opportunity information from the page text.

CRITICAL: You MUST return ONLY valid JSON. Do not include any explanatory text, just the JSON object.

Extract:
1. Opportunity Name - Look for the main opportunity title (usually contains dashes, years, or company names)
2. Stage - The current opportunity stage. Look for text like "0 - Prospect", "1 - Qualification", "Stage: Prospect", etc.
3. Key Fields - Extract any visible field values like Amount, Close Date, Champion, etc.

IMPORTANT STAGE PATTERNS:
- "0 - Prospect" or "Stage: 0 - Prospect" → extract as "0 - Prospect"
- "1 - Qualification" → extract as "1 - Qualification"
- "Prospect" → extract as "Prospect"

Return ONLY this exact JSON structure (no markdown, no explanations):
{
  "name": "Opportunity Name",
  "stage": "Current Stage",
  "fields": {
    "Amount": "50000",
    "CloseDate": "2026-03-15"
  }
}

If you cannot find a field, use "Unknown" for name/stage or use empty object {} for fields.`;

    const userPrompt = `Extract opportunity information from this Salesforce Lightning page. Look carefully for the opportunity name near the top, and the stage field (often shows as "0 - Prospect", "1 - Qualification", etc.):\n\n${snapshotText.substring(0, 4000)}`;

    try {
      const result = await this.claude.sendMessageForJSON<{
        name: string;
        stage: string;
        fields: Record<string, any>;
      }>(systemPrompt, userPrompt);

      logger.info('Claude successfully extracted from page', {
        name: result.name,
        stage: result.stage,
        fieldCount: Object.keys(result.fields || {}).length
      });

      return result;
    } catch (error: any) {
      logger.error('Claude JSON extraction failed', {
        error: error.message,
        snapshot: snapshotText.substring(0, 500)
      });
      throw error;
    }
  }
}
