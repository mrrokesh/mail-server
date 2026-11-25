# DESIGN.md — MR Rokesh Mail

Status: LOCKED
Source of truth for values: `PROJECT_BRIEF.md` (DESIGN) and the mrrokesh.com Product Build Playbook.
Applies to: `frontend/`, `mobile/`, and `packages/shared/tokens/`.

Precedence when a tool disagrees with this file: the playbook and `PROJECT_BRIEF.md`, then this file, then any design skill's defaults. Electric Indigo, Satoshi, and Inter are fixed. Do not re-deal the palette or the type.

Plan names in product UI are Free, Starter, Business, Business Plus, and Enterprise, plus the Privacy add-on. Do not label tiers Growth, Business Pro, or Enterprise Sovereign.

## 1. Visual theme and atmosphere

Apple-inspired clarity, generous whitespace, one strong focus per screen, quiet motion. The identity is mrrokesh.com's own: never SF Pro on the web, never Apple icons, never copied layouts, never stock-photo clutter.

Three modes:

- **Persuade** (`/`, `/pricing`, `/security`): editorial hero, one Electric Indigo glow, crisp product UI captures, 128px desktop section rhythm.
- **Operate** (`/mail`, `/calendar`, `/contacts`, `/admin`, and the same jobs on mobile): three-pane workspace, surface separation without noise, keyboard-first density on the 4pt scale. No decorative gradients inside reading panes. No scroll-reveal motion.
- **Read** (`/docs`, `/changelog`, Mobile Help): 70 character measure, structured callouts, searchable error-code tables.

Atmosphere rules:

- One hero per screen. Space is the luxury. Content comes first.
- Calm motion only, and only where section 6 allows it.
- The same tokens on web and mobile, so a setting changed in one client feels like the other.
- Light and dark mode on every screen. Dark mode swaps surfaces. It does not add a second glow.

## 2. Colour palette and roles

Brand accent covers at most 10% of any viewport. Marketing pages should sit nearer 5%. Solid brand colour only: no indigo-to-violet, blue, or pink gradients, no gradient text, and no glow orbs beyond the single `brand-glow` token.

| Token          | Light                               | Dark                        | Role                           |
| -------------- | ----------------------------------- | --------------------------- | ------------------------------ |
| bg             | `#FFFFFF`                           | `#000000`                   | Page background                |
| surface        | `#F5F5F7`                           | `#1C1C1E`                   | Cards, grouped sections, panes |
| text-primary   | `#111113`                           | `#F5F5F7`                   | Headlines and body             |
| text-secondary | `#6E6E73`                           | `#A1A1A6`                   | Supporting text, metadata      |
| brand          | `#5B5BF7`                           | `#7B7BFF`                   | Primary button, links, focus   |
| on-brand       | `#FFFFFF`                           | `#FFFFFF`                   | Text and icons on a brand fill |
| brand-glow     | `#5B5BF7` at 20% opacity, 80px blur | same                        | Marketing hero only            |
| success        | `#1F9D55`                           | `#30D158`                   | Confirmations                  |
| warning        | `#C77700`                           | `#FFD60A`                   | Warnings                       |
| danger         | `#D92D20`                           | `#FF453A`                   | Errors and destructive actions |
| border         | `rgba(17, 17, 19, 0.08)`            | `rgba(245, 245, 247, 0.10)` | Hairline separators            |

CSS variables live in `packages/shared/tokens/tokens.css`. The same values are exported as `tokens` from `@mrrokesh/shared` for React Native. Screens read those. They do not write raw colour literals.

Contrast floors: 4.5:1 for normal text, 3:1 for large text, icons, and focus rings (WCAG 2.2 AA).

## 3. Typography rules

Headings use Satoshi. Body uses Inter. Headlines use letter-spacing `-0.02em`. Measure stays at or under 70 characters. A screen uses at most three sizes from this scale.

| Token   | Web size / line height | Phone web size | Mobile size | Weight | Use                 |
| ------- | ---------------------- | -------------- | ----------- | ------ | ------------------- |
| display | 80 / 84 px             | 48 px          | 40 pt       | 700    | Homepage hero only  |
| h1      | 56 / 60 px             | 34 pt          | 34 pt       | 700    | Page title          |
| h2      | 40 / 44 px             | 28 pt          | 28 pt       | 600    | Section title       |
| h3      | 28 / 34 px             | 22 pt          | 22 pt       | 600    | Card title          |
| body-lg | 21 / 32 px             | 19 pt          | 19 pt       | 400    | Intro paragraphs    |
| body    | 17 / 26 px             | 17 pt          | 17 pt       | 400    | Default text        |
| caption | 14 / 20 px             | 13 pt          | 13 pt       | 500    | Labels and metadata |

```css
--font-heading: 'Satoshi', -apple-system, BlinkMacSystemFont, sans-serif;
--font-body: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
```

On mobile, body text may fall back to SF Pro or Roboto when Inter is not loaded. Headings stay Satoshi. Inter as a brand body face is an accepted decision if a design checker flags it as a common font.

Font files are not bundled in the Phase 0 scaffold. When UI work starts, load Satoshi and Inter from a source we have rights to use, and keep these family names.

## 4. Component stylings

Icons are Lucide only (`lucide-react` on web, `lucide-react-native` on mobile): 1.5px stroke, 24px. No other icon set, and no hand-drawn product marks standing in for Lucide.

**Primary button.** Brand fill, on-brand text, height 48px on web and 50px on mobile. Radius 14px, or a pill when the button stands alone. One primary button per screen. The label is a verb plus an object: "Add domain", "Send invite".

**Secondary button.** Text or an outline in the brand colour. It never competes with the primary.

**Inputs.** Height 48px, radius 8px, label above the field, error text below in the danger colour, including the error code from `packages/shared/errors/codes.ts`.

**Cards.** Surface colour, radius 20px, padding 24px.

**Navigation.** Sticky frosted bar (`backdrop-filter: blur(20px)`), logo on the left, at most five links, one call to action on the right.

**Mobile tab bar.** At most five tabs: Mail, Calendar, Contacts, Drive, More.

**Empty states.** One illustration, one sentence, one action.

**Loading.** Skeleton screens for anything that takes longer than 300ms. No spinners, no pulsing dots, and no blinking cursors for sync or AI drafting.

**Email reading (Operate mode, when that UI exists).** Sanitised HTML inside a sandboxed iframe. Remote images stay blocked until the reader asks. Tier locks use a quiet inline upgrade, not a second visual system.

## 5. Layout principles

Spacing is a 4pt scale and nothing else: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128.

| Token                    | Value                                                    |
| ------------------------ | -------------------------------------------------------- |
| Container max            | 1200px                                                   |
| Mobile gutter            | 24px                                                     |
| Section padding, desktop | 128px                                                    |
| Section padding, mobile  | 64px                                                     |
| Input radius             | 8px                                                      |
| Button radius            | 14px                                                     |
| Pill radius              | 9999px                                                   |
| Card radius              | 20px                                                     |
| Sheet and modal radius   | 28px                                                     |
| Touch target             | at least 44pt                                            |
| Webmail density          | 4pt scale, no decorative padding inside the reading pane |

Persuade pages stack one idea per section, with equal left and right content edges. Operate pages are a three-pane workspace: folders, list, reading pane. The panes separate with surface and border tokens, not with extra shadows. Read pages stay inside the 70 character measure.

Every interactive control has a visible label, a visible focus ring, and full keyboard support on the web.

## 6. Depth and elevation

One shadow, light mode only: `0 8px 30px rgba(0, 0, 0, 0.08)`. Dark mode drops the shadow and uses the lighter surface (`#1C1C1E`) for elevation.

Frosted glass is the navigation bar only: `backdrop-filter: blur(20px)`.

The hero glow is marketing only: brand at 20% opacity, `blur(80px)`. It does not appear in mail, calendar, contacts, admin, or docs.

Motion lasts 200 to 400ms on `cubic-bezier(0.25, 0.1, 0.25, 1)`.

- Marketing scroll reveals fade and move 24px once. They do not loop, and they do not run in the mail app.
- A marketing hero product may scale from 1.0 to 1.05.
- `prefers-reduced-motion: reduce` sets durations to 0. Respect that setting on mobile as well.

## 7. Do's and don'ts

Do:

- Import colour, type, space, radius, and motion from `packages/shared/tokens`.
- Ship light and dark mode together.
- Keep brand colour inside the 10% cap.
- Write headlines under six words.
- Say what happened and what to do next in every error, using a code from the registry.
- Use one primary action per screen.

Don't:

- Hard-code colours, font families, or spacing in a screen.
- Invent metrics, testimonials, customer logos, or review quotes.
- Use gradient text, extra glows, nested decorative cards, or icon-tile stacks.
- Use a spinner, a pulsing dot, or a blinking cursor as a loading state.
- Put scroll-reveal animation inside Operate mode.
- Rename plans to the blueprint's Growth / Business Pro / Enterprise Sovereign labels.
- Let a design skill replace Satoshi, Inter, or Electric Indigo.
- Copy layouts, icons, or marketing lines from another product.

## 8. Responsive behaviour

Support 320px through 1920px with no broken layout and no sideways scroll.

- Below 768px, display type drops to 48px, section padding drops to 64px, and the gutter stays 24px.
- The primary control stays at least 44pt tall on touch devices.
- Webmail collapses the three panes into a single drill-in flow: list, then message. The same tokens apply.
- The mobile tab bar keeps the five tabs from section 4. It does not grow a sixth.
- Focus rings stay visible at every width. They are not removed on touch.
- Text does not overflow its card. Long addresses wrap. The reading measure on docs stays at 70 characters even on a wide monitor.

Check light and dark at a phone width and at 1280px before calling a screen done.

## 9. Agent prompt guide

Use this block when a design skill or a later coding session builds UI:

> Build MR Rokesh Mail UI only from DESIGN.md and `packages/shared/tokens`. Brand is Electric Indigo `#5B5BF7` (dark `#7B7BFF`), headings Satoshi, body Inter, icons Lucide at 1.5px and 24px. Spacing is the 4pt scale. One primary button per screen, label verb plus object. Brand colour on at most 10% of the viewport. Light and dark mode. WCAG 2.2 AA. Persuade mode for marketing, Operate mode for mail and admin (no decorative motion), Read mode for docs. Plans are Free, Starter, Business, Business Plus, and Enterprise. Do not re-deal colour or type. If a skill default conflicts, follow DESIGN.md and record the waiver in the pull request. Inter as the body face is an accepted brand decision.

Checker roles, when those tools are run later:

- Hallmark or Taste Skill: marketing pages only, one of them per page, fed this file. Rebuild any output as React components that use the tokens.
- Impeccable: critique webmail, admin, and mobile against this file.
- getdesign.md files from other brands: structure only. Copy none of their values.

Definition of done for a visual change: tokens only, both themes, keyboard focus on web, 44pt targets on mobile, and this file left unchanged unless the playbook itself changes.
