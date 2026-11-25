# Screens and APIs

Last updated: 2026-11-26 · v0.2.0

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
| `/calendar`                | Calendar                       |
| `/contacts`                | Contacts                       |
| `/admin/domains`           | Domain list                    |
| `/admin/domains/:domainId` | DNS wizard                     |
| `/admin/users`             | Users                          |

`/admin` redirects to `/admin/domains`. Unknown marketing paths render the not-found page.

## Mobile screens

| Route                    | Screen                                     |
| ------------------------ | ------------------------------------------ |
| `(auth)/sign-in`         | Sign in                                    |
| `(auth)/sign-up`         | Create an account                          |
| `(auth)/forgot-password` | Password reset request                     |
| `(auth)/two-factor`      | TOTP prompt                                |
| `(tabs)/mail`            | Inbox, sent, drafts, archive               |
| `(tabs)/mail/compose`    | Compose                                    |
| `(tabs)/mail/[id]`       | Message                                    |
| `(tabs)/calendar`        | Placeholder                                |
| `(tabs)/contacts`        | Placeholder                                |
| `(tabs)/drive`           | Placeholder. Drive is not in this version. |
| `(tabs)/more`            | Account and sign out                       |

## Auth

| Method and path                                   | Also called as                                                                  | Notes                                                                                                                                                                                                                                                                  |
| ------------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/v1/auth/signup`                        | `POST /api/v1/auth/sign-up`                                                     | Same handler. Shorthand body is `name`, `email`, `password`, optional `organization` and `plan`. `plan: business` starts the Business trial. Response keeps `session` and repeats the token pair at the top level. `user` includes `name`, `organization`, and `plan`. |
| `POST /api/v1/auth/login`                         | `POST /api/v1/auth/sign-in`                                                     | Same handler. Web and mobile call `sign-in`.                                                                                                                                                                                                                           |
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

## Still unmatched

These clients call paths the control plane does not serve yet. The web falls back to preview data when the body does not match.

- Web calendar calls `GET` and `POST /api/v1/calendar/events`.
- Web contacts call `GET /api/v1/contacts`.
- Web domains and the DNS wizard expect `{ name, checks }`. The API returns `domainName` and DNS from `GET /api/v1/domains/:id/dns`.
- Web users expect `name` and `status`. The API returns `fullName` and `isActive`.
- Web pricing calls `GET /api/v1/plans`. The catalog is `GET /api/v1/billing/plans`.
- Mobile two-factor calls `POST /api/v1/auth/mfa/verify` with `challengeToken`. Sign-in still answers `API-SEC-001` and expects `totpCode` on the next login.
- Signup accepts Free, or Business as a trial. Starter, Business Plus, and Enterprise are not self-serve.
- Web sign-out clears the browser token and does not call `POST /api/v1/auth/logout`.
