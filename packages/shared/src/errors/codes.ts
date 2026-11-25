/**
 * Single error-code registry for web, mobile, and the API.
 * Meanings follow prompts/briefs/PROJECT_BRIEF.md (ERROR CODES), including
 * every playbook code named there. A code is never reused after it is retired.
 */

export interface ErrorDefinition {
  code: string;
  http?: number;
  meaning: string;
  message: string;
  action: string;
}

export const ERROR_CODES = {
  'API-AUTH-001': {
    code: 'API-AUTH-001',
    http: 401,
    meaning: 'Wrong email or password',
    message: 'Email or password is incorrect.',
    action: 'Retry or use Forgot password.',
  },
  'API-AUTH-002': {
    code: 'API-AUTH-002',
    http: 401,
    meaning: 'Access token expired',
    message: '',
    action: 'Client refreshes token automatically.',
  },
  'API-AUTH-003': {
    code: 'API-AUTH-003',
    http: 403,
    meaning: 'Not allowed for this role',
    message: "You don't have access to this.",
    action: 'Ask an organization admin for access.',
  },
  'API-VAL-001': {
    code: 'API-VAL-001',
    http: 422,
    meaning: 'Input failed validation',
    message: 'Please check the highlighted fields.',
    action: 'Correct highlighted fields from details.',
  },
  'API-RES-404': {
    code: 'API-RES-404',
    http: 404,
    meaning: 'Item not found',
    message: "We couldn't find that.",
    action: 'Go back or refresh the list.',
  },
  'API-RATE-429': {
    code: 'API-RATE-429',
    http: 429,
    meaning: 'Too many requests',
    message: 'Too many attempts. Try again in a minute.',
    action: 'Wait briefly, then retry.',
  },
  'API-SRV-500': {
    code: 'API-SRV-500',
    http: 500,
    meaning: 'Unexpected server error',
    message: 'Something went wrong on our side.',
    action: 'Logged with request ID; alert on-call.',
  },
  'API-SRV-503': {
    code: 'API-SRV-503',
    http: 503,
    meaning: 'Maintenance or overload',
    message: "We'll be right back.",
    action: 'Retry with exponential backoff.',
  },
  'API-MAIL-001': {
    code: 'API-MAIL-001',
    http: 413,
    meaning: 'Message larger than plan limit',
    message: "This message is over your plan's size limit.",
    action: 'Send as a Drive link or upgrade.',
  },
  'API-MAIL-002': {
    code: 'API-MAIL-002',
    http: 422,
    meaning: 'Too many recipients in one message',
    message: 'Too many recipients for one message.',
    action: 'Split the message or use a group.',
  },
  'API-MAIL-003': {
    code: 'API-MAIL-003',
    http: 403,
    meaning: 'Outbound paused for abuse review',
    message: 'Sending is paused while we check your account.',
    action: 'Contact support; admin sees reason.',
  },
  'API-MAIL-004': {
    code: 'API-MAIL-004',
    http: 409,
    meaning: 'Domain not verified for sending',
    message: "This domain isn't ready to send yet.",
    action: 'Finish DNS setup.',
  },
  'API-MAIL-005': {
    code: 'API-MAIL-005',
    http: 422,
    meaning: 'Recipient address invalid',
    message: 'Check the email address.',
    action: 'Correct the address.',
  },
  'API-DNS-001': {
    code: 'API-DNS-001',
    http: 422,
    meaning: 'Ownership TXT record not found',
    message: "We couldn't find your verification record.",
    action: 'Add the TXT record, wait, retry.',
  },
  'API-DNS-002': {
    code: 'API-DNS-002',
    http: 422,
    meaning: 'MX records not pointing to us',
    message: 'Your MX records point somewhere else.',
    action: 'Update MX records.',
  },
  'API-DNS-003': {
    code: 'API-DNS-003',
    http: 422,
    meaning: 'SPF missing or over 10 lookups',
    message: 'Your SPF record needs a fix.',
    action: 'Use the suggested SPF value.',
  },
  'API-DNS-004': {
    code: 'API-DNS-004',
    http: 422,
    meaning: 'DKIM record missing or wrong',
    message: "DKIM isn't set up yet.",
    action: 'Publish the DKIM record shown.',
  },
  'API-DNS-005': {
    code: 'API-DNS-005',
    http: 422,
    meaning: 'DMARC missing or invalid',
    message: 'Add a DMARC record to protect your domain.',
    action: 'Publish the suggested DMARC.',
  },
  'API-DNS-006': {
    code: 'API-DNS-006',
    http: 422,
    meaning: 'MTA-STS or TLS-RPT problem',
    message: 'Secure delivery settings need attention.',
    action: 'Add the CNAME/TXT shown.',
  },
  'API-DNS-007': {
    code: 'API-DNS-007',
    http: 409,
    meaning: 'Domain already used by another tenant',
    message: 'This domain is already connected to another account.',
    action: 'Prove ownership or contact support.',
  },
  'API-DNS-008': {
    code: 'API-DNS-008',
    http: 502,
    meaning: 'Registrar API call failed',
    message: "We couldn't update your DNS automatically.",
    action: 'Retry or add records by hand.',
  },
  'API-BILL-001': {
    code: 'API-BILL-001',
    http: 402,
    meaning: 'Payment failed',
    message: "Your payment didn't go through.",
    action: 'Retry or change payment method.',
  },
  'API-BILL-002': {
    code: 'API-BILL-002',
    http: 402,
    meaning: 'Mandate cancelled or expired',
    message: 'Your AutoPay mandate has stopped.',
    action: 'Set up AutoPay again.',
  },
  'API-BILL-003': {
    code: 'API-BILL-003',
    http: 402,
    meaning: 'Feature not in current plan',
    message: 'This feature is part of a higher plan.',
    action: 'Show upgrade options.',
  },
  'API-BILL-004': {
    code: 'API-BILL-004',
    http: 422,
    meaning: 'GSTIN invalid',
    message: 'Check your GSTIN.',
    action: 'Correct GSTIN.',
  },
  'API-BILL-005': {
    code: 'API-BILL-005',
    http: 403,
    meaning: 'Subscription in grace or read-only',
    message: 'Your plan is overdue. Some actions are paused.',
    action: 'Pay the invoice.',
  },
  'API-QUOTA-001': {
    code: 'API-QUOTA-001',
    http: 507,
    meaning: 'Mailbox storage full',
    message: 'Your mailbox is full.',
    action: 'Delete mail, archive or add storage.',
  },
  'API-QUOTA-002': {
    code: 'API-QUOTA-002',
    http: 429,
    meaning: 'Daily sending limit reached',
    message: "You've reached today's sending limit.",
    action: 'Wait until reset time in details.',
  },
  'API-QUOTA-003': {
    code: 'API-QUOTA-003',
    http: 409,
    meaning: 'No free seats',
    message: 'All your seats are in use.',
    action: 'Add seats.',
  },
  'API-QUOTA-004': {
    code: 'API-QUOTA-004',
    http: 409,
    meaning: 'Alias limit reached',
    message: "You've used all your aliases.",
    action: 'Remove one or upgrade.',
  },
  'API-QUOTA-005': {
    code: 'API-QUOTA-005',
    http: 409,
    meaning: 'Domain limit reached',
    message: "You've reached your domain limit.",
    action: 'Remove one or upgrade.',
  },
  'API-QUOTA-006': {
    code: 'API-QUOTA-006',
    http: 429,
    meaning: 'AI quota used up',
    message: "You've used today's AI actions.",
    action: 'Wait or add AI Pro.',
  },
  'API-MIG-001': {
    code: 'API-MIG-001',
    http: 422,
    meaning: 'Source mailbox sign-in failed',
    message: "We couldn't sign in to your old mailbox.",
    action: 'Check details or app password.',
  },
  'API-MIG-002': {
    code: 'API-MIG-002',
    http: 502,
    meaning: 'Source server unavailable',
    message: "Your old provider isn't responding.",
    action: 'Retry later; import resumes.',
  },
  'API-SEC-001': {
    code: 'API-SEC-001',
    http: 401,
    meaning: 'MFA required',
    message: 'Enter your verification code.',
    action: 'Complete MFA.',
  },
  'API-SEC-002': {
    code: 'API-SEC-002',
    http: 401,
    meaning: 'Passkey or code rejected',
    message: "That didn't work. Try again.",
    action: 'Retry or use another method.',
  },
  'API-SEC-003': {
    code: 'API-SEC-003',
    http: 403,
    meaning: 'Blocked by tenant access policy',
    message: "Your organisation doesn't allow sign-in from here.",
    action: 'Ask your admin.',
  },
  'API-TEN-001': {
    code: 'API-TEN-001',
    http: 403,
    meaning: 'Tenant suspended',
    message: 'This account is suspended.',
    action: 'Contact the account owner.',
  },
  'API-CAL-001': {
    code: 'API-CAL-001',
    http: 409,
    meaning: 'Booking slot no longer free',
    message: 'That time was just taken.',
    action: 'Pick another slot.',
  },
  'API-DRV-001': {
    code: 'API-DRV-001',
    http: 413,
    meaning: 'File larger than plan upload limit',
    message: 'This file is too large for your plan.',
    action: 'Upgrade or split.',
  },
  'WEB-NET-001': {
    code: 'WEB-NET-001',
    meaning: 'Browser offline',
    message: "You're offline. We'll retry when you reconnect.",
    action: 'Listen for online event and retry.',
  },
  'WEB-NET-002': {
    code: 'WEB-NET-002',
    meaning: 'Request timed out (>15 s)',
    message: 'This is taking longer than usual.',
    action: 'Show Retry button.',
  },
  'WEB-BRW-001': {
    code: 'WEB-BRW-001',
    meaning: 'Unsupported browser',
    message: 'Please update your browser.',
    action: 'Show supported browser list.',
  },
  'WEB-STO-001': {
    code: 'WEB-STO-001',
    meaning: 'Cookies/storage blocked',
    message: 'Enable cookies to stay signed in.',
    action: 'Link to /docs help page.',
  },
  'WEB-UPL-001': {
    code: 'WEB-UPL-001',
    meaning: 'File too large',
    message: 'Files must be under 25 MB.',
    action: 'Compress or share via Drive link.',
  },
  'WEB-RND-001': {
    code: 'WEB-RND-001',
    meaning: 'Page crashed (error boundary)',
    message: 'This page hit a problem.',
    action: 'Show Reload button; report to Sentry.',
  },
  'WEB-MAIL-001': {
    code: 'WEB-MAIL-001',
    meaning: 'Draft could not autosave',
    message: "Your draft isn't saved yet.",
    action: 'Retry automatically; copy text.',
  },
  'AND-NET-001': {
    code: 'AND-NET-001',
    meaning: 'No internet connection',
    message: "You're offline.",
    action: 'Retry when network returns.',
  },
  'AND-PERM-001': {
    code: 'AND-PERM-001',
    meaning: 'Camera permission denied',
    message: 'Camera access is off.',
    action: 'Open app Settings.',
  },
  'AND-PERM-002': {
    code: 'AND-PERM-002',
    meaning: 'Notification permission denied (Android 13+)',
    message: 'Turn on notifications to get updates.',
    action: 'Open app Settings.',
  },
  'AND-PERM-003': {
    code: 'AND-PERM-003',
    meaning: 'Location permission denied',
    message: 'Location is off.',
    action: 'Open app Settings.',
  },
  'AND-PLAY-001': {
    code: 'AND-PLAY-001',
    meaning: 'Google Play Services missing/outdated',
    message: 'Please update Google Play Services.',
    action: 'Link to Play Store.',
  },
  'AND-VER-001': {
    code: 'AND-VER-001',
    meaning: 'App version too old',
    message: 'A new version is required.',
    action: 'Force-update screen to Play Store.',
  },
  'AND-BIO-001': {
    code: 'AND-BIO-001',
    meaning: 'Biometric unlock unavailable',
    message: "Biometric login isn't available.",
    action: 'Fall back to password.',
  },
  'AND-STO-001': {
    code: 'AND-STO-001',
    meaning: 'Device storage full',
    message: 'Not enough storage space.',
    action: 'Ask user to free space.',
  },
  'AND-MAIL-001': {
    code: 'AND-MAIL-001',
    meaning: 'Message queued offline',
    message: "Saved to Outbox. We'll send when you're online.",
    action: 'Auto-send on reconnect.',
  },
  'IOS-NET-001': {
    code: 'IOS-NET-001',
    meaning: 'No internet connection',
    message: "You're offline.",
    action: 'Retry when network returns.',
  },
  'IOS-PERM-001': {
    code: 'IOS-PERM-001',
    meaning: 'Camera access denied',
    message: 'Camera access is off.',
    action: 'Open iOS Settings.',
  },
  'IOS-PERM-002': {
    code: 'IOS-PERM-002',
    meaning: 'Notifications not allowed',
    message: 'Turn on notifications to get updates.',
    action: 'Open iOS Settings.',
  },
  'IOS-PERM-003': {
    code: 'IOS-PERM-003',
    meaning: 'Location access denied',
    message: 'Location is off.',
    action: 'Open iOS Settings.',
  },
  'IOS-ATT-001': {
    code: 'IOS-ATT-001',
    meaning: 'App Tracking Transparency declined',
    message: '',
    action: 'Disable tracking silently.',
  },
  'IOS-BIO-001': {
    code: 'IOS-BIO-001',
    meaning: 'Face ID / Touch ID unavailable',
    message: "Face ID isn't available.",
    action: 'Fall back to passcode/password.',
  },
  'IOS-VER-001': {
    code: 'IOS-VER-001',
    meaning: 'App version too old',
    message: 'A new version is required.',
    action: 'Force-update screen to App Store.',
  },
  'IOS-IAP-001': {
    code: 'IOS-IAP-001',
    meaning: 'In-app purchase failed or cancelled',
    message: "Purchase didn't go through. You weren't charged.",
    action: 'Offer Retry and Restore purchases.',
  },
  'IOS-MAIL-001': {
    code: 'IOS-MAIL-001',
    meaning: 'Message queued offline',
    message: "Saved to Outbox. We'll send when you're online.",
    action: 'Auto-send on reconnect.',
  },
} as const satisfies Record<string, ErrorDefinition>;

export type ErrorCode = keyof typeof ERROR_CODES;

export interface ApiErrorBody {
  code: ErrorCode;
  message: string;
  details?: unknown;
}

export function isErrorCode(value: string): value is ErrorCode {
  return Object.prototype.hasOwnProperty.call(ERROR_CODES, value);
}

export function toApiError(code: ErrorCode, details?: unknown): ApiErrorBody {
  const definition = ERROR_CODES[code];
  const body: ApiErrorBody = {
    code,
    message: definition.message,
  };
  if (details !== undefined) {
    body.details = details;
  }
  return body;
}
