# ADR-0006: MCP tool error shape

**Status:** Accepted
**Date:** 2026-04-20

## Context

The first generation of MCP tools (read tools in `apps/api/src/mcp/server.ts`) handled auth and "not found" failures by returning a successful response with error-looking text:

```ts
if (!membership) return { content: [{ type: 'text', text: 'Access denied' }] }
```

This is valid JSON-RPC — it returns a 200 — but it sets no `isError` flag. MCP clients that distinguish tool failures from tool successes (Claude Desktop does; LLM callers may too) can't tell that something went wrong. To a client inspecting the response envelope, "Access denied" is indistinguishable from a tool deliberately returning the string "Access denied" as data.

When we added the first write tool (`update_note`) and the auth helpers in `apps/api/src/mcp/auth.ts`, we had to pick a convention for every future tool to follow.

## Decision

All MCP tool handlers throw `McpError(ErrorCode.InvalidParams, message)` (from `@modelcontextprotocol/sdk/types.js`) for every client-visible failure — auth, validation, not-found, cross-entity mismatch. The MCP SDK catches the throw and wraps the response as `{ content: [{ type: 'text', text: '...' }], isError: true }` at the JSON-RPC layer.

Plain `Error` throws and text-content-only error responses are wrong.

`requireMember` / `requireGM` in `auth.ts` and `validateInput` / `mcpValidationError` in `errors.ts` encapsulate this — handlers call them and never write the error-shape branch by hand.

## Consequences

**Positive:**
- Clients that check `isError` now get a correct signal. Claude Desktop shows tool failures as failures in the UI.
- Handlers shed their inline auth branches — every read tool used to hand-roll `prisma.campaignMembership.findFirst` + null-check; now it's one line.
- Error messages are centralized. Changing "Access denied" to something more specific is a single-file edit.

**Negative:**
- This is a client-visible shape change from the original tools. A client that parsed the `content[0].text` for the literal string "Access denied" would have broken on the refactor. We accepted this because no such client existed in production (Claude Desktop, the only MCP consumer, already handled `isError`).
- `ErrorCode.InvalidParams` is used for all failures — auth, not-found, validation — because the JSON-RPC error-code taxonomy doesn't really fit application errors. The human-readable message carries the real information.

## Alternatives considered

**Return `{ content: [...], isError: true }` manually from handlers.** The SDK exposes this shape directly. Rejected because it spreads the error-shape construction across every handler and every auth helper would need to return a result object the handler inspects. The throw-and-catch pattern keeps handlers linear.

**Use a custom error subclass per category (AuthError, NotFoundError, ValidationError) and map to MCP errors centrally.** Considered but deferred. With one write tool and a handful of read tools the single `McpError` is enough. Revisit if we need different HTTP-like semantics or different error codes per category.
