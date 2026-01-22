import { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { AgentBrowserService } from './services/browser/index.js';
import { loadConfig } from './utils/config.js';
import { AuthService as SalesforceAuthService } from './services/salesforce/auth.js';
import { SessionStorageService as SalesforceSessionStorageService } from './services/salesforce/sessionStorage.js';
import { LinkedInAuthService } from './services/linkedin/auth.js';
import { LinkedInSessionStorageService } from './services/linkedin/sessionStorage.js';
import { NavigationService } from './services/salesforce/navigation.js';
import { FieldExtractorService } from './services/salesforce/extractor.js';
import { FieldUpdaterService } from './services/salesforce/updater.js';
import { SearchService, OpportunitySearchResult } from './services/salesforce/search.js';
import { ProspectorService } from './services/linkedin/prospector.js';
import { ClaudeClient } from './services/claude/client.js';
import { ParserService } from './services/claude/parser.js';
import { IntentParserService } from './services/claude/intentParser.js';
import { StageGateValidator } from './services/validation/stageGates.js';
import { SalesforceCookies } from './types/cookies.js';
import { OpportunityState } from './types/opportunity.js';
import { ClaudeExtraction } from './types/updates.js';
import { ParsedIntent } from './types/intent.js';
import { ProspectSearchCriteria, CompanyCandidate } from './types/linkedin.js';
import { logger } from './utils/logger.js';
import { MainMenu } from './components/MainMenu.js';
import { IntentInput } from './components/IntentInput.js';
import { OpportunitySelector } from './components/OpportunitySelector.js';
import { MissingFieldsInput } from './components/MissingFieldsInput.js';
import { ManualCookieInput } from './components/ManualCookieInput.js';
import { ProspectCriteriaInput } from './components/ProspectCriteriaInput.js';
import { CompanySelector } from './components/CompanySelector.js';

type Screen =
  | 'welcome'
  | 'checking-session'
  | 'main-menu'
  | 'salesforce-authenticating'
  | 'salesforce-manual-cookie-input'
  | 'salesforce-authenticated'
  | 'linkedin-authenticating'
  | 'linkedin-authenticated'
  | 'intent-input'
  | 'parsing-intent'
  | 'searching'
  | 'opp-selection'
  | 'loading-opp'
  | 'processing'
  | 'preview'
  | 'missing-fields'
  | 'updating'
  | 'prospect-criteria-input'
  | 'company-selection'
  | 'prospect-searching'
  | 'success'
  | 'error';

interface AppProps {
  apiKey: string;
}

export default function App({ apiKey }: AppProps) {
  const [screen, setScreen] = useState<Screen>('welcome');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');

  // Load config
  const [config] = useState(() => loadConfig());

  // Shared browser service
  const [browser] = useState(() => new AgentBrowserService('default', true, config.browser?.executablePath));

  // Salesforce services
  const [salesforceSessionStorage] = useState(() => new SalesforceSessionStorageService('.sf-session.json'));
  const [salesforceAuth] = useState(() => new SalesforceAuthService(browser, salesforceSessionStorage));
  const [nav] = useState(() => new NavigationService(browser));
  const [search] = useState(() => new SearchService(browser));
  const [updater] = useState(() => new FieldUpdaterService(browser));

  // LinkedIn services
  const [linkedInSessionStorage] = useState(() => new LinkedInSessionStorageService('.linkedin-session.json'));
  const [linkedInAuth] = useState(() => new LinkedInAuthService(browser, linkedInSessionStorage));
  const [prospector] = useState(() => new ProspectorService(browser));

  // Claude services
  const [claude] = useState(() => new ClaudeClient(apiKey));
  const [extractor] = useState(() => new FieldExtractorService(browser, claude));
  const [parser] = useState(() => new ParserService(claude));
  const [intentParser] = useState(() => new IntentParserService(claude));
  const [validator] = useState(() => new StageGateValidator());

  // State
  const [workflow, setWorkflow] = useState<'prospecting' | 'salesforce' | null>(null);
  const [salesforceCookies, setSalesforceCookies] = useState<SalesforceCookies | null>(null);
  const [intent, setIntent] = useState<ParsedIntent | null>(null);
  const [searchResults, setSearchResults] = useState<OpportunitySearchResult[]>([]);
  const [oppState, setOppState] = useState<OpportunityState | null>(null);
  const [extraction, setExtraction] = useState<ClaudeExtraction | null>(null);
  const [missingFieldDetails, setMissingFieldDetails] = useState<Array<{
    apiName: string;
    displayName: string;
    description: string;
  }>>([]);
  const [searchCriteria, setSearchCriteria] = useState<ProspectSearchCriteria | null>(null);
  const [companyCandidates, setCompanyCandidates] = useState<CompanyCandidate[]>([]);

  // Handle initial browser initialization
  const handleInitializeBrowser = async () => {
    setScreen('checking-session');
    setMessage('Initializing browser...');

    try {
      logger.info('Initializing browser on app startup');
      await browser.initialize();
      logger.info('Browser initialized successfully');
      setScreen('main-menu');
    } catch (err: any) {
      logger.error('Failed to initialize browser', err);
      setError(err.message || 'Failed to initialize browser');
      setScreen('error');
    }
  };

  // Salesforce workflow handlers
  const handleSalesforceAuth = async () => {
    setScreen('salesforce-authenticating');
    setMessage('Checking for saved Salesforce session...');

    try {
      const sessionValid = await salesforceAuth.authenticateWithSavedSession();

      if (sessionValid) {
        const validCookies = salesforceAuth.getCookies();
        if (validCookies) {
          setSalesforceCookies(validCookies);
          setScreen('salesforce-authenticated');
          setMessage('Successfully authenticated with saved session!');
          return;
        }
      }

      // No saved session, show manual cookie input option
      setScreen('salesforce-manual-cookie-input');
    } catch (err: any) {
      logger.error('Salesforce authentication failed', err);
      setError(err.message || 'Authentication failed');
      setScreen('error');
    }
  };

  const handleManualCookieSubmit = async (sid: string) => {
    setScreen('salesforce-authenticating');
    setMessage('Authenticating with provided SID cookie...');

    try {
      logger.info('Attempting authentication with manual SID cookie');
      const cookies: SalesforceCookies = { sid };
      await salesforceAuth.authenticate(cookies);

      // Verify authentication
      const isValid = await salesforceAuth.verifyAuthentication();

      if (!isValid) {
        throw new Error('Invalid SID cookie - authentication failed');
      }

      // Save cookies to session storage
      salesforceSessionStorage.saveCookies(cookies);

      setSalesforceCookies(cookies);
      setScreen('salesforce-authenticated');
      setMessage('Successfully authenticated with manual cookie!');
    } catch (err: any) {
      logger.error('Manual cookie authentication failed', err);
      setError(err.message || 'Manual cookie authentication failed');
      setScreen('error');
    }
  };

  const handleManualCookieSkip = async () => {
    setScreen('salesforce-authenticating');
    setMessage('Opening browser for Salesforce authentication...');

    try {
      const extractedCookies = await salesforceAuth.waitForAuthenticationAndExtractCookies();
      setSalesforceCookies(extractedCookies);
      setScreen('salesforce-authenticated');
      setMessage('Successfully authenticated to Salesforce!');
    } catch (err: any) {
      logger.error('Salesforce authentication failed', err);
      setError(err.message || 'Authentication failed');
      setScreen('error');
    }
  };

  // LinkedIn workflow handlers
  const handleLinkedInAuth = async () => {
    setScreen('linkedin-authenticating');
    setMessage('Checking for saved LinkedIn session...');

    try {
      const sessionValid = await linkedInAuth.authenticateWithSavedSession();

      if (sessionValid) {
        setScreen('linkedin-authenticated');
        setMessage('Successfully authenticated with saved session!');
        return;
      }

      setMessage('Opening browser for LinkedIn authentication...');
      await linkedInAuth.waitForAuthenticationAndExtractCookies();
      setScreen('linkedin-authenticated');
      setMessage('Successfully authenticated to LinkedIn!');
    } catch (err: any) {
      logger.error('LinkedIn authentication failed', err);
      setError(err.message || 'Authentication failed');
      setScreen('error');
    }
  };

  const handleProspectCriteriaSubmit = async (criteria: ProspectSearchCriteria) => {
    setSearchCriteria(criteria);
    setScreen('prospect-searching');
    setMessage('Navigating to LinkedIn and performing search...');

    try {
      await prospector.navigateToLinkedInHome();

      if (criteria.companyName) {
        setMessage('Searching for company...');
        await prospector.searchCompany(criteria.companyName);

        setMessage('Extracting company candidates...');
        const candidates = await prospector.extractCompanyCandidates();

        if (candidates.length === 0) {
          throw new Error(`No companies found for: ${criteria.companyName}`);
        }

        if (candidates.length === 1) {
          await prospector.navigateToSelectedCompany(candidates[0]);
          setScreen('success');
          setMessage(`Successfully navigated to ${candidates[0].name}`);
        } else {
          setCompanyCandidates(candidates);
          setScreen('company-selection');
        }
      }
    } catch (err: any) {
      logger.error('Company search failed', err);
      setError(err.message || 'Search failed');
      setScreen('error');
    }
  };

  const handleCompanySelect = async (candidate: CompanyCandidate) => {
    setScreen('prospect-searching');
    setMessage(`Navigating to ${candidate.name}...`);

    try {
      await prospector.navigateToSelectedCompany(candidate);
      setScreen('success');
      setMessage(`Successfully navigated to ${candidate.name}`);
    } catch (err: any) {
      logger.error('Company navigation failed', err);
      setError(err.message || 'Navigation failed');
      setScreen('error');
    }
  };

  // Salesforce opportunity workflow
  const handleIntentSubmit = async (userIntent: string) => {
    setScreen('parsing-intent');
    setMessage('Understanding your request...');

    try {
      const parsedIntent = await intentParser.parseIntent(userIntent);
      setIntent(parsedIntent);

      if (parsedIntent.action === 'unclear') {
        setError(`I couldn't understand your request. ${parsedIntent.clarificationNeeded?.join('. ')}`);
        setScreen('error');
        return;
      }

      if (parsedIntent.action === 'update_opportunity' && parsedIntent.opportunityIdentifier) {
        setScreen('searching');
        setMessage(`Searching for "${parsedIntent.opportunityIdentifier}"...`);

        const results = await search.getCurrentOpportunities();
        const matches = results.filter((r: OpportunitySearchResult) =>
          r.name.toLowerCase().includes(parsedIntent.opportunityIdentifier!.toLowerCase())
        );

        if (matches.length === 0) {
          setError(`Could not find opportunity matching "${parsedIntent.opportunityIdentifier}"`);
          setScreen('error');
          return;
        }

        if (matches.length === 1) {
          await handleOpportunityLoad(matches[0], parsedIntent);
        } else {
          setSearchResults(matches);
          setScreen('opp-selection');
        }
      }
    } catch (err: any) {
      logger.error('Failed to process intent', err);
      setError(err.message || 'Failed to process request');
      setScreen('error');
    }
  };

  const handleOpportunityLoad = async (opp: OpportunitySearchResult, parsedIntent: ParsedIntent) => {
    setScreen('loading-opp');
    setMessage(`Loading ${opp.name}...`);

    try {
      await search.clickOpportunity(opp.id);
      const currentState = await extractor.extractOpportunityState();
      setOppState(currentState);

      if (currentState.stage === 'Unknown') {
        setError('Could not automatically detect the opportunity stage.');
        setScreen('error');
        return;
      }

      const hasInformation = parsedIntent.information && parsedIntent.information.trim().length > 0;
      if (hasInformation) {
        setScreen('processing');
        setMessage('Processing your request with Claude AI...');

        const claudeExtraction = await parser.parseNotes(parsedIntent.information!, currentState);

        if (claudeExtraction.stageChange) {
          const validationResult = validator.validateStageTransition(
            claudeExtraction.stageChange.from,
            claudeExtraction.stageChange.to,
            currentState.fields,
            claudeExtraction.fieldUpdates
          );

          if (validationResult.warnings.length > 0) {
            claudeExtraction.suggestions = [...claudeExtraction.suggestions, ...validationResult.warnings];
          }

          if (validationResult.missingFields.length > 0) {
            const stageGateRule = validator.getStageGateRule(
              claudeExtraction.stageChange.from,
              claudeExtraction.stageChange.to
            );

            if (stageGateRule) {
              const missingFieldObjects = stageGateRule.requiredFields.filter(field =>
                validationResult.missingFields.includes(field.displayName)
              );
              setMissingFieldDetails(missingFieldObjects);
              setExtraction(claudeExtraction);
              setScreen('missing-fields');
              return;
            }
          } else if (validationResult.isValid) {
            claudeExtraction.missingFields = [];
          }
        }

        setExtraction(claudeExtraction);
        setScreen('preview');
      }
    } catch (err: any) {
      logger.error('Failed to load opportunity', err);
      setError(err.message || 'Failed to load opportunity');
      setScreen('error');
    }
  };

  const handleMissingFieldsSubmit = (fieldValues: Record<string, string>) => {
    if (!extraction || !oppState) return;

    const newFieldUpdates = Object.entries(fieldValues).map(([apiName, value]) => ({
      field: apiName,
      value: value,
      confidence: 'high' as const,
      source: 'User provided during stage transition'
    }));

    const updatedExtraction = {
      ...extraction,
      fieldUpdates: [...extraction.fieldUpdates, ...newFieldUpdates]
    };

    if (updatedExtraction.stageChange) {
      const validationResult = validator.validateStageTransition(
        updatedExtraction.stageChange.from,
        updatedExtraction.stageChange.to,
        oppState.fields,
        updatedExtraction.fieldUpdates
      );

      updatedExtraction.missingFields = validationResult.missingFields;
    }

    setExtraction(updatedExtraction);
    setScreen('preview');
  };

  const handleApplyUpdates = async () => {
    if (!extraction || !oppState) return;

    setScreen('updating');
    setMessage('Applying updates to Salesforce...');

    try {
      if (extraction.fieldUpdates.length > 0) {
        await updater.updateFields(extraction.fieldUpdates);
      }

      if (extraction.stageChange) {
        await updater.updateStage(extraction.stageChange.to);
      }

      await updater.saveChanges();
      await browser.wait(2000);

      setMessage('Successfully updated opportunity!');
      setScreen('success');
      setTimeout(() => process.exit(0), 3000);
    } catch (error: any) {
      logger.error('Failed to apply updates', error);
      setError(error.message || 'Failed to apply updates');
      setScreen('error');
    }
  };

  // Main menu selection
  const handleMainMenuSelect = (option: 'prospecting' | 'salesforce') => {
    setWorkflow(option);
    if (option === 'prospecting') {
      handleLinkedInAuth();
    } else if (option === 'salesforce') {
      handleSalesforceAuth();
    }
  };

  // Keyboard input handling
  useInput((input, key) => {
    if (screen === 'welcome') {
      if (input === 'c' || input === 'C') {
        salesforceAuth.clearSavedSession();
        linkedInAuth.clearSavedSession();
        setMessage('Saved sessions cleared. Press any key to continue...');
      } else {
        handleInitializeBrowser();
      }
    } else if (screen === 'salesforce-authenticated') {
      setScreen('intent-input');
    } else if (screen === 'linkedin-authenticated') {
      setScreen('prospect-criteria-input');
    } else if (screen === 'preview' && !extraction?.missingFields?.length) {
      if (key.return) {
        handleApplyUpdates();
      }
    } else if (key.escape || (key.ctrl && input === 'c')) {
      process.exit(0);
    }
  });

  // Render screens
  if (screen === 'welcome') {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="cyan">╔════════════════════════════════════════════╗</Text>
        <Text bold color="cyan">║   Vercel Sales Agent - AI-Powered TUI     ║</Text>
        <Text bold color="cyan">╚════════════════════════════════════════════╝</Text>
        <Box marginTop={1}>
          <Text>AI-powered TUI for Salesforce automation, Slack automation, and LinkedIn prospecting.</Text>
        </Box>
        {message && (
          <Box marginTop={1}>
            <Text color="green">{message}</Text>
          </Box>
        )}
        <Box marginTop={2}>
          <Text color="yellow">Press any key to continue...</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Press 'c' to clear saved sessions</Text>
        </Box>
      </Box>
    );
  }

  if (screen === 'checking-session') {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="cyan">{message}</Text>
      </Box>
    );
  }

  if (screen === 'main-menu') {
    return <MainMenu onSelect={handleMainMenuSelect} />;
  }

  if (screen === 'salesforce-authenticating' || screen === 'linkedin-authenticating') {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="cyan">{message}</Text>
        <Box marginTop={1}>
          <Text dimColor>Please log in in the browser window...</Text>
        </Box>
      </Box>
    );
  }

  if (screen === 'salesforce-manual-cookie-input') {
    return (
      <ManualCookieInput
        onSubmit={handleManualCookieSubmit}
        onSkip={handleManualCookieSkip}
      />
    );
  }

  if (screen === 'salesforce-authenticated') {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="green">Salesforce Authentication Successful!</Text>
        <Box marginTop={1}>
          <Text>{message}</Text>
        </Box>
        <Box marginTop={2}>
          <Text color="yellow">Press any key to continue...</Text>
        </Box>
      </Box>
    );
  }

  if (screen === 'linkedin-authenticated') {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="green">LinkedIn Authentication Successful!</Text>
        <Box marginTop={1}>
          <Text>{message}</Text>
        </Box>
        <Box marginTop={2}>
          <Text color="yellow">Press any key to continue...</Text>
        </Box>
      </Box>
    );
  }

  if (screen === 'parsing-intent' || screen === 'searching' || screen === 'loading-opp' || screen === 'processing' || screen === 'updating' || screen === 'prospect-searching') {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="cyan">{message}</Text>
      </Box>
    );
  }

  if (screen === 'intent-input') {
    return <IntentInput onSubmit={handleIntentSubmit} />;
  }

  if (screen === 'prospect-criteria-input') {
    return (
      <ProspectCriteriaInput
        onSubmit={handleProspectCriteriaSubmit}
        defaultJobTitles={config.prospecting?.defaultJobTitles}
        defaultCompanyName={config.prospecting?.defaultCompanyName}
        defaultKeywords={config.prospecting?.defaultKeywords}
      />
    );
  }

  if (screen === 'company-selection') {
    return (
      <CompanySelector
        candidates={companyCandidates}
        onSelect={handleCompanySelect}
        onCancel={() => setScreen('prospect-criteria-input')}
      />
    );
  }

  if (screen === 'opp-selection' && searchResults.length > 0 && intent) {
    return (
      <OpportunitySelector
        opportunities={searchResults}
        onSelect={(opp) => handleOpportunityLoad(opp, intent)}
      />
    );
  }

  if (screen === 'missing-fields' && missingFieldDetails.length > 0) {
    return (
      <MissingFieldsInput
        missingFields={missingFieldDetails}
        onSubmit={handleMissingFieldsSubmit}
        onCancel={() => {
          setScreen('error');
          setError('Stage transition cancelled - missing required fields');
        }}
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
              </Box>
            ))}
          </>
        )}
        <Box marginTop={2}>
          <Text dimColor>
            {hasValidationIssues
              ? 'Update blocked - resolve missing fields first'
              : 'Press Enter to apply these changes, or Ctrl+C to cancel'}
          </Text>
        </Box>
      </Box>
    );
  }

  if (screen === 'success') {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="green">Success!</Text>
        <Box marginTop={1}>
          <Text>{message}</Text>
        </Box>
      </Box>
    );
  }

  if (screen === 'error') {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="red">Error</Text>
        <Box marginTop={1}>
          <Text color="red">{error}</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text>Screen: {screen}</Text>
    </Box>
  );
}
