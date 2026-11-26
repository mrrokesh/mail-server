# MR Rokesh Mail

Custom-domain business email and productivity suite (web + API + Expo). One Fastify control plane for web and mobile. Visual system is locked in [`DESIGN.md`](DESIGN.md). Feature catalogue is [`PROJECT_BRIEF.md`](PROJECT_BRIEF.md). Launch mail domain target: **rokeshcloud.com**.

## Layout

| Path               | Role                                                                                                       |
| ------------------ | ---------------------------------------------------------------------------------------------------------- |
| `frontend/`        | React + Vite. Marketing, webmail, admin, settings, billing                                                 |
| `backend/`         | Fastify API: auth, tenants, mail proxy, billing, Drive/Docs/Meet, chat, campaigns                          |
| `mobile/`          | Expo Router (Mail, Calendar, Contacts, Drive, More)                                                        |
| `packages/shared/` | Error codes, design tokens, plan tiers, health schema                                                      |
| `infra/`           | Docker Compose: Postgres, Redis, Stalwart, LiveKit, Collabora (`docker-compose.cloud.yml` for public SMTP) |
| `docs/`            | Local run, screens/APIs, what you can do                                                                   |
| `scripts/`         | Helpers (e.g. DNS checklist)                                                                               |
| `prompts/`         | Planning archive — do not treat as runtime                                                                 |

## Quick start

Node.js 22+, pnpm 10.18.3, Docker Compose v2.

```bash
pnpm install
cp .env.example .env   # replace every CHANGE_ME
docker compose --env-file .env -f infra/docker-compose.yml up -d
pnpm --filter @mrrokesh/backend db:migrate
pnpm dev:api           # http://127.0.0.1:4000
pnpm dev:web           # http://127.0.0.1:5173
```

Health: `GET /api/v1/health` (reports `mailPlane` and whether Razorpay keys are loaded).

Local run details: [docs/local-dev.md](docs/local-dev.md). DNS records for outbound/inbound mail: `pnpm dns:checklist`.

### Demo account (local)

After Stalwart/API are up: `demo@mrrokesh.test` / `DemoMail123` (or create a workspace at `/signup`).

## Scripts

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm dev:web
pnpm dev:api
pnpm dns:checklist
```

## What works locally (live API, no sample fallbacks)

- Auth (JWT), MFA setup UI (`/settings`), passkeys (browser), app passwords (paid IMAP)
- Webmail: folders, move/flag, drafts, Cc, attachments, threading, trash destroy
- Calendar / contacts (Postgres), India 2026 gazetted holidays
- Drive bytes, Collabora Docs (WOPI), LiveKit Meet
- Billing: Razorpay Checkout when `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` are set; GST invoices
- Chat, campaigns send via mail plane, privacy aliases, SIEM webhook POST
- Marketing home + pricing; Expo mail/calendar/contacts/drive

Set `CONTROL_STORE=postgres` and `MAIL_PLANE=http` with a real `STALWART_ADMIN_TOKEN` so mail uses Stalwart JMAP. Compose binds Stalwart to loopback (`127.0.0.1:25`, `:8081`). Internet receive needs public binds ([`infra/docker-compose.cloud.yml`](infra/docker-compose.cloud.yml)) plus MX for **rokeshcloud.com**.

## Still pending / external

| Item                        | Notes                                                                          |
| --------------------------- | ------------------------------------------------------------------------------ |
| Public SMTP on Rokesh Cloud | Port 25 + GitHub App access to this repo for deploy                            |
| DNS                         | MX/SPF/DKIM for `rokeshcloud.com` (`pnpm dns:checklist`)                       |
| Razorpay webhook secret     | Auto-activate plans after Checkout                                             |
| CalDAV / CardDAV / iMIP     | Calendar sync and invite mail                                                  |
| Full brief remainder        | Sieve UI, ActiveSync, Hindi UI, migration tools, partner console, desktop sync |

Screens and routes: [docs/screens-and-apis.md](docs/screens-and-apis.md).

## Licence / rules

Do not copy AGPL into this repo. Stalwart Community runs unmodified. Secrets stay in `.env` (gitignored); only `.env.example` is committed.
