import { AgentBrowserService } from './browser.js';

export class NavigationService {
  private browser: AgentBrowserService;
  private baseUrl: string = 'https://vercel.lightning.force.com';

  constructor(browser: AgentBrowserService) {
    this.browser = browser;
  }

  /**
   * Navigate to opportunity view page
   */
  async goToOpportunity(oppId: string): Promise<void> {
    const url = `${this.baseUrl}/lightning/r/Opportunity/${oppId}/view`;
    await this.browser.navigate(url);
    await this.browser.wait(3000); // Wait for page load
  }

  /**
   * Open edit mode for current opportunity
   */
  async openEditMode(): Promise<void> {
    const snapshot = await this.browser.getSnapshot();

    // Find Edit button
    for (const [ref, element] of Object.entries(snapshot.data.refs)) {
      if (element.name === 'Edit' && element.role === 'button') {
        await this.browser.clickElement(`@${ref}`);
        await this.browser.wait(2000); // Wait for form to load
        return;
      }
    }

    throw new Error('Edit button not found');
  }

  /**
   * Save opportunity
   */
  async saveOpportunity(): Promise<void> {
    const snapshot = await this.browser.getSnapshot();

    // Find Save button
    for (const [ref, element] of Object.entries(snapshot.data.refs)) {
      if (element.name === 'Save' && element.role === 'button') {
        await this.browser.clickElement(`@${ref}`);
        await this.browser.wait(3000); // Wait for save to complete
        return;
      }
    }

    throw new Error('Save button not found');
  }

  /**
   * Navigate to home page
   */
  async goToHome(): Promise<void> {
    const url = `${this.baseUrl}/lightning/page/home`;
    await this.browser.navigate(url);
    await this.browser.wait(2000);
  }

  /**
   * Navigate to opportunities list
   */
  async goToOpportunitiesList(): Promise<void> {
    const url = `${this.baseUrl}/lightning/o/Opportunity/list`;
    await this.browser.navigate(url);
    await this.browser.wait(2000);
  }
}
