import { AgentBrowserService } from '../browser/index.js';
import { ProspectSearchCriteria, ProspectData, CompanyCandidate } from '../../types/linkedin.js';
import { logger } from '../../utils/logger.js';
import pRetry from 'p-retry';

export class ProspectorService {
	private browser: AgentBrowserService;
	private baseUrl = 'https://www.linkedin.com';

	constructor(browser: AgentBrowserService) {
		this.browser = browser;
	}

	/**
	 * Navigate to LinkedIn home page
	 */
	async navigateToLinkedInHome(): Promise<void> {
		logger.info('Navigating to LinkedIn home page');
		await this.browser.navigate(`${this.baseUrl}/feed/`);
		await this.browser.wait(3000);

		// Verify we're on LinkedIn
		const snapshot = await this.browser.getSnapshot();
		const snapshotText = snapshot.data.snapshot.toLowerCase();

		if (!snapshotText.includes('linkedin')) {
			logger.warn('May not be on LinkedIn', {
				url: await this.browser.getCurrentUrl()
			});
		}

		logger.info('Successfully navigated to LinkedIn home');
	}

	/**
	 * Perform search with given criteria
	 * Flow: Home -> Search company -> Company page -> People tab -> Filter by titles
	 */
	async performSearch(criteria: ProspectSearchCriteria): Promise<void> {
		logger.info('Performing prospect search', { criteria });

		// Step 1: Search for company using top search bar
		if (criteria.companyName) {
			await this.searchCompany(criteria.companyName);
			await this.browser.wait(2000);

			// Step 2: Navigate to company page from search results
			await this.navigateToCompanyPage(criteria.companyName);
			await this.browser.wait(2000);

			// Step 3: Navigate to People tab on company page
			await this.navigateToPeopleTab();
			await this.browser.wait(2000);
		} else {
			// If no company provided, search people directly with job titles
			await this.searchPeopleDirect(criteria);
		}

		logger.info('Search executed successfully');
	}

	/**
	 * Search for company using direct URL navigation
	 */
	async searchCompany(companyName: string): Promise<void> {
		logger.info('Searching for company', { companyName });

		// Navigate directly to search results for companies
		const searchUrl = `${this.baseUrl}/search/results/companies/?keywords=${encodeURIComponent(companyName)}`;
		await this.browser.navigate(searchUrl);
		await this.browser.wait(3000);

		logger.info('Company search completed');
	}

	/**
	 * Extract company candidates from search results
	 */
	async extractCompanyCandidates(): Promise<CompanyCandidate[]> {
		logger.info('Extracting company candidates from search results');

		const snapshot = await this.browser.getSnapshot();
		const refs = snapshot.data.refs;

		const candidates: CompanyCandidate[] = [];

		// Look for all company links and extract their details
		for (const [ref, element] of Object.entries(refs)) {
			const role = (element as any).role?.toString() || '';
			const name = (element as any).name?.toString() || '';
			const href = (element as any).href?.toString() || '';

			// Company cards typically have a link with /company/ in href
			if (role === 'link' && href.includes('/company/') &&
				!href.includes('/jobs') &&
				!href.includes('/posts') &&
				!href.includes('/about') &&
				name && name.length > 0) {

				// Try to find associated metadata (location, industry, followers)
				const location = this.extractCompanyLocation(refs, ref);
				const industry = this.extractCompanyIndustry(refs, ref);
				const followerCount = this.extractFollowerCount(refs, ref);

				const candidate: CompanyCandidate = {
					name: name.trim(),
					location,
					industry,
					followerCount,
					ref,
					href
				};

				// Avoid duplicates (same href)
				if (!candidates.find(c => c.href === href)) {
					candidates.push(candidate);
					logger.debug('Found company candidate', {
						name: candidate.name,
						location: candidate.location,
						industry: candidate.industry
					});
				}
			}
		}

		logger.info('Extracted company candidates', { count: candidates.length });
		return candidates;
	}

	/**
	 * Extract company location from nearby elements
	 */
	private extractCompanyLocation(refs: any, companyRef: string): string | undefined {
		// Look for text elements near the company that contain location info
		// This is simplified - LinkedIn structure may vary
		for (const element of Object.values(refs)) {
			const text = (element as any).name?.toString() || '';
			// Location often contains city names or country names
			// Simple heuristic: look for patterns like "City, Country" or just "City"
			if (text.match(/^[A-Z][a-z]+(?:,\s*[A-Z][a-z]+)*$/)) {
				return text;
			}
		}
		return undefined;
	}

	/**
	 * Extract company industry from nearby elements
	 */
	private extractCompanyIndustry(refs: any, companyRef: string): string | undefined {
		// Look for industry/category text
		for (const element of Object.values(refs)) {
			const text = (element as any).name?.toString() || '';
			// Industry descriptions often contain specific keywords
			if (text.match(/(Software|Technology|Finance|Healthcare|Consulting|Marketing|Engineering)/i)) {
				return text;
			}
		}
		return undefined;
	}

	/**
	 * Extract follower count from nearby elements
	 */
	private extractFollowerCount(refs: any, companyRef: string): string | undefined {
		// Look for follower count text (e.g., "71K followers")
		for (const element of Object.values(refs)) {
			const text = (element as any).name?.toString() || '';
			if (text.match(/\d+[KM]?\s+followers?/i)) {
				return text;
			}
		}
		return undefined;
	}

	/**
	 * Navigate to selected company by clicking its ref
	 */
	async navigateToSelectedCompany(candidate: CompanyCandidate): Promise<void> {
		logger.info('Navigating to selected company', {
			name: candidate.name,
			location: candidate.location,
			href: candidate.href
		});

		await this.browser.clickElement(`@${candidate.ref}`);
		await this.browser.wait(3000);

		logger.info('Successfully navigated to company page');
	}

	/**
	 * Navigate to company page from search results (legacy - for when only one company found)
	 */
	private async navigateToCompanyPage(companyName: string): Promise<void> {
		logger.info('Navigating to company page', { companyName });

		const snapshot = await this.browser.getSnapshot();
		const refs = snapshot.data.refs;

		// Log all links found for debugging
		const allLinks: Array<{ref: string, role: string, name: string, href: string}> = [];
		for (const [ref, element] of Object.entries(refs)) {
			const role = (element as any).role?.toString() || '';
			const href = (element as any).href?.toString() || '';
			if (role === 'link' && href) {
				allLinks.push({
					ref,
					role,
					name: (element as any).name?.toString() || '',
					href
				});
			}
		}

		logger.debug('Found links on page', {
			totalLinks: allLinks.length,
			companyLinks: allLinks.filter(l => l.href.includes('/company/')).length,
			sampleLinks: allLinks.slice(0, 5).map(l => ({ name: l.name, href: l.href.substring(0, 60) }))
		});

		// Strategy 1: Look for exact company name match
		for (const link of allLinks) {
			if (link.href.includes('/company/') &&
				link.name.toLowerCase().includes(companyName.toLowerCase())) {

				logger.info('Found company link by name match', { name: link.name, href: link.href });
				await this.browser.clickElement(`@${link.ref}`);
				await this.browser.wait(3000);
				return;
			}
		}

		logger.debug('No exact name match found, trying first company link');

		// Strategy 2: Click first /company/ link that's not a jobs page
		for (const link of allLinks) {
			if (link.href.includes('/company/') &&
				!link.href.includes('/jobs') &&
				!link.href.includes('/posts') &&
				!link.href.includes('/about')) {

				logger.info('Clicking first company result', { name: link.name, href: link.href });
				await this.browser.clickElement(`@${link.ref}`);
				await this.browser.wait(3000);
				return;
			}
		}

		logger.debug('No company links found, trying to find clickable company name');

		// Strategy 3: Look for any clickable element (heading/link) with company name
		for (const [ref, element] of Object.entries(refs)) {
			const role = (element as any).role?.toString() || '';
			const name = (element as any).name?.toString() || '';

			// Look for headings or links with the company name
			if ((role === 'heading' || role === 'link') &&
				name.toLowerCase().trim() === companyName.toLowerCase().trim()) {

				logger.info('Found company by heading/element match', { role, name });
				await this.browser.clickElement(`@${ref}`);
				await this.browser.wait(3000);
				return;
			}
		}

		logger.error('Could not find any company links', {
			totalLinks: allLinks.length,
			allHrefs: allLinks.map(l => l.href).slice(0, 10)
		});

		throw new Error(`Could not find company page for: ${companyName}`);
	}

	/**
	 * Navigate to People tab on company page
	 */
	async navigateToPeopleTab(): Promise<void> {
		logger.info('Navigating to People tab');

		const snapshot = await this.browser.getSnapshot();
		const refs = snapshot.data.refs;

		// Look for "People" tab link
		for (const [ref, element] of Object.entries(refs)) {
			const role = (element as any).role?.toString() || '';
			const name = (element as any).name?.toString() || '';
			const href = (element as any).href?.toString() || '';

			if ((role === 'link' || role === 'tab') &&
				(name.toLowerCase().includes('people') || href.includes('/people'))) {

				logger.info('Found People tab, clicking');
				await this.browser.clickElement(`@${ref}`);
				await this.browser.wait(3000);
				return;
			}
		}

		throw new Error('Could not find People tab on company page');
	}

	/**
	 * Search people directly (when no company specified)
	 */
	async searchPeopleDirect(criteria: ProspectSearchCriteria): Promise<void> {
		logger.info('Searching people directly');

		// Navigate to people search
		await this.browser.navigate(`${this.baseUrl}/search/results/people/`);
		await this.browser.wait(3000);

		// Build search query with job titles
		if (criteria.jobTitles && criteria.jobTitles.length > 0) {
			const query = criteria.jobTitles.join(' OR ');
			await this.browser.navigate(
				`${this.baseUrl}/search/results/people/?keywords=${encodeURIComponent(query)}`
			);
			await this.browser.wait(3000);
		}
	}

	/**
	 * Extract prospects from search results
	 */
	async extractProspects(): Promise<ProspectData[]> {
		logger.info('Extracting prospects from search results');

		return pRetry(
			async () => {
				const snapshot = await this.browser.getSnapshot();
				const prospects = this.parseProspectsFromSnapshot(snapshot);

				if (prospects.length === 0) {
					throw new Error('No prospects found in search results');
				}

				logger.info('Successfully extracted prospects', { count: prospects.length });
				return prospects;
			},
			{
				retries: 3,
				minTimeout: 2000,
				maxTimeout: 10000,
				onFailedAttempt: async (error: any) => {
					const errorMsg = error.message || '';
					if (errorMsg.includes('rate limit')) {
						logger.warn('LinkedIn rate limit detected, waiting 30s...');
						await this.browser.wait(30000);
					} else {
						logger.warn('Extraction attempt failed', {
							attemptNumber: error.attemptNumber,
							retriesLeft: error.retriesLeft
						});
						// Wait before retrying
						await this.browser.wait(2000);
					}
				}
			}
		);
	}

	/**
	 * Parse prospects from snapshot data
	 */
	private parseProspectsFromSnapshot(snapshot: any): ProspectData[] {
		const prospects: ProspectData[] = [];
		const refs = snapshot.data.refs;

		logger.debug('Parsing snapshot for prospects', { refCount: Object.keys(refs).length });

		// Look for prospect cards (typically links with role="link" containing profile info)
		for (const [ref, element] of Object.entries(refs)) {
			const role = (element as any).role?.toString() || '';
			const name = (element as any).name?.toString() || '';
			const href = (element as any).href?.toString() || '';

			// Prospect cards are usually links with names and LinkedIn profile URLs
			if (role === 'link' && href.includes('linkedin.com/in/') && name && name.length > 3) {
				// Try to extract additional info from nearby elements
				const prospect: ProspectData = {
					name,
					title: this.extractTitle(refs) || 'Unknown Title',
					company: this.extractCompany() || 'Unknown Company',
					location: this.extractLocation(),
					linkedInUrl: href,
					headline: this.extractHeadline(),
					extractedAt: new Date().toISOString(),
					ref,
				};

				// Only add if we have meaningful data
				if (prospect.name !== 'Unknown' && !prospects.find(p => p.linkedInUrl === prospect.linkedInUrl)) {
					prospects.push(prospect);
					logger.debug('Found prospect', {
						name: prospect.name,
						title: prospect.title,
						company: prospect.company
					});
				}
			}
		}

		logger.info('Parsed prospects from snapshot', { count: prospects.length });
		return prospects;
	}

	/**
	 * Extract title from nearby elements
	 */
	private extractTitle(refs: any): string | undefined {
		// Look for text elements that might contain title
		// This is a simplified implementation - real implementation would need
		// to analyze the DOM structure more carefully
		for (const element of Object.values(refs)) {
			const text = (element as any).name?.toString() || '';
			// Titles often contain keywords like these
			if (text.match(/(CTO|CEO|VP|Director|Manager|Engineer|Lead|Head of)/i)) {
				return text;
			}
		}
		return undefined;
	}

	/**
	 * Extract company from nearby elements
	 */
	private extractCompany(): string | undefined {
		// Similar to extractTitle, look for company info
		// Company is usually displayed near the name in search results
		return undefined; // Simplified for now
	}

	/**
	 * Extract location from nearby elements
	 */
	private extractLocation(): string | undefined {
		return undefined; // Simplified for now
	}

	/**
	 * Extract headline from nearby elements
	 */
	private extractHeadline(): string | undefined {
		return undefined; // Simplified for now
	}
}
