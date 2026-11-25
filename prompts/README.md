# MR Rokesh Mail — Prompts & Specs

Planning prompts, blueprints, and competitor research for the custom-domain business email suite. Push target: [mrrokesh/mail-server](https://github.com/mrrokesh/mail-server).

## Layout

| Path | What it is |
|------|------------|
| `briefs/PROJECT_BRIEF.md` | Canonical coding-agent starter brief (paste / save as repo root `PROJECT_BRIEF.md` when building) |
| `briefs/build-prompt.md` | Full build prompt (Parts A–J): architecture, features, pricing, DNS, mail engine |
| `briefs/master-build-prompt.md` | ChatGPT master build prompt / product architecture brief |
| `blueprints/master-blueprint.md` | Master product, architecture, design & security blueprint |
| `blueprints/DESIGN.md` | Locked design system (tokens, modes, WCAG floors) |
| `research/competitor-features.md` | Custom-domain email suite feature matrix across providers |
| `research/notes/` | Provider and stack research notes |

## How to use

1. Start a coding agent with **`briefs/PROJECT_BRIEF.md`**.
2. Keep **`blueprints/`** and **`research/`** as reference while implementing.
3. Prefer the newer playbook-aligned brief over older drafts when they conflict.
