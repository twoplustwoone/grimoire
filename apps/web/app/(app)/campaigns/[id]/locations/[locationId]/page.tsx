import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth-server'
import { prisma } from '@grimoire/db'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MapPin, Users, Clock } from 'lucide-react'
import { LocationEditableFields } from '@/components/entities/location-editable-fields'
import { DeleteEntityButton } from '@/components/entities/delete-entity-button'
import { EntityNotes } from '@/components/entities/entity-notes'

interface Props { params: Promise<{ id: string; locationId: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locationId } = await params
  const location = await prisma.location.findUnique({ where: { id: locationId }, select: { name: true } })
  return { title: location?.name ?? 'Location' }
}

export default async function LocationDetailPage({ params }: Props) {
  const { id: campaignId, locationId } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/sign-in')

  const membership = await prisma.campaignMembership.findFirst({ where: { campaignId, userId: session.user.id }, include: { campaign: { select: { name: true } } } })
  if (!membership) notFound()

  const location = await prisma.location.findFirst({
    where: { id: locationId, campaignId, deletedAt: null },
    include: {
      parent: { select: { id: true, name: true } },
      children: { where: { deletedAt: null }, select: { id: true, name: true } },
      npcs: { where: { deletedAt: null }, select: { id: true, name: true, status: true } },
    },
  })
  if (!location) notFound()

  const notes = await prisma.note.findMany({ where: { entityType: 'LOCATION', entityId: locationId }, orderBy: { createdAt: 'desc' } })
  const changelog = await prisma.changelogEntry.findMany({ where: { entityType: 'LOCATION', entityId: locationId }, orderBy: { createdAt: 'desc' }, take: 20 })

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <p className="text-sm text-muted-foreground mb-1">
          <Link href="/campaigns" className="hover:underline">Campaigns</Link>{' / '}
          <Link href={`/campaigns/${campaignId}`} className="hover:underline">{membership.campaign.name}</Link>{' / '}
          <Link href={`/campaigns/${campaignId}/locations`} className="hover:underline">Locations</Link>{' / '}
          <span>{location.name}</span>
        </p>
        <LocationEditableFields
          campaignId={campaignId}
          locationId={locationId}
          name={location.name}
          description={location.description}
          status={location.status}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 mb-6">
        {location.parent && (
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><MapPin className="h-4 w-4" />Parent Location</CardTitle></CardHeader>
            <CardContent><Link href={`/campaigns/${campaignId}/locations/${location.parent.id}`} className="text-sm hover:underline">{location.parent.name}</Link></CardContent></Card>
        )}
        {location.children.length > 0 && (
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><MapPin className="h-4 w-4" />Sub-locations</CardTitle></CardHeader>
            <CardContent><div className="space-y-1">{location.children.map((child) => (
              <Link key={child.id} href={`/campaigns/${campaignId}/locations/${child.id}`} className="block text-sm hover:underline">{child.name}</Link>
            ))}</div></CardContent></Card>
        )}
        {location.npcs.length > 0 && (
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" />NPCs here</CardTitle></CardHeader>
            <CardContent><div className="space-y-1">{location.npcs.map((npc) => (
              <Link key={npc.id} href={`/campaigns/${campaignId}/npcs/${npc.id}`} className="block text-sm hover:underline">{npc.name} <span className="text-xs text-muted-foreground">({npc.status})</span></Link>
            ))}</div></CardContent></Card>
        )}
      </div>

      <div className="mb-4">
        <EntityNotes
          notes={notes}
          addNoteEndpoint={`/api/v1/campaigns/${campaignId}/locations/${locationId}/notes`}
        />
      </div>
      {changelog.length > 0 && (<Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" />History</CardTitle></CardHeader><CardContent><div className="space-y-2">{changelog.map((e) => (<div key={e.id} className="flex items-start justify-between text-sm"><div><span className="font-medium">{e.field}</span>{e.oldValue && e.newValue && <span className="text-muted-foreground"> changed from <span className="line-through">{e.oldValue}</span> to {e.newValue}</span>}{!e.oldValue && e.newValue && <span className="text-muted-foreground"> set to {e.newValue}</span>}</div><span className="text-xs text-muted-foreground ml-4 shrink-0">{new Date(e.createdAt).toLocaleDateString()}</span></div>))}</div></CardContent></Card>)}

      <div className="mt-8 pt-6 border-t border-destructive/20">
        <p className="text-sm text-muted-foreground mb-3">Danger zone</p>
        <DeleteEntityButton
          entityName={location.name}
          deleteEndpoint={`/api/v1/campaigns/${campaignId}/locations/${locationId}`}
          redirectTo={`/campaigns/${campaignId}/locations`}
        />
      </div>
    </div>
  )
}
