import type { Metadata } from 'next'
import { NewNPCForm } from './new-npc-form'

export const metadata: Metadata = { title: 'New NPC' }

interface Props { params: Promise<{ id: string }> }

export default async function NewNPCPage({ params }: Props) {
  const { id: campaignId } = await params
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">New NPC</h1>
        <p className="text-muted-foreground mt-1">Add a character to your campaign</p>
      </div>
      <NewNPCForm campaignId={campaignId} />
    </div>
  )
}
