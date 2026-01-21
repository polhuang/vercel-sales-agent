import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { TextInput } from '@inkjs/ui';
import { ProspectSearchCriteria } from '../types/linkedin.js';

interface ProspectCriteriaInputProps {
	onSubmit: (criteria: ProspectSearchCriteria) => void;
	defaultJobTitles?: string[];
	defaultCompanyName?: string;
	defaultKeywords?: string[];
}

const fields = [
	{
		key: 'companyName',
		displayName: 'Company Name',
		description: 'Target company name (optional)',
		required: false,
	},
	{
		key: 'jobTitles',
		displayName: 'Job Titles',
		description: 'Comma-separated job titles (e.g., CTO, VP Engineering)',
		required: true,
	},
	{
		key: 'keywords',
		displayName: 'Keywords',
		description: 'Comma-separated keywords (e.g., kubernetes, cloud, DevOps)',
		required: false,
	},
];

export function ProspectCriteriaInput({
	onSubmit,
	defaultJobTitles,
	defaultCompanyName,
	defaultKeywords
}: ProspectCriteriaInputProps) {
	const [currentIndex, setCurrentIndex] = useState(0);
	const [values, setValues] = useState<Record<string, string>>(() => {
		const initialValues: Record<string, string> = {};

		if (defaultCompanyName) {
			initialValues.companyName = defaultCompanyName;
		}

		if (defaultJobTitles && defaultJobTitles.length > 0) {
			initialValues.jobTitles = defaultJobTitles.join(', ');
		}

		if (defaultKeywords && defaultKeywords.length > 0) {
			initialValues.keywords = defaultKeywords.join(', ');
		}

		return initialValues;
	});

	const currentField = fields[currentIndex];
	const isLastField = currentIndex === fields.length - 1;

	const handleSubmit = (value: string) => {
		const trimmedValue = value.trim();

		// Store value (even if empty for optional fields)
		const newValues = { ...values };
		if (trimmedValue) {
			newValues[currentField.key] = trimmedValue;
		}

		// Check if required field is empty AND doesn't have a default value
		if (currentField.required && !trimmedValue && !newValues[currentField.key]) {
			return; // Don't advance if required field is empty and no default
		}

		setValues(newValues);

		if (isLastField) {
			// All fields collected, build criteria and submit
			const criteria: ProspectSearchCriteria = {
				companyName: newValues.companyName,
				jobTitles: newValues.jobTitles ? newValues.jobTitles.split(',').map(t => t.trim()).filter(t => t) : [],
				keywords: newValues.keywords ? newValues.keywords.split(',').map(k => k.trim()).filter(k => k) : undefined,
			};

			// Validate we have at least job titles
			if (!criteria.jobTitles || criteria.jobTitles.length === 0) {
				return; // Don't submit if no job titles
			}

			onSubmit(criteria);
		} else {
			// Move to next field
			setCurrentIndex(currentIndex + 1);
		}
	};

	return (
		<Box flexDirection="column" padding={1}>
			<Text bold color="cyan">
				LinkedIn Prospect Search
			</Text>

			<Box marginTop={1}>
				<Text dimColor>
					Enter search criteria to find prospects on LinkedIn
				</Text>
			</Box>

			<Box marginTop={1} flexDirection="column">
				<Text bold color="yellow">Fields:</Text>
				{fields.map((field, idx) => (
					<Text key={field.key} color={idx === currentIndex ? 'green' : 'dim'}>
						{idx === currentIndex ? '→ ' : '  '}
						{idx < currentIndex ? '✓ ' : ''}
						{field.displayName}{field.required ? ' (required)' : ' (optional)'}
					</Text>
				))}
			</Box>

			<Box marginTop={2} flexDirection="column">
				<Text bold>
					[{currentIndex + 1}/{fields.length}] {currentField.displayName}
					{currentField.required && <Text color="red"> *</Text>}
					:
				</Text>
				<Text dimColor>{currentField.description}</Text>
				{values[currentField.key] && (
					<Text dimColor color="green">
						Pre-filled: {values[currentField.key]}
					</Text>
				)}
			</Box>

			<Box marginTop={1}>
				<TextInput
					key={`input-${currentIndex}`}
					placeholder={`Enter ${currentField.displayName.toLowerCase()}...`}
					defaultValue={values[currentField.key] || ''}
					onSubmit={handleSubmit}
				/>
			</Box>

			<Box marginTop={2}>
				<Text dimColor>
					{values[currentField.key]
						? 'Press Enter to use pre-filled value or type to override'
						: `Press Enter to ${isLastField ? 'search' : 'continue'}`
					} • Press Ctrl+C to cancel
				</Text>
			</Box>

			{Object.keys(values).length > 0 && (
				<Box marginTop={1} flexDirection="column">
					<Text bold>Values entered so far:</Text>
					{Object.entries(values).map(([key, value]) => {
						const field = fields.find(f => f.key === key);
						return (
							<Text key={key} color="green">
								✓ {field?.displayName}: {value}
							</Text>
						);
					})}
				</Box>
			)}
		</Box>
	);
}
