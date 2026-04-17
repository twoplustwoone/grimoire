import { headers } from 'next/headers'
import { auth } from '@/lib/auth-server'
import { prisma } from '@grimoire/db'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MapPin, Shield, Clock } from 'lucide-react'

interface Props {
  params: Promise<{ id: string; npcId: string }>
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  INACTIVE: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  DEAD: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  DESTROYED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  RETIRED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
}

export default async function NPCDetailPage({ params }: Props) {
  const { id: campaignId, npcId } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/sign-in')

  const membership = await prisma.campaignMembership.findFirst({
    where: { campaignId, userId: session.user.id },
    include: { campaign: { select: { name: true } } },
  })
  if (!membership) notFound()

  const npc = await prisma.nPC.findFirst({
    where: { id: npcId, campaignId, deletedAt: null },
    include: {
      location: { select: { id: true, name: true } },
      factionMemberships: {
        include: { faction: { select: { id: true, name: true } } },
      },
    },
  })
  if (!npc) notFound()

  const notes = await prisma.note.findMany({
    where: { entityType: 'NPC', entityId: npcId },
    orderBy: { createdAt: 'desc' },
  })

  const changelog = await prisma.changelogEntry.findMany({
    where: { entityType: 'NPC', entityId: npcId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <p className="text-sm text-muted-foreground mb-1">
          <Link href="/campaigns" className="hover:underline">Campaigns</Link>
          {' / '}
          <Link href={`/campaigns/${campaignId}`} className="hover:underline">
            {membership.campaign.name}
          </Link>
          {' / '}
          <Link href={`/campaigns/${campaignId}/npcs`} className="hover:underline">NPCs</Link>
          {' / '}
        </p>
        <div className="flex items-start justify-between">
          <h1 className="text-3xl font-bold">{npc.name}</h1>
          <span className={`text-xs px-2 py-1 rounded-full font-medium mt-2 ${statusColors[npc.status] ?? ''}`}>
            {npc.status}
          </span>
        </div>
        {npc.description && (
          <p className="text-muted-foreground mt-2">{npc.description}</p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 mb-6">
        {npc.location && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Link
                href={`/campaigns/${campaignId}/locations/${npc.location.id}`}
                className="text-sm hover:underline"
              >
                {npc.location.name}
              </Link>
            </CardContent>
          </Card>
        )}

        {npc.factionMemberships.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Factions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {npc.factionMemberships.map((fm) => (
                  <div key={fm.factionId} className="flex items-center justify-between">
                    <Link
                      href={`/campaigns/${campaignId}/factions/${fm.faction.id}`}
                      className="text-sm hover:underline"
                    >
                      {fm.faction.name}
                    </Link>
                    {fm.role && (
                      <span className="text-xs text-muted-foreground">{fm.role}</span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {notes.length > 0 && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {notes.map((note) => (
                <div key={note.id} className="text-sm border-l-2 pl-3">
                  <p>{note.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(note.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {changelog.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {changelog.map((entry) => (
                <div key={entry.id} className="flex items-start justify-between text-sm">
                  <div>
                    <span className="font-medium">{entry.field}</span>
                    {entry.oldValue && entry.newValue && (
                      <span className="text-muted-foreground">
                        {' '}changed from{' '}
                        <span className="line-through">{entry.oldValue}</span>
                        {' to '}
                        <span>{entry.newValue}</span>
                      </span>
                    )}
                    {!entry.oldValue && entry.newValue && (
                      <span className="text-muted-foreground"> set to {entry.newValue}</span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground ml-4 shrink-0">
                    {new Date(entry.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
