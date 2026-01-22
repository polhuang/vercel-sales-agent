import { execa } from 'execa';
import pRetry from 'p-retry';
import { PageSnapshot } from '../../types/opportunity.js';
import { logger } from '../../utils/logger.js';

export class AgentBrowserService {
  private sessionName: string;
  private headful: boolean;
  private browserLaunched: boolean = false;
  private initialized: boolean = false;
  private executablePath?: string;

  constructor(sessionName: string = 'default', headful: boolean = true, executablePath?: string) {
    this.sessionName = sessionName;
    this.headful = headful;
    this.executablePath = executablePath;
  }

  /**
   * Initialize browser service - tries to resume existing session if available
   * If headful mode is required, always forces a fresh browser launch
   */
  async initialize(): Promise<void> {
    logger.info('Initializing browser service', {
      headful: this.headful,
      initialized: this.initialized,
      browserLaunched: this.browserLaunched,
      hasCustomExecutable: !!this.executablePath
    });

    if (this.initialized) {
      logger.info('Already initialized, skipping');
      return;
    }

    // If headful mode is required, always close existing sessions to ensure visible browser
    if (this.headful) {
      logger.info('Headful mode requested, closing any existing sessions to ensure visible browser');
      try {
        await execa('npx', ['agent-browser', 'close'], {
          timeout: 10000,
        });
        logger.info('Existing session closed successfully');

        // Wait longer for daemon to fully shutdown when using custom executable
        const waitTime = this.executablePath ? 2000 : 500;
        logger.debug(`Waiting ${waitTime}ms for daemon to shutdown`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } catch (error) {
        // Ignore errors - session might not exist
        logger.debug('No existing session to close or close failed', error);
      }

      this.initialized = true;
      this.browserLaunched = false;
      logger.info('Browser service initialized for headful mode', {
        browserLaunched: this.browserLaunched,
        executablePath: this.executablePath
      });
      return;
    }

    // For headless mode, try to resume existing session
    const existingSession = await this.checkExistingSession();

    if (existingSession) {
      logger.info('Found existing browser session, resuming');
      this.initialized = true;
      this.browserLaunched = true;
      return;
    }

    // No existing session or session is broken - close and start fresh
    try {
      logger.info('No existing session found, closing any stale sessions');
      await execa('npx', ['agent-browser', 'close'], {
        timeout: 10000,
      });
      logger.info('Existing session closed successfully');

      // Wait longer for daemon to fully shutdown when using custom executable
      const waitTime = this.executablePath ? 2000 : 500;
      logger.debug(`Waiting ${waitTime}ms for daemon to shutdown`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    } catch (error) {
      // Ignore errors - session might not exist
      logger.debug('No existing session to close or close failed', error);
    }

    this.initialized = true;
    this.browserLaunched = false;
    logger.info('Browser service initialized', {
      browserLaunched: this.browserLaunched,
      executablePath: this.executablePath
    });
  }

  /**
   * Check if there's an existing browser session that can be resumed
   */
  private async checkExistingSession(): Promise<boolean> {
    try {
      logger.debug('Checking for existing browser session');

      // Try to get a snapshot - if this works, we have a working session
      const result = await execa('npx', ['agent-browser', 'snapshot', '--json'], {
        timeout: 5000,
      });

      if (result.stdout) {
        const snapshot = JSON.parse(result.stdout);
        if (snapshot && snapshot.data) {
          logger.info('Existing session is active and responsive');
          return true;
        }
      }

      return false;
    } catch (error) {
      logger.debug('No existing session found or session not responsive', error);
      return false;
    }
  }

  /**
   * Execute agent-browser command with retry logic
   */
  async exec(command: string, args: string[] = [], options: {timeout?: number} = {}): Promise<string> {
    const timeout = options.timeout || 30000;

    // Determine if we should use --headed flag BEFORE retry loop
    const shouldUseHeaded = command === 'open' && this.headful && !this.browserLaunched;

    // Only add --executable-path on the initial browser launch
    const shouldAddExecutablePath = command === 'open' && !this.browserLaunched && this.executablePath;

    if (shouldUseHeaded) {
      logger.info('Opening browser in headful mode', {
        headful: this.headful,
        browserLaunched: this.browserLaunched,
        customExecutable: this.executablePath
      });
    }

    return pRetry(
      async () => {
        try {
          // Build command args - flags must come BEFORE the command
          const finalCmdArgs: string[] = [];

          // Add --executable-path FIRST if this is initial launch
          if (shouldAddExecutablePath) {
            finalCmdArgs.push('--executable-path', this.executablePath!);
            logger.info('Adding --executable-path to browser launch', {
              path: this.executablePath
            });
          }

          // Add --headed flag if needed
          if (shouldUseHeaded) {
            finalCmdArgs.push('--headed');
          }

          // Add the actual command and args
          finalCmdArgs.push(command, ...args);

          // Build environment variables
          const env: Record<string, string> = {
            ...process.env as Record<string, string>,
            AGENT_BROWSER_SESSION: this.sessionName,
          };

          // Also set via environment variable as fallback
          if (this.executablePath) {
            env.AGENT_BROWSER_EXECUTABLE_PATH = this.executablePath;
          }

          logger.debug('Executing agent-browser command', {
            command: `agent-browser ${finalCmdArgs.join(' ')}`,
            hasCustomExecutable: !!this.executablePath,
            executablePath: this.executablePath,
            envVar: env.AGENT_BROWSER_EXECUTABLE_PATH
          });

          const { stdout } = await execa('npx', ['agent-browser', ...finalCmdArgs], {
            timeout,
            env,
          });

          // Only mark as launched after successful execution
          if (shouldUseHeaded || shouldAddExecutablePath) {
            this.browserLaunched = true;
            logger.info('Browser launched successfully', {
              headful: shouldUseHeaded,
              customExecutable: shouldAddExecutablePath ? this.executablePath : undefined
            });

            // Wait longer after initial browser launch to ensure daemon is stable
            logger.debug('Waiting for browser to stabilize after launch');
            await new Promise(resolve => setTimeout(resolve, 2000));
          }

          return stdout;
        } catch (error: any) {
          // Check if this is an "execution context destroyed" error
          const isContextDestroyedError =
            error.stderr?.includes('Execution context was destroyed') ||
            error.message?.includes('Execution context was destroyed');

          // Log the error details
          logger.error('agent-browser command failed', {
            command: command,
            args: args,
            shouldUseHeaded: shouldUseHeaded,
            exitCode: error.exitCode,
            message: error.message,
            stderr: error.stderr,
            stdout: error.stdout,
            isContextDestroyedError
          });

          // For execution context errors, wait longer before retry
          if (isContextDestroyedError) {
            logger.warn('Execution context destroyed, waiting 3s before retry');
            await new Promise(resolve => setTimeout(resolve, 3000));
          }

          // Take screenshot on error for debugging
          if (error.exitCode !== 0) {
            try {
              await this.screenshot(`debug/error-${Date.now()}.png`);
            } catch {}
          }
          throw error;
        }
      },
      {
        retries: 3,
        minTimeout: 1000,
        maxTimeout: 10000,
        factor: 2,
        onFailedAttempt: (error) => {
          logger.warn(`Attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`);
        },
      }
    );
  }

  /**
   * Navigate to URL
   */
  async navigate(url: string): Promise<void> {
    // If browser is already running, add a small wait before navigation
    // to ensure any previous page operations have completed
    if (this.browserLaunched) {
      logger.debug('Browser already running, waiting before navigation', { url });
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    try {
      await this.exec('open', [url]);
    } catch (error: any) {
      // If this is a context destroyed error during navigation to Slack,
      // it might still have navigated successfully
      const isContextError =
        error.stderr?.includes('Execution context was destroyed') ||
        error.message?.includes('Execution context was destroyed');

      if (isContextError && url.includes('slack.com')) {
        logger.warn('Context destroyed during Slack navigation, waiting and verifying');
        // Wait for page to stabilize
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Check if we actually made it to Slack
        try {
          const currentUrl = await this.getCurrentUrl();
          if (currentUrl.includes('slack.com')) {
            logger.info('Navigation to Slack succeeded despite context error', { currentUrl });
            return;
          }
        } catch {
          // If we can't get URL, re-throw original error
        }
      }

      throw error;
    }
  }

  /**
   * Click element by reference
   */
  async clickElement(ref: string): Promise<void> {
    await this.exec('click', [ref]);
  }

  /**
   * Fill field with value
   */
  async fillField(ref: string, value: string): Promise<void> {
    await this.exec('fill', [ref, value]);
  }

  /**
   * Get page snapshot
   * Note: Using '--json' without '-i' to get complete unfiltered snapshot including text elements
   */
  async getSnapshot(): Promise<PageSnapshot> {
    const output = await this.exec('snapshot', ['--json']);
    return JSON.parse(output);
  }

  /**
   * Set cookie
   */
  async setCookie(name: string, value: string, domain: string): Promise<void> {
    await this.exec('cookies', ['set', name, value, '--domain', domain]);
  }

  /**
   * Get all cookies
   */
  async getCookies(): Promise<any[]> {
    const output = await this.exec('cookies', ['get', '--json']);
    const result = JSON.parse(output);
    return result.data?.cookies || [];
  }

  /**
   * Get current URL
   */
  async getCurrentUrl(): Promise<string> {
    return await this.exec('get', ['url']);
  }

  /**
   * Reload page
   */
  async reload(): Promise<void> {
    await this.exec('reload');
  }

  /**
   * Take screenshot
   */
  async screenshot(path: string): Promise<void> {
    await this.exec('screenshot', [path]);
  }

  /**
   * Wait for specified time
   */
  async wait(ms: number): Promise<void> {
    await this.exec('wait', [ms.toString()]);
  }

  /**
   * Close browser
   */
  async close(): Promise<void> {
    await this.exec('close');
    // Reset state so next initialize() will launch a fresh browser
    this.initialized = false;
    this.browserLaunched = false;
  }
}
