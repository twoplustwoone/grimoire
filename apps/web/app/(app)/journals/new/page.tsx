import type { Metadata } from 'next'
import { NewJournalForm } from './new-journal-form'

export const metadata: Metadata = { title: 'New Journal' }

export default function NewJournalPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">New Journal</h1>
        <p className="text-muted-foreground mt-1">Start a personal chronicle — link it to a campaign later</p>
      </div>
      <NewJournalForm />
    </div>
  )
}
