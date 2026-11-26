# Changelog

All notable changes to MR Rokesh Mail are recorded here. The docs page "What's new" follows this file, newest first.

## [Unreleased]

### Added

- FAANG-grade UI/UX overhaul across Marketing (`/`, `/pricing`, `/security`), Auth, 3-pane Webmail (bulk actions, star/snooze/archive/trash, quick reply, templates, visual Sieve rules, preferences, EML export), Calendar event pills, Contacts directory, Drive quota & share modal, Tasks/Notes, Booking links, Admin Domains & DNS Wizard, Users & Roles, Billing & GST console, Compliance, SSO/SCIM, Enterprise, White-label Brand, Privacy, Chat, Meet, Docs, and `Ctrl/Cmd+K` Command Palette using `DESIGN.md` tokens.
- Reseller & Partner Console (`/admin/partner`, `/api/v1/partner/*`) with partner margin tiers (`20%` / `28%` / `35%`), wholesale INR pricing catalog, managed customer tenant provisioning, audited "act as admin" sessions, and REST provisioning webhooks.
- Platform Operator & Abuse Console (`/operator`, `/api/v1/operator/*`) gated by `OPERATOR_EMAILS` with tenant oversight, sending holds/suspensions, abuse/IP-pool queue triage, and immutable tenant-visible operator access audit logs.
- Backend endpoints for message state (`PATCH /api/v1/mail/messages/:id`, `POST /api/v1/mail/messages/bulk`, `GET /api/v1/mail/messages/:id/eml`), drafts, templates, visual Sieve rules, user mail preferences, `POST /api/v1/users/:id/activate`, `GET /api/v1/admin/overview`, `/.well-known/mta-sts.txt`, and `/mail/config-v1.1.xml`.

### Fixed

- Removed automatic domain hijacking on signup so Free and Business trial tenants retain their domain quota and all 32+ backend tests pass cleanly.
- Local Compose services for LiveKit (`127.0.0.1:7880`) and Collabora (`127.0.0.1:9980`).
- Stalwart JMAP provisioning from the API, with a local message mirror while the engine is in setup.
- Redis fixed-window rate limits when `REDIS_URL` is set.
- Drive file bytes on disk, and a content download route.
- Postgres tables for documents, meetings, calendar events, contacts, AI usage, compliance, SSO, and SCIM.
- Booking reservations queue a confirmation through the mail plane.
- Mobile Calendar and Contacts lists against the API.

## [0.4.0] - 2026-11-26

### Added

- Chat for direct messages, groups, channels, and threads on an in-house service (`mrrokesh-chat`), with web and mobile entry from More. Business and above.
- Privacy add-on stubs: masked aliases, a dashboard that does not invent tracker counts, and client key hooks that do not generate keys or encrypt mail.
- Enterprise hooks for a BYOK key version, a SIEM webhook or syslog destination, an attack-simulation placeholder, and a dedicated IP flag. None of these send data or move mail.
- Partner login brand: host, product name, and https logo. Colour stays on the brand token.
- Campaign drafts as a separate add-on, with an RFC 8058 one-click unsubscribe placeholder. Drafts are not mailbox messages.
- Postgres tables and an adapter for drive metadata, tasks, notes, booking, and the v2 records. `CONTROL_STORE=postgres` loads an organisation on first use and writes it back at the end of the request. The default store remains memory.

## [0.3.0] - 2026-11-26

### Added

- Drive upload metadata, file list, and share-link stubs, plus Drive, Docs, Meet, booking, tasks, notes, and AI screens.
- Docs WOPI check and save stubs, and a LiveKit meeting shell that does not start a media server.
- Public booking pages with slot reservation (`API-CAL-001` when a slot is taken).
- AI writing and summaries with a daily cap (`API-QUOTA-006`) and an admin off switch.
- Business Plus hooks for archive, retention, eDiscovery, legal hold, and journaling.
- Encrypted SAML/OIDC settings and a SCIM 2.0 user skeleton. ActiveSync and EWS stay on Stalwart; the API only records the plan flag.
- Web list shapes for calendar, contacts, domains, users, and `/api/v1/plans`.
- Sign-in accepts `totpCode`, or returns a challenge that `POST /api/v1/auth/mfa/verify` completes.

## [0.2.0] - 2026-11-26

### Added

- Control-plane API for auth, tenants, users, domains, mailboxes, audit, billing stubs, and a JMAP/mail proxy.
- Drizzle schema and `0001_initial_schema.sql` with row-level security. Plan tiers are Free, Starter, Business, Business Plus, and Enterprise.
- Web screens for marketing, sign-in, three-pane mail, calendar, contacts, and admin (domains, DNS wizard, users).
- Expo Router shell with sign-in, sign-up, and a mail tab. Calendar, contacts, and Drive say they are later.
- Plan entitlements, Razorpay and GST stubs, TOTP and passkey hooks, rate limits, and tenant isolation tests.
- `POST /api/v1/auth/sign-in` and `/sign-up` as aliases of `/login` and `/signup`, plus sign-out and password-reset aliases. Mail list and send accept the web and mobile bodies.
- Screen and API inventory in `docs/screens-and-apis.md`.

## [0.1.0] - 2026-11-26

### Added

- pnpm workspace for `frontend`, `backend`, `mobile`, and `packages/shared`, with ESLint, Prettier, a pre-commit format hook, and CI.
- Locked `DESIGN.md` (nine sections) and design tokens in `packages/shared/tokens`.
- Shared error-code registry and the docs page that lists every code.
- Root `PROJECT_BRIEF.md`, `CHANGELOG.md`, pull-request template, and the docs set.
- OpenAPI skeleton and a health check on the API.
- Local Compose file for PostgreSQL 16, Redis 7, and unmodified Stalwart Community, plus `.env.example`.
