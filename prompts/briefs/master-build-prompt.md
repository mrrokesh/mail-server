# MR ROKESH MAIL — Master Build Prompt

Use this document as the coding-agent project brief. Follow the approval gates and read the accompanying `mrrokesh-Product-Build-Playbook.pdf` before implementation.

MR ROKESH SOFTWARES / PRODUCT ENGINEERING

### MR ROKESH MAIL

Enterprise email & workspace platform Product architecture report and coding-agent master brief

25 November 2026 | Version 1.0 | Proposal for approval Scope: custom-domain email, multi-tenant SaaS, subscriptions, collaboration, security, infrastructure and phased implementation.

Status: planning document. REA installation and live agent verification are pending approval; no production changes have been made.

Prepared from the preceding development proposal and the 12-page MR ROKESH Product Build Playbook. Competitor capabilities are planning references, not a newly verified exhaustive feature or pricing audit.

## 01 / STRATEGY

### Executive recommendation

Build a commercial email hosting platform first, then expand into a productivity suite. Use Microsoft 365 / Exchange as the enterprise functional benchmark and Google Workspace as the collaboration benchmark. Use smaller providers to inform affordable onboarding and subscription packaging.

Do not build SMTP, IMAP or JMAP servers from scratch. Build original webmail, administration, billing, identity and collaboration services around a mature, appropriately licensed mail engine.

### Contents

02 Competitor landscape; 03 Open-source foundation; 04 REA and tool setup; 05 Subscription model; 06-15 Coding-agent master brief; 16 Release roadmap and approval; 17 References.

### Key decisions requiring approval

Mail engine and licensing; deployment location and public IP; subscription pricing and quotas; payment gateway; privacy mode and AI processing; coding-agent identity and REA setup. No production deployment, DNS change or real mailbox migration before approval.

## 02 / RESEARCH

### Competitor landscape

Use these providers as functional references, not as sources of proprietary code or copied branding. Verify current plan-specific features against official documentation before implementation.

Provider                      Capabilities to benchmark

Microsoft 365                 Exchange, Outlook, shared and resource mailboxes, delegation, directory, retention, DLP, eDiscovery, Teams, OneDrive, AI

Google Workspace              Gmail, labels, filters, search, Calendar, Drive, Meet, Chat, collaborative documents, admin, AI

Zoho Mail                     Affordable business email, groups, administration, migration, retention

Proton Mail                   Encryption, key recovery, privacy, secure external sharing

Fastmail                      Aliases, masked email, rules, search, calendar, contacts

Neo / Titan                   Templates, scheduling, follow-up reminders, read receipts, small-business onboarding

Rackspace                     Hosted email, shared calendars, archiving, managed administration

Hostinger / GoDaddy /         Domain integration, simple provisioning, hosting packages, renewals BigRock                       and reseller workflows

## 03 / ARCHITECTURE

### Open-source foundation

Primary candidate: Stalwart Mail Server. Alternative: mailcow or Docker Mailserver. Evaluate actual supported protocols, provisioning APIs, tenant isolation, performance, backup, maintenance, security history, cost and licensing before selection.

Stalwart native multi-tenancy may require Enterprise licensing; confirm current terms and do not assume Community edition supports the proposed hosting model. Review GPL/AGPL and commercial obligations for every dependency, including mailcow, Nextcloud and ONLYOFFICE.

Roundcube is a webmail reference or temporary client. Nextcloud is a storage/collaboration candidate; ONLYOFFICE a document editing candidate; Jitsi a meetings candidate. These are optional, not mandatory dependencies.

### Proposed service layout

Web and mobile clients -> Node.js API -> PostgreSQL application data, Redis/job processing, mail-engine adapter and object storage. The separate mail engine handles mail protocols and delivery. Keep mail content and indexes in supported storage systems rather than forcing all messages into application PostgreSQL.

Use a dedicated mail integration module for domains, mailboxes, authentication, aliases, quotas, submission, retrieval, delivery status and events. Keep administrative credentials server-side.

## 04 / APPROVAL

### REA and development skills

Official REA setup command: npx rea-agents@latest setup

Before executing: identify the coding agent and config location, inspect package provenance and version, show proposed changes, back up configuration, obtain approval, register MCP and install matching instructions. Do not install optional native analysis engines without separate approval. Restart the agent and verify live MCP discovery and a harmless authorized test. Consult official diagnostics and --help for supported commands.

Status: REA source documentation was inspected in the preceding work. Installation is not verified and local configuration has not been changed. The actual coding-agent environment is required to complete this step.

### Proposed skill commands (review before execution)

npx skills add https://github.com/cloudflare/security-audit-skill --skill security-audit

```bash
npx skills add https://github.com/Leonxlnx/taste-skill --skill design-taste-frontend
```

```bash
npx skills add nutlope/hallmark -g
```

Confirm current skill names, Node requirements and installation scope before running. Prefer project-scoped installation when supported. Use Impeccable, getdesign.md and Aura as design references. Use REA only for authorized analysis; public competitor documentation and permitted workflows are preferred.

## 05 / COMMERCIAL MODEL

### Subscription entitlements

Proposed tiers only; prices and quotas require cost modeling and approval. Baseline security is included in every tier.

| Capability | Starter | Business | Pro | Enterprise |
|---|---|---|---|---|
| Custom domain, web/mobile mail | Yes | Yes | Yes | Yes |
| Aliases | Limited | Yes | Yes | Yes |
| Calendar / contacts | Basic | Yes | Yes | Yes |
| Shared mailboxes | No | Yes | Yes | Yes |
| Scheduling | Yes | Yes | Yes | Yes |
| Read receipts | No | Yes | Yes | Yes |
| AI / cloud storage | No | Limited | Yes | Yes |
| Meetings / documents | No | No | Yes | Yes |
| Retention / SSO / SCIM | No | No | Optional | Yes |
| Audit | Basic | Basic | Advanced | Advanced |
| API access | No | Limited | Yes | Yes |
| Custom SLA | No | No | No | Contract |


Implement database-driven plans, versions, seats, entitlements, usage, add-ons, trials, renewals, upgrades, downgrades and suspension. Never rely on frontend gating. TLS, anti-abuse, malware/spam protection, isolation and security updates are baseline requirements.

## 06 / MASTER PROMPT

### A–D. Agent mandate & engineering

You are the principal architect, backend engineer, security engineer, DevOps architect, designer, QA lead and research lead for MR ROKESH MAIL, a product of MR ROKESH SOFTWARES (www.mrrokesh.com). Build a reliable, commercially maintainable multi-tenant custom-domain email and collaboration SaaS. Do not build a UI-only prototype.

Read all 12 pages of mrrokesh-Product-Build-Playbook.pdf. Save this brief as PROJECT_BRIEF.md. Maintain a compliance checklist and document exceptions for approval. Research official provider documentation, pricing, RFCs, OWASP, NIST, GitHub, licenses and security advisories. Record sources, dates, versions and confidence. Separate confirmed, proposed, licensed, experimental and deferred features.

Create docs/research/competitor-matrix.md, feature-inventory.md, provider-pricing.md, open-source-evaluation.md, licensing-review.md and source-register.md. Each feature row records description, competitor, value, complexity, security, tier, dependencies, license and status. Evaluate all eleven providers and the open-source candidates in sections 02–03. Produce an architecture decision record.

### Required monorepo

frontend/ (React, Vite, strict TypeScript, React Router, TanStack Query, Zod); mobile/ (React Native, Expo, Expo Router); backend/ (Node LTS, Fastify or Express, PostgreSQL, Prisma or Drizzle); packages/shared/ (types, API client, errors, tokens); docs/; infrastructure/; tests/. Use pnpm workspaces, README.md, DESIGN.md, CHANGELOG.md and backend/openapi.yaml.

Use versioned REST /api/v1, one API for all application clients. Add durable jobs for provisioning, billing, migration, indexing, scanning, notifications, scheduling, quotas and cleanup. Require idempotency, retries, dead-letter handling and monitoring. Use feature branches, PR review and phase approval.

## 07 / MASTER PROMPT

### E–F. Tenancy & domains

Model platform, organization, domain, identity and mailbox as distinct entities. Support explicit multi-organization memberships and resource-level authorization. Each tenant owns its domains, users, mailboxes, aliases, plan, quotas, roles, settings, billing, policies, retention and integrations.

Enforce tenant isolation across queries, mail engine, storage, search, caches, jobs, exports, backups and audit logs. Test horizontal and vertical escalation and prove tenant A cannot access tenant B resources.

### Domain onboarding

Domain submission and normalization; ownership TXT verification; MX, SPF, DKIM and DMARC instructions and checks; hostname and TLS validation; readiness dashboard; activation and mailbox provisioning. Support manual DNS first and authorized provider integrations later. Prevent duplicate claims, unsafe domain transfers and unauthorized DNS changes.

### Administration

Platform admins: organizations, plans, subscriptions, domains, health, delivery, storage, abuse, security events, billing, support, flags and alerts. Organization admins: users, mailboxes, roles, aliases, groups, policies, quotas, billing, audit and invitations. End users: mailbox, calendar, contacts, settings, MFA, sessions, notifications, signatures and connected apps. Restrict any impersonation to explicit, time-limited, audited workflows.

## 08 / MASTER PROMPT

### G. Email functionality

Core mailbox Inbox, sent, drafts, outbox, spam, trash, archive, starred, important, folders, labels, search, threads, preview, attachments, HTML/plain text, reply, reply all, forward, forward as attachment, rich-text composer, signatures, identities, aliases, filters, rules, shortcuts, responsive layout, dark mode, autosave, scheduled send, undo-send window, vacation replies, sender allow/block and contact autocomplete.

### Processing

MIME and character encodings, size limits, safe HTML rendering, external image blocking, sanitization, content security boundaries, malware scanning, sender authentication, spam classification, bounce and retry status. Never execute arbitrary email HTML or silently load tracking content.

### Business productivity

Templates, snippets, follow-up reminders, snooze, shared inboxes, assigned conversations, internal notes, ownership, shared signatures, tags, delegation, distribution groups, resource bookings and shared calendars. Read receipts must be optional and their privacy and reliability limitations documented.

Every feature must persist real data and operate against a tested backend. Do not simulate delivery or present unsupported recall as guaranteed.

## 09 / MASTER PROMPT

### H–I. Workspace & AI

Calendar: personal/shared calendars, events, recurrence, time zones, invitations, RSVP, resources, availability, reminders, sharing and permissions. Use established scheduling protocols and libraries.

Contacts: personal and organization directories, groups, import/export, search, sharing, deduplication and permissions.

Drive: files, folders, upload/download, versioning, quotas, previews, search, permissions, expiring links, revocation and recovery.

Documents: evaluate licensed collaborative editing; claim only tested format compatibility. Meetings: creation, links, calendar integration, participant controls, history and administration; recordings/transcription require consent and separate infrastructure. Chat: direct messages, channels, files, notifications, search and access controls, outside the critical delivery path.

### AI assistant

Compose, rewrite, summarize, translate, adjust tone, suggest subjects and replies, extract tasks, find messages, summarize threads, draft follow-ups, organize and assist scheduling.

AI must be opt-in or appropriately authorized, subscription-aware and configurable by organization. Treat emails and attachments as untrusted input; defend against prompt injection. Never allow email content to authorize secret disclosure, sending, deletion, exfiltration or billing/policy changes. Recheck backend permissions and require confirmation for external or destructive actions. Minimize retained AI metadata. Document incompatibilities between server-side AI and E2EE.

## 10 / MASTER PROMPT

### J–K. Billing & administration

Create database-driven plans, plan versions, features, entitlements, subscriptions, items, seats, usage, invoices, payments, coupons, trials, billing accounts, taxes, refunds, credit notes and add-ons.

Support monthly and annual billing, per-user pricing, mailbox and storage quotas, upgrades, downgrades, trial conversion, failures, grace periods, renewals, cancellation and billing history. Evaluate Indian recurring-payment and tax requirements and suitable payment gateways.

Verify webhook signatures, protect against replay, use idempotency and transactional state changes. Enforce paid entitlements server-side. Downgrades require quota remediation; failed payments must not trigger immediate irreversible deletion.

### Roles and permissions

Implement least-privilege RBAC plus resource-level authorization. Provide separate platform, organization and end-user experiences as specified in section 07. Log administrative changes and protect privileged workflows with MFA and independent authorization. Document role permissions in the public help guide without exposing internal secrets.

## 11 / MASTER PROMPT

### L. Cybersecurity

Use Cloudflare security-audit skill on authorized code at architecture, major feature, preproduction and release stages. Produce architecture, trust boundaries, coverage ledger, candidate findings, independent validation, confirmed and unresolved findings, remediation evidence and reports. Use isolated test environments. Do not claim perfect security.

### Identity and application security

Follow playbook: NFKC normalization, HMAC-SHA256 server pepper (32+ random bytes), base64, bcrypt cost 12 with unique salt, versioned pepper rotation. Access JWT 15 minutes; refresh 30 days, rotation and reuse detection. HttpOnly secure cookies on web, SecureStore on mobile. MFA/TOTP, passkeys, rate limits, revocation, recovery and suspicious login controls. Review password policy and mail-client authentication compatibility before production.

Protect against injection, XSS, CSRF, SSRF, IDOR, broken access control, privilege escalation, session fixation, traversal, unsafe uploads, malicious attachments, prototype pollution, supply-chain attacks, secret leaks, unsafe deserialization, races and resource exhaustion.

### Mail security

SPF, DKIM, DMARC, ARC where justified, SMTP TLS, MTA-STS/DANE where supported, DNSSEC requirements, anti-open-relay, recipient validation, anti-spoofing, spam and malware scanning, phishing controls, authenticated submission, outbound reputation, quarantine, bounces and complaints.

Encrypt transport and storage; use authenticated encryption and key rotation. Distinguish TLS, at-rest, zero-access and E2EE. Document privacy, audit, retention, export, deletion and restore. Do not claim GDPR, ISO or SOC certification without appropriate evidence. Block release for unresolved critical/high defects; maintain residual risk register.

## 12 / MASTER PROMPT

### M–N. Design & errors

Use the PDF design system: Electric Indigo #5B5BF7, Satoshi headings, Inter body, Lucide icons, light/dark modes, token-only styling, restrained brand accents, calm motion, reduced-motion support, WCAG 2.2 AA. Apply Taste, Hallmark, Impeccable, getdesign.md and Aura as design/review references, not replacements for brand rules. Avoid generic AI aesthetics, fake metrics, excessive gradients and nonfunctional controls.

### Screen inventory

Marketing, pricing, comparison, signup, login, onboarding, domain connection, DNS configuration, mailbox setup, inbox, message detail, compose, search, calendar, contacts, drive, collaboration, AI, personal settings, security settings, organization admin, mailbox admin, domains, subscriptions, billing, platform admin, health, audit, docs and support.

### Error contract

Return { code, message, details } for every API error. Preserve existing playbook codes (API-AUTH-001, API-AUTH-002, API-AUTH-003, API-VAL-001, API-RES-404, API-RATE-429, API-SRV-500, API-SRV-503) and extend with MAIL, DNS, DOMAIN, BILL, QUOTA, SEC, SUB and STORAGE categories. Keep shared registry and documentation synchronized. Never expose stack traces or private data.

Use the PDF's spacing scale, component sizes, typography, contrast, focus and accessibility rules. Review real browser renders and mobile layouts; preserve working handlers during redesign.

## 13 / MASTER PROMPT

### O. Infrastructure & operations

Use Docker Compose for development/staging and approved production manifests. Kubernetes is optional where justified. Separate public web, API, identity, mail, database, cache, storage, jobs, administration and monitoring trust boundaries.

Mail protocols are not ordinary HTTP ingress traffic. Verify public IP, PTR/reverse DNS, SMTP port availability, TLS, DNS and outbound delivery. A home-hosted IP or CGNAT may be unsuitable; evaluate reputable outbound relay or dedicated mail infrastructure. Do not guarantee inbox placement.

Implement health/readiness, resource limits, graceful shutdown, rolling updates, backups, restore, migrations, monitoring, alerting, queue monitoring, capacity planning and incident runbooks. Design for VM restart and power loss; persist critical queues and data.

Model 10, 100 and 1,000 organizations, 10,000 mailboxes and larger scenarios. Estimate message volume, attachments, storage, indexing, network, database, backup and operational cost. Benchmark rather than invent performance numbers. Define recovery objectives and validate them by restoration exercises.

## 14 / MASTER PROMPT

### P–Q. Verification & documentation

Unit tests: auth, passwords, permissions, entitlements, quotas, billing, domain validation, provisioning and retries.

Integration tests: API/database, API/mail engine, SMTP submission, retrieval, delivery lifecycle, billing webhooks, jobs, storage and tenant isolation.

E2E: signup, domain verification, mailbox creation, real send/receive/reply, attachments, plan activation, upgrade/downgrade, suspension, renewal, recovery, MFA and backup restore.

Security tests: cross-tenant access, unauthorized mailbox access, authentication, escalation, XSS, CSRF, SSRF, attachments, SMTP abuse, rate-limit and billing entitlement bypass. Test only authorized environments.

Verify Chrome, Firefox, Safari, Android, iOS, dark mode, responsive layouts, keyboard, screen readers and reduced motion. CI runs lint and tests; no new warnings. Require reviewer approval.

Maintain public /docs and mobile Help from shared Markdown: getting started, features, guides with screenshots, roles, errors, FAQ/support and changelog. Add deployment, recovery, migration, architecture, API and security documentation. Update docs, CHANGELOG.md and openapi.yaml in the same PR. Follow playbook definition of done.

## 15 / MASTER PROMPT

### R–S. Phase gates & first response

Phase 0: research, feasibility, feature matrix, licensing, security, costs and plans. Phase 1: monorepo, frontend/mobile/backend, shared package, PostgreSQL, auth, tokens, docs and CI. Phase 2: approved mail engine, domains, DNS, provisioning, real send/receive and diagnostics. Phase 3: webmail, search, attachments, signatures, filters and aliases. Phase 4: tenants, admin, billing, quotas and suspension. Phase 5: calendar, contacts, shared mailboxes/inboxes and groups. Phase 6: drive, documents, meetings, chat and AI. Phase 7: SSO, DLP, retention, compliance exports and advanced audit. Phase 8: security, performance, restoration, disaster recovery, runbooks and release candidate. Phase 9: approved commercial launch, onboarding, pricing, support and rollback.

### First response required from coding agent

Provide executive architecture, competitor matrix, full feature inventory, mail-engine/license recommendation, isolation design, IAM, threat model, subscription architecture, database entities, infrastructure, deployment requirements, repo layout, screen inventory, API endpoint inventory, milestones, verification strategy, risks and REA setup proposal.

Stop for approval before major implementation and before installing REA. After approval, verify actual installation and active MCP discovery. Do not claim features work without evidence. No live DNS, production deployment, purchases or real migrations without explicit approval.

## 16 / RELEASE PLAN

### Commercial rollout & blockers

R1: reliable custom-domain email, inbox, authentication and domain management. R2: SaaS administration, billing, plans and quotas. R3: shared mailboxes, calendar, contacts, templates and mobile. R4: AI, drive, meetings and document collaboration. R5: enterprise SSO, DLP, eDiscovery and retention.

### Approval checklist

Approve REA setup and target coding agent; choose mail engine after license review; approve infrastructure and public IP/relay strategy; approve initial tier entitlements and cost model; approve payment provider; approve security and privacy design; approve phase 1 scope.

### Outstanding limitations

This report reformats and consolidates the preceding proposal rather than reproducing every sentence verbatim. It does not independently verify every competitor plan, price, repository license or design-tool installation command. No software installation, live mail delivery, security audit or production deployment has been verified. A complete source-backed feature matrix and technical proof of concept remain Phase 0 deliverables. Proposed product name, tiers and architecture are recommendations, not approved decisions.

## 17 / REFERENCES

### Source register

Internal: mrrokesh-Product-Build-Playbook.pdf, 20 November 2026, pp. 1–12. Pages 1–4 define architecture and engineering; pp. 4–6 password security and docs; pp. 6–9 error codes; pp. 9–12 design and definition of done.

Repository references inspected in preceding work: github.com/morluto/rea; github.com/cloudflare/security-audit-skill; github.com/Nutlope/hallmark; github.com/Leonxlnx/taste-skill; github.com/stalwartlabs/stalwart; github.com/mailcow/mailcow-dockerized. REA, Hallmark and Cloudflare README content was retrieved; repository existence alone does not validate all capabilities.

Additional evaluation candidates: github.com/docker-mailserver/docker-mailserver; github.com/roundcube/roundcubemail; github.com/nextcloud/server; github.com/ONLYOFFICE/DocumentServer; github.com/jitsi/jitsi-meet.

Design references: impeccable.style; getdesign.md; www.aura.build. Competitor reference set: Microsoft 365, Google Workspace, Zoho Mail, Proton Mail, Fastmail, Neo, Titan, Rackspace, Hostinger, GoDaddy, BigRock. Current plan-specific documentation and licenses must be checked during Phase 0.
