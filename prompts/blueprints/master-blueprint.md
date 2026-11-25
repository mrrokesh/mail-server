# MR Rokesh Mail — Master Product, Architecture, Design & Security Blueprint

**Product:** MR Rokesh Mail (`www.mrrokesh.com`)  
**Playbook Compliance:** `mrrokesh-Product-Build-Playbook.pdf` (Electric Indigo `#5B5BF7`, Satoshi + Inter, Lucide Icons, 3-Client / 1-API Monorepo)  
**Target Capability Baseline:** Microsoft 365 Exchange Online + Google Workspace + Zoho Mail + Proton Mail + Fastmail + Neo Mail + Titan Email + Rackspace Email + Hostinger + GoDaddy + BigRock

---

## Table of Contents

1. [Phase 0 — REA & Coding-Agent Skills Setup Plan](#1-phase-0--rea--coding-agent-skills-setup-plan)
2. [Open-Source Mail Engine & System Architecture](#2-open-source-mail-engine--system-architecture)
3. [11-Provider Feature Matrix & INR/USD Subscription Model](#3-11-provider-feature-matrix--inrusd-subscription-model)
4. [Master Kickoff Prompt (`PROJECT_BRIEF.md`)](#4-master-kickoff-prompt-project_briefmd)
5. [Locked Design System (`DESIGN.md` & CSS Tokens)](#5-locked-design-system-designmd--css-tokens)
6. [Cybersecurity, Cryptography & Audit Architecture](#6-cybersecurity-cryptography--audit-architecture)
7. [PostgreSQL Multi-Tenant + Stalwart Schema (`0001_initial_schema.sql`)](#7-postgresql-multi-tenant--stalwart-schema-0001_initial_schemasql)
8. [Standardized Error Code Registry (`packages/shared/errors/codes.ts`)](#8-standardized-error-code-registry-packagessharederrorscodests)
9. [Infrastructure Stack (`infra/docker-compose.yml` & `.env.example`)](#9-infrastructure-stack-infradocker-composeyml--envexample)
10. [Living Documentation (`/docs`) & Definition of Done](#10-living-documentation-docs--definition-of-done)

---

## 1. Phase 0 — REA & Coding-Agent Skills Setup Plan

Run these setup commands **before** writing product code. Present the REA setup plan for explicit user approval before modifying agent config files, then verify every tool.

### 1.1 Install & Verify REA (`morluto/rea`)
Execute from a trusted directory outside the target codebase, review the printed setup plan, approve it, restart your coding agent, and verify CLI/MCP registration:

```bash
# 1. Interactive setup — inspect and approve the printed plan before applying
npx rea-agents@latest setup

# 2. Optional global CLI install for terminal diagnostics
npm install --global rea-agents

# 3. Restart your coding agent, then verify installation
rea --help
```

### 1.2 Install Cybersecurity & Studio-Grade UI Skills
Install the required skills so every code and UI artifact passes adversarial security audits and anti-AI-slop design gates:

```bash
# Cybersecurity 6-Phase Adversarial Audit (Cloudflare)
# Includes DATA-ISOLATION-AND-LIFECYCLE.md for multi-tenant SaaS verification
npx skills add https://github.com/cloudflare/security-audit-skill --skill security-audit --global

# UI Art Direction, Micro-Interactions & Headless Chrome QA (Taste Skill)
npx skills add https://github.com/Leonxlnx/taste-skill --skill "design-taste-frontend"

# Anti-AI-Slop Floor Gates & 8-Width Render Audit (Hallmark)
npx skills add nutlope/hallmark -g
npm install -g puppeteer-core

# Mode-Aware Design Direction: Persuade / Operate / Read (Impeccable)
npx skills add https://github.com/pbakaus/impeccable --skill impeccable --global

# High-Resolution Curated Visual Assets (Aura Build)
npx skills add mengto/skills/aura-asset-images --global
```

### 1.3 Skill Harmonization Rule
All UI skills (`taste-skill`, `hallmark`, `impeccable`) **must read and obey the locked `DESIGN.md` in Section 5**. They enhance layout craft, responsiveness, accessibility, and visual polish without ever overriding `mrrokesh.com`'s Electric Indigo `#5B5BF7` palette, Satoshi + Inter typography, Lucide icons, or 4pt spacing scale.

---

## 2. Open-Source Mail Engine & System Architecture

### 2.1 Recommended Open-Source Foundation
Rather than building SMTP/IMAP/JMAP protocols from scratch, the Node.js/TypeScript backend serves as the **SaaS Control Plane** (auth, billing, subscriptions, RLS, DNS verification, compliance) managing a hardened **Stalwart Mail Server Data Plane**.

| Layer | Open-Source Repository | Role in MR Rokesh Mail |
| :--- | :--- | :--- |
| **Core Mail Engine (Primary)** | `stalwartlabs/stalwart` | Single Rust binary handling JMAP, IMAP4, POP3, SMTP, CalDAV, CardDAV, WebDAV, ManageSieve, built-in antispam, SPF/DKIM/DMARC, ARC, MTA-STS, and DANE. |
| **Alternative Modular Stack** | `mailcow/mailcow-dockerized` or `Mailu/Mailu` | Classic Postfix + Dovecot + Rspamd Docker suite (optional fallback if classic modular mail MTAs are ever required). |
| **JMAP Webmail Reference** | `root-fr/jmap-webmail` | Blueprint for three-pane JMAP webmail, DOMPurify + sandboxed iframe email rendering, EventSource real-time push, visual Sieve builder, and iTIP calendar banners. |
| **React Mail UX Reference** | `c0h1b4/oxi` | Reference for React 19 + TanStack Query + Tiptap rich composer + full-text search + WebSocket sync. |
| **Alias & Privacy Patterns** | `forwardemail/forwardemail.net` | Reference for zero-knowledge mailboxes, unlimited custom-domain masked aliases, catch-all routing, regex filtering, and inbound webhooks. |

### 2.2 Three-Client, One-API Architecture (Playbook Standard)
Web, Android, and iOS **never** talk directly to PostgreSQL or Stalwart admin APIs. Every client communicates exclusively with `/api/v1/...` (and authenticated JMAP/WebSocket proxy routes) in `backend/`.

```text
[Website: frontend/]       (React 18 + Vite + TS)  ──┐
[Android App: mobile/]     (React Native Expo + TS) ──┼── HTTPS + JSON ──▶ [backend/ Node.js + TS API]
[iOS/iPad App: mobile/]    (Same Expo codebase)     ──┘                      │          │
                                                                             ▼          ▼
[packages/shared] (types, error codes, tokens) ── imported by all 3   [PostgreSQL]  [Stalwart Mail]
                                                                      (RLS + Auth)  (JMAP/SMTP/DAV)
```

### 2.3 Monorepo Folder Layout (`pnpm` Workspaces)
```text
mrrokesh-mail/
├── frontend/                     # Website + Webmail + Calendar + Contacts + Admin + /docs
│   ├── src/
│   │   ├── app/                  # routes, layouts, theme & query providers
│   │   ├── features/             # auth/, mail/, calendar/, contacts/, domains/, billing/, admin/, security/
│   │   ├── components/ui/        # Button, Card, Input, Modal, Skeleton (tokens only)
│   │   ├── pages/docs/           # Public /docs rendered from root /docs Markdown
│   │   └── lib/                  # API client, JMAP client, hooks, sanitizer
│   └── vite.config.ts
├── mobile/                       # Android + iOS (React Native + Expo + Expo Router)
│   ├── app/                      # Expo Router screens (max 5 tabs)
│   ├── src/features/
│   ├── src/components/ui/
│   └── app.config.ts
├── backend/                      # Single REST API + JMAP/Image Proxy + BullMQ Workers
│   ├── src/
│   │   ├── modules/              # auth/, orgs/, subscriptions/, domains/, mailboxes/, rules/, migrations/, audit/
│   │   ├── integrations/         # stalwart/, razorpay/, stripe/, dns-providers/, clamav/
│   │   ├── middleware/           # auth, rls-tenant, entitlements, rate-limit, error-handler
│   │   ├── errors/               # AppError + error code mapper
│   │   └── db/                   # migrations, seeds, RLS helpers
│   └── openapi.yaml              # Always-current OpenAPI 3.1 spec
├── packages/shared/              # Imported by frontend, mobile, and backend
│   ├── types/                    # Shared request/response DTOs + Zod schemas
│   ├── errors/codes.ts           # Single source of truth for all error codes
│   └── tokens/                   # Design tokens (CSS variables + TS objects)
├── infra/                        # Docker Compose / Kubernetes manifests for Stalwart, Postgres, Redis, ClamAV
├── docs/                         # Living Markdown documentation (Web /docs + Mobile Help)
├── DESIGN.md                     # Locked UI tokens & skill guardrails
├── PROJECT_BRIEF.md              # Saved kickoff prompt
├── CHANGELOG.md                  # SemVer changelog feeding "What's New"
└── README.md                     # Local setup guide
```

### 2.4 Control Plane ↔ Data Plane Synchronization
1. **Provisioning Sync**: Creating/updating a domain, mailbox, alias, quota, DKIM key, or transport rule writes to PostgreSQL and enqueues an idempotent BullMQ job that updates Stalwart via its REST Management API (`/api/principal`, `/api/settings`), keeping `stalwart_principal_id` strictly synchronized.
2. **Client Mail Proxy**: Webmail and Mobile hit `backend/api/v1/jmap` and `backend/api/v1/image-proxy` with short-lived JWTs. Backend verifies active subscription entitlements, enforces SSRF protections on remote images, strips tracking pixels, and proxies scoped JMAP calls to Stalwart.

---

## 3. 11-Provider Feature Matrix & INR/USD Subscription Model

Every capability across **Google Workspace, Microsoft 365, Zoho Mail, Proton Mail, Fastmail, Neo Mail, Titan Email, Rackspace, Hostinger, GoDaddy, and BigRock** is unified into four subscription tiers enforced by backend entitlement middleware (`org_subscriptions` + `subscription_plans.entitlements`).

### 3.1 Pricing & Entitlement Table (`www.mrrokesh.com`)

| Plan Parameter | **Starter** | **Growth** | **Business Pro** | **Enterprise Sovereign** |
| :--- | :--- | :--- | :--- | :--- |
| **Benchmarked Providers** | Hostinger / GoDaddy / BigRock / Rackspace | Neo Mail / Titan Email / Fastmail | Google Workspace / Zoho Mail | Microsoft 365 E3/E5 + Proton Mail |
| **India Price (Annual)** | **₹79** /user/mo | **₹199** /user/mo | **₹449** /user/mo | **₹999** /user/mo |
| **India Price (Monthly)** | ₹99 /user/mo | ₹249 /user/mo | ₹549 /user/mo | ₹1,199 /user/mo |
| **Global Price (Annual)** | **$1.49** /user/mo | **$3.99** /user/mo | **$7.99** /user/mo | **$15.99** /user/mo |
| **Global Price (Monthly)** | $1.99 /user/mo | $4.99 /user/mo | $9.99 /user/mo | $19.99 /user/mo |
| **Storage Quota** | 15 GB / seat | 50 GB / seat | 200 GB pooled / seat | 1 TB pooled / seat + auto-expanding archive |
| **Custom Domains** | 1 domain | 5 domains | Unlimited | Unlimited + subdomain isolation |
| **Aliases & Masked Mail** | 5 aliases | Unlimited + disposable masked aliases (`user+tag`) | Unlimited + catch-all | Unlimited + custom regex routing |
| **DNS & Deliverability** | Guided MX/SPF/DKIM/DMARC wizard + Health Score (0–100) | One-click auto-DNS (Cloudflare, GoDaddy, Namecheap, Domain Connect) | Automated DKIM key rotation + DMARC report parser | MTA-STS, DANE/TLSA, BIMI brand logos, dedicated IP option |
| **Mail & Mobile Protocols** | Webmail, Mobile (iOS/Android), IMAP/POP3/SMTP, CalDAV, CardDAV | + JMAP instant push, unified multi-account inbox | + Shared mailboxes, Send-As / Send-on-Behalf delegation, Room booking | + Multi-geo data residency, mail-enabled security groups |
| **Productivity Suite** | Signatures, vacation auto-responder | Read receipts, send-later, snooze, undo-send, follow-up reminders, templates (`{{var}}`), Neo-style bio/booking page | + Zoho-style internal thread comments/streams, shared calendars, Tasks & Notes, AI Compose & Summarize | + Full Exchange-class Free/Busy Scheduling Assistant & conference resource booking |
| **Filtering & Automation** | Basic spam/virus filtering | Visual Sieve builder + raw Sieve editor, priority inbox | + Inbound/outbound webhooks, REST API triggers | + Exchange-style Org Transport Rules (legal disclaimers, conditional routing, regex DLP) |
| **Migration Tools** | One-click IMAP migrator | Bulk CSV/IMAP migration | + Google Workspace & Microsoft 365 OAuth migrators | + Dedicated white-glove bulk migration workers |
| **Security, Privacy & Compliance** | TLS/STARTTLS, TOTP 2FA, login rate limiting | + Tracker/pixel blocker, remote image proxy, WebAuthn Passkeys, per-app passwords | + SAML 2.0 / OIDC SSO, SCIM 2.0 provisioning, audit logs, org MFA enforcement, session revocation | + **Zero-Access PGP/S/MIME**, password-protected external emails, Safe Links URL inspection, AV sandboxing, WORM Archive, Litigation Hold, eDiscovery, SIEM streaming |

### 3.2 Add-On SKUs & Billing Gateways
* **Payment Gateways**: **Razorpay** (INR with automated GST invoices & UPI/cards) and **Stripe** (USD/global cards, SEPA, Apple Pay).
* **Extra Pooled Storage**: ₹99/mo ($1.50/mo) per 100 GB block.
* **Dedicated Outbound IP + Automated Warmup**: ₹2,499/mo ($29/mo) per IP (Business Pro & Enterprise).
* **Compliance Archive & eDiscovery Pack** (add-on for Business Pro): ₹299/user/mo ($4/user/mo).
* **Entitlement Gating Behavior**: When a tenant accesses a feature outside their plan, the API returns HTTP `403` with `API-SUB-003` and `{ "required_tier": "...", "feature": "..." }` so Web and Mobile render a calm inline upgrade prompt.

---

## 4. Master Kickoff Prompt (`PROJECT_BRIEF.md`)

Save the block below as `PROJECT_BRIEF.md` in the repository root and paste it directly into your AI coding agent to kick off the build.

~~~~markdown
You are building MR Rokesh Mail (mrrokesh.com Mail Cloud) for mrrokesh.com.

PHASE 0 — TOOLING, REA & SKILLS SETUP (EXECUTE & GET APPROVAL FIRST)
1. Install REA (`https://github.com/morluto/rea.git`) and connect it to this coding agent using `npx rea-agents@latest setup` (run from a trusted directory outside the target analysis folder). Show me the full setup plan for approval BEFORE applying config changes, then verify the installation (`rea --help` and MCP connection check).
2. Verify/install the following coding-agent skills and report status:
   - Cybersecurity audit: `npx skills add https://github.com/cloudflare/security-audit-skill --skill security-audit --global`
   - UI Art Direction & Browser QA: `npx skills add https://github.com/Leonxlnx/taste-skill --skill "design-taste-frontend"`
   - Anti-AI-Slop Floor & Render Lint: `npx skills add nutlope/hallmark -g`
   - Mode-Aware Design Polish: `npx skills add https://github.com/pbakaus/impeccable --skill impeccable --global`
   - Visual Assets: `npx skills add mengto/skills/aura-asset-images --global`
3. Lock the root `DESIGN.md` strictly to the mrrokesh.com Product Build Playbook design tokens so all UI skills (`taste-skill`, `hallmark`, `impeccable`) produce studio-grade, non-generic interfaces without overriding our brand identity.

GOAL
What it does: A multi-tenant custom-domain business email, calendaring, contacts, and cybersecurity suite for www.mrrokesh.com unifying Microsoft 365 Exchange Online enterprise depth with Google Workspace, Zoho Mail, Proton Mail, Fastmail, Neo Mail, Titan Email, Rackspace, Hostinger, GoDaddy, and BigRock under a 4-tier SaaS subscription model.
Who uses it: Customers (solopreneurs, SMBs, enterprise end-users), Organization Admins (domain/DNS/seat/security managers), Staff/Support Agents, and Platform Super Admins.
Platforms: Web + Android + iOS (all three clients powered by one REST API + real-time JMAP/WebSocket sync).

ARCHITECTURE (do not change without approval)
/frontend -> React 18+ + Vite + TypeScript (React Router, TanStack Query, Zod, Lucide icons) — Marketing/Pricing (Persuade mode), Webmail + Calendar + Contacts + Admin Console (Operate mode), and /docs (Read mode)
/mobile -> React Native (Expo) + Expo Router + TypeScript (Android + iOS, same TanStack Query + Zod + Lucide React Native)
/backend -> Node.js LTS + Fastify/Express + TypeScript (REST API /api/v1/..., OpenAPI openapi.yaml, one API for all clients)
/packages/shared -> shared types, API client, error codes (`errors/codes.ts`), design tokens (`tokens/`)
/infra -> Docker Compose / Kubernetes manifests for Stalwart Mail Server (`stalwartlabs/stalwart`), PostgreSQL 16 (RLS), Redis/BullMQ, ClamAV, and S3-compatible encrypted blob storage.
Database: PostgreSQL (with Prisma or Drizzle + Row-Level Security per organization_id). Auth: JWT access (15 min) + refresh tokens (30 days) in httpOnly cookies (web) and Expo SecureStore (mobile).

RULES
1. Follow the mrrokesh.com Product Build Playbook strictly (three-folder pnpm workspace monorepo, kebab-case files, PascalCase.tsx components, useThing.ts hooks, design system, error codes, Definition of Done).
2. Every API error returns `{ code, message, details }` with a code from `packages/shared/errors/codes.ts`. Include all Playbook codes (`API-*`, `WEB-*`, `AND-*`, `IOS-*`) plus `API-DOM-*`, `API-MAIL-*`, `API-SUB-*`, `API-SEC-*`. Never reuse retired codes or expose raw stack traces.
3. Every screen uses design tokens ONLY from `/packages/shared/tokens/` — no hard-coded colors, fonts, or spacing. Run `hallmark` (`sloplint.mjs --render`), `taste-skill` headless Chrome checks, and `impeccable` critique before considering any UI complete.
4. Every feature updates `/docs` (with "Last updated: [date] v[x.y.z]"), `openapi.yaml`, and `CHANGELOG.md` in the same pull request. Web `/docs` and Mobile Help render from the exact same `/docs` Markdown files.
5. Write tests for business logic (unit tests for services, API tests for every endpoint, one E2E per core flow). No secrets in code (`.env` only, `.env.example` committed). Structured JSON logs with request ID + Sentry crash reporting.
6. Passwords: NFKC normalize (8–128 chars) -> HMAC-SHA256 with `PASSWORD_PEPPER` (32+ bytes from secret manager) -> `bcrypt.hash(peppered, 12)` -> store hash + `pepper_version` + silent `needsRehash()`. Encrypt readable secrets (DKIM private keys, OAuth migration tokens, TOTP seeds, SSO configs) with AES-256-GCM using a separate KMS key.
7. Cybersecurity Gate: Run a full 6-phase audit using `cloudflare/security-audit-skill` (including `DATA-ISOLATION-AND-LIFECYCLE.md` multi-tenant isolation, DOMPurify/sandboxed iframe XSS checks, remote image proxy SSRF, SMTP header injection, SPF/DKIM/DMARC/MTA-STS enforcement, and billing entitlement bypass) before release.

FEATURES
1. 4-Tier Subscription & Entitlement Engine (Starter, Growth, Business Pro, Enterprise Sovereign; Razorpay INR + Stripe USD; seat/storage metering & add-ons).
2. Custom Domain & Automated DNS Provisioning (MX, SPF, RSA-2048/Ed25519 DKIM with rotation, DMARC parser, MTA-STS, DANE, BIMI, catch-all, unlimited masked aliases, Deliverability Score 0–100).
3. Modern Three-Pane JMAP Webmail & Native Mobile Apps (unified inbox, threading, Tiptap composer, undo-send, send-later, snooze, read receipts, templates, follow-up reminders, instant search, sandboxed HTML + tracker proxy blocker).
4. Enterprise Productivity & Collaboration (CalDAV Calendar with iTIP RSVP, Free/Busy scheduling & room booking; CardDAV Contacts; shared mailboxes, Send-As delegation, Zoho-style thread comments, Tasks/Notes, AI Compose/Summarize).
5. Automation, Filtering & Migration Center (visual + raw Sieve rules, Exchange-style org Transport Rules & regex DLP, webhooks, IMAP / Google Workspace / Microsoft 365 OAuth migration workers).
6. Enterprise Cybersecurity, Privacy & Compliance (Zero-access OpenPGP/S/MIME, password-protected external emails, Passkeys/WebAuthn, TOTP MFA, SAML 2.0/OIDC SSO, SCIM 2.0, Safe Links, AV sandboxing, WORM Archive, Litigation Hold, eDiscovery, SIEM streaming).
7. Multi-Tier Admin Console & Living Docs (RBAC dashboards + public `/docs` & Mobile Help).

FIRST TASK
1. Present the REA setup plan (`npx rea-agents@latest setup`) and skill verification checklist for my approval.
2. Once approved, scaffold the pnpm monorepo (`/frontend`, `/mobile`, `/backend`, `/packages/shared`, `/infra`, `/docs`), `PROJECT_BRIEF.md`, `DESIGN.md`, linting/Prettier/CI config, `packages/shared/errors/codes.ts`, `packages/shared/tokens/`, and `/docs`.
3. List all planned screens, database tables, Stalwart sync boundaries, and `/api/v1/...` endpoints, and wait for my approval before implementing feature code.
~~~~

---

## 5. Locked Design System (`DESIGN.md` & CSS Tokens)

Save this section as `DESIGN.md` in the repo root and export the CSS variables into `packages/shared/tokens/tokens.css`.

### 5.1 Visual Principles & Mode Guardrails
* **Core Ethos**: Apple-inspired clarity, generous whitespace, one hero focus per screen, calm motion — using `mrrokesh.com`'s own identity (never SF Pro on web, never Apple icons, never stock-photo clutter).
* **Skill Modes**:
  * **Persuade Mode** (`/`, `/pricing`, `/security`): Editorial hero with signature Electric Indigo glow, crisp live-product UI captures, `128px` desktop section rhythm.
  * **Operate Mode** (`/mail`, `/calendar`, `/contacts`, `/admin`): High-clarity three-pane workspace, subtle surface contrast, keyboard-first density on the 4pt grid, zero decorative gradients in reading panes.
  * **Read Mode** (`/docs`, `/changelog`, Mobile Help): `70ch` max line length, structured callouts, searchable error tables.
* **Hard Floors (WCAG 2.2 AA & Hallmark Gate)**:
  * Electric Indigo brand color (`#5B5BF7` / `#7B7BFF`) covers **at most 10%** of any screen.
  * Text contrast $\ge 4.5:1$; large text/controls $\ge 3:1$; mobile touch targets $\ge 44\text{pt}$.
  * Full Light & Dark mode support across every screen and `320px–1920px` viewports.

### 5.2 Design Tokens (`packages/shared/tokens/tokens.css`)
```css
:root {
  /* Color — Light Mode */
  --color-bg: #FFFFFF;
  --color-surface: #F5F5F7;
  --color-text-primary: #111113;
  --color-text-secondary: #6E6E73;
  --color-brand: #5B5BF7;
  --color-brand-glow: rgba(91, 91, 247, 0.20);
  --color-success: #1F9D55;
  --color-warning: #C77700;
  --color-danger: #D92D20;
  --color-border: rgba(17, 17, 19, 0.08);

  /* Typography */
  --font-heading: "Satoshi", -apple-system, BlinkMacSystemFont, sans-serif;
  --font-body: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
  --tracking-heading: -0.02em;
  --measure-max: 70ch;

  /* Spacing Scale (4pt base) */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;
  --space-16: 64px;
  --space-24: 96px;
  --space-32: 128px;

  /* Layout */
  --container-max: 1200px;
  --gutter-mobile: 24px;
  --section-py-desktop: 128px;
  --section-py-mobile: 64px;

  /* Corner Radii */
  --radius-input: 8px;
  --radius-button: 14px;
  --radius-pill: 9999px;
  --radius-card: 20px;
  --radius-modal: 28px;

  /* Elevation & Glass */
  --shadow-soft: 0 8px 30px rgba(0, 0, 0, 0.08);
  --glass-blur: blur(20px);
  --glow-blur: blur(80px);

  /* Motion */
  --duration-fast: 200ms;
  --duration-base: 300ms;
  --duration-slow: 400ms;
  --ease-calm: cubic-bezier(0.25, 0.1, 0.25, 1);
}

[data-theme="dark"] {
  --color-bg: #000000;
  --color-surface: #1C1C1E;
  --color-text-primary: #F5F5F7;
  --color-text-secondary: #A1A1A6;
  --color-brand: #7B7BFF;
  --color-brand-glow: rgba(91, 91, 247, 0.20);
  --color-success: #30D158;
  --color-warning: #FFD60A;
  --color-danger: #FF453A;
  --color-border: rgba(245, 245, 247, 0.10);
  --shadow-soft: none; /* Dark mode uses lighter surface elevation instead of shadows */
}
```

### 5.3 Typography Scale (Max 3 Sizes Per Screen)

| Token | Web Size / Line-Height | Mobile Size | Weight | Font | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `display` | 80 / 84 px (48 px phones) | 40 pt | 700 | Satoshi | Homepage hero only |
| `h1` | 56 / 60 px | 34 pt | 700 | Satoshi | Page title |
| `h2` | 40 / 44 px | 28 pt | 600 | Satoshi | Section title |
| `h3` | 28 / 34 px | 22 pt | 600 | Satoshi | Card title |
| `body-lg` | 21 / 32 px | 19 pt | 400 | Inter (SF Pro/Roboto mobile) | Intro paragraphs |
| `body` | 17 / 26 px | 17 pt | 400 | Inter (SF Pro/Roboto mobile) | Default body text |
| `caption` | 14 / 20 px | 13 pt | 500 | Inter (SF Pro/Roboto mobile) | Labels, timestamps, badges |

### 5.4 Component, Motion & Voice Rules
* **Primary Button**: Brand fill, white text, height `48px` (web) / `50px` (mobile), radius `14px` (pill when standalone). Strictly **one primary CTA per screen**.
* **Secondary Button**: Text-only or outline in brand color.
* **Input**: `48px` height, `8px` radius, label always above, error below in danger color with Playbook error code.
* **Card**: Surface background, `20px` radius, `24px` padding, preview media on top.
* **Navigation**: Sticky frosted glass (`backdrop-filter: blur(20px)`), logo left, max **5 links**, **1 CTA** right. Mobile tab bar: max **5 tabs** (Inbox, Calendar, Contacts, Security/Admin, Settings).
* **Icons**: **Lucide only** (`lucide-react` / `lucide-react-native`), `1.5px` stroke, `24px`.
* **Loading & Empty States**: Skeleton screens for anything $> 300\text{ms}$ (never spinners). Empty states = 1 minimal illustration + 1 sentence + 1 action button.
* **Motion**: `200–400ms`, `cubic-bezier(0.25, 0.1, 0.25, 1)`. Scroll reveal = fade in + `24px` upward slide once; hero product scales $1.0 \rightarrow 1.05$ on scroll. Always honor `prefers-reduced-motion`.
* **Voice**: Short, confident, human. Headlines under 6 words (*"Own your inbox. Keep every secret."*). Buttons are verbs (*"Verify DNS"*, *"Create mailbox"*, never *"Submit"*).
* **Email Workspace**: Sanitized HTML rendered inside `<iframe sandbox="">` with server-proxied remote image blocking banner and calm inline `Lock` upgrade badges for tier-gated features.

---

## 6. Cybersecurity, Cryptography & Audit Architecture

### 6.1 Playbook Password Security (`backend/src/modules/auth/password.ts`)
Passwords are **hashed** (never encrypted or logged), combining NFKC normalization (8–128 chars), HMAC-SHA256 server-side pepper (`PASSWORD_PEPPER` $\ge 32$ random bytes in secret manager), and `bcrypt` cost factor `12` (unique 16-byte random salt).

```typescript
// backend/src/modules/auth/password.ts
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';

const PEPPERS: Record<number, string> = {
  1: process.env.PASSWORD_PEPPER_V1!, // 32+ random bytes from secret manager
  ...(process.env.PASSWORD_PEPPER_V2 ? { 2: process.env.PASSWORD_PEPPER_V2 } : {}),
};

export const CURRENT_PEPPER_VERSION = Number(process.env.PASSWORD_PEPPER_ACTIVE_VERSION || 1);
const BCRYPT_COST = 12;

export function assertValidPasswordLength(password: string): string {
  const normalized = password.normalize('NFKC');
  if (normalized.length < 8 || normalized.length > 128) {
    throw new Error('API-VAL-001: Password must be between 8 and 128 characters.');
  }
  return normalized;
}

function applyPepper(password: string, version: number): string {
  const key = PEPPERS[version];
  if (!key) {
    throw new Error(`Missing PASSWORD_PEPPER for version ${version}`);
  }
  // 44-char base64 output stays safely under bcrypt's 72-byte limit
  return crypto.createHmac('sha256', key).update(password.normalize('NFKC')).digest('base64');
}

export async function hashPassword(password: string): Promise<{ hash: string; pepperVersion: number }> {
  const normalized = assertValidPasswordLength(password);
  const hash = await bcrypt.hash(applyPepper(normalized, CURRENT_PEPPER_VERSION), BCRYPT_COST);
  return { hash, pepperVersion: CURRENT_PEPPER_VERSION };
}

export async function verifyPassword(
  password: string,
  hash: string,
  pepperVersion: number,
): Promise<boolean> {
  const normalized = password.normalize('NFKC');
  if (normalized.length < 8 || normalized.length > 128) return false;
  return bcrypt.compare(applyPepper(normalized, pepperVersion), hash);
}

export function needsRehash(hash: string, pepperVersion: number): boolean {
  return pepperVersion < CURRENT_PEPPER_VERSION || bcrypt.getRounds(hash) < BCRYPT_COST;
}
```

### 6.2 Readable Secret Encryption (`AES-256-GCM`)
Readable secrets (tenant DKIM private keys, OAuth migration tokens, TOTP seeds, SSO metadata) are encrypted using **AES-256-GCM** with a **separate KMS key** (`DATA_ENCRYPTION_KEY_V1`, completely distinct from `PASSWORD_PEPPER`), unique 96-bit random IVs per record, and authenticated tags.

### 6.3 Email Protocol & Multi-Tenant Hardening
* **Protocol Defense**: Mandatory SPF, 2048-bit RSA/Ed25519 DKIM with scheduled rotation, DMARC (`p=quarantine`/`reject`), MTA-STS, DANE/TLSA, ARC sealing, and per-mailbox outbound velocity limits to prevent spam abuse.
* **Webmail & Proxy Defense**: Server-side DOMPurify sanitization + `<iframe sandbox="">` rendering; SSRF-hardened remote image proxy (blocks RFC 1918, loopback, link-local `169.254.169.254`, IPv6 ULA, and redirects to private IPs); ClamAV + Rspamd/Stalwart attachment malware scanning; Safe Links click-time inspection on Enterprise tiers.
* **Cloudflare 6-Phase Audit Gate (`security-audit-skill`)**:
  1. Reconnaissance & attack surface map (REST API, JMAP proxy, image proxy, SMTP/Sieve compiler, billing webhooks).
  2. Coverage-led vulnerability hunting.
  3. Independent adversarial candidate validation (exploitability verification).
  4. Schema-validated `findings.json` generation.
  5. Multi-tenant verification against `DATA-ISOLATION-AND-LIFECYCLE.md` (PostgreSQL RLS bypasses, cache key collisions, search index leakage, export/backup/restore tenant boundaries).
  6. Target-neutral remediation verification before production launch.

---

## 7. PostgreSQL Multi-Tenant + Stalwart Schema (`0001_initial_schema.sql`)

Save as `backend/src/db/migrations/0001_initial_schema.sql`. Enforces PostgreSQL **Row-Level Security (RLS)** on every tenant table.

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- ============================================================================
-- 1. SUBSCRIPTION PLANS & ENTITLEMENT CATALOG
-- ============================================================================
CREATE TYPE plan_tier AS ENUM ('starter', 'growth', 'business_pro', 'enterprise_sovereign');
CREATE TYPE billing_cycle AS ENUM ('monthly', 'annual');
CREATE TYPE subscription_status AS ENUM ('trialing', 'active', 'past_due', 'canceled', 'suspended');
CREATE TYPE org_role AS ENUM ('owner', 'org_admin', 'billing_admin', 'security_auditor', 'member');

CREATE TABLE subscription_plans (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier                plan_tier UNIQUE NOT NULL,
  display_name        TEXT NOT NULL,
  price_inr_monthly   INTEGER NOT NULL, -- paise (e.g. 9900 = ₹99)
  price_inr_annual    INTEGER NOT NULL, -- monthly equivalent in paise (e.g. 7900 = ₹79)
  price_usd_monthly   INTEGER NOT NULL, -- cents (e.g. 199 = $1.99)
  price_usd_annual    INTEGER NOT NULL, -- monthly equivalent in cents (e.g. 149 = $1.49)
  storage_gb_per_seat INTEGER NOT NULL,
  is_storage_pooled   BOOLEAN NOT NULL DEFAULT FALSE,
  max_domains         INTEGER NOT NULL, -- -1 = unlimited
  max_aliases_per_box INTEGER NOT NULL, -- -1 = unlimited
  entitlements        JSONB NOT NULL,   -- feature flags enforced by backend middleware
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. ORGANIZATIONS (TENANTS) & SUBSCRIPTIONS
-- ============================================================================
CREATE TABLE organizations (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                   TEXT NOT NULL,
  slug                   CITEXT UNIQUE NOT NULL,
  stalwart_tenant_id     TEXT UNIQUE NOT NULL,
  data_residency_region  TEXT NOT NULL DEFAULT 'ap-south-1',
  enforce_mfa            BOOLEAN NOT NULL DEFAULT FALSE,
  sso_enabled            BOOLEAN NOT NULL DEFAULT FALSE,
  sso_config_enc         BYTEA, -- AES-256-GCM encrypted SAML/OIDC config
  sso_config_iv          BYTEA,
  kms_key_version        SMALLINT NOT NULL DEFAULT 1,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE org_subscriptions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id                UUID NOT NULL REFERENCES subscription_plans(id),
  status                 subscription_status NOT NULL DEFAULT 'active',
  cycle                  billing_cycle NOT NULL DEFAULT 'annual',
  currency               CHAR(3) NOT NULL CHECK (currency IN ('INR', 'USD')),
  seat_limit             INTEGER NOT NULL CHECK (seat_limit > 0),
  extra_storage_gb       INTEGER NOT NULL DEFAULT 0,
  dedicated_ip_addon     BOOLEAN NOT NULL DEFAULT FALSE,
  compliance_pack_addon  BOOLEAN NOT NULL DEFAULT FALSE,
  payment_gateway        TEXT NOT NULL CHECK (payment_gateway IN ('razorpay', 'stripe')),
  gateway_customer_id    TEXT,
  gateway_sub_id         TEXT UNIQUE,
  current_period_start   TIMESTAMPTZ NOT NULL,
  current_period_end     TIMESTAMPTZ NOT NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. USERS & PLAYBOOK AUTHENTICATION
-- ============================================================================
CREATE TABLE users (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email                  CITEXT UNIQUE NOT NULL,
  full_name              TEXT NOT NULL,
  role                   org_role NOT NULL DEFAULT 'member',
  password_hash          TEXT NOT NULL,     -- bcrypt(cost=12) of HMAC-SHA256(NFKC, PEPPER)
  pepper_version         SMALLINT NOT NULL DEFAULT 1,
  totp_secret_enc        BYTEA,             -- AES-256-GCM encrypted TOTP seed
  totp_secret_iv         BYTEA,
  mfa_enabled            BOOLEAN NOT NULL DEFAULT FALSE,
  is_active              BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at          TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE refresh_tokens (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  token_hash             TEXT UNIQUE NOT NULL, -- SHA-256 of opaque token
  family_id              UUID NOT NULL,        -- rotation reuse detection
  device_label           TEXT,
  platform               TEXT CHECK (platform IN ('web', 'android', 'ios')),
  ip_address             INET,
  expires_at             TIMESTAMPTZ NOT NULL,
  revoked_at             TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE webauthn_passkeys (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  credential_id          TEXT UNIQUE NOT NULL,
  public_key             BYTEA NOT NULL,
  sign_count             BIGINT NOT NULL DEFAULT 0,
  transports             TEXT[],
  label                  TEXT NOT NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 4. CUSTOM DOMAINS, DNS HEALTH & DKIM KEY ROTATION
-- ============================================================================
CREATE TABLE domains (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  domain_name            CITEXT UNIQUE NOT NULL,
  verification_txt       TEXT NOT NULL,
  is_verified            BOOLEAN NOT NULL DEFAULT FALSE,
  mx_verified            BOOLEAN NOT NULL DEFAULT FALSE,
  spf_verified           BOOLEAN NOT NULL DEFAULT FALSE,
  dkim_verified          BOOLEAN NOT NULL DEFAULT FALSE,
  dmarc_verified         BOOLEAN NOT NULL DEFAULT FALSE,
  mta_sts_enabled        BOOLEAN NOT NULL DEFAULT FALSE,
  dane_enabled           BOOLEAN NOT NULL DEFAULT FALSE,
  bimi_svg_url           TEXT,
  deliverability_score   SMALLINT NOT NULL DEFAULT 0 CHECK (deliverability_score BETWEEN 0 AND 100),
  catch_all_mailbox_id   UUID,
  last_dns_checked_at    TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE domain_dkim_keys (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id              UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  selector               TEXT NOT NULL,
  algorithm              TEXT NOT NULL CHECK (algorithm IN ('rsa-2048', 'ed25519')),
  public_key_dns         TEXT NOT NULL,
  private_key_enc        BYTEA NOT NULL, -- AES-256-GCM encrypted
  private_key_iv         BYTEA NOT NULL,
  is_active              BOOLEAN NOT NULL DEFAULT TRUE,
  rotate_after           TIMESTAMPTZ NOT NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (domain_id, selector)
);

-- ============================================================================
-- 5. MAILBOXES, ALIASES, SHARED MAILBOXES & STALWART SYNC
-- ============================================================================
CREATE TYPE mailbox_kind AS ENUM ('user', 'shared', 'room_resource', 'equipment_resource');

CREATE TABLE mailboxes (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  domain_id                UUID NOT NULL REFERENCES domains(id) ON DELETE RESTRICT,
  user_id                  UUID REFERENCES users(id) ON DELETE SET NULL,
  kind                     mailbox_kind NOT NULL DEFAULT 'user',
  address                  CITEXT UNIQUE NOT NULL,
  stalwart_principal_id    TEXT UNIQUE NOT NULL,
  quota_bytes              BIGINT NOT NULL,
  used_bytes               BIGINT NOT NULL DEFAULT 0,
  zero_access_pgp_pub      TEXT,
  zero_access_pgp_priv_enc BYTEA,
  archive_auto_expand      BOOLEAN NOT NULL DEFAULT FALSE,
  litigation_hold_until    TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE domains
  ADD CONSTRAINT fk_catch_all_mailbox
  FOREIGN KEY (catch_all_mailbox_id) REFERENCES mailboxes(id) ON DELETE SET NULL;

CREATE TABLE mailbox_aliases (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  mailbox_id             UUID NOT NULL REFERENCES mailboxes(id) ON DELETE CASCADE,
  domain_id              UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  alias_address          CITEXT UNIQUE NOT NULL,
  is_disposable_masked   BOOLEAN NOT NULL DEFAULT FALSE,
  label                  TEXT,
  is_active              BOOLEAN NOT NULL DEFAULT TRUE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE mailbox_delegations (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  mailbox_id             UUID NOT NULL REFERENCES mailboxes(id) ON DELETE CASCADE,
  delegate_user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  can_read               BOOLEAN NOT NULL DEFAULT TRUE,
  can_send_as            BOOLEAN NOT NULL DEFAULT FALSE,
  can_send_on_behalf     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (mailbox_id, delegate_user_id)
);

-- ============================================================================
-- 6. TRANSPORT RULES, MIGRATION WORKERS & AUDIT LOGS
-- ============================================================================
CREATE TABLE transport_rules (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name                   TEXT NOT NULL,
  priority               INTEGER NOT NULL DEFAULT 100,
  direction              TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound', 'internal')),
  conditions_json        JSONB NOT NULL,
  actions_json           JSONB NOT NULL,
  compiled_sieve         TEXT NOT NULL,
  is_enabled             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE migration_jobs (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  target_mailbox_id      UUID NOT NULL REFERENCES mailboxes(id) ON DELETE CASCADE,
  source_provider        TEXT NOT NULL CHECK (source_provider IN ('imap', 'google_workspace', 'microsoft_365')),
  source_credentials_enc BYTEA NOT NULL, -- AES-256-GCM encrypted
  source_credentials_iv  BYTEA NOT NULL,
  status                 TEXT NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  messages_total         INTEGER NOT NULL DEFAULT 0,
  messages_migrated      INTEGER NOT NULL DEFAULT 0,
  last_error_code        TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor_user_id          UUID REFERENCES users(id) ON DELETE SET NULL,
  request_id             UUID NOT NULL,
  action                 TEXT NOT NULL,
  target_type            TEXT NOT NULL,
  target_id              UUID,
  ip_address             INET,
  metadata               JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_org_created ON audit_logs (organization_id, created_at DESC);
CREATE INDEX idx_mailboxes_org ON mailboxes (organization_id);
CREATE INDEX idx_domains_org ON domains (organization_id);

-- ============================================================================
-- 7. MULTI-TENANT ROW-LEVEL SECURITY (RLS)
-- Every request transaction executes: SET LOCAL app.current_org_id = '<uuid>';
-- ============================================================================
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'org_subscriptions', 'users', 'refresh_tokens', 'webauthn_passkeys',
    'domains', 'domain_dkim_keys', 'mailboxes', 'mailbox_aliases',
    'mailbox_delegations', 'transport_rules', 'migration_jobs', 'audit_logs'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', tbl);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (organization_id = current_setting(''app.current_org_id'', true)::uuid);',
      tbl
    );
  END LOOP;
END $$;
```

---

## 8. Standardized Error Code Registry (`packages/shared/errors/codes.ts`)

Single source of truth imported by `backend/`, `frontend/`, `mobile/`, and `/docs`. Includes every Playbook error code plus Mail, Domain, Subscription, and Security extensions. **Rule: never reuse a retired code.**

```typescript
// packages/shared/errors/codes.ts
export interface ErrorDefinition {
  code: string;
  http?: number;
  meaning: string;
  message: string;
  action: string;
}

export const ERROR_CODES = {
  // ---- Shared Playbook API Errors ----
  'API-AUTH-001': { code: 'API-AUTH-001', http: 401, meaning: 'Wrong email or password', message: 'Email or password is incorrect.', action: 'Retry or use Forgot password.' },
  'API-AUTH-002': { code: 'API-AUTH-002', http: 401, meaning: 'Access token expired', message: '', action: 'Client refreshes token automatically.' },
  'API-AUTH-003': { code: 'API-AUTH-003', http: 403, meaning: 'Not allowed for this role', message: "You don't have access to this.", action: 'Ask an organization admin for access.' },
  'API-VAL-001':  { code: 'API-VAL-001',  http: 422, meaning: 'Input failed validation', message: 'Please check the highlighted fields.', action: 'Correct highlighted fields from details.' },
  'API-RES-404':  { code: 'API-RES-404',  http: 404, meaning: 'Item not found', message: "We couldn't find that.", action: 'Go back or refresh the list.' },
  'API-RATE-429': { code: 'API-RATE-429', http: 429, meaning: 'Too many requests', message: 'Too many attempts. Try again in a minute.', action: 'Wait briefly, then retry.' },
  'API-SRV-500':  { code: 'API-SRV-500',  http: 500, meaning: 'Unexpected server error', message: 'Something went wrong on our side.', action: 'Logged with request ID; alert on-call.' },
  'API-SRV-503':  { code: 'API-SRV-503',  http: 503, meaning: 'Maintenance or overload', message: "We'll be right back.", action: 'Retry with exponential backoff.' },

  // ---- Subscription & Entitlement Errors ----
  'API-SUB-001':  { code: 'API-SUB-001',  http: 402, meaning: 'Subscription past due or suspended', message: 'Your subscription needs a payment update.', action: 'Update payment method in Billing.' },
  'API-SUB-002':  { code: 'API-SUB-002',  http: 403, meaning: 'Seat or domain limit reached', message: 'You reached your plan limit.', action: 'Add seats or upgrade your plan.' },
  'API-SUB-003':  { code: 'API-SUB-003',  http: 403, meaning: 'Feature locked on current tier', message: 'Upgrade your plan to unlock this feature.', action: 'Open plan comparison and upgrade.' },

  // ---- Domain & DNS Errors ----
  'API-DOM-001':  { code: 'API-DOM-001',  http: 409, meaning: 'Domain already registered', message: 'This domain is already connected to an account.', action: 'Verify ownership or contact support.' },
  'API-DOM-002':  { code: 'API-DOM-002',  http: 422, meaning: 'TXT verification record not found', message: "We couldn't see your DNS verification record yet.", action: 'Wait for DNS propagation and re-check.' },
  'API-DOM-003':  { code: 'API-DOM-003',  http: 422, meaning: 'MX/SPF/DKIM misconfigured', message: 'Your DNS records need attention before mail flows.', action: 'Copy the required records from the DNS Wizard.' },

  // ---- Mail Engine & Quota Errors ----
  'API-MAIL-001': { code: 'API-MAIL-001', http: 413, meaning: 'Mailbox storage quota exceeded', message: 'Your mailbox is full.', action: 'Free up space or add pooled storage.' },
  'API-MAIL-002': { code: 'API-MAIL-002', http: 422, meaning: 'Attachment blocked by malware scanner', message: 'An attachment failed our security scan.', action: 'Remove the flagged file before sending.' },
  'API-MAIL-003': { code: 'API-MAIL-003', http: 409, meaning: 'Address or alias already in use', message: 'That email address is already taken.', action: 'Choose a different username or alias.' },
  'API-MAIL-401': { code: 'API-MAIL-401', http: 401, meaning: 'Migration source authentication failed', message: "We couldn't connect to your old email provider.", action: 'Re-enter your app password or reconnect OAuth.' },

  // ---- Security & Compliance Errors ----
  'API-SEC-001':  { code: 'API-SEC-001',  http: 403, meaning: 'MFA required by organization policy', message: 'Your organization requires two-factor authentication.', action: 'Enroll a Passkey or authenticator app.' },
  'API-SEC-002':  { code: 'API-SEC-002',  http: 403, meaning: 'Blocked by DLP / Transport Rule', message: 'This message was blocked by your organization policy.', action: 'Remove restricted data or contact your admin.' },
  'API-SEC-003':  { code: 'API-SEC-003',  http: 403, meaning: 'Action blocked by Litigation Hold', message: 'This mailbox is under legal hold and cannot be purged.', action: 'Contact your compliance officer.' },

  // ---- Playbook Website Errors (WEB) ----
  'WEB-NET-001':  { code: 'WEB-NET-001',  meaning: 'Browser offline', message: "You're offline. We'll retry when you reconnect.", action: 'Listen for online event and retry.' },
  'WEB-NET-002':  { code: 'WEB-NET-002',  meaning: 'Request timed out (>15 s)', message: 'This is taking longer than usual.', action: 'Show Retry button.' },
  'WEB-BRW-001':  { code: 'WEB-BRW-001',  meaning: 'Unsupported browser', message: 'Please update your browser.', action: 'Show supported browser list.' },
  'WEB-STO-001':  { code: 'WEB-STO-001',  meaning: 'Cookies/storage blocked', message: 'Enable cookies to stay signed in.', action: 'Link to /docs help page.' },
  'WEB-UPL-001':  { code: 'WEB-UPL-001',  meaning: 'File too large', message: 'Files must be under 25 MB.', action: 'Compress or share via Drive link.' },
  'WEB-RND-001':  { code: 'WEB-RND-001',  meaning: 'Page crashed (error boundary)', message: 'This page hit a problem.', action: 'Show Reload button; report to Sentry.' },

  // ---- Playbook Android Errors (AND) ----
  'AND-NET-001':  { code: 'AND-NET-001',  meaning: 'No internet connection', message: "You're offline.", action: 'Retry when network returns.' },
  'AND-PERM-001': { code: 'AND-PERM-001', meaning: 'Camera permission denied', message: 'Camera access is off.', action: 'Open app Settings.' },
  'AND-PERM-002': { code: 'AND-PERM-002', meaning: 'Notification permission denied (Android 13+)', message: 'Turn on notifications to get updates.', action: 'Open app Settings.' },
  'AND-PERM-003': { code: 'AND-PERM-003', meaning: 'Location permission denied', message: 'Location is off.', action: 'Open app Settings.' },
  'AND-PLAY-001': { code: 'AND-PLAY-001', meaning: 'Google Play Services missing/outdated', message: 'Please update Google Play Services.', action: 'Link to Play Store.' },
  'AND-VER-001':  { code: 'AND-VER-001',  meaning: 'App version too old', message: 'A new version is required.', action: 'Force-update screen to Play Store.' },
  'AND-BIO-001':  { code: 'AND-BIO-001',  meaning: 'Biometric unlock unavailable', message: "Biometric login isn't available.", action: 'Fall back to password.' },
  'AND-STO-001':  { code: 'AND-STO-001',  meaning: 'Device storage full', message: 'Not enough storage space.', action: 'Ask user to free space.' },

  // ---- Playbook iOS / iPadOS Errors (IOS) ----
  'IOS-NET-001':  { code: 'IOS-NET-001',  meaning: 'No internet connection', message: "You're offline.", action: 'Retry when network returns.' },
  'IOS-PERM-001': { code: 'IOS-PERM-001', meaning: 'Camera access denied', message: 'Camera access is off.', action: 'Open iOS Settings.' },
  'IOS-PERM-002': { code: 'IOS-PERM-002', meaning: 'Notifications not allowed', message: 'Turn on notifications to get updates.', action: 'Open iOS Settings.' },
  'IOS-PERM-003': { code: 'IOS-PERM-003', meaning: 'Location access denied', message: 'Location is off.', action: 'Open iOS Settings.' },
  'IOS-ATT-001':  { code: 'IOS-ATT-001',  meaning: 'App Tracking Transparency declined', message: '', action: 'Disable tracking silently.' },
  'IOS-BIO-001':  { code: 'IOS-BIO-001',  meaning: 'Face ID / Touch ID unavailable', message: "Face ID isn't available.", action: 'Fall back to passcode/password.' },
  'IOS-VER-001':  { code: 'IOS-VER-001',  meaning: 'App version too old', message: 'A new version is required.', action: 'Force-update screen to App Store.' },
  'IOS-IAP-001':  { code: 'IOS-IAP-001',  meaning: 'In-app purchase failed or cancelled', message: "Purchase didn't go through. You weren't charged.", action: 'Offer Retry and Restore purchases.' },
} as const satisfies Record<string, ErrorDefinition>;

export type ErrorCode = keyof typeof ERROR_CODES;
```

---

## 9. Infrastructure Stack (`infra/docker-compose.yml` & `.env.example`)

### 9.1 `infra/docker-compose.yml`
```yaml
services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-mrrokesh_mail}
      POSTGRES_USER: ${POSTGRES_USER:-mrrokesh}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - "127.0.0.1:5432:5432"
    volumes:
      - pg_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-mrrokesh}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: ["redis-server", "--requirepass", "${REDIS_PASSWORD}", "--appendonly", "yes"]
    ports:
      - "127.0.0.1:6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  stalwart:
    image: stalwartlabs/stalwart:latest
    restart: unless-stopped
    ports:
      - "25:25"       # SMTP
      - "465:465"     # SMTPS
      - "587:587"     # Submission
      - "993:993"     # IMAPS
      - "995:995"     # POP3S
      - "4190:4190"   # ManageSieve
      - "127.0.0.1:8080:8080" # Internal JMAP / CalDAV / CardDAV / Admin API (fronted by backend/TLS proxy)
    volumes:
      - stalwart_data:/opt/stalwart
    depends_on:
      postgres:
        condition: service_healthy

  clamav:
    image: clamav/clamav:stable
    restart: unless-stopped
    ports:
      - "127.0.0.1:3310:3310"
    volumes:
      - clamav_data:/var/lib/clamav

volumes:
  pg_data:
  redis_data:
  stalwart_data:
  clamav_data:
```

### 9.2 `.env.example` (Commit This; Never Commit `.env`)
```env
# App & URLs
NODE_ENV=development
API_PORT=4000
WEB_URL=https://www.mrrokesh.com
API_URL=https://api.mrrokesh.com

# PostgreSQL & Redis
DATABASE_URL=postgresql://mrrokesh:CHANGE_ME@127.0.0.1:5432/mrrokesh_mail
POSTGRES_PASSWORD=CHANGE_ME
REDIS_URL=redis://:CHANGE_ME@127.0.0.1:6379
REDIS_PASSWORD=CHANGE_ME

# Playbook Auth & Cryptography (Generate with: openssl rand -base64 48)
JWT_ACCESS_SECRET=CHANGE_ME_MIN_32_BYTES
JWT_REFRESH_SECRET=CHANGE_ME_MIN_32_BYTES
PASSWORD_PEPPER_V1=CHANGE_ME_32_PLUS_RANDOM_BYTES
PASSWORD_PEPPER_ACTIVE_VERSION=1
DATA_ENCRYPTION_KEY_V1=CHANGE_ME_SEPARATE_32_BYTE_AES_256_GCM_KEY

# Stalwart Mail Server Control Plane
STALWART_API_URL=http://127.0.0.1:8080
STALWART_ADMIN_TOKEN=CHANGE_ME

# Malware Scanner
CLAMAV_HOST=127.0.0.1
CLAMAV_PORT=3310

# Billing Gateways (India + Global)
RAZORPAY_KEY_ID=rzp_test_CHANGE_ME
RAZORPAY_KEY_SECRET=CHANGE_ME
RAZORPAY_WEBHOOK_SECRET=CHANGE_ME
STRIPE_SECRET_KEY=sk_test_CHANGE_ME
STRIPE_WEBHOOK_SECRET=whsec_CHANGE_ME

# Observability
SENTRY_DSN=
```

---

## 10. Living Documentation (`/docs`) & Definition of Done

### 10.1 Required `/docs` Structure (Shared by Web `/docs` & Mobile Help)
Every how-to page displays `Last updated: [YYYY-MM-DD] v[x.y.z]` at the top:
1. **Getting started** — sign up, connect your custom domain, send your first email.
2. **What you can do** — one-line summary of every feature across all 4 tiers linking to its guide.
3. **How-to guides** — step-by-step guides with Web + Mobile screenshots and tier limits.
4. **Roles & permissions** — Owner, Org Admin, Billing Admin, Security Auditor, Member.
5. **Error codes** — auto-rendered from `packages/shared/errors/codes.ts`.
6. **FAQ & contact** — deliverability troubleshooting, migration help, support channels.
7. **What's new** — auto-generated from `CHANGELOG.md` (newest first).

### 10.2 Pull Request Definition of Done (Playbook Section 8)
No feature merges until every box is verified:
- [ ] Works on Web (Chrome, Safari, Firefox), Android, and iOS in both Light and Dark modes.
- [ ] Uses design tokens exclusively (`DESIGN.md` / `packages/shared/tokens`); passed `hallmark`, `taste-skill`, and `impeccable` checks.
- [ ] Every error uses standardized codes from `packages/shared/errors/codes.ts` (and mirrored in `/docs`).
- [ ] `/docs` how-to page written or updated with fresh screenshots.
- [ ] `CHANGELOG.md` updated with version, date, and changes.
- [ ] `backend/openapi.yaml` updated for any API change.
- [ ] Unit, API integration, and core E2E tests pass in CI with zero lint warnings.
- [ ] Accessibility verified (WCAG 2.2 AA contrast, form labels, keyboard navigation, mobile screen reader, `prefers-reduced-motion`).
- [ ] Security checks passed (Playbook auth/crypto rules + Cloudflare `security-audit-skill` validation).
- [ ] Reviewed and approved by one teammate.