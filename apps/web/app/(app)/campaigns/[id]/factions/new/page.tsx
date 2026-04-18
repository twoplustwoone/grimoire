import type { Metadata } from 'next'
import { NewFactionForm } from './new-faction-form'

export const metadata: Metadata = { title: 'New Faction' }

interface Props { params: Promise<{ id: string }> }

export default async function NewFactionPage({ params }: Props) {
  const { id: campaignId } = await params
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8"><h1 className="text-3xl font-bold">New Faction</h1><p className="text-muted-foreground mt-1">Add an organization to your campaign</p></div>
      <NewFactionForm campaignId={campaignId} />
    </div>
  )
}
