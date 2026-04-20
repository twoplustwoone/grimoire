# ADR-0002: HTTP MCP server over local stdio

**Status:** Accepted
**Date:** 2026-04-18
**Supersedes:** the `apps/mcp` stdio-based package (now deprecated)

## Context

Grimoire exposes an MCP server so Claude (and other MCP clients) can query campaign data. The initial implementation was a local stdio-based MCP server in `apps/mcp`, following the most common MCP tutorial pattern at the time.

The stdio server required a user to:

1. Clone the grimoire repo
2. Install Node 22 and pnpm
3. Run a local Docker Postgres
4. Build the MCP package (`pnpm --filter @grimoire/mcp build`)
5. Manually edit `claude_desktop_config.json` with an absolute path to the built entry point
6. Set environment variables (DATABASE_URL, etc.) in the config JSON
7. Restart Claude Desktop

This worked for the author (a developer with the repo already set up). It did not work for the target audience — friends running their own campaigns who are not developers and do not want to manage a local Postgres instance to get Claude integration.

The local model also meant each user needed their own database. They couldn't query *their* Grimoire account; they could only query whatever local data they'd manually populated.

## Decision

The MCP server is now an HTTP endpoint served by the production API (`apps/api/src/mcp/`). It uses the `StreamableHTTPServerTransport` from the MCP SDK in stateless mode — a fresh `McpServer` instance is created per request, with the authenticated user ID captured in a closure over the tool handlers.

Claude Desktop connects via the standard MCP HTTP discovery flow:

- `GET /.well-known/oauth-authorization-server` for OAuth metadata
- `GET /.well-known/oauth-protected-resource` for resource metadata
- `POST /oauth/register` for dynamic client registration
- `GET /oauth/authorize` + `POST /oauth/token` for the OAuth flow
- `POST /mcp` with a Bearer access token for tool calls

The user adds Grimoire as a custom connector in Claude Desktop with just a URL. The OAuth flow handles the rest.

The old stdio package (`apps/mcp`) has been removed from the repository; see git history for its prior implementation.

## Consequences

**Positive:**

- No local installation required. Users add Grimoire via Claude Desktop → Settings → Connectors → Add custom connector, paste one URL, authorize in a browser.
- The MCP server queries the real production database, scoped to the authenticated user's campaigns via OAuth.
- One deployment serves all users. No per-user database setup.
- Works for any MCP-compliant client, not just Claude Desktop. Future support for ChatGPT and others is trivial — they connect to the same endpoint.
- The MCP server benefits from the API's deployment pipeline, logging, and monitoring.

**Negative:**

- Adds HTTP transport complexity (stateless per-request server instances, OAuth token validation middleware).
- Adds OAuth implementation burden (see ADR-0003).
- The API service now has MCP responsibilities alongside regular CRUD. If either grows significantly, splitting may become necessary.

**Neutral:**

- The MCP SDK's HTTP transport is mature enough that the complexity is manageable. The Node request/response bridge through Hono's `@hono/node-server` required understanding but not much code.

## Alternatives considered

**Keep stdio and provide better setup tooling.** Rejected. No amount of setup polish fixes the fundamental problem that non-developers won't install Node, Docker, and edit JSON config files for a side tool.

**Use the `mcp-remote` npm bridge.** The `mcp-remote` package is a stdio-to-HTTP proxy that Claude Desktop can spawn locally. It would let us have an HTTP server while keeping the Claude Desktop config simple. Rejected because it still requires `npx` on the user's machine and doesn't work for all users (Windows with restrictive npm policies, corporate environments, etc.). OAuth-native custom connectors are the right long-term path.

**Pass API keys as URL query parameters.** Would have worked with Claude Desktop's custom connector form without OAuth. Rejected because it bakes secrets into URLs that end up in logs, referer headers, and browser history. OAuth is the right solution.
