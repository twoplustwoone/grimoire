# 7. Database migration policy — data-preserving and idempotent by default

Date: 2026-04-21

## Status

Accepted

## Context

During J1 (Journals migration foundation), the initial migration was
written as a "big-bang" reshape — `ADD NOT NULL` columns without backfill,
`DROP` the old `campaignId` column, with the assumption that production
could be nuked and reseeded like local dev.

This failed on Railway. The production deploy pipeline runs
`prisma migrate deploy`, which applies migrations sequentially against
whatever data is already there. Even with no real users, the seed data
existed — and the migration failed with a NOT NULL constraint violation
on existing rows.

The retry then failed differently: `type "OwnerType" already exists`. The
first attempt had committed the `CREATE TYPE` statement before crashing
on the NOT NULL add, leaving production in a half-migrated state. Prisma
DDL is not transactional by default; failed migrations leave partial
artifacts.

Three commits were needed to land J1 in production:

1. Original: failed on NOT NULL backfill
2. Rewritten data-preserving (nullable → backfill → NOT NULL → drop old):
   failed on the already-created enum type from attempt #1
3. Fully idempotent (`IF EXISTS` / `IF NOT EXISTS` / `DO` guards on every
   DDL statement): applied cleanly

The root cause was a framing error in the design — "pre-launch, nuke and
reseed" described local dev, not the deploy pipeline. The lesson is that
migration strategy must match the actual deploy mechanism, not an
idealized version of it.

## Decision

Every migration on this project must be:

1. **Data-preserving.** Schema reshapes stage through nullable
   intermediate states: add nullable → backfill → set NOT NULL → drop
   old. No "ADD NOT NULL + DROP in one step" migrations.

2. **Idempotent.** Every DDL statement safe to replay from any partial
   state: `IF EXISTS` / `IF NOT EXISTS` on drops and adds, `DO` blocks
   guarding `CREATE TYPE` via `pg_type` lookups.

3. **Verified against populated data** before deploy. Running
   `pnpm db:reset` + seed validates only the empty-DB path. The full
   verification requires seeding pre-migration data, then running
   `prisma migrate deploy` locally against that populated DB, before
   pushing to Railway.

## Consequences

Migration files are more verbose. A schema reshape that could be
expressed in three lines becomes twelve. This is worth it: the extra
verbosity is the cost of not having production half-migrated when
something goes wrong.

Destructive local-only patterns (`db:reset` + reseed) remain the right
choice for local dev where data doesn't matter. But the migration file
that's committed to the repo is the one that runs on Railway, and that
one must be safe for production.

When a Railway migration fails despite this policy (e.g., a genuinely
unexpected data shape), clear the failed marker via
`railway ssh` + `prisma migrate resolve --rolled-back <migration_name>`
before pushing a fix. Do not attempt to re-deploy over a failed
migration.

This policy is documented in `CLAUDE.md` under "Database migrations."
