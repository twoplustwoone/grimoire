import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth-server'
import { prisma } from '@grimoire/db'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Plus } from 'lucide-react'
import { redirect } from 'next/navigation'
import { CampaignsList } from './campaigns-list'

export const metadata: Metadata = { title: 'Campaigns' }

export default async function CampaignsPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/sign-in')

  const memberships = await prisma.campaignMembership.findMany({
    where: { userId: session.user.id },
    include: { campaign: true },
    orderBy: { campaign: { updatedAt: 'desc' } },
  })

  const campaigns = memberships.map(({ campaign, role }) => ({
    id: campaign.id,
    name: campaign.name,
    description: campaign.description,
    status: campaign.status,
    updatedAt: campaign.updatedAt,
    role,
  }))

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Campaigns</h1>
          <p className="text-muted-foreground mt-1">Your active and past campaigns</p>
        </div>
        <Button asChild>
          <Link href="/campaigns/new">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Campaign</span>
          </Link>
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent>
            <p className="text-muted-foreground mb-4">No campaigns yet. Create your first one.</p>
            <Button asChild>
              <Link href="/campaigns/new">
                <Plus className="h-4 w-4" />
                New Campaign
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <CampaignsList campaigns={campaigns} />
      )}
    </div>
  )
}
