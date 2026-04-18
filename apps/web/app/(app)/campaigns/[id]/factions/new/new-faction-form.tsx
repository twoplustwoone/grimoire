'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function NewFactionForm({ campaignId }: { campaignId: string }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [agenda, setAgenda] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch(`/api/v1/campaigns/${campaignId}/factions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ name, description, agenda }),
    })

    if (!res.ok) { setError((await res.json().catch(() => ({}))).error ?? 'Failed'); setLoading(false); return }
    const faction = await res.json()
    router.push(`/campaigns/${campaignId}/factions/${faction.id}`)
  }

  return (
    <Card><CardHeader><CardTitle>Faction Details</CardTitle><CardDescription>Add members from the NPC page after creation</CardDescription></CardHeader>
      <CardContent><form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2"><Label htmlFor="name">Name</Label><Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Zhentarim" required /></div>
        <div className="space-y-2"><Label htmlFor="description">Description</Label><Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A shadowy network..." rows={3} /></div>
        <div className="space-y-2"><Label htmlFor="agenda">Agenda</Label><Textarea id="agenda" value={agenda} onChange={(e) => setAgenda(e.target.value)} placeholder="Control trade routes..." rows={2} /></div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-3 pt-2"><Button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create Faction'}</Button><Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button></div>
      </form></CardContent></Card>
  )
}
