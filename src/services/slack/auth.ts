import { AgentBrowserService } from '../browser/index.js';
import { SlackCookies } from '../../types/cookies.js';
import { logger } from '../../utils/logger.js';
import { SessionStorageService } from './sessionStorage.js';

export class AuthService {
  private browser: AgentBrowserService;
  private sessionStorage: SessionStorageService;
  private cookies: SlackCookies | null = null;

  constructor(browser: AgentBrowserService, sessionStorage: SessionStorageService) {
    this.browser = browser;
    this.sessionStorage = sessionStorage;
  }

  /**
   * Authenticate with Slack using cookies
   */
  async authenticate(cookies: SlackCookies, url: string = 'https://vercel.slack.com'): Promise<void> {
    this.cookies = cookies;

    // Open Slack
    await this.browser.navigate(url);
    await this.browser.wait(1000);

    // Set cookies sequentially
    await this.browser.setCookie('d', cookies.d, '.slack.com');

    if (cookies['d-s']) {
      await this.browser.setCookie('d-s', cookies['d-s'], '.slack.com');
    }

    if (cookies.lc) {
      await this.browser.setCookie('lc', cookies.lc, '.slack.com');
    }

    // Navigate to URL again to apply cookies
    await this.browser.navigate(url);
    await this.browser.wait(3000);
  }

  /**
   * Verify authentication by checking for login elements
   */
  async verifyAuthentication(): Promise<boolean> {
    try {
      // Check URL first
      const currentUrl = await this.browser.getCurrentUrl();
      logger.debug('Checking Slack authentication', { currentUrl });

      // Check if we're on a Slack domain
      const isOnSlackDomain = currentUrl.includes('slack.com');

      // Check if we're on a login page
      const isOnLoginPage = currentUrl.includes('signin') || currentUrl.includes('login');

      // If on login page, definitely not authenticated yet
      if (isOnLoginPage) {
        logger.debug('Still on Slack login page');
        return false;
      }

      // Get page snapshot
      const snapshot = await this.browser.getSnapshot();
      const snapshotText = snapshot.data.snapshot.toLowerCase();

      // Check we're NOT on login page
      const hasLoginElements =
        snapshotText.includes('sign in to slack') ||
        snapshotText.includes('sign in with') ||
        (snapshotText.includes('password') && snapshotText.includes('email')) ||
        snapshotText.includes('continue with google') ||
        snapshotText.includes('continue with apple');

      // If we see login elements, not authenticated
      if (hasLoginElements) {
        logger.debug('Login elements detected on Slack page');
        return false;
      }

      // Check for positive indicators of authenticated session
      const hasAuthenticatedElements =
        snapshotText.includes('vercel') ||
        snapshotText.includes('channels') ||
        snapshotText.includes('direct messages') ||
        snapshotText.includes('threads') ||
        snapshotText.includes('activity') ||
        currentUrl.includes('/client/') ||
        currentUrl.includes('/messages/');

      logger.debug('Slack authentication check results', {
        currentUrl: currentUrl.substring(0, 50) + '...',
        isOnSlackDomain,
        isOnLoginPage,
        hasAuthenticatedElements,
        hasLoginElements,
        willReturnAuthenticated: isOnSlackDomain && hasAuthenticatedElements && !hasLoginElements,
        snapshotPreview: snapshotText.substring(0, 200)
      });

      // Authenticated if: on Slack domain, has authenticated elements, no login elements
      return isOnSlackDomain && hasAuthenticatedElements && !hasLoginElements;
    } catch (error: any) {
      // If there's any error checking, assume not authenticated
      logger.error('Error checking Slack authentication', error);
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

      // Browser is already initialized at app startup - no need to reinitialize

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
  async waitForAuthenticationAndExtractCookies(url: string = 'https://vercel.slack.com'): Promise<SlackCookies> {
    // Browser is already initialized at app startup - no need to reinitialize

    // Open Slack login page
    logger.info('Opening Slack login page', { url });
    await this.browser.navigate(url);
    await this.browser.wait(2000);

    // Poll until authenticated
    logger.info('Waiting for user to authenticate to Slack...');
    let authenticated = false;
    let attempts = 0;
    const maxAttempts = 60; // 60 attempts * 2 seconds = 2 minutes

    while (!authenticated && attempts < maxAttempts) {
      authenticated = await this.verifyAuthentication();
      if (!authenticated) {
        if (attempts % 5 === 0) {
          // Log every 10 seconds
          logger.info(`Still waiting for Slack authentication... (attempt ${attempts + 1}/${maxAttempts})`);
        }
        await this.browser.wait(2000);
        attempts++;
      }
    }

    if (!authenticated) {
      logger.error('Slack authentication timeout');
      throw new Error('Authentication timeout - user did not log in to Slack within 2 minutes');
    }

    logger.info('Slack authentication detected! Extracting cookies...');

    // Extract cookies from browser
    const allCookies = await this.browser.getCookies();
    logger.debug('Retrieved cookies from browser', { count: allCookies.length });

    const cookies: Partial<SlackCookies> = {};

    for (const cookie of allCookies) {
      if (cookie.name === 'd' && cookie.domain.includes('slack.com')) {
        cookies.d = cookie.value;
        logger.debug('Found d cookie', { domain: cookie.domain });
      } else if (cookie.name === 'd-s' && cookie.domain.includes('slack.com')) {
        cookies['d-s'] = cookie.value;
      } else if (cookie.name === 'lc' && cookie.domain.includes('slack.com')) {
        cookies.lc = cookie.value;
      }
    }

    if (!cookies.d) {
      logger.error('Could not find Slack d cookie', {
        totalCookies: allCookies.length,
        cookieNames: allCookies.map(c => `${c.name} (${c.domain})`).join(', ')
      });
      throw new Error('Could not extract Slack session cookie from browser');
    }

    logger.info('Successfully extracted Slack cookies', {
      d: cookies.d.substring(0, 20) + '...',
      hasDs: !!cookies['d-s'],
      hasLc: !!cookies.lc
    });

    const validCookies = cookies as SlackCookies;
    this.cookies = validCookies;

    // Save cookies to disk for future sessions
    this.sessionStorage.saveCookies(validCookies);

    return validCookies;
  }

  /**
   * Get stored cookies
   */
  getCookies(): SlackCookies | null {
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
