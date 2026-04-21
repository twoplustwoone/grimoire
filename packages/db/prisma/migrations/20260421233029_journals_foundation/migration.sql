/*
  Warnings:

  - You are about to drop the column `campaignId` on the `Clue` table. All the data in the column will be lost.
  - You are about to drop the column `campaignId` on the `Faction` table. All the data in the column will be lost.
  - You are about to drop the column `campaignId` on the `Location` table. All the data in the column will be lost.
  - You are about to drop the column `campaignId` on the `NPC` table. All the data in the column will be lost.
  - You are about to drop the column `campaignId` on the `PlayerCharacter` table. All the data in the column will be lost.
  - You are about to drop the column `campaignId` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `campaignId` on the `Thread` table. All the data in the column will be lost.
  - You are about to drop the column `campaignId` on the `WorldEvent` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[ownerType,ownerId,number]` on the table `Session` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `ownerId` to the `Clue` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ownerType` to the `Clue` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ownerId` to the `Faction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ownerType` to the `Faction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ownerId` to the `Location` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ownerType` to the `Location` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ownerId` to the `NPC` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ownerType` to the `NPC` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `content` on the `Note` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `ownerId` to the `PlayerCharacter` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ownerType` to the `PlayerCharacter` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ownerId` to the `Session` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ownerType` to the `Session` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ownerId` to the `Thread` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ownerType` to the `Thread` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ownerId` to the `WorldEvent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ownerType` to the `WorldEvent` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "OwnerType" AS ENUM ('CAMPAIGN', 'JOURNAL');

-- DropForeignKey
ALTER TABLE "Clue" DROP CONSTRAINT "Clue_campaignId_fkey";

-- DropForeignKey
ALTER TABLE "Faction" DROP CONSTRAINT "Faction_campaignId_fkey";

-- DropForeignKey
ALTER TABLE "Location" DROP CONSTRAINT "Location_campaignId_fkey";

-- DropForeignKey
ALTER TABLE "NPC" DROP CONSTRAINT "NPC_campaignId_fkey";

-- DropForeignKey
ALTER TABLE "PlayerCharacter" DROP CONSTRAINT "PlayerCharacter_campaignId_fkey";

-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_campaignId_fkey";

-- DropForeignKey
ALTER TABLE "Thread" DROP CONSTRAINT "Thread_campaignId_fkey";

-- DropForeignKey
ALTER TABLE "WorldEvent" DROP CONSTRAINT "WorldEvent_campaignId_fkey";

-- DropIndex
DROP INDEX "PlayerCharacter_campaignId_idx";

-- DropIndex
DROP INDEX "Session_campaignId_number_key";

-- AlterTable
ALTER TABLE "CampaignInvite" ADD COLUMN     "pcId" TEXT;

-- AlterTable
ALTER TABLE "Clue" DROP COLUMN "campaignId",
ADD COLUMN     "ownerId" TEXT NOT NULL,
ADD COLUMN     "ownerType" "OwnerType" NOT NULL;

-- AlterTable
ALTER TABLE "Faction" DROP COLUMN "campaignId",
ADD COLUMN     "ownerId" TEXT NOT NULL,
ADD COLUMN     "ownerType" "OwnerType" NOT NULL;

-- AlterTable
ALTER TABLE "Location" DROP COLUMN "campaignId",
ADD COLUMN     "ownerId" TEXT NOT NULL,
ADD COLUMN     "ownerType" "OwnerType" NOT NULL;

-- AlterTable
ALTER TABLE "NPC" DROP COLUMN "campaignId",
ADD COLUMN     "ownerId" TEXT NOT NULL,
ADD COLUMN     "ownerType" "OwnerType" NOT NULL;

-- AlterTable
ALTER TABLE "Note" DROP COLUMN "content",
ADD COLUMN     "content" JSONB NOT NULL;

-- AlterTable
ALTER TABLE "PlayerCharacter" DROP COLUMN "campaignId",
ADD COLUMN     "externalUrl" TEXT,
ADD COLUMN     "ownerId" TEXT NOT NULL,
ADD COLUMN     "ownerType" "OwnerType" NOT NULL;

-- AlterTable
ALTER TABLE "Session" DROP COLUMN "campaignId",
ADD COLUMN     "ownerId" TEXT NOT NULL,
ADD COLUMN     "ownerType" "OwnerType" NOT NULL;

-- AlterTable
ALTER TABLE "Thread" DROP COLUMN "campaignId",
ADD COLUMN     "ownerId" TEXT NOT NULL,
ADD COLUMN     "ownerType" "OwnerType" NOT NULL;

-- AlterTable
ALTER TABLE "WorldEvent" DROP COLUMN "campaignId",
ADD COLUMN     "ownerId" TEXT NOT NULL,
ADD COLUMN     "ownerType" "OwnerType" NOT NULL;

-- CreateIndex
CREATE INDEX "Clue_ownerType_ownerId_idx" ON "Clue"("ownerType", "ownerId");

-- CreateIndex
CREATE INDEX "Faction_ownerType_ownerId_idx" ON "Faction"("ownerType", "ownerId");

-- CreateIndex
CREATE INDEX "Location_ownerType_ownerId_idx" ON "Location"("ownerType", "ownerId");

-- CreateIndex
CREATE INDEX "NPC_ownerType_ownerId_idx" ON "NPC"("ownerType", "ownerId");

-- CreateIndex
CREATE INDEX "PlayerCharacter_ownerType_ownerId_idx" ON "PlayerCharacter"("ownerType", "ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_ownerType_ownerId_number_key" ON "Session"("ownerType", "ownerId", "number");

-- CreateIndex
CREATE INDEX "Thread_ownerType_ownerId_idx" ON "Thread"("ownerType", "ownerId");

-- CreateIndex
CREATE INDEX "WorldEvent_ownerType_ownerId_idx" ON "WorldEvent"("ownerType", "ownerId");

-- AddForeignKey
ALTER TABLE "CampaignInvite" ADD CONSTRAINT "CampaignInvite_pcId_fkey" FOREIGN KEY ("pcId") REFERENCES "PlayerCharacter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
