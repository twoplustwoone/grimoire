import { headers } from 'next/headers'
import { auth } from '@/lib/auth-server'
import { prisma } from '@grimoire/db'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Network } from 'lucide-react'
import { JournalGraph } from '@/components/graph/journal-graph'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const journal = await prisma.journal.findUnique({ where: { id }, select: { name: true } })
  return { title: `Graph — ${journal?.name ?? 'Journal'}` }
}

export default async function JournalGraphPage({ params }: Props) {
  const { id } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/sign-in')

  const journal = await prisma.journal.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, name: true, ownerId: true, linkedCampaignId: true },
  })
  if (!journal) notFound()
  if (journal.ownerId !== session.user.id) notFound()

  return (
    <>
      {/* Mobile: the graph isn't meaningfully usable at 375px. Mirror the
          campaign graph gate. */}
      <div className="flex md:hidden flex-col items-center justify-center h-64 gap-3 text-center px-6">
        <Network className="h-8 w-8 text-muted-foreground" />
        <p className="text-muted-foreground text-sm">
          The journal graph is best explored on a larger screen.
        </p>
      </div>

      {/* Desktop: full-bleed canvas. -m-6 escapes the `p-6` on <main> in
          apps/web/app/(app)/layout.tsx. Matches the campaign graph pattern.
          Once a second consumer lives here, promote this into a shared
          wrapper and drop the negative margin. */}
      <div className="hidden md:flex flex-col h-full -m-6">
        <div className="flex items-center gap-2 px-6 py-4 border-b bg-card shrink-0">
          <p className="text-sm text-muted-foreground">
            <Link href="/journals" className="hover:underline">Journals</Link>
            {' / '}
            <Link href={`/journals/${journal.id}`} className="hover:underline">
              {journal.name}
            </Link>
            {' / '}
            <span>Graph</span>
          </p>
        </div>
        <div className="flex-1 min-h-0">
          <JournalGraph journalId={journal.id} campaignId={journal.linkedCampaignId} />
        </div>
      </div>
    </>
  )
}
