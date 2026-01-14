import { AgentBrowserService } from './browser.js';
import { OpportunityState } from '../../types/opportunity.js';

export class FieldExtractorService {
  private browser: AgentBrowserService;

  constructor(browser: AgentBrowserService) {
    this.browser = browser;
  }

  /**
   * Extract current opportunity state from page
   */
  async extractOpportunityState(): Promise<OpportunityState> {
    const snapshot = await this.browser.getSnapshot();
    const fields: Record<string, any> = {};

    // Extract opportunity name from page title or header
    let opportunityName = 'Unknown';
    let opportunityId = '';
    let stage = '';

    // Try to get current URL to extract ID
    const currentUrl = await this.browser.getCurrentUrl();
    const oppIdMatch = currentUrl.match(/Opportunity\/([a-zA-Z0-9]+)/);
    if (oppIdMatch) {
      opportunityId = oppIdMatch[1];
    }

    // Look for opportunity name and stage in snapshot
    for (const [ref, element] of Object.entries(snapshot.data.refs)) {
      const name = element.name?.toString() || '';
      const role = element.role?.toString() || '';

      // Try to identify stage from path or stage indicator
      if (name.includes('Stage:') || name.includes('stage')) {
        stage = name.replace(/Stage:\s*/i, '').trim();
      }

      // Try to identify fields by their labels
      // This is a simplified extraction - in production, you'd want more robust parsing
      if (role === 'textbox' || role === 'combobox') {
        fields[name] = element.value || '';
      }
    }

    // Parse snapshot text for stage if not found
    if (!stage) {
      const snapshotText = snapshot.data.snapshot;
      const stageMatch = snapshotText.match(/Stage:\s*([^\n]+)/i);
      if (stageMatch) {
        stage = stageMatch[1].trim();
      }
    }

    return {
      id: opportunityId,
      name: opportunityName,
      stage: stage || 'Unknown',
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
}
