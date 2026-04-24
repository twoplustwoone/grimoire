import type { Metadata } from 'next'
import { NewSessionForm } from './new-session-form'

export const metadata: Metadata = { title: 'New Session' }

interface Props { params: Promise<{ id: string }> }

export default async function NewSessionPage({ params }: Props) {
  const { id: campaignId } = await params
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">New Session</h1>
        <p className="text-muted-foreground mt-1">Title and date are optional — you can add them later</p>
      </div>
      <NewSessionForm campaignId={campaignId} />
    </div>
  )
}
