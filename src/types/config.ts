/**
 * Application configuration types
 *
 * Configuration file: .vercel-sales-agent.config.json
 * Can be placed in current directory or home directory
 */

export interface BrowserConfig {
	/**
	 * Path to browser executable
	 * If not specified, agent-browser will use default Chrome/Chromium
	 */
	executablePath?: string;
}

/**
 * Prospecting configuration for LinkedIn searches
 * All fields are optional and pre-fill the search form
 */
export interface ProspectingConfig {
	/**
	 * Default job titles to search for
	 * Example: ["CTO", "VP Engineering", "Head of Infrastructure"]
	 */
	defaultJobTitles?: string[];

	/**
	 * Default company name to search within
	 */
	defaultCompanyName?: string;

	/**
	 * Default keywords to filter prospects
	 * Example: ["kubernetes", "cloud", "DevOps"]
	 */
	defaultKeywords?: string[];
}

export interface AppConfig {
	/**
	 * Browser automation configuration
	 */
	browser?: BrowserConfig;

	/**
	 * Prospecting configuration
	 */
	prospecting?: ProspectingConfig;

	// Future config options can be added here:
	// logging?: LoggingConfig;
	// api?: ApiConfig;
	// etc.
}
