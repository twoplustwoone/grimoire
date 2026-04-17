import { headers } from 'next/headers'
import { auth } from '@/lib/auth-server'
import { prisma } from '@grimoire/db'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus } from 'lucide-react'
import { redirect } from 'next/navigation'

export default async function CampaignsPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/sign-in')

  const memberships = await prisma.campaignMembership.findMany({
    where: { userId: session.user.id },
    include: {
      campaign: true,
    },
    orderBy: { campaign: { updatedAt: 'desc' } },
  })

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Campaigns</h1>
          <p className="text-muted-foreground mt-1">Your active and past campaigns</p>
        </div>
        <Button asChild>
          <Link href="/campaigns/new">
            <Plus className="h-4 w-4 mr-2" />
            New Campaign
          </Link>
        </Button>
      </div>

      {memberships.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent>
            <p className="text-muted-foreground mb-4">No campaigns yet. Create your first one.</p>
            <Button asChild>
              <Link href="/campaigns/new">
                <Plus className="h-4 w-4 mr-2" />
                New Campaign
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {memberships.map(({ campaign, role }) => (
            <Link key={campaign.id} href={`/campaigns/${campaign.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{campaign.name}</CardTitle>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                      {role}
                    </span>
                  </div>
                  {campaign.description && (
                    <CardDescription className="line-clamp-2">
                      {campaign.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    {campaign.status} · Updated {new Date(campaign.updatedAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
