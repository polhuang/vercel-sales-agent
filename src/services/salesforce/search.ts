import { AgentBrowserService } from './browser.js';
import { logger } from '../../utils/logger.js';

export interface OpportunitySearchResult {
  id: string;
  name: string;
  accountName: string;
  stage: string;
  amount?: string;
}

export class SearchService {
  private browser: AgentBrowserService;
  private baseUrl: string = 'https://vercel.lightning.force.com';

  constructor(browser: AgentBrowserService) {
    this.browser = browser;
  }

  /**
   * Search for opportunities by name or account name
   */
  async searchOpportunities(searchTerm: string): Promise<OpportunitySearchResult[]> {
    // Navigate to opportunities list
    const url = `${this.baseUrl}/lightning/o/Opportunity/list`;
    await this.browser.navigate(url);
    await this.browser.wait(2000);

    // Get snapshot and look for search box
    const snapshot = await this.browser.getSnapshot();

    // Find search input
    let searchRef: string | null = null;
    for (const [ref, element] of Object.entries(snapshot.data.refs)) {
      if (element.role === 'searchbox' && element.name?.includes('Search this list')) {
        searchRef = ref;
        break;
      }
    }

    if (!searchRef) {
      throw new Error('Could not find search box');
    }

    // Perform search
    await this.browser.fillField(`@${searchRef}`, searchTerm);
    await this.browser.wait(2000);

    // Get updated snapshot with search results
    const resultsSnapshot = await this.browser.getSnapshot();
    const results: OpportunitySearchResult[] = [];

    // Parse search results from snapshot
    // Look for opportunity links in the results
    for (const [ref, element] of Object.entries(resultsSnapshot.data.refs)) {
      if (element.role === 'link' && element.name) {
        const name = element.name.toString();
        // Opportunities typically have specific naming patterns
        // This is a simplified parser - may need refinement
        if (name.length > 5 && !name.includes('Show Actions') && !name.includes('New')) {
          // Try to extract opportunity ID from the element
          // This is a placeholder - actual implementation would parse more carefully
          results.push({
            id: '', // Would need to extract from link/context
            name: name,
            accountName: '', // Would need to extract from row
            stage: '', // Would need to extract from row
          });
        }
      }
    }

    return results;
  }

  /**
   * Get current opportunities from homepage
   */
  async getCurrentOpportunities(): Promise<OpportunitySearchResult[]> {
    const snapshot = await this.browser.getSnapshot();
    const results: OpportunitySearchResult[] = [];
    const seenNames = new Set<string>();

    // Get current page URL to check if we have opportunities visible
    const currentUrl = await this.browser.getCurrentUrl();
    logger.debug('Getting opportunities from current page', { url: currentUrl });

    // Look through all refs for opportunity links
    for (const [ref, element] of Object.entries(snapshot.data.refs)) {
      if (element.role === 'link' && element.name) {
        const name = element.name.toString();

        // Opportunities typically have specific naming patterns with dashes, years, or descriptive suffixes
        // They are NOT just simple company names (those are usually accounts)
        const hasOpportunityPattern =
          name.includes(' - ') ||  // Has dashes like "Company - IB - Infra - 2026"
          /\b(20\d{2})\b/.test(name) ||  // Contains a year like 2026
          /\b(Q[1-4])\b/.test(name) ||  // Contains quarter like Q1, Q2
          name.includes(' IB ') ||  // Inbound indicator
          name.includes(' OB ') ||  // Outbound indicator
          name.includes('Infra') ||
          name.includes('Platform') ||
          name.includes('Enterprise') ||
          name.includes('Expansion');

        // Opportunities typically:
        // - Are links
        // - Have names longer than 10 characters
        // - Match opportunity naming patterns
        // - Don't contain navigation keywords
        const isLikelyOpportunity =
          name.length > 10 &&
          hasOpportunityPattern &&
          !name.includes('Show Actions') &&
          !name.includes('View All') &&
          !name.includes('View Report') &&
          !name.includes('Show more') &&
          !name.includes('List') &&
          !name.includes('New') &&
          !['Home', 'Accounts', 'Contacts', 'Opportunities', 'Dashboards', 'Reports', 'Tasks', 'Notes', 'Files', 'Contracts'].includes(name);

        if (isLikelyOpportunity) {
          // Deduplicate by name - only add if we haven't seen this name before
          if (!seenNames.has(name)) {
            seenNames.add(name);
            results.push({
              id: ref, // Use the element ref as ID for now
              name: name,
              accountName: '', // Would need to parse from context
              stage: '', // Would need to parse from context
            });
          }
        }
      }
    }

    logger.info(`Found ${results.length} opportunities on current page`);
    return results;
  }

  /**
   * Click on an opportunity by its ref
   */
  async clickOpportunity(ref: string): Promise<void> {
    await this.browser.clickElement(`@${ref}`);
    await this.browser.wait(3000); // Wait for page load
  }
}
