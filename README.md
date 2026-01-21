# Vercel Sales Agent

AI-powered TUI for common sales workflows, including Salesforce automation and LinkedIn prospecting.

## Overview

This tool helps sales teams at Vercel automate sales workflows:

**Salesforce Automation:**
- Parse natural language call notes
- Extract relevant field updates using Claude AI
- Validate stage-gate requirements
- Automatically update Salesforce opportunities via browser automation

**LinkedIn Prospecting:**
- Search LinkedIn with customizable criteria
- Extract prospect data automatically
- Score prospects using Claude AI (0-100 relevance score)
- Export results to CSV or JSON

## How It Works

This tool uses browser automation instead of the Salesforce API, making it accessible to sales reps without API credentials. It uses [`agent-browser`](https://github.com/vercel-labs/agent-browser) to dynamically identify and interact with Salesforce form fields through the DOM.

[`agent-browser`](https://github.com/vercel-labs/agent-browser) can traverse Salesforce's [Shadow DOM](https://developer.salesforce.com/docs/platform/lwc/guide/create-dom.html), which traditionally prevented automated DOM interaction by encapsulating component structures in isolated, hidden DOM trees. By navigating these encapsulated trees, the tool can search for fields, select the correct elements, and inject data directly into Salesforce opportunities without requiring API access.

## Features

### Salesforce Automation

- **AI-Powered Extraction**: Uses Claude to intelligently extract Salesforce fields from call notes
- **Stage-Gate Validation**: Enforces Vercel's opportunity stage requirements
- **Secure Authentication**: Session-based authentication (cookies saved locally)
- **Natural Language**: Write notes naturally - AI handles the field mapping
- **Preview & Confirm**: Review all changes before applying to Salesforce

### LinkedIn Prospecting

- **LinkedIn Integration**: Automated search and extraction from LinkedIn people search
- **AI-Based Scoring**: Claude evaluates prospects on 5 criteria (title match, seniority, company relevance, keywords, experience)
- **Customizable Searches**: Filter by company, job titles, keywords, and more
- **Multiple Export Formats**: Export scored prospects to CSV or JSON
- **Smart Ranking**: Results sorted by relevance score (0-100)

## Quick Start

Get up and running in 5 minutes.

### Prerequisites

- Node.js v18+ (tested with v25.2.1)
- agent-browser installed globally: `npm install -g agent-browser`
- Anthropic API key for Claude
- For Salesforce automation: Active Salesforce session
- For LinkedIn prospecting: LinkedIn account

### Step 1: Installation

```bash
cd ~/projects/vercel-sales-agent
npm install
```

### Step 2: Add Your API Key

```bash
cp .env.example .env
echo "ANTHROPIC_API_KEY=your_actual_key_here" > .env
```

Get your API key from: https://console.anthropic.com/

### Step 3: (Optional) Configure Custom Browser Path

If Chrome/Chromium is installed in a non-standard location, create a config file:

```bash
cp .vercel-sales-agent.config.example.json .vercel-sales-agent.config.json
```

Edit `.vercel-sales-agent.config.json` and set your browser path:

```json
{
  "browser": {
    "executablePath": "/usr/bin/chromium"
  }
}
```

**Common paths:**
- macOS: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
- Linux (Chrome): `/usr/bin/google-chrome`
- Linux (Chromium): `/usr/bin/chromium` or `/usr/bin/chromium-browser`
- Windows: `C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe`

**Alternative: Environment Variable**

You can also set the browser path via environment variable:
```bash
export AGENT_BROWSER_EXECUTABLE_PATH="/path/to/chrome"
```

If not configured, agent-browser will use the default Chrome/Chromium installation.

### Step 3.5: (Optional) Configure Default Prospecting Criteria

If you frequently search for the same job titles or keywords, you can configure defaults to pre-fill the search form.

Edit `.vercel-sales-agent.config.json`:

```json
{
  "browser": {
    "executablePath": "/usr/bin/chromium"
  },
  "prospecting": {
    "defaultJobTitles": ["CTO", "VP Engineering", "Head of Infrastructure"],
    "defaultCompanyName": "",
    "defaultKeywords": ["kubernetes", "cloud", "DevOps"]
  }
}
```

**Benefits:**
- Job titles and keywords pre-fill in the search form
- Reduces repetitive typing for common searches
- Can still edit or override values for one-off searches

**Configuration options:**
- `defaultJobTitles` (array): Job titles to search for (pre-fills the required field)
- `defaultCompanyName` (string): Company name to search within (optional)
- `defaultKeywords` (array): Keywords to filter prospects (optional)

**Note:** All prospecting config fields are optional. If not configured, the search form will be empty as before.

### Step 4: Extract Salesforce Cookies

You need cookies from an active Salesforce session. Choose one method:

**Option A: Quick Console Method (Recommended)**

1. Open Chrome and go to https://vercel.my.salesforce.com (logged in)
2. Press F12 to open DevTools
3. Go to Console tab
4. Copy and paste this:

```javascript
// Copy this entire block into Chrome Console
const cookies = document.cookie.split('; ').reduce((acc, cookie) => {
  const [name, value] = cookie.split('=');
  if (['sid', 'oid', 'clientSrc', 'sid_Client'].includes(name)) {
    acc[name] = value;
  }
  return acc;
}, {});

console.log('Your cookies:');
console.log(JSON.stringify(cookies, null, 2));
```

5. Copy the output cookies

**Option B: Use Provided Script**

1. Log into https://vercel.my.salesforce.com in Chrome
2. Open DevTools Console (F12 → Console tab)
3. Paste contents of `scripts/extract-salesforce-cookies.js`
4. Script will copy the command to your clipboard

**Option C: Manual Extraction**

1. Log into Salesforce in Chrome
2. Open DevTools (F12) → Application → Cookies
3. Select https://vercel.my.salesforce.com
4. Copy these cookie values:
   - `sid` (required)
   - `oid` (recommended)
   - `clientSrc` (recommended)
   - `sid_Client` (recommended)

### Step 4: Test the Build

```bash
npm run build
```

Expected output: No errors, `dist/` folder created

### Step 5: Test Authentication (Optional)

Verify cookies work using the standalone script:

```bash
./scripts/salesforce-login.sh \
  --sid 'your_sid_value_here' \
  --oid 'your_oid_value' \
  --client-src 'your_clientSrc'
```

Expected output: "Successfully authenticated to Salesforce!"

### Step 6: Run the Application

```bash
npm start
```

**Note**: This is an MVP implementation. Full interactive TUI coming soon!

## Usage

### Example Workflow

1. **Start the application**
   ```bash
   npm start
   ```

2. **Provide cookies when prompted**
   - Enter SID and other cookies from your browser

3. **Enter opportunity ID**
   - Provide the Salesforce opportunity ID to update

4. **Write call notes naturally**
   ```
   Had a great call with Sarah (CTO). Deal size is now $75k ARR.
   Main pain point is slow deployments - currently 2 hours, want sub-5 minutes.
   Champion is Sarah, decision maker is VP Engineering.
   Next step: technical demo on Friday 1/17.
   Ready to move to Value Alignment stage.
   ```

5. **Review extracted fields**
   - AI shows what it extracted
   - Confidence scores for each field
   - Stage-gate validation warnings

6. **Confirm and apply**
   - Changes are applied to Salesforce
   - Verification and success message

### LinkedIn Prospecting Workflow

1. **Start the application**
   ```bash
   npm start
   ```

2. **Select workflow**
   - Choose "Prospecting & List Building" from the main menu

3. **Authenticate with LinkedIn**
   - First time: Browser opens to LinkedIn.com
   - Log in to LinkedIn
   - Session is saved for future use (7 days)

4. **Enter search criteria**
   - If configured in Step 3.5, fields will be pre-filled with default values
   - Company Name (optional): Target company
   - Job Titles (required): "CTO, VP Engineering, Head of Infrastructure"
   - Keywords (optional): "kubernetes, cloud, DevOps"
   - Press Enter to accept defaults or edit to override for this search

5. **Review scored results**
   - AI scores each prospect (0-100) on relevance
   - See score breakdown: title match, seniority, company fit, keywords, experience
   - Results sorted by score (highest first)

6. **Export results**
   - Press 'c' to export as CSV
   - Press 'j' to export as JSON
   - Files saved to `exports/prospects-{timestamp}.csv`

**Example CSV Output:**

| Name | Title | Company | Score | Reasoning |
|------|-------|---------|-------|-----------|
| Sarah Johnson | CTO | Acme Corp | 95 | Strong match: CTO at target company with cloud expertise |
| Mike Chen | VP Engineering | TechStart | 85 | VP-level with relevant infrastructure background |

### Example Output (Once Full TUI is Complete)

```bash
$ npm start

╔════════════════════════════════════════════╗
║   Vercel Sales Agent - AI-Powered TUI     ║
╚════════════════════════════════════════════╝

Enter Salesforce Cookies
────────────────────────────────────────────
[*] sid (required):     [paste here]
[ ] oid (optional):     [paste here]
[ ] clientSrc:          [paste here]

Authenticating...
Successfully authenticated!

Enter Opportunity ID: 006Hs000001x2YZ

Loading opportunity...
Loaded: Acme Corp - Enterprise Deal
   Stage: Qualification
   Amount: $50,000

Enter Call Notes:
────────────────────────────────────────────
1 | Had great call with CTO Sarah.
2 | Deal size now $75k ARR.
3 | Main pain: slow deploys (2hr → want 5min)
4 | Next step: demo Friday

Processing with Claude...
Extracted 3 field updates

Preview Changes:
────────────────────────────────────────────
  Amount:          $50,000 → $75,000
  Implicated Pain: (empty) → Slow deploys...
  NextStep:        (empty) → Demo Friday

Press Enter to confirm...

Updating Salesforce...
Successfully updated!
```

## Testing

### Verify Services Load

```bash
npm start
```

Should see welcome screen without errors.

### Check Build Output

```bash
ls -la dist/
```

Should see:
- app.js
- index.js
- services/ (with salesforce, claude, validation)
- config/
- types/
- utils/

### Verify Field Mappings

```bash
node -e "import('./dist/config/salesforce.js').then(m => console.log(Object.keys(m.FIELD_MAPPINGS).length + ' mappings loaded'))"
```

Should show: "60+ mappings loaded"

## Project Structure

```
~/projects/vercel-sales-agent/
├── src/
│   ├── index.tsx                 # Entry point
│   ├── app.tsx                   # Main application
│   ├── components/               # TUI components
│   ├── services/
│   │   ├── salesforce/          # SF automation
│   │   ├── claude/              # AI integration
│   │   └── validation/          # Stage-gate rules
│   ├── types/                   # TypeScript types
│   ├── config/                  # Configuration
│   └── utils/                   # Utilities
├── scripts/                     # Helper scripts
├── docs/                        # Documentation
└── debug/                       # Debug screenshots
```

## Stage-Gate Requirements

The tool enforces Vercel's stage-gate requirements:

**Stage 0 (Prospect) → Stage 1 (Qualification)**
- Amount, SQO, Prospector, SDR, Close Date, New Biz/Expansion, Primary Product Interest

**Stage 1 → Stage 2 (Value Alignment)**
- Implicated Pain, Pain Quality, Next Step, Value Driver, Partner Identified, Tech Stack, Metrics

**Stage 2 → Stage 3 (Technical Validation)**
- Metrics, Decision Process, Decision Criteria, Champion

**Stage 3 → Stage 4 (Business Justification)**
- Decision Criteria, Decision Process, Champion, Competition, Workload URL, Technical Win Status

**Stage 4 → Stage 5 (Negotiate & Trade)**
- Economic Buyer, Paper Process, Paper Process Quality

**Stage 5 → Closed Won**
- Win Reason, Vercel Solution, Closed Won Checklist, Technical Win Status, Competitors, Workload URLs

## Field Mapping Examples

The AI understands natural language and maps it to Salesforce fields:

- "deal size is $75k" → Amount: 75000
- "close date is March 15" → CloseDate: 2026-03-15
- "pain point is slow deployments" → Implicated_Pain__c
- "champion is Sarah" → Champion__c
- "next step: demo Friday" → NextStep: "Demo Friday"

## Development

### Development Mode

Run with hot reload for active development:

```bash
npm run dev
```

Changes to TypeScript files will automatically reload.

### Build

```bash
npm run build
```

### Run Built Version

```bash
node dist/index.js
```

## Logging

All operations are logged to `vercel-sales-agent.log`:
- agent-browser commands and responses
- Claude API calls
- Field updates
- Errors with stack traces

Check logs:
```bash
tail -f vercel-sales-agent.log
```

## Debugging

- Screenshots are saved to `debug/` on errors
- Use `--headed` mode in agent-browser for visual debugging
- Check logs for detailed operation traces

## Security Notes

- Cookies grant full access to your Salesforce account - never commit them
- Store API keys in `.env` file (git-ignored)
- Cookies are stored in memory only, never written to disk
- Session cookies expire after a few hours - extract fresh ones as needed

## Troubleshooting

### "Cannot find module"
```bash
npm install
npm run build
```

### "ANTHROPIC_API_KEY not set"
```bash
# Make sure .env file exists and contains your key
cat .env
```

### "agent-browser not found"
```bash
npm install -g agent-browser
agent-browser install
```

### "Authentication failed"
- Cookies have expired - extract fresh ones from browser
- Verify you're using cookies from vercel.my.salesforce.com domain
- Check cookies haven't expired (they usually last a few hours)

### "agent-browser command failed"
- Ensure agent-browser is installed: `npm list -g agent-browser`
- Check if Chromium is installed: `agent-browser install`
- If Chrome/Chromium is in a non-standard location, configure the path (see Step 3)

### "Browser not found" or Chrome launch fails
If you see errors about Chrome not being found:

1. Create `.vercel-sales-agent.config.json`:
   ```bash
   cp .vercel-sales-agent.config.example.json .vercel-sales-agent.config.json
   ```

2. Find your browser path:
   ```bash
   # macOS
   which google-chrome
   # or: /Applications/Google Chrome.app/Contents/MacOS/Google Chrome

   # Linux
   which google-chrome
   which chromium
   which chromium-browser
   ```

3. Edit the config file with your browser path

4. **Important**: Close any existing agent-browser daemon:
   ```bash
   npx agent-browser close
   ```
   The agent-browser daemon must be restarted to use a new executable path.

### "Custom browser path not being used"

If logs show "Chrome for Testing" instead of your custom browser:

1. Close the agent-browser daemon:
   ```bash
   npx agent-browser close
   ```

2. Verify your config file exists and has the correct path:
   ```bash
   cat .vercel-sales-agent.config.json
   ```

3. Restart the app - it will automatically close and restart the daemon with your custom browser

### "No API key found"
- Verify `.env` file exists with `ANTHROPIC_API_KEY`
- Restart terminal to reload environment variables

## Next Actions

After installation, follow these steps:
1. Add your API key to `.env`
2. Extract cookies from Salesforce
3. Test authentication with standalone script
4. Run the app with `npm start`
5. Check logs in `vercel-sales-agent.log`

## Future Enhancements

- Interactive TUI for cookie input
- Batch opportunity updates
- Template support for common note patterns
- Field learning from corrections
- Slack notifications for updates
- CSV import/export
- Advanced stage transition analytics

## Contributing

This is an internal Vercel tool. For improvements or bug fixes, please contact the sales engineering team.

## License

Internal use only - Vercel Inc.

## Support

For questions or issues:
- Implementation details: `IMPLEMENTATION-SUMMARY.md`
- Review logs in `vercel-sales-agent.log`
- Debug screenshots: `debug/` folder
- Contact sales engineering team

## Related Files

- `scripts/salesforce-login.sh` - Standalone auth script for testing
- `scripts/extract-salesforce-cookies.js` - Browser cookie extraction helper
- `docs/SALESFORCE-AUTOMATION.md` - Detailed automation guide
- `IMPLEMENTATION-SUMMARY.md` - Full implementation details
