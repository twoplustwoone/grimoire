# ADR-0004: PlayerCharacter as a separate model, not an NPC variant

**Status:** Accepted
**Date:** 2026-04-19
**Builds on:** [ADR-0001: Polymorphic entity pattern for cross-cutting concerns](./0001-polymorphic-entity-pattern.md)

## Context

Grimoire needed to track player characters — the characters the players at the table are playing. The core requirements:

- GMs write private notes about PCs (secret backstory, hidden motivations) that the player should never see.
- GMs write public/shared facts about PCs, revealable to the whole table via information nodes.
- The linked player sees their own PC fully, regardless of reveal settings.
- Other players see a PC only through the reveal system — just like any other entity.
- PCs must appear in the relationship graph, the command palette, the mention system, and the notes system.
- When a player leaves a campaign, their PC's history must be preserved, not deleted.

The pragmatic temptation was to extend the existing `NPC` model: add a nullable `linkedUserId` and an `isPlayerCharacter` boolean. It would have worked. It would have been less code.

We decided against it.

## Decision

`PlayerCharacter` is its own Prisma model with its own table, and `PLAYER_CHARACTER` is a distinct value in the `EntityType` enum.

```prisma
model PlayerCharacter {
  id            String    @id @default(cuid())
  campaignId    String
  linkedUserId  String?
  name          String
  description   String?
  status        PlayerCharacterStatus @default(ACTIVE)
  deletedAt     DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

enum PlayerCharacterStatus {
  ACTIVE
  RETIRED
  DECEASED
}
```

Because the cross-cutting tables are polymorphic (see ADR-0001), adding `PLAYER_CHARACTER` to the `EntityType` enum meant notes, information nodes, reveals, relationships, changelog, mentions, and the graph all worked immediately with no additional schema changes. PCs got full first-class entity treatment from day one.

Behavioral rules layered on top of the schema:

- **GM has full edit rights.** The linked player can add information nodes to their own PC but cannot edit the core fields (name, description, status).
- **Auto-reveals on creation.** When a PC is created, `EntityReveal` rows are created for all current `PLAYER` members of the campaign — making PCs visible to the whole table by default.
- **The linked player sees their PC fully in the portal** regardless of reveal settings. Reveal settings control what other players see.
- **When a player leaves a campaign**, their PC is set to `RETIRED` and `linkedUserId` is nulled. The history is preserved; the link is broken.

## Consequences

**Positive:**

- `NPC` queries do not need to filter out PCs. No `where: { isPlayerCharacter: false }` sprinkled through the codebase.
- The schemas describe what they are. `NPC.locationId` and `NPC.factionMemberships` make sense for NPCs; they would be awkward extras on a PC. `PlayerCharacter.linkedUserId` and `PlayerCharacterStatus` make sense for PCs; they'd be dead fields on NPCs.
- The status enums differ meaningfully. `NPC.status` (`ACTIVE | INACTIVE | DEAD | DESTROYED | RETIRED`) reflects an NPC's narrative state. `PlayerCharacterStatus` (`ACTIVE | RETIRED | DECEASED`) reflects a player character's table-level state. Combining them would have produced a confused enum or required a shared one that served neither case well.
- Separate models mean separate pages, routes, and affordances in the frontend. The GM's mental model — "I'm tracking my party members" vs. "I'm tracking NPCs" — matches the product's UI.
- Future divergence is free. If PC-specific features are added later (character milestones, player-authored backstory sections, level tracking if we ever change our mind), they live on `PlayerCharacter` without affecting the NPC model.

**Negative:**

- More schema surface area. Two models where one could have sufficed.
- Some code duplication in the API routes and frontend — PC list/detail pages mirror NPC list/detail pages. The duplication is small and tolerated.

**Neutral:**

- The graph, mention system, reveal system, and MCP tools treat `NPC` and `PLAYER_CHARACTER` as two different entity types. This is exactly what we want.

## Alternatives considered

**Add `isPlayerCharacter` boolean + `linkedUserId` to the `NPC` model.** Rejected for the reasons above. It would have been faster to build but created an ongoing tax on every NPC query and collapsed two distinct concepts into one table.

**Single-table inheritance with a discriminator column.** Same problem as the previous option, just more formal. Rejected for the same reasons.

**A `Character` supertable with `NPC` and `PlayerCharacter` as child tables.** Would have required joining on every character-related query. The polymorphic `EntityType` enum already plays this role at the application layer without requiring a supertable. Adds complexity for no real benefit.

## Related note: why PCs don't have stats, HP, class, level

This is a product decision, not a schema one, but it's worth recording here because it informed the shape of the PC model. Grimoire focuses on notes and knowledge management — the narrative layer of a campaign — not mechanical state. There are excellent tools for character sheets (D&D Beyond, Foundry, Roll20 character sheets). Grimoire does not compete with them. A PC in Grimoire is a character whose narrative you care about tracking; the mechanical state lives wherever the table already tracks it.

This means `PlayerCharacter` has four real fields and three status values, and that's deliberate.
