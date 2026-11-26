# MR Rokesh Mail

Custom-domain business email, productivity suite, and multi-tenant control plane (`web` + `API` + `Expo mobile`). Built on one Fastify control plane (`@mrrokesh/backend`), a React + Vite frontend (`@mrrokesh/frontend`), shared design tokens and error codes (`@mrrokesh/shared`), and an Expo mobile client (`@mrrokesh/mobile`).

Visual tokens are locked in [`DESIGN.md`](DESIGN.md) (`Electric Indigo` `#5B5BF7` light / `#7B7BFF` dark, `Satoshi` headings + `Inter` UI, 4pt spacing scale). Full product specifications live in [`prompts/briefs/PROJECT_BRIEF.md`](prompts/briefs/PROJECT_BRIEF.md). Launch mail domain target: **`rokeshcloud.com`**.

---

## Repository Layout

| Path               | Role                                                                                                                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `frontend/`        | React + Vite SPA covering Marketing, Docs, Auth, Webmail & Suite, Customer Billing, Tenant Admin, Partner Console, and Operator Console                                              |
| `backend/`         | Fastify REST API + JMAP/Stalwart adapter: auth, tenant isolation, DNS onboarding, GST billing, Razorpay Checkout, Webmail workspace APIs, v1/v2 modules, Partner & Operator consoles |
| `mobile/`          | Expo Router React Native app (`Mail`, `Calendar`, `Contacts`, `Drive`, `Chat`, `More`, Auth)                                                                                         |
| `packages/shared/` | Shared plan tiers, canonical error code registry (`API-*`), CSS design tokens, and shared TypeScript types                                                                           |
| `infra/`           | Docker Compose definitions for PostgreSQL 16, Redis 7, Stalwart Mail Server, LiveKit, and Collabora Online                                                                           |
| `docs/`            | User guides, local dev setup ([`docs/local-dev.md`](docs/local-dev.md)), screen/API contract ([`docs/screens-and-apis.md`](docs/screens-and-apis.md)), and error code reference      |
| `prompts/`         | Original multi-AI research notes, product briefs, and architecture blueprints (archive only — not runtime code)                                                                      |

---

## Portals & Implemented Capabilities

- **Public Marketing, Pricing & Docs:** Landing showcase (`/`), INR seat estimator with 18% GST (`/pricing`), security overview (`/security`), customer docs (`/docs/*`), and public scheduling pages (`/book/:slug`).
- **Authentication:** Signup, sign-in, password reset, MFA (TOTP), passkeys, and per-account app passwords (`/login`, `/signup`, `/forgot-password`).
- **3-Pane Webmail & Productivity Suite:** Compose, persistent drafts, saved templates, visual Sieve rule compiler, signatures/OOO preferences, quick reply, bulk move, star/snooze/archive/trash, `.eml` export, sandboxed reader, `/.well-known/mta-sts.txt`, and `/mail/config-v1.1.xml` Autoconfig — plus Calendar, Contacts, Drive (quota & password-protected shares), Tasks/Notes, Chat (`mrrokesh-chat`), Docs, Meet, Booking, AI Studio, Privacy aliases, and Campaigns.
- **Tenant Admin & GST Billing:** Domains & 6-record DNS Wizard (`Ownership`, `MX`, `SPF`, `DKIM`, `DMARC`, `MTA-STS`), Users & Roles, Compliance/Audit logs, SSO/SCIM, Enterprise settings (BYOK, SIEM targets, dedicated IP flag, simulations), White-label Login Brand, and Billing with CGST/SGST vs. IGST math & Razorpay Checkout (`/billing`).
- **Reseller / Partner Console (`/admin/partner`):** Partner margin tiers (`20%` / `28%` / `35%`), wholesale INR pricing catalog, managed child-tenant provisioning, audited support handoffs (`act-as-admin`), and HTTPS provisioning webhooks.
- **Platform Operator & Abuse Console (`/operator`):** Strictly gated by `OPERATOR_EMAILS` with cross-tenant directory (`listAllOrgs`), outbound sending pause/resume, tenant suspension, abuse/IP-pool queue triage, and mandatory tenant-visible `operator.inspect` / `operator.moderation` audit entries.
- **Storage Persistence:** Supports both standalone dev mode (`CONTROL_STORE=memory`) and PostgreSQL persistence (`CONTROL_STORE=postgres` via migrations `0001`–`0005`, including `org_workspace_extensions`).

---

## Quick Start

**Prerequisites:** Node.js `>= 22`, pnpm `10.18.3`, and PostgreSQL 16 (or `CONTROL_STORE=memory` for zero-dependency dev).

```bash
pnpm install
cp .env.example .env   # replace every CHANGE_ME secret and configure DB/keys
```

### Option A: Using PostgreSQL (`CONTROL_STORE=postgres`)

```bash
# Either start local infra via Docker Compose:
docker compose --env-file .env -f infra/docker-compose.yml up -d

# Or set DATABASE_URL & APP_DATABASE_URL in .env to an existing managed Postgres instance,
# apply migrations 0001..0005, then boot API + Web:
pnpm --filter @mrrokesh/backend db:migrate
pnpm dev:api           # defaults to http://127.0.0.1:4000 (configurable via API_PORT)
pnpm dev:web           # http://127.0.0.1:5173 (proxies /api to API_PORT from .env)
```

### Option B: Zero-Dependency In-Memory Dev (`CONTROL_STORE=memory`)

Set `CONTROL_STORE=memory`, `MAIL_PLANE=mock`, and blank `REDIS_URL=` in `.env`, then run `pnpm dev:api` and `pnpm dev:web`. Visit `/signup` to create a tenant workspace (add your signup email to `OPERATOR_EMAILS` in `.env` to access `/operator`).

---

## Scripts

```bash
pnpm typecheck      # Type-check all workspaces (shared, backend, frontend, mobile)
pnpm lint           # ESLint across repository
pnpm build          # Production builds across workspaces
pnpm test           # Shared (7) + Backend integration test suites (35)
pnpm format:check   # Prettier formatting check
pnpm dev:api        # Start Fastify control-plane API (tsx watch)
pnpm dev:web        # Start Vite dev server
```

---

## Pending / External Infrastructure

| Area                                  | Status / Next Step                                                                                                                                                                                                                                                                             |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mail Transport & DNS**              | Boot Stalwart Community (`MAIL_PLANE=http` + `STALWART_ADMIN_TOKEN` = admin password, see [`docs/local-dev.md`](docs/local-dev.md)), run a first live send/receive test of the adapter, configure public SMTP / smarthost relay, and verify live DNS (`MX`, `SPF`, `DKIM`, `DMARC`, `MTA-STS`) |
| **Collaboration & Cache**             | Connect Redis (`REDIS_URL`), LiveKit SFU (`LIVEKIT_URL`), and Collabora Online (`COLLABORA_URL`) containers via `infra/`                                                                                                                                                                       |
| **Razorpay Webhooks & Notifications** | Set `RAZORPAY_WEBHOOK_SECRET` for automatic subscription activation on payment, PDF GST invoice generation, and transactional email delivery                                                                                                                                                   |
| **Background Workers & AI**           | Wire live LLM key for AI Studio, OAuth IMAP/Google/M365 migration workers, SIEM/Partner webhook async dispatchers, client-side OpenPGP, and dunning cron jobs                                                                                                                                  |
| **Sync Protocols & Localization**     | Live CalDAV / CardDAV / iMIP calendar & contact sync, ActiveSync/EWS sync daemon wiring, desktop sync clients, and Hindi UI localization (`i18n`)                                                                                                                                              |
| **Expo Mobile (`mobile/`)**           | Mail workspace parity implemented (Inbox/Sent/Drafts/Snoozed/Archive/Trash, filter pills, snooze, star/pin/mute, labels, internal notes, reply/forward, drafts); still pending emulator visual verification, Sieve/settings sync, and FCM/APNs push notifications                              |

---

## Licence & Security Rules

- Never copy AGPL source into this repository; Stalwart runs unmodified as a separate container service.
- Never commit `.env` or live credentials — `.env` is gitignored and only `.env.example` belongs in Git.
- Every bugfix or feature PR updates [`docs/screens-and-apis.md`](docs/screens-and-apis.md) / [`docs/`](docs/) and [`CHANGELOG.md`](CHANGELOG.md).
