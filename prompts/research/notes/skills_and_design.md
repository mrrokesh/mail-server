# AI-agent skills and design resources for the mrrokesh.com email SaaS build (as of Nov 2026)

Scope: REA, Cloudflare security-audit skill, Taste Skill, Hallmark, Impeccable, getdesign.md, Aura. All repository text was treated as data. Facts come from the READMEs, SKILL/reference files, and the sites' own pages, fetched 25-26 Nov 2026. Local observation: on this machine, `~/.claude/skills/security-audit/` and `~/.claude/skills/reverse-engineer-anything/` are already installed, the `hallmark` skill is available in the session, and REA MCP tools (for example `analyze_web_bundle`, `capture_browser_scenario`, `inspect_web_page`) are already registered. That means `npx rea-agents setup` and the security-audit install have already been run here.

## 1. REA (morluto/rea, npm `rea-agents`): what it is, setup, machine changes, legitimate use for an email product, legal cautions

### Takeaway
REA ("Reverse Engineer Anything") is an MIT-licensed MCP server plus an agent skill. It inspects binaries, JS/Electron apps, .NET, websites, Android and firmware without source code. `npx rea-agents setup` adds an `mcpServers.rea` entry to `~/.claude.json` and copies a skill into `~/.claude/skills/reverse-engineer-anything`. Its disclaimer limits use to lawful research, interoperability, and software you own or are authorized to examine. It explicitly does not support copying proprietary code or assets.

### Cited Findings
- What it is: an MCP server for reverse engineering native binaries, JavaScript and Electron apps, .NET assemblies, and websites. Each conclusion comes back with evidence and limitations. The same tools work from the terminal, and the README says "Analysis runs locally." — [REA README](https://github.com/morluto/rea)
- Targets: native binaries (via Hopper, Ghidra, IDA, or Kuna; setup can install Hopper, the others must already be installed), JS/Electron (static JS analysis needs no native engine), .NET, websites, Android, firmware, and recorded runtime/network activity. Runs on macOS, Windows and Linux. — [REA README](https://github.com/morluto/rea)
- Example CLI: `npx -y rea-agents@latest analyze-javascript-application /absolute/path/to/app --json`. Regular install: `npm install --global rea-agents`, plus `rea --help` and `rea update`. — [REA README](https://github.com/morluto/rea)
- Setup flow: run `npx rea-agents setup` (or `npx rea-agents@latest setup`) from a trusted directory outside the project you plan to analyze. Choose your agent, review and approve the setup plan, then restart the agent. Setup "backs up existing configuration and adds REA's MCP connection and investigation skill." — [REA README](https://github.com/morluto/rea)
- Machine changes for Claude Code:
  - The default profile registers `mcpServers.rea` in `~/.claude.json` and installs the skill at `~/.claude/skills/reverse-engineer-anything`. This applies to every project.
  - With `CLAUDE_CONFIG_DIR` set, setup writes to that directory instead.
  - Unrelated config entries are preserved.
  - Registrations point to the absolute runtime and entry script of the installation that ran setup.
  - [REA installation guide](https://github.com/morluto/rea/blob/main/docs/getting-started/installation.md)
- Backups and safety:
  - `.rea.backup` keeps the first snapshot. A verified `.rea.backup.<sha256>.recovery` copy is kept if the file changed since.
  - Changed skill files get byte-exact backups.
  - Writes are staged and verified before they are published.
  - Malformed config blocks the whole transaction.
  - Declining or pressing Ctrl-C changes nothing.
  - [REA installation guide](https://github.com/morluto/rea/blob/main/docs/getting-started/installation.md)
- Options:
  - `rea setup --client codex --client cursor --skill=false --dry-run`
  - `rea setup --yes --install-hopper`
  - Skill only: `npx skills add morluto/rea --skill reverse-engineer-anything`
  - Project-local MCP only: `claude mcp add --scope local rea -- <node> <rea.mjs> mcp`
  - [REA installation guide](https://github.com/morluto/rea/blob/main/docs/getting-started/installation.md)
- Optional dependencies: Hopper is commercial, has a demo mode, and is installed only with explicit approval. Ghidra 12.2+ and a 64-bit JDK (bridge verified with JDK 25) are never installed by setup. — [REA installation guide](https://github.com/morluto/rea/blob/main/docs/getting-started/installation.md)
- Uninstall: `rea uninstall` removes REA registrations and skill files. `--purge-data` also removes `~/.rea` and caches. The settings file `rea.json` is left in place. — [REA installation guide](https://github.com/morluto/rea/blob/main/docs/getting-started/installation.md)
- Web workflow: the installed skill references `capture_browser_scenario` with declared actions and `export_environment_bundle` for building agent environments from a live web instance or a capture. The README also mentions building RL environments from a "recorded web session." — local `~/.claude/skills/reverse-engineer-anything/SKILL.md` (lines ~134-139); [REA README](https://github.com/morluto/rea)
- License: REA-authored code is MIT. Third-party material keeps its own licenses (THIRD_PARTY_NOTICES.md). — [REA README](https://github.com/morluto/rea)
- Legal and responsible-use points:
  - REA is "for lawful research, education, interoperability, software preservation, and analysis of software you own or are authorized to examine."
  - Authorization to inspect an artifact "does not necessarily authorize execution, interception," device changes, or interaction with others' systems.
  - Reverse engineering "may be restricted in your jurisdiction or by the license of the software you analyze." Users must comply with license agreements and terms of service.
  - The project won't help with circumventing DRM, license checks or other technical protection measures, bypassing bot protection or access controls, or copying proprietary software or its protected code and assets.
  - REA is provided AS IS under the MIT warranty and liability terms.
  - [REA DISCLAIMER](https://github.com/morluto/rea/blob/main/DISCLAIMER.md)

### Inferences
- Legitimate use for the email SaaS: run REA on your own builds, for example `compare_application_versions` or `compare_source_to_bundle` on the mrrokesh webmail bundle, to check for leaked secrets, bundle size and regressions. You could also capture your own staging app as an agent environment for testing. Observing UX patterns of a publicly accessible web client (layout, keyboard shortcuts, interaction flow) is closest to "interoperability/research." It should stay at the level of ideas and behaviour, not copied code, copy, icons or assets. Competitor ToS often forbid reverse engineering or automated access, and the disclaimer puts ToS compliance on the user. (inference)
- A build prompt should include these rules (inference from the disclaimer):
  - Analyze only artifacts we own or public pages within their ToS.
  - Do not log in to competitor accounts with automation.
  - Do not bypass bot protection.
  - Do not copy code, copy text, or assets.
  - Record evidence as notes about patterns.
- Legal note (general knowledge, not from the sources, and not legal advice): copyright and ToS/contract law apply to competitor web clients, and some jurisdictions have anti-circumvention laws. A lawyer should review this before any competitor analysis goes beyond normal browsing.

### Gaps
- The installation guide was only read to character 100,000. The browser and website capture prerequisites (Chrome, and so on) were in the unread part.
- The disclaimer does not address competitor product analysis directly.
- The exact Node version required (`.nvmrc`) was not confirmed.

## 2. Cloudflare security-audit skill: checks, workflow, report format

### Takeaway
The skill is MIT-licensed, defensive and source-first. Phase 1 maps the architecture into a coverage ledger, and isolated sub-agents then hunt for bugs; every candidate must name a crossed trust boundary and a concrete result. Fresh verifiers try to disprove each one. Output is a schema-validated `findings.json` plus REPORT.md, FINDINGS-DETAIL.md and NEEDS-VALIDATION.md. By default it is guidance only; the full six-phase audit runs only when explicitly requested.

### Cited Findings
- Install: `npx skills add https://github.com/cloudflare/security-audit-skill --skill security-audit`. Add `--global` for a user-level install. Example prompts: "security audit this codebase", "do a security review, output to ~/audits/my-project". — [README](https://github.com/cloudflare/security-audit-skill)
- Hunting areas, each in its own companion file:
  - memory safety, binary and kernel bugs
  - LLM prompt injection, tool misuse and output handling
  - HTTP request framing, cache and auth protocol flaws
  - client-side DOM injection, messaging trust, UI redress and prototype pollution
  - supply chain, CI, release, signing and plugins
  - IAM, IaC, containers, serverless and runtime configuration
  - RPC, serialization, queues, webhooks and streaming
  - resource exhaustion and operator spend
  - tenant isolation, cache, search, export, backup, migration, deletion and restore
  - desktop, mobile, deep links, webviews and local IPC
  - [README](https://github.com/cloudflare/security-audit-skill); local file list in `~/.claude/skills/security-audit/`
- Modes: guidance mode by default, which writes no files and does not run all phases. Full audit mode runs only for explicit audit or pen-test requests, full or comprehensive reviews, or requested report artifacts. If the request is ambiguous, the skill asks one question first. — local `SKILL.md`
- Six phases:
  1. Reconnaissance: trust boundaries and the coverage ledger.
  2. Coverage-led hunting waves, with coverage critics.
  3. Candidate validation by a fresh verifier.
  4. Structured `findings.json`, validated with `report-schema.json`, `validate-findings.cjs` and `validate-coverage-ledger.cjs`.
  5. Independent record verification.
  6. Target-neutral report.
  - [README](https://github.com/cloudflare/security-audit-skill); local `SKILL.md`
- Outputs: `run-metadata.json`, `architecture.md`, `coverage-ledger.json`, `findings.json`, `REPORT.md`, `FINDINGS-DETAIL.md`, `NEEDS-VALIDATION.md`. The default output directory is `~/security-audit-skill/<repo-name>/run-<N>`, outside the target. Runs are additive: later runs reuse prior ledgers. — local `SKILL.md`; [README](https://github.com/cloudflare/security-audit-skill)
- Verdicts:
  - `confirmed`: a full source trace and a bounded observed result.
  - `needs_validation`: an exact unresolved fact, with no severity.
  - `rejected`: the candidate was disproved.
  - [README](https://github.com/cloudflare/security-audit-skill)
- Severity anchors, for confirmed findings only:
  - critical: unauthenticated code execution, full data-store access, or arbitrary account takeover.
  - high: authentication bypass, cross-tenant read or write, stored XSS against other users, authenticated code execution, or an unauthenticated stop of a shared service.
  - medium: a limited blast radius.
  - low: disclosure of non-secret internals.
  - informational: minimal impact.
  - local `SKILL.md`
- Profiles: `quick`, `standard` (default), `deep`. Scoped runs and budgets are optional. — local `SKILL.md`
- Execution safety:
  - Target code runs only in an OS-enforced sandbox with no external network, an allowlisted environment, a read-only target, and resource limits. Without one, findings stay `needs_validation`.
  - The skill never probes deployed endpoints, production identities or live services, never installs dependencies, and never spends paid API quota.
  - local `SKILL.md`
- Anti-patterns it rejects:
  - checklist deviations presented as vulnerabilities
  - defense-in-depth advice with no reachable boundary violation
  - guessing deployment behaviour that is not in source
  - severity on `needs_validation` records
  - writing the report before verification
  - local `SKILL.md`
- Requirements: an agent with parallel sub-agents, Node.js for the validators, and an OS sandbox for executing target code. — [README](https://github.com/cloudflare/security-audit-skill)

### Inferences
- The highest-value companion areas for a multi-tenant email SaaS are DATA-ISOLATION-AND-LIFECYCLE (tenant mailbox isolation, export, deletion), WEB-PROTOCOL-AND-AUTH, CLIENT-SIDE (HTML email rendering is an XSS and DOM injection surface), PROTOCOLS-RPC-AND-MESSAGING (webhooks, queues), AI-AND-LLM (if AI reply or summarise features are added, inbound email becomes a prompt-injection vector), and RESOURCE-EXHAUSTION (send quotas, abuse). (inference)
- Build-prompt rule: run security-audit in guidance mode for each feature, and run a full audit ("security audit this codebase") before launch with the output directory outside the repo. (inference)

### Gaps
- The companion files (for example HUNTING.md) and the schema field list were not read in detail.

## 3. Taste Skill (Leonxlnx/taste-skill): design taste rules

### Takeaway
Taste Skill v2.5.1 is a single skill, `design-taste-frontend`. It is aimed at company marketing websites, not app UIs. It "deals" palettes, type and hero layouts per business kind, bans violet or lavender in its own designs, limits gradients and WebGL to tech pages, and verifies pages in a real browser at five widths. Client brand colours replace its generated palette.

### Cited Findings
- Install:
  - `npx skills add https://github.com/Leonxlnx/taste-skill --skill "design-taste-frontend"`
  - Claude Code plugin: `/plugin marketplace add Leonxlnx/taste-skill` then `/plugin install taste-skill@taste-skill`
  - From a clone: `./install.sh`
  - Requires Node 22+ and Chrome, Edge or Chromium. ffmpeg is optional.
  - [README](https://github.com/Leonxlnx/taste-skill)
- The older variants (high-end-visual-design, minimalist-ui, industrial-brutalist-ui, gpt-taste, and others) moved to the taste-skill-classics repo. `redesign-existing-projects` is folded into the main skill. — [README](https://github.com/Leonxlnx/taste-skill)
- Workflow:
  - Classify the business as software, gaming, tech, product, service or place.
  - Palettes and Google Fonts pairings are dealt from `library/palettes.json` and `library/type.json`.
  - One of eleven hero layouts is dealt.
  - A checker renders at 1440, 1024, 820, 768 and 390 and reports PASS, WARN or FAIL.
  - A finish gate runs up to three rounds.
  - [README](https://github.com/Leonxlnx/taste-skill)
- Colour rules:
  - Violet or lavender is banned "in the page's own design: accent, ground, gradient, effect colour or tint". If the deal lands on violet, deal again.
  - One main action per screen, with at most two hero buttons.
  - Outside tech pages: no gradients, grain or print. Tech pages may use CSS grounds and one effect.
  - Text contrast is checked.
  - [SKILL.md](https://github.com/Leonxlnx/taste-skill/blob/main/skills/taste-skill/SKILL.md)
- Layout:
  - one section per screen at 1440x900, each one or two screens tall
  - equal left and right content edges
  - nesting at most two boxes deep
  - 44px tap targets
  - no sideways scroll, and no tilted, staggered or overlapping elements
  - Radius: sharp for fintech and dev tools, soft by default, round for consumer apps.
  - [SKILL.md](https://github.com/Leonxlnx/taste-skill/blob/main/skills/taste-skill/SKILL.md)
- Icons: real, full-colour icons of known products only, "never a drawn one", resolved locally. No icon library is named. — [SKILL.md](https://github.com/Leonxlnx/taste-skill/blob/main/skills/taste-skill/SKILL.md)
- Motion:
  - Cards lift 2px. Photos zoom 1.02-1.03.
  - Loops run 2.5-4s. Anything moving past 5s needs a pause button.
  - The hero enters once.
  - Banned: tilt, carousels, timed tabs, fade-in on scroll, parallax on text, scroll-jacking.
  - Reduced motion means everything rests.
  - WebGL is capped at 4 contexts and limited to software, tech and gaming pages.
  - [SKILL.md](https://github.com/Leonxlnx/taste-skill/blob/main/skills/taste-skill/SKILL.md); [README](https://github.com/Leonxlnx/taste-skill)
- Copy:
  - No captions under images.
  - The h1 names the category and the buyer. Buttons are a verb plus an object.
  - Slop words are banned via copy-lint.
  - No invented reviews, quotes, customers or figures.
  - Unverified facts are marked `data-assumed`.
  - Contacts use `.example`.
  - No copying of reference sites' code, copy, pictures or effects.
  - [SKILL.md](https://github.com/Leonxlnx/taste-skill/blob/main/skills/taste-skill/SKILL.md)
- Brand handling: client colours go through `start.mjs brand` in place of the generated CSS. The client's logo, screens and photos are used, and the palette changes only if it clashes with them. — [SKILL.md](https://github.com/Leonxlnx/taste-skill/blob/main/skills/taste-skill/SKILL.md)
- No banned fonts are named in the README or SKILL.md. — [README](https://github.com/Leonxlnx/taste-skill)

### Inferences
- #5B5BF7 is a blue-indigo (HSL hue about 240°). It sits at the boundary of the "violet" ban, but the brand path (`start.mjs brand`) should take precedence. The build prompt should say explicitly that the brand palette is fixed and must not be re-dealt. (inference)
- The "real full-colour product icons only" rule is about logos and integrations on marketing pages. It does not conflict with using Lucide for interface icons in the app, but the prompt should state that Lucide is the only interface icon set. (inference)
- Taste Skill fits the mrrokesh.com marketing and landing pages, not the webmail app UI. (inference)

### Gaps
- The contents of `palettes.json` and `type.json` (specific fonts) were not read.

## 4. Hallmark (Nutlope/hallmark): design skill rules

### Takeaway
Hallmark (MIT, by Together AI) deals three themes from 50 "materials" and builds around the visitor's task. It lints with `sloplint.mjs` in a real browser against three gate tiers. Floor gates are never waivable; Reflex gates can be waived on the record; Finish gates are craft notes. Several rules matter directly for this brand: Inter as a display face is a Reflex, purple-to-blue gradients are a Floor, and framework stock swatches such as indigo-500 used as tokens are a Reflex.

### Cited Findings
- Install:
  - `npx skills add nutlope/hallmark -g` (omit `-g` for the current project)
  - `--agent claude-code` to target one harness
  - Plugin: `/plugin marketplace add nutlope/hallmark` then `/plugin install hallmark@hallmark`
  - Node 18+. Browser checks need `npm i -g puppeteer-core` plus Chrome.
  - [README](https://github.com/Nutlope/hallmark)
- Commands:
  - `/hallmark <prompt>`; "custom" skips the themes
  - `/hallmark redesign <path>`; "keep the layout" and "polish" variants
  - `/hallmark audit <path>`, which reports only
  - `node skills/hallmark/scripts/sloplint.mjs <file-or-dir> --render`, with `--before` / `--kept` to check a redesign kept its links and fields
  - Pages are checked at eight widths, then reviewed by a fresh-context subagent.
  - [README](https://github.com/Nutlope/hallmark)
- Floor gates (never ship), selected:
  - 2a: no purple-to-blue, purple-to-pink or cyan-on-dark gradients, including gradient text.
  - 7a: no pure `#000` or `#fff` outside tokens.
  - 40: body text 4.5:1, large text, icons and focus rings 3:1.
  - 48: no colour or font-family literal outside the token block.
  - 4: no card inside a card.
  - 6a: no `vh` heroes; use `dvh` or `svh`.
  - 24a: use `--space-*` tokens.
  - 34: no horizontal scroll from 320 to 1920px.
  - 54: no eyebrow labels.
  - 67: no uppercase or tracking above 0.03em on text at 15px or under.
  - 19: no buzzwords (seamless, robust, empower), em or en dashes, "Learn more / Get started / Book a demo", or placeholder names.
  - 46a: no invented metrics, testimonials or logo walls.
  - 70: no fake form success.
  - 10a: no `transition: all`.
  - 15/26a: instant `:focus-visible` rings.
  - 27: reduced-motion fallbacks.
  - 30a: no emoji as icons.
  - [gates.md](https://github.com/Nutlope/hallmark/blob/main/skills/hallmark/references/gates.md)
- Reflex gates (waivable on the record), selected:
  - 1: Inter, Roboto, Open Sans, Poppins, Lato or a system face as display.
  - 74: framework stock swatches (indigo-500, violet-600, slate-900) as tokens.
  - 23: accent above about 5% of the viewport without a declared posture; the render check fails past 8%.
  - 29: aurora or mesh blobs and glows.
  - 25: prose outside 45-75ch.
  - 37: more than three font families.
  - 3: three equal icon-above-heading cards.
  - 12: bounce easing.
  - 39b: control height outside 44-52px on marketing pages.
  - 30b: two icon libraries on one page.
  - 85: email sign-up as the closing section.
  - [gates.md](https://github.com/Nutlope/hallmark/blob/main/skills/hallmark/references/gates.md)
- Finish (non-blocking), selected:
  - F3: `text-wrap: balance` on display heads.
  - F4: one filled-primary recipe.
  - F6: tabular numerals on figures.
  - F16: theme `::selection` and `caret-color`.
  - F19: at most three font weights in running use.
  - F23: `lang`, `<title>` and meta description.
  - [gates.md](https://github.com/Nutlope/hallmark/blob/main/skills/hallmark/references/gates.md)
- Brand handling:
  - Hallmark fetches the brand's homepage CSS into `.hallmark/brand-spec.md`.
  - An existing design.md wins over it ("a locked system wins over a fetched guess at one").
  - The user's explicit palette instructions always win, and the spec is "evidence, not authority."
  - The brand primary anchors the accent, converted to OKLCH.
  - [brand-truth.md](https://github.com/Nutlope/hallmark/blob/main/skills/hallmark/references/brand-truth.md)
- Output is one self-contained HTML/CSS file per page, with decisions recorded in the first CSS comment and the Hallmark stamp in the CSS (Floor 20). Photos come from 755 Wikimedia Commons images; Unsplash and Pexels are excluded. — [README](https://github.com/Nutlope/hallmark); [gates.md](https://github.com/Nutlope/hallmark/blob/main/skills/hallmark/references/gates.md)
- The session's skill description says: "Never use it on an existing design unless the user names Hallmark." — local skill listing

### Inferences
- Satoshi for display and Inter for body passes Reflex 1, which only flags Inter as display. Three families at most is fine.
- #5B5BF7 is not Tailwind indigo-500 (#6366F1), so Reflex 74 should not fire. Keep accent coverage around 5% or below.
- Never use indigo-to-violet or blue gradients (Floor 2a). Use solid #5B5BF7.
- Lucide as the only icon set satisfies 30b.
- Floor 19's ban on em dashes and "Get started" will affect marketing copy.
- Hallmark produces static single-file pages, so it suits the marketing site rather than the React webmail app. (inference)

### Gaps
- fonts.md, craft.md and design-md.md were not read. They may hold further font or OKLCH clamp rules.

## 5. Impeccable (impeccable.style)

### Takeaway
Impeccable, by Paul Bakaus and Apache-2.0 licensed per the GitHub API, is a "design vocabulary" skill with about 25 slash-style commands (shape, critique, audit, polish, typeset, and others). It ships a detector with 62 rules and 6 review patterns. It flags Inter or Geist as overused defaults and purple gradients as an "AI palette," and its first checks enforce whatever DESIGN.md declares.

### Cited Findings
- Install:
  - `npx impeccable install`, or `npx skills add pbakaus/impeccable`
  - Claude Code: `/plugin marketplace add pbakaus/impeccable`
  - Setup: `/impeccable init`, then `/impeccable hooks on`
  - Update: `npx impeccable update`
  - [impeccable.style](https://impeccable.style/)
- Commands:
  - Create: shape
  - Evaluate: critique, audit
  - Refine: typeset, layout, colorize, animate, delight, bolder, quieter, overdrive, simplify, distill, clarify, adapt, harden, polish, optimize, onboard
  - System: init, extract, document, live, generate
  - [impeccable.style](https://impeccable.style/)
- License: Apache-2.0 (from the GitHub API for pbakaus/impeccable).
- Detector catalog (68 checks), selected:
  - Design system: font, colour, radius or font size outside DESIGN.md.
  - Visual: glassmorphism everywhere, side-tab accent border, hairline border with wide shadow, extreme radius on cards (example: 44px on a small card).
  - Typography: label above heading, icon tile above heading, italic serif display, oversized hero, and "Overused font": "Familiar defaults such as Inter and Geist can make unrelated products look alike." This is flagged, not banned.
  - Colour: "AI color palette" ("Purple gradients and bright cyan on dark backgrounds"), gradient text, radial halo, dark mode with glowing accents, cream/beige palette, gray text on coloured background.
  - Layout: nested cards, identical card grids, monotonous spacing, line length over 65-75ch, clipped menus and popovers.
  - Motion: pulsing status dot, blinking cursor, marquee, bounce easing.
  - Copy: em-dash overuse, generic marketing claims.
  - General: contrast 4.5:1 and 3:1, line height around 1.5, body text around 16px, skipped heading levels.
  - [impeccable.style/slop](https://impeccable.style/slop)

### Inferences
- The "outside DESIGN.md" checks make Impeccable the natural enforcer for the brand system: declare #5B5BF7, Satoshi and Inter, and the radius and size scale in DESIGN.md, and the detector polices drift. Expect an "Overused font" warning for Inter, which the prompt can mark as an accepted brand decision. (inference)
- The pulsing status dot and blinking cursor checks matter for email UI patterns like "syncing" or "AI is drafting." Use static or progress states instead. (inference)

### Gaps
- The exact detector implementation and how hooks behave inside Claude Code were not verified.

## 6. getdesign.md

### Takeaway
getdesign.md is the VoltAgent team's catalog of 550+ DESIGN.md files analysing real brands' public sites (Linear, Stripe, Notion, Vercel and others). The backing awesome-design-md repo is MIT. You copy a file into your project root and tell the agent to use it. There is no trademark or affiliation disclaimer beyond "not claim ownership of any site's visual identity."

### Cited Findings
- It is a collection of DESIGN.md files giving agents "colors, type, spacing, components, and the reasoning behind them." It is maintained by VoltAgent and has paid add-ons (Catalog Pass, starter kits, video templates). Private DESIGN.md files for named websites can be requested. — [getdesign.md](https://getdesign.md/)
- DESIGN.md sections:
  1. Visual Theme & Atmosphere
  2. Color Palette & Roles
  3. Typography Rules
  4. Component Stylings
  5. Layout Principles
  6. Depth & Elevation
  7. Do's and Don'ts
  8. Responsive Behavior
  9. Agent Prompt Guide
  - Each site also has `preview.html` and `preview-dark.html`.
  - [awesome-design-md README](https://github.com/VoltAgent/awesome-design-md)
- Usage: copy the DESIGN.md "into your project root" and tell the agent to use it. No CLI is documented. MIT, "as is". Tokens "represent publicly visible CSS values"; the project does "not claim ownership of any site's visual identity." — [awesome-design-md README](https://github.com/VoltAgent/awesome-design-md)

### Inferences
- Best use here: adopt the nine-section structure for the mrrokesh brand's own DESIGN.md, filled with #5B5BF7, Satoshi and Inter, and Lucide. Study peer files such as Linear or Superhuman-like products for structure only. Copying another brand's file wholesale would make the product look like that brand and creates trade-dress risk. (inference)

### Gaps
- getdesign.md's Terms page was not read. Whether an email-client brand file exists in the catalog was not checked.

## 7. Aura (aura.build)

### Takeaway
Aura is an AI website and landing-page builder. Its Product Hunt makers list Meng To and Dara To. It generates pages from prompts and templates, publishes to an Aura subdomain or a custom domain, and exports HTML or Figma. It is a hosted tool, not an agent skill. Pricing is inconsistent across sources.

### Cited Findings
- AI page generation, templates, layout and style customization, publishing to an Aura subdomain or custom domain, SEO, analytics (GA and GTM) and CMS, plus export to HTML or Figma. Makers listed: Dara To and Meng To. Tagged "Free Options." — [Product Hunt](https://www.producthunt.com/products/aura-build-2)
- Pricing: a search snippet of Aura's pricing page shows a $15/month tier with 100 monthly AI messages, Export to Figma, 12,500+ images and 1,590+ templates. A third-party directory lists Pro at $25, Max at $50 and Ultra at $100. The FAQ snippet says the Free plan has 10 messages a month and that Figma export uses a browser-console method. Sources conflict; unverified. — [aura.build/pricing (search snippet)](https://www.aura.build/pricing); [Toolify](https://www.toolify.ai/tool/aura-build); [Aura FAQ (search snippet)](https://aura.build/learn/faq)
- aura.build and its FAQ render client-side; a direct fetch returned only the title "Aura – AI Website Builder". — [aura.build](https://www.aura.build/)

### Inferences
- For this project, Aura is at most a fast way to explore landing-page ideas, exported as HTML and then rebuilt in the brand system. It has no documented Claude Code skill or MCP integration. (inference)

### Gaps
- Output framework (Tailwind or plain HTML), ownership and licence of generated output, MCP support, and confirmed pricing were all unverified because the site is JS-rendered.

## Cross-cutting: conflicts and combinations with the brand (Electric Indigo #5B5BF7, Satoshi + Inter, Lucide)

### Takeaway
None of the tools blocks the brand outright, but each flags parts of it:

- Taste Skill bans violet or lavender (#5B5BF7 is borderline blue-indigo) unless the brand is supplied through its brand path.
- Hallmark forbids purple-to-blue gradients, flags Inter as display, and flags framework indigo swatches as tokens.
- Impeccable flags Inter as overused and purple gradients as an "AI palette."

Every tool defers to an explicit brand or DESIGN.md when one exists. Writing a locked DESIGN.md first is the main mitigation.

### Cited Findings
- Taste Skill violet ban; brand override via `start.mjs brand`. — [Taste SKILL.md](https://github.com/Leonxlnx/taste-skill/blob/main/skills/taste-skill/SKILL.md)
- Hallmark Floor 2a (gradients), Reflex 1 (Inter as display), 74 (indigo-500 stock tokens), 23 (accent above 5%), 30b (one icon library). An existing design.md and explicit palette instructions win. — [gates.md](https://github.com/Nutlope/hallmark/blob/main/skills/hallmark/references/gates.md); [brand-truth.md](https://github.com/Nutlope/hallmark/blob/main/skills/hallmark/references/brand-truth.md)
- Impeccable "Overused font" (Inter and Geist), "AI color palette" (purple gradients), and the "outside DESIGN.md" checks. — [impeccable.style/slop](https://impeccable.style/slop)

### Inferences (suggested build-prompt rules)
- Lock the brand first in a nine-section DESIGN.md (getdesign.md format) at the repo root:
  - #5B5BF7 as the single accent, with an accent-ink token for text on it
  - Satoshi for display and Inter for body/UI (at most three families, at most three weights in running use)
  - Lucide as the only icon set (no emoji icons)
  - OKLCH-tinted neutrals (no pure #000 or #fff)
  - `--space-*` and radius tokens
- Colour:
  - No gradients of indigo to violet, blue or pink, no gradient text, no glow orbs, no glassmorphism.
  - Keep the accent to about 5% of the viewport: primary actions, focus, selected states.
- Type and layout:
  - Prose 45-75ch, body 16px at line height 1.5.
  - Contrast 4.5:1 for text and 3:1 for icons, focus rings and field edges.
  - 44px tap targets.
  - No nested cards, eyebrow labels, three-equal-icon-card grids, or tracked caps at 15px or under.
- Motion:
  - Reduced-motion fallbacks.
  - No bounce easing, pulsing dots or blinking cursors.
  - No `transition: all`.
  - Instant `:focus-visible` rings.
- Copy:
  - No invented metrics, testimonials or logos.
  - No "seamless/robust/empower", "Get started/Learn more", or em dashes (Hallmark Floor 19).
  - No fake form success.
- Tool routing:
  - Taste Skill or Hallmark for mrrokesh.com marketing pages.
  - Impeccable (`critique`, `audit`, `polish`) for the webmail app UI against DESIGN.md.
  - security-audit in guidance mode per feature and a full audit before launch.
  - REA only on our own bundles, or within public ToS for UX observation, never copying code or assets.

### Gaps
- No source addresses how these skills behave when several are installed at once (for example competing triggers for "build a page"). This needs testing.
