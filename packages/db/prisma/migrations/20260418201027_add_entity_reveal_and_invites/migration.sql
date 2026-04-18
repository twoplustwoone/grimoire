-- CreateTable
CREATE TABLE "EntityReveal" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "entityType" "EntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "userId" TEXT,
    "displayName" TEXT,
    "displayDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EntityReveal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignInvite" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL DEFAULT 'PLAYER',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EntityReveal_campaignId_idx" ON "EntityReveal"("campaignId");

-- CreateIndex
CREATE INDEX "EntityReveal_userId_idx" ON "EntityReveal"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EntityReveal_entityType_entityId_userId_key" ON "EntityReveal"("entityType", "entityId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignInvite_token_key" ON "CampaignInvite"("token");

-- CreateIndex
CREATE INDEX "CampaignInvite_campaignId_idx" ON "CampaignInvite"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignInvite_token_idx" ON "CampaignInvite"("token");

-- AddForeignKey
ALTER TABLE "EntityReveal" ADD CONSTRAINT "EntityReveal_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityReveal" ADD CONSTRAINT "EntityReveal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignInvite" ADD CONSTRAINT "CampaignInvite_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
