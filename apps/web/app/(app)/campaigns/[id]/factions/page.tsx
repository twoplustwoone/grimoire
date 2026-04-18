import { headers } from 'next/headers'
import { auth } from '@/lib/auth-server'
import { prisma } from '@grimoire/db'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Users } from 'lucide-react'
import { pluralize } from '@/lib/utils'

interface Props { params: Promise<{ id: string }> }

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  INACTIVE: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  DESTROYED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

export default async function FactionsPage({ params }: Props) {
  const { id: campaignId } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/sign-in')

  const membership = await prisma.campaignMembership.findFirst({ where: { campaignId, userId: session.user.id }, include: { campaign: { select: { name: true } } } })
  if (!membership) notFound()

  const list = await prisma.faction.findMany({
    where: { campaignId, deletedAt: null },
    include: { memberships: { include: { npc: { select: { id: true, name: true } } } } },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-sm text-muted-foreground mb-1">
            <Link href="/campaigns" className="hover:underline">Campaigns</Link>{' / '}
            <Link href={`/campaigns/${campaignId}`} className="hover:underline">{membership.campaign.name}</Link>{' / '}Factions
          </p>
          <h1 className="text-3xl font-bold">Factions</h1>
        </div>
        <Button asChild><Link href={`/campaigns/${campaignId}/factions/new`}><Plus className="h-4 w-4 mr-2" />New Faction</Link></Button>
      </div>

      {list.length === 0 ? (
        <Card className="text-center py-16"><CardContent><p className="text-muted-foreground mb-4">No factions yet.</p><Button asChild><Link href={`/campaigns/${campaignId}/factions/new`}><Plus className="h-4 w-4 mr-2" />New Faction</Link></Button></CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {list.map((f) => (
            <Link key={f.id} href={`/campaigns/${campaignId}/factions/${f.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="py-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{f.name}</CardTitle>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[f.status] ?? ''}`}>
                      {f.status}
                    </span>
                  </div>
                  {f.agenda && <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{f.agenda}</p>}
                  {f.memberships.length > 0 && <span className="flex items-center gap-1 text-xs text-muted-foreground mt-2"><Users className="h-3 w-3" />{pluralize(f.memberships.length, 'member', 'members')}</span>}
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
