/**
 * Email template processing — variable interpolation, tracking injection.
 */

import type { Contact, Account } from "@sales-agent/db";

// ---------------------------------------------------------------------------
// Variable interpolation
// ---------------------------------------------------------------------------

export function interpolateTemplate(
  template: string,
  variables: Record<string, string | null | undefined>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    const value = variables[key];
    return value ?? match; // Leave placeholder if no value
  });
}

// ---------------------------------------------------------------------------
// Build variables from contact + account
// ---------------------------------------------------------------------------

export function buildVariablesFromContact(
  contact: Contact,
  account?: Account | null
): Record<string, string> {
  const vars: Record<string, string> = {};

  if (contact.firstName) vars.firstName = contact.firstName;
  if (contact.lastName) vars.lastName = contact.lastName;
  vars.fullName = [contact.firstName, contact.lastName]
    .filter(Boolean)
    .join(" ");
  if (contact.email) vars.email = contact.email;
  if (contact.title) vars.title = contact.title;
  if (contact.phone) vars.phone = contact.phone;

  if (account) {
    if (account.name) vars.company = account.name;
    if (account.industry) vars.industry = account.industry;
    if (account.website) vars.website = account.website;
  }

  return vars;
}

// ---------------------------------------------------------------------------
// Tracking injection
// ---------------------------------------------------------------------------

export function injectTracking(
  html: string,
  enrollmentId: string,
  stepId: string,
  baseUrl: string
): string {
  let result = html;

  // Rewrite links for click tracking
  result = result.replace(
    /<a\s+([^>]*?)href=["']([^"']+)["']([^>]*?)>/gi,
    (match, before: string, url: string, after: string) => {
      // Don't track unsubscribe links or mailto
      if (url.includes("unsubscribe") || url.startsWith("mailto:")) {
        return match;
      }
      const trackUrl = `${baseUrl}/api/track/click?eid=${enrollmentId}&sid=${stepId}&url=${encodeURIComponent(url)}`;
      return `<a ${before}href="${trackUrl}"${after}>`;
    }
  );

  // Append open tracking pixel before </body> or at end
  const pixel = `<img src="${baseUrl}/api/track/open?eid=${enrollmentId}&sid=${stepId}" width="1" height="1" alt="" style="display:none" />`;

  if (result.includes("</body>")) {
    result = result.replace("</body>", `${pixel}</body>`);
  } else {
    result += pixel;
  }

  // Append unsubscribe footer
  const unsubUrl = `${baseUrl}/api/unsubscribe?eid=${enrollmentId}`;
  const footer = `<div style="margin-top:24px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center;"><a href="${unsubUrl}" style="color:#9ca3af;">Unsubscribe</a></div>`;

  if (result.includes("</body>")) {
    result = result.replace("</body>", `${footer}</body>`);
  } else {
    result += footer;
  }

  return result;
}
