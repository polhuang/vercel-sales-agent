import fs from 'fs';
import { logger } from '../../utils/logger.js';
import { SalesforceCookies } from '../../types/cookies.js';

interface SessionFile {
  version: string;
  savedAt: string;
  cookies: SalesforceCookies;
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
  saveCookies(cookies: SalesforceCookies): void {
    try {
      const sessionData: SessionFile = {
        version: this.fileVersion,
        savedAt: new Date().toISOString(),
        cookies,
      };

      const json = JSON.stringify(sessionData, null, 2);
      fs.writeFileSync(this.filePath, json, { mode: 0o600 });

      const age = this.getSessionAge();
      const sidPrefix = cookies.sid.substring(0, 10);
      logger.info('Session saved to disk', {
        filePath: this.filePath,
        sidPrefix: sidPrefix + '...',
        age,
      });
    } catch (error) {
      logger.error('Failed to save session', error);
    }
  }

  /**
   * Load cookies from disk with validation
   * Returns null if file missing, invalid, expired, or corrupt
   * Auto-deletes invalid/expired sessions
   * Never throws - returns null on any failure
   */
  loadCookies(): SalesforceCookies | null {
    try {
      if (!this.sessionExists()) {
        logger.debug('No session file found', { filePath: this.filePath });
        return null;
      }

      const fileContent = fs.readFileSync(this.filePath, 'utf-8');
      let sessionData: SessionFile;

      try {
        sessionData = JSON.parse(fileContent);
      } catch (parseError) {
        logger.warn('Session file contains invalid JSON, deleting', {
          filePath: this.filePath,
        });
        this.clearSession();
        return null;
      }

      // Validate file structure
      if (!this.isValidSessionFile(sessionData)) {
        logger.warn('Session file has invalid structure, deleting', {
          filePath: this.filePath,
        });
        this.clearSession();
        return null;
      }

      // Check version
      if (sessionData.version !== this.fileVersion) {
        logger.warn('Session file has incompatible version, deleting', {
          expected: this.fileVersion,
          actual: sessionData.version,
        });
        this.clearSession();
        return null;
      }

      // Check expiration
      if (this.isSessionExpired()) {
        logger.info('Session expired, deleting', {
          age: this.getSessionAge(),
          maxAge: this.maxAgeMs,
        });
        this.clearSession();
        return null;
      }

      const sidPrefix = sessionData.cookies.sid.substring(0, 10);
      logger.info('Session loaded from disk', {
        filePath: this.filePath,
        sidPrefix: sidPrefix + '...',
        age: this.getSessionAge(),
      });

      return sessionData.cookies;
    } catch (error) {
      logger.error('Failed to load session', error);
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

    // Check cookies object has required sid field
    if (typeof data.cookies.sid !== 'string' || !data.cookies.sid) {
      return false;
    }

    // Validate optional fields if present
    const optionalFields = ['oid', 'clientSrc', 'sid_Client', 'BrowserId', 'disco', 'inst'];
    for (const field of optionalFields) {
      if (data.cookies[field] !== undefined && typeof data.cookies[field] !== 'string') {
        return false;
      }
    }

    return true;
  }
}
