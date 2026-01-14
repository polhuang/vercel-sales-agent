import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { AgentBrowserService } from './services/salesforce/browser.js';
import { AuthService } from './services/salesforce/auth.js';
import { NavigationService } from './services/salesforce/navigation.js';
import { FieldExtractorService } from './services/salesforce/extractor.js';
import { FieldUpdaterService } from './services/salesforce/updater.js';
import { ClaudeClient } from './services/claude/client.js';
import { ParserService } from './services/claude/parser.js';
import { StageGateValidator } from './services/validation/stageGates.js';
import { SalesforceCookies } from './types/cookies.js';
import { OpportunityState } from './types/opportunity.js';
import { ClaudeExtraction } from './types/updates.js';
import { logger } from './utils/logger.js';

type Screen =
  | 'welcome'
  | 'cookie-input'
  | 'authenticating'
  | 'authenticated'
  | 'opp-id-input'
  | 'loading-opp'
  | 'notes-input'
  | 'processing'
  | 'preview'
  | 'updating'
  | 'success'
  | 'error';

interface AppProps {
  apiKey: string;
}

export default function App({ apiKey }: AppProps) {
  const [screen, setScreen] = useState<Screen>('welcome');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');

  // Services
  const [browser] = useState(() => new AgentBrowserService());
  const [auth] = useState(() => new AuthService(browser));
  const [nav] = useState(() => new NavigationService(browser));
  const [extractor] = useState(() => new FieldExtractorService(browser));
  const [updater] = useState(() => new FieldUpdaterService(browser));
  const [claude] = useState(() => new ClaudeClient(apiKey));
  const [parser] = useState(() => new ParserService(claude));
  const [validator] = useState(() => new StageGateValidator());

  // State
  const [cookies, setCookies] = useState<SalesforceCookies | null>(null);
  const [oppState, setOppState] = useState<OpportunityState | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [extraction, setExtraction] = useState<ClaudeExtraction | null>(null);

  if (screen === 'welcome') {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="cyan">
          ╔════════════════════════════════════════════╗
        </Text>
        <Text bold color="cyan">
          ║   Vercel Sales Agent - AI-Powered TUI     ║
        </Text>
        <Text bold color="cyan">
          ╚════════════════════════════════════════════╝
        </Text>
        <Box marginTop={1}>
          <Text>
            This tool helps automate Salesforce opportunity updates using natural language.
          </Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>
            Note: This is a simplified MVP implementation. For production use,
            extract cookies from your browser and provide them when prompted.
          </Text>
        </Box>
        <Box marginTop={1}>
          <Text color="yellow">
            Press any key to continue...
          </Text>
        </Box>
      </Box>
    );
  }

  if (screen === 'error') {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="red">
          ❌ Error
        </Text>
        <Box marginTop={1}>
          <Text color="red">{error}</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Check the logs for more details: vercel-sales-agent.log</Text>
        </Box>
      </Box>
    );
  }

  if (screen === 'authenticating' || screen === 'loading-opp' || screen === 'processing' || screen === 'updating') {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="cyan">⏳ {message}</Text>
      </Box>
    );
  }

  if (screen === 'success') {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="green">
          ✅ Success!
        </Text>
        <Box marginTop={1}>
          <Text>{message}</Text>
        </Box>
      </Box>
    );
  }

  // Default message for other screens
  return (
    <Box flexDirection="column" padding={1}>
      <Text>Screen: {screen}</Text>
      <Text dimColor>
        This is a simplified implementation. Full TUI components coming soon.
      </Text>
      <Box marginTop={1}>
        <Text color="yellow">
          To use this tool:
          1. Set ANTHROPIC_API_KEY environment variable
          2. Extract Salesforce cookies from your browser
          3. Run: npm start
        </Text>
      </Box>
    </Box>
  );
}
