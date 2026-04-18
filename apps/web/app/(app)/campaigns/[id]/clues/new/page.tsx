import type { Metadata } from 'next'
import { NewClueForm } from './new-clue-form'

export const metadata: Metadata = { title: 'New Clue' }

interface Props { params: Promise<{ id: string }> }

export default async function NewCluePage({ params }: Props) {
  const { id: campaignId } = await params
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8"><h1 className="text-3xl font-bold">New Clue</h1><p className="text-muted-foreground mt-1">Record information the party has discovered</p></div>
      <NewClueForm campaignId={campaignId} />
    </div>
  )
}
