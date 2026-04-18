-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "mentions" JSONB;

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "summaryMentions" JSONB;
