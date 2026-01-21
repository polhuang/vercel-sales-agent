import { AgentBrowserService } from '../browser/index.js';
import { LinkedInCookies } from '../../types/linkedin.js';
import { logger } from '../../utils/logger.js';
import { LinkedInSessionStorageService } from './sessionStorage.js';

export class LinkedInAuthService {
	private browser: AgentBrowserService;
	private sessionStorage: LinkedInSessionStorageService;
	private cookies: LinkedInCookies | null = null;

	constructor(browser: AgentBrowserService, sessionStorage: LinkedInSessionStorageService) {
		this.browser = browser;
		this.sessionStorage = sessionStorage;
	}

	/**
	 * Authenticate with LinkedIn using cookies
	 */
	async authenticate(cookies: LinkedInCookies, url: string = 'https://www.linkedin.com/feed'): Promise<void> {
		this.cookies = cookies;

		// Open LinkedIn
		await this.browser.navigate(url);
		await this.browser.wait(1000);

		// Set cookies sequentially
		await this.browser.setCookie('li_at', cookies.li_at, '.linkedin.com');

		if (cookies.JSESSIONID) {
			await this.browser.setCookie('JSESSIONID', cookies.JSESSIONID, '.linkedin.com');
		}

		if (cookies.liap) {
			await this.browser.setCookie('liap', cookies.liap, '.linkedin.com');
		}

		if (cookies.bcookie) {
			await this.browser.setCookie('bcookie', cookies.bcookie, '.linkedin.com');
		}

		if (cookies.bscookie) {
			await this.browser.setCookie('bscookie', cookies.bscookie, '.www.linkedin.com');
		}

		if (cookies.lidc) {
			await this.browser.setCookie('lidc', cookies.lidc, '.linkedin.com');
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
			logger.debug('Checking LinkedIn authentication', { currentUrl });

			// Check if we're on a LinkedIn domain (not login page)
			const isOnLinkedInDomain = currentUrl.includes('linkedin.com');
			const isOnLoginPage = currentUrl.includes('login') || currentUrl.includes('checkpoint');

			// If on login page, definitely not authenticated yet
			if (isOnLoginPage) {
				logger.debug('Still on LinkedIn login page');
				return false;
			}

			// Get page snapshot
			const snapshot = await this.browser.getSnapshot();
			const snapshotText = snapshot.data.snapshot.toLowerCase();

			// Check we're NOT on login page
			const hasLoginElements =
				snapshotText.includes('sign in') ||
				snapshotText.includes('join now') ||
				(snapshotText.includes('password') && snapshotText.includes('email')) ||
				snapshotText.includes('forgot password');

			// If we see login elements, not authenticated
			if (hasLoginElements) {
				logger.debug('Login elements detected on page');
				return false;
			}

			// Check for positive indicators of authenticated session
			const hasAuthenticatedElements =
				snapshotText.includes('home') ||
				snapshotText.includes('my network') ||
				snapshotText.includes('jobs') ||
				snapshotText.includes('messaging') ||
				snapshotText.includes('notifications') ||
				currentUrl.includes('/feed') ||
				currentUrl.includes('/mynetwork') ||
				currentUrl.includes('/in/');

			logger.debug('LinkedIn authentication check results', {
				currentUrl: currentUrl.substring(0, 50) + '...',
				isOnLinkedInDomain,
				isOnLoginPage,
				hasAuthenticatedElements,
				hasLoginElements,
				willReturnAuthenticated: isOnLinkedInDomain && hasAuthenticatedElements && !hasLoginElements,
				snapshotPreview: snapshotText.substring(0, 200)
			});

			// Authenticated if: on LinkedIn domain, has authenticated elements, no login elements
			return isOnLinkedInDomain && hasAuthenticatedElements && !hasLoginElements;
		} catch (error: any) {
			// If there's any error checking, assume not authenticated
			logger.error('Error checking LinkedIn authentication', error);
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
			logger.info('Attempting to load saved LinkedIn session');
			const cookies = this.sessionStorage.loadCookies();

			if (!cookies) {
				logger.info('No saved LinkedIn session found');
				return false;
			}

			// Browser is already initialized at app startup - no need to reinitialize

			// Set cookies in browser using existing authenticate method
			await this.authenticate(cookies);

			// Verify session is still valid
			const isValid = await this.verifyAuthentication();

			if (!isValid) {
				logger.warn('Saved LinkedIn session is no longer valid, clearing');
				this.sessionStorage.clearSession();
				return false;
			}

			logger.info('Successfully authenticated with saved LinkedIn session');
			return true;
		} catch (error: any) {
			logger.error('Error authenticating with saved LinkedIn session', error);
			this.sessionStorage.clearSession();
			return false;
		}
	}

	/**
	 * Wait for user to authenticate and extract cookies automatically
	 */
	async waitForAuthenticationAndExtractCookies(url: string = 'https://www.linkedin.com'): Promise<LinkedInCookies> {
		// Browser is already initialized at app startup - no need to reinitialize

		// Open LinkedIn login page
		logger.info('Opening LinkedIn login page', { url });
		await this.browser.navigate(url);
		await this.browser.wait(2000);

		// Poll until authenticated
		logger.info('Waiting for user to authenticate via LinkedIn...');
		let authenticated = false;
		let attempts = 0;
		const maxAttempts = 60; // 60 attempts * 2 seconds = 2 minutes

		while (!authenticated && attempts < maxAttempts) {
			authenticated = await this.verifyAuthentication();
			if (!authenticated) {
				if (attempts % 5 === 0) {
					// Log every 10 seconds
					logger.info(`Still waiting for LinkedIn authentication... (attempt ${attempts + 1}/${maxAttempts})`);
				}
				await this.browser.wait(2000);
				attempts++;
			}
		}

		if (!authenticated) {
			logger.error('LinkedIn authentication timeout');
			throw new Error('LinkedIn authentication timeout - user did not log in within 2 minutes');
		}

		logger.info('LinkedIn authentication detected! Extracting cookies...');

		// Extract cookies from browser
		const allCookies = await this.browser.getCookies();
		logger.debug('Retrieved cookies from browser', { count: allCookies.length });

		const cookies: LinkedInCookies = {
			li_at: '',
		};

		for (const cookie of allCookies) {
			if (cookie.name === 'li_at' && cookie.domain.includes('linkedin.com')) {
				cookies.li_at = cookie.value;
				logger.debug('Found li_at cookie', { domain: cookie.domain });
			} else if (cookie.name === 'JSESSIONID' && cookie.domain.includes('linkedin.com')) {
				cookies.JSESSIONID = cookie.value;
			} else if (cookie.name === 'liap' && cookie.domain.includes('linkedin.com')) {
				cookies.liap = cookie.value;
			} else if (cookie.name === 'bcookie' && cookie.domain.includes('linkedin.com')) {
				cookies.bcookie = cookie.value;
			} else if (cookie.name === 'bscookie' && cookie.domain.includes('linkedin.com')) {
				cookies.bscookie = cookie.value;
			} else if (cookie.name === 'lidc' && cookie.domain.includes('linkedin.com')) {
				cookies.lidc = cookie.value;
			}
		}

		if (!cookies.li_at) {
			logger.error('Could not find li_at cookie', {
				totalCookies: allCookies.length,
				cookieNames: allCookies.map(c => `${c.name} (${c.domain})`).join(', ')
			});
			throw new Error('Could not extract li_at cookie from browser');
		}

		logger.info('Successfully extracted LinkedIn cookies', {
			li_at: cookies.li_at.substring(0, 20) + '...',
			hasJSESSIONID: !!cookies.JSESSIONID,
			hasLiap: !!cookies.liap,
			hasBcookie: !!cookies.bcookie
		});

		this.cookies = cookies;

		// Save cookies to disk for future sessions
		this.sessionStorage.saveCookies(cookies);

		return cookies;
	}

	/**
	 * Get stored cookies
	 */
	getCookies(): LinkedInCookies | null {
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
