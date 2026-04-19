'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface PlayerOption {
  userId: string
  label: string
}

interface Props {
  campaignId: string
  players: PlayerOption[]
}

export function NewPlayerCharacterForm({ campaignId, players }: Props) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [linkedUserId, setLinkedUserId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch(`/api/v1/campaigns/${campaignId}/player-characters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        name,
        description,
        linkedUserId: linkedUserId || null,
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Failed to create player character')
      setLoading(false)
      return
    }

    const pc = await res.json()
    router.push(`/campaigns/${campaignId}/player-characters/${pc.id}`)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Player Character Details</CardTitle>
        <CardDescription>Reveal this PC to the table once created — all current players will see it automatically.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Serafine Ashveil"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A half-elf ranger with a troubled past..."
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="linkedUser">Linked Player (optional)</Label>
            <select
              id="linkedUser"
              value={linkedUserId}
              onChange={(e) => setLinkedUserId(e.target.value)}
              className="w-full text-sm border rounded-md px-3 py-2 bg-background"
            >
              <option value="">Unlinked</option>
              {players.map(p => (
                <option key={p.userId} value={p.userId}>{p.label}</option>
              ))}
            </select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? 'Creating...' : 'Create PC'}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
