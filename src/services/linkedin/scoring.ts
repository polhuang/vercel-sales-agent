import { ClaudeClient } from '../claude/client.js';
import { ProspectSearchCriteria, ProspectData, ScoredProspect } from '../../types/linkedin.js';
import { logger } from '../../utils/logger.js';
import { SCORING_WEIGHTS } from '../../config/prospectScoring.js';

export class ProspectScoringService {
	private claude: ClaudeClient;

	constructor(claude: ClaudeClient) {
		this.claude = claude;
	}

	/**
	 * Score prospects using Claude AI
	 */
	async scoreProspects(
		prospects: ProspectData[],
		criteria: ProspectSearchCriteria
	): Promise<ScoredProspect[]> {
		logger.info('Starting prospect scoring', {
			prospectCount: prospects.length,
			criteria
		});

		// Process in batches of 10 to avoid token limits
		const batches = this.chunkArray(prospects, 10);
		const scoredProspects: ScoredProspect[] = [];

		for (let i = 0; i < batches.length; i++) {
			const batch = batches[i];
			logger.info(`Processing batch ${i + 1}/${batches.length}`, {
				batchSize: batch.length
			});

			try {
				const scoredBatch = await this.scoreBatch(batch, criteria);
				scoredProspects.push(...scoredBatch);
			} catch (error: any) {
				logger.error('Failed to score batch', {
					batchIndex: i,
					error: error.message
				});
				// Add prospects with default score 0 if scoring fails
				scoredProspects.push(...batch.map(p => this.createDefaultScoredProspect(p)));
			}
		}

		// Sort by score descending
		scoredProspects.sort((a, b) => b.score - a.score);

		logger.info('Prospect scoring completed', {
			totalScored: scoredProspects.length,
			averageScore: scoredProspects.reduce((sum, p) => sum + p.score, 0) / scoredProspects.length
		});

		return scoredProspects;
	}

	/**
	 * Score a batch of prospects
	 */
	private async scoreBatch(
		prospects: ProspectData[],
		criteria: ProspectSearchCriteria
	): Promise<ScoredProspect[]> {
		const systemPrompt = this.buildScoringPrompt();
		const userPrompt = this.buildUserPrompt(prospects, criteria);

		const result = await this.claude.sendMessageForJSON<{ prospects: ScoredProspect[] }>(
			systemPrompt,
			userPrompt
		);

		return result.prospects;
	}

	/**
	 * Build system prompt for scoring
	 */
	private buildScoringPrompt(): string {
		return `You are a sales prospecting expert. Score prospects 0-100 based on relevance to search criteria.

Scoring criteria:
- Title Match (0-${SCORING_WEIGHTS.titleMatch}): How well job title matches target titles
  - Exact match or very similar: full points
  - Related title: partial points
  - Unrelated title: low points

- Seniority (0-${SCORING_WEIGHTS.seniority}): Level of decision-making authority
  - C-Level (CEO, CTO, CIO, etc.): ${SCORING_WEIGHTS.seniority} points
  - VP/SVP: 20 points
  - Director/Head of: 15 points
  - Manager/Lead: 10 points
  - Individual Contributor: 5 points

- Company Relevance (0-${SCORING_WEIGHTS.companyRelevance}): Match to target company or similar industry/size
  - Target company match: full points
  - Similar company (size/industry): partial points
  - Unknown or different company: low points

- Keyword Match (0-${SCORING_WEIGHTS.keywordMatch}): Keywords in profile/headline
  - Multiple keyword matches: high points
  - One keyword match: medium points
  - No keyword matches: low points

- Experience Relevance (0-${SCORING_WEIGHTS.experienceRelevance}): Relevant background based on title/headline
  - Highly relevant experience: full points
  - Somewhat relevant: partial points
  - Not relevant: low points

IMPORTANT: Return ONLY valid JSON. No markdown formatting, no code blocks, no additional text.

Return JSON with this exact structure:
{
  "prospects": [
    {
      "name": "string",
      "title": "string",
      "company": "string",
      "location": "string or undefined",
      "linkedInUrl": "string",
      "headline": "string or undefined",
      "extractedAt": "string",
      "ref": "string",
      "score": number (0-100),
      "scoreBreakdown": {
        "titleMatch": number (0-${SCORING_WEIGHTS.titleMatch}),
        "seniority": number (0-${SCORING_WEIGHTS.seniority}),
        "companyRelevance": number (0-${SCORING_WEIGHTS.companyRelevance}),
        "keywordMatch": number (0-${SCORING_WEIGHTS.keywordMatch}),
        "experienceRelevance": number (0-${SCORING_WEIGHTS.experienceRelevance})
      },
      "reasoning": "Brief explanation (1-2 sentences) of why this score"
    }
  ]
}`;
	}

	/**
	 * Build user prompt with prospects and criteria
	 */
	private buildUserPrompt(prospects: ProspectData[], criteria: ProspectSearchCriteria): string {
		const criteriaDescription = `
Search Criteria:
${criteria.companyName ? `- Target Company: ${criteria.companyName}` : '- Target Company: Not specified'}
- Target Job Titles: ${criteria.jobTitles.join(', ')}
${criteria.keywords && criteria.keywords.length > 0 ? `- Keywords: ${criteria.keywords.join(', ')}` : '- Keywords: Not specified'}
${criteria.location ? `- Location: ${criteria.location}` : ''}
`;

		const prospectsJson = JSON.stringify(prospects, null, 2);

		return `${criteriaDescription}

Prospects to score:
${prospectsJson}

Score each prospect based on how well they match the criteria. Return the complete JSON structure with all prospect data plus score, scoreBreakdown, and reasoning fields.`;
	}

	/**
	 * Create default scored prospect with score 0 (used when scoring fails)
	 */
	private createDefaultScoredProspect(prospect: ProspectData): ScoredProspect {
		return {
			...prospect,
			score: 0,
			scoreBreakdown: {
				titleMatch: 0,
				seniority: 0,
				companyRelevance: 0,
				keywordMatch: 0,
				experienceRelevance: 0,
			},
			reasoning: 'Scoring failed - default score assigned',
		};
	}

	/**
	 * Chunk array into smaller batches
	 */
	private chunkArray<T>(array: T[], size: number): T[][] {
		const chunks: T[][] = [];
		for (let i = 0; i < array.length; i += size) {
			chunks.push(array.slice(i, i + size));
		}
		return chunks;
	}
}
