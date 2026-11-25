# Build prompt: Rokesh Mail, a custom-domain business email platform

Prepared for MR ROKESH Softwares, 25 Nov 2026, version 2. This version follows the **mrrokesh.com Product Build Playbook** (20 Nov 2026). The first version is kept as `build-prompt-v1-before-playbook.md`.

How to use it:
1. Paste **Part A** into your coding agent as the starter prompt, and save it as `PROJECT_BRIEF.md` in the repo root, as the playbook says.
2. Commit **Parts B to J** as `docs/developer/spec.md`. Part A tells the agent to follow them.
3. Prices in Part I were read on 25 Nov 2026 and will drift, so check them again before you publish yours.

Where this product needs something the playbook doesn't cover (a mail server, mail protocols, a DNS wizard), the addition is marked **[Addition: needs your approval]**. The playbook says the architecture doesn't change without your approval, so the agent must ask before building any marked part.

---

# Part A. Starter prompt (save as PROJECT_BRIEF.md)

```
You are building Rokesh Mail for mrrokesh.com.

GOAL
- What it does: a subscription business email service. A customer brings their
  own domain (or buys one), picks a plan, pays, and gets mailboxes, calendar,
  contacts and an admin console, like Microsoft 365, Google Workspace and Zoho Mail.
- Who uses it: customers (end users reading mail), staff (each customer's admins:
  owner, billing admin, user admin, helpdesk, compliance officer, auditor) and
  admins (MR ROKESH operators running the service).
- Platforms: Web + Android + iOS. Third-party mail apps (Outlook, Apple Mail,
  Thunderbird, phone mail apps) also connect over standard mail protocols.

ARCHITECTURE (do not change without approval)
- /frontend -> React + Vite + TypeScript (marketing and pricing pages, webmail,
  admin console, customer portal, /docs)
- /mobile   -> React Native (Expo) + TypeScript (Android + iOS mail app)
- /backend  -> Node.js + Fastify + TypeScript (REST API, one API for all clients)
- /packages/shared -> shared types, API client, error codes, design tokens
- Database: PostgreSQL. Auth: JWT access + refresh tokens.
- Mail layer [Addition: needs approval]: /infra holds the Stalwart mail server,
  spam and virus filtering, and the outbound sending tier. Only the backend talks
  to Stalwart (management API and JMAP). Web and mobile never talk to Stalwart
  or the database directly. Third-party mail apps connect to Stalwart over
  IMAP, POP3, SMTP submission, CalDAV, CardDAV and ActiveSync, with the same
  tenant checks enforced there.

RULES
1. Follow the mrrokesh.com Product Build Playbook (design system, folder
   layout, error codes) and docs/developer/spec.md.
2. Every API error returns { code, message, details } with a code from the
   error tables (playbook section 6 plus spec Part F).
3. Every screen uses design tokens only - no hard-coded colors, fonts or spacing.
4. Every feature updates /docs (user guide) and CHANGELOG.md in the same pull request.
5. Write tests for business logic; no secrets in code (.env only, .env.example committed).
6. Passwords: bcrypt (cost 12) + per-user salt + server-side pepper (HMAC-SHA256),
   exactly as in the playbook's password security section.
7. Nothing fake: no mocks, stubs, sample accounts or fake delays in shipped code.
   Where a credential is missing, build the full code path and list the key in
   .env.example.
8. Plan limits are enforced on the server in every API and protocol path, never
   only in the UI.
9. Tenant isolation first: no query, cache key, blob path, search entry, log
   line or job runs without the tenant ID taken from the signed-in session.
10. Deliverability is a feature: one abusive tenant must never get the shared
    sending IPs blocklisted (spec Part H.4).
11. Respect open-source licenses (spec Part B.3). Never copy code, icons or
    artwork from Microsoft, Google, Zoho or any other provider.
12. Security follows spec Part H.5, checked with the Cloudflare security-audit
    skill before every phase ships.

FIRST TASK
- Scaffold the three folders, shared package, linting, and a /docs page.
- Then list the screens and API endpoints you plan (start from spec Part J),
  and wait for my approval.

FEATURES (details, limits and plan gates in spec Part H)
1. Domains: add a domain, verify it, DNS wizard that checks every record live.
2. Users, groups, aliases, shared and resource mailboxes, roles.
3. Mail: threads, labels, search, rules, templates, undo and scheduled send,
   snooze, follow-up reminders, read receipts, masked addresses.
4. Calendar with sharing, room booking and a public booking page.
5. Contacts, shared address books and company directory.
6. Tasks linked to emails.
7. AI assistant: summaries, reply suggestions, rewrite, translate (metered).
8. Security: 2FA, passkeys, SSO, sign-in logs, device wipe, app passwords.
9. Compliance: retention, legal hold, eDiscovery, data loss prevention, journaling, audit export.
10. Migration from Google Workspace, Microsoft 365, Zoho and any IMAP host.
11. Subscription plans, seats, trials, GST invoices, Razorpay and Stripe.
12. Mobile apps for Android and iOS, plus setup for any third-party mail app.
13. Operator console: tenants, abuse queue, IP reputation, deliverability.
```

---

# Part B. Architecture

## B.1 Three clients, one API, one mail layer

```
                    Web (React + Vite)        Mobile (Expo)
                    marketing, webmail,       Android + iOS
                    admin, portal, /docs      mail app
                            │                     │
                            └──────────┬──────────┘
                                       │ HTTPS, REST /api/v1, push (SSE/WebSocket)
                              ┌────────▼────────┐
                              │  Backend API    │  Fastify + TypeScript
                              │  auth, tenants, │  plans, billing, audit,
                              │  mail facade    │  DNS checks, AI gateway,
                              └──┬──────────┬───┘  migration jobs
                                 │          │
                          PostgreSQL     Stalwart management API + JMAP
                                            │
   [Addition: needs approval]   ┌───────────▼────────────┐
   Third-party mail apps ──────►│ Stalwart cluster        │ IMAP, POP3, SMTP submission,
   (Outlook, Apple Mail,        │ mail store, filters,    │ CalDAV, CardDAV, ActiveSync
    Thunderbird, phones)        │ DKIM signing            │
                                └──┬──────────┬───────────┘
                         S3/MinIO blobs    Search index
                                 │
          Outbound tier (separate clean IPs, pools, per-tenant limits) ─► internet
          Inbound MX + spam and virus filters (Stalwart, Rspamd, ClamAV) ◄─ internet
          Observability: OpenTelemetry → Prometheus/Grafana, Loki logs, Sentry
```

- **The playbook rule holds for our own apps.** The web and mobile apps call only the backend. The backend exposes mail as REST endpoints (`/api/v1/mail/...`) and talks JMAP to Stalwart behind them, so plan limits, error codes and audit live in one place.
- **The one exception is standard mail protocols.** Outlook, Apple Mail and phone mail apps can't speak our REST API, so they connect to Stalwart directly. Every protocol path must apply the same tenant, plan and brute-force checks as the API (Part H.5.4).
- Two sites from day one for MX (a backup MX that queues and never delivers spam). Everything in containers, infrastructure as code, and a staging copy of production.
- Rokesh Cloud can host the backend and web apps. Mail servers need static IPs, open ports 25, 465, 587, 993, 995 and 443, and correct reverse DNS (PTR), so check that with the hosting first.

## B.2 Mail core: Stalwart

| Component | Choice | License | Why |
|---|---|---|---|
| Mail server (SMTP, IMAP, POP3, JMAP, ManageSieve, CalDAV, CardDAV, WebDAV) | Stalwart (Rust) | AGPL-3.0 Community, plus a paid Enterprise license per mailbox | One modern server with JMAP, DKIM, SPF, DMARC, ARC, DANE, MTA-STS, ACME, a built-in spam filter, clustering and PostgreSQL/S3 storage. Its site lists ActiveSync (EAS) and EWS; prove them on real phones and Outlook before you advertise them. |
| Extra spam filtering (if needed) | Rspamd | Apache-2.0 | Proven filter if Stalwart's own isn't enough |
| Antivirus | ClamAV via milter | GPL-2.0 | Stalwart doesn't document a built-in virus scanner |
| Groupware fallback | SOGo | GPL-2.0 / LGPL-2.1 | Only if Stalwart's ActiveSync fails device tests |
| Object storage | S3-compatible (MinIO on your servers, or cloud S3) | | Message blobs, attachments, backups |
| Background jobs | pg-boss (jobs stored in PostgreSQL) | MIT | Migration, DNS checks, exports and AI jobs, with no extra database |
| Payments | Razorpay (India: UPI AutoPay, cards, e-mandate) and Stripe (other countries) | | Per-seat recurring billing with GST invoices |

**Licensing decision you need to make.** Stalwart's comparison page lists multi-tenancy with per-tenant quotas, SCIM, sharded stores, delivery history, the AI spam classifier and account archiving as Enterprise-only.
- **Option A (recommended once you have paying customers):** buy the Enterprise license, after getting a written quote.
- **Option B (cheaper start):** run Community edition with one Stalwart domain per customer domain, and let the backend enforce tenant boundaries. The backend creates every account, alias and group, and no customer ever gets Stalwart's admin. Plan the move to A.

Alternatives considered and why not as the core: mailcow (GPL-3.0, one host, not multi-tenant), Mailu (MIT, multi-domain without tenant isolation), Mail-in-a-Box (one-box appliance), Modoboa (ISC, weaker protocol coverage), iRedMail (one-server installer), docker-mailserver (config files only), Postal (MIT, outbound relay only, but a good fit for the outbound tier), Roundcube and SnappyMail (webmail only).

## B.3 Webmail and mobile app

- **Webmail is part of /frontend**, a React + Vite app, as the playbook requires (version 1 suggested Next.js; that's dropped). Bulwark Webmail (AGPL-3.0, Next.js, made for Stalwart) is a useful reference for JMAP flows. Read it, but don't copy its code into our closed-source app, because the AGPL would then require publishing our changes.
- Email HTML is shown in a sandboxed iframe on a **separate origin** (for example `usercontent.rokeshmail.example`) with a strict allow-list sanitizer and CSP. This is the biggest XSS risk in any webmail.
- **The mobile app is /mobile (Expo)**, also required by the playbook (version 1 suggested a PWA only). It uses the same backend endpoints as the web, with push notifications through Expo Notifications fed by the backend.
- Marketing and pricing pages live in /frontend too. Prerender them at build time so search engines can read them.

---

# Part C. Folder structure

The playbook's monorepo with pnpm workspaces, with this product's feature folders filled in.

```
rokesh-mail/
├── frontend/
│   ├── src/
│   │   ├── app/                 # routes, layouts, providers
│   │   ├── features/
│   │   │   ├── marketing/       # home, pricing, compare, sign-up, checkout
│   │   │   ├── auth/            # sign-in, 2FA, passkeys, SSO, recovery
│   │   │   ├── mail/            # list, thread, compose, search, rules
│   │   │   ├── calendar/        # views, events, sharing, booking page
│   │   │   ├── contacts/
│   │   │   ├── tasks/
│   │   │   ├── ai/
│   │   │   ├── settings/        # signatures, aliases, devices, app passwords
│   │   │   ├── admin/           # domains, dns-wizard, users, groups, policies,
│   │   │   │                    # security, compliance, migration, reports, roles
│   │   │   ├── billing/         # plan, seats, invoices, payment methods
│   │   │   └── operator/        # internal console for MR ROKESH staff
│   │   ├── components/ui/       # Button, Card, Input... built from tokens
│   │   ├── pages/docs/          # the /docs page (Part E)
│   │   └── lib/                 # API client, hooks, utils
│   └── vite.config.ts
├── mobile/
│   ├── app/                     # Expo Router screens: (mail), (calendar),
│   │                            # (contacts), (search), (settings)
│   ├── src/features/
│   ├── src/components/ui/
│   └── app.config.ts
├── backend/
│   ├── src/
│   │   ├── modules/             # routes + service + repo per module:
│   │   │                        # auth, tenants, domains, dns, users, groups,
│   │   │                        # aliases, mailboxes, mail, calendar, contacts,
│   │   │                        # tasks, ai, plans, billing, compliance,
│   │   │                        # migration, reports, audit, devices, operator
│   │   ├── middleware/          # auth, tenant scope, plan gate, rate-limit,
│   │   │                        # error handler, request ID
│   │   ├── errors/              # AppError + error code registry
│   │   ├── integrations/        # stalwart (JMAP + management), razorpay,
│   │   │                        # stripe, dns providers, ai gateway
│   │   └── db/                  # migrations, seeds (seeds for dev only)
│   └── openapi.yaml
├── packages/shared/
│   ├── types/
│   ├── errors/codes.ts          # playbook codes + Part F codes
│   ├── plans/entitlements.ts    # the plan matrix in Part H.2, one source of truth
│   └── tokens/                  # playbook design tokens
├── infra/                       # [Addition: needs approval]
│   ├── stalwart/                # config, per-environment
│   ├── filters/                 # Rspamd, ClamAV
│   ├── outbound/                # sending tier, IP pools
│   ├── compose/                 # local stack: Postgres, MinIO, Stalwart
│   └── iac/                     # infrastructure as code
├── docs/                        # user guide + developer guide (Markdown)
├── PROJECT_BRIEF.md
├── CHANGELOG.md
└── README.md                    # how to run everything locally
```

Naming follows the playbook: kebab-case files and folders, PascalCase.tsx components, useThing.ts hooks, one feature per folder, `feature/`, `fix/` and `docs/` branches, and one reviewer per pull request.

---

# Part D. Engineering standards

Everything in playbook section 4 applies unchanged: TypeScript strict, React 18+ with Vite, React Router, TanStack Query and Zod on web; Expo, Expo Router, TanStack Query and Zod on mobile; Node.js LTS, Fastify, PostgreSQL and Drizzle (or Prisma) on the backend; REST under `/api/v1/...` documented in `openapi.yaml`; ESLint, Prettier, a pre-commit hook and CI on every pull request; unit, API and E2E tests; structured JSON logs with request IDs; Sentry; Lighthouse 90+; mobile cold start under 2 s; WCAG 2.2 AA.

What this product adds:

| Area | Standard for Rokesh Mail |
|---|---|
| Auth (our apps) | The playbook's JWT access (15 min) and refresh (30 days), in an httpOnly cookie on web and SecureStore on mobile. Refresh tokens rotate on every use, and reuse of an old one signs out that device family. |
| Auth (mail apps) | Third-party mail apps never get the account password checked by Stalwart. Users create per-device **app passwords** (or sign in by OAuth where the app supports it). Confirm in a test how Stalwart verifies them, and keep the account password only in the backend. |
| Tenant scope | A `tenantScope` middleware puts the tenant ID from the session on every request. Repos refuse to run a query without it, and PostgreSQL row-level security is the second wall. |
| Plan gates | A `planGate('feature')` middleware reads `packages/shared/plans/entitlements.ts`. The web hides what the plan lacks, but the API decides. |
| Mail facade | The backend's `mail` module wraps JMAP. Clients never see Stalwart IDs, hosts or errors. Stalwart errors map to Part F codes. |
| Push | New mail reaches web by SSE or WebSocket and mobile by Expo push, both sent by the backend. Push payloads carry IDs only, never message content. |
| Logging | Never log message bodies, subjects or attachment names. Addresses are logged only where an audit needs them. Logs are kept 180 days in India (CERT-In). Sentry scrubs mail content and addresses before sending. |
| Jobs | Long work (migration, exports, DNS rechecks, AI) runs as pg-boss jobs, idempotent, with progress the UI can show. |
| Limits | Every list endpoint is paginated. Attachments, exports, searches and jobs have per-plan size and concurrency caps. |

## D.1 Passwords: bcrypt + salt + pepper (from the playbook)

Version 1 of this prompt said Argon2id. That is replaced: use the playbook's scheme exactly.

- Sign-up: normalize with NFKC, check length 8 to 128, pepper with HMAC-SHA256 using `PASSWORD_PEPPER` (32+ random bytes, from the secret manager), then `bcrypt.hash(peppered, 12)`. Store only the `$2b$12$…` string in `users.password_hash`, plus `pepper_version`.
- Also check new passwords against a known-breached-passwords list before accepting them.
- Login: re-pepper, then `bcrypt.compare`. A wrong email and a wrong password both return `API-AUTH-001`. Login is rate-limited (`API-RATE-429`) per account and per IP, across web, mobile and mail protocols.

```ts
// backend/src/modules/auth/password.ts
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';

const PEPPER = process.env.PASSWORD_PEPPER!; // 32+ random bytes, from secret manager
const COST = 12;

const pepper = (password: string) =>
  crypto.createHmac('sha256', PEPPER).update(password.normalize('NFKC')).digest('base64');

export const hashPassword = (password: string) =>
  bcrypt.hash(pepper(password), COST); // bcrypt adds a unique random salt

export const verifyPassword = (password: string, hash: string) =>
  bcrypt.compare(pepper(password), hash);

export const needsRehash = (hash: string) => bcrypt.getRounds(hash) < COST;
```

- Never log, email or return a password or hash, even in error `details`.
- Pepper rotation: add v2, keep v1 until each user signs in again, then rehash with v2. Raise `COST` over time, and `needsRehash` upgrades users at next sign-in.
- **What gets hashed and what gets encrypted in this product:**
  - Hashed like passwords (never readable again): account passwords, app passwords, backup codes, and API keys that **we issue** to customers (shown once, then only a hash is kept).
  - Encrypted with AES-256-GCM, with a key separate from the pepper (playbook rule for data that must be read back): DKIM private keys, DNS-provider and registrar tokens a customer grants us, migration-source credentials (deleted when the migration ends), phone numbers and ID documents.

---

# Part E. Docs page (/docs and the in-app Help screen)

Same Markdown in `/docs` renders the public `/docs` page and the Help screen in web and mobile, as playbook section 5 requires. Every how-to page shows "Last updated: [date] · v[x.y.z]", screenshots are retaken when screens change, and the pull-request template has the "Docs updated / not needed because …" checkbox.

The seven required sections, filled in for this product:

1. **Getting started:** pick a plan, add your domain, add the DNS records, create your first user, send your first email.
2. **What you can do:** one line per feature in Part A, each linking to its guide, with the plan it needs.
3. **How-to guides** (web and phone screenshots, plus limits per plan):
   - Add and verify a domain; every DNS record explained (MX, SPF, DKIM, DMARC, MTA-STS, TLS-RPT, autodiscover); fixing a failed check.
   - Set up Outlook, Apple Mail, Thunderbird, Android and iPhone mail apps; create an app password.
   - Mail: rules, templates, scheduled send, undo send, aliases, masked addresses, signatures, out-of-office, forwarding.
   - Calendar sharing, room booking, booking page. Contacts and directory.
   - Migrate from Gmail/Google Workspace, Microsoft 365, Zoho and IMAP.
   - Admin: users, groups, shared mailboxes, policies, 2FA enforcement, SSO, retention, legal hold, eDiscovery export.
   - Billing: change plan, add seats, download GST invoices, update payment method.
4. **Roles & permissions:** what end users, each tenant role (owner, billing admin, user admin, helpdesk, compliance officer, auditor) and MR ROKESH operators can see and do. Operators can't read customer mail without a recorded reason and the customer's consent flag.
5. **Error codes:** the playbook tables plus Part F, with what to do. Also a page of **common bounce messages** (for example `550 5.1.1` unknown recipient, `552 5.2.2` mailbox full, `554 5.7.1` rejected as spam) in plain words, since users see those in bounce emails.
6. **FAQ & contact:** top questions (Why does my mail go to spam? Can I keep my old mail? Where is my data stored?), support channels per plan, and `abuse@` and `postmaster@` contacts.
7. **What's new:** generated from `CHANGELOG.md`, newest first.

---

# Part F. Error codes for this product

Copy all the playbook's section 6 tables (API, WEB, AND, IOS) into `packages/shared/errors/codes.ts` unchanged, then add these rows. Same format `[PLATFORM]-[AREA]-[NUMBER]`; never reuse a retired code. Messages follow the playbook voice: say what happened and what to do, never blame the user.

**Shared API errors added for email (all platforms)**

| Code | HTTP | Meaning | Message shown to user | Fix / action |
|---|---|---|---|---|
| API-AUTH-004 | 401 | Second factor or fresh sign-in needed | Confirm it's you to continue. | Show 2FA or passkey prompt, then retry |
| API-AUTH-005 | 403 | Account suspended by an admin | Your account is paused. Contact your admin. | Show admin contact |
| API-PLAN-001 | 403 | Feature not in the current plan | This needs the [plan] plan. | Upgrade button (owners and billing admins only) |
| API-PLAN-002 | 403 | No free seats | All your seats are in use. | Add a seat or free one |
| API-PLAN-003 | 403 | Plan limit reached (domains, aliases, groups, shared mailboxes) | You've reached your plan's limit for [item]. | Show the limit and the upgrade option |
| API-DOM-001 | 409 | Domain already added to another account | This domain is already in use here. | Verify ownership with the TXT record, or contact support |
| API-DOM-002 | 422 | Domain ownership not verified yet | We can't see your verification record yet. | Show the exact TXT record; recheck button; DNS can take up to 48 h |
| API-DNS-001 | 422 | MX record missing or pointing elsewhere | Your MX record isn't set to us yet. | Show expected value, copy button |
| API-DNS-002 | 422 | SPF missing, not including us, or over 10 lookups | Your SPF record needs a change. | Show the corrected record |
| API-DNS-003 | 422 | DKIM key not found at the selector | We can't find your DKIM key yet. | Show the CNAME/TXT to add |
| API-DNS-004 | 422 | DMARC missing or invalid | Add a DMARC record to protect your domain. | Show a starter `p=none` record with reporting |
| API-MBX-001 | 409 | Address already taken | That address is already used. | Suggest another |
| API-MBX-002 | 507 | Mailbox full | Your mailbox is full. | Delete mail, empty Trash, or add storage |
| API-MAIL-001 | 413 | Message bigger than the plan allows | This email is over [size] MB. | Send as a large-file link (plans that have it) |
| API-MAIL-002 | 429 | Sending limit reached | You've hit your sending limit for now. Try again in [time]. | Show when the limit resets |
| API-MAIL-003 | 403 | Outbound paused for unusual sending | We paused sending to protect your account. | Reset password, check devices, contact admin |
| API-MAIL-004 | 422 | Invalid recipient address | Check this address: [address]. | Highlight the field |
| API-MAIL-005 | 403 | Trial can't send outside the domain until it's verified | Verify your domain to email people outside it. | Link to the DNS wizard |
| API-BILL-001 | 402 | Payment failed | Your payment didn't go through. | Retry or change payment method |
| API-BILL-002 | 403 | Account read-only for an unpaid invoice | Your account is read-only until the invoice is paid. | Pay invoice link (owners and billing admins) |
| API-MIG-001 | 422 | Can't sign in to the old mail host | We couldn't connect to your old mailbox. | Check the app password or admin consent for that host |
| API-MIG-002 | 503 | Old host is slowing us down | Your old provider is limiting us. We'll keep going. | Automatic retry with backoff; nothing for the user |
| API-AI-001 | 429 | AI actions for the month used up | You've used this month's AI actions. | Show reset date; add-on pack |
| API-AI-002 | 403 | AI turned off by the admin | Your admin has turned AI off. | None |
| API-COMP-001 | 409 | Item on legal hold | This item is kept for legal reasons and can't be deleted. | None for users; compliance officers see the hold |
| API-DLP-001 | 422 | Blocked by a data-protection rule | Your organization's policy blocked this email. | Show the rule name, not the matched data |

**Website errors added (WEB)**

| Code | Meaning | Message shown to user | Fix / action |
|---|---|---|---|
| WEB-DRF-001 | Draft saved only on this device (offline) | Saved on this device. We'll sync when you're back online. | Auto-sync on reconnect |
| WEB-IMG-001 | Remote images blocked in a message | Images are hidden to protect your privacy. | "Show images" and "Always for this sender" |
| WEB-POP-001 | Pop-up blocked during SSO sign-in | Allow pop-ups to sign in with your company account. | Link to help page |

**Android and iPhone errors added (AND, IOS)**

| Code | Meaning | Message shown to user | Fix / action |
|---|---|---|---|
| AND-SYNC-001 | Battery optimisation stops background sync | Mail may arrive late while battery saver limits this app. | Open battery settings |
| AND-FILE-001 | Can't open an attachment type | No app on this phone opens this file. | Offer download or share |
| IOS-SYNC-001 | Background App Refresh is off | Turn on Background App Refresh to get mail faster. | Open Settings |
| IOS-FILE-001 | Can't preview an attachment type | This file can't be previewed. | Offer Files app or share |

Mail protocols (SMTP, IMAP) keep their standard reply codes (RFC 3463 enhanced codes); the docs page explains the common ones.

---

# Part G. Design system

**The playbook's design system wins everywhere.** Electric Indigo `#5B5BF7` (dark `#7B7BFF`), Satoshi for headings and Inter for body, Lucide icons at 1.5 px stroke and 24 px, the token tables for type, colour, spacing, radius, shadow and motion, light and dark mode on every screen, and brand colour on no more than 10% of a screen. Version 1's navy, sky blue and orange are dropped for this product.

The tools from your original message become **checkers and references**, not sources of colour or type:

- **Impeccable** (`npx impeccable install`, then `/impeccable init`): write its `PRODUCT.md` from Part A and its `DESIGN.md` from playbook section 7, then run `/impeccable audit` and `polish` on each screen. Its detector catches AI defaults like nested cards, eyebrow chips and icon-tile stacks.
- **taste-skill** and **Hallmark**: use them for the marketing and pricing pages and their own checks (taste-skill's gate, Hallmark's `sloplint`), but give them the playbook tokens and override any font or colour they pick. Keep their good floors: real product screenshots, no invented metrics or testimonials, the headline, one sentence and the primary action visible at 1280 × 800.
- **getdesign.md**: use its DESIGN.md files only to study layout density in calm productivity apps. Take no colours or fonts from them.
- **Aura** (aura.build): quick mock-ups to compare layouts, never shipped code.

How the playbook rules apply to a dense mail app:

| Playbook rule | In Rokesh Mail |
|---|---|
| One hero, one primary button per screen | Compose is the primary button in mail; New event in calendar; Add user in admin |
| Max three type sizes per screen | Mail list and reading pane use body, caption and h3 only |
| Nav bar: max 5 links, one CTA | Marketing site: Product, Pricing, Docs, Sign in, plus Start free trial |
| Mobile tab bar: max 5 tabs | Mail, Calendar, Contacts, Search, Settings |
| Inputs: label above, error below with code | Every admin and DNS form shows the Part F code under the field |
| Skeletons, not spinners, over 300 ms | Message list, thread and DNS checks load as skeletons |
| Empty states: illustration + one sentence + one action | Empty inbox, no search results, no users yet |
| Calm motion 200 to 400 ms, respect Reduce motion | Swipe actions, sheet open and thread open |
| Glass nav with blur(20px) | Marketing nav and webmail top bar |

Layout: three panes on desktop (folders, message list, reading pane) with a collapsible sidebar; single pane with swipe actions on phones; command palette (Ctrl or ⌘ K); everything usable from the keyboard. Voice follows the playbook: headlines under 6 words, buttons are verbs ("Add domain", "Send"), errors say what happened and what to do.

Your current transactional email templates use the old navy and orange. Ask the owner before changing those; this prompt only covers the Rokesh Mail product.

---

# Part H. Product spec

## H.1 Surfaces

| Surface | Who uses it | What it does |
|---|---|---|
| Marketing, pricing, compare, sign-up, checkout (mrrokesh.com) | Prospects | Plans, comparison table, free trial, checkout |
| Customer portal | Tenant owner, billing admin | Plan, seats, GST invoices, payment methods, upgrade and downgrade |
| Admin console | Tenant admins | Domains, DNS wizard, users, groups, aliases, shared mailboxes, policies, security, compliance, migration, reports |
| Webmail | End users | Mail, calendar, contacts, tasks, settings, AI assistant |
| Mobile app (Expo) | End users | Mail, calendar, contacts, search, settings, push |
| Third-party mail apps | End users | IMAP, SMTP, CalDAV, CardDAV, ActiveSync, with autoconfig |
| Operator console | MR ROKESH staff | Tenants, abuse queue, IP reputation, deliverability, incidents, audited impersonation |
| Reseller panel (phase 4) | Web hosts, agencies | White-label sub-tenants, wholesale prices |

## H.2 Subscription plans (suggested; you set the final prices)

Positioning: cheaper than Microsoft and Google, near Zoho, honest about renewal prices (Hostinger's ₹29 promo renews at ₹69, Part I), with Titan- and Hostinger-style productivity features and Microsoft-style admin and security. Prices are per user per month, billed yearly, GST extra; monthly billing costs about 25% more. **Show the renewal price next to any launch offer.**

This matrix becomes `packages/shared/plans/entitlements.ts`, the single source of truth for both the pricing page and the server's plan gates.

| Entitlement | **Mail Lite** ₹49 | **Business** ₹99 | **Business Pro** ₹199 | **Enterprise** ₹399 |
|---|---|---|---|---|
| Mailbox storage | 5 GB | 30 GB | 50 GB + 50 GB archive | 100 GB + 1 TB archive |
| File storage (attachments and large-file links) | none | 10 GB | 30 GB | 100 GB |
| Max message size | 25 MB | 35 MB | 50 MB | 150 MB |
| Large-file links | none | 250 MB | 1 GB | 2 GB |
| Custom domains per tenant | 1 | 3 | 10 | unlimited |
| Aliases per user | 5 | 15 | 30 | 50 |
| Masked addresses (one per website, like Fastmail's) | none | 20 | unlimited | unlimited |
| Groups and distribution lists | 5 | 25 | unlimited | unlimited |
| Shared mailboxes | none | 2 | 10 | unlimited |
| Catch-all and plus-addressing | plus-addressing | both | both | both |
| Webmail, mobile app, IMAP, POP3, SMTP | yes | yes | yes | yes |
| Calendar and contacts (CalDAV, CardDAV) | personal | shared, room booking | yes | yes |
| ActiveSync (phones, Outlook) | no | yes | yes | yes |
| Spam, phishing and virus filtering | standard | standard | advanced (attachment sandbox, link rewriting) | advanced |
| 2FA (TOTP, passkeys) | yes | yes | admin can enforce | enforce per group |
| SSO (SAML 2.0, OIDC) and SCIM | no | no | SSO | SSO + SCIM |
| Templates, undo send, scheduled send, snooze, follow-up reminders | basic | yes | yes | yes |
| Read receipts and link/file tracking | no | 25 a month | unlimited | unlimited |
| Booking page | no | no | yes | yes |
| AI assistant (summaries, smart reply, rewrite) | no | 50 actions a month | 500 a month | unlimited, fair use |
| Retention policies and legal hold | no | no | yes | yes |
| eDiscovery search and export | no | no | basic | full, with cases |
| Data loss prevention rules | no | no | no | yes |
| Journaling to an external archive | no | no | no | yes |
| S/MIME and PGP | PGP | PGP | S/MIME + PGP | S/MIME + PGP + managed keys |
| Audit log retention | 7 days | 30 days | 180 days | 1 year + export to SIEM |
| Migration tools | self-service IMAP | all tools | all + assisted | assisted, priority |
| Dedicated sending IP | no | no | add-on | add-on; one included over 100 seats |
| Support | email | email + chat | priority chat | phone + named contact, 99.9% SLA |

- **Free trial:** 14 days (as Rackspace and most others offer), up to 5 users, Business entitlements, 100 outbound messages a day, and mail to outside recipients blocked until the domain verifies (`API-MAIL-005`).
- **Add-ons:** storage packs (10 GB, 50 GB), archive packs (Rackspace sells archiving as a per-mailbox add-on), dedicated IP, extra AI actions, domain registration, migration done by our team.
- **No bulk campaigns** on the mailbox platform. Titan's and Neo's campaign modes would put the shared IPs at risk. If you add a campaigns product later, it gets its own sending pool, double opt-in, unsubscribe headers and its own reputation.

## H.3 Features, module by module

Every feature checks its plan gate from H.2 on the server.

**Mail**
- Threads, focused/priority inbox, labels and folders, stars, pins, snooze, archive, mute.
- Compose in rich or plain text, signatures per alias (signature designer on Pro and up), templates, undo send (5 to 30 s), scheduled send, send-as and send-on-behalf, large-file links, inline images, drafts synced across devices.
- Masked addresses: one click creates a random address for a website, which forwards to the inbox and can be paused or deleted.
- Read receipts and link/file tracking, opt-in and visible only to the sender, respecting the recipient's image blocking.
- Follow-up reminders ("tell me if no reply in 3 days").
- Rules built visually (Sieve underneath), out-of-office with dates and internal/external messages, forwarding (the admin can block external forwarding).
- Search: full text, attachment text, operators (`from:`, `to:`, `has:attachment`, `before:`, `after:`, `larger:`), saved searches.
- Safety in the interface: phishing banner, external-sender tag, "failed DMARC" warning, link preview, remote images blocked by default.
- Spam quarantine: user digest, admin release, "report spam / not spam" training the filter.
- Several accounts and shared mailboxes in one sidebar; delegation (read, send-as, send-on-behalf, calendar edit).
- Keyboard shortcuts, offline cache, dark mode, WCAG 2.2 AA, Tamil and English from day one.
- PGP (OpenPGP.js) on all plans; S/MIME on Pro and up.

**Calendar:** day, week, month and agenda views; several calendars and time zones; recurring events (RFC 5545); invites and replies (iMIP); free/busy; shared calendars with permissions; room and equipment booking; email and push reminders; booking page on Pro and up (slots, buffers, questions, confirmation, a self-hosted Jitsi or a Google Meet or Zoom link; no own video product in v1).

**Contacts and directory:** personal contacts, shared address books, company directory from the admin console, groups, vCard import/export, CardDAV, autocomplete from recent recipients.

**Tasks (phase 3):** tasks with due dates, "turn this email into a task", CalDAV VTODO sync.

**AI assistant (Business and up, metered):** summarise a thread, suggest replies, rewrite tone, translate (Tamil, Hindi, English), pull dates and to-dos into calendar and tasks, search in plain language. Runs through our own AI gateway with per-tenant metering. Admins can turn it off for the whole tenant (Hostinger lets customers disable all AI too).

**Admin console**
- **DNS wizard:** add domain → verify by TXT → show every record with copy buttons → check each record live → activate. Records: MX, SPF, DKIM (2048-bit, rotated), DMARC (start at `p=none` with reports, then guide to `quarantine` and `reject`), MTA-STS, TLS-RPT, autodiscover/autoconfig, optional BIMI. One-click setup through Cloudflare's or the registrar's API when the customer grants a token.
- Users: create, bulk CSV import, suspend, delete with a grace period and export, reset password, force 2FA, sign out everywhere, seat assignment, storage use.
- Groups (with moderation and outside-sender rules), aliases, shared and resource mailboxes.
- Policies: password and 2FA, session length, allowed protocols per group (for example block POP3), external forwarding, blocked attachment types, mail-flow rules (disclaimer, route, reject), allow and block lists.
- Security: sign-in log with IP and device, risky sign-in alerts, connected devices with remote wipe, app passwords, API keys with scopes.
- Compliance (Pro and up): retention, legal hold, eDiscovery export (EML, MBOX, PST), journaling (Enterprise), DLP for card, Aadhaar, PAN and bank numbers (Enterprise), audit log and export.
- Reports: mail flow, spam caught, top senders, storage, active users, DMARC reports as charts.
- Migration from Google Workspace, Microsoft 365, Zoho or any IMAP host; CSV of mailboxes; resumable and incremental with progress per mailbox; PST and MBOX upload.
- Roles: owner, billing admin, user admin, helpdesk (password resets only), compliance officer, read-only auditor.

**Billing and customer portal:** per-seat plans, monthly or yearly, prorated upgrades, seats added at once, downgrades at renewal. Razorpay (UPI AutoPay, cards, e-mandate) in India and Stripe elsewhere. GST invoices with your GSTIN, the SAC code your CA confirms for hosted email, place-of-supply logic (CGST + SGST in Tamil Nadu, IGST elsewhere), and a reverse-charge note for exports. Dunning: reminders at 3, 7 and 14 days; read-only after 15 (`API-BILL-002`); suspension after 30; deletion after 60, with an export offered at each step. Coupons, trials, reseller pricing. Refund terms stated plainly on the pricing page (BigRock's money-back guarantee excludes email, which customers dislike).

**Mobile and third-party apps:** autoconfig/autodiscover so Outlook, Apple Mail, Thunderbird and phone apps set up with just the address and an app password; a downloadable iOS/macOS profile; the Expo app for Android and iOS with push.

**Operator console:** tenant search, plan override, impersonation only with a reason and the customer's consent flag, all audited; abuse queue (outbound spikes, complaint and bounce rates, blocklist hits) with one-click throttle or outbound suspend; IP pool and reputation dashboard; queue viewer; incident banner and status page.

## H.4 Deliverability (before selling anything)

Your current server on the Jio leased line was on Microsoft's block list in November and had no DKIM key at the default selector. Build so that never happens to customers:

- **Separate inbound and outbound.** Inbound MX can stay on your servers. Outbound goes through a dedicated tier on clean, static cloud IPs whose reverse DNS matches the HELO name, until the leased-line IPs have a clean history.
- **IP pools:** shared pool for paying tenants, quarantine pool for trials and new tenants, dedicated IPs as an add-on. A tenant joins the main pool only after a clean warm-up.
- **Warm-up:** ramp each new IP over 4 to 6 weeks with real, wanted mail.
- **Authentication:** DKIM for every customer domain (own selector, 2048-bit, rotated), an SPF include domain, DMARC alignment, ARC for forwarded mail, MTA-STS and TLS-RPT for our own domains.
- **Rate limits** per user and tenant (minute, hour, day), recipients per message, stricter during trials (`API-MAIL-002`).
- **Monitoring:** Microsoft SNDS and JMRP, Google Postmaster Tools, Yahoo feedback loop, hourly blocklist checks (Spamhaus, Barracuda and others), DMARC and TLS-RPT parsing, bounce classification, automatic suppression of hard bounces.
- **Outbound scanning** for spam and malware, and compromised-account detection (sudden volume, new-country sign-in, many identical messages) with an automatic hold (`API-MAIL-003`) and an admin alert.
- Runbooks: delisting requests to Microsoft, Google and Spamhaus; rotating a burned IP.

## H.5 Security (from the Cloudflare security-audit skill)

Use the Cloudflare `security-audit` skill (github.com/cloudflare/security-audit-skill, MIT) in guidance mode while building each module and in full audit mode before every phase ships. Run its target-controlled checks only in a sandbox, as the skill requires, never against production. Each item below needs code and a test that proves it.

**H.5.1 Tenant and object isolation**
- Every read, update, delete, list, count, export and bulk query is bound to the tenant and owner from the session, never from the request body.
- Cache keys, blob paths, search IDs, temp files and dedup keys include the tenant ID.
- PostgreSQL row-level security as a second wall; no unscoped service client in request paths.
- Shared links and signed URLs bind the operation, exact object, audience and expiry, and stop working when access changes.
- Search results, previews, thumbnails and caches are filtered at read time and purged on delete or loss of access.

**H.5.2 Authentication and sessions**
- Passwords per Part D.1 (bcrypt cost 12 + salt + pepper), with a breached-password check.
- TOTP and passkeys (WebAuthn: challenge, RP ID, origin and user handle bound to the session; user verification by policy).
- New session on sign-in, 2FA completion, account switch and impersonation. Password change, disable and admin sign-out kill refresh tokens, app passwords and ActiveSync partnerships.
- Adding, replacing or removing a second factor needs a fresh sign-in (`API-AUTH-004`). Recovery (reset links, backup codes, admin reset) is rate-limited, one-time, bound to the user and action, and cancels older tokens. Reset links use a fixed configured host, never the request's Host header.
- SSO: verify SAML signatures on the element actually used, safe XML parsing, audience, recipient and replay checks; OIDC with state, nonce and PKCE; JWTs with a server-pinned algorithm and key, checking `exp`, `nbf`, `aud` and `iss`.
- Linking an identity provider, passkey, recovery phone or new domain needs a current session, proof of ownership and step-up.
- API keys we issue are scoped per tenant and permission, hashed, shown once, revocable, and never in URLs or logs.

**H.5.3 Web and browser**
- CSRF protection on every cookie-authenticated change; cookies `Secure`, `HttpOnly`, `SameSite=Lax` or `Strict`, narrow `Domain` and `Path`.
- Email HTML in a sandboxed iframe on a separate origin, allow-list sanitizer, strict CSP, no scripts or posting forms, remote images proxied and blocked by default.
- No DOM XSS, no `postMessage` without origin checks, no credentialed CORS to any origin, `frame-ancestors` against clickjacking, safe service-worker scope, no private data left in browser storage after sign-out.
- Host and forwarded headers trusted only from our own load balancer.

**H.5.4 Mail protocols and parsing**
- Every incoming message is hostile: limits on MIME depth, part count, header size and decompressed size, parse time limits, no slow regexes on message content.
- SMTP: no open relay; authenticated submission only on 587 and 465 with TLS; per-IP connection and auth-failure limits; reject bare LF and pipelining tricks used for SMTP smuggling.
- IMAP, POP3, JMAP, CalDAV, CardDAV and ActiveSync apply the same tenant and permission checks as the API on every path, including batch and streaming; brute-force limits count across all protocols for one account.
- Webhooks and queue messages: verify the sender, process idempotently, reject stale or replayed events.

**H.5.5 Availability and abuse:** per-tenant limits on attachment size, quota, search cost, export size and concurrent jobs; little work before authentication; capped retries with backoff; poison messages set aside instead of blocking a queue.

**H.5.6 AI features:** email content is untrusted input to the model and can never trigger a send, rule change, forward or delete without the user's click. The model sees only the current user's data. Output is shown as text, not HTML. No mail of a tenant that turned AI off is ever sent to the model.

**H.5.7 Data protection, backups and deletion:** TLS 1.2+ everywhere; encryption at rest for databases, blobs and backups with separate keys; daily backups with tested restores that re-apply current permissions and deletions; complete deletion (store, index, caches, backups at expiry, queued jobs); exports contain only what the requester may see, and the download is authorized.

**H.5.8 Cloud, deployment and supply chain:** secrets in a vault, never in images or repos; least-privilege service identities; Stalwart admin, database and queues never exposed to the internet; lockfile, integrity checks and dependency scanning in CI; signed release images; untrusted pull-request code kept out of privileged CI jobs.

**H.5.9 India legal and compliance:** Digital Personal Data Protection Act 2023 (privacy notice, consent for optional processing, access, correction and erasure, breach notice, grievance officer); CERT-In (report qualifying incidents within 6 hours, keep logs 180 days in India); customer data in Indian data centres by default, stated on the pricing page; terms of service, acceptable-use policy, data processing agreement, and `abuse@` and `postmaster@` for every hosted domain.

## H.6 Phases and acceptance tests

**Phase 1: mail that works and lands** (internal pilot on rokeshcloud.com and mrrokesh.com)
- Scaffold per Part A's first task; Stalwart; backend with tenants, domains, users, aliases; DNS wizard; webmail mail features; IMAP/SMTP with app passwords and autoconfig; outbound tier with one warmed IP; spam and virus filters; 2FA; backups; /docs with Getting started and setup guides.
- Tests: send to Gmail, Outlook.com and Yahoo and land in the inbox with SPF, DKIM and DMARC all passing in the headers; receive from all three; mail-tester.com 10/10; a cross-tenant read through every API and protocol returns `API-RES-404`; restore a mailbox from backup.

**Phase 2: sellable product**
- Calendar, contacts, shared mailboxes, groups, plans and gates, billing (Razorpay + GST invoices), trial, migration, reports, customer portal, pricing page, the Expo mobile app.
- Tests: buy a plan end to end with a test payment; upgrade and downgrade change entitlements at once; migrate a 5 GB Gmail mailbox with nothing lost; ActiveSync on Android and iPhone; mobile cold start under 2 s.

**Phase 3: Pro and Enterprise**
- Retention, legal hold, eDiscovery, DLP, journaling, SSO and SCIM, S/MIME, booking page, AI assistant, tracking, masked addresses, tasks, audit export, dedicated IPs.
- Tests: legal hold keeps a message the user deleted; DLP blocks a test card number (`API-DLP-001`); SSO with Microsoft Entra ID and Google as identity providers.

**Phase 4: scale and partners:** reseller panel, more languages, second region, status page, 99.9% SLA tooling.

Before each phase ships: run the security-audit skill in full audit mode (sandboxed), fix every confirmed finding, and attach its report.

---

# Part I. Market reference (what customers will compare us with)

Microsoft 365 is the main feature reference (deepest admin, security and compliance). Titan, Neo and Hostinger are the reference for small-business touches (read receipts, tracking, templates, AI writing). Zoho and Hostinger set the price floor in India. Prices per user or mailbox per month.

| Provider and plan | Price seen | Mailbox | Notable at that tier |
|---|---|---|---|
| Microsoft Exchange Online Plan 1 / Plan 2 | ₹335 / ₹665, yearly, GST extra | 50 GB + 50 GB archive / 100 GB + 1.5 TB | Plan 2 adds DLP |
| Microsoft 365 Basic / Standard / Premium | ₹170 / ₹1,955 / ₹2,660 (₹130 / ₹1,690 / ₹2,395 without Teams), yearly | 50 GB (Premium 100 GB + 1.5 TB archive), 1 TB OneDrive | Standard adds desktop Office; Premium adds Defender, Intune, Purview |
| Google Workspace Starter / Standard / Plus | ₹679 / ₹1,359 / ₹2,129 as resold on Hostinger's India page (Google's own page showed no INR price) | 30 GB / 2 TB / 5 TB pooled | Standard adds eSignature, booking pages, mail merge; Plus adds Vault and eDiscovery |
| Zoho Mail Lite / Workplace Standard / Mail Premium / Workplace Professional | ₹59 to ₹75 / ₹99 / ₹199 / ₹399, yearly | 5 to 10 / 30 / 50 + 50 / 100 + 100 GB | Premium adds retention, eDiscovery, S/MIME |
| **Fastmail** Basic / Standard / Professional (business) | US$4 / $6 / $10 monthly; $3 / $5 / $9 yearly; less on 2- and 3-year terms | 6 / 60 / 150 GB (mail + files) | Basic has no custom domain; Professional adds a retention archive for legal compliance. Shared addresses and calendars on all. Masked email, scheduled send and snooze on personal plans. 30-day free trial |
| **Fastmail** Individual / Duo / Family (personal) | US$6 / $10 / $14 monthly; $5 / $8 / $11 yearly | 60 GB each (Family up to 6 people) | Custom domains, masked email, shared family calendars, flat family price |
| **Rackspace Email** Standard + add-ons | US$10 per mailbox, monthly, no contract; Email Plus add-on +$2; Archiving add-on +$6. A reseller's blog says the base price rose from $3 to $10 in March 2026 | 25 GB mail + 30 GB files; archive unlimited | Email Plus adds ActiveSync, shared calendars and contacts; 100% uptime SLA; 14-day trial; 24/7 support |
| **Hostinger Business Email** Starter / Standard / Premium (India) | ₹29 / ₹49 / ₹79 launch offer on a 48-month term, renewing at ₹69 / ₹119 / ₹179; GST extra | 5 / 20 / 50 GB | Aliases 5 / 10 / 30; AI search, reply, summary and writing from Standard; open tracking from Standard; link and file tracking plus a free domain on Premium; catch-all, audit logs and migration on all; AI can be turned off |
| **BigRock** Business Email / Enterprise Email / Google Workspace | not shown on BigRock's page (1-month and 1-year toggle with no amounts) | Enterprise 30 GB; others not stated | Shared calendars, ad-free webmail, any mail app, 24×7 support; resellers get cPanel/WHM; the 30-day money-back guarantee excludes email |
| Titan (as sold by GoDaddy) Starter to Ultra | not shown on the page read | 1 / 10 / 30 / 50 / 100 GB | From Pro Plus: undo send, follow-up reminders, AI summary, read receipts. Ultra: campaigns, signature designer, booking, link and file tracking |
| Neo Starter | about US$1.99, yearly (from a review by a Titan-affiliated writer) | 15 to 100 GB | Free domain, read receipts, priority inbox, campaigns, booking, migration tool |
| Proton Workspace Standard / Premium | US$14.99 / $24.99 (promo $8.99 / $14.99 to 30 Nov 2026), yearly | 1 TB / 3 TB | End-to-end encryption, 20 addresses per user, retention on Premium |

What these four new providers change in our plan:
- **Fastmail:** masked addresses (now in H.2 and H.3), a retention archive only in the top business tier (matches our Pro), and long-term discounts worth copying for 2- and 3-year prepayments.
- **Rackspace:** monthly with no contract, a 14-day trial, file storage bundled with mail (now a row in H.2) and archiving sold per mailbox (our archive packs). Its sudden price rise is a reason to promise customers price stability.
- **Hostinger:** AI writing, open tracking and catch-all at very low prices, and a big gap between launch and renewal prices. We show renewal prices upfront and let admins turn AI off.
- **BigRock:** its page hides prices and excludes email from refunds. We show every price and state refund terms plainly.

Sources read 25 Nov 2026: microsoft.com/en-in Exchange Online and Microsoft 365 pricing pages; workspace.google.com pricing (en-in); zoho.com/mail/pricing; GoDaddy's Titan plan help page; proton.me/business/plans; mailtrap.io's Neo review; fastmail.com/pricing; hostinger.com/in/pricing/email-hosting; bigrock.in/email; and greatmail.com's Rackspace review (Greatmail is a Rackspace reseller and competitor, so check Rackspace's own page, which wouldn't load for us).

---

# Part J. Starting list of screens and endpoints (for the first task)

The agent refines this list and waits for approval, as Part A's first task says.

**Web screens:** Home, Pricing, Compare, Sign up, Checkout, Sign in, 2FA, Forgot password; Mail (list, thread, compose, search, rules, settings); Calendar (views, event, sharing, booking page editor, public booking page); Contacts; Tasks; Admin (overview, domains, DNS wizard, users, user detail, groups, aliases, shared mailboxes, policies, security, devices, compliance, eDiscovery, migration, reports, roles, audit log); Portal (plan, seats, invoices, payment methods); Operator (tenants, abuse queue, IP pools, queues, incidents); /docs.

**Mobile screens:** Sign in, 2FA; Mail tab (list, thread, compose, search); Calendar tab; Contacts tab; Search tab; Settings tab (accounts, signatures, notifications, app passwords, Help from /docs).

**API endpoints (all under /api/v1, all in openapi.yaml):**
- `auth`: sign-up, sign-in, refresh, sign-out, 2FA enrol/verify/remove, passkeys, SSO start/callback, password reset request/confirm, app passwords.
- `tenants`, `domains` (add, verify, DNS status, DKIM rotate), `users`, `groups`, `aliases`, `masked-addresses`, `mailboxes` (shared, resource).
- `mail`: mailboxes/folders, messages (list, get, move, flag, delete), threads, send, drafts, schedule, undo, attachments (upload, download, large-file links), search, rules, out-of-office, quarantine.
- `calendar`, `contacts`, `tasks`, `booking`.
- `ai`: summarise, suggest-reply, rewrite, translate, usage.
- `plans` (public plan matrix), `billing` (subscription, seats, invoices, payment methods, Razorpay and Stripe webhooks).
- `compliance` (retention, holds, eDiscovery cases and exports, DLP rules, journaling), `migration` (jobs, progress), `reports`, `audit`, `devices` (list, wipe).
- `operator` (tenants, abuse, IP pools, impersonation with reason).

---

# Part K. Definition of done

Playbook section 8 applies to every feature: works on Chrome, Safari, Firefox, Android and iOS in light and dark mode; tokens only; error codes in `codes.ts` and the docs; /docs how-to with new screenshots; CHANGELOG entry; `openapi.yaml` updated; CI green with no new lint warnings; accessibility checked (contrast, labels, keyboard on web, screen reader on mobile); one reviewer.

Extra boxes for Rokesh Mail:
- Plan gate tested on the server for every plan in H.2, including a request from a plan that lacks the feature.
- Cross-tenant test: another tenant's user gets `API-RES-404` through the API and every mail protocol the feature touches.
- No message content, subjects or addresses in logs or Sentry events.
- Security-audit skill run in guidance mode on the changed module, findings fixed or listed.
- Anything that sends mail: SPF, DKIM and DMARC checked in the headers of a real test message.

# Part L. Questions to ask the owner before building

1. Approve the marked additions to the playbook architecture: the `/infra` mail layer, third-party mail apps connecting to Stalwart directly, and pg-boss for jobs.
2. Final plan names and prices (H.2 is a suggestion), and whether to add a personal plan for individuals with their own domain, like Fastmail's Individual and Family plans.
3. Stalwart Enterprise license or Community edition first (B.2).
4. Where the outbound sending IPs will live, and whether the Jio leased-line IPs stay inbound-only.
5. Company GSTIN, legal entity name and address for invoices.
6. Which payment gateway accounts exist (Razorpay, Stripe).
7. Which AI provider and model, and the per-tenant budget.
8. The service's own domains (for example mail.rokeshcloud.com, an SPF include domain and the separate origin for email HTML).
9. Whether the transactional email templates should also move from navy and orange to Electric Indigo.
