# Schema

This document explains Grimoire's data model — not just what the tables are, but why they're shaped the way they are. The full source of truth is always `packages/db/prisma/schema.prisma`. This doc explains the patterns and reasoning behind it.

---

## The big picture

The schema has three layers:

1. **Auth** — users, sessions, accounts (managed by Better Auth)
2. **Campaign entities** — the things a campaign is made of: NPCs, locations, factions, threads, clues, player characters, sessions, world events
3. **Cross-cutting concerns** — things that apply to multiple entity types: notes, information nodes, reveals, relationships, changelog entries, custom fields

The separation between layers 2 and 3 is the most important design decision in the schema. Understanding it makes everything else make sense.

---

## The polymorphic entity pattern

Most cross-cutting tables have two columns: `entityType` and `entityId`. Together they form a polymorphic foreign key — a reference to any entity in the system without needing a separate join table per entity type.

```prisma
model Note {
  entityType EntityType  // NPC, PLAYER_CHARACTER, LOCATION, FACTION, etc.
  entityId   String      // the id of that entity
  ...
}
```

This means the same `Note` model handles notes on NPCs, locations, factions, threads, clues, sessions, player characters, and world events. Same for `InformationNode`, `Relationship`, `EntityReveal`, `ChangelogEntry`, `SessionEntityTag`, `ThreadEntityTag`, and `CustomFieldValue`.

**The benefit:** when a new entity type is added (e.g. `PlayerCharacter`), all of these systems work automatically. You add `PLAYER_CHARACTER` to the `EntityType` enum and every cross-cutting table gains the ability to reference it. No new join tables. No migrations for the cross-cutting tables.

**The tradeoff:** no database-level foreign key constraint between `entityId` and the actual entity it references. The application is responsible for consistency. Soft deletes (via `deletedAt`) help here — entities are never truly deleted, so dangling references are rare in practice.

**The `EntityType` enum:**

```
NPC, PLAYER_CHARACTER, LOCATION, FACTION, THREAD, CLUE, WORLD_EVENT, SESSION
```

Every value in this enum is a first-class entity with its own table, its own pages in the frontend, and full support from all cross-cutting systems.

---

## Campaign entities

### Campaign

The root of everything. Every entity belongs to a campaign.

```
Campaign
- name, description, status (ACTIVE/PAUSED/COMPLETED/ARCHIVED)
- settings (Json?) — flexible per-campaign config
- isDemo (Boolean) — flags the auto-generated Shattered Conclave demo
```

**`CampaignMembership`** links users to campaigns with a role: `GM`, `CO_GM`, or `PLAYER`. A user can be a member of many campaigns. A campaign can have many members. GMs and Co-GMs have write access; Players have read access scoped to what's been revealed to them.

### NPC

People the GM controls. They have a `status` (`ACTIVE`, `INACTIVE`, `DEAD`, `DESTROYED`, `RETIRED`), an optional `locationId`, and faction memberships via `FactionMembership`.

Location is a soft reference — `locationId` can be null if the NPC's location is unknown or unspecified. It's used for the graph (edges between NPCs and their locations) and for the "where are they?" display on detail pages.

### PlayerCharacter

Characters the players control. Intentionally minimal.

```
PlayerCharacter
- linkedUserId (nullable) — the player who owns this character
- name, description
- status: ACTIVE | RETIRED | DECEASED
```

**Why no class, level, HP, inventory?** Grimoire tracks narrative information, not mechanical state. There are good tools for that (D&D Beyond, etc.). PlayerCharacter exists so the GM can take notes on party members, track what the party knows, and see players' characters in the relationship graph. If a player leaves a campaign, their PC is set to `RETIRED` and `linkedUserId` is nulled — the character's history is preserved even though the player is gone.

**Auto-reveals:** when a PC is created, `EntityReveal` rows are created for all current `PLAYER` members of the campaign, making PCs visible to the whole table by default. The GM can add display overrides if needed (e.g. for secret identities).

**Linked player sees their own PC fully** in the player portal, regardless of reveal settings. Reveal settings control what *other* players see.

### Location

Places in the world. Self-referential via `parentId` — a tavern can be a child of a city, a city a child of a region. The hierarchy is optional (most locations are top-level).

```
Location
- parentId (self-referential) — optional parent location
- status: ACTIVE | INACTIVE | DESTROYED | etc.
```

Locations can have NPCs assigned to them (via `NPC.locationId`) and show up as edges in the relationship graph.

### Faction

Organizations, guilds, factions. Have an `agenda` field in addition to `description` — the agenda is the faction's hidden or stated goal, separate from what the faction is.

`FactionMembership` links NPCs to factions with an optional `role` string (e.g. "leader", "operative", "member"). It's deliberately NPC-only — player characters have fluid, player-driven allegiances that don't fit a formal membership model. PC-to-faction connections are handled via `Relationship` instead, which can capture the full range of "allied with," "infiltrating," "hunted by," and so on.

### Thread

Active plot lines. Have `status` (`OPEN`, `RESOLVED`, `DORMANT`) and `urgency` (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).

`ThreadEntityTag` connects threads to the entities involved in them. This is the mechanism that makes the graph interesting — a thread tagged with an NPC, a faction, and a location creates edges between all of them in the relationship graph.

### Clue

Discovered pieces of information that point toward something. Can be associated with a session via `discoveredInSessionId` — when a clue is found in session 3, it shows up in that session's entity tags and in the world events timeline.

### WorldEvent

Significant in-world happenings, optionally tied to a session or an in-world date. Used for the timeline view of "what happened, when." `WORLD_EVENT` is in the `EntityType` enum, so world events can have notes, reveals, and relationships like any other entity.

### GameSession

A real-world session at the table. Has a session `number` (unique per campaign), an optional `title`, GM summary, AI-generated summary, and a status (`PLANNED` or `COMPLETED`).

Note: the Prisma model is `GameSession` but the database table is `Session` (via `@@map("Session")`). This avoids a naming collision with Better Auth's own `Session` model (which maps to the `session` table lowercase).

`SessionEntityTag` connects sessions to every entity that appeared in them — NPCs, locations, factions, threads, clues. These tags are what the AI recap uses to build context, and what the relationship graph uses to draw session-entity edges.

---

## Cross-cutting concerns

### Note

Free-form text attached to any entity. Can be authored by any campaign member. Contains an optional `mentions` JSON field storing the parsed `@[Name](type:id)` mention tokens from Tiptap, which are used to render linked chips in the UI.

```
Note
- entityType + entityId  — what this note is about
- campaignId             — for quick campaign-scoped queries
- sessionId (nullable)   — if written during a session
- authorId               — who wrote it
- content                — raw Tiptap HTML/text
- mentions (Json?)       — parsed mention tokens
```

Notes are owned by their author. Only the author can edit or delete their own notes. GMs can see all notes on any entity. Players can only see notes via the player portal, and only on entities that have been revealed to them.

### InformationNode

Promoted, structured facts about an entity. Different from notes — notes are scratchpad/stream-of-consciousness, information nodes are deliberate and have controlled visibility.

```
InformationNode
- entityType + entityId  — what this fact is about
- title                  — a short label for the fact
- content                — the full text
- visibility: GM_ONLY | ALL_PLAYERS | SPECIFIC_PLAYERS
```

**Visibility levels:**

- `GM_ONLY` — only the GM sees this. Hidden from all players.
- `ALL_PLAYERS` — every player in the campaign can see this node.
- `SPECIFIC_PLAYERS` — only players who have an `InformationNodeReveal` row can see this.

`InformationNodeReveal` links a specific node to a specific `CampaignMembership`. It's keyed on `membershipId` rather than `userId` so that if a player's membership changes, their reveals change with it.

**Usage:** The GM writes notes freely (scratchpad layer). When a fact is ready to be shared with players, it gets promoted to an information node with appropriate visibility. The player portal shows only information nodes — never raw GM notes.

### EntityReveal

Controls whether a player knows an entity exists at all. The outer layer of the information asymmetry system.

```
EntityReveal
- campaignId
- entityType + entityId  — which entity
- userId (nullable)      — which player; null = all players
- displayName (nullable) — override shown instead of real name
- displayDescription (nullable) — override shown instead of real description
```

**If `userId` is null:** every player in the campaign can see this entity exists.
**If `userId` is set:** only that specific player can see this entity exists.

**Display overrides:** The GM can reveal an entity under an alias. A player might know an NPC as "the grey-cloaked figure" while the GM's record shows "Ser Aldric Mourne". Each player can have different display overrides for the same entity — one player knows the real name, another only knows the alias.

**How the layers compose:**

- No `EntityReveal` for the player → entity is invisible to them
- `EntityReveal` exists with display overrides → player sees the override name/description
- `EntityReveal` exists without display overrides → player sees the real name/description
- Visible `InformationNode`s on the entity → player sees those curated facts alongside the entity

The player portal checks all of this before rendering, per entity per player.

### Relationship

Explicit named connections between any two entities.

```
Relationship
- entityTypeA + entityIdA  — one end
- entityTypeB + entityIdB  — other end
- label                    — short description of the relationship ("allied with", "hunting", "distrusts")
- description (nullable)   — longer explanation
- bidirectional            — whether the relationship goes both ways
```

Relationships are the primary edges in the relationship graph, alongside membership edges (NPC ↔ Faction), location edges (NPC ↔ Location), and thread tags (Thread ↔ any entity). Any two entities of any type can be related to each other.

### ChangelogEntry

A structured log of every field change to any entity.

```
ChangelogEntry
- entityType + entityId  — what changed
- sessionId (nullable)   — if the change happened during a session
- field                  — which field changed
- oldValue / newValue    — what it changed from and to
- note (nullable)        — optional comment on the change
```

This is not event sourcing — we don't reconstruct state from the changelog. It's a history log for the GM ("when did this NPC's status change to DEAD?") and for the AI recap generation (providing rich context about what changed in recent sessions beyond just the notes).

### CustomFieldDefinition + CustomFieldValue

Campaign-specific fields that can be attached to any entity type. A GM running a naval campaign might add a "ship" field to locations; a GM running a political campaign might add "influence score" to factions.

```
CustomFieldDefinition
- campaignId
- targetEntity — which EntityType this field applies to
- name, fieldType (TEXT/NUMBER/BOOLEAN/SELECT/MULTI_SELECT/PROGRESS)
- config (Json?) — options for SELECT types, etc.
```

```
CustomFieldValue
- definitionId  — which field definition
- entityType + entityId  — which entity
- value (String) — stored as string, cast by the application
```

Custom fields are per-campaign, not per-user or global. They extend entities without changing the schema.

---

## Auth layer

Better Auth manages the `Session`, `Account`, and `Verification` tables. These are lowercase in the database (`@@map("session")`, `@@map("account")`, `@@map("verification")`) to match Better Auth's expectations.

The `User` model is Grimoire's own. Better Auth's tables reference it. Grimoire's tables also reference it. The `User` is the one model that belongs to both worlds.

**`ApiKey`** stores long-lived keys for MCP/API access. Keys are SHA-256 hashed at rest. The `keyPrefix` (first 12 characters) is stored in plaintext for display purposes. The full key is shown exactly once at creation time.

**OAuth models** (`OAuthClient`, `OAuthAuthorizationCode`, `OAuthAccessToken`, `OAuthRefreshToken`) implement the OAuth 2.1 authorization server for the MCP connector. Claude Desktop registers itself as a client via dynamic client registration, gets an authorization code via the consent screen, and exchanges it for an access token. Refresh tokens rotate on use (consuming one issues a new one).

---

## Soft deletes

All primary campaign entities have a `deletedAt DateTime?` field. Deletion sets this timestamp; it does not remove the row.

**Why:** campaign data has long-term value. An NPC you "deleted" in session 3 might be referenced in notes from session 1. Destroying the row would create dangling references and data loss. Soft deletes mean the entity is hidden from the UI but the history is intact.

**How it's queried:** every entity list query includes `where: { deletedAt: null }`. Soft-deleted entities are excluded from search, graph, and all standard views.

---

## Indexes

Indexes to know about:

- `@@unique([campaignId, userId])` on `CampaignMembership` — one membership per user per campaign
- `@@unique([campaignId, number])` on `GameSession` — session numbers are unique per campaign
- `@@unique([entityType, entityId, userId])` on `EntityReveal` — one reveal per entity per user (or one all-players reveal per entity when userId is null — *note: Prisma 7 rejects null in composite unique keys for upsert, so all-players reveals use findFirst + create instead*)
- `@@index([entityType, entityId])` on every polymorphic table — the most frequently used query pattern
- `@@index([campaignId])` on most tables — for campaign-scoped list queries

---

## Adding a new entity type

1. Add a new model to the schema
2. Add the value to `EntityType`
3. Run `prisma migrate dev --name add_<entity>`
4. Run `prisma generate`

That's it for the data layer. Notes, reveals, relationships, information nodes, changelog, and custom fields all work immediately for the new entity type. The API routes and frontend pages are the remaining work.

See `docs/architecture.md` for the full checklist of what needs to change when adding a new entity type.
