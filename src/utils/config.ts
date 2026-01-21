import fs from 'fs';
import path from 'path';
import { AppConfig } from '../types/config.js';
import { logger } from './logger.js';

const CONFIG_FILE_NAME = '.vercel-sales-agent.config.json';

/**
 * Load application configuration from config file
 * Looks for .vercel-sales-agent.config.json in:
 * 1. Current working directory
 * 2. User's home directory
 */
export function loadConfig(): AppConfig {
	const config: AppConfig = {};

	// Try current directory first
	const cwdConfigPath = path.join(process.cwd(), CONFIG_FILE_NAME);
	if (fs.existsSync(cwdConfigPath)) {
		try {
			const fileContent = fs.readFileSync(cwdConfigPath, 'utf-8');
			const parsed = JSON.parse(fileContent);
			Object.assign(config, parsed);
			logger.info('Loaded config from current directory', { path: cwdConfigPath });
		} catch (error) {
			logger.warn('Failed to parse config file', { path: cwdConfigPath, error });
		}
	}

	// Try home directory if not found in cwd
	if (!config.browser?.executablePath) {
		const homeDir = process.env.HOME || process.env.USERPROFILE;
		if (homeDir) {
			const homeConfigPath = path.join(homeDir, CONFIG_FILE_NAME);
			if (fs.existsSync(homeConfigPath)) {
				try {
					const fileContent = fs.readFileSync(homeConfigPath, 'utf-8');
					const parsed = JSON.parse(fileContent);
					Object.assign(config, parsed);
					logger.info('Loaded config from home directory', { path: homeConfigPath });
				} catch (error) {
					logger.warn('Failed to parse config file', { path: homeConfigPath, error });
				}
			}
		}
	}

	// Log final config (without sensitive values)
	if (config.browser?.executablePath) {
		logger.info('Configuration loaded: Using custom browser executable', {
			path: config.browser.executablePath,
			exists: fs.existsSync(config.browser.executablePath)
		});
	} else {
		logger.info('Configuration loaded: No custom browser executable configured, using default');
	}

	// Log prospecting configuration if present
	if (config.prospecting?.defaultJobTitles) {
		logger.info('Prospecting configuration loaded', {
			jobTitlesCount: config.prospecting.defaultJobTitles.length,
			hasCompanyName: !!config.prospecting.defaultCompanyName,
			hasKeywords: !!config.prospecting.defaultKeywords
		});
	}

	return config;
}

/**
 * Create example config file in current directory
 */
export function createExampleConfig(): void {
	const exampleConfig: AppConfig = {
		browser: {
			executablePath: '/path/to/chrome-or-chromium'
		}
	};

	const configPath = path.join(process.cwd(), CONFIG_FILE_NAME);
	fs.writeFileSync(configPath, JSON.stringify(exampleConfig, null, 2), { mode: 0o644 });
	logger.info('Created example config file', { path: configPath });
}
