# SMB / Web-Host Bundled Custom-Domain Email (Neo, Titan, Hostinger, GoDaddy, BigRock), late 2026

Research date: 25–26 Nov 2026. Several primary pages (godaddy.com, bigrock.in, hostadvice.com, titan.email/pricing) returned HTTP 403/404 to the fetch tool. Where that happened, figures come from search snippets or aggregators and are marked as such. Most providers price in USD by default. INR is given wherever a source showed it.

## 1. Per-tier inventory: price, storage, limits, aliases, forwarders, auto-responder, mailboxes, trial

### Takeaway
The market splits into two price bands:
- **Host-bundled "own" email** (Hostinger Business Email): about ₹29–79/mo intro on a 48-month term, renewing at roughly 2.3x.
- **Titan/Neo feature-rich email**: about $2.49–9.99 per mailbox/mo direct, or about ₹89/mo through BigRock.

Lower tiers are capped on purpose: 1 template, 1 contact group, 10–50 read receipts. The cap pushes users to upgrade. Attachment sizes and sending limits are rarely published on pricing pages.

### Cited Findings

**Neo (neo.space), live pricing page**

| | Starter | Standard | Max |
|---|---|---|---|
| Price (USD/mailbox/mo, "Save 20%" label) | $2.49 | $4.99 | $9.99 |
| Storage/mailbox | 15 GB | 50 GB | 100 GB |
| Sending limit | 500/day | 1,000/day | 1,000/day |
| External forwarders | 1 | 3 | 3 |
| Email templates | 1 | Unlimited (tick) | Unlimited (tick) |
| Contact groups | 1 | Tick | Tick |
| Read receipts | 50 | Tick | Tick |
| Attachment limit | not stated | not stated | not stated |

— [Neo pricing](https://www.neo.space/pricing)

- Neo has a 15-day free trial, and the card is charged after it. Billing terms are monthly, 1-, 2- or 4-yearly. Payment is by credit card only. Self-serve appears capped at 50 mailboxes ("Need more than 50 mailboxes?"). Promo codes include OFF50 and a "Monsoon sale 40% off" banner. — [Neo pricing](https://www.neo.space/pricing)
- All Neo tiers include aliases, email rules, conditional forwarding, auto-reply and catch-all. — [Neo pricing](https://www.neo.space/pricing)
- Price conflict: a Neo table elsewhere lists $1.99 / $3.99 / $7.99 for Starter / Standard / Max. Other Neo pages cite "from $1.25/mailbox/mo with four-year billing". No INR pricing was found. — [Neo search results / pricing-and-plan](https://www.neo.space/pricing-and-plan); [Neo blog, business email price](https://www.neo.space/blog/business-email-price)

**Titan (titan.email), direct plans (prices not shown on homepage)**

| | Pro | Premium | Ultra |
|---|---|---|---|
| Storage | 10 GB | 50 GB | 100 GB |
| Read receipts | 10 | Unlimited | Unlimited |
| Templates | 1 | Unlimited | Unlimited |
| Contact groups | 1 | Unlimited | Unlimited |
| Extras | — | 2FA, priority inbox, grammar/spell check, labels, business auto-reply, auto-clean, HTML composer, send later | + follow-up reminders, turbo search, send-as-alias, undo send, custom branding, 50 GB email backup, Titan AI |

— [Titan homepage](https://titan.email/)

- Titan's prices are not on its site (the /pricing URL returned 404). G2 (updated April 2026) lists Business Pro at $2 and Business Premium at $2.45 per user/mo, and says there is no free trial. Cloudways (August 2026) lists Pro at $1.99/mailbox/mo with 25 GB. These storage and price figures conflict with Titan's own 10 GB for Pro. — [G2](https://www.g2.com/products/titan-titan/pricing); [Cloudways](https://www.cloudways.com/blog/rackspace-vs-titan/)

**Hostinger Business Email (India, hostinger.com/in)**

| | Starter | Standard | Premium |
|---|---|---|---|
| Intro price | ₹29/mo (₹1,392 for 48 mo) | ₹49/mo (₹2,352 for 48 mo) | ₹79/mo (₹3,792 for 48 mo) |
| Renewal price | ₹69/mo | ₹119/mo | ₹179/mo |
| "List" (strike-through) price | ₹149 | ₹199 | ₹299 |
| Storage | 5 GB | 20 GB | 50 GB |
| Forwarding rules | 5 | 20 | 50 |
| Aliases | 5 | 10 | 30 |
| AI (search, reply, summarise, write) | No | Unlimited | Unlimited |
| Open tracking | No | Opens | Opens + link clicks + file opens |
| Free domain | No | No | 1 year |
| Auto-responder, migration, catch-all, audit logs, "Agentic Mail", E2E encryption | Yes | Yes | Yes |

— [Hostinger India business email](https://www.hostinger.com/in/business-email)

- Each plan includes 1 mailbox, with "buy 2, get 1 free". There is no free trial on the sales page, only a 30-day money-back guarantee. — [Hostinger India business email](https://www.hostinger.com/in/business-email)
- Hostinger's docs describe a 30-day free trial of a paid plan with one mailbox. Free "Business Email" comes with eligible hosting plans, and the mailbox count depends on the hosting plan. Free plans get 1 forwarding rule and 1 alias per mailbox, plus basic spam protection. Sending limits, message size and recipients per message are shown in hPanel under Mailboxes → View limits and are not published. — [Hostinger docs](https://docs.hostinger.com/emails/overview)

**GoDaddy**
- Professional Email powered by Titan comes in five tiers: Starter, Pro Light, Pro Plus, Premium and Ultra. Storage runs from 1 GB (Starter) to 100 GB (Ultra). Campaigns and appointment booking are Ultra-only. This is a search snippet; the page itself returned 403. — [GoDaddy help 42801 (snippet)](https://www.godaddy.com/en-in/help/compare-professional-email-powered-by-titan-plans-42801)
- GoDaddy also has a separate "Professional Email" product distinct from the Titan-powered one, with a comparison article. Its contents were not retrievable (403). — [GoDaddy help 42926](https://www.godaddy.com/help/professional-email-and-professional-email-powered-by-titan-comparison-42926)
- GoDaddy India resells Microsoft 365. The INR figures below are inconsistent across its pages and undated:

| Plan | Page A | Page B |
|---|---|---|
| Email Essentials | ₹99/user/mo, 1-yr term, renewal ₹4,188/yr | ₹149/mailbox/mo |
| Online Business Essentials | ₹129/user/mo | ₹429/mailbox/mo |
| Business Professional | ₹749/user/mo | ₹864.43/mailbox/mo |

— [GoDaddy IN Office 365 select plan](https://godaddy.com/en-in/business/office-365/selectplan); [GoDaddy hi-in select plan](https://www.godaddy.com/hi-in/email/selectplan)
- GoDaddy and Microsoft's 2014 India launch offered Office 365 email from ₹149/mo. — [Microsoft News](https://news.microsoft.com/source/asia/2014/07/23/godaddy-microsoft-partner-to-provide-affordable-office-365-email-communication-solutions-to-small-businesses-in-india/)

**BigRock (bigrock.in), Titan-powered**
- **Business (Titan Email):**
  - Price: ₹89/mo per mailbox on a 12-month prepaid term, or ₹98/mo on 1-, 3- or 6-month terms. Taxes are extra and setup is free.
  - Mailbox: 10 GB storage, 3 external forwarders, 10 aliases, 10 read receipts, 1 template, 1 contact group.
  - Access: webmail, mobile apps, calendar and contacts, AV/anti-spam, 2FA, IMAP/POP3 over SSL, scheduled send, follow-up tools, import help.
  - Refunds: email is excluded from the money-back policy.
  - Trial: a 2-mailbox, 30-day Titan trial is bundled with domain registration.
  - Source updated 1 Oct 2026. — [WHTop BigRock Business](https://www.whtop.com/plans/bigrock.in/83391)
- **Other tiers:** Professional (Titan) is listed at ₹56.58/mo. Enterprise (Titan) is listed at ₹196/mo, and another entry for it says ₹349/yr, so the figures are inconsistent. — [WHTop Professional](https://www.whtop.com/plans/bigrock.in/137072); [WHTop Enterprise](https://www.whtop.com/plans/bigrock.in/83392)
- BigRock markets three email lines: Business Email, Enterprise Email and Google Workspace. — [BigRock email (snippet)](https://www.bigrock.in/email)
- HostGator India and BigRock combined their hosting offerings from 15 July 2025. — [HostGator India notice](https://admin.hostgator.in/business-email)

### Inferences
- India entry-price anchor: about ₹29–89 per mailbox/mo. A challenger at ₹49–99/mo with 10–25 GB storage and no 48-month lock-in would be competitive.
- Renewal shock is common: Hostinger's renewal is about 2.3x intro, and coupons apply to the first term only at BigRock. A "same price at renewal" promise is an obvious differentiator.
- Sending caps of 500–1,000/day (Neo) are the norm for anti-abuse.

### Gaps
- Attachment size limits were not published for any provider on the pages reached. They are commonly about 25 MB, but unverified.
- Titan direct USD prices could not be confirmed (404). Neo has no INR pricing.
- Official GoDaddy and BigRock pages blocked the fetch tool, so GoDaddy Titan tier prices in INR and BigRock's live INR prices are unverified.
- GoDaddy's own (non-Titan) Professional Email tier details are missing.

## 2. Neo/Titan feature set and white-label relationships

### Takeaway
Neo and Titan sell "email as a growth tool" rather than "just a mailbox". Their features include read receipts, templates, follow-ups, campaigns, booking, invoice builder, AI and a bundled one-page website. Titan is the white-label engine inside GoDaddy, BigRock, Bluehost, HostGator and others, and it was historically in Hostinger too. Neo is the direct-to-consumer brand from the same founder.

### Cited Findings
- Features by Neo tier:

| Feature | Starter | Standard | Max |
|---|---|---|---|
| Webmail; Android and iOS apps; calendar; POP/IMAP | Yes | Yes | Yes |
| Multi-account; Gmail add-on; shareable calendar; one-click import | Yes | Yes | Yes |
| Catch-all; aliases; rules; conditional forwarding; auto-reply | Yes | Yes | Yes |
| 2FA, antivirus, advanced anti-spam, custom DKIM | Yes | Yes | Yes |
| Priority inbox; turbo search; grammar and spell check; branding | No | Yes | Yes |
| Block/allow senders; send later; undo send; follow-up reminders | No | Yes | Yes |
| HTML composer; labels; send-as-alias | No | Yes | Yes |
| Campaign mode; appointment booking | No | No | Yes |
| Signature designer; Drive; file transfer | No | No | Yes |
| Email designer; invoice builder | No | No | Yes |
| AI email writer; AI summary; advanced tracking; email backup | No | No | Yes |

— [Neo pricing](https://www.neo.space/pricing)
- Neo bundles a website. You can get a free co.site domain at signup, and the plan includes a one-page website while the subscription is active. The website tiers on the pricing page are listed below. All tiers include custom-domain publishing, templates, YouTube embeds, visitor analytics and business contact info. — [Neo pricing](https://www.neo.space/pricing)

| | Basic | Plus | Growth |
|---|---|---|---|
| Website storage | 1 GB | 10 GB | 50 GB |
| AI website generations | 20 | 500 | Unlimited |
| AI copy assists | 50 | 500 | Unlimited |
| Gallery items, products, services | 10 each | 500 each | Unlimited |
| Testimonials | — | 6 | Unlimited |
| Contact forms | — | 1,000 | Unlimited |
| Email subscription widget; WhatsApp button; remove Neo branding | — | Yes | Yes |
| Support | 24x7 | 24x7 | Priority 24x7 chat |

- The co.site domain is free for the first year with an email plan, but it is not an independently registered domain the user owns. — [Neo free domain email](https://www.neo.space/domain-email/free-domain-email); [Neo .in email blog](https://neo.space/blog/create-in-email-address)
- Titan's feature groups:
  - Outreach: read receipts, templates, Titan Drive, follow-up reminders.
  - Campaigns: bulk designed mail with engagement tracking, contact groups and an email designer.
  - Customer handling: shared inboxes, priority inbox, invoice builder, appointment booking.
  - Titan AI: run agents on Titan with Claude, ChatGPT or Lovable. Agents read incoming mail and reply, book or escalate, with actions visible in the thread.
  - Essentials: web, iOS and Android apps; automatic SPF/DKIM/DMARC; daily backups; 24/7 human support; one-click import.
  - Claims: 5M+ businesses, 99.95% uptime.

  — [Titan homepage](https://titan.email/)
- Titan names WordPress.com, GoDaddy, Hostinger, name.com, HostGator, Bluehost and Squarespace as partners, and runs a partner program for bundling. — [Titan homepage](https://titan.email/)
- Hostinger runs two products. A hosting plan includes either Hostinger Email or Titan Email, never both, and hPanel shows an envelope icon for Hostinger Email and the Titan logo for Titan. — [Hostinger support](https://hostinger.com/support/5832752-how-to-check-the-email-service-included-in-your-hosting-plan-at-hostinger)
- A third-party source says new free-email claims at Hostinger use Hostinger Email, and Titan is tied to plans that had it before November 2025. This is unverified. — [TechBloat](https://www.techbloat.com/hostinger-titan-email-in-2026-what-it-costs-what-you-get-and-how-to-set-it-up.html)
- BigRock's email plans are labelled "(Titan Email)". — [WHTop](https://www.whtop.com/plans/bigrock.in/83391)
- GoDaddy sells "Professional Email powered by Titan". — [GoDaddy help 42801](https://www.godaddy.com/en-in/help/compare-professional-email-powered-by-titan-plans-42801)
- Titan was founded by Bhavin Turakhia in 2018 as Flockmail. — [Wikipedia, Titan](https://en.wikipedia.org/wiki/Titan_(email))
- The Neo Mail app is published by Flock FZ-LLC. Neo's site says email "has a new name". — [Apple App Store, Neo Mail](https://apps.apple.com/ru/app/neo-mail/id1556396060?l=en); [Neo about](https://neo.space:443/about-neo)
- Bloomberg (Aug 2025) describes Titan as Turakhia's AI-led email service, partnered with GoDaddy. — [Bloomberg](https://www.bloomberg.com/news/articles/2025-08-12/india-tycoon-partners-us-firm-on-2-ai-email-rival-to-outlook)

### Inferences
- Titan is the B2B2C white-label engine and Neo is the D2C brand. Both come from the Turakhia/Flock group, and their feature sets are almost identical, so they likely share a codebase. This is not explicitly confirmed.
- Hostinger appears to be moving new customers from Titan to its own Hostinger Email, which now copies Titan features such as open tracking, AI and "Agentic Mail".
- Feature gating follows the same pattern everywhere:
  - Starter: metered "taste" quotas (1 template, 1 group, 10–50 receipts).
  - Middle tier: productivity features (send later, undo, follow-ups, priority inbox).
  - Top tier: growth/CRM-lite features (campaigns, booking, invoices, AI, backup).

### Gaps
- No confirmed statement that Neo Mail and Titan run on the same backend.
- Bulk/campaign mail volume caps were not published.
- I couldn't confirm whether Neo's AI is on Standard. The pricing page lists it as Max-only.

## 3. Hostinger / GoDaddy / BigRock: control panel, DNS, bundling, anti-spam, migration, webmail, protocols

### Takeaway
All three manage email from the host's control panel (Hostinger hPanel, GoDaddy and BigRock account dashboards) and bundle email with domain and hosting purchases. Protocol support is standard IMAP/POP/SMTP. Webmail is the vendor's own (Hostinger) or Titan's (BigRock, GoDaddy Titan) rather than Roundcube in the newer products. That last point is an inference.

### Cited Findings
- Hostinger:
  - Email is managed in hPanel, and mail can be read in webmail or any mail app.
  - DNS (MX, SPF, DKIM, DMARC) connection is a getting-started step, but the docs don't say it is automatic.
  - Migration goes through "Import existing email". Paid plans add advanced spam, malware and phishing protection.

  — [Hostinger docs](https://docs.hostinger.com/emails/overview)
- Hostinger's sales page says Hostinger Agent can configure DNS, and it mentions connecting to Gmail and Outlook clients. — [Hostinger India business email](https://www.hostinger.com/in/business-email)
- Titan and Google Workspace are set up through hPanel but managed in their own consoles. — [Hostinger support (search result summary)](https://hostinger.com/support/5832752-how-to-check-the-email-service-included-in-your-hosting-plan-at-hostinger)
- Titan sets up SPF/DKIM/DMARC automatically and offers one-click import from an existing provider. — [Titan homepage](https://titan.email/)
- BigRock Titan: IMAP/POP3 over SSL, migration/import help, AV/anti-spam, 2FA. Indian payment methods include UPI, netbanking, wallets and NEFT/RTGS/IMPS. Chat support is 24/7 and phone support runs 09:00–20:00 IST. — [WHTop BigRock](https://www.whtop.com/plans/bigrock.in/83391)
- Neo includes custom DKIM and POP/IMAP on all tiers. — [Neo pricing](https://www.neo.space/pricing)

### Inferences
- Indian-market essentials: UPI/netbanking payment, IST-hours phone support, and GST-exclusive pricing ("taxes extra").

### Gaps
- Hostinger's webmail software is not named in its docs. Older Hostinger Email used a custom webmail, which is unverified here.
- GoDaddy's non-Titan Professional Email webmail (historically Open-Xchange) could not be verified because of the 403.
- Hostinger's published IMAP/SMTP hostnames and ports were not retrieved.

## 4. Onboarding flow and upsells

### Takeaway
The dominant funnel is "buy or claim a domain → email offered at checkout (often as a free trial) → DNS auto-configured because the host is the registrar → upsell to a higher tier through quota limits, AI and tracking". Neo removes the domain hurdle entirely with a free co.site domain plus a one-page website.

### Cited Findings
- BigRock bundles a 2-mailbox, 30-day Titan trial with domain registration. — [WHTop BigRock](https://www.whtop.com/plans/bigrock.in/83391)
- Neo lets users sign up with a free co.site domain or their own domain. It also bundles a one-page website, takes the card up front, and charges after the 15-day trial. — [Neo pricing](https://www.neo.space/pricing)
- Hostinger's upsell levers:
  - Free email with hosting, then a paid plan via a 30-day trial.
  - "Buy 2, get 1 free" on mailboxes.
  - A free domain for 1 year on Premium.
  - AI and open tracking held back from Starter.
  - 48-month prepaid terms to win the low headline price.

  — [Hostinger India business email](https://www.hostinger.com/in/business-email); [Hostinger docs](https://docs.hostinger.com/emails/overview)
- Titan automates SPF/DKIM/DMARC setup. — [Titan homepage](https://titan.email/)
- Neo pushes aggressive coupons: OFF50 for an extra 50% off, plus seasonal 40%-off countdown banners. — [Neo pricing](https://www.neo.space/pricing)

### Inferences
- The upsell ladder is quota-driven: users hit 1 template, 1 contact group or 10 read receipts within days. Storage upgrades are not the main lever.
- The registrar/host advantage is zero-touch DNS. A standalone SaaS for mrrokesh.com needs either a domain-reseller integration or a guided or automatic DNS connector (for example via the Cloudflare or registrar API, or a Domain Connect-style flow) to match it.

### Gaps
- Screens of the actual checkout and onboarding flows were not captured. Details such as which DNS records are auto-written and whether DMARC defaults to p=none are unverified.

## 5. Differentiators a challenger should copy

### Takeaway
Copy the Titan/Neo "growth email" bundle, adapted for India: INR/UPI billing, no renewal shock, and a free subdomain or one-page site so users can start without a domain.

### Cited Findings
- Features that recur across Titan, Neo and Hostinger premium tiers: read receipts, open/link tracking, templates, follow-up reminders, send later, undo send, priority inbox, campaigns with contact groups, appointment booking, invoice builder, AI write/reply/summarise, email backup, catch-all, one-click import, automatic SPF/DKIM/DMARC, and native mobile apps. — [Neo pricing](https://www.neo.space/pricing); [Titan homepage](https://titan.email/); [Hostinger India business email](https://www.hostinger.com/in/business-email)
- Agentic AI is the new frontier. Titan agents (Claude, ChatGPT, Lovable) can reply, book or escalate from the inbox. Hostinger advertises "Agentic Mail" on every tier. — [Titan homepage](https://titan.email/); [Hostinger India business email](https://www.hostinger.com/in/business-email)
- Neo bundles a one-page website with AI site generation, WhatsApp buttons, contact forms and a free domain. — [Neo pricing](https://www.neo.space/pricing)

### Inferences
Suggested feature set for a mrrokesh.com challenger:
1. Transparent INR pricing that includes GST, at the same price on renewal, with monthly and annual terms but no forced 48-month lock-in.
2. UPI and AutoPay billing.
3. A generous free starter tier, or one with a 30-day trial, with 2 mailboxes.
4. Read receipts, templates and send-later on every tier, which undercuts the metered quotas.
5. A WhatsApp-linked booking page, plus a GST invoice builder.
6. Automatic DNS for registrars common in India (GoDaddy, Hostinger, BigRock and Cloudflare APIs).
7. One-click IMAP migration from Titan, Hostinger and Zoho.
8. Hindi and regional-language UI.
9. AI reply and summarise with Indian-English tone presets.
10. Clearly published attachment and sending limits, since competitors hide them.

### Gaps
- No user-review sentiment data, such as G2 or Trustpilot complaint themes, was gathered to show which competitor weaknesses users care about most.
