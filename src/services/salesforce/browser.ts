import { execa } from 'execa';
import pRetry from 'p-retry';
import { PageSnapshot } from '../../types/opportunity.js';

export class AgentBrowserService {
  private sessionName: string;

  constructor(sessionName: string = 'default') {
    this.sessionName = sessionName;
  }

  /**
   * Execute agent-browser command with retry logic
   */
  async exec(command: string, args: string[] = [], options: {timeout?: number} = {}): Promise<string> {
    const timeout = options.timeout || 30000;

    return pRetry(
      async () => {
        try {
          const { stdout } = await execa('agent-browser', [command, ...args], {
            timeout,
            env: {
              ...process.env,
              AGENT_BROWSER_SESSION: this.sessionName,
            },
          });
          return stdout;
        } catch (error: any) {
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
          console.error(`Attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`);
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
   */
  async getSnapshot(): Promise<PageSnapshot> {
    const output = await this.exec('snapshot', ['-i', '--json']);
    return JSON.parse(output);
  }

  /**
   * Set cookie
   */
  async setCookie(name: string, value: string, domain: string): Promise<void> {
    await this.exec('cookies', ['set', name, value, '--domain', domain]);
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
