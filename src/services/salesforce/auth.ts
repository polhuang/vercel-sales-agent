import { AgentBrowserService } from './browser.js';
import { SalesforceCookies } from '../../types/cookies.js';
import { logger } from '../../utils/logger.js';
import { SessionStorageService } from './sessionStorage.js';

export class AuthService {
  private browser: AgentBrowserService;
  private sessionStorage: SessionStorageService;
  private cookies: SalesforceCookies | null = null;

  constructor(browser: AgentBrowserService, sessionStorage: SessionStorageService) {
    this.browser = browser;
    this.sessionStorage = sessionStorage;
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

    // Navigate to URL again to apply cookies (reload causes redirect loop)
    await this.browser.navigate(url);
    await this.browser.wait(3000);
  }

  /**
   * Verify authentication by checking for login elements
   */
  async verifyAuthentication(): Promise<boolean> {
    try {
      // Check URL first - authenticated sessions redirect to lightning.force.com or stay on my.salesforce.com
      const currentUrl = await this.browser.getCurrentUrl();
      logger.debug('Checking authentication', { currentUrl });

      // Check if we're on a Salesforce domain (not Okta login)
      const isOnSalesforceDomain =
        currentUrl.includes('salesforce.com') ||
        currentUrl.includes('force.com');

      const isOnOktaDomain = currentUrl.includes('okta.com');

      // If still on Okta, definitely not authenticated yet
      if (isOnOktaDomain) {
        logger.debug('Still on Okta login page');
        return false;
      }

      // Get page snapshot
      const snapshot = await this.browser.getSnapshot();
      const snapshotText = snapshot.data.snapshot.toLowerCase();

      // Check we're NOT on login page
      const hasLoginElements =
        snapshotText.includes('log in with okta') ||
        snapshotText.includes('log in to salesforce') ||
        (snapshotText.includes('password') && snapshotText.includes('username')) ||
        snapshotText.includes('sign in to salesforce');

      // If we see login elements, not authenticated
      if (hasLoginElements) {
        logger.debug('Login elements detected on page');
        return false;
      }

      // Check for positive indicators of authenticated session
      const hasAuthenticatedElements =
        snapshotText.includes('opportunities') ||
        snapshotText.includes('accounts') ||
        snapshotText.includes('app launcher') ||
        snapshotText.includes('home') ||
        snapshotText.includes('setup') ||
        snapshotText.includes('search salesforce') ||
        currentUrl.includes('lightning.force.com');

      logger.debug('Authentication check results', {
        currentUrl: currentUrl.substring(0, 50) + '...',
        isOnSalesforceDomain,
        isOnOktaDomain,
        hasAuthenticatedElements,
        hasLoginElements,
        willReturnAuthenticated: isOnSalesforceDomain && hasAuthenticatedElements && !hasLoginElements,
        snapshotPreview: snapshotText.substring(0, 200)
      });

      // Authenticated if: on Salesforce domain, has authenticated elements, no login elements
      return isOnSalesforceDomain && hasAuthenticatedElements && !hasLoginElements;
    } catch (error: any) {
      // If there's any error checking, assume not authenticated
      logger.error('Error checking authentication', error);
      return false;
    }
  }

  /**
   * Authenticate with saved session from disk
   * Returns true if session is valid, false otherwise
   */
  async authenticateWithSavedSession(): Promise<boolean> {
    try {
      // Load cookies from disk
      logger.info('Attempting to load saved session');
      const cookies = this.sessionStorage.loadCookies();

      if (!cookies) {
        logger.info('No saved session found');
        return false;
      }

      // Set cookies in browser using existing authenticate method
      await this.authenticate(cookies);

      // Verify session is still valid
      const isValid = await this.verifyAuthentication();

      if (!isValid) {
        logger.warn('Saved session is no longer valid, clearing');
        this.sessionStorage.clearSession();
        return false;
      }

      logger.info('Successfully authenticated with saved session');
      return true;
    } catch (error: any) {
      logger.error('Error authenticating with saved session', error);
      this.sessionStorage.clearSession();
      return false;
    }
  }

  /**
   * Wait for user to authenticate and extract cookies automatically
   */
  async waitForAuthenticationAndExtractCookies(url: string = 'https://vercel.my.salesforce.com'): Promise<SalesforceCookies> {
    // Initialize browser (close any existing session)
    logger.info('Initializing browser');
    await this.browser.initialize();

    // Open Salesforce login page
    logger.info('Opening Salesforce login page', { url });
    await this.browser.navigate(url);
    await this.browser.wait(2000);

    // Poll until authenticated
    logger.info('Waiting for user to authenticate via Okta...');
    let authenticated = false;
    let attempts = 0;
    const maxAttempts = 60; // 60 attempts * 2 seconds = 2 minutes

    while (!authenticated && attempts < maxAttempts) {
      authenticated = await this.verifyAuthentication();
      if (!authenticated) {
        if (attempts % 5 === 0) {
          // Log every 10 seconds
          logger.info(`Still waiting for authentication... (attempt ${attempts + 1}/${maxAttempts})`);
        }
        await this.browser.wait(2000);
        attempts++;
      }
    }

    if (!authenticated) {
      logger.error('Authentication timeout');
      throw new Error('Authentication timeout - user did not log in within 2 minutes');
    }

    logger.info('Authentication detected! Extracting cookies...');

    // Extract cookies from browser
    const allCookies = await this.browser.getCookies();
    logger.debug('Retrieved cookies from browser', { count: allCookies.length });

    const cookies: SalesforceCookies = {
      sid: '',
    };

    for (const cookie of allCookies) {
      if (cookie.name === 'sid' && (cookie.domain.includes('salesforce.com') || cookie.domain.includes('force.com'))) {
        // Prefer vercel.my.salesforce.com, but accept any salesforce domain
        if (!cookies.sid || cookie.domain.includes('vercel.my.salesforce.com')) {
          cookies.sid = cookie.value;
          logger.debug('Found sid cookie', { domain: cookie.domain });
        }
      } else if (cookie.name === 'oid' && cookie.domain.includes('salesforce.com')) {
        cookies.oid = cookie.value;
      } else if (cookie.name === 'clientSrc') {
        cookies.clientSrc = cookie.value;
      } else if (cookie.name === 'sid_Client') {
        cookies.sid_Client = cookie.value;
      } else if (cookie.name === 'BrowserId' && cookie.domain.includes('.salesforce.com')) {
        cookies.BrowserId = cookie.value;
      } else if (cookie.name === 'disco' && cookie.domain.includes('.salesforce.com')) {
        cookies.disco = cookie.value;
      } else if (cookie.name === 'inst' && cookie.domain.includes('.force.com')) {
        cookies.inst = cookie.value;
      }
    }

    if (!cookies.sid) {
      logger.error('Could not find sid cookie', {
        totalCookies: allCookies.length,
        cookieNames: allCookies.map(c => `${c.name} (${c.domain})`).join(', ')
      });
      throw new Error('Could not extract sid cookie from browser');
    }

    logger.info('Successfully extracted cookies', {
      sid: cookies.sid.substring(0, 20) + '...',
      hasOid: !!cookies.oid,
      hasClientSrc: !!cookies.clientSrc,
      hasSidClient: !!cookies.sid_Client
    });

    this.cookies = cookies;

    // Save cookies to disk for future sessions
    this.sessionStorage.saveCookies(cookies);

    return cookies;
  }

  /**
   * Get stored cookies
   */
  getCookies(): SalesforceCookies | null {
    return this.cookies;
  }

  /**
   * Clear saved session from disk
   */
  clearSavedSession(): void {
    this.sessionStorage.clearSession();
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    this.cookies = null;
  }
}
