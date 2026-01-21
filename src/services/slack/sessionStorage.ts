import fs from 'fs';
import { logger } from '../../utils/logger.js';
import { SlackCookies } from '../../types/cookies.js';

interface SessionFile {
  version: string;
  savedAt: string;
  cookies: SlackCookies;
}

export class SessionStorageService {
  private readonly filePath: string;
  private readonly maxAgeMs: number;
  private readonly fileVersion = '1.0';

  constructor(filePath: string, maxAgeDays: number = 7) {
    this.filePath = filePath;
    this.maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
  }

  /**
   * Save cookies to disk with versioning and timestamp
   * Sets file permissions to 0600 (owner read/write only)
   * Never throws - logs errors and returns silently
   */
  saveCookies(cookies: SlackCookies): void {
    try {
      const sessionData: SessionFile = {
        version: this.fileVersion,
        savedAt: new Date().toISOString(),
        cookies,
      };

      const json = JSON.stringify(sessionData, null, 2);
      fs.writeFileSync(this.filePath, json, { mode: 0o600 });

      const age = this.getSessionAge();
      const dPrefix = cookies.d.substring(0, 10);
      logger.info('Slack session saved to disk', {
        filePath: this.filePath,
        dPrefix: dPrefix + '...',
        age,
      });
    } catch (error) {
      logger.error('Failed to save Slack session', error);
    }
  }

  /**
   * Load cookies from disk with validation
   * Returns null if file missing, invalid, expired, or corrupt
   * Auto-deletes invalid/expired sessions
   * Never throws - returns null on any failure
   */
  loadCookies(): SlackCookies | null {
    try {
      if (!this.sessionExists()) {
        logger.debug('No Slack session file found', { filePath: this.filePath });
        return null;
      }

      const fileContent = fs.readFileSync(this.filePath, 'utf-8');
      let sessionData: SessionFile;

      try {
        sessionData = JSON.parse(fileContent);
      } catch (parseError) {
        logger.warn('Slack session file contains invalid JSON, deleting', {
          filePath: this.filePath,
        });
        this.clearSession();
        return null;
      }

      // Validate file structure
      if (!this.isValidSessionFile(sessionData)) {
        logger.warn('Slack session file has invalid structure, deleting', {
          filePath: this.filePath,
        });
        this.clearSession();
        return null;
      }

      // Check version
      if (sessionData.version !== this.fileVersion) {
        logger.warn('Slack session file has incompatible version, deleting', {
          expected: this.fileVersion,
          actual: sessionData.version,
        });
        this.clearSession();
        return null;
      }

      // Check expiration
      if (this.isSessionExpired()) {
        logger.info('Slack session expired, deleting', {
          age: this.getSessionAge(),
          maxAge: this.maxAgeMs,
        });
        this.clearSession();
        return null;
      }

      const dPrefix = sessionData.cookies.d.substring(0, 10);
      logger.info('Slack session loaded from disk', {
        filePath: this.filePath,
        dPrefix: dPrefix + '...',
        age: this.getSessionAge(),
      });

      return sessionData.cookies;
    } catch (error) {
      logger.error('Failed to load Slack session', error);
      return null;
    }
  }

  /**
   * Delete session file from disk
   * Never throws - logs errors and returns silently
   */
  clearSession(): void {
    try {
      if (this.sessionExists()) {
        fs.unlinkSync(this.filePath);
        logger.info('Session file deleted', { filePath: this.filePath });
      }
    } catch (error) {
      logger.error('Failed to delete session file', error);
    }
  }

  /**
   * Check if session file exists on disk
   */
  sessionExists(): boolean {
    return fs.existsSync(this.filePath);
  }

  /**
   * Get age of saved session in milliseconds
   * Returns null if session doesn't exist or is invalid
   */
  getSessionAge(): number | null {
    try {
      if (!this.sessionExists()) {
        return null;
      }

      const fileContent = fs.readFileSync(this.filePath, 'utf-8');
      const sessionData: SessionFile = JSON.parse(fileContent);

      if (!sessionData.savedAt) {
        return null;
      }

      const savedAt = new Date(sessionData.savedAt).getTime();
      const now = Date.now();
      return now - savedAt;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if saved session has exceeded maximum age
   * Returns false if session doesn't exist or is invalid
   */
  isSessionExpired(): boolean {
    const age = this.getSessionAge();
    if (age === null) {
      return false;
    }
    return age > this.maxAgeMs;
  }

  /**
   * Validate session file structure
   * Checks for required fields and correct types
   */
  private isValidSessionFile(data: any): data is SessionFile {
    if (!data || typeof data !== 'object') {
      return false;
    }

    // Check top-level fields
    if (
      typeof data.version !== 'string' ||
      typeof data.savedAt !== 'string' ||
      !data.cookies ||
      typeof data.cookies !== 'object'
    ) {
      return false;
    }

    // Check cookies object has required d field
    if (typeof data.cookies.d !== 'string' || !data.cookies.d) {
      return false;
    }

    // Validate optional fields if present
    const optionalFields = ['d-s', 'lc'];
    for (const field of optionalFields) {
      if (data.cookies[field] !== undefined && typeof data.cookies[field] !== 'string') {
        return false;
      }
    }

    return true;
  }
}
