import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth-server'
import { prisma } from '@grimoire/db'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, MapPin, Shield, GitBranch, Search, Calendar, Plus } from 'lucide-react'
import { CampaignEditableFields } from '@/components/entities/campaign-editable-fields'
import { DeleteEntityButton } from '@/components/entities/delete-entity-button'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const campaign = await prisma.campaign.findUnique({ where: { id }, select: { name: true } })
  return { title: campaign?.name ?? 'Campaign' }
}

const sections = [
  { name: 'Sessions', href: 'sessions', icon: Calendar, description: 'Track play sessions and generate recaps' },
  { name: 'NPCs', href: 'npcs', icon: Users, description: 'Named characters in the world' },
  { name: 'Locations', href: 'locations', icon: MapPin, description: 'Places the party has visited or heard of' },
  { name: 'Factions', href: 'factions', icon: Shield, description: 'Organizations and their agendas' },
  { name: 'Threads', href: 'threads', icon: GitBranch, description: 'Unresolved plot threads' },
  { name: 'Clues', href: 'clues', icon: Search, description: 'Information the party has discovered' },
]

export default async function CampaignPage({ params }: Props) {
  const { id } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/sign-in')

  const membership = await prisma.campaignMembership.findFirst({
    where: { campaignId: id, userId: session.user.id },
    include: { campaign: true },
  })

  if (!membership) notFound()

  const campaign = membership.campaign

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground mb-1">
              <Link href="/campaigns" className="hover:underline">Campaigns</Link>
              {' / '}
              <span>{campaign.name}</span>
            </p>
            <CampaignEditableFields
              campaignId={campaign.id}
              name={campaign.name}
              description={campaign.description}
            />
          </div>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full mt-2 ml-4">
            {membership.role}
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => {
          const Icon = section.icon
          return (
            <Link key={section.name} href={`/campaigns/${id}/${section.href}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {section.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{section.description}</p>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {membership.role === 'GM' && (
        <div className="mt-8 pt-6 border-t border-destructive/20">
          <p className="text-sm text-muted-foreground mb-3">Danger zone</p>
          <DeleteEntityButton
            entityName={campaign.name}
            deleteEndpoint={`/api/v1/campaigns/${campaign.id}`}
            redirectTo="/campaigns"
            warningText="This will permanently delete the campaign and ALL associated data — NPCs, locations, sessions, notes, and everything else. This cannot be undone."
          />
        </div>
      )}
    </div>
  )
}
