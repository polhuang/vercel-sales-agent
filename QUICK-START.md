# Quick Start Guide

Get up and running with Vercel Sales Agent in 5 minutes.

## Prerequisites

- ✅ Node.js installed (you have v25.2.1)
- ✅ agent-browser installed globally (you have v0.5.0)
- ⚠️ Anthropic API key needed
- ⚠️ Salesforce cookies needed

## Step 1: Add Your API Key

```bash
cd ~/projects/vercel-sales-agent
echo "ANTHROPIC_API_KEY=your_actual_key_here" > .env
```

Get your API key from: https://console.anthropic.com/

## Step 2: Extract Salesforce Cookies

### Option A: Quick Method (Recommended)

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

### Option B: Use Provided Script

```bash
# In Chrome console while on vercel.my.salesforce.com:
# Paste contents of scripts/extract-salesforce-cookies.js
```

### Option C: Manual (DevTools)

1. F12 → Application → Cookies → https://vercel.my.salesforce.com
2. Copy these values:
   - sid (required)
   - oid (recommended)
   - clientSrc (recommended)
   - sid_Client (recommended)

## Step 3: Test the Build

```bash
cd ~/projects/vercel-sales-agent
npm run build
```

Expected output: ✅ No errors, `dist/` folder created

## Step 4: Test Authentication (Optional)

Use the standalone script to verify cookies work:

```bash
./scripts/salesforce-login.sh \
  --sid 'your_sid_value_here' \
  --oid 'your_oid_value' \
  --client-src 'your_clientSrc'
```

Expected output: ✅ "Successfully authenticated to Salesforce!"

## Step 5: Run the Application

```bash
npm start
```

## What to Expect

The MVP implementation will:
1. Show a welcome screen
2. Demonstrate core services are working
3. Provide information on next steps

**Note**: This is an MVP implementation. Full interactive TUI coming soon!

## Testing Core Functionality

### Test 1: Verify Services Load

```bash
npm start
```

Should see welcome screen without errors.

### Test 2: Check Build Output

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

### Test 3: Verify Field Mappings

```bash
node -e "import('./dist/config/salesforce.js').then(m => console.log(Object.keys(m.FIELD_MAPPINGS).length + ' mappings loaded'))"
```

Should show: "60+ mappings loaded"

## Common Issues

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
- Extract fresh cookies from browser
- Verify you're copying from vercel.my.salesforce.com domain
- Check cookies haven't expired (they usually last a few hours)

## Next Actions

1. **Add your API key** to `.env`
2. **Extract cookies** from Salesforce
3. **Test authentication** with standalone script
4. **Run the app** with `npm start`
5. **Check logs** in `vercel-sales-agent.log`

## Development Mode

For active development with hot reload:

```bash
npm run dev
```

Changes to TypeScript files will automatically reload.

## Example Usage (Once Full TUI is Complete)

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

→ Authenticating...
✅ Successfully authenticated!

Enter Opportunity ID: 006Hs000001x2YZ

→ Loading opportunity...
✅ Loaded: Acme Corp - Enterprise Deal
   Stage: Qualification
   Amount: $50,000

Enter Call Notes:
────────────────────────────────────────────
1 | Had great call with CTO Sarah.
2 | Deal size now $75k ARR.
3 | Main pain: slow deploys (2hr → want 5min)
4 | Next step: demo Friday

→ Processing with Claude...
✅ Extracted 3 field updates

Preview Changes:
────────────────────────────────────────────
  Amount:          $50,000 → $75,000
  Implicated Pain: (empty) → Slow deploys...
  NextStep:        (empty) → Demo Friday

Press Enter to confirm...

→ Updating Salesforce...
✅ Successfully updated!
```

## Support

- 📚 Full docs: `README.md`
- 🔧 Implementation details: `IMPLEMENTATION-SUMMARY.md`
- 📝 Logs: `vercel-sales-agent.log`
- 🐛 Debug screenshots: `debug/` folder

## Ready to Go!

You now have:
- ✅ Complete codebase
- ✅ All dependencies installed
- ✅ TypeScript compiled
- ✅ Documentation ready
- ⏳ Just need: API key + Salesforce cookies

Happy automating! 🚀
