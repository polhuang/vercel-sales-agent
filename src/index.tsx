#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import App from './app.js';
import { config } from 'dotenv';

// Load environment variables
config();

// Check for API key
const apiKey = process.env.ANTHROPIC_API_KEY;

if (!apiKey) {
  console.error('Error: ANTHROPIC_API_KEY environment variable is not set');
  console.error('Please create a .env file with your API key:');
  console.error('  ANTHROPIC_API_KEY=your_key_here');
  process.exit(1);
}

// Render the app
render(<App apiKey={apiKey} />);
