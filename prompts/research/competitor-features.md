# Beat Microsoft 365 on price, privacy, simplicity

mrrokesh.com can build a credible Microsoft 365 competitor for India by reusing one open-source engine and building the parts customers actually see. The engine is **Stalwart**, which bundles SMTP, IMAP, JMAP, CalDAV, CardDAV, WebDAV and ActiveSync/EWS with built-in anti-spam in a single binary. Mrrokesh would build the tenant control plane, DNS onboarding, INR/GST billing and its own React and Expo clients. Microsoft sets the feature bar: a **100 GB mailbox, 300 aliases, 150 MB attachments, free 50 GB shared mailboxes and 10,000 recipients a day on every business tier**. But Microsoft holds back its archive, Defender and compliance tooling for Business Premium (about $22), and it spreads administration across many portals. Competitors already beat it in specific places. Zoho sells retention, eDiscovery and S/MIME at ₹199. Proton offers catch-all, zero-access encryption and password-protected external mail. Fastmail has JMAP and masked email. Titan and Neo offer growth tools, and Hostinger and Zoho anchor India's entry prices at ₹29–99. The proposed ladder is Free / ₹69 / ₹149 / ₹349 / from ₹699 per user per month including GST, plus a ₹99 Privacy add-on. It puts Microsoft-grade limits and Premium-grade compliance at roughly a sixth of Microsoft's Indian price. Two decisions shape everything else. Multi-tenancy in Stalwart requires its **Enterprise licence (from EUR 2.00 per mailbox per year)**, and deliverability must be engineered from day one against **DMARC's new RFC 9989** and Gmail's 2025 enforcement. The complete copy-paste MASTER BUILD PROMPT is at the end of this report and is also saved as `reports/MRROKESH_MAIL_PROJECT_BRIEF.md`.

## Eleven suites converge on one tier ladder

Every suite in the notes uses the same three-step pattern. The entry tier is a capped mailbox. The middle tier adds productivity and collaboration. The top tier holds compliance and security back as the upsell. What differs is where each vendor draws the lines and how much it charges.

**Microsoft 365** is the reference because its limits are generous and uniform. Microsoft Learn, updated November 2026, lists a **100 GB primary mailbox on Business Basic, Standard and Premium and on E3/E5**. It lists 50 GB on E1 and Exchange Online Plan 1, and 2 GB on F3 and Kiosk. Every tier shares one sending profile: **10,000 recipients a day, 30 messages a minute, up to 1,000 recipients per message and 300 aliases** (400 on standalone Exchange Online plans) ([Exchange Online limits](https://learn.microsoft.com/en-us/office365/servicedescriptions/exchange-online-service-description/exchange-online-limits)). Attachments reach **150 MB in Outlook desktop and 112 MB on the web**, against a 35 MB default that admins can raise to 150 MB. Shared mailboxes need no licence and hold 50 GB. Archives are **50 GB on Basic and Standard but auto-expand to 1.5 TB on Business Premium, E3/E5 and Exchange Online Plan 2**. A per-tenant external-recipient cap (TERRL) throttles trial tenants to 5,000 external recipients a day and limits `onmicrosoft.com` senders to 100 ([same source](https://learn.microsoft.com/en-us/office365/servicedescriptions/exchange-online-service-description/exchange-online-limits)). USD prices rose on 1 July 2026 to **Basic $7, Standard $14, Premium $22, Microsoft 365 E3 $39 and E5 $60** ([Zation](https://www.zation.io/price-update/); [The Register](https://www.theregister.com/2025/12/05/microsoft_365_prices_up_2026)). heise reports Basic at $7.50 and Premium at $24.50 instead ([heise](https://heise.de/-11103991)). Indian prices come only from resellers, and they disagree. The figures are roughly **₹150–170 for Basic, ₹860 for Standard and ₹1,830 for Premium before 18% GST** ([HostMinute](https://hostminute.com/microsoft-365-price-india/); [hapihhost](https://www.hapihhost.in/blog/ms-office-365-price/)). Treat them as unverified.

**Google Workspace** differs mainly on pooled storage (30 GB, 2 TB and 5 TB on Starter, Standard and Plus), Meet size and Vault, which starts at Business Plus. Prices are **$7, $14 and $22** on annual terms ([Google Knowledge Center](https://knowledge.workspace.google.com/admin/billing/ai-features-and-pricing-updates-for-google-workspace-business-editions?hl=en)). Gmail's sending limits are the same on every paid tier: **2,000 messages and 10,000 recipients a day, 3,000 of them external**, with 500 a day on trials. Attachments stop at 25 MB, or 50 MB on Enterprise Plus ([Gmail sending limits](https://knowledge.workspace.google.com/admin/gmail/gmail-sending-limits-in-google-workspace); [Compare Enterprise editions](https://knowledge.workspace.google.com/admin/getting-started/editions/compare-enterprise-editions?hl=en)). The India storefront shows a new **Base plan at ₹99 with 20 GB, capped at 20 users**, alongside Starter at ₹270 and Standard at ₹1,080. It lists no Business Plus ([workspace.google.com/pricing](https://workspace.google.com/intl/en/pricing.html)). The notes found no second source for Base, and the page does not say whether its prices include GST.

**Zoho** is the price-and-compliance disruptor in India. Prices are per user per month with GST on top: Mail Lite ₹59 (5 GB) or ₹75 (10 GB), Workplace Standard ₹99, **Mail Premium ₹199 with 50 GB and retention, eDiscovery, S/MIME, DLP (beta) and white labelling**, and Workplace Professional ₹399. A Forever Free plan covers 5 users at 5 GB each with no IMAP or POP ([Zoho India pricing](https://www.zoho.com/en-in/mail/zohomail-pricing.html)). Zoho's published limits are stricter than Microsoft's. External sending is throttled dynamically at **50–500 an hour** by reputation, with 150 external recipients per message, 30 aliases, 30 domains and 20 shared mailboxes of 40 GB each ([Zoho limits](https://www.zoho.com/mail/help/adminconsole/rates-and-limits.html)). Zoho hosts Indian customers in **Mumbai and Chennai** ([Analytics India Magazine](https://analyticsindiamag.com/zoho-opens-new-data-centres-in-mumbai-chennai-to-handle-traffic-from-india/)).

**Proton and Fastmail** are the privacy and standards challengers. In March 2026 Proton replaced its business line with **Workspace Standard ($12.99, 1 TB, 15 domains) and Premium ($19.99, 3 TB, 20 domains, retention policies)**. It kept Mail Essentials at $6.99 with 15 GB and 3 domains, and **catch-all is on every business tier** ([Proton business mail pricing](https://proton.me/business/mail/pricing); [Proton Workspace blog](https://proton.me/business/blog/proton-workspace)). Fastmail's business plans run about $3–10 a user, up to **150 GB on Professional with a compliance retention archive**. Masked Email is included on every plan, and the Basic tier deliberately cannot use custom domains ([Fastmail pricing](https://www.fastmail.com/pricing/); [Fastmail help](https://www.fastmail.help/hc/en-us/articles/8033939068815)).

**The host-bundled tier** (Neo, Titan, Hostinger, GoDaddy, BigRock) competes on headline price and growth features. **Neo** lists $2.49, $4.99 and $9.99 for 15, 50 and 100 GB, with sending caps of **500 or 1,000 a day** and metered templates and read receipts on Starter ([Neo pricing](https://www.neo.space/pricing)). Titan, the white-label engine behind GoDaddy and BigRock, does not publish prices. Its own site lists 10, 50 and 100 GB tiers ([Titan](https://titan.email/)). **Hostinger India** advertises ₹29, ₹49 and ₹79 a month on 48-month terms, but **renews at ₹69, ₹119 and ₹179**, about 2.3 times the intro price ([Hostinger India](https://www.hostinger.com/in/business-email)). **BigRock's Titan mailbox costs ₹89 a month** plus taxes for 10 GB and 10 aliases ([WHTop](https://www.whtop.com/plans/bigrock.in/83391)). GoDaddy India's Microsoft 365 resale prices are inconsistent across its own pages ([GoDaddy IN](https://godaddy.com/en-in/business/office-365/selectplan)). **Rackspace** is a cautionary tale. Its mailbox rose from **$2.99 to $10 a month in January 2026**, plus $2 for Email Plus and $6 for archiving ([The Register](https://www.theregister.com/2026/01/20/rackspace_price_changes/)). Hosted Exchange was discontinued after the 2022 ransomware attack ([Dark Reading](https://www.darkreading.com/cyberattacks-data-breaches/rackspace-discontinues-email-service-downed-in-ransomware-attack)). Catch-all and BCC archiving were closed to new setups in 2022 ([Rackspace docs](https://docs.rackspace.com/docs/rackspace-email-feature-changes-and-removal)).

| Suite (tier) | Price per user per month | Mail storage | Attachment | Sending | Aliases | Verified? |
|---|---|---|---|---|---|---|
| Microsoft 365 Business Basic / Standard / Premium | $7 / $14 / $22; India approx. ₹150–170 / ₹860 / ₹1,830 + GST | 100 GB; archive 50 GB / 50 GB / 1.5 TB | 150 MB desktop, 112 MB web | 10,000 recipients/day, 30/min | 300 | USD and limits verified; INR reseller-only |
| Google Workspace Starter / Standard / Plus | $7 / $14 / $22; India Base ₹99, Starter ₹270, Standard ₹1,080 | 30 GB / 2 TB / 5 TB pooled | 25 MB | 2,000 msgs, 10,000 recipients, 3,000 external | 30 (unverified) | Verified except alias count |
| Zoho Mail Lite / Premium; Workplace Std / Pro | ₹59–75 / ₹199; ₹99 / ₹399 + GST | 5–10 / 50; 30 / 100 GB | 30–40 MB, links to 1 GB | 50–500 external/hour | 30 | INR verified; USD third-party |
| Proton Mail Essentials / Workspace Std / Premium | $6.99 / $12.99 / $19.99 | 15 GB / 1 TB / 3 TB | not stated | not stated (Free 150/day) | 10 / 20 / 20 addresses | Verified |
| Fastmail Basic / Standard / Professional | approx. $3 / $5 / $9 annual | 5 / 50 / 100 GB mail | not stated | not stated | not verified | Partly third-party |
| Neo Starter / Standard / Max | $2.49 / $4.99 / $9.99 | 15 / 50 / 100 GB | not stated | 500 / 1,000 / 1,000 per day | included | Conflicting price tables |
| Titan Pro / Premium / Ultra | not published (G2: about $2–2.45) | 10 / 50 / 100 GB | not stated | not stated | included | Prices unverified |
| Hostinger Starter / Standard / Premium (India) | ₹29 / ₹49 / ₹79 intro; ₹69 / ₹119 / ₹179 renewal | 5 / 20 / 50 GB | not published | in hPanel only | 5 / 10 / 30 | Verified |
| BigRock Business (Titan) | ₹89 annual, ₹98 short term, + taxes | 10 GB | not stated | not stated | 10 | Aggregator only |
| GoDaddy Professional Email (Titan) | not retrievable (403) | 1–100 GB across 5 tiers | not stated | not stated | not stated | Search snippet only |
| Rackspace Email | $10 (+$2 Plus, +$6 archive) | 25 GB | 50 MB | not found | not found | Press reports; product pages 404 |

The pattern carries a lesson. **Nobody in the market combines Microsoft's limits, Zoho's compliance pricing, Proton's privacy and India's entry price.** Each incumbent protects its margin by keeping one of those four expensive.

## Take Microsoft's baseline, then the best rival feature

The user's brief sets Microsoft 365 as the main reference, with the most advanced competitor feature taken wherever a rival beats it. The notes support a specific best-of target for each capability. Microsoft wins on raw limits: aliases, attachments, archive size and free shared mailboxes. Rivals win on catch-all, privacy, standards, compliance pricing, admin simplicity and price stability.

| Capability | Microsoft 365 baseline | Who beats it | mrrokesh target |
|---|---|---|---|
| Aliases | 300 per mailbox ([Learn](https://learn.microsoft.com/en-us/office365/servicedescriptions/exchange-online-service-description/exchange-online-limits)) | Nobody on count; Proton and Fastmail add masked aliases ([Fastmail](https://www.fastmail.com/pricing/)) | 300 on Business, 400 on Enterprise, plus masked aliases |
| Catch-all | Not in the notes for Microsoft | Proton on all business tiers ([Proton](https://proton.me/business/mail/pricing)); Neo on all tiers ([Neo](https://www.neo.space/pricing)) | Every paid tier |
| Attachments | 150 MB desktop, 35 MB default | Zoho huge attachments to 1 GB, WorkDrive 10 GB uploads ([Zoho](https://www.zoho.com/en-in/mail/zohomail-pricing.html)) | 150 MB native on Business Plus, Drive links to 10 GB |
| Archive | 1.5 TB auto-expanding, only from Premium | Nobody larger; Fastmail and Zoho put archives at lower prices | Auto-expanding archive on Business Plus at ₹349 |
| Compliance (retention, eDiscovery, S/MIME) | Business Premium / E-plans | Zoho Mail Premium at ₹199 + GST | Business Plus |
| Sending | 10,000 recipients/day, 30/min, TERRL tenant cap | Google adds a hard 3,000 external cap ([Gmail limits](https://knowledge.workspace.google.com/admin/gmail/gmail-sending-limits-in-google-workspace)) | Microsoft volume plus Google's external cap |
| Encryption | Purview Message Encryption, 100 MB ([Learn](https://learn.microsoft.com/en-us/office365/servicedescriptions/exchange-online-service-description/exchange-online-limits)) | Proton zero-access storage, E2EE, SRP login, 28-day password-protected mail ([Proton support](https://proton.me/support/password-protected-emails)) | Privacy add-on |
| Protocols | EWS, MAPI, ActiveSync, IMAP | Fastmail-led JMAP ([jmap.io](https://jmap.io/)) | JMAP + IMAP + CalDAV/CardDAV + ActiveSync/EWS via Stalwart |
| Admin | Many consoles (unverified product knowledge) | Google's single console (unverified product knowledge) | One console, including partner view |
| AI | Copilot Chat free; full Copilot paid ([Microsoft blog](https://microsoft.com/en-us/microsoft-365/blog/2025/12/04/advancing-microsoft-365-new-capabilities-and-pricing-update)) | Gemini across apps on Google Standard; Titan inbox agents ([Titan](https://titan.email/)) | Writing on Starter, agents on Business Plus |
| Meetings | Teams (participant limits unverified) | Google Meet 100 / 150 / 500 / 1,000 ([Compare Business editions](https://knowledge.workspace.google.com/admin/getting-started/editions/compare-business-editions?hl=en)) | 50 / 150 / 300 / 1,000 |
| Price stability | Raised July 2026 | Proton's no-annual-increase pledge ([Proton](https://proton.me/business/blog/proton-workspace)) | Same-price renewal pledge |
| Reseller | CSP programme (not researched) | Zoho: up to 35% margin, WHMCS and cPanel modules ([Zoho partners](https://www.zoho.com/workplace/web-hosting-provider-partnership.html)) | Partner console, API, WHMCS |

Security gating needs the most care. From July 2026, Microsoft gives Basic, Standard and E1 lightweight **"URL checks"**. It gives E3 Defender for Office 365 Plan 1, and Business Premium already bundles Defender, Entra ID P1 conditional access and Intune ([Microsoft 365 blog](https://microsoft.com/en-us/microsoft-365/blog/2025/12/04/advancing-microsoft-365-new-capabilities-and-pricing-update); [Business Premium FAQ](https://learn.microsoft.com/microsoft-365/admin/security-and-compliance/m365bp-security-faq)). Google puts Vault on Business Plus. It puts S/MIME and client-side encryption on Enterprise Plus only ([Compare Enterprise editions](https://knowledge.workspace.google.com/admin/getting-started/editions/compare-enterprise-editions?hl=en)). The sensible copy is Microsoft's own 2026 move: **basic click-time URL checks on the cheap tier**, with sandboxing and attack simulation kept for the top tiers.

The host-bundled players teach a different lesson. Neo and Titan meter templates, contact groups and read receipts on entry tiers, at 1, 1 and 10–50, to force upgrades ([Neo pricing](https://www.neo.space/pricing)). An unmetered Starter undercuts that tactic directly. Rackspace's removal of catch-all, split routing and admin-set auto-replies left gaps that cost little to fill ([Rackspace docs](https://docs.rackspace.com/docs/rackspace-email-feature-changes-and-removal)).

## A ₹69–349 ladder undercuts every incumbent tier

The proposed tiers are priced including 18% GST, which no competitor in the notes displays by default. Each tier sits just under the nearest incumbent it replaces, while matching or beating that incumbent's limits.

| | Free | Starter | Business | Business Plus | Enterprise | Privacy add-on |
|---|---|---|---|---|---|---|
| ₹ incl. GST, annual (month-to-month) | 0 | 69 (85) | 149 (179) | 349 (419) | from 699 | 99 (119) |
| Users | 5 | 300 self-serve | 300 self-serve | 300 self-serve | unlimited | per user |
| Mail / drive | 5 GB shared | 15 GB / 5 GB | 50 GB / 50 GB | 100 GB + 1.5 TB archive / 1 TB | 100 GB + 1.5 TB / 5 TB pooled | n/a |
| Native attachment / link | 25 MB / none | 50 MB / 1 GB | 100 MB / 5 GB | 150 MB / 10 GB | 150 MB / 10 GB | n/a |
| Per day: messages; recipients (external) | 100; 300 (100) | 500; 2,000 (1,000) | 2,000; 10,000 (3,000) | 2,000; 10,000 (3,000) | custom | n/a |
| Aliases / domains | 5 / 1 | 50 / 3 | 300 / 10 | 300 / 50 | 400 / unlimited | unlimited masked |
| Unlocks | Mail, Calendar, Contacts, Tasks/Notes, web + app | + IMAP/SMTP, catch-all, booking page, Meet 50, AI basic | + Drive, Docs, Meet 150, shared mailboxes, group inbox, ActiveSync, Chat (v2) | + archive, retention, eDiscovery, hold, journaling, S/MIME, DLP, SSO/SCIM, device controls, AI agents | + BYOK, SIEM, attack simulation, dedicated IP, SLA | E2EE, zero-access storage, privacy dashboard |

Each tier answers a named competitor:

- **Starter at ₹69 (₹58.47 before GST).** Zoho Mail Lite works out at about ₹70 once GST is added, for 5 GB, and Hostinger renews its 5 GB Starter at ₹69 ([Zoho](https://www.zoho.com/en-in/mail/zohomail-pricing.html); [Hostinger](https://www.hostinger.com/in/business-email)). Starter offers three times that storage, plus catch-all and IMAP.
- **Business at ₹149.** This costs about ₹32 more than Zoho Workplace Standard with GST (about ₹117), but Zoho gives only 30 GB of mail, a 10 GB drive and 30 aliases. It is well under Microsoft Basic with GST (about ₹177–201) and Google Starter (₹270 before any tax). Business brings Microsoft's 300 aliases and free shared mailboxes.
- **Business Plus at ₹349.** This tier carries the commercial argument. It undercuts Zoho Workplace Professional (about ₹471 with GST) and gives Microsoft Business Premium's auto-expanding archive and compliance set, which costs about ₹2,159 with GST through resellers.
- **Free at 5 users, web and app only.** This mirrors Zoho's Forever Free, which also withholds IMAP and POP. It holds external sending near Proton Free's 150 a day ([Proton](https://proton.me/mail/pricing?product=business)), because free SMTP access is the classic spam vector.
- **Sending limits.** These copy the anti-abuse norms the incumbents use: Google's 500-a-day trial cap and 3,000 external cap, Microsoft's 30 a minute and Neo's 500 a day on entry tiers.
- **Monthly billing at about 20% more than annual.** This matches both Microsoft resellers and Zoho ([Cloudfy](https://www.cloudfysystems.com/blog/microsoft-365-pricing-plans-india)).

Unit economics look workable at the licence layer and uncertain everywhere else. Stalwart Enterprise costs **EUR 2.00 per mailbox per year at 25–499 mailboxes**, about EUR 0.17 a month, and only user and group mailboxes are billed ([Stalwart pricing](https://stalw.art/pricing/)). That is small against a ₹58 net Starter price. Storage, outbound relay, AI inference and support costs were not researched and must be modelled before these prices are published. The **AI quotas (50 and 300 actions a day) and the ₹199 AI Pro add-on are proposals with no cost basis in the notes**.

Billing should run on **Razorpay Subscriptions with UPI AutoPay**. Stripe in India is invite-only ([Stripe India FAQ](https://support.stripe.com/questions/india-faq)). Razorpay requires a UPI PIN only for debits above ₹15,000 and sends pre-debit notices 24 hours ahead ([Razorpay UPI AutoPay](https://razorpay.com/docs/payments/payment-gateway/s2s-integration/recurring-payments/upi/)), so per-seat renewals at these prices should go through without friction. GST tax invoices must come from mrrokesh's own code, and the SAC code needs a tax adviser.

## Stalwart plus a TypeScript control plane is the shortest path

Among the open-source mail servers the notes compared, **Stalwart (Rust, 16,359 GitHub stars, v1.2.0 released 23 Nov 2026)** is the only actively developed one that covers JMAP, IMAP4rev2, POP3, SMTP, CalDAV, CardDAV, WebDAV and Exchange protocols (MAPI, EWS, ActiveSync) in one product. It has built-in DKIM, ARC, DMARC, MTA-STS, DANE and TLS reporting, a spam filter combining rule-based, statistical and AI classifiers, and PostgreSQL and S3 backends ([Stalwart GitHub](https://github.com/stalwartlabs/stalwart)). The licence is the catch. Stalwart is dual-licensed AGPL-3.0 and SELv2, and **multi-tenancy, SCIM and sharded storage are Enterprise-only** ([same](https://github.com/stalwartlabs/stalwart)). Compliance features (retention, legal hold, eDiscovery, journaling) and lawful interception are paid add-ons on top ([Stalwart pricing](https://stalw.art/pricing/)). That matters because Business Plus is built on exactly those features. The notes do not give the add-on prices. Cancelling the licence reverts to Community "with no data loss". Even so, Stalwart Labs is effectively a single vendor, and the notes found **no independent SaaS-scale case study**.

The alternatives are weaker for this team. **WildDuck plus ZoneMTA** is Node-native but needs MongoDB, has no JMAP or DAV, and uses EUPL-1.2, a network-copyleft licence that behaves much like AGPL for a SaaS ([WildDuck](https://github.com/zone-eu/wildduck)). **Mox** (MIT) has excellent standards coverage, but it serves a single organisation and is at v0.0.17 ([Mox](https://github.com/mjl-/mox)). Mailu, mailcow and Mail-in-a-Box are appliances built for one operator.

| Layer | Choice | Licence implication |
|---|---|---|
| Mail/DAV engine | Stalwart Enterprise, unmodified | SELv2 removes AGPL duties and unlocks tenants; AGPL Community lacks multi-tenancy |
| Webmail | Own React JMAP client | Bulwark is JMAP-native and polished, but **AGPL-3.0-only**, so modifying it would force publishing source ([Bulwark](https://github.com/bulwarkmail/webmail)); use it as a reference only |
| Docs | Collabora Online via WOPI | **MPL-2.0**, file-level copyleft; ONLYOFFICE is AGPL-3.0 ([Collabora COPYING](https://raw.githubusercontent.com/CollaboraOnline/online/master/COPYING)) |
| Meet | LiveKit | Apache-2.0 ([LiveKit](https://github.com/livekit/livekit)) |
| Chat | Rocket.Chat MIT core or own | Code in `ee/` folders is proprietary ([Rocket.Chat LICENSE](https://raw.githubusercontent.com/RocketChat/Rocket.Chat/develop/LICENSE)) |
| Object storage | Managed S3 in India or SeaweedFS | **MinIO is archived**; its community binaries stopped in Oct 2025 ([InfoQ](https://www.infoq.com/news/2025/12/minio-s3-api-alternatives)); Garage reportedly lacks versioning ([Open edX forum](https://discuss.openedx.org/t/replacing-minio-in-tutor-minio-why-we-chose-garage-and-what-comes-next/18868)) |
| Billing | Razorpay + own GST invoices; Lago later | Lago is AGPL-3.0; run it unmodified and internal ([Lago](https://github.com/getlago/lago)) |

All of these licence readings are engineering judgements. They need counsel's sign-off before launch.

**The roadmap follows the gating logic of the tiers.** The **MVP** ships what Free, Starter and Business need to sell:

- the control plane (tenants, users, groups, shared mailboxes, plans and quotas)
- DNS onboarding through Cloudflare and Domain Connect
- webmail with calendar and contacts
- the Expo mail app with push
- IMAP import
- Razorpay with GST invoices
- sending limits and abuse controls
- MFA with passkeys, and an audit log

**v1** adds Drive, Collabora Docs, LiveKit Meet, booking pages, tasks and notes, and AI writing. It also adds the Business Plus compliance set (archive, retention, eDiscovery, hold, journaling, S/MIME, transport rules), SSO/SCIM, ActiveSync/EWS, DMARC and TLS-RPT dashboards, the partner console, a Hindi UI and warming of mrrokesh's own IP addresses. **v2** brings:

- chat
- the Privacy add-on (end-to-end encryption and zero-access storage)
- Enterprise controls (BYOK, SIEM export, attack simulation, sandboxing, DLP)
- inbox agents
- WHMCS and cPanel modules, and white labelling
- static sites and the campaigns add-on

The order puts deliverability and tenancy, the hardest problems to retrofit, into the first release.

## Deliverability and isolation are the real product

A shared-IP multi-tenant mail service fails when one tenant's spam poisons everyone's reputation, so the security design starts outbound. **Gmail began rejecting non-compliant traffic at SMTP from November 2025.** It wants senders' spam rate **below 0.1% and never at 0.3%**, and one-click unsubscribe honoured within 48 hours ([Google sender guidelines](https://support.google.com/a/answer/14229414)). Microsoft has enforced SPF, DKIM and DMARC alignment for bulk mail to Outlook.com since 5 May 2025 ([Microsoft Learn](https://learn.microsoft.com/dynamics365/customer-insights/journeys/requirements-for-bulk-senders)). **On 20 May 2026 DMARC was republished as RFC 9989 (core), 9990 (aggregate) and 9991 (failure reports)**, replacing RFC 7489. The new version deprecates `pct`, `rf` and `ri`, adds a `t=` test flag and replaces the Public Suffix List with a DNS tree walk ([dmarc.org](https://dmarc.org/2026/05/ietf-publishes-updated-dmarc-specification/)). M3AAWG now advises rotating DKIM keys **at least every six months** ([M3AAWG](https://m3aawg.org/DKIMKeyRotation)), and RFC 8301 recommends keys of at least 2048 bits ([RFC 8301](https://www.rfc-editor.org/rfc/rfc8301)).

The per-domain checklist is concrete:

- **SPF** (RFC 7208) under 10 lookups.
- **DKIM**: 2048-bit RSA, optionally dual-signed with Ed25519 (RFC 8463).
- **DMARC**: guided from p=none to reject, with aggregate reports ingested.
- **ARC** (RFC 8617) for forwarded mail.
- **MTA-STS** (RFC 8461): needs a hosted policy and a TLS certificate for every tenant domain.
- **TLS-RPT** (RFC 8460) ingestion.
- **DANE** (RFC 7672) on mrrokesh's own MX hosts, with DNSSEC.
- **PTR** matching HELO on every outbound IP.
- **BIMI** only after DMARC enforcement. Gmail accepts a VMC or CMC certificate, Apple needs a VMC, and Outlook does not display BIMI ([Valimail](https://support.valimail.com/en/articles/16416172-why-isn-t-my-bimi-logo-showing-up-a-troubleshooting-guide); [DigiCert](https://www.digicert.com/blog/bimi-setup-guide-for-vmc-and-cmc)).

Outbound controls follow the incumbents' anti-abuse playbook. Microsoft throttles trial tenants and points bulk senders to a separate product, and Zoho bans bulk sending from mailboxes and sells its CPaaS service separately ([Zoho limits](https://www.zoho.com/mail/help/adminconsole/rates-and-limits.html)). So the platform blocks sending until SPF and DKIM pass, enforces published per-user and per-tenant limits, and keeps trial and free tenants on a separate IP pool. It automatically holds mail on spikes in bounces or complaints, and it sells campaign mail as a separate add-on. At launch, outbound goes through a commercial smarthost while mrrokesh's own IPs warm up. The notes did not verify which relays accept user-to-user mailbox traffic ([MailChannels](https://www.mailchannels.com/multi-tenant-email-deliverability/)).

Inside the platform, the required controls are:

- tenant_id with **PostgreSQL row-level security**, one Stalwart tenant per customer and per-tenant envelope keys
- tenant-scoped caches, search indexes, exports and backups
- the playbook's **bcrypt cost-12 + salt + HMAC-SHA256 pepper** for passwords
- revocable app passwords for IMAP and SMTP
- TOTP and passkeys, with admin-enforced MFA
- AES-256-GCM for readable secrets such as DKIM private keys and registrar tokens
- append-only audit logs that operators cannot switch off
- encrypted point-in-time backups with quarterly restore drills

HTML email rendering is the largest client-side attack surface. Sanitise server-side, then render in a sandboxed iframe with a strict CSP and proxied images. AI features turn every inbound message into a possible prompt-injection payload, so agents never send, forward, delete or book without user confirmation.

The **Privacy add-on** follows Proton's architecture. Proton uses OpenPGP keys per address, with the private key encrypted client-side, and encrypts inbound mail on arrival ("zero-access"). It uses SRP login and password-protected external mail with a 28-day cap ([Proton support](https://proton.me/support/messages-encrypted-via-bridge); [password-protected email](https://proton.me/support/password-protected-emails)). The cost is real: server-side search, body rules and plain IMAP all break, which is why Proton built Bridge. There is also a **conflict with playbook rule 6**. SRP or OPAQUE login means the server never holds a bcrypt hash of the password. The brief therefore keeps rule 6 for login, derives encryption keys separately on the client, and makes SRP/OPAQUE a v2 option that needs a written playbook exception.

**The Cloudflare security-audit skill is the review gate.** Its default guidance mode runs on every security-relevant PR. The full six-phase audit (reconnaissance, coverage-led hunting, fresh-verifier validation, schema-checked `findings.json`, independent verification, report) runs at the end of each phase, with output kept outside the repo ([security-audit README](https://github.com/cloudflare/security-audit-skill)). A release is blocked while any **confirmed critical or high** finding is open. Cross-tenant read or write is anchored as high in the skill's own severity scale. The companion areas to prioritise are tenant isolation and data lifecycle, web protocol and auth, client-side rendering, queues and webhooks, AI/LLM, and resource exhaustion. The skill never probes live services, so it complements penetration testing of staging rather than replacing it. Legal review of India's data-protection, retention and lawful-interception duties is outside the notes and must happen before launch.

## Lock DESIGN.md before any design skill runs

Each design skill flags part of the brand by default, and each defers to an explicit design system. So the first artefact is a **nine-section DESIGN.md** in getdesign.md's format, which runs from visual theme through to an agent prompt guide ([awesome-design-md](https://github.com/VoltAgent/awesome-design-md)). It encodes the playbook's Electric Indigo #5B5BF7, Satoshi + Inter, Lucide icons and the token tables verbatim. Hallmark says plainly that "a locked system wins over a fetched guess", and that the user's palette instructions always win ([Hallmark brand-truth](https://github.com/Nutlope/hallmark/blob/main/skills/hallmark/references/brand-truth.md)). Taste Skill bans violet and lavender, but it takes client colours through its brand path, so the brief must say the palette is fixed and never re-dealt ([Taste SKILL.md](https://github.com/Leonxlnx/taste-skill/blob/main/skills/taste-skill/SKILL.md)). Impeccable's first checks police anything "outside DESIGN.md", which makes it the natural enforcer for the app UI ([impeccable.style/slop](https://impeccable.style/slop)).

The real conflicts are between the playbook and the skills, not between the skills and the brand colour. The playbook's **solid #5B5BF7** passes every tool, as long as there are no indigo-to-violet or blue gradients and no gradient text. Gradients are a never-waivable Hallmark Floor, and Impeccable calls them an "AI color palette". The remaining conflicts:

| Playbook rule | Skill rule it hits | Resolution |
|---|---|---|
| **brand-glow** (20% opacity, 80 px blur) | Hallmark Reflex 29 (glows) and Impeccable's "radial halo" ([gates.md](https://github.com/Nutlope/hallmark/blob/main/skills/hallmark/references/gates.md)) | Marketing hero only, waived on the record |
| Brand colour on **up to 10% of a screen** | Hallmark's accent check fails above 8% | Aim for about 5% on marketing pages; keep the playbook's 10% inside the app |
| Example button text "**Get started**" | Hallmark Floor 19 bans it (and em dashes) | Use verb + object labels such as "Add domain" |
| **Scroll reveals** (fade + 24 px slide) | Taste Skill bans fade-in on scroll | Marketing pages only, never in the mail client |
| **Frosted nav bar** | Impeccable flags glassmorphism used everywhere | One glass surface is acceptable |
| **Inter** for body text | Impeccable flags it as an overused font | Accepted brand decision; Hallmark only flags Inter as a display face, so Satoshi display + Inter body passes |
| Pure #FFFFFF and #000000 backgrounds | Hallmark Floor 7a | Passes, because the colours sit inside tokens |

Tool routing follows from what each tool produces:

- **Hallmark** emits self-contained HTML pages, and **Taste Skill** targets marketing sites. Use one of them per marketing page, then rebuild the output as React + Vite components built from tokens.
- **Impeccable** (critique, audit, polish) reviews the webmail, admin and mobile UI.
- **Aura** is a hosted AI page builder with unverified pricing and output licensing ([Product Hunt](https://www.producthunt.com/products/aura-build-2)). Use it for landing-page ideation only.
- The notes found no evidence of how these skills interact when several are installed together, so the precedence order is written into the brief: playbook, then DESIGN.md, then skill defaults.

**REA is limited to lawful uses.** It is an MIT-licensed MCP server for reverse engineering binaries, JavaScript and Electron apps, and websites. Its disclaimer covers lawful research, interoperability and software "you own or are authorized to examine". It rules out copying proprietary code or assets and bypassing access controls or bot protection ([REA DISCLAIMER](https://github.com/morluto/rea/blob/main/DISCLAIMER.md)). For this product, REA's job is to compare mrrokesh's own webmail bundles across releases, find leaked secrets and regressions, and capture mrrokesh's own staging app as a test environment. Competitor web clients are covered by copyright and their terms of service, so any analysis beyond ordinary browsing waits for legal review. Notes from it record patterns, never code, text, icons or assets.

## Conclusion

The opening is narrower and more defensible than "a cheaper Microsoft". The incumbents price their four expensive capabilities separately. Microsoft gates archive and compliance behind Premium. Zoho gates them at ₹199 but caps limits. Proton sells privacy at Workspace prices. Hosts sell cheap first terms and then reprice, as Rackspace and Hostinger renewals show. A ₹349 Business Plus tier with an auto-expanding archive, eDiscovery and S/MIME is the plan most likely to win switchers. A published Limits page and a same-price renewal pledge are cheap trust signals that no Indian host currently offers. Deliverability is what decides whether the product works at all.

The biggest risks are concentration and cost, not features. Stalwart's Enterprise licence and paid compliance add-ons are a single-vendor dependency at the exact layer Business Plus depends on. Storage, relay and AI costs were not researched, and Indian Microsoft prices and Google's Base plan rest on single or reseller sources. Before committing to the price table, mrrokesh should obtain Stalwart's add-on pricing and a reference customer, model storage and AI costs per tier, confirm the licence readings with counsel, and verify Microsoft India's official prices.

## Master build prompt (copy-paste)

The block below is identical to `D:/Website/Book E-Commerce/reports/MRROKESH_MAIL_PROJECT_BRIEF.md`. Paste it into the coding agent, or save it as `PROJECT_BRIEF.md` in the repo root. The tier prices, AI quotas and trial limits inside it are proposals, and unverified competitor figures behind them are flagged in the report above.

````text
You are building mrrokesh Mail (working name) for mrrokesh.com.

GOAL
- What it does: A multi-tenant, subscription business email and productivity suite on the customer's own domain (mail, calendar, contacts, tasks/notes, drive, docs, meet, chat, booking pages, admin console), priced in INR with GST, using Microsoft 365 as the main feature reference and adopting the stronger competitor feature wherever one beats Microsoft.
- Who uses it: customers (end users with a mailbox), staff (tenant admins, billing admins, helpdesk, compliance admins), admins (mrrokesh.com platform operators, abuse desk) and partners (resellers who manage many customer tenants).
- Platforms: Web + Android + iOS.

ARCHITECTURE (do not change without approval)
- /frontend  -> React + Vite + TypeScript (website)
- /mobile    -> React Native (Expo) + TypeScript (Android + iOS)
- /backend   -> Node.js + Express/Fastify + TypeScript (REST API, one API for all clients)
- /packages/shared -> shared types, API client, error codes, design tokens
- Database: PostgreSQL. Auth: JWT access + refresh tokens.

Mail-specific notes on the architecture (these do not change the four folders above):
- /frontend holds three surfaces as feature folders: the public marketing site and /docs, the webmail app (mail, calendar, contacts, tasks, drive, booking), and the admin and partner consoles.
- /backend is the control plane: tenants, domains, users, plans, quotas, billing, DNS onboarding, abuse controls, audit. It is the only thing that talks to the mail engine, the document server and the meeting server, over their APIs.
- Clients read and write mail through /backend, which proxies or brokers JMAP (RFC 8620/8621) sessions to the mail engine. The JMAP client lives in /packages/shared so web and mobile share it.
- PROPOSED ADDITION, NEEDS APPROVAL: an /infra folder with docker-compose (local) and deployment manifests for the supporting services below. Do not create it until I approve.
  - Mail engine: Stalwart (SMTP, IMAP, POP3, JMAP, CalDAV, CardDAV, WebDAV, ActiveSync/EWS, built-in spam filter, DKIM/ARC/DMARC/MTA-STS/DANE), on PostgreSQL metadata + S3-compatible blob storage. Multi-tenancy requires the Stalwart Enterprise licence (SELv2); run it unmodified.
  - Documents: Collabora Online (MPL-2.0) via WOPI.
  - Meetings: LiveKit (Apache-2.0) SFU with our own React/React Native UI.
  - Chat (v2): Rocket.Chat MIT core or our own service on PostgreSQL.
  - Object storage: managed S3 in an India region (or SeaweedFS, Apache-2.0, if self-hosted). Never MinIO (archived).
  - Outbound relay: a commercial smarthost at launch, own warmed IP pools later.
  - Billing: Razorpay Subscriptions; our own GST invoice generator.
- Licence rule: never copy AGPL code (for example Bulwark webmail, Inbox Zero) into our repositories. Our webmail is our own React JMAP client. Any AGPL service we run must stay unmodified, or its modified source must be published; ask me before modifying one.

RULES
1. Follow the mrrokesh.com Product Build Playbook (design system, folder layout, error codes).
2. Every API error returns { code, message, details } with a code from the error tables.
3. Every screen uses design tokens only - no hard-coded colors, fonts or spacing.
4. Every feature updates /docs (user guide) and CHANGELOG.md in the same pull request.
5. Write tests for business logic; no secrets in code (.env only, .env.example committed).
6. Passwords: bcrypt (cost 12) + per-user salt + server-side pepper (HMAC-SHA256), exactly as in the playbook's password security section.

Rule 6 reference implementation (backend/src/modules/auth/password.ts):

```ts
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

Password rules: NFKC normalise, 8 to 128 characters; store only the $2b$12$ string plus pepper_version; rotate the pepper as v2 while keeping v1 until each user logs in again; wrong email and wrong password both return API-AUTH-001; login is rate-limited (API-RATE-429); never log, email or return a password or hash. IMAP/SMTP/CalDAV clients never use the account password: they use per-device app passwords, stored with the same bcrypt + pepper scheme and revocable. Data that must be read back (DKIM private keys, registrar API tokens, partner API keys, phone numbers) is encrypted with AES-256-GCM using a key separate from the pepper, held in a secret manager. Privacy add-on keys follow the PRIVACY section below; any SRP/OPAQUE login is a playbook exception that needs my written approval first.

FIRST TASK
- Scaffold the three folders, shared package, linting, and a /docs page.
- Then list the screens and API endpoints you plan, and wait for my approval.
- Also in this first task: create DESIGN.md (nine sections, see DESIGN), packages/shared/errors/codes.ts with every code in ERROR CODES, packages/shared/tokens with the token tables, PROJECT_BRIEF.md (this file), CHANGELOG.md, README.md, openapi.yaml skeleton, and the PR template with the "Docs updated / not needed because ..." checkbox. Do not install or start Stalwart, Collabora or LiveKit until I approve /infra.

FEATURES
Tier tags: F = Free, S = Starter, B = Business, BP = Business Plus, E = Enterprise, PRV = Privacy add-on (buyable on S, B, BP; included in E), PTN = partner programme. "S+" means Starter and every higher tier. Phase tags: MVP, v1, v2. Numbers in brackets are the limit per tier.

A. Mail
1. Webmail with conversation threading, folders and labels, unified inbox across a user's addresses. F+ MVP
2. Focused/priority inbox (Focused and Other). S+ v1
3. Full-text search with operators (from, to, has:attachment, date, size, label) and saved searches; index scoped per tenant. F+ MVP
4. Undo send, configurable 5 to 30 seconds. F+ MVP
5. Scheduled send. F+ MVP
6. Snooze, pin, mute thread. F+ MVP
7. Send-as and send-on-behalf for aliases, groups and shared mailboxes. S+ MVP
8. Aliases per user [F 5, S 50, B 300, BP 300, E 400]. MVP
9. Catch-all address per domain. S+ MVP
10. Plus-addressing (user+tag@domain). F+ MVP
11. Shared mailboxes that need no paid seat [S 2 at 15 GB, B 20 at 50 GB, BP and E unlimited at 50 GB, 100 GB if licensed]. S+ MVP
12. Groups and distribution lists with owners, moderation, external-sender control [S 10, B 100, BP+ unlimited]; dynamic groups by attribute. S+ MVP; dynamic E v1
13. Collaborative group inbox: assign, status, internal comments on a message. B+ v1
14. Delegation: full access, send-as, send-on-behalf, calendar delegate. S+ MVP
15. Server-side rules (Sieve) with a visual builder [500 incoming + 500 outgoing rules]. F+ MVP
16. Auto-forwarding [F 1 external rule, S 3, B+ admin policy]; admin can block external forwarding tenant-wide. F+ MVP
17. Auto-reply / out of office with schedule and separate internal and external text; admins can set it for a user. F+ MVP
18. Signatures per address; company signatures and disclaimers set by admin. F+ MVP; admin-managed B+ v1
19. Email templates, unlimited (competitors meter these on entry tiers). S+ MVP
20. Read-receipt requests (MDN), unmetered. S+ v1
21. Open and link tracking, opt-in per tenant, off by default, always off under PRV. B+ v1
22. Follow-up reminders (nudge when no reply). S+ v1
23. Recall or replace a message sent to internal recipients. S+ v1
24. Native attachment size [F 25 MB, S 50 MB, B 100 MB, BP and E 150 MB]; receive limit 150 MB. MVP
25. Large-file links via Drive [S 1 GB, B 5 GB, BP and E 10 GB per file]. S+ v1
26. Attachment preview for PDF, Office files and images. F+ v1
27. Rich HTML composer, plain-text mode, inline images, Markdown shortcuts. F+ MVP
28. Remote-image proxy and tracking-pixel blocking by default. F+ MVP
29. Personal mail merge from a spreadsheet [capped at 1,500 recipients per day]. B+ v1
30. Turn a message into a task, note or event. F+ v1
31. Spam folder, block and allow senders, user quarantine digest. F+ MVP
32. Unsubscribe assistant using List-Unsubscribe (RFC 8058) headers. F+ v1
33. Keyboard shortcuts with an "Outlook-style" and "Gmail-style" preset (our own implementation). F+ MVP
34. Offline mode (PWA cache plus outbox queue). S+ v1
35. Dark mode, density and reading-pane settings. F+ MVP
36. Multi-account switcher, including external IMAP accounts. S+ v1
37. Export a mailbox as mbox/EML; print or save as PDF. F+ MVP
38. IMAP, POP3 and SMTP submission with per-device app passwords. S+ MVP
39. JMAP access for third-party clients. S+ MVP
40. Exchange ActiveSync and EWS for Outlook and native phone clients. B+ v1
41. Autoconfig (Thunderbird) and Autodiscover (Outlook) per domain. S+ MVP
42. Recover deleted items [F and S 30 days, B 30 days plus admin restore, BP and E retention-policy based]. F+ MVP
43. Online archive mailbox [B 50 GB, BP auto-expanding up to 1.5 TB, E 1.5 TB]. B+ v1

B. Calendar
44. Personal calendars [up to 25 per user], colours, multiple time zones. F+ MVP
45. Invitations and RSVPs over iMIP that work with Outlook and Gmail. F+ MVP
46. Shared calendars, delegate access, tenant-wide free/busy. S+ MVP
47. Recurring events with exceptions; email and push reminders. F+ MVP
48. Room and equipment resources with capacity and auto-accept rules. B+ v1
49. Team and group calendars. B+ v1
50. Scheduling assistant (find a time across attendees and rooms). B+ v1
51. ICS publish and subscribe. S+ MVP
52. CalDAV sync. S+ MVP
53. One-click mrrokesh Meet link on events. S+ v1
54. Working hours, auto-decline while out of office. S+ v1
55. Indian national and state holiday calendars. F+ MVP

C. Contacts
56. Personal contacts (vCard 4: photos, multiple emails and phones, notes) and contact groups, unmetered [25,000 personal contacts]. F+ MVP
57. Organisation directory (global address list) filled automatically [25,000 entries]. S+ MVP
58. Shared address books. B+ v1
59. Contact view with recent conversations, meetings and files. S+ v1
60. CardDAV sync; CSV and vCard import and export. Import/export F+ MVP; CardDAV S+ MVP
61. Duplicate detection and merge. F+ v1

D. Tasks and Notes
62. Tasks with subtasks, due dates, recurrence, priority, attachments. F+ v1
63. Shared and group task lists; assign tasks to colleagues. B+ v1
64. Notes with rich text, checklists, attachments, sharing, link to a message. F+ v1
65. Board (kanban) view for team task lists. B+ v2
66. Task sync over CalDAV (VTODO). S+ v1

E. Drive
67. Personal drive storage [F shares the 5 GB account quota, S 5 GB, B 50 GB, BP 1 TB, E 5 TB pooled]. F+ v1
68. Upload size per file [F 250 MB, S 1 GB, B 5 GB, BP and E 10 GB]. v1
69. Share links with password, expiry, download limit and view-only mode. S+ v1
70. Team (shared) folders with owner, editor and viewer roles. B+ v1
71. Version history [S and B 30 days, BP 180 days, E custom]. S+ v1
72. File-request (upload-only) links. B+ v1
73. Preview of common formats (PDF, Office, images, video, text). F+ v1
74. WebDAV access. S+ v1
75. Desktop sync client. B+ v2
76. Mass-deletion and ransomware detection with one-click restore. BP+ v2
77. Publish a Drive folder as a static website on a custom domain with HTTPS. B+ v2

F. Docs
78. Documents, spreadsheets and presentations in the browser and on mobile (Collabora Online via WOPI), opening and saving DOCX, XLSX and PPTX. B+ v1
79. Real-time co-editing, comments, suggestions and track changes. B+ v1
80. Indian business templates: GST tax invoice, quotation, letterhead, offer letter. B+ v1
81. Export to PDF. B+ v1
82. Forms and surveys with responses to a spreadsheet. B+ v2
83. Simple eSignature with an audit trail. BP+ v2

G. Meet
84. Video meetings (LiveKit) [S 50 participants up to 60 minutes, B 150 up to 24 hours, BP 300 up to 24 hours, E 1,000 interactive plus view-only live stream]. S+ v1
85. Screen share, in-meeting chat, reactions, raise hand, lobby and passcodes. S+ v1
86. Recording to Drive with transcript. BP+ v1
87. Noise cancellation, breakout rooms, polls and Q&A. B+ v2
88. Attendance reports. BP+ v2
89. Webinars and live streaming. E v2
90. AI meeting notes and action items. BP+ v2

H. Chat
91. One-to-one and group chat, channels and threads. B+ v2
92. Unlimited searchable chat history. B+ v2
93. Files in chat stored in Drive. B+ v2
94. Presence linked to calendar and out-of-office status. B+ v2
95. External guests in channels. BP+ v2

I. Booking pages
96. Public booking pages [S 1 page, B+ unlimited]. S+ v1
97. Availability from the calendar, buffers, daily caps, minimum notice. S+ v1
98. Automatic Meet link, confirmation and reminder emails, and a WhatsApp click-to-chat link on the page (no WhatsApp API messaging without separate approval). S+ v1
99. Team, collective and round-robin booking. B+ v1
100. Custom booking-page domain and branding within design tokens. B+ v2
101. Take payment at booking via Razorpay (paid consultations). BP+ v2

J. Admin console
102. One admin console on web, plus admin actions in the mobile app; no separate portals for security, compliance or billing. S+ MVP (Free: owner settings only)
103. User lifecycle: create, bulk CSV import, suspend, reset password, delete with a 30-day restore window, convert a leaver to a shared mailbox. S+ MVP
104. Seat and licence management; mix plans within one tenant. B+ v1
105. Group, shared-mailbox and resource management. S+ MVP
106. RBAC with built-in roles (Owner, Billing admin, User admin, Helpdesk, Security admin, Compliance admin, Read-only) [custom roles BP+]. S+ MVP; custom v1
107. Admin audit log [S 90 days, B 180 days, BP 1 year, E up to 10 years]. S+ MVP
108. Message trace and mail-flow logs [S and B 30 days, BP and E 90 days in UI]. S+ v1
109. Transport (mail-flow) rules [up to 300 per tenant]. BP+ v1
110. Journaling to an external archive [up to 300 rules]. BP+ v1
111. Inbound and outbound connectors (smart host, forced TLS with partners). BP+ v2
112. Usage and adoption reports (storage, sending, sign-ins, devices). S+ v1
113. Service health page and incident history. F+ MVP
114. Custom login page and logo within design tokens. B+ v1
115. Policies: password, MFA enforcement, session lifetime, IP allow-list. B+ v1
116. Device list, remote sign-out, wipe of app data on lost phones. BP+ v1
117. Admin REST API and webhooks with scoped API keys. B+ v1
118. SCIM 2.0 provisioning from Microsoft Entra, Google or Okta. BP+ v1
119. SAML 2.0 and OIDC single sign-on with the customer's identity provider. BP+ v1
120. mrrokesh as identity provider for third-party apps. E v2
121. Whole-tenant data export (takeout). F+ MVP
122. Tenant deletion with a 30-day grace period and crypto-erasure of tenant keys. F+ MVP

K. Domains and DNS onboarding
123. Add-domain wizard with TXT ownership proof. F+ MVP
124. Domains per tenant [F 1, S 3, B 10, BP 50, E unlimited]; domain aliases. MVP
125. Automatic DNS setup through the Cloudflare API and Domain Connect, using a user-granted, narrowly scoped token. S+ MVP
126. Automatic DNS for other registrars common in India (GoDaddy, Hostinger, BigRock and others) only where they publish an API; otherwise copy-paste records with a live checker. S+ v1
127. Generated records: MX, SPF include, DKIM (2048-bit RSA, optional Ed25519 second signature), DMARC (starting p=none with t=y while testing), MTA-STS TXT plus hosted policy, TLS-RPT, autoconfig and autodiscover, SRV records, optional BIMI. F+ MVP
128. DNS health dashboard with a status and a fix for each record, using API-DNS codes. F+ MVP
129. Outbound sending blocked until SPF and DKIM pass. F+ MVP
130. Hosted MTA-STS policy and per-domain TLS certificates via ACME. F+ MVP
131. Automatic DKIM rotation at least every six months with overlapping selectors. F+ MVP
132. Split-domain routing and coexistence during migration. B+ v1
133. Free starter address on a shared mrrokesh-owned domain for people without a domain, in its own IP pool with tight sending caps. F v2
134. Buy a domain at sign-up through a registrar reseller integration. S+ v2 (needs a reseller agreement)

L. Security and compliance
135. MFA with TOTP and passkeys (WebAuthn); passkey-only sign-in. F+ MVP; passkey-only v1
136. Admin-enforced MFA for the whole tenant or for admins only. S+ MVP
137. Per-device app passwords for IMAP, SMTP, CalDAV and CardDAV, revocable. S+ MVP
138. Session and device list with remote sign-out. F+ MVP
139. New-device and suspicious sign-in alerts (impossible travel, new country). S+ v1
140. Advanced account protection with stricter checks and human review of risky sign-ins. BP+ v2
141. Conditional access by IP range, country and device state. BP+ v2
142. TLS 1.2+ everywhere; MTA-STS and DANE for SMTP. F+ MVP
143. Encryption at rest with per-tenant data keys (envelope encryption, KMS-held master keys). F+ MVP
144. Customer-managed keys (BYOK). E v2
145. Password-protected email to outside recipients [expiry up to 28 days, optional hint, limited replies]. S+ v1
146. OpenPGP sign and encrypt. S+ v1
147. S/MIME with customer-supplied certificates. BP+ v1
148. Retention policies by mailbox, folder or label. BP+ v1
149. Legal hold, eDiscovery search and export. BP+ v1
150. Data loss prevention for mail with India patterns (PAN, Aadhaar, GSTIN, card numbers). BP+ v2
151. Click-time URL checks against known bad sites. S+ v1
152. URL rewriting with detonation, and attachment sandboxing. BP+ v2
153. Antivirus scanning of every attachment. F+ MVP
154. Impersonation and look-alike domain protection, display-name spoof warnings, external-sender banner. B+ v1
155. Admin quarantine with release workflow. S+ MVP
156. Phishing attack simulation and training. E v2
157. Audit log export to a SIEM (syslog, webhook, S3). E v2
158. Data hosted in India by default; other regions on request. F+ MVP; other regions E v2
159. Transparency report and documented process for lawful requests. F+ v1
160. Platform audit trail of every operator access to customer data, visible to the tenant. B+ v1

M. Deliverability
161. SPF, DKIM, DMARC (RFC 9989/9990/9991) and ARC checks inbound; DKIM signing and ARC sealing outbound. F+ MVP
162. Built-in inbound spam and phishing filter (Bayesian, DNSBL, greylisting, phishing rules) with per-user training. F+ MVP
163. Published sending limits per tier (see TIERS) enforced per user and per tenant, with a tenant-wide external-recipient cap that grows with paid seats. F+ MVP
164. Outbound spam scoring, compromised-account detection, automatic hold of suspicious outbound mail, abuse desk with complaint feedback loops. F+ MVP
165. Bounce handling with plain-language non-delivery reports. F+ MVP
166. DMARC aggregate report ingestion and a guided path from p=none to p=reject per domain. S+ v1
167. TLS-RPT report ingestion and dashboard. B+ v1
168. BIMI setup helper (DMARC at enforcement, VMC or CMC). B+ v2
169. Separate IP pools for trial, free, paid and enterprise tenants; dedicated IP option. Dedicated IP E v2
170. Reputation monitoring (blocklists, mailbox-provider postmaster tools). Platform v1
171. Bulk and campaign mail as a separate add-on product, never from mailboxes, with RFC 8058 one-click unsubscribe, double opt-in and suppression lists. Add-on v2

N. AI
172. Write, rewrite, shorten and change tone, including Indian English and Hindi [S 50 actions a day, B 300, BP and E fair-use unlimited]. S+ v1
173. Thread summaries and suggested replies. S+ v1
174. Natural-language search ("invoice from Ravi last March"). B+ v1
175. Calendar and meeting-prep assistant. B+ v2
176. AI in Docs and spreadsheets. B+ v2
177. Inbox agents that label, draft, offer booking slots or escalate, with every send or external action confirmed by the user and shown in the thread. BP+ v2
178. AI admin controls: on or off per tenant and per group; customer data never used for model training; inbound mail treated as untrusted input (prompt-injection defences); answers cite the source messages. F+ v1
179. Bring-your-own model endpoint. E v2

O. Migration
180. Self-service IMAP import from any provider (Gmail and Microsoft via OAuth; Zoho, Titan, Hostinger, Rackspace, BigRock via IMAP). F+ MVP
181. Admin bulk migration from CSV in batches, delta sync and cut-over planner. B+ v1
182. Calendar and contacts import (ICS, vCard, Google and Microsoft APIs). S+ v1
183. Drive import from Google Drive and OneDrive. B+ v2
184. Free assisted migration for tenants with 50 or more paid seats. B+ v1
185. "Switching from Rackspace / Titan / Zoho" guides in /docs. F+ v1

P. Mobile
186. One Expo app for Android and iOS with mail at launch, then calendar, contacts, tasks and Drive. F+ MVP (mail), v1 (rest)
187. Push notifications (FCM and APNs) driven by JMAP push. F+ MVP
188. Biometric app lock (AND-BIO-001 / IOS-BIO-001 fallbacks). F+ v1
189. Offline cache and outbox. F+ v1
190. Swipe actions and home-screen widgets. F+ v2
191. Meet and booking pages in the app. S+ v1
192. Admin quick actions (reset password, suspend user, release quarantine). S+ v1
193. Native mail-client setup profiles (iOS configuration profile, Android autoconfig). S+ v1

Q. Billing and subscriptions
194. INR prices shown including 18% GST; GST tax invoices with GSTIN, place of supply, CGST+SGST or IGST and SAC code (confirm code with a tax adviser). S+ MVP
195. Razorpay Subscriptions with UPI AutoPay, card e-mandate and netbanking; 24-hour pre-debit notice. S+ MVP
196. Monthly and annual terms, no forced multi-year lock-in, renewal at the same price as the first term. S+ MVP
197. Seat-based proration, mid-cycle upgrade and downgrade. S+ MVP
198. 30-day trial of Business for up to 2 mailboxes, no card needed, with trial sending caps. MVP
199. Dunning: 15-day grace, then read-only, then suspension; no data deleted until 30 days after suspension with email notices. S+ MVP
200. Add-ons: extra storage, Privacy, AI Pro, archive expansion, dedicated IP, campaigns. v1
201. Usage meters (seats, storage, sending, AI) in the console. S+ MVP
202. Coupons and partner pricing. v1
203. 30-day money-back guarantee on first purchase. S+ MVP
204. USD/international billing. v2

R. Reseller / partner
205. Partner console: create and manage customer tenants, billing reports, audited "act as admin". PTN v1
206. Wholesale price list and partner margin (benchmark: Zoho advertises up to 35%). PTN v1
207. Provisioning REST API and webhooks. PTN v1
208. WHMCS module and cPanel/WHM plugin. PTN v2
209. White label: custom webmail and login domain, logo, colours within tokens; branded mobile app for large partners. PTN v2; branded app E v2
210. Price protection: 90 days' notice of any wholesale price change. PTN v1

S. Privacy features
211. Tracker blocking and remote-content proxy. F+ MVP
212. Masked aliases per website, one-click disable, API and password-manager integration [S 10, B 50, PRV unlimited]. S+ v1
213. Privacy dashboard: sign-in and session history, trackers blocked, per-alias traffic. Basic S+ v1; full PRV v2
214. Zero-access encryption at rest: inbound mail encrypted on arrival with the user's public key. PRV v2
215. End-to-end encryption between mrrokesh users (OpenPGP, key per address, private key encrypted on the client) with key transparency. PRV v2
216. Encrypted contact details. PRV v2
217. Recovery phrase for encryption keys, with clear warnings that a reset without it loses old encrypted mail. PRV v2
218. Optional SRP or OPAQUE sign-in so the server never sees the password (needs a written playbook exception). PRV v2
219. No ads, no sale of data, no AI training on customer data, published in plain language. F+ MVP
220. Same-price renewal pledge and no annual price rises for existing customers. S+ MVP

TIERS (proposed; prices in INR per user per month, including 18% GST)

| | Free | Starter | Business | Business Plus | Enterprise | Privacy add-on |
|---|---|---|---|---|---|---|
| Annual plan, billed monthly | 0 | 69 | 149 | 349 | from 699 (contract) | 99 |
| Month-to-month | 0 | 85 | 179 | 419 | n/a | 119 |
| Users | up to 5 | up to 300 self-serve | up to 300 self-serve | up to 300 self-serve | unlimited | per user |
| Mail storage | 5 GB (mail + drive) | 15 GB | 50 GB | 100 GB + auto-expanding archive to 1.5 TB | 100 GB + 1.5 TB archive | n/a |
| Drive | shared 5 GB | 5 GB | 50 GB | 1 TB | 5 TB pooled | n/a |
| Native attachment | 25 MB | 50 MB | 100 MB | 150 MB | 150 MB | n/a |
| Large-file link | none | 1 GB | 5 GB | 10 GB | 10 GB | n/a |
| Messages sent per day | 100 | 500 | 2,000 | 2,000 | custom | n/a |
| Recipients per day (all / external) | 300 / 100 | 2,000 / 1,000 | 10,000 / 3,000 | 10,000 / 3,000 | custom, tenant cap scales with seats | n/a |
| Recipients per message | 50 | 100 | 500 | 1,000 | 1,000 | n/a |
| Message rate | 10 a minute | 20 a minute | 30 a minute | 30 a minute | 30 a minute | n/a |
| Aliases per user | 5 | 50 | 300 | 300 | 400 | unlimited masked aliases |
| Domains per tenant | 1 | 3 | 10 | 50 | unlimited | n/a |
| Catch-all | no | yes | yes | yes | yes | n/a |
| IMAP/POP/SMTP | no (web + app only) | yes | yes | yes | yes | n/a |
| ActiveSync/EWS | no | no | yes | yes | yes | n/a |
| Modules | Mail, Calendar, Contacts, Tasks/Notes | + Booking (1 page), Meet (50 / 60 min), AI (basic) | + Drive, Docs, Meet 150, Chat (v2), shared mailboxes, group inbox | + Archive, retention, eDiscovery, legal hold, journaling, S/MIME, DLP, SSO/SCIM, device controls, Meet 300 + recording, AI agents | + BYOK, SIEM export, attack simulation, dedicated IP, other regions, 1,000-person meetings, SLA | E2EE, zero-access storage, unlimited masked aliases, full privacy dashboard |

Trial and new-tenant limits: 200 external recipients per tenant per day until the first successful payment and 7 days of clean sending; trial and free tenants send from a separate IP pool. Extra storage: 10 GB for 99 rupees a year including GST. AI Pro add-on: 199 rupees a month including GST (proposed; check model costs first). Prices are proposals to validate; ex-GST equivalents: Starter 58.47, Business 126.27, Business Plus 295.76, Enterprise 592.37, Privacy 83.90.

STACK AND LICENCES

| Layer | Choice | Licence | Implication |
|---|---|---|---|
| Mail, calendar, contacts, files engine | Stalwart | AGPL-3.0 Community or Stalwart Enterprise Licence v2 | Multi-tenancy, SCIM and sharded storage are Enterprise only, from EUR 2.00 per mailbox per year (25 minimum) falling to EUR 0.89 at volume; compliance and lawful interception are paid add-ons. Run unmodified; cancelling reverts to Community without data loss. |
| Control plane, DNS onboarding, admin, partner console, billing | Our Node/TypeScript /backend | ours | Biggest build item. |
| Webmail and mobile | Our React + Expo apps with our own JMAP client | ours | Do not fork Bulwark (AGPL-3.0-only); study only. |
| Documents | Collabora Online via WOPI | MPL-2.0 | File-level copyleft; commercial support available. Avoid ONLYOFFICE (AGPL-3.0) unless legal approves. |
| Meetings | LiveKit | Apache-2.0 | Permissive. Jitsi (Apache-2.0) is the fallback. |
| Chat (v2) | Own service or Rocket.Chat MIT core | MIT outside ee/ | Do not use ee/ code. Mattermost source is AGPL. |
| Object storage | Managed S3 in India, or SeaweedFS | commercial / Apache-2.0 | MinIO is archived: do not use. Garage (AGPL-3.0) reportedly lacks object versioning. |
| Anti-spam | Stalwart built-in | as above | Rspamd (Apache-2.0) only if we leave Stalwart. |
| Outbound | Commercial smarthost relay at launch | commercial | Check the provider's policy on mailbox (user-to-user) traffic before signing. |
| Billing | Razorpay Subscriptions + own GST invoices | commercial | Stripe India is invite-only. Lago (AGPL-3.0) only as an unmodified internal service if usage billing grows. |

All licence conclusions need confirmation by counsel before launch.

ROADMAP
- MVP: monorepo scaffold, control plane (tenants, users, groups, shared mailboxes, domains, plans, quotas), Stalwart integration, DNS onboarding with Cloudflare and Domain Connect plus copy-paste checker, webmail (mail, calendar, contacts), Expo mail app with push, IMAP import, Free/Starter/Business plans with Razorpay and GST invoices, sending limits and abuse controls, MFA with passkeys, audit log, /docs. Exit gate: full security-audit run with no open confirmed critical or high findings, plus deliverability tests to Gmail and Outlook.
- v1: Drive, Docs (Collabora), Meet (LiveKit), booking pages, tasks and notes, AI writing and summaries, Business Plus compliance (archive, retention, eDiscovery, legal hold, journaling, S/MIME, transport rules), SSO and SCIM, ActiveSync/EWS, DMARC and TLS-RPT dashboards, partner console and API, Hindi UI, own IP pools warming.
- v2: Chat, Privacy add-on (E2EE, zero-access storage), Enterprise (BYOK, SIEM export, attack simulation, sandboxing, DLP, other regions, dedicated IPs), AI agents, WHMCS/cPanel modules, white label, static sites, campaigns add-on, domain purchase.

SECURITY (review gate for every phase)
- Use the Cloudflare security-audit skill in guidance mode on every feature PR touching auth, tenancy, mail parsing or rendering, DNS, billing, AI or file handling. At the end of each phase, run the full audit ("security audit this codebase") with output outside the repo. Release is blocked while any confirmed critical or high finding is open; needs_validation items get an owner and a date. Priority hunting areas: tenant isolation and data lifecycle, web protocol and auth, client-side (HTML email rendering), RPC/queues/webhooks, AI and LLM, resource exhaustion.
- Tenant isolation: tenant_id on every row with PostgreSQL row-level security; one Stalwart tenant per customer; per-tenant data keys; tenant-scoped caches, search indexes, exports, backups and logs; automated cross-tenant access tests in CI.
- Auth: rule 6 passwords; JWT access 15 minutes plus refresh 30 days (httpOnly cookie on web, SecureStore on mobile) with refresh rotation and reuse detection; TOTP and passkeys; app passwords for protocols; rate limits on login, password reset, signup, DNS checks and every public endpoint.
- Mail rendering: sanitise all HTML mail server-side and again in a sandboxed iframe with a strict CSP; proxy remote images; never execute scripts; strip dangerous attachments types or warn.
- Outbound abuse: limits in TIERS; separate IP pools by trust; block sending until SPF and DKIM pass; automatic hold on spikes in bounces, complaints or spam scores; keep the Gmail-reported spam rate below 0.1% and never reach 0.3%; no bulk mail from mailboxes.
- Secrets: .env and secret manager only; AES-256-GCM for readable secrets; DKIM private keys never leave the backend/mail engine; key rotation runbooks.
- Backups: encrypted PostgreSQL point-in-time recovery, versioned object storage, tested restores every quarter, per-tenant export and deletion that also covers backups within a stated window.
- Audit logs: append-only admin, operator and security logs; operators cannot switch off logging of their own actions.
- AI: inbound email, attachments and web content are untrusted; AI never sends, deletes, forwards or books without user confirmation.
- Get legal review of India data-protection obligations, lawful-interception duties and retention requirements before launch.

DELIVERABILITY STANDARDS (per customer domain)
- SPF (RFC 7208): one include for our outbound IPs; stay under 10 DNS lookups.
- DKIM (RFC 6376, RFC 8301, Ed25519 RFC 8463): 2048-bit RSA per domain, optional Ed25519 dual signature, rotate at least every six months via selectors.
- DMARC (RFC 9989 core, RFC 9990 aggregate, RFC 9991 failure reports; RFC 7489 is obsolete): do not emit pct, rf or ri; use t=y for testing; send aggregate reports at least daily as a receiver; guide tenants from p=none to quarantine to reject.
- ARC (RFC 8617): seal forwarded and list mail.
- MTA-STS (RFC 8461) with hosted policy and TLS cert per tenant domain; TLS-RPT (RFC 8460) with report ingestion.
- DANE (RFC 7672): TLSA records on our MX hosts with DNSSEC on our zones.
- BIMI: only after DMARC enforcement; Gmail accepts VMC or CMC, Apple needs VMC, Outlook does not display BIMI.
- PTR matches HELO for every outbound IP.
- RFC 8058 one-click unsubscribe for the campaigns add-on, honoured within 48 hours.

ERROR CODES
Format [PLATFORM]-[AREA]-[NUMBER]; platforms API, WEB, AND, IOS. Keep every playbook code (API-AUTH-001/002/003, API-VAL-001, API-RES-404, API-RATE-429, API-SRV-500, API-SRV-503, WEB-NET-001/002, WEB-BRW-001, WEB-STO-001, WEB-UPL-001, WEB-RND-001, AND-NET-001, AND-PERM-001/002/003, AND-PLAY-001, AND-VER-001, AND-BIO-001, AND-STO-001, IOS-NET-001, IOS-PERM-001/002/003, IOS-ATT-001, IOS-BIO-001, IOS-VER-001, IOS-IAP-001). Add these new areas and codes in packages/shared/errors/codes.ts and the docs page; never reuse a retired code.

| Code | HTTP | Meaning | Message shown to user | Fix / action |
|---|---|---|---|---|
| API-MAIL-001 | 413 | Message larger than plan limit | This message is over your plan's size limit. | Send as a Drive link or upgrade |
| API-MAIL-002 | 422 | Too many recipients in one message | Too many recipients for one message. | Split the message or use a group |
| API-MAIL-003 | 403 | Outbound paused for abuse review | Sending is paused while we check your account. | Contact support; admin sees reason |
| API-MAIL-004 | 409 | Domain not verified for sending | This domain isn't ready to send yet. | Finish DNS setup |
| API-MAIL-005 | 422 | Recipient address invalid | Check the email address. | Correct the address |
| API-DNS-001 | 422 | Ownership TXT record not found | We couldn't find your verification record. | Add the TXT record, wait, retry |
| API-DNS-002 | 422 | MX records not pointing to us | Your MX records point somewhere else. | Update MX records |
| API-DNS-003 | 422 | SPF missing or over 10 lookups | Your SPF record needs a fix. | Use the suggested SPF value |
| API-DNS-004 | 422 | DKIM record missing or wrong | DKIM isn't set up yet. | Publish the DKIM record shown |
| API-DNS-005 | 422 | DMARC missing or invalid | Add a DMARC record to protect your domain. | Publish the suggested DMARC |
| API-DNS-006 | 422 | MTA-STS or TLS-RPT problem | Secure delivery settings need attention. | Add the CNAME/TXT shown |
| API-DNS-007 | 409 | Domain already used by another tenant | This domain is already connected to another account. | Prove ownership or contact support |
| API-DNS-008 | 502 | Registrar API call failed | We couldn't update your DNS automatically. | Retry or add records by hand |
| API-BILL-001 | 402 | Payment failed | Your payment didn't go through. | Retry or change payment method |
| API-BILL-002 | 402 | Mandate cancelled or expired | Your AutoPay mandate has stopped. | Set up AutoPay again |
| API-BILL-003 | 402 | Feature not in current plan | This feature is part of a higher plan. | Show upgrade options |
| API-BILL-004 | 422 | GSTIN invalid | Check your GSTIN. | Correct GSTIN |
| API-BILL-005 | 403 | Subscription in grace or read-only | Your plan is overdue. Some actions are paused. | Pay the invoice |
| API-QUOTA-001 | 507 | Mailbox storage full | Your mailbox is full. | Delete mail, archive or add storage |
| API-QUOTA-002 | 429 | Daily sending limit reached | You've reached today's sending limit. | Wait until reset time in details |
| API-QUOTA-003 | 409 | No free seats | All your seats are in use. | Add seats |
| API-QUOTA-004 | 409 | Alias limit reached | You've used all your aliases. | Remove one or upgrade |
| API-QUOTA-005 | 409 | Domain limit reached | You've reached your domain limit. | Remove one or upgrade |
| API-QUOTA-006 | 429 | AI quota used up | You've used today's AI actions. | Wait or add AI Pro |
| API-MIG-001 | 422 | Source mailbox sign-in failed | We couldn't sign in to your old mailbox. | Check details or app password |
| API-MIG-002 | 502 | Source server unavailable | Your old provider isn't responding. | Retry later; import resumes |
| API-SEC-001 | 401 | MFA required | Enter your verification code. | Complete MFA |
| API-SEC-002 | 401 | Passkey or code rejected | That didn't work. Try again. | Retry or use another method |
| API-SEC-003 | 403 | Blocked by tenant access policy | Your organisation doesn't allow sign-in from here. | Ask your admin |
| API-TEN-001 | 403 | Tenant suspended | This account is suspended. | Contact the account owner |
| API-CAL-001 | 409 | Booking slot no longer free | That time was just taken. | Pick another slot |
| API-DRV-001 | 413 | File larger than plan upload limit | This file is too large for your plan. | Upgrade or split |
| WEB-MAIL-001 | n/a | Draft could not autosave | Your draft isn't saved yet. | Retry automatically; copy text |
| AND-MAIL-001 | n/a | Message queued offline | Saved to Outbox. We'll send when you're online. | Auto-send on reconnect |
| IOS-MAIL-001 | n/a | Message queued offline | Saved to Outbox. We'll send when you're online. | Auto-send on reconnect |

DOCS
- Public /docs page on the website and a Help screen in the app, rendered from the same Markdown in /docs, with the seven sections: Getting started; What you can do (every feature in FEATURES, one line each, linked); How-to guides (one page per feature with web and phone screenshots and limits); Roles and permissions (user, tenant admin roles, partner, platform admin); Error codes (the tables above with what to do); FAQ and contact; What's new (from CHANGELOG.md, newest first).
- Mail-specific pages: DNS setup per registrar, client setup (IMAP/SMTP/CalDAV/CardDAV hostnames and ports, app passwords), a public Limits page with every number from TIERS, deliverability guide (SPF/DKIM/DMARC), migration guides per old provider.
- Every how-to page shows "Last updated: [date] · v[x.y.z]". Screenshots are retaken when the screen changes. PRs that change user-visible behaviour without updating /docs are rejected.

DESIGN
Brand: Electric Indigo #5B5BF7, Satoshi (headings) + Inter (body), Lucide icons (lucide-react, lucide-react-native, 1.5 px stroke, 24 px). Principles: one hero per screen, space is the luxury, content first, calm motion, same feel everywhere.

Typography tokens

| Token | Web size / line height | Mobile size | Weight | Use |
|---|---|---|---|---|
| display | 80 / 84 px (48 px on phones) | 40 pt | 700 | Homepage hero only |
| h1 | 56 / 60 px | 34 pt | 700 | Page title |
| h2 | 40 / 44 px | 28 pt | 600 | Section title |
| h3 | 28 / 34 px | 22 pt | 600 | Card title |
| body-lg | 21 / 32 px | 19 pt | 400 | Intro paragraphs |
| body | 17 / 26 px | 17 pt | 400 | Default text |
| caption | 14 / 20 px | 13 pt | 500 | Labels, metadata |

Headlines letter-spacing -0.02em; max line length 70 characters; never more than three sizes on one screen. Mobile body may use SF Pro / Roboto; headings stay Satoshi.

Colour tokens

| Token | Light | Dark | Use |
|---|---|---|---|
| bg | #FFFFFF | #000000 | Page background |
| surface | #F5F5F7 | #1C1C1E | Cards, sections |
| text-primary | #111113 | #F5F5F7 | Headlines, body |
| text-secondary | #6E6E73 | #A1A1A6 | Supporting text |
| brand | #5B5BF7 | #7B7BFF | Primary buttons, links, focus |
| brand-glow | #5B5BF7 at 20% opacity, 80 px blur | same | Signature hero glow (marketing hero only) |
| success | #1F9D55 | #30D158 | Confirmations |
| warning | #C77700 | #FFD60A | Warnings |
| danger | #D92D20 | #FF453A | Errors, destructive actions |

Brand colour on at most 10% of any screen (aim for about 5% on marketing pages). Light and dark mode everywhere. Solid brand colour only: no indigo-to-violet, blue or pink gradients, no gradient text, no glow orbs beyond the single brand-glow token.

Spacing, shape, depth, motion: 4 pt scale 4, 8, 12, 16, 24, 32, 48, 64, 96, 128; web section padding 128 px desktop, 64 px mobile; gutter 24 px mobile; max content width 1200 px. Radius 8 inputs, 14 buttons, 20 cards, 28 sheets/modals; standalone buttons are pills. One shadow 0 8px 30px rgba(0,0,0,0.08); dark mode uses lighter surfaces instead. Frosted nav bar only (backdrop-filter: blur(20px)). Motion 200 to 400 ms, cubic-bezier(0.25, 0.1, 0.25, 1); scroll reveals fade + 24 px slide once (marketing pages only, never in the mail app); hero product scale 1.0 to 1.05; respect Reduce Motion.

Components: primary button brand fill, white text, 48 high web / 50 mobile, one per screen; secondary text or outline; inputs 48 high, label above, error text below in danger colour with the error code; cards surface colour, radius 20, padding 24; sticky frosted nav, logo left, max 5 links, one CTA right; mobile tab bar max 5 tabs (Mail, Calendar, Contacts, Drive, More); empty states illustration + one sentence + one action; skeletons for anything over 300 ms, no spinners and no pulsing dots or blinking cursors for sync or AI drafting.

Accessibility: WCAG 2.2 AA, contrast 4.5:1 text and 3:1 icons and focus rings, labels on every control, 44 pt touch targets, visible instant focus rings, full keyboard support in webmail.

Voice: short, confident, human; headlines under 6 words; buttons are verb + object ("Add domain", "Send invite"); error messages say what happened and what to do; no invented metrics, testimonials or customer logos.

DESIGN.md: write a nine-section DESIGN.md at the repo root (Visual theme and atmosphere; Colour palette and roles; Typography rules; Component stylings; Layout principles; Depth and elevation; Do's and don'ts; Responsive behaviour; Agent prompt guide) encoding exactly the tokens above. It is the locked system that every design skill must obey.

SKILLS AND TOOLS
- Precedence: this brief and the playbook > DESIGN.md > any skill's defaults. If a skill's rule conflicts, follow the playbook and record the waiver in the PR.
- Hallmark or Taste Skill: marketing pages only (one per page, never both on the same page). Feed them DESIGN.md and the brand palette; never let them re-deal colours or fonts. Rebuild their output as React + Vite components using tokens.
- Impeccable: critique, audit and polish of the webmail, admin and mobile UI against DESIGN.md. Its "overused font" warning on Inter is an accepted brand decision.
- getdesign.md: use its nine-section DESIGN.md format for our own file; read other brands' files for structure only and copy none of their values.
- aura.build: optional for landing-page ideation; never ship its output directly; rebuild in our system.
- Cloudflare security-audit: as in SECURITY.
- REA: only on our own builds and bundles (secret leaks, bundle regressions, comparing releases) and our own staging app. Do not reverse engineer, scrape or automate competitor products, log in to competitor accounts, bypass bot protection, or copy any code, text, icons or assets. Any competitor analysis beyond normal browsing needs legal review first.

DEFINITION OF DONE (every PR)
- Works on web (Chrome, Safari, Firefox), Android and iOS, light and dark mode.
- Uses design tokens only; matches DESIGN.md and the design system.
- All errors use codes from the error tables; new codes added to codes.ts and docs.
- /docs how-to page written or updated, with new screenshots; Limits page updated if any limit changed.
- CHANGELOG.md entry added (version, date, what changed).
- openapi.yaml updated for any API change.
- Tests pass in CI; no new lint warnings; tenant-isolation tests pass for any data access change.
- Accessibility checked: contrast, labels, keyboard (web), screen reader (mobile).
- security-audit guidance pass done for security-relevant changes, with no open confirmed critical or high finding.
- Deliverability-affecting changes tested against Gmail and Outlook test inboxes.
- Reviewed and approved by one teammate.

````
