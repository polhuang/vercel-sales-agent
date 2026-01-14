import { AgentBrowserService } from './browser.js';
import { SalesforceCookies } from '../../types/cookies.js';

export class AuthService {
  private browser: AgentBrowserService;
  private cookies: SalesforceCookies | null = null;

  constructor(browser: AgentBrowserService) {
    this.browser = browser;
  }

  /**
   * Authenticate with Salesforce using cookies
   */
  async authenticate(cookies: SalesforceCookies, url: string = 'https://vercel.my.salesforce.com'): Promise<void> {
    this.cookies = cookies;

    // Open Salesforce
    await this.browser.navigate(url);
    await this.browser.wait(1000);

    // Set cookies sequentially
    await this.browser.setCookie('sid', cookies.sid, 'vercel.my.salesforce.com');

    if (cookies.oid) {
      await this.browser.setCookie('oid', cookies.oid, 'vercel.my.salesforce.com');
    }

    if (cookies.clientSrc) {
      await this.browser.setCookie('clientSrc', cookies.clientSrc, 'vercel.my.salesforce.com');
    }

    if (cookies.sid_Client) {
      await this.browser.setCookie('sid_Client', cookies.sid_Client, 'vercel.my.salesforce.com');
    }

    if (cookies.BrowserId) {
      await this.browser.setCookie('BrowserId', cookies.BrowserId, '.salesforce.com');
    }

    if (cookies.disco) {
      await this.browser.setCookie('disco', cookies.disco, '.salesforce.com');
    }

    // Set inst cookie (default: APP_PZ)
    const inst = cookies.inst || 'APP_PZ';
    await this.browser.setCookie('inst', inst, '.force.com');

    // Reload to apply cookies
    await this.browser.reload();
    await this.browser.wait(2000);
  }

  /**
   * Verify authentication by checking for login elements
   */
  async verifyAuthentication(): Promise<boolean> {
    const snapshot = await this.browser.getSnapshot();
    const snapshotText = snapshot.data.snapshot.toLowerCase();

    // Check if we're still on login page
    const hasLoginElements =
      snapshotText.includes('log in with okta') ||
      snapshotText.includes('password') ||
      snapshotText.includes('username');

    return !hasLoginElements;
  }

  /**
   * Get stored cookies
   */
  getCookies(): SalesforceCookies | null {
    return this.cookies;
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    this.cookies = null;
  }
}
