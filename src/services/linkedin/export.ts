import fs from 'fs';
import { ScoredProspect } from '../../types/linkedin.js';
import { logger } from '../../utils/logger.js';
import { sanitizeCSV } from '../../utils/csv.js';

export class ExportService {
	private exportDir = 'exports';

	constructor() {
		// Ensure export directory exists
		if (!fs.existsSync(this.exportDir)) {
			fs.mkdirSync(this.exportDir, { mode: 0o755 });
			logger.info('Created exports directory', { path: this.exportDir });
		}
	}

	/**
	 * Export prospects to CSV format
	 */
	async exportToCSV(prospects: ScoredProspect[]): Promise<string> {
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		const filename = `${this.exportDir}/prospects-${timestamp}.csv`;

		// CSV header
		const header = 'Name,Title,Company,Location,LinkedIn URL,Score,Title Match,Seniority,Company Relevance,Keyword Match,Experience,Reasoning\n';

		// CSV rows
		const rows = prospects.map(p => {
			return [
				sanitizeCSV(p.name),
				sanitizeCSV(p.title),
				sanitizeCSV(p.company),
				sanitizeCSV(p.location || ''),
				p.linkedInUrl,
				p.score,
				p.scoreBreakdown.titleMatch,
				p.scoreBreakdown.seniority,
				p.scoreBreakdown.companyRelevance,
				p.scoreBreakdown.keywordMatch,
				p.scoreBreakdown.experienceRelevance,
				sanitizeCSV(p.reasoning)
			].join(',');
		}).join('\n');

		fs.writeFileSync(filename, header + rows, { mode: 0o644 });

		logger.info('Exported prospects to CSV', {
			filename,
			count: prospects.length
		});

		return filename;
	}

	/**
	 * Export prospects to JSON format
	 */
	async exportToJSON(prospects: ScoredProspect[]): Promise<string> {
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		const filename = `${this.exportDir}/prospects-${timestamp}.json`;

		const data = {
			exportedAt: new Date().toISOString(),
			totalProspects: prospects.length,
			prospects
		};

		fs.writeFileSync(filename, JSON.stringify(data, null, 2), { mode: 0o644 });

		logger.info('Exported prospects to JSON', {
			filename,
			count: prospects.length
		});

		return filename;
	}
}
