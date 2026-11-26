# Error codes

Last updated: 2026-11-26 · v0.1.0

Every API error returns `{ code, message, details }`. The registry is `packages/shared/errors/codes.ts`. A retired code is never reused. Client codes have no HTTP status.

| Code          | HTTP | Meaning                                      | Message                                              | What to do                               |
| ------------- | ---- | -------------------------------------------- | ---------------------------------------------------- | ---------------------------------------- |
| API-AUTH-001  | 401  | Wrong email or password                      | Email or password is incorrect.                      | Retry or use Forgot password.            |
| API-AUTH-002  | 401  | Access token expired                         |                                                      | Client refreshes token automatically.    |
| API-AUTH-003  | 403  | Not allowed for this role                    | You don't have access to this.                       | Ask an organization admin for access.    |
| API-VAL-001   | 422  | Input failed validation                      | Please check the highlighted fields.                 | Correct highlighted fields from details. |
| API-RES-404   | 404  | Item not found                               | We couldn't find that.                               | Go back or refresh the list.             |
| API-RATE-429  | 429  | Too many requests                            | Too many attempts. Try again in a minute.            | Wait briefly, then retry.                |
| API-SRV-500   | 500  | Unexpected server error                      | Something went wrong on our side.                    | Logged with request ID; alert on-call.   |
| API-SRV-503   | 503  | Maintenance or overload                      | We'll be right back.                                 | Retry with exponential backoff.          |
| API-MAIL-001  | 413  | Message larger than plan limit               | This message is over your plan's size limit.         | Send as a Drive link or upgrade.         |
| API-MAIL-002  | 422  | Too many recipients in one message           | Too many recipients for one message.                 | Split the message or use a group.        |
| API-MAIL-003  | 403  | Outbound paused for abuse review             | Sending is paused while we check your account.       | Contact support; admin sees reason.      |
| API-MAIL-004  | 409  | Domain not verified for sending              | This domain isn't ready to send yet.                 | Finish DNS setup.                        |
| API-MAIL-005  | 422  | Recipient address invalid                    | Check the email address.                             | Correct the address.                     |
| API-DNS-001   | 422  | Ownership TXT record not found               | We couldn't find your verification record.           | Add the TXT record, wait, retry.         |
| API-DNS-002   | 422  | MX records not pointing to us                | Your MX records point somewhere else.                | Update MX records.                       |
| API-DNS-003   | 422  | SPF missing or over 10 lookups               | Your SPF record needs a fix.                         | Use the suggested SPF value.             |
| API-DNS-004   | 422  | DKIM record missing or wrong                 | DKIM isn't set up yet.                               | Publish the DKIM record shown.           |
| API-DNS-005   | 422  | DMARC missing or invalid                     | Add a DMARC record to protect your domain.           | Publish the suggested DMARC.             |
| API-DNS-006   | 422  | MTA-STS or TLS-RPT problem                   | Secure delivery settings need attention.             | Add the CNAME/TXT shown.                 |
| API-DNS-007   | 409  | Domain already used by another tenant        | This domain is already connected to another account. | Prove ownership or contact support.      |
| API-DNS-008   | 502  | Registrar API call failed                    | We couldn't update your DNS automatically.           | Retry or add records by hand.            |
| API-BILL-001  | 402  | Payment failed                               | Your payment didn't go through.                      | Retry or change payment method.          |
| API-BILL-002  | 402  | Mandate cancelled or expired                 | Your AutoPay mandate has stopped.                    | Set up AutoPay again.                    |
| API-BILL-003  | 402  | Feature not in current plan                  | This feature is part of a higher plan.               | Show upgrade options.                    |
| API-BILL-004  | 422  | GSTIN invalid                                | Check your GSTIN.                                    | Correct GSTIN.                           |
| API-BILL-005  | 403  | Subscription in grace or read-only           | Your plan is overdue. Some actions are paused.       | Pay the invoice.                         |
| API-QUOTA-001 | 507  | Mailbox storage full                         | Your mailbox is full.                                | Delete mail, archive or add storage.     |
| API-QUOTA-002 | 429  | Daily sending limit reached                  | You've reached today's sending limit.                | Wait until reset time in details.        |
| API-QUOTA-003 | 409  | No free seats                                | All your seats are in use.                           | Add seats.                               |
| API-QUOTA-004 | 409  | Alias limit reached                          | You've used all your aliases.                        | Remove one or upgrade.                   |
| API-QUOTA-005 | 409  | Domain limit reached                         | You've reached your domain limit.                    | Remove one or upgrade.                   |
| API-QUOTA-006 | 429  | AI quota used up                             | You've used today's AI actions.                      | Wait or add AI Pro.                      |
| API-MIG-001   | 422  | Source mailbox sign-in failed                | We couldn't sign in to your old mailbox.             | Check details or app password.           |
| API-MIG-002   | 502  | Source server unavailable                    | Your old provider isn't responding.                  | Retry later; import resumes.             |
| API-SEC-001   | 401  | MFA required                                 | Enter your verification code.                        | Complete MFA.                            |
| API-SEC-002   | 401  | Passkey or code rejected                     | That didn't work. Try again.                         | Retry or use another method.             |
| API-SEC-003   | 403  | Blocked by tenant access policy              | Your organisation doesn't allow sign-in from here.   | Ask your admin.                          |
| API-TEN-001   | 403  | Tenant suspended                             | This account is suspended.                           | Contact the account owner.               |
| API-CAL-001   | 409  | Booking slot no longer free                  | That time was just taken.                            | Pick another slot.                       |
| API-DRV-001   | 413  | File larger than plan upload limit           | This file is too large for your plan.                | Upgrade or split.                        |
| WEB-NET-001   |      | Browser offline                              | You're offline. We'll retry when you reconnect.      | Listen for online event and retry.       |
| WEB-NET-002   |      | Request timed out (>15 s)                    | This is taking longer than usual.                    | Show Retry button.                       |
| WEB-BRW-001   |      | Unsupported browser                          | Please update your browser.                          | Show supported browser list.             |
| WEB-STO-001   |      | Cookies/storage blocked                      | Enable cookies to stay signed in.                    | Link to /docs help page.                 |
| WEB-UPL-001   |      | File too large                               | Files must be under 25 MB.                           | Compress or share via Drive link.        |
| WEB-RND-001   |      | Page crashed (error boundary)                | This page hit a problem.                             | Show Reload button; report to Sentry.    |
| WEB-MAIL-001  |      | Draft could not autosave                     | Your draft isn't saved yet.                          | Retry automatically; copy text.          |
| AND-NET-001   |      | No internet connection                       | You're offline.                                      | Retry when network returns.              |
| AND-PERM-001  |      | Camera permission denied                     | Camera access is off.                                | Open app Settings.                       |
| AND-PERM-002  |      | Notification permission denied (Android 13+) | Turn on notifications to get updates.                | Open app Settings.                       |
| AND-PERM-003  |      | Location permission denied                   | Location is off.                                     | Open app Settings.                       |
| AND-PLAY-001  |      | Google Play Services missing/outdated        | Please update Google Play Services.                  | Link to Play Store.                      |
| AND-VER-001   |      | App version too old                          | A new version is required.                           | Force-update screen to Play Store.       |
| AND-BIO-001   |      | Biometric unlock unavailable                 | Biometric login isn't available.                     | Fall back to password.                   |
| AND-STO-001   |      | Device storage full                          | Not enough storage space.                            | Ask user to free space.                  |
| AND-MAIL-001  |      | Message queued offline                       | Saved to Outbox. We'll send when you're online.      | Auto-send on reconnect.                  |
| IOS-NET-001   |      | No internet connection                       | You're offline.                                      | Retry when network returns.              |
| IOS-PERM-001  |      | Camera access denied                         | Camera access is off.                                | Open iOS Settings.                       |
| IOS-PERM-002  |      | Notifications not allowed                    | Turn on notifications to get updates.                | Open iOS Settings.                       |
| IOS-PERM-003  |      | Location access denied                       | Location is off.                                     | Open iOS Settings.                       |
| IOS-ATT-001   |      | App Tracking Transparency declined           |                                                      | Disable tracking silently.               |
| IOS-BIO-001   |      | Face ID / Touch ID unavailable               | Face ID isn't available.                             | Fall back to passcode/password.          |
| IOS-VER-001   |      | App version too old                          | A new version is required.                           | Force-update screen to App Store.        |
| IOS-IAP-001   |      | In-app purchase failed or cancelled          | Purchase didn't go through. You weren't charged.     | Offer Retry and Restore purchases.       |
| IOS-MAIL-001  |      | Message queued offline                       | Saved to Outbox. We'll send when you're online.      | Auto-send on reconnect.                  |

Mail servers also return standard SMTP and IMAP reply codes. A plain-language page for common bounces (`550 5.1.1`, `552 5.2.2`, `554 5.7.1`) will be added with the mail flow.
