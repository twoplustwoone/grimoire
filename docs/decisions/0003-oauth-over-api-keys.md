# ADR-0003: OAuth 2.1 over API keys for the MCP connector

**Status:** Accepted
**Date:** 2026-04-18
**Related:** [ADR-0002: HTTP MCP server over local stdio](./0002-http-mcp-over-stdio.md)

## Context

After moving the MCP server to HTTP (see ADR-0002), we needed an authentication model. The first implementation was API keys: users generate a key in Settings, copy it once at creation time, and paste it as a Bearer token into their MCP client's configuration.

This worked technically. It did not work as a user experience.

Claude Desktop's "Add custom connector" dialog has exactly three fields: **Name**, **Remote MCP server URL**, and optional **OAuth Client ID / OAuth Client Secret**. There is no field for a custom `Authorization` header. The API key approach required users to edit `claude_desktop_config.json` manually — which is exactly the friction we were trying to eliminate in ADR-0002.

The available workarounds all had serious downsides:

- Pass the API key as a URL query parameter (`/mcp?key=...`). Leaks into logs, browser history, referer headers.
- Use `mcp-remote` as a local bridge. Reintroduces a local install requirement.
- Tell users to manually edit the config file. Defeats the purpose.

The real answer was already in Claude Desktop's UI: those OAuth fields exist because the custom connector flow is designed for OAuth servers. The MCP specification explicitly endorses OAuth 2.1 for authorization.

## Decision

The MCP server is an OAuth 2.1 authorization server with PKCE and Dynamic Client Registration. Claude Desktop connects via:

1. **Discovery.** `GET /.well-known/oauth-authorization-server` returns authorization server metadata (endpoints, supported grants, scopes).
2. **Registration.** Claude Desktop POSTs to `/oauth/register` to dynamically register itself as a public client with its redirect URIs. This returns a `client_id`.
3. **Authorization.** Claude Desktop opens a browser to `/oauth/authorize?client_id=...&code_challenge=...&response_type=code&redirect_uri=...` — a page on the Grimoire web app that shows a consent screen to the signed-in user.
4. **Token exchange.** Claude Desktop POSTs the authorization code plus the PKCE verifier to `/oauth/token` and receives an access token and refresh token.
5. **Authenticated calls.** All `/mcp` requests include the access token as a Bearer header. Refresh tokens rotate on use.

Access tokens are short-lived (1 hour). Refresh tokens are long-lived (30 days) and rotated. The user never sees any of this — they just click "Add custom connector," paste a URL, click Allow on the consent screen, and it works.

API keys are retained for CLI and scripting use. They're independent of OAuth. The MCP handler tries OAuth tokens first, then falls back to API keys.

## Consequences

**Positive:**

- Adding Grimoire to Claude Desktop is three clicks and a browser redirect. No config file editing, no key copying, no Node version mismatches.
- Dynamic Client Registration means Grimoire works with any MCP-compliant OAuth client without pre-registering them.
- Tokens are per-authorization, scoped to a user's account. Revoking access is a single database row delete.
- Refresh token rotation provides defense against token theft.
- The OAuth flow is the standard for MCP — future clients will expect it.

**Negative:**

- Significant implementation surface: authorization server metadata, dynamic client registration, authorization endpoint with consent UI, token endpoint with PKCE verification, token rotation, metadata endpoints, and the MCP handler must understand OAuth tokens.
- The consent screen lives on the web app (because it needs the user's Better Auth session to know who's authorizing), while the token endpoints live on the API (because they're machine-to-machine). This split required careful Next.js rewrite configuration.
- OAuth is historically footgun-rich. We implemented it directly rather than using a library because the MCP SDK's OAuth helpers didn't quite fit our needs (we wanted Better Auth session integration for the consent screen). This requires care on any future changes.

**Neutral:**

- The OAuth 2.1 spec is well-documented. PKCE with S256 is simple and battle-tested.

## Alternatives considered

**API keys only, with documentation explaining how to edit the config file.** Rejected. The target user is a non-developer friend running a D&D campaign. Asking them to edit JSON with absolute paths is a failure state.

**API key as URL query parameter.** Rejected for the security reasons described above. Bearer tokens in URLs appear in server logs, browser history, and referer headers. Not acceptable for a token that grants full account access.

**Use Anthropic's managed connector directory.** Would provide the cleanest UX (one-click install from a curated list). Rejected for now because it requires submission and approval; Grimoire isn't ready for that scale. Worth revisiting once the product is more mature.

**Delegate to an external OAuth provider (Auth0, Clerk, etc.).** Rejected because Grimoire already has user accounts via Better Auth. Adding a second auth system would be more complexity, not less, and would couple the project to a paid third-party service for what is essentially an internal OAuth authorization server.
