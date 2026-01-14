# Salesforce Automation with agent-browser

This guide helps you authenticate and automate Salesforce tasks using agent-browser with Okta SSO.

## Files

- `salesforce-login.sh` - Main script to authenticate with Salesforce
- `extract-salesforce-cookies.js` - Helper script to extract cookies from your browser

## Quick Start

### Method 1: Extract Cookies from Browser (Recommended)

1. **Log into Salesforce** in Chrome at https://vercel.my.salesforce.com

2. **Open DevTools** (Press F12)

3. **Go to Console tab**

4. **Paste and run** the contents of `extract-salesforce-cookies.js`
   - This will extract cookies and copy a command to your clipboard

5. **Run the command** in your terminal (it will look like):
   ```bash
   ./salesforce-login.sh --sid '00D6g...' --oid '00D6g...' --client-src '...'
   ```

### Method 2: Manual Cookie Extraction

1. Log into https://vercel.my.salesforce.com in Chrome

2. Open DevTools (F12) → Application → Cookies → https://vercel.my.salesforce.com

3. Find these cookie values:
   - `sid` (required)
   - `oid` (recommended)
   - `clientSrc` (recommended)
   - `sid_Client` (recommended)

4. Run the script:
   ```bash
   ./salesforce-login.sh \
     --sid '00D6g000000Cnx9!AQEAQFnoq...' \
     --oid '00D6g000000Cnx9' \
     --client-src '4.2.251.122' \
     --sid-client 'Z000005Srkrg000000Cnx9'
   ```

## Script Usage

```bash
./salesforce-login.sh [options]

Required:
  --sid VALUE              Salesforce session ID

Optional:
  --oid VALUE              Organization ID
  --client-src VALUE       Client source IP
  --sid-client VALUE       Client session ID
  --browser-id VALUE       Browser ID
  --disco VALUE            Disco cookie
  --inst VALUE             Instance (default: APP_PZ)
  --url URL                Salesforce URL (default: https://vercel.my.salesforce.com)
  --headless               Run in headless mode (no visible browser)
  -h, --help               Show help message
```

## Examples

### Basic usage (with just SID):
```bash
./salesforce-login.sh --sid '00D6g000000Cnx9!AQEAQ...'
```

### With all recommended cookies:
```bash
./salesforce-login.sh \
  --sid '00D6g000000Cnx9!AQEAQ_EXAMPLE_SESSION_TOKEN_PLACEHOLDER_xyz123' \
  --oid '00D6g000000Cnx9' \
  --client-src '192.168.1.100' \
  --sid-client 'Z000005Srkrg000000Cnx9'
```

### Headless mode (no visible browser):
```bash
./salesforce-login.sh --sid '00D6g...' --headless
```

## After Authentication

Once authenticated, you can use agent-browser commands:

```bash
# View page elements
agent-browser snapshot -i

# Click on elements
agent-browser click @e5

# Fill forms
agent-browser fill @e3 "text to enter"

# Navigate
agent-browser open https://vercel.my.salesforce.com/lightning/o/Account/list

# Take screenshots
agent-browser screenshot output.png

# Extract data
agent-browser get text @e10

# Close browser
agent-browser close
```

## Automation Examples

### Export a report:
```bash
# After login, navigate to report
agent-browser open "https://vercel.my.salesforce.com/lightning/r/Report/00O.../view"
agent-browser wait 2000
agent-browser click "button[title='Export']"
```

### Create an opportunity:
```bash
# Navigate to opportunities
agent-browser open "https://vercel.my.salesforce.com/lightning/o/Opportunity/new"
agent-browser wait 2000

# Get snapshot to see form fields
agent-browser snapshot -i --json > form.json

# Fill fields (adjust refs based on snapshot)
agent-browser fill @e5 "New Deal Name"
agent-browser fill @e6 "100000"
agent-browser click @e10  # Save button
```

### Bulk update records:
```bash
# Navigate to list view
agent-browser open "https://vercel.my.salesforce.com/lightning/o/Account/list"
agent-browser wait 2000

# Click checkboxes, update fields, etc.
agent-browser click @e15  # First checkbox
agent-browser click @e16  # Second checkbox
agent-browser click "button[title='Update']"
```

## Troubleshooting

### "Authentication failed - still seeing login page"

Your cookies have expired. Extract fresh cookies from your browser.

### Browser window not appearing

The script runs in headed mode by default. If the window doesn't appear, check:
- agent-browser is installed: `npm list -g agent-browser`
- Chromium is installed: `agent-browser install`

### Cookies expire quickly

Salesforce SID cookies typically expire after a few hours. Re-run the cookie extraction when needed.

## Tips

- **Cookie lifetime**: SID cookies expire, so extract fresh ones when the script fails
- **Headless mode**: Use `--headless` for automation scripts that don't need visual feedback
- **Session management**: Use `agent-browser session` to run multiple isolated browser sessions
- **Debugging**: Take screenshots with `agent-browser screenshot` to see what's happening
- **Element refs**: Use `snapshot -i --json` to get stable element references (@e1, @e2, etc.)

## Security Notes

- Never commit scripts with hardcoded cookie values
- Cookies grant full access to your Salesforce account
- Use environment variables for sensitive values:
  ```bash
  SID=$(cat ~/.salesforce-sid)
  ./salesforce-login.sh --sid "$SID"
  ```
