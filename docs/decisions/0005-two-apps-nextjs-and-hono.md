# ADR-0005: Two deployed apps (Next.js + Hono) instead of one

**Status:** Accepted
**Date:** 2026-04-16

## Context

The conventional choice for a TypeScript full-stack app today is a single Next.js app that serves both the frontend and the API (via App Router route handlers or API Routes). This has real advantages: one deployment, one codebase, one framework's conventions, shared types without needing a separate package.

Grimoire did not go this way. The backend lives in a separate Hono app (`apps/api`) that deploys independently from the Next.js frontend (`apps/web`). This document records why.

## Decision

Grimoire runs as two deployed services:

1. **`apps/web`** — Next.js 16 with the App Router. Serves pages, renders server components, handles client-side interactivity. Proxies API, MCP, OAuth, and auth traffic to the API service via Next.js rewrites.
2. **`apps/api`** — Hono on Node 22. Serves all mutation endpoints, the MCP server, OAuth endpoints, Better Auth routes, recap generation, search, and graph queries.

Both services connect to the same Postgres database. Both understand Better Auth sessions. Server components in `apps/web` read from Prisma directly — they do not round-trip to the API for server-side rendering.

The split is functional, not strictly layered. Neither service is "the backend" or "the frontend" in an absolute sense — the web app does server-side database reads, and the API serves some HTTP endpoints that could be considered frontend concerns (like the OAuth consent page's backing endpoints). The division is pragmatic: the work that benefits from being on a dedicated server runs on the API.

## Consequences

**Positive:**

- **MCP server has a proper home.** The MCP server needs raw Node `IncomingMessage` / `ServerResponse` handling (see ADR-0002). Hono's `@hono/node-server` adapter gives direct access to these. Next.js API routes abstract them away, which made the MCP SDK integration noticeably harder.
- **OAuth endpoints live at stable, predictable paths.** `/oauth/token`, `/oauth/register`, `/.well-known/oauth-authorization-server` — these are paths that MCP clients discover automatically. Keeping them on a dedicated API service means the contract is crisp and not entangled with Next.js routing conventions.
- **Long-running work doesn't block page rendering.** Recap generation can take 20+ seconds. On a dedicated API process this is fine. Mixed with Next.js serverless invocations it becomes a timeout management problem.
- **Independent deployment lifecycles.** The API can be redeployed without affecting the web app, and vice versa. Schema migrations run on API deploy via `entrypoint.sh` — keeping this logic out of the web app's build process avoids subtle coupling.
- **Better Auth mounts cleanly on Hono.** Better Auth's server-side API is a library that adapts to any framework. We mount it at `/api/auth/*` on the API. The web app proxies to it. This keeps the auth logic in one place.
- **Simpler mental model for what runs where.** If it writes to the database or talks to an external API, it's on the API. If it renders UI, it's on the web. One sentence disambiguates ~95% of "where does this code go?" questions.

**Negative:**

- **Some duplication.** Both apps import `@grimoire/db`. Both need environment variables configured. Both need Docker images built. The duplication is contained — most of it lives in deployment config, not application code.
- **Local dev requires both running.** `pnpm dev` starts both via Turbo, but a developer must understand that the web app proxies to the API and misconfiguration breaks silently. A port mismatch (API defaulted to 3001, web expected 3005) previously caught developers more than once; resolved by aligning both defaults to 3005.
- **Two sets of health checks, two sets of logs, two sets of error monitoring.** Manageable, but worth acknowledging.
- **The rewrites in `next.config.ts` are a non-trivial piece of configuration.** They encode the routing contract between the two services. Changes require coordination.

**Neutral:**

- **No meaningful performance difference.** The web app's server components reading from Prisma directly is as fast as the API would be. The proxy overhead for writes is negligible.

## Alternatives considered

**Single Next.js app with API routes.** The default choice. Rejected primarily because of the MCP server's need for raw Node request/response access and the OAuth implementation's benefit from stable dedicated endpoints. For a project without those requirements, a single Next.js app would have been the right call.

**Next.js app with a separate Next.js API app.** Splits the app but keeps the framework consistent. Rejected because Next.js's strengths are frontend-oriented (server components, streaming, routing conventions). Using it for an API-only service would be fighting the framework. Hono is purpose-built for this use case and noticeably more ergonomic for pure HTTP work.

**Monolithic backend (Express, Fastify, etc.) with a static frontend.** Rejected because we wanted server components and the SSR benefits that Next.js provides for the UI. Going back to a SPA + REST API architecture would have been a significant regression in frontend capabilities.

**Split the API further (auth service, MCP service, core API).** Rejected as premature. The API is a modest monolith. When any of its responsibilities outgrows shared infrastructure, splitting is easy. Until then, one service is enough.
