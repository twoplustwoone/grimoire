import type { Metadata } from 'next'
import { NewCampaignForm } from './new-campaign-form'

export const metadata: Metadata = { title: 'New Campaign' }

export default function NewCampaignPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">New Campaign</h1>
        <p className="text-muted-foreground mt-1">Set up a new campaign to start tracking</p>
      </div>
      <NewCampaignForm />
    </div>
  )
}
