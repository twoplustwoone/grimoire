'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const urgencyOptions = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const

export function NewThreadForm({ campaignId }: { campaignId: string }) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [urgency, setUrgency] = useState<string>('MEDIUM')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch(`/api/v1/campaigns/${campaignId}/threads`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ title, description, urgency }),
    })

    if (!res.ok) { setError((await res.json().catch(() => ({}))).error ?? 'Failed'); setLoading(false); return }
    const thread = await res.json()
    router.push(`/campaigns/${campaignId}/threads/${thread.id}`)
  }

  return (
    <Card><CardHeader><CardTitle>Thread Details</CardTitle><CardDescription>You can link entities and update status later</CardDescription></CardHeader>
      <CardContent><form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2"><Label htmlFor="title">Title</Label><Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Who stole the Stone of Golorr?" required /></div>
        <div className="space-y-2"><Label htmlFor="description">Description</Label><Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="The party learned that..." rows={4} /></div>
        <div className="space-y-2">
          <Label htmlFor="urgency">Urgency</Label>
          <select id="urgency" value={urgency} onChange={(e) => setUrgency(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring">
            {urgencyOptions.map((u) => (<option key={u} value={u}>{u}</option>))}
          </select>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-3 pt-2"><Button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create Thread'}</Button><Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button></div>
      </form></CardContent></Card>
  )
}
