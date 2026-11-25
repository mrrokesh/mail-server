# Proton (Mail / Workspace) and Fastmail: tiers, features, and privacy/security architecture (as of Nov 2026)

## Per-tier inventory: price, storage, domains, addresses, catch-all, users, calendars, contacts, drive, VPN/Pass bundles

### Takeaway
Proton overhauled its business line in 2026. On 31 Mar 2026 it launched **Proton Workspace**, with two plans: Standard ($12.99 per user per month billed annually, $14.99 monthly) and Premium ($19.99 annual, $24.99 monthly). Existing Business Suite customers were moved up to Workspace Standard for free. The business pricing page now lists only **Mail Essentials ($6.99 per user per month, annual)**, Workspace Standard, Workspace Premium and Enterprise. **Mail Professional no longer appears.** Fastmail still has three consumer plans (Individual, Duo, Family) and three business plans (Basic, Standard, Professional) at about $3–10 per user per month. Its pitch is a plain, fast, standards-based service, not a bundle.

### Cited findings: Proton business plans (from the proton.me business pricing page, Nov 2026)

| | Mail Essentials | Workspace Standard | Workspace Premium | Enterprise |
|---|---|---|---|---|
| Price per user per month, annual billing (list) | $6.99 ($83.88/yr) | $12.99 (list); $8.99 during the Black Friday promo ($107.88 first year) | $19.99 (list); $14.99 promo ($179.88 first year) | "Let's talk" |
| Price per user per month, monthly billing | not shown | $14.99 | $24.99 | — |
| Storage per user | 15 GB | 1 TB | 3 TB | custom |
| Custom domains | 3 | 15 | 20 | — |
| Addresses per user | 10 | 20 | 20 | — |
| Catch-all | Yes | Yes | Yes | — |
| Custom workspace branding | No | Yes | Yes | — |
| Email groups | No | Yes | Yes | — |
| SMTP access (SMTP tokens for external tools) / Outlook, Thunderbird, Apple Mail | Yes | Yes | Yes | — |
| Password-protected email, auto-forward, unlimited filters, folders and labels, Easy Switch migration | Yes | Yes | Yes | — |
| Proton Sentinel | No | Yes | Yes | — |
| Data retention policies | No | No | Yes | — |
| Scribe AI writer | Add-on | Add-on | Included | — |
| Calendars per user / booking pages | 25 / 1 | 25 / 25 | 25 / 25 | — |
| Drive (sharing, Docs/Sheets, sync) | Yes | Yes (plus a CLI) | Yes | — |
| VPN connections / countries | 1 / 10 | 10 / 140 | 10 / 140 | — |
| Pass (password manager, 2FA, passkeys, dark-web monitoring) | Yes | Yes | Yes | — |
| Meet: participants / length / recording | 50 / 1 h / No | 100 / 24 h / Yes | 250 / 24 h / Yes | — |
| Lumo AI | Limited | Limited | Unlimited, advanced models | — |

- Sources for the table: [Proton business mail pricing](https://proton.me/business/mail/pricing) and [Proton business plans](https://proton.me/business/plans). The Workspace Standard plan card shows 100 Meet participants, but the comparison table shows 50 for Essentials. The figures above follow the comparison table.
- The Black Friday offer is 40% off the first year for new customers, up to 10 users, ending 30 Nov 2026. After that the price renews at list — [Proton business plans](https://proton.me/business/plans)
- Workspace was announced on 31 Mar 2026 by CEO Andy Yen. Standard = Mail, Calendar (with appointment scheduling), Drive, Docs, Sheets, Meet, VPN, Pass. Premium adds more storage, email retention policies, larger Meet calls and Lumo AI. Business Suite customers get a free upgrade to Standard. Proton also pledges no annual price increases for existing customers — [Proton blog: Proton Workspace](https://proton.me/business/blog/proton-workspace); [AlternativeTo, Mar 2026](https://alternativeto.net/news/2026/3/proton-launches-business-suite-offering-to-compete-with-microsoft-365-and-google-workspace/)
- Compliance claims: HIPAA, GDPR and CCPA support, ISO 27001 and SOC 2. Proton says that as a Swiss company it can't be compelled under the US CLOUD Act, and that its encryption stops customer data being used to train AI — [Proton blog: Proton Workspace](https://proton.me/business/blog/proton-workspace) (vendor claims)
- Older third-party pricing data is inconsistent and out of date. Capterra lists Mail Professional at $9.99 and Business Suite at $12.99, with 3 and 10 domains — [Capterra](https://www.capterra.com/p/201276/ProtonMail/pricing/); [GetApp](https://www.getapp.com/security-software/a/protonmail/reviews/)

### Cited findings: Proton consumer plans (from the proton.me mail pricing page)

| | Free | Mail Plus | Unlimited | Duo / Family |
|---|---|---|---|---|
| Price | $0 | $4.99 per month monthly; $2.49 per month for year one, then $47.88/yr | $12.99 list; $6.49 per month for year one, then $119.88/yr | page shows no prices; up to 6 people, up to 3 TB total |
| Storage | up to 1 GB (500 MB at start) | 15 GB | 500 GB | up to 3 TB |
| Addresses / custom domains | 1 / 0 | 10 / 1 | 15 / 3 | — |
| Hide-my-email aliases | 10 | 10 | Unlimited | — |
| Catch-all | No | Yes | Yes | — |
| Calendars | 3 | 25, sharing, 1 booking page | 25, sharing, 1 booking page | — |
| Drive | 5 GB | 15 GB, no version history | 500 GB, version history | — |
| VPN | 1 device | 1 device | 10 devices, 140+ countries | — |
| Pass vaults | 2 | 2 | 50, with built-in 2FA | — |
| Sentinel | No | No | Yes | — |
| Sending limit | 150 per day | unlimited | unlimited | — |

- Source: [Proton mail pricing](https://proton.me/mail/pricing?product=business). IMAP/SMTP (through Bridge), auto-reply, auto-forward, scheduled send, snooze and contact groups are paid-only. All tiers include E2EE, encrypted contact details and password-protected email.

### Cited findings: Fastmail

| Plan | USD monthly billing | USD annual billing (per month) | Users | Storage (mail / files) | Custom domains | Notes |
|---|---|---|---|---|---|---|
| Individual | $6 | $5 | 1 | 60 GB (50 mail + 10 files) | Yes | Scheduled send, snooze, third-party app access |
| Duo | $10 | not verified | 2 | 60 GB each | Yes | Shared calendars and address book |
| Family | $14 | not verified | up to 6 | 60 GB each | Yes | Flat rate, family calendar |
| Basic (per user) | $4 (other sources say $3 annual) | ~$3 | per user | 6 GB (5 + 1) | **No**, unless an admin on the account is on Standard or Professional | Shared addresses, shared calendar and address book |
| Standard (per user) | $6 | $5 | per user | 60 GB (50 + 10) | Yes | Adds scheduled send, snooze, mute, third-party IMAP/JMAP access |
| Professional (per user) | $10 | $9 | per user | 150 GB (100 + 50) | Yes | Adds an email retention archive for legal compliance |

- Storage split, features and INR prices (₹480 / ₹800 / ₹1,120 consumer; ₹320 / ₹480 / ₹800 business, monthly) are from the live pricing page, which was served geo-localised in INR. All plans include Masked Email, private memos and 24/7 support — [Fastmail pricing](https://www.fastmail.com/pricing/)
- USD monthly prices (Individual $6, Duo $10, Family $14, Basic $4, Standard $6, Professional $10) and the rule that Basic needs an admin on Standard or Professional to use custom domains — [Fastmail help: 2024 pricing and plan updates](https://www.fastmail.help/hc/en-us/articles/8033939068815). That article gives 50 GB and 100 GB, while the current page shows 60 GB and 150 GB in total once file storage is added.
- Annual USD figures (Individual and Standard $5, Professional $9, Basic $3) — [Dupple, Oct 2026](https://dupple.com/pricing/fastmail); [Subger](https://subger.com/en/service/fastmail) (third-party)

### Inferences
- Proton is now Workspace-first. Mail Essentials is the only mail-only business SKU left at about $7, and Workspace Standard at $12.99 matches Google Workspace and M365 on price. This leaves a gap for a cheap tier that is just privacy-first custom-domain mail.
- Fastmail's business Standard (about $5–6 per user) is the price anchor for "premium independent email". Its Basic tier blocks custom domains as an upsell lever.

### Gaps
- Proton Duo, Family and Visionary USD prices were not shown on the fetched page.
- Mail Essentials monthly-billing price was not shown.
- No official source confirms that Mail Professional and Business Suite are closed to new sign-ups. They are simply absent from the current pages.
- Fastmail Duo and Family annual USD prices, and alias counts per plan (Fastmail sets limits through its help pages), were not verified.

## Proton security architecture

### Takeaway
Proton is built around client-side OpenPGP. Mail between Proton users is end-to-end encrypted. Inbound external mail is encrypted on arrival with the user's public key ("zero-access"). Login uses SRP, so the server never sees the password. Password-protected messages give outside recipients a form of E2EE. IMAP is possible only through Bridge, a local decrypting proxy. The clients are open source and have been audited (for example by Securitum in 2021).

### Cited findings
- Mail between Proton accounts is E2EE. Mail to outside addresses is only protected by zero-access encryption while it sits on Proton's servers — [Proton support: Bridge encryption](https://proton.me/support/messages-encrypted-via-bridge)
- Proton adopted Secure Remote Password (SRP-6a) in 2016, so the server never handles plaintext passwords — [Proton updates blog](https://proton.me/blog/proton-updates); [DeepWiki analysis of ProtonMail/WebClients](https://deepwiki.com/ProtonMail/WebClients/3-authentication-and-sessions) (secondary)
- The web client pairs SRP with OpenPGP E2EE and uses Key Transparency to verify public keys — [DeepWiki: ProtonMail/WebClients](https://deepwiki.com/ProtonMail/WebClients/3-authentication-and-sessions) (secondary)
- Password-protected email to non-Proton recipients:
  - available on all plans, including Free
  - expires after 28 days by default, and 28 days (four weeks) is also the maximum; time spent as a draft counts
  - optional password hint
  - the recipient can reply up to 5 times
  - Proton advises sharing the password through a separate channel
  - [Proton support](https://proton.me/support/password-protected-emails)
- Bridge downloads mail and decrypts it locally so IMAP/SMTP clients can use it. It runs only on paid plans, is open source, and Proton published an independent audit of it — [Proton support: why you need Bridge](https://proton.me/support/why-you-need-bridge); [AI Emaily](https://aiemaily.com/blog/switch-from-proton-mail-app-to-another-client) (secondary)
- In July 2021 Securitum independently audited Proton Mail's security and cryptographic architecture, and the results were published — [Wikipedia](https://en.wikipedia.org/wiki/Proton_Mail)
- A standard account reset (without the recovery phrase or file) revokes access to existing stored encrypted messages — [ShieldCue review](https://shieldcue.com/providers/proton-mail/review/) (secondary)
- Proton's business whitepaper (PDF) covers security features and infrastructure — [Proton business whitepaper](https://proton-me.cdn.prismic.io/proton-me/4e4e2318-c104-4f0b-a4bd-68d98d0d9fe8_business-whitepaper.pdf)
- Plan placement:
  - Proton Sentinel (advanced account protection) is in Workspace Standard and Premium and in consumer Unlimited, but not in Mail Essentials or Mail Plus — [Proton business mail pricing](https://proton.me/business/mail/pricing); [Proton mail pricing](https://proton.me/mail/pricing)
  - Hide-my-email aliases (through Proton Pass): 10 on Free and Mail Plus, unlimited on Unlimited — [Proton mail pricing](https://proton.me/mail/pricing)
  - Emergency Access and Dark Web Monitoring are on paid consumer plans — [Proton mail pricing](https://proton.me/mail/pricing)
  - Lumo chats are claimed to use zero-access encryption — [Proton blog: Proton Workspace](https://proton.me/business/blog/proton-workspace)

### Inferences
- The design you would copy: a key pair per address, with the private key encrypted by a key derived from the user's password and stored on the server, so it syncs across devices. Delivery from Proton to Proton uses public-key lookup, with Key Transparency against key substitution. Inbound SMTP is encrypted on arrival. Login uses SRP. The cost is that server-side full-text search, server-side rules on the body, and plain IMAP all become hard. Bridge is Proton's workaround for IMAP.
- Proton's GitHub organisation, github.com/ProtonMail, is widely known to host WebClients, proton-bridge, the gopenpgp/go-crypto libraries and go-srp. These repo names come from background knowledge and were not fetched this session.

### Gaps
- No primary source was fetched for the exact algorithms (Curve25519/Ed25519, AES-256), the post-quantum OpenPGP rollout, or what Sentinel actually does (AI and human review of logins).
- The list of audits after 2021 (Pass, Drive, VPN, SOC 2 report dates) was not fetched.
- proton.me/security returned a 404.

## Fastmail features and open-source and standards work

### Technical findings

#### Takeaway
Fastmail does not use E2EE. Data is encrypted in transit and at rest, and the company's edge is speed, open standards (it drove JMAP, RFC 8620/8621, and supports IMAP, SMTP, CalDAV and CardDAV), Masked Email, powerful rules, snooze, scheduled send, static website hosting from Files, and passkeys.

#### Cited findings
- Features:
  - search
  - undo send
  - scheduled send
  - pin
  - snooze
  - private memos
  - mute
  - spam protection and easy unsubscribe
  - "powerful rules"
  - contacts that show recent conversations and meetings
  - integrated calendar
  - multi-level undo
  - migration import
  - Masked Email
  - iOS and Android apps
  - public API docs
  - [Fastmail features](https://www.fastmail.com/features/)
- Encryption is described only as in transit and at rest, not E2EE — [Fastmail features](https://www.fastmail.com/features/)
- Masked Email gives a random address per signup, labelled with the site, that can be disabled in one click. It can be generated from 1Password or Bitwarden, and the API lets you create, list, enable and disable masks — [AI Emaily review 2026](https://aiemaily.com/blog/fastmail-review-2026); [radiosilence/fastmail-cli](https://github.com/radiosilence/fastmail-cli)
- Protocols are IMAP, SMTP, CalDAV, CardDAV and JMAP. Few third-party clients support JMAP, so most use IMAP. Third-party access is on most plans but not Basic — [AI Emaily: best client for Fastmail](https://aiemaily.com/blog/best-email-client-for-fastmail); [Fastmail pricing](https://www.fastmail.com/pricing/)
- Filter rules are not exposed over the JMAP API — [fastmail-cli README](https://github.com/radiosilence/fastmail-cli) (single source)
- JMAP is an open IETF standard (RFC 8620 Core, RFC 8621 Mail) that replaces IMAP, CardDAV and CalDAV over HTTP and JSON, with no patents or fees. Contacts and calendars are also spec areas — [jmap.io](https://jmap.io/)
- Website hosting: Files → Websites publishes a folder as a static site.
  - It can use a custom domain through a CNAME to web.fastmail.com, with Let's Encrypt HTTPS.
  - Options include password protection, a custom 404 page and redirects.
  - There is no dynamic site or site-builder support, and none is planned.
  - [Fastmail help](https://www.fastmail.help/hc/en-us/articles/1500000280141)
- Passkeys:
  - They are an alternative login, set up under Settings → Privacy & Security, and the password keeps working.
  - Fastmail shows a passkey button when it detects a saved passkey.
  - Passkeys were already supported for 2-step verification.
  - [Fastmail blog: passkeys](https://www.fastmail.com/blog/introducing-passkeys/); [Fastmail help](https://www.fastmail.help/hc/en-us/articles/10351615144335); [Fastmail on Mastodon](https://mastodon.social/@fastmail/112959141275911886)
- Calendar and address book: shared calendars and a shared address book on Duo, Family and business plans; private calendars on Individual — [Fastmail pricing](https://www.fastmail.com/pricing/)
- Professional includes an email retention archive for legal compliance — [Fastmail pricing](https://www.fastmail.com/pricing/)

#### Inferences
- Background knowledge, not fetched this session:
  - Fastmail runs on the Cyrus IMAP server, which it co-maintains with CMU. Cyrus also implements JMAP and Sieve.
  - Fastmail's user rules compile to Sieve.
  - Fastmail employees led the JMAP specification at the IETF.
  - Code is on github.com/fastmail and github.com/cyrusimap.
  - Check these against primary sources before stating them as fact.

#### Gaps
- Not verified from primary sources:
  - Fastmail's alias and catch-all limits per plan
  - details of the 2FA methods (TOTP, security keys, SMS)
  - data location (Fastmail is Australian-owned and its servers are reported to be in the US)
  - which Fastmail-led JMAP extensions exist (Sieve, calendars, contacts, quotas)

### Differentiators worth copying for mrrokesh.com

#### Takeaway
The strongest pattern is Proton's privacy posture combined with Fastmail's standards, speed and power-user features:
- client-side E2EE between users on your own platform
- zero-access encryption at rest for inbound mail
- SRP or OPAQUE login
- password-protected external mail with an expiry
- first-class per-site masked aliases with an API and password-manager integrations
- catch-all and many custom domains even on low tiers
- JMAP plus IMAP, CalDAV and CardDAV
- static site hosting from Files
- passkeys
- a simple, transparent per-user price with no-price-increase pledges

#### Cited findings
- Catch-all is included on every Proton business tier, even Mail Essentials at $6.99 with 3 domains — [Proton business mail pricing](https://proton.me/business/mail/pricing)
- Proton pledges no annual price increases for existing customers. Its marketing leans on open source, audits, Swiss jurisdiction and CLOUD Act immunity — [Proton blog: Proton Workspace](https://proton.me/business/blog/proton-workspace)
- Masked Email is on every Fastmail plan, and 1Password and Bitwarden can generate masks — [Fastmail pricing](https://www.fastmail.com/pricing/); [AI Emaily](https://aiemaily.com/blog/fastmail-review-2026)
- Proton's password-protected email offers a 28-day expiry, a hint and 5 replies — [Proton support](https://proton.me/support/password-protected-emails)
- Fastmail offers a compliance retention archive on its top tier, and Proton offers retention policies only on Premium. Both reserve compliance features for the highest tier — [Fastmail pricing](https://www.fastmail.com/pricing/); [Proton business mail pricing](https://proton.me/business/mail/pricing)

#### Inferences
- Gaps in the market:
  - Neither competitor offers a full privacy dashboard (a per-alias traffic log, tracker-blocking statistics, and a log of logins and sessions) as a headline feature. Proton has pieces of it (Sentinel, dark-web monitoring).
  - Fastmail Basic has no custom domains.
  - Proton puts IMAP behind Bridge.
- An India-priced tier (Fastmail charges about ₹240–₹400 per user per month annually) with custom domains and catch-all from the cheapest tier would undercut both on price.

#### Gaps
- There are no usage or adoption figures for masked aliases or password-protected email at either provider.
