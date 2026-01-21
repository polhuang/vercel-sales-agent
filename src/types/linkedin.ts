/**
 * LinkedIn types and interfaces
 */

export interface LinkedInCookies {
	li_at: string; // Required: auth token
	JSESSIONID?: string;
	liap?: string;
	bcookie?: string;
	bscookie?: string;
	lidc?: string;
}

export interface ProspectSearchCriteria {
	companyName?: string;
	jobTitles: string[]; // ["CTO", "VP Engineering"]
	keywords?: string[]; // ["kubernetes", "cloud"]
	location?: string;
	seniority?: string[]; // ["Director", "VP", "C-Level"]
}

export interface CompanyCandidate {
	name: string;
	location?: string; // City/location of company
	industry?: string; // Industry/category
	followerCount?: string; // Number of followers
	ref: string; // Reference for clicking
	href: string; // LinkedIn URL
}

export interface ProspectData {
	name: string;
	title: string;
	company: string;
	location?: string;
	linkedInUrl: string;
	headline?: string;
	extractedAt: string;
	ref: string; // For interaction
}

export interface ScoredProspect extends ProspectData {
	score: number; // 0-100
	scoreBreakdown: {
		titleMatch: number; // 0-30
		seniority: number; // 0-25
		companyRelevance: number; // 0-20
		keywordMatch: number; // 0-15
		experienceRelevance: number; // 0-10
	};
	reasoning: string;
}
