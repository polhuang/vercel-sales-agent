import React from 'react';
import { Box, Text } from 'ink';
import { ScoredProspect } from '../types/linkedin.js';

interface ProspectResultsViewerProps {
	prospects: ScoredProspect[];
	exportMessage?: string;
}

export function ProspectResultsViewer({ prospects, exportMessage }: ProspectResultsViewerProps) {
	const topProspects = prospects.slice(0, 20);
	const remainingCount = prospects.length - topProspects.length;

	return (
		<Box flexDirection="column" padding={1}>
			<Text bold color="cyan">
				Prospect Search Results
			</Text>

			<Box marginTop={1}>
				<Text>
					Found {prospects.length} prospects, sorted by relevance score
				</Text>
			</Box>

			{exportMessage && (
				<Box marginTop={1}>
					<Text color="green">{exportMessage}</Text>
				</Box>
			)}

			<Box marginTop={2} flexDirection="column">
				<Text bold color="yellow">
					Top {topProspects.length} Prospects:
				</Text>
				{topProspects.map((p, i) => (
					<Box key={i} marginTop={1} flexDirection="column">
						<Text>
							{i + 1}. <Text bold>{p.name}</Text> - {p.title} at {p.company}
							<Text color={p.score >= 70 ? 'green' : p.score >= 50 ? 'yellow' : 'dim'}>
								{' '}
								(Score: {p.score})
							</Text>
						</Text>
						<Text dimColor>   {p.reasoning}</Text>
						<Text dimColor>   {p.linkedInUrl}</Text>
					</Box>
				))}
				{remainingCount > 0 && (
					<Box marginTop={1}>
						<Text dimColor>... and {remainingCount} more prospects</Text>
					</Box>
				)}
			</Box>

			<Box marginTop={2} flexDirection="column">
				<Text bold>Actions:</Text>
				<Text>• Press 'c' to export as CSV</Text>
				<Text>• Press 'j' to export as JSON</Text>
				<Text>• Press 'm' to return to main menu</Text>
				<Text>• Press Ctrl+C to exit</Text>
			</Box>
		</Box>
	);
}
