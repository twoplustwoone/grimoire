# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Documentation

Before making non-trivial changes, read the doc most relevant to your task:

- `docs/architecture.md` — monorepo layout, request flow, why the code is shaped the way it is, how to add new entity types
- `docs/schema.md` — data model, polymorphic entity pattern, cross-cutting concerns
- `docs/deployment.md` — Railway setup, migration pipeline, known deployment gotchas
- `VISION.md` — product philosophy (what Grimoire is and is not)

## Common commands

All commands run from the repo root unless noted.

```bash
# First-time local setup
pnpm install
pnpm db:up               # start Postgres via docker-compose
pnpm db:reset            # migrate + seed (drops existing data)

# Daily dev
pnpm dev                 # runs web (3000) and API in parallel via Turbo

# Build / typecheck / lint
pnpm build
pnpm check-types
pnpm lint
pnpm --filter @grimoire/web build     # build one app
pnpm --filter @grimoire/api build

# Database
pnpm db:migrate          # create a new migration (dev mode)
pnpm db:reset            # nuke + re-migrate + re-seed
pnpm seed                # re-run seed against current DB

# Prisma CLI — ALWAYS run it through the db workspace:
pnpm --filter @grimoire/db exec prisma <command>
# (prisma is a devDep of @grimoire/db only; `npx prisma` from apps/ won't resolve it)
```

No test runner is configured. If a task requires tests, ask the user which framework to introduce.

## Architecture in one minute

Two deployable apps sharing one Postgres:

- **`apps/web`** — Next.js 16 (App Router, Turbopack, `output: 'standalone'`). Server Components read from Prisma directly for page loads. Client-side `fetch('/api/v1/...')` calls go through `next.config.ts` **rewrites** to the API.
- **`apps/api`** — Hono on Node 22. Hosts the REST API, Better Auth handler, OAuth 2.1 authorization server, and the MCP server (HTTP transport, mounted at `/mcp`).

Both apps import `@grimoire/db` (shared Prisma client) and share Better Auth session cookies, so a logged-in user on the web is authenticated against the API without a separate handshake.

### Request routing (via `apps/web/next.config.ts`)

| Public path | Proxied to API as |
|---|---|
| `/api/auth/*` | `/api/auth/*` |
| `/api/v1/*` | **`/*`** (v1 prefix stripped) |
| `/mcp`, `/mcp/*` | `/mcp*` |
| `/.well-known/oauth-authorization-server` | same |
| `/.well-known/oauth-protected-resource` | same |
| `/oauth/register`, `/oauth/token` | same |

**Not** rewritten: `/oauth/authorize` — that's a real Next.js page (the consent screen), because it needs the Better Auth session cookie to know who is authorizing.

### The polymorphic entity pattern

The single most load-bearing design in the schema. Most cross-cutting tables (`Note`, `InformationNode`, `EntityReveal`, `Relationship`, `ChangelogEntry`, `SessionEntityTag`, `ThreadEntityTag`, `CustomFieldValue`) reference entities by `(entityType, entityId)` rather than per-type foreign keys.

Consequence: **adding a new entity type is mostly mechanical.** Add it to the `EntityType` enum, create the Prisma model, add an API route, add web pages, update the graph. All cross-cutting systems (notes, reveals, mentions, relationships, changelog, custom fields) pick it up automatically. See `docs/architecture.md` → "How to add a new entity type" for the full checklist.

Tradeoff: no DB-level FK from `entityId` to the target table. The app is responsible for consistency. Soft deletes (`deletedAt`) keep dangling references rare in practice.

### Auth surfaces

Three ways to authenticate, all reading the same user table:

1. **Web UI + REST API** — Better Auth session cookies (email + password)
2. **MCP — OAuth 2.1 + PKCE** — Claude Desktop registers dynamically, user consents on the Next.js `/oauth/authorize` page, tokens land in `oAuthAccessToken`
3. **MCP — API key Bearer** — convenience fallback; keys stored as SHA-256 hashes in `apiKey.keyHash`

Most API routes run `authMiddleware` then check `CampaignMembership` for authorization. Writes usually require `role in ['GM', 'CO_GM']`. See the `getGMMembership` helper pattern repeated across `apps/api/src/routes/`.

## Critical gotchas

### Next.js 16 is not the Next.js in your training data

`apps/web/AGENTS.md` says it plainly: APIs, conventions, and file structure may differ. Before writing Next-specific code (route handlers, server actions, caching, params, metadata), read the relevant file in `apps/web/node_modules/next/dist/docs/` and heed any deprecation notices you encounter. Don't pattern-match from memory.

### Local port mismatch

The API defaults to port **3001** (`PORT ?? 3001` in `apps/api/src/index.ts`). The web app's rewrite destinations and Better Auth URL default to **3005** (`API_INTERNAL_URL ?? 'http://localhost:3005'`). Running both with defaults means every API call fails.

Fix locally by either:

- `PORT=3005 pnpm --filter @grimoire/api dev`, or
- Set `API_INTERNAL_URL=http://localhost:3001` in an `apps/web/.env`

### Turbopack dev server caches the Prisma client

After a schema change + `db:reset`, the `apps/web` dev server may keep serving a stale Prisma client and crash with "Unknown field X for include statement on model Y." Restart `pnpm dev` (or just the web filter) to clear it. The API side rebuilds correctly because Turbo triggers a real Prisma regen there.

### Don't override Railway's startCommand on the API

`apps/api/railway.json` pins `startCommand: "sh entrypoint.sh"` for a reason: `entrypoint.sh` runs `prisma migrate deploy` before `exec node dist/index.js`. If someone sets a `startCommand` in the Railway dashboard, it overrides `railway.json` and migrations stop running — which has caused production outages. Keep migrations wired to deploy startup.

### `GameSession` (Prisma model) ≠ `Session` (Better Auth)

The game-session Prisma model is named `GameSession` but maps to the `Session` table via `@@map("Session")`. Better Auth has its own `Session` model that maps to the lowercase `session` table. Don't try to rename either — the collision is intentional at the model level to avoid a table-name clash.

## Conventions worth knowing

- **Soft deletes** — entities use `deletedAt: DateTime?`. All queries filter `deletedAt: null`. Don't hard-delete.
- **No backwards-compat shims** — if you remove code, remove it. Don't leave commented-out versions or `_deprecated` re-exports.
- **No tests yet** — don't invent a test runner to validate changes. Run `pnpm check-types` and `pnpm build` to verify nothing broke.
- **Server Components read Prisma directly** — don't proxy page-load data through `/api/v1`. Reserve the API for client-initiated mutations and cross-app endpoints.
- **Every new entity route checks campaign membership** — follow the `getGMMembership` pattern in `apps/api/src/routes/reveals.ts` or `npcs.ts`.

## Commit style

Short, present-tense subject lines. Examples from recent history:

```
fix: UX audit fixes — PC color, invite button, preview dropdown, reveal panel
docs: fill in schema.md with full data model explanation
feat: player portal with invite system and entity reveals
```

Scope the subject to ≤70 chars. Use the body for rationale when the "what" isn't obvious from the diff.

## End-of-session output

At the end of every working session — or when the user signals they're done —
output a structured summary in this exact format so the user can update their
Claude project documents:

---

## Session summary

**Date:** [today's date]
**Commits:** [commit hashes and one-line descriptions]
**What shipped:** [bullet list of completed features/fixes]
**Decisions made:** [any architectural or product decisions]
**Backlog changes:** [items added, removed, or reprioritized]
**Open questions:** [anything unresolved that needs a decision next session]
**Suggested project doc updates:** [specific changes to paste into Current State and Backlog docs]
---

## What Grimoire is not

Don't suggest or implement: character sheet mechanics (HP, stats, inventory),
battle maps, virtual tabletop features, or generic note-taking unrelated to
campaigns. Read VISION.md if you're unsure whether something belongs.
