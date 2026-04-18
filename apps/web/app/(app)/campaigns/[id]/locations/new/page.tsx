import type { Metadata } from 'next'
import { NewLocationForm } from './new-location-form'

export const metadata: Metadata = { title: 'New Location' }

interface Props { params: Promise<{ id: string }> }

export default async function NewLocationPage({ params }: Props) {
  const { id: campaignId } = await params
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8"><h1 className="text-3xl font-bold">New Location</h1><p className="text-muted-foreground mt-1">Add a place to your campaign</p></div>
      <NewLocationForm campaignId={campaignId} />
    </div>
  )
}
