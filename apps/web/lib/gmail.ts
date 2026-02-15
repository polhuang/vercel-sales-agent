/**
 * Gmail API service — raw fetch, no googleapis package.
 * Single-user: refresh token stored in GMAIL_REFRESH_TOKEN env var.
 */

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

// In-memory token cache
let cachedToken: { accessToken: string; expiresAt: number } | null = null;

function getGmailConfig() {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Missing Gmail OAuth2 env vars (GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN)"
    );
  }

  return { clientId, clientSecret, refreshToken };
}

export async function refreshAccessToken(): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.accessToken;
  }

  const { clientId, clientSecret, refreshToken } = getGmailConfig();

  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gmail token refresh failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };

  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return cachedToken.accessToken;
}

// ---------------------------------------------------------------------------
// Build RFC 2822 MIME message
// ---------------------------------------------------------------------------

function buildMimeMessage(opts: {
  to: string;
  subject: string;
  htmlBody: string;
  fromEmail: string;
  replyToMessageId?: string;
  unsubscribeUrl?: string;
}): string {
  const boundary = `boundary_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  const headers = [
    `From: ${opts.fromEmail}`,
    `To: ${opts.to}`,
    `Subject: ${opts.subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ];

  if (opts.replyToMessageId) {
    headers.push(`In-Reply-To: ${opts.replyToMessageId}`);
    headers.push(`References: ${opts.replyToMessageId}`);
  }

  if (opts.unsubscribeUrl) {
    headers.push(`List-Unsubscribe: <${opts.unsubscribeUrl}>`);
    headers.push(`List-Unsubscribe-Post: List-Unsubscribe=One-Click`);
  }

  const plainText = opts.htmlBody
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

  const body = [
    `--${boundary}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    ``,
    plainText,
    `--${boundary}`,
    `Content-Type: text/html; charset="UTF-8"`,
    ``,
    opts.htmlBody,
    `--${boundary}--`,
  ].join("\r\n");

  return headers.join("\r\n") + "\r\n\r\n" + body;
}

// Base64url encode (RFC 4648 §5)
function base64urlEncode(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// ---------------------------------------------------------------------------
// Send email
// ---------------------------------------------------------------------------

export interface SendEmailResult {
  messageId: string;
  threadId: string;
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  htmlBody: string;
  replyToMessageId?: string;
  threadId?: string;
  unsubscribeUrl?: string;
}): Promise<SendEmailResult> {
  const token = await refreshAccessToken();
  const fromEmail = process.env.GMAIL_SENDER_EMAIL ?? "me";

  const mime = buildMimeMessage({
    to: opts.to,
    subject: opts.subject,
    htmlBody: opts.htmlBody,
    fromEmail,
    replyToMessageId: opts.replyToMessageId,
    unsubscribeUrl: opts.unsubscribeUrl,
  });

  const raw = base64urlEncode(mime);

  const body: Record<string, string> = { raw };
  if (opts.threadId) {
    body.threadId = opts.threadId;
  }

  const res = await fetch(`${GMAIL_API}/messages/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gmail send failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { id: string; threadId: string };
  return { messageId: data.id, threadId: data.threadId };
}

// ---------------------------------------------------------------------------
// Get thread (for reply detection)
// ---------------------------------------------------------------------------

export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  internalDate: string;
}

export interface GmailThread {
  id: string;
  messages: GmailMessage[];
}

export async function getThread(threadId: string): Promise<GmailThread> {
  const token = await refreshAccessToken();

  const res = await fetch(
    `${GMAIL_API}/threads/${threadId}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gmail getThread failed (${res.status}): ${text}`);
  }

  return (await res.json()) as GmailThread;
}
