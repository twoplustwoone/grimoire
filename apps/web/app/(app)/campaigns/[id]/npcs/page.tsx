import { headers } from 'next/headers'
import { auth } from '@/lib/auth-server'
import { prisma } from '@grimoire/db'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, MapPin, Shield } from 'lucide-react'

interface Props {
  params: Promise<{ id: string }>
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  INACTIVE: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  DEAD: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  DESTROYED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  RETIRED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
}

export default async function NPCsPage({ params }: Props) {
  const { id: campaignId } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/sign-in')

  const membership = await prisma.campaignMembership.findFirst({
    where: { campaignId, userId: session.user.id },
    include: { campaign: { select: { name: true } } },
  })
  if (!membership) notFound()

  const npcList = await prisma.nPC.findMany({
    where: { campaignId, deletedAt: null },
    include: {
      location: { select: { id: true, name: true } },
      factionMemberships: {
        include: { faction: { select: { id: true, name: true } } },
      },
    },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-sm text-muted-foreground mb-1">
            <Link href="/campaigns" className="hover:underline">Campaigns</Link>
            {' / '}
            <Link href={`/campaigns/${campaignId}`} className="hover:underline">
              {membership.campaign.name}
            </Link>
            {' / '}
            NPCs
          </p>
          <h1 className="text-3xl font-bold">NPCs</h1>
        </div>
        <Button asChild>
          <Link href={`/campaigns/${campaignId}/npcs/new`}>
            <Plus className="h-4 w-4 mr-2" />
            New NPC
          </Link>
        </Button>
      </div>

      {npcList.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent>
            <p className="text-muted-foreground mb-4">No NPCs yet. Add the first character.</p>
            <Button asChild>
              <Link href={`/campaigns/${campaignId}/npcs/new`}>
                <Plus className="h-4 w-4 mr-2" />
                New NPC
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {npcList.map((npc) => (
            <Link key={npc.id} href={`/campaigns/${campaignId}/npcs/${npc.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="py-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{npc.name}</CardTitle>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[npc.status] ?? ''}`}>
                      {npc.status}
                    </span>
                  </div>
                  {npc.description && (
                    <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{npc.description}</p>
                  )}
                  <div className="flex gap-4 mt-2">
                    {npc.location && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {npc.location.name}
                      </span>
                    )}
                    {npc.factionMemberships.length > 0 && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Shield className="h-3 w-3" />
                        {npc.factionMemberships.map(fm => fm.faction.name).join(', ')}
                      </span>
                    )}
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
