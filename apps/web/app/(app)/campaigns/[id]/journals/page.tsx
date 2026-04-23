import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth-server'
import { prisma } from '@grimoire/db'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const campaign = await prisma.campaign.findUnique({ where: { id }, select: { name: true } })
  return { title: `Shared journals — ${campaign?.name ?? 'Campaign'}` }
}

const JOURNAL_ENTITY_SCOPES = new Set(['NPC', 'LOCATION', 'FACTION', 'THREAD', 'CLUE'])

export default async function CampaignJournalsPage({ params }: Props) {
  const { id: campaignId } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/sign-in')

  const membership = await prisma.campaignMembership.findFirst({
    where: { campaignId, userId: session.user.id },
    include: { campaign: { select: { name: true } } },
  })
  if (!membership) notFound()
  const isGM = membership.role === 'GM' || membership.role === 'CO_GM'
  if (!isGM) notFound()

  // Journals with at least one share row (invisibility rule: zero
  // shares means the player has opted out entirely and the GM must
  // not see any signal that the journal exists).
  const journals = await prisma.journal.findMany({
    where: {
      linkedCampaignId: campaignId,
      deletedAt: null,
      shares: { some: {} },
    },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      shares: { select: { sharedEntityType: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <p className="text-sm text-muted-foreground mb-1">
          <Link href="/campaigns" className="hover:underline">Campaigns</Link>
          {' / '}
          <Link href={`/campaigns/${campaignId}`} className="hover:underline">{membership.campaign.name}</Link>
          {' / '}
          <span>Journals</span>
        </p>
        <h1 className="text-3xl font-bold">Player journals</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Read-only view of journal content players have chosen to share. Sharing is always opt-in.
        </p>
      </div>

      {journals.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No players have shared journal content yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {journals.map((j) => {
            const isJournalWide = j.shares.some((s) => s.sharedEntityType === 'JOURNAL')
            const captures = j.shares.filter((s) => s.sharedEntityType === 'CAPTURE').length
            const entities = j.shares.filter((s) => JOURNAL_ENTITY_SCOPES.has(s.sharedEntityType)).length
            const pc = j.shares.some((s) => s.sharedEntityType === 'PLAYER_CHARACTER')
            const ownerName = j.owner.name ?? j.owner.email

            const summaryParts: string[] = []
            if (isJournalWide) summaryParts.push('Full journal')
            if (captures > 0) summaryParts.push(`${captures} capture${captures === 1 ? '' : 's'}`)
            if (entities > 0) summaryParts.push(`${entities} entit${entities === 1 ? 'y' : 'ies'}`)
            if (pc) summaryParts.push('Backstory')

            return (
              <Link
                key={j.id}
                href={`/campaigns/${campaignId}/journals/${j.id}`}
                className="block"
              >
                <Card className="hover:border-foreground/30 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <CardTitle className="text-lg">{ownerName}</CardTitle>
                      {isJournalWide && <Badge variant="secondary">Full journal shared</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground">
                      {summaryParts.length > 0 ? summaryParts.join(' · ') : 'Nothing shared'}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
