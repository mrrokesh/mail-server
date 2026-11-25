# DESIGN.md — MR Rokesh Mail (www.mrrokesh.com)
Status: LOCKED — Source of truth: mrrokesh-Product-Build-Playbook.pdf
Applies to: /frontend (Web), /mobile (Expo iOS & Android), /packages/shared/tokens

## 1. Visual Direction & Skill Guardrails
- Aesthetic: Apple-inspired clarity, generous whitespace, one strong focus per screen, quiet motion — using mrrokesh.com's own identity (never SF Pro on web, never Apple icons, never copied layouts).
- Mode Mapping (for `impeccable` / `taste-skill` / `hallmark`):
  - **Persuade Mode** (`/`, `/pricing`, `/security`): Editorial hero with signature Electric Indigo glow, crisp live-product UI captures (no stock-photo clutter), 128px desktop vertical section rhythm.
  - **Operate Mode** (`/mail`, `/calendar`, `/contacts`, `/admin`): High-clarity three-pane workspace, surface separation without visual noise, keyboard-first density using the 4pt spacing scale, zero decorative gradients inside reading panes.
  - **Read Mode** (`/docs`, `/changelog`, Mobile Help): 70ch max measure, structured callouts, searchable error-code reference tables.
- Anti-Slop Hard Floors (`hallmark` / WCAG 2.2 AA):
  - Brand accent (`#5B5BF7` / `#7B7BFF`) MUST NOT exceed **10% of any viewport**.
  - Contrast >= 4.5:1 for normal text, >= 3:1 for large text/UI controls.
  - Minimum 44x44pt touch targets on mobile; visible focus rings on every interactive element.
  - Every screen MUST support Light and Dark modes cleanly with zero broken layouts across 320px–1920px viewports.

## 2. Design Tokens (`packages/shared/tokens/tokens.css`)
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