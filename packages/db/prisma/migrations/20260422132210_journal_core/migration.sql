-- Journal core — J2.
--
-- Purely additive: new Journal table, two indexes, two foreign keys.
-- No existing data is touched. Every DDL statement is idempotent so a
-- partial-state retry after a failed Railway deploy is safe.

-- CreateTable (idempotent)
CREATE TABLE IF NOT EXISTS "Journal" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "linkedCampaignId" TEXT,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Journal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (idempotent)
CREATE INDEX IF NOT EXISTS "Journal_ownerId_idx" ON "Journal"("ownerId");
CREATE INDEX IF NOT EXISTS "Journal_linkedCampaignId_idx" ON "Journal"("linkedCampaignId");

-- AddForeignKey (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Journal_ownerId_fkey') THEN
    ALTER TABLE "Journal" ADD CONSTRAINT "Journal_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Journal_linkedCampaignId_fkey') THEN
    ALTER TABLE "Journal" ADD CONSTRAINT "Journal_linkedCampaignId_fkey" FOREIGN KEY ("linkedCampaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
