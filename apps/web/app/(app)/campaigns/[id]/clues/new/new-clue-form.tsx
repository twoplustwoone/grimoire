'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function NewClueForm({ campaignId }: { campaignId: string }) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch(`/api/v1/campaigns/${campaignId}/clues`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ title, description }),
    })

    if (!res.ok) { setError((await res.json().catch(() => ({}))).error ?? 'Failed'); setLoading(false); return }
    const clue = await res.json()
    router.push(`/campaigns/${campaignId}/clues/${clue.id}`)
  }

  return (
    <Card><CardHeader><CardTitle>Clue Details</CardTitle><CardDescription>You can link to a session later</CardDescription></CardHeader>
      <CardContent><form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2"><Label htmlFor="title">Title</Label><Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="The vault is beneath the tavern" required /></div>
        <div className="space-y-2"><Label htmlFor="description">Description</Label><Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Overheard from a drunk patron..." rows={4} /></div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-3 pt-2"><Button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create Clue'}</Button><Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button></div>
      </form></CardContent></Card>
  )
}
