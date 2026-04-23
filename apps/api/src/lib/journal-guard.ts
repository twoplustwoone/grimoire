import { prisma } from '@grimoire/db'

/** Guard shared across every journal-scoped route.
 *  - 404 if the journal is missing or soft-deleted
 *  - 403 if the caller isn't the owner
 *  - otherwise returns the journal (with its linkedCampaign joined
 *    — cheap, every call site ends up needing it)
 */
export async function guardJournal(userId: string, journalId: string) {
  const journal = await prisma.journal.findFirst({
    where: { id: journalId, deletedAt: null },
    include: { linkedCampaign: { select: { id: true, name: true } } },
  })
  if (!journal) return { status: 404 as const }
  if (journal.ownerId !== userId) return { status: 403 as const }
  return { status: 200 as const, journal }
}
