import React from 'react';
import { Box, Text } from 'ink';
import { Select } from '@inkjs/ui';

interface MainMenuProps {
	onSelect: (option: 'prospecting' | 'salesforce' | 'slack') => void;
}

export function MainMenu({ onSelect }: MainMenuProps) {
	const options = [
		{
			label: 'LinkedIn Prospecting & List Building',
			value: 'prospecting',
		},
		{
			label: 'Salesforce Automation',
			value: 'salesforce',
		},
		{
			label: 'Slack Automation',
			value: 'slack',
		},
	];

	const handleChange = (value: string) => {
		if (value === 'prospecting' || value === 'salesforce' || value === 'slack') {
			onSelect(value);
		}
	};

	return (
		<Box flexDirection="column" padding={1}>
			<Text bold color="cyan">
				Vercel Sales Agent
			</Text>
			<Box marginTop={1}>
				<Text dimColor>Select a workflow to begin:</Text>
			</Box>
			<Box marginTop={2}>
				<Select
					options={options}
					onChange={handleChange}
					visibleOptionCount={3}
				/>
			</Box>
			<Box marginTop={2}>
				<Text dimColor>Use ↑/↓ arrows to navigate, Enter to select, Ctrl+C to exit</Text>
			</Box>
		</Box>
	);
}
