import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { AgentBrowserService } from './services/salesforce/browser.js';
import { AuthService } from './services/salesforce/auth.js';
import { NavigationService } from './services/salesforce/navigation.js';
import { FieldExtractorService } from './services/salesforce/extractor.js';
import { FieldUpdaterService } from './services/salesforce/updater.js';
import { ClaudeClient } from './services/claude/client.js';
import { ParserService } from './services/claude/parser.js';
import { IntentParserService } from './services/claude/intentParser.js';
import { SearchService, OpportunitySearchResult } from './services/salesforce/search.js';
import { StageGateValidator } from './services/validation/stageGates.js';
import { SalesforceCookies } from './types/cookies.js';
import { OpportunityState } from './types/opportunity.js';
import { ClaudeExtraction } from './types/updates.js';
import { ParsedIntent } from './types/intent.js';
import { logger } from './utils/logger.js';
import { IntentInput } from './components/IntentInput.js';
import { NotesInput } from './components/NotesInput.js';
import { OpportunitySelector } from './components/OpportunitySelector.js';

type Screen =
  | 'welcome'
  | 'authenticating'
  | 'authenticated'
  | 'intent-input'
  | 'parsing-intent'
  | 'searching'
  | 'opp-selection'
  | 'loading-opp'
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
  const [browser] = useState(() => new AgentBrowserService('default', true)); // headful mode
  const [claude] = useState(() => new ClaudeClient(apiKey));
  const [auth] = useState(() => new AuthService(browser));
  const [nav] = useState(() => new NavigationService(browser));
  const [extractor] = useState(() => new FieldExtractorService(browser, claude));
  const [updater] = useState(() => new FieldUpdaterService(browser));
  const [search] = useState(() => new SearchService(browser));
  const [parser] = useState(() => new ParserService(claude));
  const [intentParser] = useState(() => new IntentParserService(claude));
  const [validator] = useState(() => new StageGateValidator());

  // State
  const [cookies, setCookies] = useState<SalesforceCookies | null>(null);
  const [intent, setIntent] = useState<ParsedIntent | null>(null);
  const [searchResults, setSearchResults] = useState<OpportunitySearchResult[]>([]);
  const [oppState, setOppState] = useState<OpportunityState | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [extraction, setExtraction] = useState<ClaudeExtraction | null>(null);

  // Handle keyboard input
  useInput((input, key) => {
    if (screen === 'welcome') {
      // Any key moves to browser authentication
      handleBrowserAuth();
    } else if (screen === 'authenticated') {
      // Any key moves to intent input
      setScreen('intent-input');
    } else if (key.escape || (key.ctrl && input === 'c')) {
      // Ctrl+C or ESC to exit
      process.exit(0);
    }
  });

  // Handle browser-based authentication
  const handleBrowserAuth = async () => {
    setScreen('authenticating');
    setMessage('Opening browser for Salesforce authentication...');

    try {
      logger.info('Starting browser-based authentication');

      // Open browser and wait for user to authenticate, then extract cookies
      const extractedCookies = await auth.waitForAuthenticationAndExtractCookies();

      logger.info('Successfully extracted cookies', {
        sid: extractedCookies.sid.substring(0, 20) + '...',
        hasOid: !!extractedCookies.oid,
        hasClientSrc: !!extractedCookies.clientSrc,
        hasSidClient: !!extractedCookies.sid_Client
      });

      setCookies(extractedCookies);
      setScreen('authenticated');
      setMessage('✅ Successfully authenticated to Salesforce!');
    } catch (err: any) {
      logger.error('Browser authentication failed', err);
      setError(err.message || 'Unknown authentication error');
      setScreen('error');
    }
  };

  // Handle intent submission
  const handleIntentSubmit = async (userIntent: string) => {
    setScreen('parsing-intent');
    setMessage('Understanding your request...');

    try {
      logger.info('Parsing user intent', { intent: userIntent });

      // Parse intent with Claude
      const parsedIntent = await intentParser.parseIntent(userIntent);

      logger.info('Intent parsed', {
        action: parsedIntent.action,
        confidence: parsedIntent.confidence,
        opportunityIdentifier: parsedIntent.opportunityIdentifier
      });

      setIntent(parsedIntent);

      if (parsedIntent.action === 'unclear') {
        setError(`I couldn't understand your request. ${parsedIntent.clarificationNeeded?.join('. ')}`);
        setScreen('error');
        return;
      }

      if (parsedIntent.action === 'update_opportunity' && parsedIntent.opportunityIdentifier) {
        // Search for the opportunity
        setScreen('searching');
        setMessage(`Searching for "${parsedIntent.opportunityIdentifier}"...`);

        const results = await search.getCurrentOpportunities();
        const matches = results.filter(r =>
          r.name.toLowerCase().includes(parsedIntent.opportunityIdentifier!.toLowerCase())
        );

        if (matches.length === 0) {
          setError(`Could not find opportunity matching "${parsedIntent.opportunityIdentifier}"`);
          setScreen('error');
          return;
        }

        if (matches.length === 1) {
          // Only one match, proceed with it
          await handleOpportunityLoad(matches[0], parsedIntent);
        } else {
          // Multiple matches, ask user to choose
          setSearchResults(matches);
          setScreen('opp-selection');
        }
      } else if (parsedIntent.action === 'create_opportunity') {
        setMessage('Creating new opportunity...');
        setError('Opportunity creation not yet implemented');
        setScreen('error');
      }
    } catch (err: any) {
      logger.error('Failed to process intent', err);
      setError(err.message || 'Failed to process your request');
      setScreen('error');
    }
  };

  // Handle loading a specific opportunity
  const handleOpportunityLoad = async (opp: OpportunitySearchResult, parsedIntent: ParsedIntent) => {
    setScreen('loading-opp');
    setMessage(`Loading ${opp.name}...`);

    try {
      logger.info('Loading opportunity', { name: opp.name, ref: opp.id });

      // Click on the opportunity to open it
      await search.clickOpportunity(opp.id);

      // Extract current state
      logger.info('Extracting opportunity state');
      const currentState = await extractor.extractOpportunityState();

      logger.info('Opportunity loaded', {
        id: currentState.id,
        name: currentState.name,
        stage: currentState.stage
      });

      setOppState(currentState);

      // Now process the intent
      const hasInformation = parsedIntent.information && parsedIntent.information.trim().length > 0;
      const hasStageTransition = parsedIntent.stageTransition;

      if (hasInformation || hasStageTransition) {
        setScreen('processing');
        setMessage('Processing your request with Claude AI...');

        // Build information string from intent
        let informationToProcess = parsedIntent.information || '';

        // If there's a stage transition but no information, synthesize information
        if (hasStageTransition && !hasInformation) {
          if (parsedIntent.stageTransition?.direction === 'next') {
            informationToProcess = 'Move to the next stage.';
          } else if (parsedIntent.stageTransition?.targetStage) {
            informationToProcess = `Move to ${parsedIntent.stageTransition.targetStage}.`;
          }
        }

        logger.info('Parsing information from intent', {
          informationLength: informationToProcess.length,
          currentStage: currentState.stage,
          hasStageTransition: !!hasStageTransition
        });

        // Parse the information with Claude
        const claudeExtraction = await parser.parseNotes(informationToProcess, currentState);

        logger.info('Claude extraction complete', {
          fieldUpdates: claudeExtraction.fieldUpdates.length,
          stageChange: !!claudeExtraction.stageChange,
          missingFields: claudeExtraction.missingFields.length
        });

        // Validate stage transition if one is proposed
        if (claudeExtraction.stageChange) {
          const validationResult = validator.validateStageTransition(
            claudeExtraction.stageChange.from,
            claudeExtraction.stageChange.to,
            currentState.fields,
            claudeExtraction.fieldUpdates
          );

          logger.info('Stage gate validation complete', {
            isValid: validationResult.isValid,
            missingFieldsCount: validationResult.missingFields.length,
            warningsCount: validationResult.warnings.length
          });

          // Add validation warnings to suggestions
          if (validationResult.warnings.length > 0) {
            claudeExtraction.suggestions = [
              ...claudeExtraction.suggestions,
              ...validationResult.warnings
            ];
          }

          // Update missing fields with stage-gate requirements
          if (validationResult.missingFields.length > 0) {
            // Merge with Claude's missing fields (avoiding duplicates)
            const allMissingFields = new Set([
              ...claudeExtraction.missingFields,
              ...validationResult.missingFields
            ]);
            claudeExtraction.missingFields = Array.from(allMissingFields);
          }
        }

        setExtraction(claudeExtraction);
        setScreen('preview');
      } else {
        // No information provided, just show the loaded opportunity
        setMessage(`Loaded ${currentState.name}. What would you like to update?`);
        setScreen('intent-input'); // Go back to intent input for more instructions
      }
    } catch (err: any) {
      logger.error('Failed to load opportunity', err);
      setError(err.message || 'Failed to load opportunity');
      setScreen('error');
    }
  };

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
            When you press any key, a Chrome browser will open to Salesforce.
          </Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>
            Please log in with your Okta credentials. Once authenticated,
            the app will automatically extract your session cookies.
          </Text>
        </Box>
        <Box marginTop={1}>
          <Text color="yellow">
            Press any key to open browser and authenticate...
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

  if (screen === 'authenticating' || screen === 'parsing-intent' || screen === 'searching' || screen === 'loading-opp' || screen === 'processing' || screen === 'updating') {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="cyan">⏳ {message}</Text>
        {screen === 'authenticating' && (
          <Box marginTop={1}>
            <Text dimColor>Please log in with your Okta credentials in the browser window...</Text>
          </Box>
        )}
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

  if (screen === 'authenticated') {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="green">✅ Authentication Successful!</Text>
        <Box marginTop={1}>
          <Text>{message}</Text>
        </Box>
        <Box marginTop={2}>
          <Text bold>Extracted Cookies:</Text>
        </Box>
        <Box marginTop={1} flexDirection="column">
          <Text>✓ sid: {cookies?.sid.substring(0, 30)}...</Text>
          {cookies?.oid && <Text>✓ oid: {cookies.oid}</Text>}
          {cookies?.clientSrc && <Text>✓ clientSrc: {cookies.clientSrc}</Text>}
          {cookies?.sid_Client && <Text>✓ sid_Client: {cookies.sid_Client}</Text>}
        </Box>
        <Box marginTop={2}>
          <Text bold>Services Available:</Text>
        </Box>
        <Box marginTop={1} flexDirection="column">
          <Text>✓ Browser automation (agent-browser wrapper)</Text>
          <Text>✓ Field extraction service</Text>
          <Text>✓ Field updater service</Text>
          <Text>✓ Claude AI parser (57 field mappings)</Text>
          <Text>✓ Stage-gate validator (6 transitions)</Text>
        </Box>
        <Box marginTop={2}>
          <Text color="yellow">Press any key to continue...</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>You'll be able to describe what you want to do in natural language</Text>
        </Box>
      </Box>
    );
  }

  if (screen === 'intent-input') {
    return <IntentInput onSubmit={handleIntentSubmit} />;
  }

  if (screen === 'opp-selection' && searchResults.length > 0 && intent) {
    return (
      <OpportunitySelector
        opportunities={searchResults}
        onSelect={(opp) => handleOpportunityLoad(opp, intent)}
      />
    );
  }

  if (screen === 'preview' && extraction && oppState) {
    const hasValidationIssues = extraction.missingFields.length > 0;

    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="cyan">Preview Changes</Text>
        <Box marginTop={1}>
          <Text>Opportunity: {oppState.name}</Text>
          <Text>Current Stage: {oppState.stage}</Text>
        </Box>
        {extraction.stageChange && (
          <Box marginTop={1} flexDirection="column">
            <Text bold color={hasValidationIssues ? 'yellow' : 'green'}>
              Stage Change: {extraction.stageChange.from} → {extraction.stageChange.to}
            </Text>
            <Text dimColor>Reason: {extraction.stageChange.reason}</Text>
            {hasValidationIssues && (
              <Box marginTop={1}>
                <Text color="red">⚠️  Cannot proceed: Missing required fields for this stage transition</Text>
              </Box>
            )}
          </Box>
        )}
        {extraction.fieldUpdates.length > 0 && (
          <>
            <Box marginTop={2}>
              <Text bold>Field Updates ({extraction.fieldUpdates.length}):</Text>
            </Box>
            {extraction.fieldUpdates.map((update) => (
              <Box key={update.field} marginTop={1}>
                <Text>• {update.field}: </Text>
                <Text color="green">{JSON.stringify(update.value)}</Text>
                <Text dimColor> (confidence: {update.confidence})</Text>
              </Box>
            ))}
          </>
        )}
        {extraction.missingFields.length > 0 && (
          <Box marginTop={2} flexDirection="column">
            <Text bold color="red">⚠️  Missing Required Fields ({extraction.missingFields.length}):</Text>
            <Box marginTop={1} flexDirection="column">
              {extraction.missingFields.map((field) => (
                <Text key={field} color="red">  • {field}</Text>
              ))}
            </Box>
            <Box marginTop={1}>
              <Text color="yellow">
                These fields must be populated before moving to the target stage.
              </Text>
            </Box>
          </Box>
        )}
        {extraction.suggestions.length > 0 && (
          <Box marginTop={2} flexDirection="column">
            <Text bold color="yellow">Validation Warnings & Suggestions:</Text>
            <Box marginTop={1} flexDirection="column">
              {extraction.suggestions.map((suggestion, idx) => (
                <Text key={`suggestion-${idx}`} dimColor>  • {suggestion}</Text>
              ))}
            </Box>
          </Box>
        )}
        <Box marginTop={2}>
          <Text dimColor>
            {hasValidationIssues
              ? 'Update blocked - resolve missing fields first. Press Ctrl+C to exit'
              : 'Implementation coming soon: Press Ctrl+C to exit'}
          </Text>
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
      <Box marginTop={1}>
        <Text dimColor>Press ESC or Ctrl+C to exit</Text>
      </Box>
    </Box>
  );
}
