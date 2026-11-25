# Changelog

All notable changes to MR Rokesh Mail are recorded here. The docs page "What's new" follows this file, newest first.

## [Unreleased]

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
