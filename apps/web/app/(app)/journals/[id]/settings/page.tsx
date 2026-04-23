import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth-server'
import { prisma } from '@grimoire/db'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DeleteEntityButton } from '@/components/entities/delete-entity-button'
import { SettingsClient } from './settings-client'

export const metadata: Metadata = { title: 'Journal settings' }

interface Props {
  params: Promise<{ id: string }>
}

export default async function JournalSettingsPage({ params }: Props) {
  const { id } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/sign-in')

  const journal = await prisma.journal.findFirst({
    where: { id, deletedAt: null },
    include: { linkedCampaign: { select: { id: true, name: true } } },
  })
  if (!journal) notFound()
  if (journal.ownerId !== session.user.id) notFound()

  // Resolve the active mirror (if any) by looking up a journal-side PC
  // that has a mirror row. There's at most one in the v1 model.
  const mirrorRow = await prisma.playerCharacterMirror.findFirst({
    where: { journalPc: { ownerType: 'JOURNAL', ownerId: journal.id, deletedAt: null } },
    include: {
      journalPc: { select: { id: true, name: true } },
      campaignPc: { select: { ownerId: true } },
    },
  })

  // Only surface the mirror banner when it points at the currently-
  // linked campaign. A stale mirror (campaignPc belongs to a
  // different campaign) doesn't get rendered; it'll be torn down on
  // the next re-link.
  const mirror =
    mirrorRow && journal.linkedCampaignId === mirrorRow.campaignPc.ownerId
      ? {
          journalPcId: mirrorRow.journalPc.id,
          journalPcName: mirrorRow.journalPc.name,
        }
      : null

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <p className="text-sm text-muted-foreground mb-1">
          <Link href="/journals" className="hover:underline">Journals</Link>
          {' / '}
          <Link href={`/journals/${journal.id}`} className="hover:underline">{journal.name}</Link>
          {' / '}
          <span>Settings</span>
        </p>
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Journal details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><span className="text-muted-foreground">Name:</span> {journal.name}</p>
          <p>
            <span className="text-muted-foreground">Created:</span>{' '}
            {journal.createdAt.toLocaleDateString()}
          </p>
          <p className="text-xs text-muted-foreground">
            Rename from the journal home page.
          </p>
        </CardContent>
      </Card>

      <SettingsClient
        journalId={journal.id}
        linkedCampaign={journal.linkedCampaign ?? null}
        mirror={mirror}
      />

      <div className="flex items-center justify-end pt-8 mt-8 border-t">
        <DeleteEntityButton
          entityName={journal.name}
          deleteEndpoint={`/api/v1/journals/${journal.id}`}
          redirectTo="/journals"
        />
      </div>
    </div>
  )
}
