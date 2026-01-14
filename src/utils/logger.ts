import { writeFileSync, appendFileSync, existsSync } from 'fs';
import { join } from 'path';

export class Logger {
  private logFile: string;

  constructor(logFile: string = 'vercel-sales-agent.log') {
    this.logFile = logFile;

    // Create log file if it doesn't exist
    if (!existsSync(this.logFile)) {
      writeFileSync(this.logFile, '');
    }
  }

  private formatMessage(level: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    let logMessage = `[${timestamp}] [${level}] ${message}`;

    if (data) {
      logMessage += `\n${JSON.stringify(data, null, 2)}`;
    }

    return logMessage + '\n';
  }

  info(message: string, data?: any): void {
    const formatted = this.formatMessage('INFO', message, data);
    console.log(formatted);
    appendFileSync(this.logFile, formatted);
  }

  error(message: string, error?: any): void {
    const data = error instanceof Error ? { message: error.message, stack: error.stack } : error;
    const formatted = this.formatMessage('ERROR', message, data);
    console.error(formatted);
    appendFileSync(this.logFile, formatted);
  }

  warn(message: string, data?: any): void {
    const formatted = this.formatMessage('WARN', message, data);
    console.warn(formatted);
    appendFileSync(this.logFile, formatted);
  }

  debug(message: string, data?: any): void {
    const formatted = this.formatMessage('DEBUG', message, data);
    appendFileSync(this.logFile, formatted);
  }
}

// Export singleton instance
export const logger = new Logger();
