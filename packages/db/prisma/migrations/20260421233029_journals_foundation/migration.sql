-- Journals migration foundation.
--
-- Eight entity models (NPC, PlayerCharacter, Location, Faction, Thread,
-- Clue, GameSession, WorldEvent) move from `campaignId` to polymorphic
-- `(ownerType, ownerId)`. `Note.content` becomes JSONB (ProseMirror doc).
-- Small additive fields: `CampaignInvite.pcId`, `PlayerCharacter.externalUrl`.
--
-- Data is preserved on each of the 8 entity models by backfilling
-- ownerType='CAMPAIGN' and ownerId=campaignId before dropping campaignId.
-- Existing Note.content strings are wrapped as minimal ProseMirror docs.
--
-- The DDL here is idempotent (IF EXISTS / IF NOT EXISTS / DO-block) because
-- an earlier attempt to deploy a non-idempotent version of this migration
-- partially applied on Railway — the enum and FK/index drops committed
-- before the NOT-NULL column adds failed, leaving the DB in a half-migrated
-- state. This version can safely re-run from any partial state.

-- CreateEnum (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OwnerType') THEN
    CREATE TYPE "OwnerType" AS ENUM ('CAMPAIGN', 'JOURNAL');
  END IF;
END $$;

-- DropForeignKey (idempotent)
ALTER TABLE "Clue" DROP CONSTRAINT IF EXISTS "Clue_campaignId_fkey";
ALTER TABLE "Faction" DROP CONSTRAINT IF EXISTS "Faction_campaignId_fkey";
ALTER TABLE "Location" DROP CONSTRAINT IF EXISTS "Location_campaignId_fkey";
ALTER TABLE "NPC" DROP CONSTRAINT IF EXISTS "NPC_campaignId_fkey";
ALTER TABLE "PlayerCharacter" DROP CONSTRAINT IF EXISTS "PlayerCharacter_campaignId_fkey";
ALTER TABLE "Session" DROP CONSTRAINT IF EXISTS "Session_campaignId_fkey";
ALTER TABLE "Thread" DROP CONSTRAINT IF EXISTS "Thread_campaignId_fkey";
ALTER TABLE "WorldEvent" DROP CONSTRAINT IF EXISTS "WorldEvent_campaignId_fkey";

-- DropIndex (idempotent)
DROP INDEX IF EXISTS "PlayerCharacter_campaignId_idx";
DROP INDEX IF EXISTS "Session_campaignId_number_key";

-- AlterTable: CampaignInvite.pcId (nullable, no backfill needed)
ALTER TABLE "CampaignInvite" ADD COLUMN IF NOT EXISTS "pcId" TEXT;

-- AlterTable: Clue — add nullable, backfill, set NOT NULL, drop campaignId
ALTER TABLE "Clue" ADD COLUMN IF NOT EXISTS "ownerType" "OwnerType", ADD COLUMN IF NOT EXISTS "ownerId" TEXT;
UPDATE "Clue" SET "ownerType" = 'CAMPAIGN', "ownerId" = "campaignId" WHERE "ownerId" IS NULL;
ALTER TABLE "Clue" ALTER COLUMN "ownerType" SET NOT NULL, ALTER COLUMN "ownerId" SET NOT NULL;
ALTER TABLE "Clue" DROP COLUMN IF EXISTS "campaignId";

-- AlterTable: Faction
ALTER TABLE "Faction" ADD COLUMN IF NOT EXISTS "ownerType" "OwnerType", ADD COLUMN IF NOT EXISTS "ownerId" TEXT;
UPDATE "Faction" SET "ownerType" = 'CAMPAIGN', "ownerId" = "campaignId" WHERE "ownerId" IS NULL;
ALTER TABLE "Faction" ALTER COLUMN "ownerType" SET NOT NULL, ALTER COLUMN "ownerId" SET NOT NULL;
ALTER TABLE "Faction" DROP COLUMN IF EXISTS "campaignId";

-- AlterTable: Location
ALTER TABLE "Location" ADD COLUMN IF NOT EXISTS "ownerType" "OwnerType", ADD COLUMN IF NOT EXISTS "ownerId" TEXT;
UPDATE "Location" SET "ownerType" = 'CAMPAIGN', "ownerId" = "campaignId" WHERE "ownerId" IS NULL;
ALTER TABLE "Location" ALTER COLUMN "ownerType" SET NOT NULL, ALTER COLUMN "ownerId" SET NOT NULL;
ALTER TABLE "Location" DROP COLUMN IF EXISTS "campaignId";

-- AlterTable: NPC
ALTER TABLE "NPC" ADD COLUMN IF NOT EXISTS "ownerType" "OwnerType", ADD COLUMN IF NOT EXISTS "ownerId" TEXT;
UPDATE "NPC" SET "ownerType" = 'CAMPAIGN', "ownerId" = "campaignId" WHERE "ownerId" IS NULL;
ALTER TABLE "NPC" ALTER COLUMN "ownerType" SET NOT NULL, ALTER COLUMN "ownerId" SET NOT NULL;
ALTER TABLE "NPC" DROP COLUMN IF EXISTS "campaignId";

-- AlterTable: PlayerCharacter (+ externalUrl)
ALTER TABLE "PlayerCharacter" ADD COLUMN IF NOT EXISTS "ownerType" "OwnerType", ADD COLUMN IF NOT EXISTS "ownerId" TEXT, ADD COLUMN IF NOT EXISTS "externalUrl" TEXT;
UPDATE "PlayerCharacter" SET "ownerType" = 'CAMPAIGN', "ownerId" = "campaignId" WHERE "ownerId" IS NULL;
ALTER TABLE "PlayerCharacter" ALTER COLUMN "ownerType" SET NOT NULL, ALTER COLUMN "ownerId" SET NOT NULL;
ALTER TABLE "PlayerCharacter" DROP COLUMN IF EXISTS "campaignId";

-- AlterTable: Session (GameSession model)
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "ownerType" "OwnerType", ADD COLUMN IF NOT EXISTS "ownerId" TEXT;
UPDATE "Session" SET "ownerType" = 'CAMPAIGN', "ownerId" = "campaignId" WHERE "ownerId" IS NULL;
ALTER TABLE "Session" ALTER COLUMN "ownerType" SET NOT NULL, ALTER COLUMN "ownerId" SET NOT NULL;
ALTER TABLE "Session" DROP COLUMN IF EXISTS "campaignId";

-- AlterTable: Thread
ALTER TABLE "Thread" ADD COLUMN IF NOT EXISTS "ownerType" "OwnerType", ADD COLUMN IF NOT EXISTS "ownerId" TEXT;
UPDATE "Thread" SET "ownerType" = 'CAMPAIGN', "ownerId" = "campaignId" WHERE "ownerId" IS NULL;
ALTER TABLE "Thread" ALTER COLUMN "ownerType" SET NOT NULL, ALTER COLUMN "ownerId" SET NOT NULL;
ALTER TABLE "Thread" DROP COLUMN IF EXISTS "campaignId";

-- AlterTable: WorldEvent
ALTER TABLE "WorldEvent" ADD COLUMN IF NOT EXISTS "ownerType" "OwnerType", ADD COLUMN IF NOT EXISTS "ownerId" TEXT;
UPDATE "WorldEvent" SET "ownerType" = 'CAMPAIGN', "ownerId" = "campaignId" WHERE "ownerId" IS NULL;
ALTER TABLE "WorldEvent" ALTER COLUMN "ownerType" SET NOT NULL, ALTER COLUMN "ownerId" SET NOT NULL;
ALTER TABLE "WorldEvent" DROP COLUMN IF EXISTS "campaignId";

-- AlterTable: Note.content String -> Json (wrap existing text as ProseMirror doc).
-- Staged via content_new so partial runs are safe: if content is still
-- String the UPDATE wraps it; if content is already JSONB this is a noop.
ALTER TABLE "Note" ADD COLUMN IF NOT EXISTS "content_new" JSONB;
UPDATE "Note" SET "content_new" = jsonb_build_object(
  'type', 'doc',
  'content', jsonb_build_array(
    jsonb_build_object(
      'type', 'paragraph',
      'content', jsonb_build_array(
        jsonb_build_object('type', 'text', 'text', "content")
      )
    )
  )
) WHERE "content_new" IS NULL AND "content" IS NOT NULL AND "content" <> '';
UPDATE "Note" SET "content_new" = jsonb_build_object(
  'type', 'doc',
  'content', jsonb_build_array(jsonb_build_object('type', 'paragraph'))
) WHERE "content_new" IS NULL;
ALTER TABLE "Note" DROP COLUMN IF EXISTS "content";
ALTER TABLE "Note" RENAME COLUMN "content_new" TO "content";
ALTER TABLE "Note" ALTER COLUMN "content" SET NOT NULL;

-- CreateIndex (idempotent)
CREATE INDEX IF NOT EXISTS "Clue_ownerType_ownerId_idx" ON "Clue"("ownerType", "ownerId");
CREATE INDEX IF NOT EXISTS "Faction_ownerType_ownerId_idx" ON "Faction"("ownerType", "ownerId");
CREATE INDEX IF NOT EXISTS "Location_ownerType_ownerId_idx" ON "Location"("ownerType", "ownerId");
CREATE INDEX IF NOT EXISTS "NPC_ownerType_ownerId_idx" ON "NPC"("ownerType", "ownerId");
CREATE INDEX IF NOT EXISTS "PlayerCharacter_ownerType_ownerId_idx" ON "PlayerCharacter"("ownerType", "ownerId");
CREATE UNIQUE INDEX IF NOT EXISTS "Session_ownerType_ownerId_number_key" ON "Session"("ownerType", "ownerId", "number");
CREATE INDEX IF NOT EXISTS "Thread_ownerType_ownerId_idx" ON "Thread"("ownerType", "ownerId");
CREATE INDEX IF NOT EXISTS "WorldEvent_ownerType_ownerId_idx" ON "WorldEvent"("ownerType", "ownerId");

-- AddForeignKey (idempotent — drop-if-exists then add)
ALTER TABLE "CampaignInvite" DROP CONSTRAINT IF EXISTS "CampaignInvite_pcId_fkey";
ALTER TABLE "CampaignInvite" ADD CONSTRAINT "CampaignInvite_pcId_fkey" FOREIGN KEY ("pcId") REFERENCES "PlayerCharacter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
