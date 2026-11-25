# Open-source stack for a multi-tenant custom-domain email and productivity SaaS (as of late November 2026)

Method: repo stats (stars, license SPDX, last push, latest release) were pulled from the GitHub REST API on 2026-11-25/26 (`api.github.com/repos/<owner>/<repo>` and `/releases/latest`); license texts were read from each repo's LICENSE file on raw.githubusercontent.com. The API rate limit (60/hour, unauthenticated) was hit before iRedMail, Kill Bill and ZoneMTA stats could be fetched; those are listed under Gaps. Source URL for each repo row is the GitHub repo page.

## Mail servers: which support multi-domain, multi-tenant management via API, quotas, JMAP, DKIM and spam filtering?

### Takeaway
Stalwart is the only actively developed open-source server that covers JMAP, IMAP, POP3, SMTP, CalDAV, CardDAV and WebDAV plus built-in spam filtering, DKIM/ARC/DMARC, MTA-STS, DANE and PostgreSQL storage in one binary. True multi-tenancy is an Enterprise (SELv2) feature, priced from EUR 2.00 per mailbox per year down to about EUR 0.89 at volume. WildDuck (EUPL-1.2, MongoDB, API-first) is the main Node.js alternative but has no JMAP. Mox (MIT) has excellent standards coverage but is single-organisation and has no JMAP yet. The others (Mailu, mailcow, Mail-in-a-Box, iRedMail) are self-hosting bundles, not SaaS back-ends.

### Cited Findings

**Repository maturity snapshot (GitHub API, 2026-11-25)**

| Project | Lang | License | Stars | Latest release | Last push | JMAP | Notes |
|---|---|---|---|---|---|---|---|
| [Stalwart](https://github.com/stalwartlabs/stalwart) | Rust | AGPL-3.0 + Stalwart Enterprise License v2 | 16,359 | v1.2.0 (2026-11-23) | 2026-11-24 | Yes | All protocols, built-in anti-spam |
| [WildDuck](https://github.com/zone-eu/wildduck) | Node.js | EUPL-1.2 | 2,114 | v1.55.3 (2026-11-02) | 2026-11-25 | No | IMAP/POP3; MongoDB; REST API |
| [ZoneMTA](https://github.com/zone-eu/zone-mta) | Node.js | EUPL-1.2 (LICENSE file) | n/a (rate-limited) | n/a | n/a | n/a | Outbound MTA companion to WildDuck |
| [Mox](https://github.com/mjl-/mox) | Go | MIT | 5,964 | v0.0.17 (2026-08-19) | 2026-10-27 | Planned (roadmap) | Single maintainer-led |
| [Maddy](https://github.com/foxcpp/maddy) | Go | GPL-3.0 | 6,141 | v0.9.8 (2026-11-19) | 2026-11-21 | Not verified | Composable MTA+IMAP |
| [Haraka](https://github.com/haraka/Haraka) | Node.js | MIT | 5,643 | v3.4.2 (2026-11-23) | 2026-11-23 | n/a (SMTP only) | Plugin-based SMTP server |
| [Mailu](https://github.com/Mailu/Mailu) | Python/Docker | MIT | 7,639 | tag 2024.06.74 (published 2026-11-25) | 2026-11-25 | No | Docker bundle (Postfix/Dovecot/Rspamd) |
| [mailcow-dockerized](https://github.com/mailcow/mailcow-dockerized) | PHP/Docker | GPL-3.0 | 13,871 | 2026-11b (2026-11-19) | 2026-11-24 | No | Docker bundle with SOGo + Rspamd |
| [Mail-in-a-Box](https://github.com/mail-in-a-box/mailinabox) | Shell/Python | CC0-1.0 | 15,481 | v77 (2026-09-26) | 2026-11-08 | No | Single-box appliance |

- Stalwart: dual-licensed AGPL-3.0 and SELv2; about 85% of features are AGPL. The Enterprise edition includes multi-tenancy, SCIM provisioning, sharded storage and live telemetry. Sponsors at $5/month or more on OpenCollective get an Enterprise licence — [Stalwart GitHub README](https://github.com/stalwartlabs/stalwart)
- Stalwart protocols: JMAP (Mail, Sieve, WebSocket, Blob, Quotas), IMAP4rev2/rev1, ManageSieve, POP3, SMTP, CalDAV, CardDAV, WebDAV, and Microsoft Exchange protocols (MAPI over HTTP, EWS, ActiveSync) — [Stalwart GitHub README](https://github.com/stalwartlabs/stalwart)
- Stalwart security: DMARC, DKIM, SPF and ARC built into SMTP; DANE, MTA-STS and SMTP TLS reporting supported. Built-in spam filter with rules, statistical and AI classifiers, DNSBL, Pyzor, phishing protection, greylisting and spam traps — [Stalwart GitHub README](https://github.com/stalwartlabs/stalwart)
- Stalwart storage backends: RocksDB, FoundationDB, PostgreSQL, MySQL, SQLite, S3-compatible, Azure, Redis. Web admin covers accounts, domains, groups, queues and logs — [Stalwart GitHub README](https://github.com/stalwartlabs/stalwart)
- Stalwart Enterprise pricing (On-Premise): every licence includes unlimited tenants, domains, lists and aliases; tiered per mailbox per year: EUR 2.00 (25-499), 1.70 (500-999), 1.45 (1,000-4,999), 1.23 (5,000-10,000), 1.04 (10,000-49,999), 0.89 (50,000-99,999), quote above 100,000; minimum 25 mailboxes; only user and group mailboxes billed; cancellation reverts to Community with no data loss. Compliance (retention, legal hold, eDiscovery, journaling) and Lawful Interception are paid add-ons — [Stalwart pricing](https://stalw.art/pricing/)
- WildDuck: "scalable no-SPOF IMAP/POP3 mail server" storing all data, including mail, in sharded and replicated MongoDB; follows Gmail in product design; part of the Zone Mail Suite; JMAP not mentioned — [WildDuck GitHub](https://github.com/zone-eu/wildduck)
- Mox: MIT; SMTP, IMAP4 and webmail; SPF/DKIM/DMARC including DMARC aggregate reports; TLS-RPT in and out; MTA-STS; DANE in and out; per-user Bayesian spam filter plus reputation; web admin plus a simple HTTP/JSON webapi and webhooks; ACME; JMAP on roadmap only; POP3 not planned — [Mox GitHub](https://github.com/mjl-/mox)

### Inferences
- For a SaaS, the management surface matters more than protocol count. Stalwart (REST API + web admin + PostgreSQL) and WildDuck (REST API, Node) are the two that a TypeScript control plane can drive. Mailu, mailcow, Mail-in-a-Box and iRedMail are designed as single-operator appliances, so per-tenant provisioning, billing hooks and quotas would need building on top.
- AGPL-3.0 for Stalwart means that modifications to the server must be offered as source to network users. Running it unmodified behind your own control plane (which talks to it over its API) keeps your TypeScript code separate, but this is a legal judgement to confirm with counsel. SELv2 removes the obligation and is also the only way to get native multi-tenancy, so budget about EUR 2/mailbox/year at small scale.
- EUPL-1.2 (WildDuck, ZoneMTA) is a copyleft licence whose definition of "distribution" includes providing access to the work's functions over a network, so it behaves similarly to AGPL for SaaS. Haraka (MIT) and Mox (MIT) carry no copyleft obligations.
- Mox's 0.0.x versioning and single-maintainer profile make it a poor base for a commercial multi-tenant service, despite strong standards coverage.
- Postfix + Dovecot remains the most proven pairing but requires writing your own provisioning layer (SQL maps), JMAP is absent, and the team must operate two C daemons plus Rspamd. Not recommended for a small Node team.

### Gaps
- iRedMail and Postfix/Dovecot stats were not fetched (API rate limit). iRedMail is generally described as GPL-3.0 with a paid "iRedAdmin-Pro" panel; not verified here.
- Stalwart tenant docs URL (`stalw.art/docs/management/tenants/`) returned 404; per-tenant quota and tenant-admin details were not verified from primary docs, only "unlimited tenants" from the pricing page.
- Stalwart's REST management API is present (`api/v1` directory) but its endpoints were not reviewed.
- Maddy JMAP support and WildDuck quota/DKIM features were not verified on primary pages (WildDuck's README does not mention them).
- Stalwart's jump from 0.x to v1.2.0 by Nov 2026 is from the GitHub API; the 1.0 release notes were not reviewed.

## Anti-spam, antivirus and outbound reputation

### Takeaway
Rspamd (Apache-2.0, release 4.3.1 on 2026-11-22) is the default open-source filter used inside Mailu and mailcow. If Stalwart is chosen, its built-in filter replaces Rspamd and SpamAssassin. Outbound reputation for a new SaaS is better handled by sending through an established relay (smarthost) while dedicated IPs warm up.

### Cited Findings
- Rspamd: Apache License 2.0; 2,579 stars; latest release 4.3.1 (2026-11-22), last push 2026-11-24 — [Rspamd GitHub](https://github.com/rspamd/rspamd), [LICENSE](https://raw.githubusercontent.com/rspamd/rspamd/master/LICENSE.md)
- Stalwart includes rule-based, statistical and AI spam classification, DNSBL, Pyzor, greylisting and spam traps, so no external filter is needed — [Stalwart GitHub](https://github.com/stalwartlabs/stalwart)
- Mox slows down suspicious senders and uses reputation plus per-user Bayesian filtering — [Mox GitHub](https://github.com/mjl-/mox)
- MailChannels publishes material on multi-tenant email deliverability (a commercial outbound relay used by hosting providers) — [MailChannels](https://www.mailchannels.com/multi-tenant-email-deliverability/)

### Inferences
- In a multi-tenant system, one compromised tenant can damage the shared IP reputation for all. Per-tenant outbound rate limits, a separate IP pool for new or trial tenants, and automatic suspension when bounce or complaint rates spike are design requirements, not extras.
- Amazon SES or Postmark as a smarthost for outbound mail gives day-one reputation; Postmark's terms focus on transactional mail, so for user-to-user mailbox traffic SES or a relay built for hosting providers (such as MailChannels) is the more usual fit. Verify each provider's acceptable-use policy for "mailbox provider" traffic before committing.

### Gaps
- SpamAssassin and ClamAV current versions and activity were not fetched. ClamAV is GPL-2.0 (Cisco Talos) as general knowledge, not verified this session.
- No primary source was retrieved for SES or Postmark policies on relaying third-party mailbox traffic, or for IP warm-up schedules (M3AAWG has guidance; not fetched).

## Webmail and clients

### Takeaway
For a React/TypeScript team on Stalwart, Bulwark (Next.js 16 / React 19, AGPL-3.0, JMAP-native, very active) is the closest ready-made web UI and covers mail, calendar, contacts and files. Roundcube (GPL-3.0) and SnappyMail (AGPL-3.0) are mature IMAP webmails. Inbox Zero and Zero (0.email) are AI-assistant layers built for Gmail/Outlook, not webmails for your own server.

### Cited Findings

| Project | Stack | License | Stars | Latest release | Protocol |
|---|---|---|---|---|---|
| [Bulwark Webmail](https://github.com/bulwarkmail/webmail) | Next.js 16, React 19, TS, Tailwind 4, Zustand, Tiptap | AGPL-3.0-only + app-store permission | 1,547 | 1.22.0 (2026-11-25) | JMAP (own RFC 8620 client) |
| [Roundcube](https://github.com/roundcube/roundcubemail) | PHP | GPL-3.0 | 7,298 | 1.7.7 (2026-11-23) | IMAP |
| [SnappyMail](https://github.com/the-djmaze/snappymail) | PHP/JS | AGPL-3.0 | 1,769 | v3.1.4 (2026-11-20) | IMAP |
| [SOGo](https://github.com/Alinto/sogo) | Objective-C | GPL-2.0 (SPDX from API) | 2,189 | 5.12.14 (2026-11-24) | IMAP + CalDAV/CardDAV + ActiveSync |
| [Inbox Zero](https://github.com/elie222/inbox-zero) | Next.js/TS | AGPL-3.0 with additional terms | 13,118 | desktop-v0.1.30 (2026-11-22) | Gmail/Outlook APIs |
| [Zero / Mail0](https://github.com/Mail-0/Zero) | TS | MIT | 10,899 | v0.1 (2025-07-18); last push 2026-11-15 | Gmail-centred |
| [Mailspring](https://github.com/Foundry376/Mailspring) | Electron desktop | GPL-3.0 | 18,031 | 1.26.2 (2026-10-22) | IMAP |

- Bulwark is a self-hosted webmail client for Stalwart; features include threading, unified inbox, full-text search, Sieve filters, S/MIME, templates, scheduled send, calendar (iMIP invitations, CalDAV subscriptions), contacts (vCard), files backed by Stalwart JMAP file storage, SSO/2FA, PWA with web push, plugins, per-domain branding, 27 languages. A "Lite" static build can be served by Stalwart itself. The app-store permission is "provisional until every earlier contributor has agreed" — [Bulwark GitHub](https://github.com/bulwarkmail/webmail), [LICENSE](https://raw.githubusercontent.com/bulwarkmail/webmail/main/LICENSE)
- Inbox Zero's LICENSE is AGPL-3.0 with a section of "Additional terms for Inbox Zero" — [Inbox Zero LICENSE](https://raw.githubusercontent.com/elie222/inbox-zero/main/LICENSE)

### Inferences
- Bulwark under AGPL-3.0-only means any changes you make to the UI (branding, billing banners, tenant admin pages) must be published as source to your users. Practical options: (a) use it, keep modifications in a public fork; (b) build your own React JMAP client (JMAP is plain JSON over HTTPS, RFC 8620/8621) and use Bulwark as a reference only; (c) take the MIT-licensed earlier lineage noted in Bulwark's NOTICE file, if it can be identified.
- Zero (0.email) is MIT but its last tagged release is July 2025 and it is Gmail-oriented; treat it as UI inspiration, not a base.
- Native clients (Thunderbird, Apple Mail, Outlook, iOS/Android mail apps) will reach the service over IMAP/SMTP, CalDAV/CardDAV and, with Stalwart, ActiveSync/EWS; auto-configuration (Autoconfig/Autodiscover) is what makes them work without manual setup.

### Gaps
- Fastmail's JMAP JS libraries and other JMAP web clients were not checked this session.
- Thunderbird JMAP support status not verified.

## Groupware: calendar/contacts, docs, meetings, chat and storage

### Takeaway
Stalwart already provides CalDAV, CardDAV and WebDAV, so a separate Radicale or SabreDAV is unnecessary. For documents, Collabora Online (MPL-2.0) is the friendlier licence for a commercial SaaS than ONLYOFFICE Docs (AGPL-3.0). LiveKit (Apache-2.0) suits a React app for meetings; Jitsi (Apache-2.0) is the full ready-made app. MinIO is archived and must not be chosen for new object storage.

### Cited Findings

| Area | Project | License | Stars | Latest release | Status |
|---|---|---|---|---|---|
| CalDAV/CardDAV | [Radicale](https://github.com/Kozea/Radicale) | GPL-3.0 | 5,256 | v3.9.2 (2026-11-17) | Active |
| CalDAV/CardDAV | [SabreDAV](https://github.com/sabre-io/dav) | BSD-3-Clause | 1,727 | 4.7.1 (2026-07-07) | Active |
| Suite | [Nextcloud server](https://github.com/nextcloud/server) | AGPL-3.0 | 37,632 | v35.0.3 (2026-11-12) | Active |
| Docs editor | [ONLYOFFICE DocumentServer](https://github.com/ONLYOFFICE/DocumentServer) | AGPL-3.0 | 7,167 | v10.0.0 (2026-10-12) | Active |
| Docs editor | [Collabora Online](https://github.com/CollaboraOnline/online) | MPL-2.0 | 3,407 | last GitHub release 25.04.7-mobile (2025-12-05); push 2026-11-21 | Active |
| Video | [Jitsi Meet](https://github.com/jitsi/jitsi-meet) | Apache-2.0 | 30,287 | stable 11509 (2026-11-16) | Active |
| Video | [LiveKit](https://github.com/livekit/livekit) | Apache-2.0 | 22,390 | v1.13.11 (2026-10-25) | Active |
| Chat | [Mattermost](https://github.com/mattermost/mattermost) | AGPL-3.0 source / MIT compiled binaries / commercial | 39,700 | v12.1.0 (2026-11-05) | Active |
| Chat | [Rocket.Chat](https://github.com/RocketChat/Rocket.Chat) | MIT outside `ee/` dirs; proprietary EE | 46,549 | 9.0.0 (2026-11-10) | Active |
| Storage | [MinIO](https://github.com/minio/minio) | AGPL-3.0 | 61,243 | RELEASE.2025-10-15 | **Archived** |
| Storage/sync | [Seafile](https://github.com/haiwen/seafile) | GPLv2 + OpenSSL exception (core repo) | 15,495 | GitHub release v9.0.5 (2024-02); push 2026-11-25 | Active |

- Collabora Online COPYING: "subject to the terms of the Mozilla Public License, v. 2.0" — [Collabora COPYING](https://raw.githubusercontent.com/CollaboraOnline/online/master/COPYING)
- Mattermost: compiled versions from Mattermost, Inc. are MIT; source may be used under AGPL-3.0 (with exceptions) or a commercial licence — [Mattermost LICENSE.txt](https://raw.githubusercontent.com/mattermost/mattermost/master/LICENSE.txt)
- Rocket.Chat: content under `apps/meteor/ee/` and `ee/` uses the EE licence; everything else is MIT (Expat) — [Rocket.Chat LICENSE](https://raw.githubusercontent.com/RocketChat/Rocket.Chat/develop/LICENSE)
- Seafile core: GPLv2 with OpenSSL linking permission — [Seafile LICENSE.txt](https://raw.githubusercontent.com/haiwen/seafile/master/LICENSE.txt)
- MinIO stopped community binaries/Docker images in October 2025, entered maintenance mode on 3 December 2025; repo archived (sources disagree: February vs 25 April 2026; the GitHub API shows `archived: true`, last push 2026-04-24). Main replacements named: Garage (AGPL-3.0), SeaweedFS (Apache-2.0), RustFS (Apache-2.0, considered less proven), Ceph RGW (heavier) — [glukhov.org](https://glukhov.org/data-infrastructure/object-storage/minio-dead/), [InfoQ](https://www.infoq.com/news/2025/12/minio-s3-api-alternatives), [LWN](https://lwn.net/SubscriberLink/1077739/b606371dff81aa58/)
- A Garage user reported it does not support object versioning yet — [Open edX forum](https://discuss.openedx.org/t/replacing-minio-in-tutor-minio-why-we-chose-garage-and-what-comes-next/18868)

### Inferences
- For a small team, managed S3 (AWS S3, Cloudflare R2, Backblaze B2, or an Indian-region provider) avoids running storage at all; Stalwart can store blobs in S3-compatible storage. If self-hosting, SeaweedFS (Apache-2.0) avoids AGPL.
- Nextcloud (AGPL-3.0) is a heavy PHP monolith with its own users and tenancy model; integrating it as "Drive" means two identity systems. Using Stalwart's WebDAV/JMAP file storage plus Collabora via WOPI is lighter.
- Chat is optional for a v1. If needed, Rocket.Chat's MIT core or Mattermost's MIT-licensed compiled binaries are both usable commercially without modification.

### Gaps
- Collabora's GitHub "latest release" tag is a mobile build; server release cadence is published on collaboraonline.com (not fetched). Collabora's and ONLYOFFICE's commercial licence prices for SaaS providers were not retrieved.
- Seafile's server-side (seahub) licence and the newer Seafile 12/13 release line were not checked; GitHub releases appear unused since 2024.

## Security and deliverability standards to implement

### Takeaway
The minimum bar in late 2026 is SPF + 2048-bit DKIM (rotated at least every six months) + DMARC aligned, with DMARC now defined by RFCs 9989/9990/9991 (May 2026). Gmail began rejecting non-compliant mail at SMTP level from November 2025 and Microsoft enforced bulk sender rules on consumer domains from 5 May 2025. Inbound, the platform must evaluate SPF/DKIM/DMARC/ARC, publish MTA-STS and TLS-RPT for every customer domain, and ideally DANE.

### Cited Findings
- Gmail: "Starting in November 2025, Gmail is ramping up its enforcement on non-compliant traffic" with temporary and permanent rejections. Spam rate should stay below 0.1% and never reach 0.3%; spam rate is calculated daily. One-click unsubscribe means the List-Unsubscribe header (RFC 8058); requests must be honoured within 48 hours — [Google sender guidelines FAQ](https://support.google.com/a/answer/14229414)
- Microsoft began enforcing bulk sender requirements (SPF, DKIM, DMARC alignment) on outlook.com, hotmail.com and live.com from 5 May 2025; sources conflict on whether Microsoft mandates one-click unsubscribe — [Microsoft Learn](https://learn.microsoft.com/dynamics365/customer-insights/journeys/requirements-for-bulk-senders), [EasyDMARC](https://easydmarc.com/blog/google-yahoo-microsoft-icloud/)
- The 5,000 messages/day bulk-sender threshold appears in third-party sources; not confirmed on an official page in this session — [Red Sift](https://redsift.com/guides/bulk-email-sender-requirements)
- DMARCbis: on 20 May 2026 the RFC Editor published RFC 9989 (core, Proposed Standard, obsoletes RFC 7489), RFC 9990 (aggregate reporting) and RFC 9991 (failure reporting). `pct=`, `rf=` and `ri=` are deprecated; new `t=` test flag; the Public Suffix List is replaced by a DNS tree walk to find the organisational domain; receivers must send aggregate reports at least daily; backward compatible with RFC 7489 records — [dmarc.org](https://dmarc.org/2026/05/ietf-publishes-updated-dmarc-specification/), [RFC Editor DMARC subject index](https://www.rfc-editor.org/subjects/dmarc/), [PowerDMARC](https://powerdmarc.com/dmarc-rfc-9989/)
- DKIM keys: M3AAWG says rotate at least every six months (earlier guidance was quarterly) — [M3AAWG DKIM Key Rotation](https://m3aawg.org/DKIMKeyRotation), [M3AAWG Implement DKIM BP](https://m3aawg.org/Implement-DKIM-BP). RFC 8301 requires at least 1024-bit, recommends at least 2048-bit, and requires rsa-sha256 — [RFC 8301](https://www.rfc-editor.org/rfc/rfc8301) (as cited by [Suped](https://www.suped.com/learn/dkim/why-is-dkim-key-rotation-recommended-and-what-key-length-is-secure))
- BIMI: requires DMARC at p=quarantine or p=reject (subdomain policy also at enforcement); several sources say Gmail needs pct=100. Gmail accepts a VMC (blue checkmark) or a CMC (logo, no checkmark). Apple Mail requires a VMC (CMC unsupported as of May 2026) or Apple Business Connect "Branded Mail". Outlook had not adopted BIMI as of mid-2026. BIMI guidance is still an IETF draft (draft-brotman-ietf-bimi-guidance-15, May 2026) — [Optimizely](https://support.optimizely.com/hc/en-us/articles/4413200440077), [Valimail](https://support.valimail.com/en/articles/16416172-why-isn-t-my-bimi-logo-showing-up-a-troubleshooting-guide), [IETF draft](https://datatracker.ietf.org/doc/html/draft-brotman-ietf-bimi-guidance), [DigiCert](https://www.digicert.com/blog/bimi-setup-guide-for-vmc-and-cmc)
- Stalwart implements DKIM, SPF, DMARC, ARC, DANE, MTA-STS and TLS reporting natively; Mox additionally generates DMARC aggregate and TLS-RPT reports — [Stalwart](https://github.com/stalwartlabs/stalwart), [Mox](https://github.com/mjl-/mox)

**Standards checklist (RFC references)**

| Standard | RFC / spec | What the SaaS must do per customer domain |
|---|---|---|
| SPF | [RFC 7208](https://www.rfc-editor.org/rfc/rfc7208) | Publish `include:` for your outbound IPs; stay under 10 DNS lookups |
| DKIM | [RFC 6376](https://www.rfc-editor.org/rfc/rfc6376), [RFC 8301](https://www.rfc-editor.org/rfc/rfc8301), Ed25519 [RFC 8463](https://www.rfc-editor.org/rfc/rfc8463) | Per-domain 2048-bit RSA (optionally dual-sign Ed25519); selector-based rotation at least every 6 months |
| DMARC | [RFC 9989](https://www.rfc-editor.org/rfc/rfc9989) / [9990](https://www.rfc-editor.org/rfc/rfc9990) / [9991](https://www.rfc-editor.org/rfc/rfc9991) | Guide tenants from p=none to quarantine/reject; ingest and parse `rua` aggregate XML in a dashboard |
| ARC | [RFC 8617](https://www.rfc-editor.org/rfc/rfc8617) (Experimental) | Seal forwarded/list mail so DMARC survives forwarding |
| MTA-STS | [RFC 8461](https://www.rfc-editor.org/rfc/rfc8461) | Host `mta-sts.<domain>/.well-known/mta-sts.txt` for every tenant domain (needs per-domain TLS cert) |
| TLS-RPT | [RFC 8460](https://www.rfc-editor.org/rfc/rfc8460) | `_smtp._tls` TXT record; ingest reports |
| DANE for SMTP | [RFC 7672](https://www.rfc-editor.org/rfc/rfc7672) | TLSA records on your MX hosts (requires DNSSEC on your zone) |
| One-click unsubscribe | [RFC 8058](https://www.rfc-editor.org/rfc/rfc8058) | Only for bulk/marketing features (newsletters, campaigns) |
| JMAP | [RFC 8620](https://www.rfc-editor.org/rfc/rfc8620) core, [RFC 8621](https://www.rfc-editor.org/rfc/rfc8621) mail, [RFC 8887](https://www.rfc-editor.org/rfc/rfc8887) WebSocket | Web/mobile client API |
| S/MIME, OpenPGP | [RFC 8551](https://www.rfc-editor.org/rfc/rfc8551), [RFC 9580](https://www.rfc-editor.org/rfc/rfc9580) | Client-side; Bulwark already supports S/MIME |

### Inferences
- Because your platform signs and sends for many customer domains, the control plane must automate DNS onboarding: generate SPF/DKIM/DMARC/MTA-STS/TLS-RPT/autoconfig records, verify them by DNS lookup, and block outbound sending until SPF and DKIM pass. This is the largest "build" item regardless of which mail server is chosen.
- Reverse DNS (PTR) must match the HELO name for every outbound IP; this is configured at the hosting provider, not in software.
- Autoconfig (Thunderbird, `autoconfig.<domain>/mail/config-v1.1.xml`) and Autodiscover (Outlook, `autodiscover.<domain>`) need a per-domain HTTPS endpoint; Mox lists autodiscovery as built in, and Stalwart supports both (stated in its docs generally; not verified this session).

### Gaps
- Yahoo's own sender requirements page was not fetched; Yahoo's rules are generally described as aligned with Gmail's (SPF/DKIM, DMARC, one-click unsubscribe, spam rate under 0.3%).
- RFC URLs above are the standard rfc-editor.org locations; their full texts were not re-read this session (RFC 9989-9991 confirmed via the RFC Editor subject index and dmarc.org).
- No official confirmation of the 5,000/day bulk threshold, or of Gmail SMTP 5xx rejections (one secondary source).

## Billing and subscriptions for India

### Takeaway
Use Razorpay Subscriptions for Indian customers (UPI AutoPay, card e-mandates, GST). Stripe in India is invite-only. Lago (AGPL-3.0, very active) or Kill Bill (Apache-2.0) can sit above the payment gateway for usage-based plans (per mailbox, per GB), but a small team can start with Razorpay plans plus its own seat counting in PostgreSQL.

### Cited Findings
- Lago: AGPL-3.0; 10,920 stars; v1.57.0 released 2026-11-05; last push 2026-11-25 — [Lago GitHub](https://github.com/getlago/lago)
- Kill Bill: Apache License 2.0 — [Kill Bill LICENSE](https://raw.githubusercontent.com/killbill/killbill/master/LICENSE)
- Stripe services are invite-only in India; Stripe supports UPI AutoPay through e-mandates but only via Subscriptions, not PaymentIntents/SetupIntents — [Stripe India FAQ](https://support.stripe.com/questions/india-faq), [Stripe India recurring payments](https://docs.stripe.com/docs/india-recurring-payments), [Stripe UPI AutoPay](https://docs.stripe.com/payments/upi/upi-autopay)
- Razorpay: for regular industries, any debit above Rs 15,000 needs the customer to approve via UPI PIN; limits vary by merchant category (MCC); pre-debit notifications go out 24 hours before the debit — [Razorpay UPI AutoPay docs](https://razorpay.com/docs/payments/payment-gateway/s2s-integration/recurring-payments/upi/), [Razorpay UPI FAQ](https://razorpay.com/docs/payments/recurring-payments/upi/faqs?preferred-country=IN)
- Rs 1 lakh without extra authentication applies only to insurance premiums, mutual fund subscriptions and credit card bill payments; pre-debit notice at least 24 hours before debit — [Zoho Payments Academy](https://www.zoho.com/payments/academy/payment-processing/upi-autopay-mandates-and-recurring-debits.html)
- Razorpay's India Billing API lets a merchant keep Stripe for billing/metering while Razorpay executes charges in India with UPI AutoPay, retries and pre-debit notifications, adding 18% GST on the amount debited — [Razorpay Billing API](https://razorpay.com/docs/payments/international-payments/billing-api)

### Inferences
- Email/productivity SaaS plans (for example Rs 50-300 per user per month) fall well under the Rs 15,000 AFA-free threshold, so UPI AutoPay renewals should run without a PIN prompt for nearly all customers except large annual plans.
- Lago being AGPL-3.0 matters only if you modify and expose it; it normally runs as an internal service. Kill Bill (Java, Apache-2.0) is heavier to operate than a small Node team may want.
- GST-compliant tax invoices (GSTIN, HSN/SAC code 998315 or similar for hosting, place of supply, IGST vs CGST+SGST) must be generated by your app or billing layer; neither gateway issues your invoices to your customers for you. (SAC code is general knowledge, verify with a tax adviser.)

### Gaps
- Lago's GST/Indian tax support and Razorpay integration were not verified.
- Kill Bill stars/release date not fetched (API rate limit).
- RBI primary circulars were not read; limits come from Razorpay, Stripe and Zoho docs.

## Recommended stack for a Node/TypeScript + PostgreSQL + React team

### Takeaway
Reuse Stalwart (Enterprise licence for multi-tenancy) as the mail, calendar, contacts and file engine on PostgreSQL + S3, and build the multi-tenant control plane, DNS onboarding, billing and a React/JMAP web app in TypeScript. Send outbound through a relay until your own IPs have reputation.

### Cited Findings
- Stalwart supports PostgreSQL and S3-compatible storage, JMAP/IMAP/SMTP/CalDAV/CardDAV/WebDAV, built-in anti-spam and the full authentication/transport-security set; Enterprise includes unlimited tenants from EUR 2.00/mailbox/year — [Stalwart GitHub](https://github.com/stalwartlabs/stalwart), [Stalwart pricing](https://stalw.art/pricing/)
- Bulwark is a Next.js/React/TypeScript JMAP client already built for Stalwart (AGPL-3.0-only) — [Bulwark GitHub](https://github.com/bulwarkmail/webmail)
- LiveKit and Jitsi are Apache-2.0; Collabora Online is MPL-2.0 — [LiveKit](https://github.com/livekit/livekit), [Jitsi](https://github.com/jitsi/jitsi-meet), [Collabora COPYING](https://raw.githubusercontent.com/CollaboraOnline/online/master/COPYING)
- MinIO is archived; Garage, SeaweedFS or RustFS are the named replacements — [InfoQ](https://www.infoq.com/news/2025/12/minio-s3-api-alternatives)

**Build-vs-reuse map**

| Layer | Recommendation | Licence | Build or reuse |
|---|---|---|---|
| MTA, IMAP, JMAP, POP3, Sieve | Stalwart Enterprise (PostgreSQL metadata, S3 blobs) | SELv2 (or AGPL-3.0 Community) | Reuse |
| Anti-spam / DKIM / ARC / DMARC / MTA-STS / DANE | Stalwart built-in | same | Reuse |
| Calendar, contacts, files (DAV) | Stalwart built-in | same | Reuse |
| Outbound reputation | Relay (Amazon SES or a hosting-oriented relay) as smarthost at launch; own warmed IP pools later | Commercial | Reuse/buy |
| Control plane (tenants, domains, users, plans, quotas, suspension) | Node/TS service on PostgreSQL calling Stalwart's management API | Your code | **Build** |
| DNS onboarding + verification, MTA-STS/autoconfig hosting, DMARC/TLS-RPT report dashboards | Node/TS | Your code | **Build** |
| Web app (mail, calendar, contacts) | Own React + JMAP client (or fork Bulwark and publish modifications under AGPL) | Your code / AGPL-3.0 | Build (or reuse with AGPL obligations) |
| Admin console | React | Your code | **Build** |
| Documents | Collabora Online via WOPI | MPL-2.0 (+ commercial support) | Reuse |
| Meetings | LiveKit (SFU + React SDK) | Apache-2.0 | Reuse + build UI |
| Chat (later) | Rocket.Chat MIT core or Mattermost MIT binaries | MIT | Reuse (optional) |
| Object storage | Managed S3 (or SeaweedFS if self-hosted) | Commercial / Apache-2.0 | Reuse |
| Billing | Razorpay Subscriptions (UPI AutoPay, cards) + own GST invoicing; Lago if usage-based pricing grows | Commercial / AGPL-3.0 | Reuse + build invoices |

### Inferences
- Main risk: Stalwart is effectively single-vendor (Stalwart Labs). Mitigations: Community edition keeps running if the licence lapses (no data loss per pricing page), data lives in your own PostgreSQL/S3, and JMAP/IMAP are open standards, so migration via IMAP sync is possible.
- Node-only alternative if Rust/AGPL is unacceptable: WildDuck (IMAP/POP3, MongoDB) + ZoneMTA + Haraka + Rspamd. This needs MongoDB alongside PostgreSQL, has no JMAP, no CalDAV/CardDAV, and is EUPL-1.2 (network-copyleft), so it saves little on licensing and costs more to build.
- Licence summary for a commercial SaaS: MIT/Apache/BSD/MPL components can be modified privately. AGPL-3.0 and EUPL-1.2 components can be run commercially, but any modified version that users interact with over a network must have its source offered to those users; keep your own code in separate services that talk over APIs. GPL-2.0/3.0 (Roundcube, SOGo, mailcow, Radicale) obligations trigger on distribution, which SaaS hosting generally is not, but confirm with counsel.

### Gaps
- The Stalwart management API was not reviewed endpoint by endpoint, so the effort to build the control plane on it is estimated, not measured.
- No independent production reference (case study) of Stalwart Enterprise at SaaS scale was found in this session.
