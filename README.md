# MR Rokesh Mail

Custom-domain business email and productivity suite for mrrokesh.com. Web, Android, and iOS share one API.

## Layout

| Path               | Role                                                                                         |
| ------------------ | -------------------------------------------------------------------------------------------- |
| `frontend/`        | React, Vite, and TypeScript. Marketing, webmail, and admin land here later.                  |
| `backend/`         | Fastify control plane for auth, tenants, mail, and billing. OpenAPI: `backend/openapi.yaml`. |
| `mobile/`          | Expo Router shell for Android and iOS.                                                       |
| `packages/shared/` | Error codes, design tokens, and plan tier ids.                                               |
| `infra/`           | Docker Compose for PostgreSQL 16, Redis 7, and Stalwart Community.                           |
| `docs/`            | User docs and the local run guide.                                                           |
| `prompts/`         | Planning briefs and research. Leave this tree as the archive it is.                          |

`PROJECT_BRIEF.md` at the repo root is the build brief. `DESIGN.md` is the locked visual system. Plan names are Free, Starter, Business, Business Plus, and Enterprise.

## Scripts

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm dev:web
pnpm dev:api
```

Node.js 22 or newer. The package manager is pnpm 10.18.3.

Postgres, Redis, and Stalwart: [docs/local-dev.md](docs/local-dev.md). Copy `.env.example` to `.env` and replace every `CHANGE_ME` before you start them.

## Status

Version 0.2.0 is the MVP scaffold: marketing and auth, three-pane webmail, calendar and contacts screens, admin for domains and users, and an Expo mail shell. The API is the control plane in `backend/openapi.yaml`. Web and mobile sign in at `POST /api/v1/auth/sign-in` and create a workspace at `POST /api/v1/auth/sign-up` (the `/login` and `/signup` paths stay). Screen and route lists are in [docs/screens-and-apis.md](docs/screens-and-apis.md).

`pnpm dev:api` uses an in-memory store unless `CONTROL_STORE=postgres`. Health stays at `GET /api/v1/health`. Drive, chat, and the rest of v1 are not in this version.
