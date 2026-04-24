import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth-server'
import { prisma } from '@grimoire/db'

export async function requireJournalOwner(journalId: string) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/sign-in')

  const journal = await prisma.journal.findFirst({
    where: { id: journalId, deletedAt: null },
    select: {
      id: true,
      name: true,
      ownerId: true,
      linkedCampaignId: true,
    },
  })
  if (!journal || journal.ownerId !== session.user.id) notFound()

  return { journal, session }
}
