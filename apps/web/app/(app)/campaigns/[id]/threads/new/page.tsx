import type { Metadata } from 'next'
import { NewThreadForm } from './new-thread-form'

export const metadata: Metadata = { title: 'New Thread' }

interface Props { params: Promise<{ id: string }> }

export default async function NewThreadPage({ params }: Props) {
  const { id: campaignId } = await params
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8"><h1 className="text-3xl font-bold">New Thread</h1><p className="text-muted-foreground mt-1">Track an unresolved plot thread</p></div>
      <NewThreadForm campaignId={campaignId} />
    </div>
  )
}
