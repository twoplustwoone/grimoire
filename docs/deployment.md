# Deployment

This document covers how Grimoire is deployed to production and how to set up a new deployment from scratch. It also documents the hard-won lessons from getting the deployment pipeline working properly — some of which are not obvious from reading the config files.

For the architecture overview, see [architecture.md](./architecture.md).
For the data model, see [schema.md](./schema.md).

---

## Production setup

Grimoire runs on [Railway](https://railway.app) with three services:

1. **`grimoire-api`** — the Hono API and MCP server (Dockerfile, Node 22)
2. **`grimoire-ui`** — the Next.js web app (Dockerfile, Node 22, standalone output)
3. **Postgres** — managed Railway Postgres service

Public traffic hits the web service at `grimoire.twoplustwoone.dev` (custom domain on Railway). The web service proxies API, MCP, and OAuth traffic to the API service via internal networking. The API is not directly exposed to the public internet.

```
Internet
   ↓
grimoire.twoplustwoone.dev
   ↓
grimoire-ui (Next.js)
   ├── serves /, /sign-in, /campaigns/*, /portal/*, /oauth/authorize, /settings
   └── rewrites /api/auth/*, /api/v1/*, /mcp/*, /oauth/register, /oauth/token,
                /.well-known/oauth-* → grimoire-api (internal)
                ↓
           grimoire-api (Hono)
                ↓
         Postgres (Railway internal)
```

---

## The API service

**Dockerfile:** `apps/api/Dockerfile`, single-stage, Node 22 Alpine.

**Build sequence:**

1. Copy workspace manifests (`pnpm-workspace.yaml`, `package.json`, `pnpm-lock.yaml`, `turbo.json`)
2. Copy every package's `package.json` (for Docker layer caching)
3. `pnpm install --frozen-lockfile`
4. Copy `packages/` and `apps/api/` source
5. `pnpm --filter @grimoire/db generate` (Prisma client)
6. `pnpm --filter @grimoire/api build` (TypeScript compile)
7. Copy `entrypoint.sh` and make it executable

**Runtime:** `CMD ["sh", "entrypoint.sh"]` runs migrations, then starts the API.

**Why single-stage:** The final image is larger than it needs to be (includes source, dev deps, `node_modules`). A multi-stage build with `pnpm deploy` or a trimmed production image would shrink it significantly. This is a known optimization opportunity that hasn't been necessary yet — Railway image storage and cold start times are fine as-is.

---

## The web service

**Dockerfile:** `apps/web/Dockerfile`, two-stage builder + runner.

**Why two stages:** Next.js with `output: 'standalone'` produces a minimal runtime bundle (`.next/standalone`). The builder stage does the full install and build; the runner stage only copies the standalone output, static assets, and public files. This results in a significantly smaller production image.

**Build-time env vars:** Next.js needs these available during `next build`:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Server components read from Prisma at build time (route discovery) |
| `BETTER_AUTH_URL` | Auth client baseURL |
| `BETTER_AUTH_SECRET` | Session signing secret (Better Auth reads this internally) |
| `NEXT_PUBLIC_API_URL` | Client-side API base (currently unreferenced in code — dead config, kept for future use) |
| `API_INTERNAL_URL` | Server-side rewrite target |

Railway injects these as build args. The Dockerfile declares them via `ARG` and `ENV`. In the runner stage, they're explicitly reset to empty strings — Railway's runtime environment variables take over from there. This is important: if you forget to set a var in the Railway service config at runtime, the app will boot with an empty string for that var, not with the build-time value.

**Runtime:** `CMD ["node", "apps/web/server.js"]` — the Next.js standalone server.

---

## The migration pipeline

Migrations run automatically on every API deploy. This is the single most important part of the deployment setup.

**How it works:**

`apps/api/entrypoint.sh`:

```sh
#!/bin/sh
set -e
echo "Running database migrations..."
(cd /app && pnpm --filter @grimoire/db exec prisma migrate deploy --schema=./prisma/schema.prisma)
echo "Migrations complete. Starting API..."
exec node dist/index.js
```

`set -e` aborts the script if migrations fail — a failed migration blocks the API from starting, which is correct behavior. `exec` replaces the shell with the Node process so SIGTERM and other signals from Railway reach the API directly.

**Why `pnpm --filter @grimoire/db exec prisma`:** Prisma is a devDependency of `@grimoire/db`. Running `npx prisma` from the API working directory fails with "prisma not found" because the CLI isn't in the API's local `node_modules/.bin`. Using the workspace filter resolves `prisma` from the correct package.

### The `startCommand` gotcha (this will burn you if you don't know)

Railway's dashboard lets you set a custom `startCommand` per service. If a `startCommand` is set in the dashboard, **it overrides the Dockerfile's `CMD`**. This is the gotcha that burned us.

Here's the sequence that caused a production outage:

1. Dockerfile `CMD ["sh", "entrypoint.sh"]` was correct.
2. Someone (or an earlier version of Railway's dashboard UI) set `startCommand: "node dist/index.js"` on the API service.
3. Every deploy skipped `entrypoint.sh` entirely and ran Node directly.
4. Migrations never ran. The database fell behind the schema.
5. The web service crashed with "column doesn't exist" errors the moment it queried a new field.

**The fix:** `apps/api/railway.json` now pins `deploy.startCommand: "sh entrypoint.sh"` explicitly, which overrides the dashboard override. If you ever see a "column does not exist" error in production, check two things:

1. Are migrations actually running? Look for "Running database migrations..." in the deploy logs.
2. Is `railway.json` still pinning the startCommand?

### The web-deploys-before-api gotcha

Even with the entrypoint fixed, there's a timing hazard: the web service and API service deploy independently. If a schema change ships and the web service deploys faster than the API (which runs migrations), the web app will hit the database expecting the new columns before they exist.

This happens when a single commit adds a schema change plus a web query that uses the new schema. Both services deploy from the same commit, but the web starts serving traffic while the API is still running migrations.

**The mitigation:** if you see "column does not exist" errors after a schema-changing deploy, redeploy the web service — by then the migration has completed, and the web just needs a fresh start to pick up the current state.

**The long-term fix** (not yet implemented): have the web service's startup script also wait for the database to be on the expected schema version before accepting traffic. For now, manual redeploy works.

### The prisma-not-found gotcha

Before the current entrypoint was in place, an earlier version tried to run `npx prisma migrate deploy` from `/app/apps/api`. That fails because `prisma` is a devDependency of `@grimoire/db`, not `@grimoire/api`. The CLI is only resolvable via the workspace. Using `pnpm --filter @grimoire/db exec prisma` from the repo root is the correct pattern.

---

## Environment variables

### API service

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string (Railway auto-injects from the Postgres service) |
| `WEB_URL` | yes | CORS origin, Better Auth trusted origin, OAuth issuer, invite URL base |
| `BETTER_AUTH_URL` | yes | Better Auth baseURL (defaults to `http://localhost:3005` if unset, which is wrong in prod) |
| `BETTER_AUTH_SECRET` | yes | Session signing secret (generate with `openssl rand -base64 32`) |
| `ANTHROPIC_API_KEY` | yes | Claude recap generation |
| `PORT` | no | Port the API listens on (Railway sets this automatically) |
| `NODE_ENV` | no | `production` in Railway, `development` locally |

### Web service

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes (build + runtime) | Web has its own Prisma client for server components |
| `BETTER_AUTH_URL` | yes | Auth client baseURL |
| `BETTER_AUTH_SECRET` | yes (build) | Session signing (Better Auth reads env internally) |
| `API_INTERNAL_URL` | yes | Server-side rewrite target (Railway internal URL to the API service) |
| `NEXT_PUBLIC_APP_URL` | no | Client-side app URL fallback |

### Postgres

Railway manages Postgres. The `DATABASE_URL` is auto-injected into both services via service linking. There's also a `DATABASE_PUBLIC_URL` available for connecting from outside the Railway network (used for local migration testing and emergency access).

---

## Local development

**Prerequisites:**

- Node 22
- pnpm 10.33+
- Docker (for local Postgres)

**First-time setup:**

```bash
# Install dependencies
pnpm install

# Start local Postgres via docker-compose
pnpm db:up

# Create a .env file in packages/db/ with:
# DATABASE_URL="postgresql://grimoire:grimoire@localhost:5432/grimoire"

# Run migrations and seed the database
pnpm db:reset

# Start both apps
pnpm dev
```

`pnpm dev` runs Turbo's `dev` task, which starts the web (port 3000) and API (port 3001) in parallel with hot reload.

**⚠️ The local port mismatch:** The API defaults to port 3001. The web app's rewrites default to `http://localhost:3005`. If you run both with default settings, every API call from the web will fail. To fix this, either:

1. Run the API with `PORT=3005 pnpm --filter @grimoire/api dev`
2. Set `API_INTERNAL_URL=http://localhost:3001` in `apps/web/.env`

This inconsistency is known and should probably be cleaned up.

### Local database commands

| Command | What it does |
|---|---|
| `pnpm db:up` | Start Postgres container |
| `pnpm db:down` | Stop Postgres container |
| `pnpm db:migrate` | Create a new migration in dev mode (interactive) |
| `pnpm db:reset` | Drop the database, re-run all migrations, re-seed |
| `pnpm seed` | Re-run the seed script against the current database |

### Creating migrations

When you change `schema.prisma`:

```bash
cd packages/db
pnpm exec prisma migrate dev --name descriptive_name --schema=./prisma/schema.prisma
```

This generates a migration file under `packages/db/prisma/migrations/` and applies it to your local database. Commit the migration file to the repo. Production will apply it on the next API deploy.

### Seeded accounts

After running `pnpm db:reset`, these accounts exist locally:

| Role | Email | Password |
|---|---|---|
| GM | `gm@grimoire.dev` | `password` |
| Player (Serafine) | `serafine@grimoire.dev` | `password` |
| Player (Rook) | `rook@grimoire.dev` | `password` |
| Player (Maren) | `maren@grimoire.dev` | `password` |

Note: In production, users don't get seed data. Every new user instead gets the demo campaign (*The Shattered Conclave*) created automatically on first sign-up via Better Auth's `databaseHooks.user.create.after` hook.

---

## Setting up a fresh Railway deployment

If you're deploying Grimoire from scratch:

1. **Create a Railway project.** Link it to your GitHub repo.

2. **Add a Postgres service** via Railway's "New Service" → Database → Postgres.

3. **Add the API service:**
   - New Service → GitHub Repo → select grimoire repo
   - Settings → Source → Root Directory: leave as `/`
   - Settings → Build → Dockerfile path: `apps/api/Dockerfile`
   - Settings → Variables: add `DATABASE_URL` (reference the Postgres service's variable), `WEB_URL`, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `ANTHROPIC_API_KEY`
   - Settings → Networking: generate a private domain (e.g. `grimoire-api.railway.internal`)
   - Do NOT set a custom `startCommand` — `railway.json` pins it to `sh entrypoint.sh`

4. **Add the Web service:**
   - Same repo, different service
   - Dockerfile path: `apps/web/Dockerfile`
   - Variables: `DATABASE_URL`, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `API_INTERNAL_URL` (set to the API's private domain), `NEXT_PUBLIC_APP_URL`
   - Networking: generate a public domain, optionally add a custom domain

5. **Deploy.** The API should run migrations on first boot. The web should proxy correctly to the API.

6. **Verify health:**
   - API `/health` returns `{ status: 'ok' }`
   - Web `/` loads the landing page
   - Sign up a new user and confirm *The Shattered Conclave* appears in their campaigns

---

## Known limitations and future improvements

These are known issues documented so they're not rediscovered later:

- **API Docker image is single-stage.** Includes dev dependencies and source code in the production image. Could be trimmed with a multi-stage build and `pnpm deploy`.
- **Web runtime silently tolerates missing env vars.** If `BETTER_AUTH_SECRET` is missing at runtime, the app boots with an empty string. No startup validation. A health check that exercises the auth layer would catch this.
- **Dead env vars:** `NEXT_PUBLIC_API_URL` is a web Dockerfile build arg but isn't referenced anywhere in the codebase. Keep or remove deliberately.
- **Web health check is just `/`.** If the landing page errors, health fails. A dedicated `/api/health` route on the web would be more reliable.
- **Local port mismatch** between API default (3001) and web rewrites default (3005). Pick one and align both.
- **No staging environment.** Deploys go straight to production. For a personal project this is fine; if this becomes a real product, a staging environment with its own Postgres would be standard.
- **No backup strategy documented.** Railway Postgres has its own snapshots, but a documented restore procedure doesn't exist.

---

## Security notes

- **Rotate the Postgres password** if it appears in any logs, tool output, or screenshots. Railway → Postgres service → Variables → regenerate.
- **Rotate `BETTER_AUTH_SECRET`** and users will be logged out on the next session check. Worth doing if the secret is ever leaked.
- **OAuth tokens are bearer tokens.** They grant full access to the user's campaigns for the token's lifetime (1 hour for access tokens). If leaked, invalidate them by deleting the relevant row from `OAuthAccessToken`.
- **API keys are SHA-256 hashed at rest.** A database leak doesn't leak the keys themselves, but any key shown once at creation and not stored elsewhere is gone if the user loses it.

---

## When things go wrong

**Deploy fails with "column does not exist":** Migrations didn't run. Check `railway.json` still pins `startCommand`. Check deploy logs for "Running database migrations..." Manually run `prisma migrate deploy` against `DATABASE_PUBLIC_URL` if needed.

**Sign-in redirects in a loop:** `BETTER_AUTH_URL` or `WEB_URL` is wrong. They must match the actual deployed URLs.

**OAuth consent flow fails:** Check that `/oauth/authorize` is NOT in the Next.js rewrites (it's a Next.js page, not a proxy target). Check that the OAuth client's `redirectUris` includes the Claude Desktop callback.

**MCP tools return "Unauthorized":** The access token expired (1 hour TTL). The client should auto-refresh. If it doesn't, check that the refresh token endpoint is reachable via `/oauth/token`.

**Web service deploys before API, serves stale schema:** Redeploy the web service manually after the API finishes its migration deploy.
