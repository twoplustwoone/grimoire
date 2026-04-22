-- Journal captures — J3.
--
-- Purely additive: new StructuredStatus enum, new JournalCapture table,
-- two indexes, two foreign keys to Journal and Session. No existing
-- data is touched. Every DDL statement is idempotent so a partial-state
-- retry after a failed Railway deploy is safe.

-- CreateEnum (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StructuredStatus') THEN
    CREATE TYPE "StructuredStatus" AS ENUM ('RAW', 'PARTIALLY_STRUCTURED', 'STRUCTURED');
  END IF;
END $$;

-- CreateTable (idempotent)
CREATE TABLE IF NOT EXISTS "JournalCapture" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "journalSessionId" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "mentions" JSONB,
    "structuredStatus" "StructuredStatus" NOT NULL DEFAULT 'RAW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "JournalCapture_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (idempotent)
CREATE INDEX IF NOT EXISTS "JournalCapture_journalId_idx" ON "JournalCapture"("journalId");
CREATE INDEX IF NOT EXISTS "JournalCapture_journalSessionId_idx" ON "JournalCapture"("journalSessionId");

-- AddForeignKey (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'JournalCapture_journalId_fkey') THEN
    ALTER TABLE "JournalCapture" ADD CONSTRAINT "JournalCapture_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'JournalCapture_journalSessionId_fkey') THEN
    ALTER TABLE "JournalCapture" ADD CONSTRAINT "JournalCapture_journalSessionId_fkey" FOREIGN KEY ("journalSessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
