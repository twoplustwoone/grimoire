-- Journal linking — J4.
--
-- Purely additive: new LinkOrigin enum, new JournalLink and
-- PlayerCharacterMirror tables, indexes, and foreign keys. No
-- existing data is touched. Every DDL statement is idempotent so a
-- partial-state retry after a failed Railway deploy is safe.

-- CreateEnum (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LinkOrigin') THEN
    CREATE TYPE "LinkOrigin" AS ENUM ('PLAYER', 'GM');
  END IF;
END $$;

-- CreateTable (idempotent)
CREATE TABLE IF NOT EXISTS "JournalLink" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "journalEntityType" "EntityType" NOT NULL,
    "journalEntityId" TEXT NOT NULL,
    "campaignEntityType" "EntityType" NOT NULL,
    "campaignEntityId" TEXT NOT NULL,
    "proposedBy" "LinkOrigin" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JournalLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PlayerCharacterMirror" (
    "id" TEXT NOT NULL,
    "campaignPcId" TEXT NOT NULL,
    "journalPcId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerCharacterMirror_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (idempotent)
CREATE INDEX IF NOT EXISTS "JournalLink_journalId_idx" ON "JournalLink"("journalId");
CREATE INDEX IF NOT EXISTS "JournalLink_campaignEntityType_campaignEntityId_idx" ON "JournalLink"("campaignEntityType", "campaignEntityId");
CREATE UNIQUE INDEX IF NOT EXISTS "JournalLink_journalEntityType_journalEntityId_campaignEntit_key" ON "JournalLink"("journalEntityType", "journalEntityId", "campaignEntityType", "campaignEntityId");
CREATE UNIQUE INDEX IF NOT EXISTS "PlayerCharacterMirror_campaignPcId_key" ON "PlayerCharacterMirror"("campaignPcId");
CREATE UNIQUE INDEX IF NOT EXISTS "PlayerCharacterMirror_journalPcId_key" ON "PlayerCharacterMirror"("journalPcId");

-- AddForeignKey (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'JournalLink_journalId_fkey') THEN
    ALTER TABLE "JournalLink" ADD CONSTRAINT "JournalLink_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PlayerCharacterMirror_campaignPcId_fkey') THEN
    ALTER TABLE "PlayerCharacterMirror" ADD CONSTRAINT "PlayerCharacterMirror_campaignPcId_fkey" FOREIGN KEY ("campaignPcId") REFERENCES "PlayerCharacter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PlayerCharacterMirror_journalPcId_fkey') THEN
    ALTER TABLE "PlayerCharacterMirror" ADD CONSTRAINT "PlayerCharacterMirror_journalPcId_fkey" FOREIGN KEY ("journalPcId") REFERENCES "PlayerCharacter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
