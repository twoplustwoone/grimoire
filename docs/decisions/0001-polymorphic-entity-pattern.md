# ADR-0001: Polymorphic entity pattern for cross-cutting concerns

**Status:** Accepted
**Date:** 2026-04-16

## Context

Grimoire has several entity types — NPCs, locations, factions, threads, clues, sessions, player characters, world events — and several cross-cutting concerns that apply to all of them: notes, information nodes, reveals, relationships, changelog entries, and custom fields.

The conventional relational approach would be a separate join table per (cross-cutting concern × entity type) pair. Notes on NPCs, notes on locations, notes on factions — that's three tables. Reveals on each of seven entity types — seven more. With six cross-cutting concerns across seven entity types, we'd be looking at ~40 join tables that all behave identically except for which entity they reference.

Adding a new entity type would require creating a new join table for every cross-cutting concern. Adding a new cross-cutting concern would require creating a new table for every entity type. The matrix explodes.

## Decision

Cross-cutting tables use a polymorphic reference: an `entityType` enum column plus an `entityId` string column. The pair together points to any entity in the system.

```
Note { entityType, entityId, content, ... }
InformationNode { entityType, entityId, title, content, visibility, ... }
EntityReveal { entityType, entityId, userId, ... }
Relationship { entityTypeA, entityIdA, entityTypeB, entityIdB, ... }
ChangelogEntry { entityType, entityId, field, oldValue, newValue, ... }
CustomFieldValue { entityType, entityId, value, ... }
```

Adding a new entity type means adding one value to the `EntityType` enum. All cross-cutting tables immediately work with it. No schema migrations for notes, reveals, relationships, etc.

## Consequences

**Positive:**

- Adding `PlayerCharacter` required only a new model and one enum value. Notes, reveals, mentions, graph, and information nodes all worked without changes to those subsystems.
- The codebase has one note-rendering component, one reveal panel, one relationship graph — not one per entity type.
- Features like the @mention system, the relationship graph, and the player portal's reveal rendering are written once and apply everywhere.

**Negative:**

- No database-level foreign key constraint from `entityId` to the actual entity table. Referential integrity is the application's responsibility.
- Soft deletes (`deletedAt`) mitigate most real-world consistency issues since entities are never truly removed.
- Queries that need the actual referenced entity require a `switch` on `entityType` in application code. This has been manageable.

**Neutral:**

- Indexes on `(entityType, entityId)` exist on every polymorphic table and handle the common query pattern efficiently.

## Alternatives considered

**Per-entity-type join tables.** Rejected due to the combinatorial explosion described above. Would have added significant schema maintenance overhead every time we added a new entity type or a new cross-cutting concern.

**Single-table inheritance (all entities in one table).** Rejected because entity types have genuinely different fields and lifecycle rules. NPCs have locations and faction memberships; threads have urgency; clues have discovery context. Collapsing them into one table would either require many nullable columns or a JSON blob, both of which are worse than separate tables.
