# Local development

Last updated: 2026-11-26 · v0.3.0

This runs PostgreSQL 16, Redis 7, Stalwart Community, LiveKit, and Collabora on your machine. Stalwart is the official `stalwartlabs/stalwart:v1` image, unmodified, with no enterprise licence.

Drive file bytes live under `DRIVE_DATA_DIR`. Documents, meetings, calendar events, contacts, AI usage, compliance, SSO, and SCIM follow the same Postgres flush as the other module tables when `CONTROL_STORE=postgres`. Set `LIVEKIT_URL` and `COLLABORA_URL` so Meet and Docs point at the local containers. Leave them unset and those screens stay on the stub adapters.

## Prerequisites

- Node.js 22 or newer (`nvm use` reads `.nvmrc`)
- pnpm 10.18.3 (`corepack enable` then `corepack prepare pnpm@10.18.3 --activate`)
- Docker Engine with Compose v2

## Install and check the apps

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
```

Web scaffold:

```bash
pnpm dev:web
```

Open `http://127.0.0.1:5173`.

API scaffold:

```bash
pnpm dev:api
```

Health: `http://127.0.0.1:4000/api/v1/health`. The rest of the API is in `backend/openapi.yaml`. Web and mobile call `POST /api/v1/auth/sign-in` and `POST /api/v1/auth/sign-up`; `/login` and `/signup` are the same handlers. The screen list is [screens-and-apis.md](./screens-and-apis.md).

The API defaults to an in-memory store, so it runs without Docker. Set `CONTROL_STORE=postgres` after the migration below. `MAIL_PLANE=http` turns on the Stalwart stub. Anything else keeps provisioning in memory.

Passwords use bcrypt cost 12 and an HMAC pepper. Access tokens last 15 minutes. Refresh tokens last 30 days, rotate on each use, and a reused token revokes the whole family.

### Apply the schema

With Postgres running and `DATABASE_URL` pointing at the migration user (the Compose superuser):

```bash
pnpm --filter @mrrokesh/backend db:migrate
```

That applies `backend/src/db/migrations/0001_initial_schema.sql` and `0002_v2_modules.sql`. A later run skips a file that is already recorded in `schema_migrations`. If the initial schema is already present, it is recorded and only the v2 file runs. When `APP_DB_PASSWORD` is set, it also sets the password for `mrrokesh_app`. Point `APP_DATABASE_URL` at that role. The role cannot bypass row-level security. The Compose user can, so the running API should not use `DATABASE_URL`.

A managed Postgres login that cannot `CREATE ROLE` still gets the tables. The migration catches that privilege error, skips grants to `mrrokesh_app`, and does not `FORCE ROW LEVEL SECURITY`. Set `APP_DATABASE_URL` to the same value as `DATABASE_URL` and leave `APP_DB_PASSWORD` unset. That owner bypasses row-level security. Local Docker still creates `mrrokesh_app` and forces row-level security for it.

Set `CONTROL_STORE=postgres` to persist drive metadata, tasks, notes, booking, chat, and the other v2 tables. Leave it unset to keep those rows in memory.

`backend/src/db/schema.ts` is the typed mirror. The SQL files are what migrate applies. Plan entitlements in the database are filled from the catalog in code on startup.

The mobile package typechecks with the rest of the repo. Start the Expo shell with `pnpm --filter @mrrokesh/mobile dev` when you want a simulator.

## Start Postgres, Redis, and Stalwart

From the repo root:

```bash
cp .env.example .env
```

Replace every `CHANGE_ME` in `.env`. Use a different value for `PASSWORD_PEPPER` and `DATA_ENCRYPTION_KEY_V1`. Then:

```bash
docker compose --env-file .env -f infra/docker-compose.yml up -d
docker compose --env-file .env -f infra/docker-compose.yml ps
```

| Service     | Address          | Notes                                                                                                                                                        |
| ----------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Postgres 16 | `127.0.0.1:5433` | Control-plane database `mrrokesh_mail`. Host port 5433 avoids a Postgres already listening on 5432. A second database, `stalwart`, is created on first boot. |
| Redis 7     | `127.0.0.1:6379` | Password from `REDIS_PASSWORD`.                                                                                                                              |
| Stalwart    | `127.0.0.1:8081` | Setup wizard on first start. Host port 8081 avoids Apache on 8080. Mail ports 25, 465, 587, 993, 995, 4190, and 443 are also on loopback.                    |
| LiveKit     | `127.0.0.1:7880` | Dev mode. The API signs a join token when `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` are set.                                                |
| Collabora   | `127.0.0.1:9980` | Discovery at `/hosting/discovery`. Set `COLLABORA_URL` so Docs stops using the stub adapter.                                                                 |

Ports are bound to loopback so a laptop does not accept mail from the internet. A later deployment manifest publishes them on a server with a hostname and PTR.

### Stalwart first run

1. `docker logs` for the `stalwart` service and copy the temporary admin password from the bootstrap block.
2. Open `http://127.0.0.1:8081/admin` and finish the wizard. Set the hostname yourself. The container id is not a valid hostname.
3. For storage, choose PostgreSQL. Host `postgres`, database `stalwart`, user `stalwart`, password `STALWART_DB_PASSWORD`. The same shape is written in `infra/stalwart/datastore.stub.json`. Do not mount that stub over `/etc/stalwart`. An empty volume is what lets the wizard run.
4. Restart the Stalwart service so it leaves bootstrap mode.

`infra/redis/redis.conf` is a stub. The compose service is what actually starts Redis.

Stop everything with:

```bash
docker compose --env-file .env -f infra/docker-compose.yml down
```

Add `-v` only when you mean to delete the local databases.
