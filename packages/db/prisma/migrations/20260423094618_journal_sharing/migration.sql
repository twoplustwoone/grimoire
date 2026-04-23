-- Journal sharing — J5.
--
-- Purely additive: new ShareScope enum, new JournalShare table,
-- unique index, journal-id index, FK. No existing data is touched.
-- Every DDL statement is idempotent so a partial-state retry after
-- a failed Railway deploy is safe.

-- CreateEnum (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ShareScope') THEN
    CREATE TYPE "ShareScope" AS ENUM ('JOURNAL', 'NPC', 'LOCATION', 'FACTION', 'THREAD', 'CLUE', 'PLAYER_CHARACTER', 'CAPTURE');
  END IF;
END $$;

-- CreateTable (idempotent)
CREATE TABLE IF NOT EXISTS "JournalShare" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "sharedEntityType" "ShareScope" NOT NULL,
    "sharedEntityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JournalShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (idempotent)
--
-- Postgres treats NULL as distinct in unique constraints by
-- default, so two JOURNAL-scoped rows (sharedEntityId = NULL) could
-- coexist. The API guards this via findFirst + create; we don't
-- enable NULLS NOT DISTINCT here because the same caveat lives on
-- EntityReveal and deserves a coordinated fix rather than a
-- silent divergence.
CREATE UNIQUE INDEX IF NOT EXISTS "JournalShare_journalId_sharedEntityType_sharedEntityId_key" ON "JournalShare"("journalId", "sharedEntityType", "sharedEntityId");
CREATE INDEX IF NOT EXISTS "JournalShare_journalId_idx" ON "JournalShare"("journalId");

-- AddForeignKey (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'JournalShare_journalId_fkey') THEN
    ALTER TABLE "JournalShare" ADD CONSTRAINT "JournalShare_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
