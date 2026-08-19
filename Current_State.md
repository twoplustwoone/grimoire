# Grimoire — Current State

*Last updated: April 25, 2026*

This document is the living context for Grimoire. Update it at the end of each coding session based on the structured summary Code outputs. It should reflect the current truth of what’s shipped, what’s in progress, and what’s broken or incomplete.

For the product philosophy and roadmap, see `VISION.md`. For the journals pause, see `Journals_On_Ice.md`. For the active focus and broader backlog, see `Backlog.md`.

-----

## Status

**Current focus:** GM-side experience. The active work is the meet-parity sprint and Session Prep Dashboard, both tracked in `Backlog.md`.

**Journals are paused.** This document reflects the post-pause target state. The code surgery to remove journal-specific UI and routes is queued as a follow-up Code session — see `Journals_On_Ice.md` for the full manifest. Until that session ships, the running app still has all journal surfaces; this doc deliberately describes what the app *will* be once focus is restored, so future-chat context loads cleanly.

-----

## Live deployment

- **URL:** https://grimoire.twoplustwoone.dev
- **Host:** Railway (grimoire-api + grimoire-ui + Postgres)
- **Status:** Stable. Custom domain live. Auto-migrations running on every API deploy via `entrypoint.sh`.
- **Health check:** `GET /api/health`
- **Launch status:** Pre-launch. No real users yet. Schema and architecture changes are cheap; DB can be nuked and reseeded at any time.

-----

## What’s shipped and working

**Core loop (end-to-end functional):**

- User signs up → lands in the demo campaign (*The Shattered Conclave*) automatically
- Demo campaign ships with two seeded fictional players (Serafine Ashveil + Kael Vireth) with linked PlayerCharacters and distinct reveal sets, demonstrating information asymmetry out of the box
- GM creates a campaign with NPCs, locations, factions, threads, clues, player characters
- GM invites players by email with shareable invite links; invite management lives at `/campaigns/:id/settings`
- Players accept invites, land in their own portal view
- GM reveals entities to players with optional aliases (per-player display overrides)
- Players see only what’s been revealed to them; their own PCs fully; other PCs through reveals
- GM runs a session, takes notes, tags entities, generates an AI recap
- GM uses the relationship graph to see campaign topology
- GM connects Claude Desktop via OAuth and queries and edits the campaign conversationally
- GM can remove a player from a campaign; their PlayerCharacters are automatically retired in the same transaction
- GM can archive a campaign; archived campaigns are hidden from the list by default with a “Show archived” toggle

**Campaign features:**

- Full CRUD on all entity types: NPCs, PlayerCharacters, locations, factions, threads, clues, world events, sessions
- Structured notes on every entity with Tiptap rich text editing (Tiptap JSON / ProseMirror)
- `@[Name](type:id)` mentions that render as colored chips and link to entity pages
- Information nodes with three visibility tiers (GM only / all players / specific players)
- Per-player entity reveals with display name and description overrides
- Sessions with live note-taking, entity tagging, and AI recap generation via Claude
- World events timeline
- Relationship graph with force-directed layout (`@xyflow/react` + d3-force), node hover highlighting, filter pills, minimap; gated on mobile with an honest “open on a larger screen” message below `md`
- Command palette (⌘K) for cross-entity search
- Player portal at `/portal/:campaignId` with prominent “Your Character” section and “Party” section
- “View as player” preview mode for GMs
- Invite system with email-based tokens, expiry, revocation; managed at `/campaigns/:id/settings`
- Campaign-scoped navigation in desktop sidebar and mobile drawer
- Campaign archive via danger zone on `/campaigns/:id/settings`
- Three themes: Grimoire (default), Minimal, Fey; theme switcher on Account (`/settings`)

**Navigation feedback:**

- Generic `(app)/loading.tsx` skeleton covers all authenticated routes during transition
- Graph-specific `loading.tsx` for the campaign graph route
- Sidebar nav items show a pending spinner after 100ms delay (avoids flash on prefetched instant navigations)
- Primary card surfaces (campaigns list, entity index pages) dim on click via `PendingLink` wrapper
- Implementation uses Next.js 16’s `useLinkStatus` hook
- Breadcrumbs present on entity detail pages

**MCP and API:**

- MCP server (HTTP transport) with OAuth 2.1 + PKCE + dynamic client registration
- API keys for CLI/scripting use (SHA-256 hashed)
- MCP tools: `list_campaigns`, `get_campaign_summary`, `list_npcs`, `get_npc`, `list_open_threads`, `list_sessions`, `get_session_recap`, `search_entities`, `list_player_characters`, `get_player_knowledge`, `update_note`, `update_status`, `update_description`, `reveal_entity`
- All write tools use shared `auth.ts` helpers (`requireGM` / `requireMember`), `errors.ts` (`validateInput` / `mcpValidationError`), throw `McpError` per ADR-0006

**UI primitives and conventions:**

- `Button` primitive has `cursor-pointer` + `disabled:cursor-not-allowed` baked in
- All card list surfaces have `hover:bg-foreground/5` + `transition-all` + `cursor-pointer`
- `EditableField` wraps inline-rename with hover-bg + pencil-on-group-hover + baseline-aligned save/cancel
- Sheet/Dialog close buttons pointer-cursor fix applied at primitive level
- Icon margin sweep: ~37 sites cleaned of redundant `mr-*` / `ml-*` on icons inside `<Button>`; spacing comes from Button’s `gap-*` per size variant

**Toolchain:**

- `pnpm check-types` type-checks the full monorepo
- `pnpm lint` clean across the web package
- `pnpm build` green across both apps
- `pnpm install` triggers `prisma generate` automatically via `postinstall` in `packages/db`
- Local `pnpm dev` works with no env overrides — API defaults to port 3005, web rewrites target 3005
- Database migrations follow the data-preserving + idempotent policy (ADR-0007)

-----

## What’s paused

Journals (J1–J8 + discovery) shipped between April 21 and April 24, then paused on April 25 to focus on the GM-side experience. The schema is preserved; UI and journal-specific routes are scheduled for removal in a follow-up Code session. See `Journals_On_Ice.md` for full scope, rationale, and conditions for unpause. Until that session ships, journal surfaces remain reachable in the running app but should be considered out-of-scope for any new work.

-----

## Documentation

- `README.md` — first contact / local setup
- `VISION.md` — philosophy, target audience, roadmap
- `Journals_On_Ice.md` — pause decision and code-surgery manifest
- `Backlog.md` — active focus, full backlog, and design notes for upcoming features
- `docs/architecture.md` — monorepo layout, request flow, how to add entity types
- `docs/schema.md` — full data model with rationale
- `docs/deployment.md` — Railway setup, migration pipeline, known gotchas
- `docs/journals.md` — Journals design spec (preserved as record; do not extend while paused)
- `docs/decisions/` — seven ADRs (ADR-0007: data-preserving + idempotent database migration policy)
- `CLAUDE.md` — agent instructions, end-of-session summary format, migration policy, known gotchas

-----

## Known limitations and rough edges

- **`Campaign.settings` (Json?) is dead code.** Seeded but never read or written. Cleanup candidate.
- **`GameSession.number` column is dead to the UI.** Sessions display by title only. Column retained in DB for data preservation.
- **`EntityReveal` global-reveal has the Postgres NULL-in-unique-constraint caveat.** Mitigated via `findFirst` + create pattern. Could be unified via `NULLS NOT DISTINCT` migration if it ever becomes a real concern.
- **No unarchive UI.** Archive ships; unarchive is a follow-up (PATCH `status: 'ACTIVE'` from settings page).
- **Campaign transfer ownership not built.** The danger zone currently has archive only.
- **Co-GM role not fully scoped.** `MemberRole.CO_GM` exists in schema but has no distinct UI treatment. Auth helpers treat GM and CO_GM identically.
- **No background jobs.** AI recap generation blocks the request.
- **Turbopack dev server caches Prisma client.** After schema changes, `apps/web` dev may serve a stale client. Restart fixes it.
- **Transforming a bulletList into a blockquote silently no-ops.** Tiptap’s `toggleBlockquote` doesn’t know how to wrap list contents. Known limitation; users can unlist-then-quote.
- **Polymorphic `ownerType`/`ownerId` columns and journal-related tables remain in schema.** Preserved per the Option B journals pause; harmless but unused on GM-side workflows.

-----

## Stack reference

- **Monorepo:** Turborepo + pnpm workspaces (2 apps, multiple packages)
- **Web:** Next.js 16 (App Router, Turbopack, standalone output), Tailwind v4, shadcn/ui, Tiptap v3 (StarterKit + Underline + Placeholder + Mention), `@xyflow/react` + d3-force for graphs
- **API:** Hono on Node 22
- **DB:** PostgreSQL + Prisma 7 (via `@grimoire/db` package, self-referencing via `@grimoire/db/prosemirror` for ProseMirror helpers)
- **Auth:** Better Auth (sessions) + custom OAuth 2.1 server (MCP)
- **AI:** Vercel AI SDK + Anthropic Claude
- **MCP:** `@modelcontextprotocol/sdk` HTTP transport (embedded in `apps/api`)
- **Hosting:** Railway

-----

## Shared UI primitives

Key components worth knowing about before adding new pages or entity types:

- **`PageHeaderAction`** (`components/layout/page-header-action.tsx`) — wrapper around `Button` / `Link` for page-header CTAs and empty-state CTAs. Handles responsive sizing (44px mobile, 32px desktop) and full-width stacking below `sm`.
- **`ChangelogList`** (`components/entities/changelog-list.tsx`) — shared changelog renderer used on all entity detail pages.
- **`EditableField`** (`components/entities/editable-field.tsx`) — inline-rename wrapper with hover-bg, pencil-on-group-hover, baseline-aligned save/cancel.
- **`EntityTypePicker`** (`components/mentions/entity-type-picker.tsx`) — 5-option picker used by the `@`-noun-promotion flow. The active meet-parity work will extend its usage from captures to all Tiptap surfaces (session notes, entity notes).
- **`NavPendingIndicator` / `PendingLink`** (`components/navigation/*`) — navigation feedback primitives using Next.js 16 `useLinkStatus`.
- **`MentionRenderer`** (`components/mentions/mention-renderer.tsx`) — renders ProseMirror docs with clickable mention chips. `campaignId` scopes chips to campaign routes.
- **`lib/entity-display.ts`** — single source of truth for entity colors (`ENTITY_CHIP_CLASSES`, `ENTITY_GRAPH_NODE_THEME`), labels, icons (`ENTITY_ICON`), route paths, minimap colors.
- **`lib/navigation.ts`** — `topLevelNavigation` and `campaignNavigation` exports. `getCampaignIdFromPath` helper. Sidebar detects context and branches.
- **`lib/session-display.ts`** — `displaySessionTitle()` with `createdAt` fallback for null-title rows.
- **`lib/activity-feed.ts`** — changelog grouping utility used by the campaign dashboard.
- **MCP auth/error helpers** (`apps/api/src/mcp/auth.ts`, `errors.ts`) — `requireGM`, `requireMember`, `validateInput`. See ADR-0006.

-----

## How to update this document

At the end of each coding session, Code outputs a structured summary (format defined in `CLAUDE.md`). Paste the relevant bits into the appropriate sections here:

- **What’s shipped** → add bullets for new features
- **Known limitations** → add/remove as things are fixed or discovered
- **Update the “Last updated” date** at the top
- For anything that belongs to future work, move it to `Backlog.md` instead
- If a session changes the active focus or pauses something major, update the **Status** section at the top
