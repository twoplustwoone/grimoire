import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth-server'
import { prisma } from '@grimoire/db'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeaderAction } from '@/components/layout/page-header-action'
import { Plus, MapPin, Users } from 'lucide-react'
import { pluralize } from '@/lib/utils'

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const campaign = await prisma.campaign.findUnique({ where: { id }, select: { name: true } })
  return { title: `Locations — ${campaign?.name ?? 'Campaign'}` }
}

export default async function LocationsPage({ params }: Props) {
  const { id: campaignId } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/sign-in')

  const membership = await prisma.campaignMembership.findFirst({
    where: { campaignId, userId: session.user.id },
    include: { campaign: { select: { name: true } } },
  })
  if (!membership) notFound()

  const list = await prisma.location.findMany({
    where: { campaignId, deletedAt: null },
    include: {
      parent: { select: { id: true, name: true } },
      npcs: { where: { deletedAt: null }, select: { id: true } },
    },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <p className="text-sm text-muted-foreground mb-1">
            <Link href="/campaigns" className="hover:underline">Campaigns</Link>{' / '}
            <Link href={`/campaigns/${campaignId}`} className="hover:underline">{membership.campaign.name}</Link>{' / '}Locations
          </p>
          <h1 className="text-3xl font-bold">Locations</h1>
        </div>
        <PageHeaderAction href={`/campaigns/${campaignId}/locations/new`}><Plus className="h-4 w-4 mr-2" />New Location</PageHeaderAction>
      </div>

      {list.length === 0 ? (
        <Card className="text-center py-16"><CardContent><p className="text-muted-foreground mb-4">No locations yet.</p><PageHeaderAction href={`/campaigns/${campaignId}/locations/new`}><Plus className="h-4 w-4 mr-2" />New Location</PageHeaderAction></CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {list.map((loc) => (
            <Link key={loc.id} href={`/campaigns/${campaignId}/locations/${loc.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="py-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{loc.name}</CardTitle>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`}>{loc.status}</span>
                  </div>
                  {loc.description && <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{loc.description}</p>}
                  <div className="flex gap-4 mt-2">
                    {loc.parent && <span className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />in {loc.parent.name}</span>}
                    {loc.npcs.length > 0 && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Users className="h-3 w-3" />{pluralize(loc.npcs.length, 'NPC', 'NPCs')}</span>}
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
