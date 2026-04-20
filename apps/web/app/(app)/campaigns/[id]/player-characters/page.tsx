import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth-server'
import { prisma } from '@grimoire/db'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeaderAction } from '@/components/layout/page-header-action'
import { Plus, UserCircle } from 'lucide-react'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const campaign = await prisma.campaign.findUnique({ where: { id }, select: { name: true } })
  return { title: `Player Characters — ${campaign?.name ?? 'Campaign'}` }
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  RETIRED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  DECEASED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

export default async function PlayerCharactersPage({ params }: Props) {
  const { id: campaignId } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/sign-in')

  const membership = await prisma.campaignMembership.findFirst({
    where: { campaignId, userId: session.user.id },
    include: { campaign: { select: { name: true } } },
  })
  if (!membership) notFound()

  const isGM = membership.role === 'GM' || membership.role === 'CO_GM'

  const pcs = await prisma.playerCharacter.findMany({
    where: { campaignId, deletedAt: null },
    include: {
      linkedUser: { select: { id: true, name: true, email: true } },
    },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <p className="text-sm text-muted-foreground mb-1">
            <Link href="/campaigns" className="hover:underline">Campaigns</Link>
            {' / '}
            <Link href={`/campaigns/${campaignId}`} className="hover:underline">
              {membership.campaign.name}
            </Link>
            {' / '}
            Player Characters
          </p>
          <h1 className="text-3xl font-bold">Player Characters</h1>
        </div>
        {isGM && (
          <PageHeaderAction href={`/campaigns/${campaignId}/player-characters/new`}>
            <Plus className="h-4 w-4 mr-2" />
            New PC
          </PageHeaderAction>
        )}
      </div>

      {pcs.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent>
            <p className="text-muted-foreground mb-4">
              No player characters yet. Create one to track a party member.
            </p>
            {isGM && (
              <Button asChild>
                <Link href={`/campaigns/${campaignId}/player-characters/new`}>
                  <Plus className="h-4 w-4 mr-2" />
                  New PC
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {pcs.map((pc) => (
            <Link key={pc.id} href={`/campaigns/${campaignId}/player-characters/${pc.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="py-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{pc.name}</CardTitle>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[pc.status] ?? ''}`}>
                      {pc.status}
                    </span>
                  </div>
                  {pc.description && (
                    <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{pc.description}</p>
                  )}
                  <div className="flex gap-4 mt-2">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <UserCircle className="h-3 w-3" />
                      {pc.linkedUser
                        ? (pc.linkedUser.name ?? pc.linkedUser.email)
                        : 'Unlinked'}
                    </span>
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
