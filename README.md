# Vercel Sales Agent

AI-powered TUI (Text User Interface) for automating Salesforce opportunity management using Claude AI and natural language processing.

## How It Works

This tool uses browser automation instead of the Salesforce API, making it accessible to sales reps without API credentials. It uses [`agent-browser`](https://github.com/vercel-labs/agent-browser) to dynamically identify and interact with Salesforce form fields through the DOM.

[`agent-browser`](https://github.com/vercel-labs/agent-browser) can traverse Salesforce's [Shadow DOM](https://developer.salesforce.com/docs/platform/lwc/guide/create-dom.html), which traditionally prevented automated DOM interaction by encapsulating component structures in isolated, hidden DOM trees. By navigating these encapsulated trees, the tool can search for fields, select the correct elements, and inject data directly into Salesforce opportunities without requiring API access.

## Overview

This tool helps sales teams at Vercel automate Salesforce opportunity updates by:
- Parsing natural language call notes
- Extracting relevant field updates using Claude AI
- Validating stage-gate requirements
- Automatically updating Salesforce opportunities via browser automation

## Features

- **AI-Powered Extraction**: Uses Claude to intelligently extract Salesforce fields from call notes
- **Stage-Gate Validation**: Enforces Vercel's opportunity stage requirements
- **Secure Authentication**: Uses browser cookies for Salesforce authentication
- **Natural Language**: Write notes naturally - AI handles the field mapping
- **Preview & Confirm**: Review all changes before applying to Salesforce

## Quick Start

Get up and running in 5 minutes.

### Prerequisites

- Node.js v18+ (tested with v25.2.1)
- agent-browser installed globally: `npm install -g agent-browser`
- Anthropic API key for Claude
- Active Salesforce session cookies

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

### Step 3: Extract Salesforce Cookies

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
