# Local development

Last updated: 2026-11-26 · v0.2.0

This runs PostgreSQL 16, Redis 7, and Stalwart Community on your machine. Stalwart is the official `stalwartlabs/stalwart:v1` image, unmodified, with no enterprise licence. Collabora and LiveKit are not part of this compose file.

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

That runs `backend/src/db/migrations/0001_initial_schema.sql`. When `APP_DB_PASSWORD` is set, it also sets the password for `mrrokesh_app`. Point `APP_DATABASE_URL` at that role. The role cannot bypass row-level security. The Compose user can, so the running API should not use `DATABASE_URL`.

`backend/src/db/schema.ts` is the typed mirror. The SQL file is what migrate applies. Plan entitlements in the database are filled from the catalog in code on startup.

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

| Service     | Address          | Notes                                                                                               |
| ----------- | ---------------- | --------------------------------------------------------------------------------------------------- |
| Postgres 16 | `127.0.0.1:5432` | Control-plane database `mrrokesh_mail`. A second database, `stalwart`, is created on first boot.    |
| Redis 7     | `127.0.0.1:6379` | Password from `REDIS_PASSWORD`.                                                                     |
| Stalwart    | `127.0.0.1:8080` | Setup wizard on first start. Mail ports 25, 465, 587, 993, 995, 4190, and 443 are also on loopback. |

Ports are bound to loopback so a laptop does not accept mail from the internet. A later deployment manifest publishes them on a server with a hostname and PTR.

### Stalwart first run

1. `docker logs` for the `stalwart` service and copy the temporary admin password from the bootstrap block.
2. Open `http://127.0.0.1:8080/admin` and finish the wizard. Set the hostname yourself. The container id is not a valid hostname.
3. For storage, choose PostgreSQL. Host `postgres`, database `stalwart`, user `stalwart`, password `STALWART_DB_PASSWORD`. The same shape is written in `infra/stalwart/datastore.stub.json`. Do not mount that stub over `/etc/stalwart`. An empty volume is what lets the wizard run.
4. Restart the Stalwart service so it leaves bootstrap mode.

`infra/redis/redis.conf` is a stub. The compose service is what actually starts Redis.

Stop everything with:

```bash
docker compose --env-file .env -f infra/docker-compose.yml down
```

Add `-v` only when you mean to delete the local databases.
