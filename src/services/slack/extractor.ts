import { AgentBrowserService } from '../browser/index.js';
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

    logger.info('Complete page snapshot', {
      snapshotLength: snapshotText.length,
      url: currentUrl.substring(0, 100),
      fullSnapshot: snapshotText
    });

    // Try using Claude for extraction if available (more robust)
    // But always run fallback extraction too and merge results
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

        logger.info('Claude extraction complete, will merge with fallback extraction', {
          name: opportunityName,
          stage: stage,
          fieldCount: Object.keys(fields).length
        });
      } catch (error) {
        logger.warn('Claude extraction failed, will use fallback extraction', error);
      }
    }

    // Always run fallback extraction to supplement Claude's results
    // This is especially important for extracting field values from the page

    // Extract opportunity name from heading or title
    // Look for patterns like "Opportunity Tribute Technology - Test Opp 3"
    for (const [, element] of Object.entries(snapshot.data.refs)) {
      const name = element.name?.toString() || '';
      const role = element.role?.toString() || '';

      // Look for heading with "Opportunity" followed by the actual name
      if (role === 'heading' && name.toLowerCase().startsWith('opportunity ')) {
        opportunityName = name.substring('opportunity '.length).trim();
        logger.debug('Found opportunity name from heading', { opportunityName });
      }
      // Fallback: Look for any heading with dashes and reasonable length
      else if (role === 'heading' && opportunityName === 'Unknown' && name.length > 15 && name.includes('-')) {
        opportunityName = name;
        logger.debug('Found opportunity name from heading (fallback)', { opportunityName });
      }

      // Look for stage indicator (paragraph with "Stage:" or similar)
      if ((name.toLowerCase().includes('stage:') || name.toLowerCase().includes('stage ')) &&
          (name.includes('Prospect') || name.includes('Qualification') || name.includes('Value') ||
           name.includes('Technical') || name.includes('Business') || name.includes('Negotiate'))) {
        // Extract stage from patterns like "Stage: 0 - Prospect" or just "0 - Prospect"
        const stageMatch = name.match(/(?:Stage:\s*)?(\d+\s*-\s*[A-Za-z\s&]+)/i);
        if (stageMatch) {
          stage = stageMatch[1].trim();
          logger.debug('Found stage from element', { stage });
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

    // Try to extract common fields from the snapshot refs
    // Look for patterns where text element is followed by a value or link
    // Sort refs by their numeric value to maintain document order (e1, e2, e3, ...)
    const refsList = Object.entries(snapshot.data.refs).sort((a, b) => {
      const aNum = parseInt(a[0].replace(/[^0-9]/g, '')) || 0;
      const bNum = parseInt(b[0].replace(/[^0-9]/g, '')) || 0;
      return aNum - bNum;
    });

    // Log what we're looking at
    logger.info('Starting field extraction from refs', {
      totalRefs: refsList.length,
      snapshotTextPreview: snapshotText.substring(0, 500)
    });

    // Collect all text elements for debugging
    const allTextElements: Array<{ text: string; role: string; index: number }> = [];
    for (let i = 0; i < refsList.length; i++) {
      const [, element] = refsList[i];
      const text = element.name?.toString() || '';
      const role = element.role?.toString() || '';
      if (text) {
        allTextElements.push({ text, role, index: i });
      }
    }

    logger.info('All elements in snapshot', {
      totalElements: allTextElements.length,
      allElements: allTextElements.map(e => `[${e.index}] ${e.role}: "${e.text}"`).join('\n')
    });

    // Since text elements are not in refs, parse the snapshot text directly
    // Look for patterns like:
    // - text: Primary Contact
    // - link "Josh Leeder" [ref=e66]
    // - text: Amount $1,000.00
    // - text: Prospector
    // - link "Paul Huang" [ref=e69]

    const snapshotLines = snapshotText.split('\n');

    // Log lines that mention our target fields for debugging
    const relevantLines: string[] = [];
    for (let i = 0; i < snapshotLines.length; i++) {
      const line = snapshotLines[i];
      if (line.includes('Primary Contact') || line.includes('Amount') || line.includes('Prospector') || line.includes('Close Date')) {
        relevantLines.push(`[${i}] ${line}`);
      }
    }
    logger.info('Lines mentioning target fields', {
      count: relevantLines.length,
      lines: relevantLines.join('\n')
    });

    for (let i = 0; i < snapshotLines.length; i++) {
      const line = snapshotLines[i].trim();

      // Extract Primary Contact - look for "text: Primary Contact" followed by a link
      if (line === '- text: Primary Contact' && i + 1 < snapshotLines.length) {
        const nextLine = snapshotLines[i + 1].trim();
        const linkMatch = nextLine.match(/- link "([^"]+)"/);
        if (linkMatch) {
          fields['Primary_Contact__c'] = linkMatch[1];
          logger.info('Extracted Primary Contact from snapshot text', { contact: linkMatch[1] });
        }
      }

      // Extract Amount - look for "text: Amount $X,XXX.XX"
      if (line.startsWith('- text: Amount') && line.includes('$')) {
        const amountMatch = line.match(/\$\s*([\d,]+(?:\.\d{2})?)/);
        if (amountMatch) {
          const amountValue = amountMatch[1].replace(/,/g, '');
          fields['Amount'] = amountValue;
          logger.info('Extracted Amount from snapshot text', { amount: amountValue, fullLine: line });
        }
      }

      // Extract Prospector - look for "text: Prospector" followed by a link
      if (line === '- text: Prospector' && i + 1 < snapshotLines.length) {
        const nextLine = snapshotLines[i + 1].trim();
        const linkMatch = nextLine.match(/- link "([^"]+)"/);
        if (linkMatch) {
          fields['Prospector__c'] = linkMatch[1];
          logger.info('Extracted Prospector from snapshot text', { prospector: linkMatch[1] });
        }
      }

      // Extract Close Date - look for "text: Close Date" followed by text with date
      if (line === '- text: Close Date' && i + 1 < snapshotLines.length) {
        const nextLine = snapshotLines[i + 1].trim();
        const dateMatch = nextLine.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
        if (dateMatch) {
          fields['CloseDate'] = dateMatch[1];
          logger.info('Extracted Close Date from snapshot text', { date: dateMatch[1] });
        }
      }
    }

    logger.info('Field extraction from refs complete', {
      extractedFields: Object.keys(fields),
      fieldValues: fields
    });

    // Fallback: Try regex patterns on snapshot text
    const fieldPatterns: Record<string, RegExp> = {
      Amount: /Amount[:\s]+\$?([\d,]+(?:\.\d{2})?)/i,
      CloseDate: /Close Date[:\s]+(\d{1,2}\/\d{1,2}\/\d{4})/i,
      'Implicated_Pain__c': /Implicated Pain[:\s]+([^\n]+)/i,
      'Champion__c': /Champion[:\s]+([^\n]+)/i,
      NextStep: /Next Step[:\s]+([^\n]+)/i,
    };

    for (const [fieldName, pattern] of Object.entries(fieldPatterns)) {
      // Only use regex if we haven't already extracted this field from refs
      if (!fields[fieldName]) {
        const match = snapshotText.match(pattern);
        if (match) {
          let value = match[1].trim();
          // Clean up Amount value (remove $ and commas)
          if (fieldName === 'Amount') {
            value = value.replace(/[$,]/g, '');
          }
          fields[fieldName] = value;
        }
      }
    }

    logger.info('Final extraction results (Claude + fallback combined)', {
      id: opportunityId,
      name: opportunityName,
      stage: stage,
      fieldCount: Object.keys(fields).length,
      fields: fields,
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

    for (const [, element] of Object.entries(snapshot.data.refs)) {
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

    const systemPrompt = `You are a Salesforce page parser. Extract opportunity information from an accessibility tree snapshot.

CRITICAL: You MUST return ONLY valid JSON. Do not include any explanatory text, just the JSON object.

The input is an accessibility tree from agent-browser with a hierarchical structure like:
- heading "Opportunity Name" [ref=e43]
- paragraph: Stage: 0 - Prospect
- text: Amount $1,000.00
- text: Primary Contact
- link "John Doe" [ref=e71]

Extract:
1. Opportunity Name - Look for heading with "Opportunity" followed by the name (e.g., "Opportunity Tribute Technology - Test Opp 3")
2. Stage - Look for "Stage: X - Y" pattern or in the Path section. Common formats: "0 - Prospect", "1 - Qualification", etc.
3. Key Fields - Extract field values from patterns like:
   - "text: Amount $X"
   - "text: Close Date X/X/XXXX"
   - "text: Primary Contact" followed by a link
   - "text: Prospector" followed by a link
   - Look in both "Key Fields" section and "Opportunity Details" section

IMPORTANT FIELD EXTRACTION:
- Amount: Extract numeric value from "Amount $X,XXX.XX" (remove $ and commas, just the number)
- Close Date: Extract from "Close Date MM/DD/YYYY"
- Primary Contact: Extract name from link after "Primary Contact" text
- Prospector: Extract name from link after "Prospector" text

Return ONLY this exact JSON structure (no markdown, no explanations):
{
  "name": "Opportunity Name",
  "stage": "Current Stage",
  "fields": {
    "Amount": "1000",
    "CloseDate": "2026-03-15",
    "Primary_Contact__c": "John Doe",
    "Prospector__c": "Jane Smith"
  }
}

If you cannot find a field, use "Unknown" for name/stage or use empty object {} for fields.`;

    const snapshotChunk = snapshotText.substring(0, 15000);
    const userPrompt = `Extract opportunity information from this Salesforce Lightning page accessibility tree.

Key sections to look for:
1. Main heading with "Opportunity" - this is the name
2. Path section with stage selector
3. "Key Fields" section (appears early) with Amount, Primary Contact, Prospector
4. "Opportunity Details" section (appears later) with more fields

Here is the accessibility tree:

${snapshotChunk}`;

    logger.info('Sending snapshot to Claude for extraction', {
      snapshotLength: snapshotText.length,
      chunkLength: snapshotChunk.length,
      preview: snapshotChunk.substring(0, 300)
    });

    try {
      const result = await this.claude.sendMessageForJSON<{
        name: string;
        stage: string;
        fields: Record<string, any>;
      }>(systemPrompt, userPrompt);

      logger.info('Claude returned extraction result', {
        result: JSON.stringify(result, null, 2)
      });

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
