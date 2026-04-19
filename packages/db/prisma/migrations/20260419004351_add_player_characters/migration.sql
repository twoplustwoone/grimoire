/*
  Warnings:

  - You are about to drop the column `locationId` on the `PlayerCharacter` table. All the data in the column will be lost.
  - You are about to drop the column `membershipId` on the `PlayerCharacter` table. All the data in the column will be lost.
  - The `status` column on the `PlayerCharacter` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "PlayerCharacterStatus" AS ENUM ('ACTIVE', 'RETIRED', 'DECEASED');

-- DropForeignKey
ALTER TABLE "PlayerCharacter" DROP CONSTRAINT "PlayerCharacter_locationId_fkey";

-- DropForeignKey
ALTER TABLE "PlayerCharacter" DROP CONSTRAINT "PlayerCharacter_membershipId_fkey";

-- AlterTable
ALTER TABLE "PlayerCharacter" DROP COLUMN "locationId",
DROP COLUMN "membershipId",
ADD COLUMN     "linkedUserId" TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" "PlayerCharacterStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE INDEX "PlayerCharacter_campaignId_idx" ON "PlayerCharacter"("campaignId");

-- CreateIndex
CREATE INDEX "PlayerCharacter_linkedUserId_idx" ON "PlayerCharacter"("linkedUserId");

-- AddForeignKey
ALTER TABLE "PlayerCharacter" ADD CONSTRAINT "PlayerCharacter_linkedUserId_fkey" FOREIGN KEY ("linkedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
