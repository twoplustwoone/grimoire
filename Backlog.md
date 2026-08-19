# Grimoire — Backlog

*Last updated: April 25, 2026*

This is the living backlog for Grimoire. Items here are candidates for future work, roughly prioritized.

For the long-term product vision, see `VISION.md`. For what’s currently shipped, see `Current_State.md`. For the journals pause, see `Journals_On_Ice.md`.

-----

## Active focus

**The GM-side experience.** Specifically: the meet-parity sprint below, then the Session Prep Dashboard.

Journals are paused. See `Journals_On_Ice.md` for scope and conditions for unpause. The Player experience returns only after a real GM user is using Grimoire weekly.

The single test for this phase: when a real user is done with a session, do they open Grimoire over their current tool because it’s better, not because they’re being polite?

-----

## Phase 1 — Meet-parity sprint (active)

Small items, each independently shippable. Target: Grimoire is no-worse-than-Notion (or whatever the GM’s current tool is) for the core prep and play loop. Most are schema plus light UI. These ship as small independent pieces, not as one mega-PR.

### Session to-dos with carry-forward

New `SessionTodo` model attached to `GameSession` with `title`, `done: bool`, and optional `relatedEntityType`/`relatedEntityId` (for linking a todo to a thread or NPC). Each session’s prep view shows open todos from the previous session as “carry forward” candidates — one click inherits them.

### Previous-session link

Add `previousSessionId` FK on `GameSession`. Auto-populated to the last session in the campaign on creation (overridable). Render as a small “⟵ Previous session” chip on the session header. Enables the carry-forward behavior above without any extra user step.

### In-world date field on session

Add a free-text `inWorldDate: string?` on `GameSession`. Display prominently at the top of the session page. Placeholder for the full in-world calendar roadmap item.

### Session prep template

User-editable default Tiptap document that new sessions start from, stored per-user or per-campaign (decide during spec). Default ships with “Context / Secrets / Beats / Notes” as H2s.

### Full-text search (⌘⇧F equivalent)

Postgres `tsvector` column on notes, captures, and entity descriptions. Dedicated search page (or a mode of the command palette) returning ranked results with snippets. Distinct from ⌘K’s entity-name search.

### Hierarchical locations

Add `parentLocationId` FK on `Location`. Breadcrumb rendering on the location page (“Waterdeep / North Ward / Yawning Portal”). Tree view on the locations index. Small graph update so parent-child edges render distinctly from association edges.

### Broken-link creates entity, everywhere

Audit every Tiptap editor surface — session notes, entity notes, captures. The `@`-noun-promotion flow currently works in captures; verify and extend to session notes and all entity notes. Single code path; the editor just needs the mention suggestion source wired consistently.

-----

## Phase 2 — Session Prep Dashboard (next)

The highest-leverage single feature after meet-parity. Lands on “new session” before the blank template, and revisitable anytime from the session page. Runs on existing schema; no new models.

**Data sources (all already in the schema):**

- Open threads (`status: OPEN`), sorted by last-touched
- NPCs tagged in the last N sessions (configurable; default 3)
- Carried-forward to-dos from previous session (once to-dos ship in Phase 1)
- Clues not linked to any thread
- Faction status changes since the last session (via changelog)
- Last session’s AI recap, rendered inline

**Interaction:**

- Each surfaced item has a “dismiss” and “pin into prep notes” action
- Pinning inserts a mention chip into the session notes at the cursor (or end)
- Dismissing hides the item for this session only

**Non-goals for V1:**

- ML ranking of which threads matter most — simple recency is fine
- Editable dashboard layout — ship one good default
- Cross-session analytics (“threads touched per session,” etc.)

This is the feature most likely to produce an “oh, this is actually better” moment. Design it carefully.

-----

## Near-term GM-side items

Small items independent of Phase 1/2 that can be picked up between major efforts or as palate cleansers. All scoped to GM-side surfaces.

### Missing functionality

- **Campaign membership removal UI.** The `DELETE /campaigns/:id/members/:userId` route exists but has no “Remove player” button. Add to the party section of the campaign dashboard or to `/campaigns/:id/settings`.
- **Unarchive flow.** Archive ships via the danger zone. Reverse path (PATCH `status: 'ACTIVE'`) is not exposed. Add to `/campaigns/:id/settings` or the archived campaign card.
- **Campaign transfer ownership.** Separate session from archive. Requires a new endpoint (e.g. `POST /campaigns/:id/members/:userId/promote`). UI: confirmation dialog gated on the target being CO_GM already.

### MCP write tools (foundation ready)

Foundation is in place (`auth.ts`, `errors.ts`, `tools/` modules, ADR-0006). These follow directly from the current pattern.

- **`create_entity`** — GM creates an NPC, location, faction, thread, or clue via Claude. Maps to existing POST routes.
- **`delete_entity`** — GM soft-deletes an entity via Claude. Sets `deletedAt`; emit `field='deleted'` changelog row.
- **`add_relationship` / `remove_relationship`** — write side of the relationship graph.
- **`tag_entity_to_session`** — wraps `SessionEntityTag`.

### UX polish flagged during use

- **Recent entities trail.** Deferred from the navigation feedback session. Evaluate after using the breadcrumb + pending feedback changes for a week — if back-navigation still feels bad, design a Recent list. Note: this idea evolved into the **Sheet Stack** described later in this document. The lightweight “recent list” version remains as a near-term option if the full Sheet Stack is too far out and the pain is real before then.
- **Toast library + error polish.** Wire up a toast lib (Sonner, React Hot Toast, or shadcn’s Sonner wrapper). Useful across many surfaces.
- **Icon-in-Button convention in CLAUDE.md.** Add a one-line rule: “Icon spacing in `<Button>` comes from the Button primitive’s `gap-*` per size variant. Do not add `mr-*` / `ml-*` on icons.” Prevents the drift the polish-pass sweep fixed.
- **FullBleedGraphLayout extraction.** The campaign graph page uses the `-m-6` hack to escape `main`’s `p-6`. Worth extracting if a second consumer materializes (the journal graph is gone post-surgery, so the second-consumer pressure is also gone for now).
- **Discard-changes dialog restyling.** User found it “a little weird” during walk-through but couldn’t articulate what. Revisit when someone flags something concrete.
- **Confluence-style mention display variants.** Let mentions render as inline text, short chip, or expanded card based on user choice.
- **List→blockquote custom command.** Tiptap’s default `toggleBlockquote` silently no-ops when inside a bullet/numbered list. Write a ~15-line custom command that unwraps the list and wraps in blockquote as a single transaction. Low priority — rare user action.
- **H2/H3/blockquote CSS drift.** Editor has no `@tailwindcss/typography` plugin; every node type needs explicit CSS in `globals.css`. Either install the plugin with one-time styling overrides, or document “when you add a Tiptap node type, add its CSS to globals.css.”
- **40+ other icon-in-button sites not swept.** The polish pass fixed ~37 sites but flagged that full sweep was out of scope. Opportunistic cleanup as adjacent surfaces are touched.

### Co-GM scoping

`MemberRole.CO_GM` exists in schema but has no distinct UI, no role-transition endpoint, no removal path. Before any auth-adjacent work touches it, a scoping conversation is needed: what can Co-GMs do that Players can’t? Can they be promoted to GM? Can they be removed? Current auth helpers treat GM and CO_GM identically.

### Known issues to clean up

- **`Campaign.settings` (Json?) dead code.** Seeded but never read. Candidate for removal.
- **`GameSession.number` dead column.** Retained per data-preservation policy; drop during a future schema-touch session if ever warranted.
- **`EntityReveal` NULL-in-unique caveat.** Uses `findFirst` + create workaround for global-scope rows. Fix via `NULLS NOT DISTINCT` migration if it ever becomes a real concurrent-write concern.
- **Web runtime silently tolerates missing env vars.** If `BETTER_AUTH_SECRET` is missing, the app boots with an empty string. Add startup validation.
- **API Docker image is single-stage.** Multi-stage build with `pnpm deploy` would shrink it.
- **No staging environment.** Deploys go straight to production. Fine for now.
- **No documented backup strategy.** Railway has snapshots; restore procedure undocumented.
- **`better-call` peer-dep warning on zod 4.** Pre-existing from Better Auth; resolves upstream eventually.
- **Demo player upsert race condition.** `createDemoCampaign` upserts demo player accounts on every new signup. Over time they accumulate memberships. `isSystemUser` flag or per-campaign membership filtering would mitigate.
- **Turbopack caches Prisma client.** Restart fixes it.
- **Dev server permission.** Multiple sessions in a row have run with `pnpm dev` denied, meaning Code cannot self-validate UI changes. Worth investigating whether this is a permission config that can be granted to reduce manual-walk burden.

-----

## Later — Sheet Stack + Run Mode

During-play features that benefit from being designed together. Best built after Phase 2 ships and there’s real-usage signal from a GM running actual sessions in Grimoire. Build the Sheet Stack first; Run Mode reuses most of it.

### Sheet Stack

A side rail (not the main view) showing recently-viewed and pinned entities as vertically stacked “sheets.” Only one fully rendered; others visible as slivers with title plus a type-colored edge. Click a sliver to bring it forward; the previously-forward sheet slides back. Physical-paper metaphor made literal — spatial memory during load (*“the city was three down”*) instead of reading tab labels.

**Design decisions already made:**

- **Both automatic and pinned**, visually distinguished. Pinned sheets have a pin icon and stay put. Recents fill remaining slots and evict LRU. Pinning is a prep move; recents handle during-play surprises.
- **Side rail, not main view.** Main navigation — back/forward, deep links, campaign dashboard, graph, settings — is untouched. The stack is a powerful secondary tool. Collapsing main nav into the stack creates more problems than it solves.
- **Stackable entities only.** NPCs, locations, factions, threads, clues, PCs, sessions. Not campaign dashboard, not graph, not settings. Whitelist rather than blacklist.
- **~7 visible slots** plus a “more” expansion. Past this, slivers become unreadable and the spatial-memory advantage dies.
- **Browser back vs. the stack.** Back is linear; stack is random-access across the last N. Subtle onboarding hint the first time the stack has multiple entries.
- **Mobile degrades to a flat recent-list.** Same pattern as gating the graph on desktop. Don’t fight the form factor.

**Risk to budget for:** this has to feel fast — 60fps transitions, no layout jank when a sheet comes forward. If it stutters, the paper metaphor dies instantly and it just feels like a weird sidebar. Budget animation polish time explicitly.

### Run Mode

Dedicated during-play UI mode. Reuses Sheet Stack at larger scale. Adds:

- Bigger text for across-the-table readability
- Keyboard shortcuts for common actions (pull NPC, start encounter, roll table)
- Pinned “in scene” bar for the 3–5 entities currently relevant
- Encounter timer
- Reveal toggle right on NPC pages (“show this to Player A”)

Design after Sheet Stack ships so the interaction patterns are grounded in real use.

-----

## Paused — returns when journals return

These items were specific to the journals system or to player-side workflows. They sit in cold storage until the unpause conditions in `Journals_On_Ice.md` are met. Do not work on them in the meantime.

- Cross-referencing campaign PCs from journal entries
- Move captures between sessions
- Sub-nav for journals vs. campaign consistency
- Popover sidebar on entity-chip click during capture editing
- `JournalShare` NULL-in-unique caveat
- ShareToggle error-polish (revert-only on API failure)
- Bubble menu in capture editor (was removed; if formatting needs it later, scoped to formatting only)
- `gm-journal-view` route legacy `sessionNumber` rename
- Side panel capture fetch (in-memory filtering on journal graph)
- Icon choice on ShareToggle
- `get_player_knowledge` MCP pagination

-----

## Roadmap

Larger features from `VISION.md`. Each is a multi-session undertaking. Order reflects post-Sheet-Stack-and-Run-Mode priority — these come later unless real-usage signal reorders them.

### Worldbuilding toolkit

Build a world independently of any specific campaign. Multiple campaigns drawn from the same world. World = shared resource (entities, locations, factions, calendar, random tables). Campaigns reference world entities.

### In-world calendar

Track dates in the campaign’s time system, not just real-world dates. Phase 1 ships a free-text `inWorldDate` field; this is the full system. Requires:

- Flexible calendar model (variable month/week/day lengths — Waterdeep’s 10-day tendays, homebrew)
- Named months, days, seasons
- Calendar view showing what happened when (sessions, world events, clues discovered)
- Links to sessions via existing `SessionInWorldDate` model
- Migration path from the free-text field to structured dates

Premium-tier candidate.

### Random tables

Create custom tables, roll from anywhere, reference during play. Campaign-scoped, reusable across sessions.

### Customizable workstation layouts

Three-panel default layout (References / Knowledge / Tools). Ship with good defaults (per-entity-type templates). Let the 10% who want customization build variants. Templates in code, user customizations fork from defaults.

Premium-tier feature. Single biggest product differentiator.

### File uploads

Maps, images, NPC portraits, handouts. Needs: upload endpoint, storage (R2/S3/similar), attachment model (polymorphic like notes), rendering in entity pages and workstation’s Reference panel. Premium tier for high-volume storage.

### Storybook export

End-of-campaign readable retrospective — arc, betrayals, moments, characters. Uses session recaps, world events, relationship graph, entity history.

The emotional heart of the VISION north star.

### Unstructured notes import

Reframed from “next major feature” to a roadmap item. Import is a precondition for getting a real user onto Grimoire, not the hook. Sequence: ships after Phase 2 (Session Prep Dashboard) but before Sheet Stack + Run Mode, and is scoped narrowly to a specific user’s actual content rather than as a general-purpose feature. Don’t generalize; don’t silently AI-structure; show proposed structure for review.

### More AI clients

ChatGPT and other MCP-compliant clients via the existing MCP server. Test and document.

### Plugins / extensions

Far future. Polymorphic entity pattern and architecture are designed to support it. Third parties add entity types, cross-cutting systems, or workstation widgets.

-----

## Completed recently

Kept briefly for context. Prune periodically.

- **Decision: pause journals (2026-04-25):** Documented in `Journals_On_Ice.md`. GM-side experience prioritized. Code surgery follow-up pending.
- **Active focus shift to GM-side (2026-04-25):** Meet-parity sprint, Session Prep Dashboard, and Sheet Stack + Run Mode added to this document as the active and near-future plan. Import demoted from “next major feature” to a sequenced roadmap item.
- **Navigation feedback pass (2026-04-24):** `(app)/loading.tsx` generic skeleton, graph-specific loading, `NavPendingIndicator` + `PendingLink` using Next.js 16 `useLinkStatus` (100ms delay), sidebar + primary card surfaces dim on click, breadcrumb audit fix.
- **Polish button-primitive and icon-margin sweep (2026-04-23):** Close-X pointer cursor on Sheet, icon margin sweep across ~37 sites — Button’s `gap-*` per size variant now owns icon-label spacing.
- **Polish pass 1 (2026-04-23):** Button primitive `cursor-pointer`, `hover:bg-foreground/5` on 10 card list surfaces, `EditableField` hover affordance, CTA and save/cancel alignment, Tiptap placeholder contrast fix.

*The journals work (J1–J8 + discovery, completed April 21–24) is preserved in `Journals_On_Ice.md` and `docs/journals.md` as a record of what was built and what was learned.*

-----

## How to update this document

At the end of each coding session, Code outputs a structured summary. Use it to update this document:

- **Active items shipped** → move to “Completed recently”
- **New items discovered** → add to the appropriate section (almost always “Near-term GM-side items”)
- **Priority shifts** → reorder within sections
- **Decisions made** → if an item is explicitly no longer planned, remove it
- **New paused items** → only add to “Paused” if they were genuinely scoped before being deferred. Otherwise drop.
- **Update the “Last updated” date** at the top
