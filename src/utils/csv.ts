/**
 * CSV utility functions for exporting and importing data
 */

import fs from 'fs';
import { StartupData } from '../types/startup.js';

/**
 * Escape and format a value for CSV
 * Handles commas, quotes, and newlines
 */
export function sanitizeCSV(value: string | undefined | null): string {
	if (value === undefined || value === null) {
		return '';
	}

	const stringValue = String(value);

	// If value contains comma, quote, or newline, wrap in quotes and escape existing quotes
	if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
		return `"${stringValue.replace(/"/g, '""')}"`;
	}

	return stringValue;
}

/**
 * Convert array of values to CSV row
 */
export function arrayToCSVRow(values: (string | number | undefined | null)[]): string {
	return values.map(v => {
		if (typeof v === 'number') {
			return v.toString();
		}
		return sanitizeCSV(v as string);
	}).join(',');
}

/**
 * Convert array of objects to CSV string
 */
export function objectsToCSV<T extends Record<string, any>>(
	objects: T[],
	headers: { key: keyof T; label: string }[]
): string {
	// Build header row
	const headerRow = arrayToCSVRow(headers.map(h => h.label));

	// Build data rows
	const dataRows = objects.map(obj => {
		const values = headers.map(h => obj[h.key]);
		return arrayToCSVRow(values);
	});

	return [headerRow, ...dataRows].join('\n');
}

/**
 * Parse a CSV row into an array of values
 * Handles quoted fields with commas, newlines, and escaped quotes
 */
function parseCSVRow(row: string): string[] {
	const values: string[] = [];
	let currentValue = '';
	let inQuotes = false;

	for (let i = 0; i < row.length; i++) {
		const char = row[i];
		const nextChar = row[i + 1];

		if (char === '"') {
			if (inQuotes && nextChar === '"') {
				// Escaped quote
				currentValue += '"';
				i++; // Skip next quote
			} else {
				// Toggle quote mode
				inQuotes = !inQuotes;
			}
		} else if (char === ',' && !inQuotes) {
			// End of field
			values.push(currentValue.trim());
			currentValue = '';
		} else {
			currentValue += char;
		}
	}

	// Push final value
	values.push(currentValue.trim());

	return values;
}

/**
 * Parse CSV file containing startup data
 * Expected format: name,url
 * First row should be header (will be skipped)
 *
 * @param filePath - Path to CSV file
 * @returns Array of startup data
 * @throws Error if file doesn't exist or has invalid format
 */
export function parseStartupCSV(filePath: string): StartupData[] {
	// Check if file exists
	if (!fs.existsSync(filePath)) {
		throw new Error(`CSV file not found: ${filePath}`);
	}

	// Read file content
	const content = fs.readFileSync(filePath, 'utf-8');
	const lines = content.split('\n').filter(line => line.trim().length > 0);

	if (lines.length < 2) {
		throw new Error('CSV file must contain at least a header row and one data row');
	}

	// Parse header to find column indices
	const headerRow = parseCSVRow(lines[0]);
	const nameIndex = headerRow.findIndex(h => h.toLowerCase() === 'name' || h.toLowerCase() === 'company');
	const urlIndex = headerRow.findIndex(h => h.toLowerCase() === 'url' || h.toLowerCase() === 'website');

	if (nameIndex === -1) {
		throw new Error('CSV must have a "name" or "company" column');
	}

	if (urlIndex === -1) {
		throw new Error('CSV must have a "url" or "website" column');
	}

	// Parse data rows
	const startups: StartupData[] = [];

	for (let i = 1; i < lines.length; i++) {
		const row = parseCSVRow(lines[i]);

		if (row.length <= Math.max(nameIndex, urlIndex)) {
			// Skip invalid rows
			continue;
		}

		const name = row[nameIndex]?.trim();
		const url = row[urlIndex]?.trim();

		if (name && url) {
			startups.push({ name, url });
		}
	}

	if (startups.length === 0) {
		throw new Error('No valid startup data found in CSV');
	}

	return startups;
}
