export interface SlackCookies {
  d: string;               // Required - main session cookie
  'd-s'?: string;         // Session state
  lc?: string;            // Locale/language cookie
}

export interface SalesforceCookies {
  sid: string;              // Required
  oid?: string;            // Organization ID
  clientSrc?: string;      // Client source IP
  sid_Client?: string;     // Client session ID
  BrowserId?: string;      // Browser ID
  disco?: string;          // Disco cookie
  inst?: string;           // Instance (default: APP_PZ)
}
