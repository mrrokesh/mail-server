# Microsoft 365 and Google Workspace as custom-domain business email + productivity suites (late 2026)

Research date: 25-26 Nov 2026. Purpose: a feature-by-feature inventory per tier, used to design a competing subscription email SaaS (mrrokesh.com).

How to read this file:
- **[V]** means the claim was verified this session against the linked source.
- **[K]** means long-standing product knowledge that was NOT re-verified this session. Treat [K] items as likely but unconfirmed, and check them before you publish anything. They appear only in Inferences tables, never as cited findings.
- microsoft.com plan and pricing pages timed out on every fetch this session. Microsoft prices therefore come from reseller and press sources that agree with each other, plus the Microsoft Learn limits page, which was fetched in full (`ms.date` 2026-11-11, updated 2026-11-23).
- workspace.google.com/pricing was served with India (INR) content on every fetch, even with `hl=en_ch` and `/intl/en/`. USD Google prices come from Google's own Knowledge Center billing page.

---

## Q1. Per-tier price, mailbox storage, attachment limit, sending limits, max users, archive, shared mailboxes, aliases, groups, cloud storage

### Takeaway
- **Microsoft:**
  - It has one sending-limit profile on every tier: 10,000 recipients a day, 30 messages a minute, up to 1,000 recipients per message, and 300 aliases.
  - Tiers differ mainly in archive size. The archive is 50 GB on Business Basic/Standard and E1, and up to 1.5 TB on Business Premium, E3/E5 and Exchange Online Plan 2.
  - Tiers also differ in the security and compliance add-ons each includes.
  - As of the Nov 2026 Learn page, the primary mailbox is 100 GB on all business and enterprise tiers except E1 and Exchange Online Plan 1 (50 GB), and F3 and Kiosk (2 GB).
  - Prices rose on 1 July 2026: Basic $7, Standard $14, Premium $22, E3 $39, E5 $60.
- **Google:**
  - Tiers differ mainly in pooled storage (30 GB, 2 TB, 5 TB, 5 TB+), Meet size, and Vault, which starts at Business Plus.
  - Gmail sending limits are the same on every paid tier: 2,000 messages and 10,000 recipients a day, with a 3,000 external-recipient cap.
  - USD prices are $7, $14 and $22 per user per month (annual) for Starter, Standard and Plus.
  - India shows a different line-up: Base ₹99, Starter ₹270, Standard ₹1,080, Enterprise (contact sales). Business Plus is not listed on the India page.

### Cited Findings

#### Microsoft 365 / Office 365 / Exchange Online: USD list prices (per user/month, annual commitment, effective 1 July 2026)

| SKU | Before | From 1 Jul 2026 | No-Teams variant (after) |
|---|---|---|---|
| Business Basic | $6.00 | $7.00 | $5.40 |
| Business Standard | $12.50 | $14.00 | $10.79 |
| Business Premium | $22 (listed as a "new SKU") | $22.00 | $18.79 |
| Office 365 E1 | — | $10.00 | $6.79 |
| Office 365 E3 | $23 | $26 | $17.45 |
| Office 365 E5 | $38 | $41 | $32.45 |
| Microsoft 365 E3 | $36 | $39 | $30.45 |
| Microsoft 365 E5 | $57 | $60 | $51.45 |
| Microsoft 365 F1 | $2.25 | $3.00 | $2.50 |
| Microsoft 365 F3 | $8 | $10 | $8.93 |

- Table source: [Zation price update](https://www.zation.io/price-update/).
- The Business Basic $7 and Standard $14 figures are corroborated by [The Register](https://www.theregister.com/2025/12/05/microsoft_365_prices_up_2026).
- **Conflict:** [heise](https://heise.de/-11103991) reports Basic at $7.50 and Premium at $24.50. The Register says Premium stays at $22. Zation, The Register and most resellers agree on $7 / $14 / $22.
- Microsoft announced the increase on 4 Dec 2025. It applies globally with local market adjustments. Suites without Teams get an equivalent dollar increase. — [Microsoft 365 blog](https://microsoft.com/en-us/microsoft-365/blog/2025/12/04/advancing-microsoft-365-new-capabilities-and-pricing-update)
- New Copilot bundles from 1 Jul 2026, at partner pricing:
  - Business Standard + Copilot: about $23–23.50.
  - Business Premium + Copilot: about $32.
  - Business Basic + Copilot: $21 promotional price through 31 Dec 2026, for 1–300 seats.
  - Source: search summary of [Microsoft partner blog](https://partner.microsoft.com/da-dk/blog/article/partner-led-smb-m365-copilot) and [SoftwareOne](https://www.softwareone.com/en/channel-partner/articles/2026/05/26/lower-copilot-prices-bigger-partner-opportunity). An earlier Microsoft blog from March 2026 gave $28 / $35 / $43, which has since been superseded. These are lower-confidence figures.
- **Exchange Online Plan 1 / Plan 2 / Kiosk standalone USD prices:** no 2026 source found. See Gaps.

#### Microsoft: INR prices (low confidence; resellers disagree)

| Plan | Reported INR (per user/month, annual, ex-GST) | Source / date |
|---|---|---|
| Business Basic (with Teams) | ₹170 (no Teams ₹130); monthly billing ₹204 | Search summary citing the Microsoft India site, checked 6 Nov 2026 — [hapihhost](https://www.hapihhost.in/blog/ms-office-365-price/), [synergyscape](https://synergyscape.co.in/blog/microsoft-365-price-india-per-user) |
| Business Basic | ₹150 (no Teams ₹130) | [HostMinute, 16 Nov 2026](https://hostminute.com/microsoft-365-price-india/) |
| Business Standard | ₹860 | [HostMinute](https://hostminute.com/microsoft-365-price-india/) |
| Business Premium | ₹1,830 | [HostMinute](https://hostminute.com/microsoft-365-price-india/) |
| Range across all business plans | ₹130 – ₹2,660 | search summary ([hapihhost](https://www.hapihhost.in/blog/ms-office-365-price/)) |
| Older figures (likely before July 2026) | Basic ₹125, Standard ₹660, Premium ₹1,650, Apps for Business ₹530 | [Cloudfy](https://www.cloudfysystems.com/blog/microsoft-365-pricing-plans-india). Its page date (May 2026) conflicts with "2025" in the body text, and it says the mailbox is 50 GB, which is now outdated. |

- India adds 18% GST. Month-to-month billing costs about 20% more than annual. — [Cloudfy](https://www.cloudfysystems.com/blog/microsoft-365-pricing-plans-india); search summary of Sept 2026 guides

#### Microsoft: Exchange Online limits (Microsoft Learn, updated Nov 2026)
Source for every row: [Exchange Online limits](https://learn.microsoft.com/en-us/office365/servicedescriptions/exchange-online-service-description/exchange-online-limits)

| Limit | Business Basic & Standard | Business Premium | M365 E3/E5 | O365 E1 | O365 E3/E5 | F3 | EXO Plan 1 | EXO Plan 2 | EXO Kiosk |
|---|---|---|---|---|---|---|---|---|---|
| User mailbox | 100 GB | 100 GB | 100 GB | 50 GB | 100 GB | 2 GB | 50 GB | 100 GB | 2 GB |
| Archive mailbox | 50 GB | 1.5 TB (auto-expanding) | 1.5 TB | 50 GB | 1.5 TB | Not available | 50 GB (1.5 TB with the EOA add-on) | 1.5 TB | Not available |
| Shared mailbox (unlicensed) | 50 GB | 50 GB | 50 GB (100 GB if licensed) | 50 GB | 50/100 GB | 50 GB | 50 GB | 100 GB | 50 GB |
| Resource (room) mailbox | 50 GB | 50 GB | 50 GB | 50 GB | 50 GB | 50 GB | 50 GB | 100 GB | 50 GB |
| Group mailbox (M365 Group) | 50 GB | 50 GB | 50 GB | 50 GB | 50 GB | 50 GB | 50 GB | 50 GB | 50 GB |
| Recoverable Items (not on hold / on hold) | 30 / 100 GB | 30 / 100 GB | 30 / 100 GB | 30 / 100 GB | 30 / 100 GB | 30 / 100 GB | 30 / 100 GB | 30 / 100 GB | 30 / 100 GB |
| Recipient rate limit | 10,000 a day | same | same | same | same | same | 10,000 a day | 10,000 a day | 10,000 a day |
| Recipients per message | customisable, up to 1,000 | same | same | same | same | same | same | same | same |
| Message rate limit | 30 a minute | same | same | same | same | same | 30 a minute | 30 a minute | 30 a minute |
| Aliases (proxy addresses) per mailbox | 300 | 300 | 300 | 300 | 300 | 300 | 400 | 400 | 400 |
| Max message size | 35 MB send / 36 MB receive by default; admin can set 1–150 MB | same | same | same | same | same | same | same | same |
| Attachment size, Outlook desktop | 150 MB | same | same | same | same | same | same | same | same |
| Attachment size, Outlook on the web | 112 MB | same | same | same | same | same | same | same | same |
| Attachment size, Outlook mobile | 150 MB (message size limit 33 MB) | same | same | same | same | same | same | same | same |
| Attachments per message | 250 | same | same | same | same | same | same | same | same |
| Encrypted message size (Purview Message Encryption) | 100 MB; about 200 recipients | same | same | same | same | same | same | same | same |
| Distribution group members | 100,000 (moderation required at 5,000 or more) | same | same | same | same | same | same | same | same |
| Message size to groups of 5,000–99,999 / 100,000 members | 25 MB / 5 MB | same | same | same | same | same | same | same | same |
| Transport (mail flow) rules per org | 300 | 300 | 300 | 300 | 300 | 300 | 300 | 300 | 300 |
| Journal rules per org | 300 | 300 | 300 | 300 | 300 | 300 | 50 | 50 | 50 |
| Inbox rules space | 256 KB | same | same | same | same | same | same | same | same |
| Recipients added by transport rules | 100 | same | same | same | same | same | same | same | same |

Notes for this table:
- In the bundled-plan rows, "same" means the value in the first column applies to every bundled plan (Business through F3).
- Rows that show the same value across the three standalone Exchange Online columns were also checked against the standalone table on the same page. The source lists the bundled plans and the standalone Exchange Online plans in separate tables. This table combines them.
- The shared-mailbox column headings come from the bundled-plan table, and some cells are footnoted "50/100 GB". A shared mailbox gets 100 GB only when it has its own licence.

Other Exchange Online limits from the same page:
- **Tenant External Recipient Rate Limit (TERRL):** a per-tenant daily cap on external recipients that scales with the number of licences. Trial tenants are capped at 5,000 external recipients a day. Mail sent from `*.onmicrosoft.com` domains is throttled to 100 external recipients per org per 24 hours. Microsoft points bulk senders to Azure Communication Services Email instead. — [Exchange Online limits](https://learn.microsoft.com/en-us/office365/servicedescriptions/exchange-online-service-description/exchange-online-limits)
- **Holds and compliance policies:**
  - 10,000 compliance policies per tenant, which covers retention, holds, DLP and sensitivity labels.
  - 1,800 Microsoft 365 retention policies per tenant.
  - Holds per mailbox: 25 recommended, 50 supported.
  - Source: [Exchange Online limits](https://learn.microsoft.com/en-us/office365/servicedescriptions/exchange-online-service-description/exchange-online-limits)
- **Archive mailbox use:** using journaling, transport rules or auto-forward to archive other users' mail into an Exchange Online archive is not permitted. An archive is for that one user. — [Exchange Online limits](https://learn.microsoft.com/en-us/office365/servicedescriptions/exchange-online-service-description/exchange-online-limits)

#### Google Workspace: USD prices (per user/month; Google Knowledge Center)

| Edition | Flexible (monthly) | Annual/Fixed-Term | Annual, paid yearly |
|---|---|---|---|
| Business Starter | $8.40 | $7.00 | $84 |
| Business Standard | $16.80 | $14.00 | $168 |
| Business Plus | $26.40 | $22.00 | $264 |
| Enterprise Standard / Plus | not published (contact sales) | — | — |

- Table source: [Google: AI features and pricing updates for Business editions](https://knowledge.workspace.google.com/admin/billing/ai-features-and-pricing-updates-for-google-workspace-business-editions?hl=en).
- These prices took effect on 16 Jan 2025 for new subscriptions and were rolled out to existing customers through July 2025. They are the current list prices. **Flag:** they date from early 2025 and had not been superseded as of late 2026.
- The price rise came with Gemini being bundled into the plans. The earlier Gemini add-on is no longer sold. — [same source](https://knowledge.workspace.google.com/admin/billing/ai-features-and-pricing-updates-for-google-workspace-business-editions?hl=en)

#### Google Workspace: India (INR) storefront, as served Nov 2026

| Plan | ₹/user/month (annual, billed monthly) | Intro offer | Pooled storage | Meet | Recording | Max users |
|---|---|---|---|---|---|---|
| **Base** (new; India) | ₹99 | 50% off for 3 months (₹49.50), 9 Dec 2026 – 9 Mar 2027 | 20 GB | 100 | No | 20 |
| Starter | ₹270 | — | 30 GB | 100 | No | 300 |
| Standard | ₹1,080 | 20% off (₹864), first 20 users, 12 months | 2 TB | 150 | Yes | 300 |
| Enterprise | Contact sales | — | 5 TB+ | 1,000 | Yes | No limit |

- Table source: [workspace.google.com/pricing (India content)](https://workspace.google.com/intl/en/pricing.html)
- The India page lists **no Business Plus**. Its only Gemini access on Base is "Chat with Gemini"; Gmail and the Workspace apps have none on Base. — [workspace.google.com/pricing](https://workspace.google.com/pricing?hl=en_ch)
- On this page, DLP and S/MIME appear only on Enterprise. Endpoint management is "Fundamental" on Base, Starter and Standard. Workspace Studio (automation) is on Starter and above. Appointment booking, eSignature and noise cancellation are on Standard and above. — [workspace.google.com/pricing](https://workspace.google.com/pricing?hl=en_ch)
- A search found no non-Google source for a "Base" plan. — [WebSearch results summary](https://www.name.com/en-us/blog/google-workspace-pricing). So "Base" appears to be a new, India-specific entry plan: 20 users maximum, 20 GB storage.

#### Google Workspace: limits by edition

| Limit | Business Starter | Business Standard | Business Plus | Enterprise Standard | Enterprise Plus |
|---|---|---|---|---|---|
| Pooled storage per user | 30 GB | 2 TB | 5 TB | 5 TB (more on request) | 5 TB (more on request) |
| Max users | 300 | 300 | 300 | no limit | no limit |
| Sending attachment size | 25 MB | 25 MB | 25 MB | 25 MB (receive 35 MB) | up to 50 MB (web Gmail) |
| Messages sent per day | 2,000 (500 on trial) | 2,000 | 2,000 | 2,000 | 2,000 |
| Total recipients per day | 10,000 | 10,000 | 10,000 | 10,000 | 10,000 |
| External recipients per day | 3,000 | 3,000 | 3,000 | 3,000 | 3,000 |
| Unique recipients per day | 3,000 (2,000 external) | same | same | same | same |
| Recipients per message | 2,000 (500 external) | same | same | same | same |
| Recipients per message via SMTP (IMAP/POP clients) / Gmail API | 100 / 500 | same | same | same | same |
| Auto-forwards per day / auto-forward filters | 10,000 / 40 | same | same | same | same |

Sources for this table:
- Storage and max users for Business editions: [Compare Business editions](https://knowledge.workspace.google.com/admin/getting-started/editions/compare-business-editions?hl=en)
- Enterprise storage and attachment sizes: [Compare Enterprise editions](https://knowledge.workspace.google.com/admin/getting-started/editions/compare-enterprise-editions?hl=en)
- Sending limits: [Gmail sending limits](https://knowledge.workspace.google.com/admin/gmail/gmail-sending-limits-in-google-workspace)

More on Gmail sending limits:
- Higher limits apply only after the domain has paid at least $100 in total. This can take up to 75 days.
- Mail merge is capped at 1,500 messages a day.
- Source: [Gmail sending limits](https://knowledge.workspace.google.com/admin/gmail/gmail-sending-limits-in-google-workspace)

### Inferences
- **Sending limits:** Microsoft and Google are close: about 10,000 recipients a day per user on both. Google also caps external recipients at 3,000 a day, and Microsoft has a per-tenant external cap (TERRL). Both point bulk senders to separate products: Azure Communication Services for Microsoft, and the mail-merge cap for Google. A challenger can copy this model: a generous person-to-person limit, a hard external cap, and bulk mail sold as a separate add-on.
- **Attachments:** Microsoft's 150 MB maximum (35 MB by default) is far above Gmail's 25 MB. Gmail's limit is a known complaint, so a large native attachment limit, or automatic "send as link", is a cheap differentiator.
- **Archive:** Microsoft's auto-expanding archive of up to 1.5 TB on Business Premium, E3 and EXO Plan 2 is the strongest retention and storage story. Google has no separate archive tier; it uses pooled storage plus Vault.
- **Aliases and shared mailboxes ([K]):** Google allows 30 aliases per user. Shared mailboxes do not exist in Google; it uses Groups (collaborative inbox) or delegation instead. Microsoft offers free, unlicensed shared mailboxes of up to 50 GB on every Exchange tier. Free shared mailboxes are a strong SMB hook to copy.
- **Cloud storage ([K]):** OneDrive gives 1 TB per user on Business Basic, Standard and Premium, and on E-plans. SharePoint gives the tenant 1 TB plus 10 GB per licence. Google pools storage at 30 GB, 2 TB or 5 TB per user.
- **Max users ([K]):** Business Basic, Standard and Premium are capped at 300 users. E-plans and EXO plans have no cap.

### Gaps
- No 2026 source was found for the standalone USD prices of Exchange Online Plan 1, Plan 2 or Kiosk. Long-standing pre-2026 list prices were Plan 1 $4, Plan 2 $8 and Kiosk $2 ([K]); they may have changed.
- No official Microsoft India INR price page could be fetched. microsoft.com timed out every time. INR figures come from resellers only and conflict (Basic ₹125–₹170).
- Google's US pricing page could not be fetched (geo-served as India). Business Plus availability in India was not confirmed by a second source.
- The Google Enterprise Standard / Plus USD price is not published.

---

## Q2. Mail features (focused inbox, rules, scheduled send, undo send, delegation, calendars, rooms, read receipts, S/MIME, encryption, retention, eDiscovery, holds, DLP, journaling, transport rules, connectors, anti-phishing, Safe Links/Attachments, quarantine)

### Takeaway
- **Microsoft:**
  - Every Exchange tier gets the core mail and admin plumbing: transport rules, journaling, connectors, shared and room mailboxes, and Exchange Online Protection quarantine.
  - From July 2026, Business Basic, Standard and E1 add "URL checks", a lightweight version of Safe Links.
  - Full Defender for Office 365 Plan 1 (Safe Links, Safe Attachments, impersonation protection) is in Business Premium and, from July 2026, in E3. Plan 2 (attack simulation and automated investigation) is in E5.
  - Purview retention, eDiscovery and holds scale up from Premium to E3 to E5.
- **Google:**
  - Starter and Standard get retention policies and basic DLP for Drive.
  - Attachment sandboxing starts at Standard. Vault (eDiscovery and legal hold) starts at Business Plus.
  - Gmail DLP, S/MIME and client-side encryption are Enterprise-only. S/MIME and client-side encryption are Enterprise Plus only.

### Cited Findings
- **Basic, Standard and E1:** from the July 2026 update, these plans get "URL checks" against known malicious sites when users click links in email and Office apps. — [Microsoft 365 blog](https://microsoft.com/en-us/microsoft-365/blog/2025/12/04/advancing-microsoft-365-new-capabilities-and-pricing-update)
- **Office 365 E3 and Microsoft 365 E3:** from July 2026 they add Defender for Office 365 Plan 1 ("enhanced email security"), plus Intune Plan 2, Remote Help and Advanced Analytics. — [Microsoft 365 blog](https://microsoft.com/en-us/microsoft-365/blog/2025/12/04/advancing-microsoft-365-new-capabilities-and-pricing-update)
- **Microsoft 365 E5:** adds Intune Endpoint Privilege Management, Enterprise App Management and Cloud PKI. Security Copilot is coming, with 30 days' notice before it is switched on. — [Microsoft 365 blog](https://microsoft.com/en-us/microsoft-365/blog/2025/12/04/advancing-microsoft-365-new-capabilities-and-pricing-update)
- **Business Premium components:** it bundles Defender for Business, Defender for Office 365 Plan 1, Entra ID P1, Intune Plan 1 and Purview capabilities. Defender for Office 365 Plan 1 adds impersonation protection, phishing thresholds and Safe Attachments. — [Microsoft Learn: M365 Business Premium security overview](https://learn.microsoft.com/en-us/microsoft-365/admin/security-and-compliance/m365b-security-overview); [Business Premium FAQ](https://learn.microsoft.com/microsoft-365/admin/security-and-compliance/m365bp-security-faq)
- **Defender for Business limits:** up to 300 users and 5 devices per user. — [Microsoft Defender service description](https://learn.microsoft.com/en-us/office365/servicedescriptions/microsoft-365-service-descriptions/microsoft-365-tenantlevel-services-licensing-guidance/microsoft-defender-service-description)
- **Microsoft encryption:** Purview Message Encryption supports messages up to 100 MB and about 200 recipients. Legacy Office 365 Message Encryption is deprecated. — [Exchange Online limits](https://learn.microsoft.com/en-us/office365/servicedescriptions/exchange-online-service-description/exchange-online-limits)
- **Microsoft transport and journal rules:** 300 transport rules per org, and 300 journal rules (50 on standalone EXO plans). — [Exchange Online limits](https://learn.microsoft.com/en-us/office365/servicedescriptions/exchange-online-service-description/exchange-online-limits)
- **Google Business editions:**
  - Retention policies for email and chat: Starter, Standard and Plus.
  - Security Sandbox for attachments: Standard and Plus.
  - Drive DLP insights: all three editions.
  - Vault (eDiscovery and governance): Plus only.
  - Security advisor: Plus only.
  - Source: [Compare Business editions](https://knowledge.workspace.google.com/admin/getting-started/editions/compare-business-editions?hl=en)
- **Google Enterprise editions:**
  - Vault: both Standard and Plus.
  - DLP for Gmail, Drive and Chat: both.
  - Gmail logs in BigQuery: both.
  - S/MIME: Enterprise Plus only.
  - Client-side encryption for Gmail, Drive, Meet and Calendar: Enterprise Plus only.
  - Enterprise Plus also has extra security dashboards (suspicious attachments, spoofing, encryption).
  - Source: [Compare Enterprise editions](https://knowledge.workspace.google.com/admin/getting-started/editions/compare-enterprise-editions?hl=en)
- **Google pricing page:** it lists the Advanced Protection Program, 2-step verification and group-based policies on all plans. — [workspace.google.com/pricing](https://workspace.google.com/pricing)

### Inferences: feature matrix (cells marked [K] are not re-verified this session)

| Mail feature | M365 Basic / Standard | M365 Premium | M365 E3 | M365 E5 | GW Starter | GW Standard | GW Plus | GW Ent Std / Plus |
|---|---|---|---|---|---|---|---|---|
| Focused Inbox / smart tabs [K] | Yes | Yes | Yes | Yes | Tabs (Primary/Promotions) | same | same | same |
| Inbox rules / filters [K] | Yes (256 KB) | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Schedule send [K] | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Undo send [K] | Yes (Outlook, up to 10 s) | Yes | Yes | Yes | Yes (up to 30 s) | Yes | Yes | Yes |
| Delegation / send-as [K] | Yes | Yes | Yes | Yes | Yes (Gmail delegation) | Yes | Yes | Yes |
| Shared mailbox [V] | Yes, free (50 GB) | Yes | Yes | Yes | No (Groups collaborative inbox) [K] | same | same | same |
| Room/resource booking [V for MS sizes] | Yes | Yes | Yes | Yes | Yes (Calendar resources) [K] | Yes | Yes | Yes |
| Read receipts [K] | Yes | Yes | Yes | Yes | No | Yes (admin-enabled) | Yes | Yes |
| S/MIME [V] | Yes, BYO certs [K] | Yes [K] | Yes [K] | Yes [K] | No | No | No | Ent Plus only |
| Message encryption (OME/Purview) | Not in Basic/Standard [K] | Yes [K] | Yes [K] | Yes, plus advanced [K] | Confidential mode [K] | same | same | Ent Plus CSE [V] |
| Retention policies [V for Google] | Basic MRM [K] | Purview retention [K] | Yes [K] | Yes [K] | Yes [V] | Yes [V] | Yes [V] | Yes [V] |
| eDiscovery / legal hold [V for Google] | Not included [K] | Litigation hold + eDiscovery Standard [K] | eDiscovery Standard [K] | eDiscovery Premium [K] | No | No | Vault | Vault |
| DLP for email [V for Google] | No [K] | Yes [K] | Yes [K] | Yes, plus endpoint DLP [K] | No | No | No (Drive only) | Yes |
| Journaling [V] | Yes | Yes | Yes | Yes | Compliance / content rules [K] | same | same | same |
| Mail flow / transport rules [V] | 300 rules | 300 | 300 | 300 | Gmail routing and content compliance [K] | same | same | same |
| Inbound / outbound connectors [K] | Yes | Yes | Yes | Yes | Yes (routes / smart host) | same | same | same |
| Anti-spam and quarantine (EOP) [K] | Yes | Yes | Yes | Yes | Yes (admin quarantine) | Yes | Yes | Yes |
| Safe Links [V] | "URL checks" from Jul 2026 | Defender P1 | Defender P1 from Jul 2026 | Defender P2 | — | — | — | — |
| Safe Attachments / sandbox [V] | No | Defender P1 | Defender P1 from Jul 2026 | Defender P2 | No | Security Sandbox | Security Sandbox | Yes |
| Impersonation / anti-phishing advanced [V] | Basic EOP [K] | Yes | Yes (Jul 2026) | Yes, plus attack simulation [K] | Built-in Gmail [K] | same | same | same, plus extra dashboards |

### Gaps
- Microsoft's official per-plan Purview matrix (which eDiscovery and retention level comes with Basic, Standard and Premium) could not be fetched. Microsoft Purview cells are [K].
- Read receipts, undo-send timing, and the Google alias limit (30) were not re-verified.

---

## Q3. Admin: console, domains/DNS, lifecycle, groups, RBAC, audit, MDM, SSO/SAML, SCIM, conditional access, MFA, passkeys, protocols, migration

### Takeaway
- **Microsoft:** the identity and device stack is the biggest gap between tiers.
  - Business Premium adds Entra ID P1 (conditional access) and Intune Plan 1 (full mobile device management for iOS, Android, Mac and Windows).
  - E3 adds Intune Plan 2, Remote Help and Advanced Analytics from July 2026.
  - E5 adds Endpoint Privilege Management and Cloud PKI.
- **Google:**
  - Basic endpoint management on all Business editions; advanced endpoint management from Business Plus.
  - Secure LDAP on Business Plus.
  - Context-aware access and Cloud Identity Premium on Enterprise.

### Cited Findings
- Entra ID P1, which includes Conditional Access, comes with Business Premium. Business Premium is licensed for full Intune management across iOS, Android, Mac and other platforms. — [Business Premium FAQ](https://learn.microsoft.com/microsoft-365/admin/security-and-compliance/m365bp-security-faq); [M365 Business Premium security overview](https://learn.microsoft.com/en-us/microsoft-365/admin/security-and-compliance/m365b-security-overview)
- The standalone price of Entra ID P1 rose 16% to $7.00 in July 2026, and EMS E3 rose to $12.00. — search summary of [licensly](https://www.licensly.dk/en/blog/microsoft-365-planer-2026) / [netsysgroup](https://www.netsysgroup.com/blog/microsoft-365-price-increase-2026)
- The E3 and E5 Intune additions are listed under Q2. — [Microsoft 365 blog](https://microsoft.com/en-us/microsoft-365/blog/2025/12/04/advancing-microsoft-365-new-capabilities-and-pricing-update)
- **Google Business editions:**
  - Basic endpoint management and the alert center: all three editions.
  - Advanced endpoint management and Secure LDAP: Plus only.
  - Single-region data-region policy: Standard and Plus.
  - Source: [Compare Business editions](https://knowledge.workspace.google.com/admin/getting-started/editions/compare-business-editions?hl=en)
- **Google Enterprise editions:**
  - Context-Aware Access, Cloud Identity Premium, and security dashboards with the investigation tool and audit tools: both Enterprise editions.
  - Advanced data-region controls: Enterprise Plus.
  - Source: [Compare Enterprise editions](https://knowledge.workspace.google.com/admin/getting-started/editions/compare-enterprise-editions?hl=en)
- The India pricing page lists "Enterprise endpoint management" only on Enterprise, with "Fundamental" on the other plans. — [workspace.google.com/pricing](https://workspace.google.com/pricing?hl=en_ch)

### Inferences (all [K] unless noted)

| Admin capability | Microsoft 365 (all business tiers unless noted) | Google Workspace (all tiers unless noted) |
|---|---|---|
| Console | Microsoft 365 admin center plus Exchange admin center, Entra, Intune, Defender and Purview portals (many consoles) | One Admin console (admin.google.com) |
| Domain verification / DNS | TXT verification. Guided setup creates MX, SPF, autodiscover CNAME, DKIM (two CNAMEs) and DMARC. Can set DNS automatically at partner registrars ("Domain Connect"). | TXT or CNAME verification. Guided setup creates MX, SPF, DKIM and DMARC. Domain Connect with some registrars. |
| Users / groups | Create, bulk CSV import, licences, Microsoft 365 Groups, distribution lists, dynamic distribution lists, mail-enabled security groups | Users in organisational units, Google Groups (also used as distribution lists and collaborative inboxes), dynamic groups (Enterprise / Cloud Identity Premium) |
| RBAC | Many built-in Entra and Exchange roles plus custom roles. Privileged Identity Management needs Entra P2 (E5). | Pre-built and custom admin roles on all tiers |
| Audit logs | Unified audit log (standard retention). Audit Premium with longer retention on E5. | Admin and Gmail audit logs. BigQuery export on Enterprise [V]. |
| MFA | Security defaults (free) on all tiers. Conditional-access MFA on Premium and E3/E5 [V: Entra P1]. | 2-step verification on all tiers [V] |
| Passkeys | Supported through Entra (passkeys / FIDO2) on all tiers | Passkeys supported for Workspace accounts on all tiers |
| SSO / SAML | Entra as identity provider (SAML/OIDC gallery apps) on every tier; the free tier has app limits | Google as SAML IdP for third-party apps, plus third-party IdP into Google, on all tiers |
| SCIM provisioning | Entra auto-provisioning (SCIM) for gallery apps | Auto-provisioning to SaaS apps (some tiers) |
| Conditional access | Entra P1: Premium, E3, E5 [V] | Context-Aware Access: Enterprise [V] |
| MDM | Basic Mobility & Security on Basic/Standard. Intune P1 on Premium [V]. Intune P2 on E3 from Jul 2026 [V]. | Fundamental on all. Advanced on Business Plus [V]. Enterprise on Enterprise [V]. |
| IMAP / POP / ActiveSync | All on; admin can turn each off | IMAP and POP (admin toggle); ActiveSync via Google Sync |
| Migration | Exchange admin center migration (IMAP, Google Workspace, cutover/staged/hybrid), Migration Manager | Data Migration Service (IMAP, Exchange, Microsoft 365), Google Workspace Migrate (Enterprise), GWMMO |

### Gaps
- No Microsoft Learn source was fetched for "Basic Mobility & Security" or for the security-defaults MFA level on Basic/Standard.
- Google's SCIM and auto-provisioning edition availability, and the Google alias count, were not verified.

---

## Q4. Bundled collaboration apps and AI (Teams/Meet, Office/Docs, Calendar, Tasks, Forms, Sites, Chat, Bookings, Loop, Copilot/Gemini)

### Takeaway
- **Google Meet:** 100, 150, 500, 500 and 1,000 participants across Starter, Standard, Plus, Enterprise Standard and Enterprise Plus. Recording starts at Standard.
- **Gemini in Google plans:** since the 2025 price rise, Gemini is in every Business edition. Starter gets Gmail-centric AI with lower limits. Standard and above get Gemini across all apps, Pro-level access, and a 1M-token context window.
- **India Base plan:** only the Gemini chat app.
- **Microsoft:** every Microsoft 365 user gets Copilot Chat. From 2026 it is aware of the user's inbox and calendar and can use Word, Excel and PowerPoint agents. Full Microsoft 365 Copilot is a paid add-on, now also sold bundled with Business plans.

### Cited Findings
- **Google Meet limits by Business edition:**
  - Participants: 100 / 150 / 500.
  - Recording to Drive: Standard and Plus.
  - Noise cancellation, breakout rooms, polls and Q&A: Standard and Plus.
  - Attendance tracking: Plus only.
  - Meetings up to 24 hours on all three.
  - Source: [Compare Business editions](https://knowledge.workspace.google.com/admin/getting-started/editions/compare-business-editions?hl=en)
- **Google Meet on Enterprise:** Standard allows 500 participants and live streams to 10k viewers. Plus allows 1,000 participants (those beyond 500 are view-only) and live streams to 100k viewers. — [Compare Enterprise editions](https://knowledge.workspace.google.com/admin/getting-started/editions/compare-enterprise-editions?hl=en)
- **Google business app extras:**
  - eSignature: Standard and Plus.
  - Drive approvals, labels and ransomware detection: Standard and Plus.
  - Appointment schedules: basic on Starter, full on Standard and above.
  - AppSheet Core: all editions.
  - Cloud Search: Standard and above.
  - Source: [Compare Business editions](https://knowledge.workspace.google.com/admin/getting-started/editions/compare-business-editions?hl=en)
- **Gemini limits by edition:**
  - Deep research: 5 reports a month on Starter, 20 a day on Standard and Plus.
  - Images: 20 a day on Starter, 100 a day on Standard and Plus.
  - Sheets AI function: none on Starter, 5,000 a month on Standard and Plus.
  - Gemini in Chat and Meet: Standard and above.
  - Context window: 32K tokens on Starter, 1M on Standard and Plus.
  - Sources: [Compare Business editions](https://knowledge.workspace.google.com/admin/getting-started/editions/compare-business-editions?hl=en); [Google AI pricing update](https://knowledge.workspace.google.com/admin/billing/ai-features-and-pricing-updates-for-google-workspace-business-editions?hl=en)
- **Gemini features on every Business edition:** Gmail side panel, Help me write, suggested replies, AI thread overview, proofread, Vids AI, Canvas, and Gemini in Chrome and in AppSheet. Custom editions (such as Enterprise Essentials Data Region) have no generative AI. — [Google AI pricing update](https://knowledge.workspace.google.com/admin/billing/ai-features-and-pricing-updates-for-google-workspace-business-editions?hl=en)
- **Gemini on the India storefront:**
  - Base: Gemini app only.
  - Starter: Gemini in Gmail and Vids, and "Limited" Gemini in Workspace apps.
  - Standard: Gemini in Docs, Sheets, Slides, Drive, Meet and Chat.
  - Workspace Studio (automation): Starter and above.
  - Source: [workspace.google.com/pricing](https://workspace.google.com/pricing)
- **Microsoft Copilot Chat:** every Microsoft 365 user gets it, now with inbox and calendar awareness and Word, Excel and PowerPoint agents. — [Microsoft 365 blog](https://microsoft.com/en-us/microsoft-365/blog/2025/12/04/advancing-microsoft-365-new-capabilities-and-pricing-update)
- **Copilot-bundled Business SKUs** are described in Q1 (lower-confidence figures). — [SoftwareOne](https://www.softwareone.com/en/channel-partner/articles/2026/05/26/lower-copilot-prices-bigger-partner-opportunity)

### Inferences (Microsoft app bundle; [K])

| App | Business Basic | Business Standard | Business Premium | E3 | E5 | F1 / F3 |
|---|---|---|---|---|---|---|
| Office apps | Web and mobile only | Desktop + web + mobile | Desktop + web + mobile | Desktop + web + mobile | Desktop + web + mobile | Web/mobile (F3); no mail on F1 |
| Teams meetings | 300 participants | 300 + webinars + recording | 300 + webinars + recording | 1,000 interactive; more as view-only | Same as E3, plus Teams Phone and Audio Conferencing | Yes |
| Teams note | Teams is sold separately in the EU/EEA and in "no-Teams" SKUs worldwide [V for SKU prices] | same | same | same | same | same |
| Outlook, Calendar, People, To Do, Planner, Forms, Lists, SharePoint, OneDrive (1 TB) | Yes | Yes | Yes | Yes | Yes | Limited (F1 has no mailbox; F3 has a 2 GB mailbox [V]) |
| Bookings | Yes | Yes | Yes | Yes | Yes | — |
| Loop, Clipchamp | Loop pages basic | + Clipchamp | + Clipchamp | Yes | Yes | — |
| Copilot | Copilot Chat (free) [V]; Copilot add-on or bundle | same | same | same, add-on | same, add-on; Security Copilot coming [V] | Copilot Chat |

### Gaps
- Teams participant and webinar limits per Microsoft plan, and the Microsoft 365 Copilot add-on list price in late 2026, were not verified because microsoft.com timed out. Copilot was historically $30 per user per month, and reports suggest it was cut in 2026 (see the SoftwareOne title above). Unconfirmed.
- Google Tasks, Keep, Sites, Forms and Chat are on every edition ([K]). Not re-verified.

---

## Q5. Differentiators a challenger (mrrokesh.com) should copy first

### Takeaway
Copy first what is cheap to build and that buyers notice on day one:
- Free shared mailboxes and many aliases.
- Large attachment limits.
- One-click DNS setup (MX, SPF, DKIM, DMARC).
- Undo and scheduled send.
- Mobile and IMAP access.
- Built-in AI writing help on the lowest paid tier.

Leave the archive, legal hold and eDiscovery tier, the anti-phishing sandbox and MDM for paid upper tiers, as both incumbents do. Google's new India "Base" plan (₹99, 20 users, 20 GB) is the direct price anchor for an India-first challenger.

### Cited Findings
- **Google Base:** ₹99 per user per month, 20 GB, a 20-user cap, and the Gemini chat app only. Starter is ₹270 for 30 GB. — [workspace.google.com/pricing](https://workspace.google.com/pricing)
- **Microsoft Business Basic in India:** about ₹130–170 ex-GST (reseller-reported). — [HostMinute](https://hostminute.com/microsoft-365-price-india/)
- **Both incumbents bundle AI on entry tiers:** Gemini in Gmail on Starter, and Copilot Chat for every Microsoft 365 user. — [Google AI pricing update](https://knowledge.workspace.google.com/admin/billing/ai-features-and-pricing-updates-for-google-workspace-business-editions?hl=en); [Microsoft 365 blog](https://microsoft.com/en-us/microsoft-365/blog/2025/12/04/advancing-microsoft-365-new-capabilities-and-pricing-update)
- **Compliance is gated behind higher tiers by both:** Google puts Vault on Business Plus and Enterprise only. Microsoft puts the 1.5 TB archive and Defender Plan 1 on Premium, and on E3 from July 2026. — [Compare Business editions](https://knowledge.workspace.google.com/admin/getting-started/editions/compare-business-editions?hl=en); [Exchange Online limits](https://learn.microsoft.com/en-us/office365/servicedescriptions/exchange-online-service-description/exchange-online-limits)

### Inferences
- **Price window in India:** Google Base starts at ₹99 for 20 GB, capped at 20 users. Microsoft Basic is about ₹150 for a 100 GB mailbox and 1 TB OneDrive. That leaves a gap at **₹99–149 for 25–50 GB of mail with no 20-user cap**.
- **Priority 1: copy at launch (table stakes)**
  - Custom domain with automatic DNS setup and live checks for SPF, DKIM and DMARC.
  - Webmail plus IMAP, SMTP and ActiveSync or JMAP.
  - Aliases (30 or more per user) and catch-all.
  - Free shared mailboxes and group (distribution) addresses.
  - Undo send, scheduled send and delegation.
  - Calendar and contacts with CalDAV/CardDAV.
  - Spam filter with a user quarantine.
  - 2FA with passkeys.
  - IMAP migration from Gmail and Outlook.
- **Priority 2: real differentiators against the incumbents**
  - Attachments of 50–150 MB, or automatic large-file links. Gmail is stuck at 25 MB.
  - A simple single admin console. Microsoft spreads admin over 5 or more portals.
  - Per-user retention and an archive on mid tiers, where both incumbents charge more.
  - AI writing, summarising and "help me write" on every paid tier.
  - Appointment-booking pages, which Google gives only to Standard and above and Microsoft sells as Bookings.
  - Transparent INR billing with GST invoices.
- **Priority 3: upper-tier upsells, matching the incumbents' gating**
  - Legal hold and eDiscovery.
  - DLP and transport rules.
  - Journaling to an external archive.
  - S/MIME and end-to-end encryption.
  - Link rewriting and attachment sandboxing.
  - SSO, SAML and SCIM.
  - Audit-log export.
  - Device management, light (app passwords and remote sign-out) rather than full MDM.
- **Sending limits:** mirror the incumbent norm of about 2,000 messages and 10,000 recipients a day per user, with a capped external count and stricter limits during trials. Both incumbents use these limits to keep out spammers who abuse trials.

### Gaps
- No primary-source data was found on which features Indian SMBs value most when buying email. The priority list above is reasoned from the gaps in each incumbent's tiers, not from survey data.
