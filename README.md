# Vercel Sales Agent

AI-powered TUI (Text User Interface) for automating Salesforce opportunity management using Claude AI and natural language processing.

## Overview

This tool helps sales teams at Vercel automate Salesforce opportunity updates by:
- Parsing natural language call notes
- Extracting relevant field updates using Claude AI
- Validating stage-gate requirements
- Automatically updating Salesforce opportunities via browser automation

## Features

- 🤖 **AI-Powered Extraction**: Uses Claude to intelligently extract Salesforce fields from call notes
- 🎯 **Stage-Gate Validation**: Enforces Vercel's opportunity stage requirements
- 🔒 **Secure Authentication**: Uses browser cookies for Salesforce authentication
- 📝 **Natural Language**: Write notes naturally - AI handles the field mapping
- ✅ **Preview & Confirm**: Review all changes before applying to Salesforce

## Prerequisites

- Node.js v18+ (tested with v25.2.1)
- agent-browser installed globally: `npm install -g agent-browser`
- Anthropic API key for Claude
- Active Salesforce session cookies

## Installation

```bash
cd ~/projects/vercel-sales-agent
npm install
```

## Configuration

1. Create `.env` file:
```bash
cp .env.example .env
```

2. Add your Anthropic API key:
```
ANTHROPIC_API_KEY=your_api_key_here
```

## Usage

### Quick Start

```bash
npm start
```

### Extract Salesforce Cookies

Before using the tool, you need to extract cookies from an active Salesforce session:

**Method 1: Using the provided script**

1. Log into https://vercel.my.salesforce.com in Chrome
2. Open DevTools Console (F12 → Console tab)
3. Paste contents of `scripts/extract-salesforce-cookies.js`
4. Script will copy the command to your clipboard

**Method 2: Manual extraction**

1. Log into Salesforce in Chrome
2. Open DevTools (F12) → Application → Cookies
3. Select https://vercel.my.salesforce.com
4. Copy these cookie values:
   - `sid` (required)
   - `oid` (recommended)
   - `clientSrc` (recommended)
   - `sid_Client` (recommended)

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

```bash
# Run in development mode with hot reload
npm run dev

# Build TypeScript
npm run build

# Run built version
node dist/index.js
```

## Logging

All operations are logged to `vercel-sales-agent.log`:
- agent-browser commands and responses
- Claude API calls
- Field updates
- Errors with stack traces

## Debugging

- Screenshots are saved to `debug/` on errors
- Check logs: `tail -f vercel-sales-agent.log`
- Use `--headed` mode in agent-browser for visual debugging

## Security Notes

- Cookies grant full access to your Salesforce account - never commit them
- Store API keys in `.env` file (git-ignored)
- Cookies are stored in memory only, never written to disk
- Session cookies expire after a few hours - extract fresh ones as needed

## Troubleshooting

**"Authentication failed"**
- Cookies have expired - extract fresh ones from browser
- Verify you're using cookies from vercel.my.salesforce.com domain

**"agent-browser command failed"**
- Ensure agent-browser is installed: `npm list -g agent-browser`
- Check if Chromium is installed: `agent-browser install`

**"No API key found"**
- Verify `.env` file exists with `ANTHROPIC_API_KEY`
- Restart terminal to reload environment variables

## Future Enhancements

- [ ] Interactive TUI for cookie input
- [ ] Batch opportunity updates
- [ ] Template support for common note patterns
- [ ] Field learning from corrections
- [ ] Slack notifications for updates
- [ ] CSV import/export
- [ ] Advanced stage transition analytics

## Contributing

This is an internal Vercel tool. For improvements or bug fixes, please contact the sales engineering team.

## License

Internal use only - Vercel Inc.

## Support

For questions or issues:
- Check documentation in `docs/`
- Review logs in `vercel-sales-agent.log`
- Contact sales engineering team

## Related Files

- `scripts/salesforce-login.sh` - Standalone auth script for testing
- `scripts/extract-salesforce-cookies.js` - Browser cookie extraction helper
- `docs/SALESFORCE-AUTOMATION.md` - Detailed automation guide
