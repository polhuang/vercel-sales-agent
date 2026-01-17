import { execa } from 'execa';
import pRetry from 'p-retry';
import { PageSnapshot } from '../../types/opportunity.js';
import { logger } from '../../utils/logger.js';

export class AgentBrowserService {
  private sessionName: string;
  private headful: boolean;
  private browserLaunched: boolean = false;
  private initialized: boolean = false;

  constructor(sessionName: string = 'default', headful: boolean = true) {
    this.sessionName = sessionName;
    this.headful = headful;
  }

  /**
   * Initialize browser service - closes any existing session
   */
  async initialize(): Promise<void> {
    logger.info('Initializing browser service', {
      headful: this.headful,
      initialized: this.initialized,
      browserLaunched: this.browserLaunched
    });

    if (this.initialized) {
      logger.info('Already initialized, skipping');
      return;
    }

    try {
      // Try to close any existing session (without session filter to close all)
      logger.info('Closing any existing browser session');
      await execa('npx', ['agent-browser', 'close'], {
        timeout: 10000,
      });
      logger.info('Existing session closed');

      // Wait a bit for daemon to fully shutdown
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      // Ignore errors - session might not exist
      logger.debug('No existing session to close or close failed', error);
    }

    this.initialized = true;
    this.browserLaunched = false;
    logger.info('Browser service initialized', { browserLaunched: this.browserLaunched });
  }

  /**
   * Execute agent-browser command with retry logic
   */
  async exec(command: string, args: string[] = [], options: {timeout?: number} = {}): Promise<string> {
    const timeout = options.timeout || 30000;

    // Determine if we should use --headed flag BEFORE retry loop
    const shouldUseHeaded = command === 'open' && this.headful && !this.browserLaunched;

    if (shouldUseHeaded) {
      logger.info('Opening browser in headful mode', {
        headful: this.headful,
        browserLaunched: this.browserLaunched
      });
    }

    return pRetry(
      async () => {
        try {
          // Build command args - use --headed on ALL attempts if needed
          let cmdArgs: string[];
          if (shouldUseHeaded) {
            cmdArgs = ['--headed', command, ...args];
          } else {
            cmdArgs = [command, ...args];
          }

          logger.debug('Executing agent-browser command', {
            command: `agent-browser ${cmdArgs.join(' ')}`
          });

          const { stdout } = await execa('npx', ['agent-browser', ...cmdArgs], {
            timeout,
            env: {
              ...process.env,
              AGENT_BROWSER_SESSION: this.sessionName,
            },
          });

          // Only mark as launched after successful execution
          if (shouldUseHeaded) {
            this.browserLaunched = true;
            logger.info('Browser launched successfully in headful mode');
          }

          return stdout;
        } catch (error: any) {
          // Log the error details
          logger.error('agent-browser command failed', {
            command: command,
            args: args,
            shouldUseHeaded: shouldUseHeaded,
            exitCode: error.exitCode,
            message: error.message,
            stderr: error.stderr,
            stdout: error.stdout
          });

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
    await this.exec('open', [url]);
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
  }
}
