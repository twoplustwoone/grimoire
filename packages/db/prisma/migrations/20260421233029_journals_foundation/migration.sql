-- Journals migration foundation.
--
-- Eight entity models (NPC, PlayerCharacter, Location, Faction, Thread,
-- Clue, GameSession, WorldEvent) move from `campaignId` to polymorphic
-- `(ownerType, ownerId)`. `Note.content` becomes JSONB (ProseMirror doc).
-- Small additive fields: `CampaignInvite.pcId`, `PlayerCharacter.externalUrl`.
--
-- Data is preserved on each of the 8 entity models by backfilling
-- ownerType='CAMPAIGN' and ownerId=campaignId before dropping campaignId.
-- Existing Note.content strings are wrapped as minimal ProseMirror docs;
-- any stale `@[Name](type:id)` mention tokens in pre-existing content
-- will render as plaintext after the migration (acceptable for pre-launch).

-- CreateEnum
CREATE TYPE "OwnerType" AS ENUM ('CAMPAIGN', 'JOURNAL');

-- DropForeignKey
ALTER TABLE "Clue" DROP CONSTRAINT "Clue_campaignId_fkey";
ALTER TABLE "Faction" DROP CONSTRAINT "Faction_campaignId_fkey";
ALTER TABLE "Location" DROP CONSTRAINT "Location_campaignId_fkey";
ALTER TABLE "NPC" DROP CONSTRAINT "NPC_campaignId_fkey";
ALTER TABLE "PlayerCharacter" DROP CONSTRAINT "PlayerCharacter_campaignId_fkey";
ALTER TABLE "Session" DROP CONSTRAINT "Session_campaignId_fkey";
ALTER TABLE "Thread" DROP CONSTRAINT "Thread_campaignId_fkey";
ALTER TABLE "WorldEvent" DROP CONSTRAINT "WorldEvent_campaignId_fkey";

-- DropIndex
DROP INDEX "PlayerCharacter_campaignId_idx";
DROP INDEX "Session_campaignId_number_key";

-- AlterTable: CampaignInvite.pcId (nullable, no backfill needed)
ALTER TABLE "CampaignInvite" ADD COLUMN "pcId" TEXT;

-- AlterTable: Clue — add nullable, backfill, set NOT NULL, drop campaignId
ALTER TABLE "Clue" ADD COLUMN "ownerType" "OwnerType", ADD COLUMN "ownerId" TEXT;
UPDATE "Clue" SET "ownerType" = 'CAMPAIGN', "ownerId" = "campaignId";
ALTER TABLE "Clue" ALTER COLUMN "ownerType" SET NOT NULL, ALTER COLUMN "ownerId" SET NOT NULL;
ALTER TABLE "Clue" DROP COLUMN "campaignId";

-- AlterTable: Faction
ALTER TABLE "Faction" ADD COLUMN "ownerType" "OwnerType", ADD COLUMN "ownerId" TEXT;
UPDATE "Faction" SET "ownerType" = 'CAMPAIGN', "ownerId" = "campaignId";
ALTER TABLE "Faction" ALTER COLUMN "ownerType" SET NOT NULL, ALTER COLUMN "ownerId" SET NOT NULL;
ALTER TABLE "Faction" DROP COLUMN "campaignId";

-- AlterTable: Location
ALTER TABLE "Location" ADD COLUMN "ownerType" "OwnerType", ADD COLUMN "ownerId" TEXT;
UPDATE "Location" SET "ownerType" = 'CAMPAIGN', "ownerId" = "campaignId";
ALTER TABLE "Location" ALTER COLUMN "ownerType" SET NOT NULL, ALTER COLUMN "ownerId" SET NOT NULL;
ALTER TABLE "Location" DROP COLUMN "campaignId";

-- AlterTable: NPC
ALTER TABLE "NPC" ADD COLUMN "ownerType" "OwnerType", ADD COLUMN "ownerId" TEXT;
UPDATE "NPC" SET "ownerType" = 'CAMPAIGN', "ownerId" = "campaignId";
ALTER TABLE "NPC" ALTER COLUMN "ownerType" SET NOT NULL, ALTER COLUMN "ownerId" SET NOT NULL;
ALTER TABLE "NPC" DROP COLUMN "campaignId";

-- AlterTable: PlayerCharacter (+ externalUrl)
ALTER TABLE "PlayerCharacter" ADD COLUMN "ownerType" "OwnerType", ADD COLUMN "ownerId" TEXT, ADD COLUMN "externalUrl" TEXT;
UPDATE "PlayerCharacter" SET "ownerType" = 'CAMPAIGN', "ownerId" = "campaignId";
ALTER TABLE "PlayerCharacter" ALTER COLUMN "ownerType" SET NOT NULL, ALTER COLUMN "ownerId" SET NOT NULL;
ALTER TABLE "PlayerCharacter" DROP COLUMN "campaignId";

-- AlterTable: Session (GameSession model)
ALTER TABLE "Session" ADD COLUMN "ownerType" "OwnerType", ADD COLUMN "ownerId" TEXT;
UPDATE "Session" SET "ownerType" = 'CAMPAIGN', "ownerId" = "campaignId";
ALTER TABLE "Session" ALTER COLUMN "ownerType" SET NOT NULL, ALTER COLUMN "ownerId" SET NOT NULL;
ALTER TABLE "Session" DROP COLUMN "campaignId";

-- AlterTable: Thread
ALTER TABLE "Thread" ADD COLUMN "ownerType" "OwnerType", ADD COLUMN "ownerId" TEXT;
UPDATE "Thread" SET "ownerType" = 'CAMPAIGN', "ownerId" = "campaignId";
ALTER TABLE "Thread" ALTER COLUMN "ownerType" SET NOT NULL, ALTER COLUMN "ownerId" SET NOT NULL;
ALTER TABLE "Thread" DROP COLUMN "campaignId";

-- AlterTable: WorldEvent
ALTER TABLE "WorldEvent" ADD COLUMN "ownerType" "OwnerType", ADD COLUMN "ownerId" TEXT;
UPDATE "WorldEvent" SET "ownerType" = 'CAMPAIGN', "ownerId" = "campaignId";
ALTER TABLE "WorldEvent" ALTER COLUMN "ownerType" SET NOT NULL, ALTER COLUMN "ownerId" SET NOT NULL;
ALTER TABLE "WorldEvent" DROP COLUMN "campaignId";

-- AlterTable: Note.content String -> Json (wrap existing text as ProseMirror doc)
ALTER TABLE "Note" ADD COLUMN "content_new" JSONB;
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
) WHERE "content" IS NOT NULL AND "content" <> '';
UPDATE "Note" SET "content_new" = jsonb_build_object(
  'type', 'doc',
  'content', jsonb_build_array(jsonb_build_object('type', 'paragraph'))
) WHERE "content_new" IS NULL;
ALTER TABLE "Note" DROP COLUMN "content";
ALTER TABLE "Note" RENAME COLUMN "content_new" TO "content";
ALTER TABLE "Note" ALTER COLUMN "content" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Clue_ownerType_ownerId_idx" ON "Clue"("ownerType", "ownerId");
CREATE INDEX "Faction_ownerType_ownerId_idx" ON "Faction"("ownerType", "ownerId");
CREATE INDEX "Location_ownerType_ownerId_idx" ON "Location"("ownerType", "ownerId");
CREATE INDEX "NPC_ownerType_ownerId_idx" ON "NPC"("ownerType", "ownerId");
CREATE INDEX "PlayerCharacter_ownerType_ownerId_idx" ON "PlayerCharacter"("ownerType", "ownerId");
CREATE UNIQUE INDEX "Session_ownerType_ownerId_number_key" ON "Session"("ownerType", "ownerId", "number");
CREATE INDEX "Thread_ownerType_ownerId_idx" ON "Thread"("ownerType", "ownerId");
CREATE INDEX "WorldEvent_ownerType_ownerId_idx" ON "WorldEvent"("ownerType", "ownerId");

-- AddForeignKey
ALTER TABLE "CampaignInvite" ADD CONSTRAINT "CampaignInvite_pcId_fkey" FOREIGN KEY ("pcId") REFERENCES "PlayerCharacter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
