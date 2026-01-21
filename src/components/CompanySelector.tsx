import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { CompanyCandidate } from '../types/linkedin.js';

interface CompanySelectorProps {
	candidates: CompanyCandidate[];
	onSelect: (candidate: CompanyCandidate) => void;
	onCancel: () => void;
}

export function CompanySelector({ candidates, onSelect, onCancel }: CompanySelectorProps) {
	const [selectedIndex, setSelectedIndex] = useState<number>(0);

	// Handle user input
	React.useEffect(() => {
		const handleInput = (data: Buffer) => {
			const key = data.toString();

			// Number keys 1-9 for direct selection
			const num = parseInt(key, 10);
			if (num >= 1 && num <= candidates.length) {
				onSelect(candidates[num - 1]);
				return;
			}

			// Enter key to confirm selected
			if (key === '\r' || key === '\n') {
				onSelect(candidates[selectedIndex]);
				return;
			}

			// Arrow keys
			if (key === '\u001B[A' && selectedIndex > 0) {
				// Up arrow
				setSelectedIndex(selectedIndex - 1);
			} else if (key === '\u001B[B' && selectedIndex < candidates.length - 1) {
				// Down arrow
				setSelectedIndex(selectedIndex + 1);
			}

			// ESC or Ctrl+C to cancel
			if (key === '\u001B' || key === '\u0003') {
				onCancel();
			}
		};

		process.stdin.on('data', handleInput);
		process.stdin.setRawMode(true);
		process.stdin.resume();

		return () => {
			process.stdin.off('data', handleInput);
		};
	}, [candidates, selectedIndex, onSelect, onCancel]);

	return (
		<Box flexDirection="column" padding={1}>
			<Text bold color="cyan">
				Multiple Companies Found
			</Text>

			<Box marginTop={1}>
				<Text dimColor>
					Found {candidates.length} companies matching your search. Please select one:
				</Text>
			</Box>

			<Box marginTop={1} flexDirection="column">
				{candidates.map((candidate, idx) => {
					const isSelected = idx === selectedIndex;
					const number = idx + 1;

					return (
						<Box
							key={idx}
							flexDirection="column"
							marginTop={idx > 0 ? 1 : 0}
							borderStyle="round"
							borderColor={isSelected ? 'green' : 'dim'}
							paddingX={1}
						>
							<Box>
								<Text bold color={isSelected ? 'green' : 'white'}>
									{number}. {candidate.name}
								</Text>
							</Box>

							{candidate.location && (
								<Box marginTop={0}>
									<Text dimColor>Location: </Text>
									<Text>{candidate.location}</Text>
								</Box>
							)}

							{candidate.industry && (
								<Box>
									<Text dimColor>Industry: </Text>
									<Text>{candidate.industry}</Text>
								</Box>
							)}

							{candidate.followerCount && (
								<Box>
									<Text dimColor>Followers: </Text>
									<Text>{candidate.followerCount}</Text>
								</Box>
							)}

							<Box>
								<Text dimColor>URL: </Text>
								<Text color="blue">{candidate.href.substring(0, 60)}...</Text>
							</Box>
						</Box>
					);
				})}
			</Box>

			<Box marginTop={2}>
				<Text dimColor>
					Press 1-{candidates.length} to select • Use arrow keys + Enter • Press ESC to cancel
				</Text>
			</Box>
		</Box>
	);
}
