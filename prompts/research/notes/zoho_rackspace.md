# Zoho Mail / Zoho Workplace and Rackspace Email / Hosted Exchange: feature inventory (as of late Nov 2026)

Method note: Zoho's India pricing page (zoho.com/en-in/mail/zohomail-pricing.html) was rendered in a real browser on 26 Nov 2026. That gave exact INR prices and the full comparison matrix. The US (USD) page redirects to the India page from an Indian IP, and plain fetches of the page leave the prices blank (they load by JavaScript), so the **USD figures below come from third parties** (Capterra and trackers). Every Rackspace email marketing page tried (rackspace.com/applications/rackspace-email, /en-au/email-hosting/webmail, /lp/rackspace-email, the data sheet, /en-us/email-hosting/webmail/pricing) returned **HTTP 404 on 26 Nov 2026**. The Rackspace specs below therefore come from news reports, reseller notices, search-index snippets of Rackspace pages and docs.rackspace.com.

## Per-tier inventory: price, storage, attachments, sending, users, aliases, groups, archive, eDiscovery, retention, S/MIME, encryption

### Takeaway
Zoho India sells 5 paid tiers: Mail Lite ₹59 (5 GB) or ₹75 (10 GB), Mail Premium ₹199, Workplace Standard ₹99 (₹129 billed monthly), Workplace Professional ₹399 (₹489 billed monthly), and Enterprise (custom). It also has a Forever Free plan for 5 users. Compliance features (retention, eDiscovery, S/MIME, DLP, white labelling) are only in Mail Premium and Workplace Professional. Rackspace Email has become a single, much dearer product: about $10 per mailbox per month retail in 2026, up from $2.99, plus paid add-ons. Hosted Exchange is no longer sold.

### Cited Findings

**Zoho pricing, INR, per user per month (rendered 26 Nov 2026; GST/VAT charged on top)** — [Zoho India pricing](https://www.zoho.com/en-in/mail/zohomail-pricing.html)

| Plan | Billed annually | Billed monthly | Mail storage/user | Retention storage/user | WorkDrive | Attachment / huge attachment |
|---|---|---|---|---|---|---|
| Forever Free | ₹0 | – | 5 GB | – | – | (not stated) |
| Mail Lite 5 GB | ₹59 | Yearly only | 5 GB | – | N/A | 30 MB / up to 250 MB |
| Mail Lite 10 GB | ₹75 | Yearly only | 10 GB | – | N/A | 30 MB / up to 250 MB |
| Mail Premium | ₹199 | Yearly only | 50 GB | 50 GB | N/A | 40 MB / up to 1 GB |
| Workplace Standard ("Best value") | ₹99 | ₹129 | 30 GB | – | 10 GB/user in the matrix; the plan card says 100 GB team storage for 3–10 users | 30 MB / up to 500 MB |
| Workplace Professional | ₹399 | ₹489 | 100 GB | 100 GB | 100 GB/user in the matrix; the plan card says 1 TB team storage for 3–10 users | 40 MB / up to 1 GB |
| Workplace Enterprise | Contact sales | – | Custom; pooled storage for 1,000+ users; VPC for 100,000+ users | – | Custom | – |

- **Forever Free:** one domain, up to 5 users, 5 GB per user. IMAP, POP and ActiveSync are not included. It is "available only in select data centers". — [Zoho India pricing](https://www.zoho.com/en-in/mail/zohomail-pricing.html)
- **Add-ons (India):** extra mail storage costs ₹85 per year per 10 GB. The WorkDrive storage add-on is ₹8,500 per 1 TB. — [Zoho India pricing, "Additional Purchases" tab](https://www.zoho.com/en-in/mail/zohomail-pricing.html)
- **Terms:** annual billing is about 20% cheaper than monthly, and the discount varies by region. Mail-only and Workplace plans can be mixed in one organisation on yearly subscriptions only. There is a 15-day free trial of the top edition with no card required. Assisted migration is only for organisations with more than 50 users. — [Zoho Mail pricing (US)](https://www.zoho.com/mail/zohomail-pricing.html); [Workplace pricing](https://www.zoho.com/workplace/pricing.html)
- **USD (third-party, unverified on Zoho's own page):** Mail Lite $1.00 (5 GB), 10 GB version $1.25; Mail Premium $4.00; Workplace Standard $3 annual / $4 monthly. Sources disagree on Standard: one Capterra listing says $3, another says $4. — [Capterra Zoho Mail pricing](https://www.capterra.com/p/174694/Zoho-Mail/pricing/); [Capterra Zoho Workplace pricing](https://www.capterra.com/p/233604/Zoho-Workplace/pricing/)

**Zoho Mail feature matrix by tier.** The column order on the page is Standard, Lite, Premium, Professional. — [Zoho India pricing](https://www.zoho.com/en-in/mail/zohomail-pricing.html)

| Feature | Lite | Premium | Wp Standard | Wp Professional |
|---|---|---|---|---|
| Webmail, Email Groups, Email Sharing, Folder sharing with delegation | Yes | Yes | Yes | Yes |
| Email Recall, Forwarding, Mail Merge | Yes | Yes | Yes | Yes |
| ActiveSync, Email aliases, Domain aliases, Custom login | Yes | Yes | Yes | Yes |
| SAML SSO, PGP encryption, TLS encryption | Yes | Yes | Yes | Yes |
| S/MIME encryption | – | Yes | – | Yes |
| White labelling | – | Yes | – | Yes |
| Email retention, eDiscovery | – | Yes | – | Yes |
| Mobile Access Management, Mail DLP (beta) | – | Yes | – | Yes |
| iOS/Android mail app, Admin mobile app, Streams mobile app | Yes | Yes | Yes | Yes |
| 24x7 support (email, chat, call), 99.9% uptime, migration tool | Yes | Yes | Yes | Yes |

- Note: the white-labelling and S/MIME rows each showed exactly two "Available" cells. They are mapped to Premium and Professional, which matches the plan cards where Premium and Professional add retention, eDiscovery, S/MIME, mobile access management and DLP. — [Zoho Mail pricing (US)](https://www.zoho.com/mail/zohomail-pricing.html)

**Zoho official limits (all plans unless noted)** — [Zoho Mail limits and policies](https://www.zoho.com/mail/help/adminconsole/rates-and-limits.html)

| Limit | Value |
|---|---|
| External outgoing mail | 50–500 per hour, set dynamically by sender reputation; no fixed daily quota published |
| Internal outgoing mail | 1,000 per hour |
| External recipients per message | 150 paid, 100 free (to, cc and bcc combined) |
| Internal recipients per message | 500 |
| Incoming message size | 40 MB; up to 500 attachments per incoming message |
| Incoming rate | 100 per minute |
| Aliases per mailbox | 30 (1 primary + 29) |
| Domains per organisation | 1 on free or trial, 30 on paid |
| Groups per organisation | 30 |
| Shared mailboxes | 20, with 40 GB storage each |
| Forwarding | 1 manual rule (personal account), 3 (paid), 30 filter-based |
| Deleted-mail recovery | 30 days |
| Email logs / message trace | 6 months (server), 1 month in the UI |
| eDiscovery export | 450 MB per file, link expires after 90 days |
| IMAP / POP | 100 IMAP connections, 5 POP connections, 5 GB per day POP fetch |
| API | 30 requests per minute |
| Migration | 1,000 users per batch, 50 concurrent |
| Contacts | 25,000 organisation + 25,000 personal |
| Mail rules | 500 incoming + 500 outgoing |
| Payment failure grace period | 15 days |

- Bulk or burst sending is not permitted under Zoho's business usage policy. — [Zoho Mail limits](https://www.zoho.com/mail/help/adminconsole/rates-and-limits.html)

**Rackspace pricing and specs (2025–2026)**

| Item | Old price | 2026 price | Source |
|---|---|---|---|
| Rackspace Email (retail, per mailbox per month) | $2.99 (Nov 2025) | $10 (Jan 2026) | [The Register, 20 Jan 2026](https://www.theregister.com/2026/01/20/rackspace_price_changes/) |
| Email Plus add-on | +$1 | +$2 | [WebSearch summary of Ars Technica / TechRadar coverage](https://www.techradar.com/pro/rackspace-email-hosting-price-hike-will-be-devastating-customers-say) |
| Archiving add-on | +$3 | +$6 | same as above |
| Reseller / legacy-platform mailboxes | – | $5 per mailbox per month (from about Mar or Apr 2026) | [Bibliopolis](https://www.bibliopolis.com/help/article/rackspace-email-accounts-now-5-per-month-alternative-options); [CountingWorks Pro](https://help.countingworkspro.com/rackspace-email-pricing-update-march-2026) |
| Cloudways-resold mailboxes | $1.00 | $1.50 from 1 Sep 2026 | [Cloudways](https://www.cloudways.com/blog/rackspace-vs-titan/) |

- **Specs:** 25 GB mailboxes, 30 GB file storage and a "100% uptime guarantee". — [The Register](https://www.theregister.com/2026/01/20/rackspace_price_changes/)
- **Attachments and Email Plus:** all plans allow 50 MB attachments. Email Plus adds ActiveSync (mobile sync of mail, calendar and contacts), 30 GB online storage and sharing per user, and desktop file sync. The pre-hike US list price for Email Plus was $3.99 per user per month. — [Rackspace Email Plus page, search-index snippet](https://www.rackspace.com/email-hosting/webmail/rackspace-email-plus); [Rackspace cloud drive page](https://www.rackspace.com/en-us/email-hosting/webmail/cloud-drive)
- **Hike details:** customers had about 1–1.5 months' notice. One reseller's monthly bill rose from $2,400 to $5,100. Laughing Squid called the increase 706%. Rackspace said the change "reflects the ongoing costs of operating and maintaining the service". — [The Register](https://www.theregister.com/2026/01/20/rackspace_price_changes/)
- **Reseller exit:** MI4P will stop managing or supporting Rackspace Email from 1 Jan 2027, citing the pricing changes. — [MI4P FAQ](https://mi4p.helpjuice.com/e-mail/rackspace-email-changes-%E2%80%93-frequently-asked-questions)
- **Hosted Exchange:** Rackspace sunset its Hosted Exchange service after the ransomware attack in December 2022. — [Dark Reading](https://www.darkreading.com/cyberattacks-data-breaches/rackspace-discontinues-email-service-downed-in-ransomware-attack) (headline and snippet only; the page returned 403)
- **Encryption, eDiscovery, retention:** no Rackspace source on S/MIME, eDiscovery or retention tiers could be fetched. The only retention-type offer seen is the Archiving add-on.

### Inferences
- Zoho's price ladder in India is very low: ₹59 (about $0.67) is the floor for a paid custom-domain mailbox. Compliance features are held back for the ₹199 and ₹399 tiers, so a competitor could stand out by putting S/MIME and basic retention in a cheaper tier.
- Zoho's Workplace Standard (₹99) costs less than Mail Premium (₹199) yet bundles office apps. In other words, Zoho prices storage and compliance higher than collaboration apps.
- Rackspace at $10 plus $2 plus $6 is now far more expensive than Zoho. It no longer competes on price, and resellers are leaving. Its 404'd product pages suggest it is de-emphasising email (unconfirmed).

### Gaps
- Official USD prices for Zoho Workplace Professional and the exact USD for Standard could not be confirmed; the US page redirected to India.
- Zoho's retention period options and its archive/journaling details per tier were not found beyond "retention storage".
- Current official Rackspace pricing page: every page tried returned 404 on 26 Nov 2026. Whether the 25 GB / 50 MB / 30 GB specs still apply after the Open-Xchange migration is unconfirmed.
- Rackspace sending limits, alias limits and S/MIME support were not found.

## Zoho-specific features (Streams, eWidget, Notes, Tasks, Calendar, Mail merge, Zia, WorkDrive, Writer/Sheet/Show, Cliq, Meeting, admin, migration, data centres, mobile)

### Takeaway
Every Zoho Mail tier includes Calendar, ToDo/Tasks, Notes, Mail Merge, Streams and Cliq (Free on Mail-only plans), along with Zia and eWidget. Workplace tiers add WorkDrive, Writer, Sheet, Show, Meeting and Vault, and Professional adds Connect. Indian data is hosted in Mumbai and Chennai under mail.zoho.in.

### Cited Findings

**Bundled apps by plan** — [Workplace pricing](https://www.zoho.com/workplace/pricing.html); [Zoho Mail pricing](https://www.zoho.com/mail/zohomail-pricing.html)

| App | Lite | Premium | Wp Standard | Wp Professional |
|---|---|---|---|---|
| Mail, Calendar, ToDo, Directory, CPaaS (Email), Zia | Yes | Yes | Yes | Yes |
| eProtect (retention and compliance) | – | Yes | – | Yes |
| Cliq | Free | Free | Yes | Yes |
| WorkDrive, Writer, Sheet, Show, Meeting, Vault | – | – | Yes | Yes |
| Connect (intranet) | – | – | – | Yes |
| Trident desktop app, mobile and desktop apps, identity/MFA app, eWidget and developer space, bulk transactional email | Yes | Yes | Yes | Yes |
| Password manager, office suite, unified communications | – | – | Yes | Yes |

**Feature rows from the India matrix (all four tiers unless noted)** — [Zoho India pricing](https://www.zoho.com/en-in/mail/zohomail-pricing.html)

- **Calendar:** integrated calendar, resource booking, calendar sync, group calendars, appointment scheduling, mobile calendar.
- **ToDo:** tasks, sub-tasks, group tasks, shared tasks, recurring tasks, attachments, turning a mail into a task, linking a task to a mail, mobile apps.
- **Notes:** notes, group notes, sticky notes, sharing, attachments, turning a mail into a note, linking a note to a mail, mobile access through the Streams app.
- **Cliq:**
  - Messaging, channels, voice and video calls, and threads on all tiers.
  - Searchable messages: 10,000 on Lite and Premium, unlimited on Standard and Professional.
  - File storage: 100 GB per organisation; 100 GB per user on Professional.
  - Channel size: 100 participants; 20,000 on Professional.
  - Meetings: up to 100 participants. Professional allows 1,000 active participants plus 10,000 viewers.
  - Meeting duration: 60 minutes on Lite and Premium, 24 hours on Standard and Professional.
  - Rebranding, custom domain and custom email are on two tiers only.
- **Zoho Meeting:** up to 100 participants (Standard) or 250 (Professional), with 5 GB of cloud recording per host.
- **WorkDrive (Workplace only):** 10 GB file upload limit, team folders, external links, password-protected links, AES-256 encryption at rest, preview of 200+ formats, desktop sync, admin dashboard.
- **Writer, Sheet, Show (Workplace only):** online editors plus iOS and Android apps.
- **Vault (Workplace only):** unlimited passwords, TOTP, passwordless unlock, offline access, browser extensions.
- **Directory (all tiers):**
  - Unlimited SSO for Zoho apps; SSO for 3 third-party apps covering 10 users.
  - 3 routing policies and 3 conditional-access rules.
  - Device authentication for 10 devices, 30 days of reports, 2 directory stores.
  - OneAuth authenticator app.
- **CPaaS (optional):** SMTP and API sending, email analytics, suppression lists, webhooks.
- **Zoho Connect (Professional only):** intranet with unlimited groups, forums, 5 external users per member.

**Data centres:** Zoho opened data centres in Mumbai and Chennai to serve customers who register on the .in portal. — [Analytics India Magazine](https://analyticsindiamag.com/zoho-opens-new-data-centres-in-mumbai-chennai-to-handle-traffic-from-india/). The mail.zoho.in domain maps to India-hosted data. — [Zoho Mail GDPR page](https://www.zoho.com/mail/help/zoho-mail-gdpr-compliance.html). The data centre is chosen from the user's IP at sign-up. — [Zoho privacy FAQ](https://www.zoho.com/privacy/privacy-faq.html)

**Enterprise only:** Microsoft Active Directory cloud sync, Virtual Private Cloud, endpoint control, pooled mail storage. — [Workplace pricing](https://www.zoho.com/workplace/pricing.html)

**Certifications (per the partner page):** ISO 27001, SOC 2 Type II, GDPR, two-factor authentication, encryption at rest and in transit. — [Zoho web hosting partner page](https://www.zoho.com/workplace/web-hosting-provider-partnership.html)

### Inferences
- Zoho bundles "mail plus PIM": tasks, notes and calendar linked to messages, plus the Streams comment and share layer, even on the ₹59 tier. A competitor needs at least Calendar, Contacts and Tasks at its entry price to be comparable.
- The CPaaS line means transactional or bulk email is sold separately from user mailboxes. That split is a pattern worth copying, because the mailbox tier itself bans bulk sending.

### Gaps
- Offline mode, mail templates, bookmarks and the details of Zia AI features (summaries, writing help) were not found in the sources reached. The pricing pages only list "Zia AI assistant".
- Spam-control and mail-policy specifics (quarantine, allow and block lists, DMARC reports) and the full list of migration-tool sources were not fetched.
- Whether the Forever Free plan is offered on the India data centre was not confirmed ("select data centers" only).

## Rackspace-specific features (webmail, ActiveSync, archiving, spam/virus, 24x7 support, migration, reseller control panel)

### Takeaway
Rackspace Email is an IMAP/POP webmail product. ActiveSync and 30 GB of file storage come only with the Email Plus add-on, and archiving is a separate add-on. The platform has been moving to Open-Xchange/Dovecot since 2024 and has been losing features. Hosted Exchange was discontinued after 2022.

### Cited Findings
- **Open-Xchange migration:** Rackspace's FAQ dates the start of the move of Rackspace Email users to a new platform to February/March 2024. — [Rackspace OX FAQ (search snippet; page returned 404 on fetch)](https://docs.rackspace.com/docs/open-xchange-faq). Rackspace adopted OX's Dovecot Pro IMAP platform. — [LinuxToday](https://www.linuxtoday.com/infrastructure/rackspace-adopts-oxs-dovecot-pro-open-source-imap-email-platform/)
- **Feature removals:** — [Rackspace docs: feature changes and removal](https://docs.rackspace.com/docs/rackspace-email-feature-changes-and-removal)
  - April 2022: split-domain routing, domain catch-all and BCC archiving were closed to new setups.
  - May 2022: admins can no longer set out-of-office replies or forwarding from the control panel.
  - June 2022: webmail identities were closed to new setups.
  - August 2022: spam and trash are purged after 30 days.
  - April 2024: Webmail Chat was shut down.
- **Webmail:** the webmail interface covers send and receive, signatures and forwarding. — [Rackspace Webmail overview](https://docs.rackspace.com/docs/rackspace-webmail)
- **Email Plus:** ActiveSync, 30 GB online storage and sharing per user, desktop sync. — [Rackspace Email Plus page (snippet)](https://www.rackspace.com/email-hosting/webmail/rackspace-email-plus)
- **Migration:** Rackspace has a self-service migration tool and a migrations service page. — [Self-Service Migration Tool docs](https://docs.rackspace.com/docs/migrate-your-email-by-using-the-self-service-migration-tool); [Rackspace migrations page](https://www.rackspace.com/en-us/email-hosting/migrations)
- **Support:** Rackspace's statement on the price rise cites its "award-winning Fanatical Support". — [The Register](https://www.theregister.com/2026/01/20/rackspace_price_changes/)

### Inferences
- The removed features (catch-all, BCC archiving, split routing, admin-set auto-replies) still matter to small businesses. They are cheap to build and could be positioned as differentiators against both Rackspace and Zoho.
- The 2026 price shock and resellers leaving (MI4P, Laughing Squid considering alternatives) create a migration opportunity. A "Rackspace import" path in a competitor's migration tool would have marketing value.

### Gaps
- Rackspace's spam and virus filtering specs, archiving retention period, 24x7 support channels and control-panel features could not be read; the pages return 404.
- Whether Rackspace still sells to new customers in late 2026 is unclear; the product pages are 404 and there is no official discontinuation notice.

## Reseller / partner models (how others sell email under their brand)

### Takeaway
Zoho runs a formal reseller and web-host partner programme: up to 35% margin, custom packaging and pricing, white-label options, a Partner Control Panel and WHMCS and cPanel/WHM modules. Rackspace historically sold through resellers who set their own prices, but the 2026 price increases squeezed them hard.

### Cited Findings
- **Zoho web-host partner programme:**
  - Margin: "up to 35% partner margin" on a perpetual growth-commission model; the conditions behind the asterisk are not shown.
  - Packaging: partners build their own packages and prices, including bundles with hosting and tiered plans.
  - White-label options are mentioned but not described.
  - Integration: API documentation; integration "typically takes a few days".
  - Support for partners: dedicated account managers, co-marketing, 24/7 technical support.
  - Onboarding: interest form, then a discovery call, then a partnership agreement.
  - Source: [Zoho web hosting provider partnership](https://www.zoho.com/workplace/web-hosting-provider-partnership.html)
- **Zoho Partner Control Panel:** partners add client organisations, view payment reports and open each client's Mail control panel. Approved applicants are onboarded as resellers of Zoho Workplace. — [Zoho Workplace Partner Program help](https://zoho.com/mail/help/partnerportal/partner-portal.html); [Mail control panel access for partners](https://www.zoho.com/store/partner/help/mail-control-panel-access.html)
- **Provisioning plugins:** Zoho provides a WHMCS module (create mailboxes, open the client control panel) and a WHM/cPanel plugin. — [Zoho Mail WHMCS module](https://www.zoho.com/mail/help/partnerportal/whmcs-integration.html); [Zoho Mail WHM plugin](https://www.zoho.com/mail/help/partnerportal/whm-integration.html)
- **ISP partnerships:** Zoho also runs an ISP-specific partner track. — [Zoho ISP partnership](https://www.zoho.com/workplace/partnership/internet-service-provider.html)
- **End-customer white labelling:** Mail Premium and Workplace Professional include "White Labeling" and "Custom Login". — [Zoho India pricing](https://www.zoho.com/en-in/mail/zohomail-pricing.html)
- **Indian resellers:** authorised Indian resellers (for example itforsme.in and Cloudfy) publish their own prices, which differ from Zoho's list. One reseller shows Mail Lite at ₹90. — [itforsme](https://itforsme.in/pricing/zoho-mail-india); [Cloudfy](https://cloudfysystems.com/blog/zoho-mail-lite-india)
- **Rackspace resellers:** resellers such as Cloudways, Bibliopolis and CountingWorks resold mailboxes at their own prices: $1.50 at Cloudways from Sep 2026, $5 for legacy-platform mailboxes. After the 2026 increase, one reseller's bill more than doubled. — [Cloudways](https://www.cloudways.com/blog/rackspace-vs-titan/); [Bibliopolis](https://www.bibliopolis.com/help/article/rackspace-email-accounts-now-5-per-month-alternative-options); [The Register](https://www.theregister.com/2026/01/20/rackspace_price_changes/)

### Inferences
- mrrokesh.com could resell Zoho through the partner programme (35% margin on ₹59–₹399 list prices) instead of, or before, building its own platform. The Rackspace case shows the risk: the upstream provider can reprice suddenly and wipe out reseller margins.
- If mrrokesh.com builds its own SaaS, the features expected in a reseller-grade product are a partner console (multi-org management, billing reports), WHMCS/cPanel provisioning modules, a provisioning API and white-label login.

### Gaps
- Zoho's exact partner discount schedule, minimum volumes and the actual contents of "white-label" (branded webmail domain? branded apps?) are not public in the sources reached.
- Rackspace's current reseller programme terms and control-panel capabilities in 2026 were not found; the pages return 404.
