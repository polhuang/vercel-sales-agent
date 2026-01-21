import fs from 'fs';
import { logger } from '../../utils/logger.js';
import { LinkedInCookies } from '../../types/linkedin.js';

interface SessionFile {
	version: string;
	savedAt: string;
	cookies: LinkedInCookies;
}

export class LinkedInSessionStorageService {
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
	saveCookies(cookies: LinkedInCookies): void {
		try {
			const sessionData: SessionFile = {
				version: this.fileVersion,
				savedAt: new Date().toISOString(),
				cookies,
			};

			const json = JSON.stringify(sessionData, null, 2);
			fs.writeFileSync(this.filePath, json, { mode: 0o600 });

			const age = this.getSessionAge();
			const tokenPrefix = cookies.li_at.substring(0, 10);
			logger.info('LinkedIn session saved to disk', {
				filePath: this.filePath,
				tokenPrefix: tokenPrefix + '...',
				age,
			});
		} catch (error) {
			logger.error('Failed to save LinkedIn session', error);
		}
	}

	/**
	 * Load cookies from disk with validation
	 * Returns null if file missing, invalid, expired, or corrupt
	 * Auto-deletes invalid/expired sessions
	 * Never throws - returns null on any failure
	 */
	loadCookies(): LinkedInCookies | null {
		try {
			if (!this.sessionExists()) {
				logger.debug('No LinkedIn session file found', { filePath: this.filePath });
				return null;
			}

			const fileContent = fs.readFileSync(this.filePath, 'utf-8');
			let sessionData: SessionFile;

			try {
				sessionData = JSON.parse(fileContent);
			} catch (parseError) {
				logger.warn('LinkedIn session file contains invalid JSON, deleting', {
					filePath: this.filePath,
				});
				this.clearSession();
				return null;
			}

			// Validate file structure
			if (!this.isValidSessionFile(sessionData)) {
				logger.warn('LinkedIn session file has invalid structure, deleting', {
					filePath: this.filePath,
				});
				this.clearSession();
				return null;
			}

			// Check version
			if (sessionData.version !== this.fileVersion) {
				logger.warn('LinkedIn session file has incompatible version, deleting', {
					expected: this.fileVersion,
					actual: sessionData.version,
				});
				this.clearSession();
				return null;
			}

			// Check expiration
			if (this.isSessionExpired()) {
				logger.info('LinkedIn session expired, deleting', {
					age: this.getSessionAge(),
					maxAge: this.maxAgeMs,
				});
				this.clearSession();
				return null;
			}

			const tokenPrefix = sessionData.cookies.li_at.substring(0, 10);
			logger.info('LinkedIn session loaded from disk', {
				filePath: this.filePath,
				tokenPrefix: tokenPrefix + '...',
				age: this.getSessionAge(),
			});

			return sessionData.cookies;
		} catch (error) {
			logger.error('Failed to load LinkedIn session', error);
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
				logger.info('LinkedIn session file deleted', { filePath: this.filePath });
			}
		} catch (error) {
			logger.error('Failed to delete LinkedIn session file', error);
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

		// Check cookies object has required li_at field
		if (typeof data.cookies.li_at !== 'string' || !data.cookies.li_at) {
			return false;
		}

		// Validate optional fields if present
		const optionalFields = ['JSESSIONID', 'liap', 'bcookie', 'bscookie', 'lidc'];
		for (const field of optionalFields) {
			if (data.cookies[field] !== undefined && typeof data.cookies[field] !== 'string') {
				return false;
			}
		}

		return true;
	}
}
