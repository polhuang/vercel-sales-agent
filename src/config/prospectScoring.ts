/**
 * Prospect scoring configuration
 */

export const SCORING_WEIGHTS = {
	titleMatch: 30,
	seniority: 25,
	companyRelevance: 20,
	keywordMatch: 15,
	experienceRelevance: 10,
};

export const SENIORITY_KEYWORDS: Record<string, string[]> = {
	'C-Level': ['CEO', 'CTO', 'CIO', 'CFO', 'COO', 'Chief', 'President'],
	'VP': ['VP', 'Vice President', 'SVP', 'EVP'],
	'Director': ['Director', 'Head of', 'Head Of'],
	'Manager': ['Manager', 'Lead', 'Team Lead'],
	'IC': ['Engineer', 'Developer', 'Analyst', 'Architect', 'Specialist'],
};

export const SENIORITY_SCORES: Record<string, number> = {
	'C-Level': 25,
	'VP': 20,
	'Director': 15,
	'Manager': 10,
	'IC': 5,
};
