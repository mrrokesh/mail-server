# Screens and APIs

Last updated: 2026-11-26 · v0.4.0

This is the MVP inventory. Paths under `/api/v1` are the control plane. The web app prefixes its calls with `/api/v1`. Full request bodies are in `backend/openapi.yaml`.

## Web screens

| Path                       | Screen                         |
| -------------------------- | ------------------------------ |
| `/`                        | Marketing home                 |
| `/pricing`                 | Plans                          |
| `/security`                | Security overview              |
| `/docs` and `/docs/*`      | Docs rendered from this folder |
| `/login`                   | Sign in                        |
| `/signup`                  | Create a workspace             |
| `/forgot-password`         | Password reset request         |
| `/mail`                    | Three-pane mail                |
| `/chat`                    | Chat conversations and threads |
| `/calendar`                | Calendar                       |
| `/contacts`                | Contacts                       |
| `/drive`                   | Drive files and share links    |
| `/documents`               | Docs list (WOPI stub)          |
| `/meet`                    | Meeting shell                  |
| `/booking`                 | Booking pages                  |
| `/book/:slug`              | Public booking page            |
| `/tasks`                   | Tasks                          |
| `/notes`                   | Notes                          |
| `/ai`                      | AI writing and summaries       |
| `/privacy`                 | Masked aliases and key hooks   |
| `/campaigns`               | Campaign drafts                |
| `/admin/domains`           | Domain list                    |
| `/admin/domains/:domainId` | DNS wizard                     |
| `/admin/users`             | Users                          |
| `/admin/compliance`        | Archive, retention, discovery  |
| `/admin/sso`               | SSO and SCIM tokens            |
| `/admin/enterprise`        | BYOK, SIEM, simulation, IP     |
| `/admin/brand`             | Partner login host and logo    |

`/admin` redirects to `/admin/domains`. Unknown marketing paths render the not-found page.

## Mobile screens

| Route                    | Screen                              |
| ------------------------ | ----------------------------------- |
| `(auth)/sign-in`         | Sign in                             |
| `(auth)/sign-up`         | Create an account                   |
| `(auth)/forgot-password` | Password reset request              |
| `(auth)/two-factor`      | TOTP prompt                         |
| `(tabs)/mail`            | Inbox, sent, drafts, archive        |
| `(tabs)/mail/compose`    | Compose                             |
| `(tabs)/mail/[id]`       | Message                             |
| `(tabs)/calendar`        | Placeholder                         |
| `(tabs)/contacts`        | Placeholder                         |
| `(tabs)/drive`           | File list when signed in to the API |
| `(tabs)/more`            | Account, chat entry, and sign out   |
| `(tabs)/chat`            | Chat, opened from More              |

## Auth

| Method and path                                   | Also called as                                                                  | Notes                                                                                                                                                                                                                                                                  |
| ------------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/v1/auth/signup`                        | `POST /api/v1/auth/sign-up`                                                     | Same handler. Shorthand body is `name`, `email`, `password`, optional `organization` and `plan`. `plan: business` starts the Business trial. Response keeps `session` and repeats the token pair at the top level. `user` includes `name`, `organization`, and `plan`. |
| `POST /api/v1/auth/login`                         | `POST /api/v1/auth/sign-in`                                                     | Same handler. Optional `totpCode` completes MFA. Without it, MFA returns `{ mfaRequired: true, challengeToken }` and no session.                                                                                                                                       |
| `POST /api/v1/auth/mfa/verify`                    |                                                                                 | Body is `challengeToken` plus `code` or `totpCode`. Returns the same session as login.                                                                                                                                                                                 |
| `POST /api/v1/auth/refresh`                       |                                                                                 | Body or `mr_refresh` cookie.                                                                                                                                                                                                                                           |
| `POST /api/v1/auth/logout`                        | `POST /api/v1/auth/sign-out`                                                    | Send `refreshToken` to revoke that session.                                                                                                                                                                                                                            |
| `POST /api/v1/auth/password`                      |                                                                                 | Signed-in password change.                                                                                                                                                                                                                                             |
| `POST /api/v1/auth/password/forgot`               | `POST /api/v1/auth/password/reset-request`, `POST /api/v1/auth/password-resets` | Mobile uses `reset-request`. Web uses `password-resets`.                                                                                                                                                                                                               |
| `POST /api/v1/auth/password/reset`                |                                                                                 | Body field is `password`.                                                                                                                                                                                                                                              |
| `GET /api/v1/auth/sessions`                       |                                                                                 |                                                                                                                                                                                                                                                                        |
| `DELETE /api/v1/auth/sessions/:id`                |                                                                                 |                                                                                                                                                                                                                                                                        |
| `POST /api/v1/auth/mfa/totp/setup`                |                                                                                 |                                                                                                                                                                                                                                                                        |
| `POST /api/v1/auth/mfa/totp/confirm`              |                                                                                 |                                                                                                                                                                                                                                                                        |
| `POST /api/v1/auth/passkeys/options`              |                                                                                 |                                                                                                                                                                                                                                                                        |
| `POST /api/v1/auth/passkeys`                      |                                                                                 |                                                                                                                                                                                                                                                                        |
| `GET /api/v1/auth/passkeys`                       |                                                                                 |                                                                                                                                                                                                                                                                        |
| `POST /api/v1/auth/passkeys/authenticate/options` |                                                                                 |                                                                                                                                                                                                                                                                        |
| `POST /api/v1/auth/passkeys/authenticate`         |                                                                                 |                                                                                                                                                                                                                                                                        |
| `GET /api/v1/me`                                  |                                                                                 | User and organization.                                                                                                                                                                                                                                                 |

## Organization, users, domains, mailboxes

| Method and path                                                                       | Notes                              |
| ------------------------------------------------------------------------------------- | ---------------------------------- |
| `GET /api/v1/org`, `PATCH /api/v1/org`                                                | Owner can rename.                  |
| `PUT /api/v1/org/mfa-policy`                                                          |                                    |
| `GET /api/v1/users`, `POST /api/v1/users`                                             |                                    |
| `POST /api/v1/users/:id/suspend`                                                      |                                    |
| `POST /api/v1/users/:id/restore`                                                      |                                    |
| `DELETE /api/v1/users/:id`                                                            |                                    |
| `POST /api/v1/users/:id/password`                                                     | Body field is `password`.          |
| `DELETE /api/v1/users/:id/sessions`                                                   |                                    |
| `GET /api/v1/domains`, `POST /api/v1/domains`                                         |                                    |
| `GET /api/v1/domains/:id`                                                             |                                    |
| `GET /api/v1/domains/:id/dns`                                                         |                                    |
| `POST /api/v1/domains/:id/verify`                                                     |                                    |
| `PATCH /api/v1/domains/:id`                                                           | Catch-all mailbox.                 |
| `GET /api/v1/mailboxes`, `POST /api/v1/mailboxes`                                     |                                    |
| `POST /api/v1/mailboxes/:id/aliases`                                                  |                                    |
| `DELETE /api/v1/mailboxes/:id/aliases/:aliasId`                                       |                                    |
| `POST /api/v1/mailboxes/:id/delegations`                                              |                                    |
| `GET /api/v1/mailboxes/:id/app-passwords`, `POST /api/v1/mailboxes/:id/app-passwords` | Plaintext only on create.          |
| `GET /api/v1/audit`                                                                   | Plan must include audit retention. |

## Billing

| Method and path                          | Notes          |
| ---------------------------------------- | -------------- |
| `GET /api/v1/billing/plans`              |                |
| `GET /api/v1/billing/subscription`       |                |
| `GET /api/v1/billing/usage`              |                |
| `GET /api/v1/billing/invoices`           |                |
| `POST /api/v1/billing/checkout`          | Razorpay stub. |
| `POST /api/v1/billing/webhooks/razorpay` |                |

## Mail

| Method and path                 | Notes                                                                                                             |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `GET /api/v1/mail/protocols`    | IMAP, SMTP, and POP3 follow the plan.                                                                             |
| `POST /api/v1/mail/session`     | JMAP-shaped session.                                                                                              |
| `GET /api/v1/mail/threads`      | Web mail list. `{ threads }` with `folder`, `fromName`, `fromEmail`, `preview`, and `bodyHtml`.                   |
| `GET /api/v1/mail/messages`     | `mailboxId` or `mailbox` (`inbox`, `sent`, `drafts`, `archive`, `spam`). Body is `{ messages }`.                  |
| `GET /api/v1/mail/messages/:id` | One message for the mobile reader.                                                                                |
| `POST /api/v1/mail/messages`    | `to` is one address or a list. `from` defaults to the caller's mailbox. `text` and `textBody` are the same field. |
| `POST /api/v1/mail/jmap`        | `Email/set` and `Mailbox/get`.                                                                                    |

The mock mail plane files a message as `sent` when `from` is the caller's mailbox or alias, and as `inbox` otherwise. Drafts, archive, and spam stay empty until a real mailbox store tracks folders.

## v1 modules

These routes are served. Docs, Meet, AI, compliance, and SSO stay in process memory. Drive, tasks, notes, and booking follow the v2 persistence note below.

| Method and path                                                                               | Notes                                                                                                   |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `GET /api/v1/plans`                                                                           | Web pricing shape. `GET /api/v1/billing/plans` remains the control-plane catalog.                       |
| `GET`, `POST /api/v1/drive/files`                                                             | Metadata only. Upload size uses `API-DRV-001`. Storage uses `API-QUOTA-001`.                            |
| `POST /api/v1/drive/files/:id/shares`                                                         | Starter and above. Password is stored as a hash.                                                        |
| `GET /api/v1/public/drive/:token`                                                             | Public. Locked until `password` matches.                                                                |
| `GET`, `POST /api/v1/docs`                                                                    | Business and above. Includes GST, quotation, letterhead, and offer-letter template ids.                 |
| `GET`, `POST /api/v1/docs/:id/wopi`                                                           | CheckFileInfo and a save that bumps the version.                                                        |
| `GET`, `POST /api/v1/meet/rooms`                                                              | Starter and above. `adapter` is `livekit-stub`.                                                         |
| `GET`, `POST /api/v1/booking/pages`                                                           | Starter has one page. Business and above are uncapped in this stub.                                     |
| `GET`, `POST /api/v1/public/booking/:slug`                                                    | Public. A taken slot is `API-CAL-001`.                                                                  |
| `GET`, `POST /api/v1/tasks`, `PATCH /api/v1/tasks/:id`                                        |                                                                                                         |
| `GET`, `POST /api/v1/notes`, `PATCH /api/v1/notes/:id`                                        |                                                                                                         |
| `GET /api/v1/ai/status`, `PUT /api/v1/admin/ai`                                               | Owner or security admin can disable AI.                                                                 |
| `POST /api/v1/ai/write`, `POST /api/v1/ai/summarize`                                          | Starter and above. Over the daily cap is `API-QUOTA-006`. Disabled is `API-AUTH-003`.                   |
| `GET /api/v1/compliance` and the archive, retention, ediscovery, holds, and journaling writes | Business Plus. Owner or compliance admin.                                                               |
| `GET`, `PUT /api/v1/admin/sso`                                                                | Metadata is encrypted. The read model never returns it.                                                 |
| `GET`, `POST /api/v1/admin/scim/tokens`                                                       | The token is returned once.                                                                             |
| `GET /api/v1/scim/v2/ServiceProviderConfig`                                                   |                                                                                                         |
| `GET`, `POST /api/v1/scim/v2/Users`                                                           | Bearer is the SCIM token. Users are not mailboxes.                                                      |
| `GET /api/v1/mail/protocols`                                                                  | Adds `activesync`, `ews`, and `activesyncNote`. Query `protocol=activesync` or `ews` requires Business. |
| `GET`, `POST /api/v1/calendar/events`                                                         | Web event shape, wrapped as `{ events }`.                                                               |
| `GET`, `POST /api/v1/contacts`                                                                | Directory rows come from users. Personal rows are stored.                                               |

Domain list and create responses include `name` and `checks` for the wizard, and still include `domainName` plus `domain` and `records` on create. User responses include `name` and `status` beside `fullName` and `isActive`. An invite without a password returns `temporaryPassword` once.

## v2 modules

Chat is `mrrokesh-chat`. It is not Mattermost and it does not use Rocket.Chat `ee/`. The adapter field is `memory` or `postgres`.

With `CONTROL_STORE=memory` (the default, including tests), module rows stay in the API process. With `CONTROL_STORE=postgres`, the adapter loads drive files and shares, tasks, notes, booking pages and appointments, plus the v2 tables below, on the first request for an organisation and writes them back when the response finishes. Docs, Meet, calendar events, contacts, AI, compliance, and SSO stay in memory either way. One API process owns that working set.

| Method and path                                           | Notes                                                                                                                                                                                                                                                     |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`, `POST /api/v1/chat/conversations`                  | Business and above. `kind` is `direct`, `group`, or `channel`. A direct chat needs one other user id.                                                                                                                                                     |
| `GET`, `POST /api/v1/chat/conversations/:id/messages`     | Members only. `threadRootId` replies to a top-level message. `driveFileId` must already exist in Drive.                                                                                                                                                   |
| `GET /api/v1/chat/search?q=`                              | Up to 100 hits in conversations the caller belongs to.                                                                                                                                                                                                    |
| `GET /api/v1/chat/presence`                               | `calendarLinked` is false. Presence is not computed.                                                                                                                                                                                                      |
| `GET`, `POST /api/v1/privacy/aliases`                     | Starter and above. Addresses use `mask.rokeshcloud.com`, which is not routed until privacy routing is live. Caps are 10 on Starter and 50 on Business and Business Plus. The Privacy add-on and Enterprise are uncapped. Over the cap is `API-QUOTA-004`. |
| `POST /api/v1/privacy/aliases/:id/disable`                | Turns the caller's alias off.                                                                                                                                                                                                                             |
| `GET /api/v1/privacy/dashboard`                           | Basic on Starter. Full when the add-on or Enterprise is on. Tracker counts are null.                                                                                                                                                                      |
| `PUT /api/v1/privacy/addon`                               | Owner or billing admin. This is not a charge.                                                                                                                                                                                                             |
| `GET`, `PUT /api/v1/privacy/keys`                         | Requires the add-on or Enterprise. The body is a client public key and a wrapped private key. `serverDecrypts` and `generatesKeys` are false. An unprotected private key is rejected.                                                                     |
| `POST /api/v1/privacy/recovery`                           | Body is `{ "registered": true }`. The phrase is not accepted.                                                                                                                                                                                             |
| `GET /api/v1/enterprise`                                  | Enterprise. Owner or security admin.                                                                                                                                                                                                                      |
| `POST /api/v1/enterprise/byok`                            | Version plus a key reference. Key material is rejected. Mail is not re-encrypted.                                                                                                                                                                         |
| `POST /api/v1/enterprise/siem`                            | `webhook` needs an https URL. `syslog` needs `host:port`. Nothing is delivered.                                                                                                                                                                           |
| `POST /api/v1/enterprise/siem/:id/sample`                 | Returns a sample event with `delivered: false`.                                                                                                                                                                                                           |
| `POST /api/v1/enterprise/attack-simulations`              | Placeholder. `emailsSent` is 0.                                                                                                                                                                                                                           |
| `PUT /api/v1/enterprise/dedicated-ip`                     | Flag only. `routed` is false.                                                                                                                                                                                                                             |
| `GET`, `PUT /api/v1/admin/brand`                          | Business Plus owner. No colour field. Accent stays `brand`.                                                                                                                                                                                               |
| `GET /api/v1/public/brand?host=`                          | Public. Unknown hosts return MR Rokesh.                                                                                                                                                                                                                   |
| `GET`, `POST /api/v1/campaigns`                           | Starter and above. Drafts are not mailbox messages. Response includes `List-Unsubscribe` and `List-Unsubscribe-Post`.                                                                                                                                     |
| `GET`, `POST /api/v1/public/campaigns/unsubscribe/:token` | RFC 8058 placeholder. POST accepts JSON or `application/x-www-form-urlencoded` with `email` and optional `List-Unsubscribe=One-Click`.                                                                                                                    |

## Still unmatched

- Signup accepts Free, or Business as a trial. Starter, Business Plus, and Enterprise are not self-serve.
- Web sign-out clears the browser token and does not call `POST /api/v1/auth/logout`.
- Docs, Meet, calendar events, contacts, AI, compliance, and SSO are still process memory. Restarting the API clears them.
- Drive, tasks, notes, booking, chat, privacy, enterprise, brand, and campaigns are process memory unless `CONTROL_STORE=postgres` and `0002_v2_modules.sql` has been applied.
