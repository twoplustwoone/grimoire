# Architecture

This document describes how Grimoire is put together — the monorepo layout, how the pieces fit, the reasoning behind the major choices. It's written for someone (possibly future-you) who needs to orient themselves in the codebase quickly.

For *what* Grimoire is, see [VISION.md](../VISION.md). This doc is about *how*.

---

## Shape at a glance

Grimoire is a TypeScript monorepo managed by pnpm workspaces and Turborepo. It has two deployed applications and several shared packages.

```
grimoire/
├── apps/
│   ├── web/          Next.js 16 frontend (App Router, Turbopack)
│   └── api/          Hono API server + MCP server (Node 22)
│   └── mcp/          Legacy stdio MCP package (deprecated)
├── packages/
│   ├── db/           Prisma schema + client + migrations + seed
│   ├── ai/           AI helpers (Anthropic recap generation)
│   ├── types/        Shared TypeScript types
│   ├── realtime/     Realtime scaffolding (not yet wired)
│   ├── config/       Shared config
│   ├── eslint-config/        Shared ESLint flat configs
│   └── typescript-config/    Shared tsconfig bases
├── docker-compose.yml        Local Postgres
└── turbo.json                Turbo pipeline config
```

The deployed surface is just two services: `web` (Next.js) and `api` (Hono). Postgres is managed infrastructure on Railway.

---

## Request flow

Understanding how requests move through the system is the fastest way to understand the architecture.

**A user loading a page:**

```
browser → Next.js (web) → React Server Component
                             ↓
                         fetches from Prisma directly
                         (server-side, same DB as API)
```

The web app has its own Prisma client and reads directly from the database for server-side rendering. It does not round-trip through the API for server components.

**A user submitting a form (e.g. creating an NPC):**

```
browser → Next.js (web) /api/v1/campaigns/:id/npcs
                             ↓
                     rewrites to API /campaigns/:id/npcs
                             ↓
                         Hono route handler
                             ↓
                         Prisma → Postgres
```

The `/api/v1` prefix is stripped by the Next.js rewrite before reaching the API. This keeps the public URL space consistent (`/api/v1/*` everywhere on the client) while keeping the API's internal routes clean (no version prefix clutter).

**Claude Desktop querying campaign data via MCP:**

```
Claude Desktop → POST /mcp (Bearer: OAuth access token)
                     ↓
             rewrites to API /mcp
                     ↓
         MCP handler validates OAuth token
                     ↓
         creates per-request McpServer with userId closure
                     ↓
         Prisma → Postgres
                     ↓
             returns MCP-formatted response
```

**Better Auth session flow:**

```
browser → /api/auth/* → rewrites to API /api/auth/*
                             ↓
                     Better Auth handler (Hono)
                             ↓
                     manages session cookies scoped to WEB_URL
```

Both web and API read from the same Postgres. Both understand Better Auth sessions. The division of labor is roughly: web does the presentation layer and handles server-side reads; API handles writes, MCP, OAuth, AI calls, and anything that benefits from being a single stable endpoint.

---

## Why Next.js + Hono (and not just one)

The question of "why two apps instead of one Next.js app with API routes" is worth addressing.

Next.js API routes work fine for simple cases. For Grimoire they didn't fit well because:

1. **The MCP server needs to live somewhere that's not a Next.js API route.** MCP uses streamable HTTP transport with specific request/response handling — Hono's raw Node request/response access makes this easier than wrestling with Next's Edge-first abstractions.
2. **OAuth endpoints benefit from a dedicated server.** The token endpoint, dynamic client registration, and metadata endpoints are things the MCP spec expects at stable paths. Having them on a dedicated API service keeps the contract predictable.
3. **Better Auth's server-side API is a library that can be mounted on any framework.** It doesn't care whether it's Next or Hono. We mount it on Hono so the web app stays a pure frontend concern.
4. **Recap generation can take tens of seconds.** Long-running work is easier to reason about on a dedicated API process than on Next.js serverless invocations.

The cost is a small amount of duplication (both apps import `@grimoire/db`, both need Better Auth config). The benefit is that the API has its own deployment lifecycle, its own runtime, and doesn't care about frontend concerns.

---

## The `apps/web` app

**Framework:** Next.js 16 with the App Router, running on Node (standalone output).

**Rendering strategy:** Mostly server components. Client components are reserved for anything interactive — the relationship graph, Tiptap editors, the command palette, the reveal panel, the API key manager. Server components read from Prisma directly for initial page loads.

**Key routes:**

- `/` — landing, redirects based on auth state
- `/sign-in`, `/sign-up` — auth pages
- `/campaigns/:id/*` — the main app, one section per entity type
- `/portal/:campaignId` — player portal (what a player's character knows)
- `/invite/:token` — public invite acceptance page
- `/oauth/authorize` — OAuth consent screen (rendered here, not on the API)
- `/settings` — account + API keys + MCP setup instructions

**Proxying (in `next.config.ts`):**

| Public path | Rewrites to |
|---|---|
| `/api/auth/*` | API `/api/auth/*` |
| `/api/v1/*` | API `/*` (v1 prefix stripped) |
| `/mcp`, `/mcp/*` | API `/mcp` |
| `/.well-known/oauth-authorization-server` | API |
| `/.well-known/oauth-protected-resource` | API |
| `/oauth/register`, `/oauth/token` | API |

`/oauth/authorize` is deliberately NOT rewritten — it's a Next.js page because the consent screen uses the Better Auth session to know who's authorizing, and that session lives in the web domain.

---

## The `apps/api` app

**Framework:** Hono on Node 22. Single process, stateless, talks to Postgres.

**What it serves:**

- `/api/auth/*` — Better Auth (email/password, sessions)
- `/health` — liveness probe for Railway
- `/campaigns` and all nested entity routes — CRUD for every entity type
- `/campaigns/:id/sessions` — sessions + recap generation
- `/campaigns/:id/invites`, `/invites/:token`, `/invites/:token/accept` — invite lifecycle
- `/campaigns/:id/reveals` — per-player entity visibility + display overrides
- `/campaigns/:id/information-nodes` — promoted facts with visibility
- `/search`, `/graph` — cross-entity queries for the command palette and relationship graph
- `/api-keys` — API key management for MCP
- `/.well-known/oauth-*` + `/oauth/register` + `/oauth/token` — OAuth 2.1 authorization server
- `/mcp` and `/mcp/*` — the MCP server endpoint

**Auth:**

- Web requests use Better Auth session cookies.
- MCP requests use OAuth 2.1 access tokens (or legacy API keys for backwards compatibility).
- Most routes go through an `authMiddleware` that reads the session and attaches a `user` to the Hono context.

**Demo campaign hook:** Better Auth's `databaseHooks.user.create.after` calls `createDemoCampaign(prisma, user.id)` for every new user. If it fails, the error is logged but does not block sign-up. This is how every new account lands in *The Shattered Conclave* on first login.

---

## The MCP server

The MCP server lives inside the API process (`apps/api/src/mcp/`). It is not a separate deployment.

**Architecture:**

- **Transport:** Streamable HTTP (stateless mode — `sessionIdGenerator: undefined`). A fresh `McpServer` instance is created per request. The user ID is captured in a closure over the tool handlers, so there's no cross-request leakage.
- **Auth:** Bearer tokens on every request. The handler first tries to resolve the token as an OAuth access token, then falls back to API keys. Unauthenticated requests get `401` with a `WWW-Authenticate` header pointing to the OAuth metadata so clients like Claude Desktop can discover the auth server automatically.
- **OAuth:** Full OAuth 2.1 with PKCE. Dynamic client registration lets Claude Desktop add Grimoire as a custom connector with just a URL — the client registers itself, redirects the user to the consent screen, exchanges an authorization code for tokens, and starts making requests. No API keys to copy, no config files to edit.

**Tools exposed:** `list_campaigns`, `get_campaign_summary`, `list_npcs`, `get_npc`, `list_open_threads`, `list_sessions`, `get_session_recap`, `search_entities`, `list_player_characters`, `get_player_knowledge`.

All tools are read-only. Grimoire deliberately does not let MCP clients modify data — the tool should answer questions, not run the campaign.

**Legacy stdio MCP:** an `apps/mcp/` package previously shipped a stdio-transport MCP server. It was removed (see ADR-0002 and git history) — the HTTP+OAuth approach supersedes it and works for anyone with no local setup.

---

## The `packages/db` package

Prisma 7 with the Prisma-managed pg adapter. Exports `prisma` (the client) and `./demo-campaign` (the seed function for demo campaigns).

**Migration philosophy:** Every schema change creates a migration file committed to the repo. Production runs `prisma migrate deploy` on every deploy via the API's `entrypoint.sh` (see [deployment.md](./deployment.md)).

**Seed:** Running `pnpm --filter @grimoire/db exec prisma db seed` creates:

- A GM user (`gm@grimoire.dev`)
- A Dragon Heist campaign with NPCs, locations, factions, threads, clues
- Three player users (Serafine, Rook, Maren) added to Dragon Heist
- The demo campaign (*The Shattered Conclave*) via `createDemoCampaign`

The seed is idempotent — running it multiple times upserts rather than duplicating.

**Why a separate package instead of inlining Prisma in each app:** both apps need the same client and the same generated types. Having one shared package means one `prisma generate` step, one schema file, one migration history.

---

## Data model highlights

The full schema is documented in [schema.md](./schema.md). Worth calling out here:

**Polymorphic entity pattern.** Many cross-cutting concerns (notes, reveals, relationships, information nodes, changelog entries) are keyed by `entityType` + `entityId` rather than having a separate table per entity. This means when we added `PlayerCharacter`, notes/reveals/mentions/graph all worked without any schema changes — the polymorphic systems just learned a new `entityType` value.

**Reveal system.** Every entity can be revealed to specific players with optional display overrides. This is how information asymmetry works — a GM can reveal an NPC to one player as "the grey-cloaked figure" and to another player by their real name. The player portal renders each entity through this reveal lens.

**Soft deletes.** All primary entities have `deletedAt`. Deletion is non-destructive; restoration is trivial.

**Changelog over event sourcing.** Entity changes are recorded in a structured changelog table (polymorphic, keyed by `entityType + entityId`). This gives AI recap generation richer context than event sourcing would, and it's cheaper to query.

---

## Authentication and authorization

Three separate auth surfaces:

1. **Web session auth (Better Auth).** Email/password with scrypt hashing. Cookie-based sessions. Same session works on both web and API because the API mounts Better Auth's Hono handler at `/api/auth/*`.

2. **OAuth 2.1 for MCP.** Full authorization code flow with PKCE. Dynamic client registration means clients like Claude Desktop can register themselves without manual work. Access tokens last 1 hour, refresh tokens last 30 days with rotation on use.

3. **API keys (legacy, still supported).** Users can generate long-lived API keys in `/settings` for CLI and scripting use. Keys are hashed with SHA-256 at rest; the full key is shown only once at creation.

Authorization rules live in route handlers. Most routes check a `CampaignMembership` exists for the user in the campaign. Write routes check `role: { in: ['GM', 'CO_GM'] }`. The reveal system layers on top of this for player-scoped views.

---

## Deployment

Both services deploy to Railway. Postgres is a Railway-managed service.

- **API** uses a single-stage Dockerfile, runs migrations via `entrypoint.sh` before starting, and serves on port 3001 (mapped to whatever Railway assigns).
- **Web** uses a two-stage Dockerfile producing Next.js standalone output. Build-time args include `DATABASE_URL`, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `API_INTERNAL_URL` — Railway injects these at build time.
- **Custom domain:** `grimoire.twoplustwoone.dev` points at the web service.

Full deployment details live in [deployment.md](./deployment.md).

---

## Environment variables

| Variable | Used by | Purpose |
|---|---|---|
| `DATABASE_URL` | db, api, web | Postgres connection string |
| `WEB_URL` | api | CORS origin, Better Auth trusted origin, OAuth issuer, invite URL base |
| `BETTER_AUTH_URL` | api, web | Better Auth baseURL |
| `BETTER_AUTH_SECRET` | web (build-time), api (runtime) | Session signing secret |
| `API_INTERNAL_URL` | web | Server-side rewrite target |
| `NEXT_PUBLIC_APP_URL` | web | Client-side base URL fallback |
| `ANTHROPIC_API_KEY` | api | Claude recap generation |
| `PORT` | api | Port the API listens on |
| `NODE_ENV` | all | Development vs production mode |

**Local dev gotcha:** The API's default port is 3001, but the web app's rewrites default to `http://localhost:3005`. To run both locally without setting env vars, start the API with `PORT=3005`. Or set `API_INTERNAL_URL` to match the port the API is actually on. This inconsistency is known and documented.

---

## Adding things

**Adding a new entity type:**

1. Add the model to `packages/db/prisma/schema.prisma`
2. Add the value to the `EntityType` enum
3. Create `apps/api/src/routes/<entity>.ts` following the pattern of an existing route
4. Mount it in `apps/api/src/index.ts`
5. Create `apps/web/app/(app)/campaigns/[id]/<entity>/*` pages
6. Add the sidebar nav entry
7. Add the entity to graph coloring, mention rendering, search results

Because notes, reveals, relationships, and information nodes are polymorphic, they'll work automatically once the `EntityType` value exists. You do not need to create parallel tables.

**Adding a new MCP tool:**

1. Add a tool handler in `apps/api/src/mcp/server.ts`
2. Make sure it enforces campaign membership before returning data
3. Return structured JSON in the tool response text

**Adding a new API route:**

1. Decide whether it's scoped to a campaign (most are) or global
2. Use `authMiddleware` to require a session
3. Check campaign membership if scoped
4. Keep the route handler small — push logic into helpers in `apps/api/src/lib/` when it grows

---

## What's deliberately not here

- **No event queue.** All work is synchronous. AI recap generation blocks the request. If Grimoire ever needs background jobs, a queue goes in; until then, simplicity wins.
- **No service mesh.** Two services is not complicated enough to need one.
- **No microservices.** The API is intentionally a monolith. There's no business reason to split it.
- **No CQRS, no DDD ceremony.** Prisma models are the domain. Route handlers are the application layer. There is no read/write split. This keeps the codebase small enough for one person to hold in their head.

These are all choices made in the direction of "simplest thing that works." When any of them stops being true, the architecture will change.

---

## Changing this doc

This doc should be updated when architecture decisions change, not when code changes. Adding a new route doesn't belong here — adding a new service does. Changing how MCP tools are authenticated doesn't belong here — moving MCP to a separate deployment does.

The companion doc [docs/decisions/](./decisions/) records individual decisions (ADRs). When a decision is made that changes the shape described here, write the ADR and then update this doc to reflect the new reality.
