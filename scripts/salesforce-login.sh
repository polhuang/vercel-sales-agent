#!/bin/bash

# Salesforce Okta Authentication Script for agent-browser
# Usage: ./salesforce-login.sh --sid "your_sid_value" [--oid "org_id"] [--headless]

set -e

# Default values
SF_URL="https://vercel.my.salesforce.com"
SID=""
OID=""
CLIENT_SRC=""
SID_CLIENT=""
BROWSER_ID=""
DISCO=""
INST=""
HEADLESS=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --sid)
      SID="$2"
      shift 2
      ;;
    --oid)
      OID="$2"
      shift 2
      ;;
    --client-src)
      CLIENT_SRC="$2"
      shift 2
      ;;
    --sid-client)
      SID_CLIENT="$2"
      shift 2
      ;;
    --browser-id)
      BROWSER_ID="$2"
      shift 2
      ;;
    --disco)
      DISCO="$2"
      shift inst
      ;;

    --2)
      INST="$2"
      shift 2
      ;;
    --headless)
      HEADLESS=true
      shift
      ;;
    --url)
      SF_URL="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: $0 [options]"
      echo ""
      echo "Required:"
      echo "  --sid VALUE              Salesforce session ID (from vercel.my.salesforce.com)"
      echo ""
      echo "Optional cookies (for better reliability):"
      echo "  --oid VALUE              Organization ID"
      echo "  --client-src VALUE       Client source IP"
      echo "  --sid-client VALUE       Client session ID"
      echo "  --browser-id VALUE       Browser ID"
      echo "  --disco VALUE            Disco cookie"
      echo "  --inst VALUE             Instance (default: APP_PZ)"
      echo ""
      echo "Options:"
      echo "  --url URL                Salesforce URL (default: https://vercel.my.salesforce.com)"
      echo "  --headless               Run in headless mode (no visible browser)"
      echo "  -h, --help               Show this help message"
      echo ""
      echo "Example:"
      echo "  $0 --sid '00D6g...!AQEAQ...' --oid '00D6g000000Cnx9'"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Validate required arguments
if [[ -z "$SID" ]]; then
  echo "Error: --sid is required"
  echo "Use --help for usage information"
  exit 1
fi

echo "🔐 Authenticating to Salesforce..."
echo "URL: $SF_URL"

# Open browser (headed or headless)
if [[ "$HEADLESS" == true ]]; then
  echo "🌐 Opening browser (headless mode)..."
  agent-browser open "$SF_URL"
else
  echo "🌐 Opening browser (visible window)..."
  agent-browser --headed open "$SF_URL"
fi

sleep 1

# Set required cookies
echo "🍪 Setting session cookies..."

# Main SID cookie (required)
agent-browser cookies set sid "$SID" --domain 'vercel.my.salesforce.com'
echo "  ✓ Set sid cookie"

# Optional but recommended cookies
if [[ -n "$OID" ]]; then
  agent-browser cookies set oid "$OID" --domain 'vercel.my.salesforce.com'
  echo "  ✓ Set oid cookie"
fi

if [[ -n "$CLIENT_SRC" ]]; then
  agent-browser cookies set clientSrc "$CLIENT_SRC" --domain 'vercel.my.salesforce.com'
  echo "  ✓ Set clientSrc cookie"
fi

if [[ -n "$SID_CLIENT" ]]; then
  agent-browser cookies set sid_Client "$SID_CLIENT" --domain 'vercel.my.salesforce.com'
  echo "  ✓ Set sid_Client cookie"
fi

if [[ -n "$BROWSER_ID" ]]; then
  agent-browser cookies set BrowserId "$BROWSER_ID" --domain '.salesforce.com'
  echo "  ✓ Set BrowserId cookie"
fi

if [[ -n "$DISCO" ]]; then
  agent-browser cookies set disco "$DISCO" --domain '.salesforce.com'
  echo "  ✓ Set disco cookie"
fi

# Set inst cookie (use provided value or default)
INST_VALUE="${INST:-APP_PZ}"
agent-browser cookies set inst "$INST_VALUE" --domain '.force.com'
echo "  ✓ Set inst cookie"

# Reload to apply cookies
echo "🔄 Reloading page to apply authentication..."
agent-browser reload

sleep 2

# Take snapshot to verify authentication
echo "📸 Verifying authentication..."
SNAPSHOT=$(agent-browser snapshot -i --json)

# Check if we're logged in by looking for common login page elements
if echo "$SNAPSHOT" | grep -q "Log in with Okta" || echo "$SNAPSHOT" | grep -q "Password"; then
  echo "❌ Authentication failed - still seeing login page"
  echo ""
  echo "This could mean:"
  echo "  1. The SID cookie has expired"
  echo "  2. Additional cookies are required"
  echo "  3. Salesforce security policies are blocking the session"
  echo ""
  echo "Tip: Extract fresh cookies from an active browser session"
  exit 1
else
  echo "✅ Successfully authenticated to Salesforce!"
  echo ""
  echo "Browser is ready. You can now run agent-browser commands:"
  echo "  agent-browser snapshot -i          # View page elements"
  echo "  agent-browser click @e1            # Click elements"
  echo "  agent-browser screenshot           # Take screenshot"
  echo ""
fi
