-- AI usage counter — per-user, per-feature, per-month cap for AI features
-- (first user: RECAP). Purely additive; every DDL statement is idempotent so
-- a partial-state retry after a failed Railway deploy is safe.

-- CreateTable (idempotent)
CREATE TABLE IF NOT EXISTS "AIUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "monthKey" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS "AIUsage_userId_feature_monthKey_key" ON "AIUsage"("userId", "feature", "monthKey");
CREATE INDEX IF NOT EXISTS "AIUsage_userId_idx" ON "AIUsage"("userId");

-- AddForeignKey (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AIUsage_userId_fkey') THEN
    ALTER TABLE "AIUsage" ADD CONSTRAINT "AIUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
