'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Eye, EyeOff, Users, User } from 'lucide-react'

interface Member {
  userId: string
  name: string | null
  email: string
}

interface Reveal {
  id: string
  userId: string | null
  displayName: string | null
  displayDescription: string | null
}

interface Props {
  campaignId: string
  entityType: string
  entityId: string
  entityName: string
  members: Member[]
}

export function EntityRevealPanel({ campaignId, entityType, entityId, entityName, members }: Props) {
  const router = useRouter()
  const [reveals, setReveals] = useState<Reveal[]>([])
  const [loading, setLoading] = useState(true)
  const [editingRevealId, setEditingRevealId] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [displayDescription, setDisplayDescription] = useState('')

  useEffect(() => {
    fetch(`/api/v1/campaigns/${campaignId}/reveals?entityType=${entityType}&entityId=${entityId}`, {
      credentials: 'include',
    })
      .then(r => r.json())
      .then(data => { setReveals(data); setLoading(false) })
  }, [campaignId, entityType, entityId])

  const allPlayersReveal = reveals.find(r => r.userId === null)
  const playerReveals = new Map(reveals.filter(r => r.userId !== null).map(r => [r.userId!, r]))

  async function toggleAllPlayers() {
    if (allPlayersReveal) {
      await fetch(`/api/v1/campaigns/${campaignId}/reveals/${allPlayersReveal.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      setReveals(reveals.filter(r => r.id !== allPlayersReveal.id))
    } else {
      const res = await fetch(`/api/v1/campaigns/${campaignId}/reveals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ entityType, entityId, userId: null }),
      })
      const data = await res.json()
      setReveals([...reveals, data])
    }
    router.refresh()
  }

  async function togglePlayerReveal(userId: string) {
    const existing = playerReveals.get(userId)
    if (existing) {
      await fetch(`/api/v1/campaigns/${campaignId}/reveals/${existing.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      setReveals(reveals.filter(r => r.id !== existing.id))
    } else {
      const res = await fetch(`/api/v1/campaigns/${campaignId}/reveals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ entityType, entityId, userId }),
      })
      const data = await res.json()
      setReveals([...reveals, data])
    }
    router.refresh()
  }

  async function saveDisplayOverride(revealId: string) {
    const res = await fetch(`/api/v1/campaigns/${campaignId}/reveals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        entityType,
        entityId,
        userId: reveals.find(r => r.id === revealId)?.userId ?? null,
        displayName: displayName || null,
        displayDescription: displayDescription || null,
      }),
    })
    const data = await res.json()
    setReveals(reveals.map(r => r.id === revealId ? data : r))
    setEditingRevealId(null)
    router.refresh()
  }

  if (loading) return null
  if (members.length === 0) return null

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Eye className="h-4 w-4" />
          Player Visibility
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>All Players</span>
          </div>
          <button
            onClick={toggleAllPlayers}
            className={`p-1.5 rounded-md transition-colors ${
              allPlayersReveal
                ? 'text-green-500 bg-green-500/10 hover:bg-green-500/20'
                : 'text-muted-foreground hover:bg-muted'
            }`}
            aria-label={allPlayersReveal ? 'Hide from all players' : 'Reveal to all players'}
          >
            {allPlayersReveal ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
        </div>

        {members.map((member) => {
          const reveal = playerReveals.get(member.userId)
          const isRevealed = !!reveal || !!allPlayersReveal
          const isEditing = editingRevealId === (reveal?.id ?? `new-${member.userId}`)

          return (
            <div key={member.userId} className="space-y-2">
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span>{member.name ?? member.email}</span>
                    {reveal?.displayName && (
                      <span className="text-xs text-muted-foreground ml-2">
                        sees as &ldquo;{reveal.displayName}&rdquo;
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {isRevealed && (
                    <button
                      onClick={() => {
                        setEditingRevealId(reveal?.id ?? `new-${member.userId}`)
                        setDisplayName(reveal?.displayName ?? '')
                        setDisplayDescription(reveal?.displayDescription ?? '')
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-muted transition-colors"
                    >
                      alias
                    </button>
                  )}
                  <button
                    onClick={() => togglePlayerReveal(member.userId)}
                    className={`p-1.5 rounded-md transition-colors ${
                      reveal
                        ? 'text-green-500 bg-green-500/10 hover:bg-green-500/20'
                        : allPlayersReveal
                        ? 'text-green-500/50 bg-green-500/5'
                        : 'text-muted-foreground hover:bg-muted'
                    }`}
                    aria-label={reveal ? 'Hide from player' : 'Reveal to player'}
                    title={allPlayersReveal && !reveal ? 'Revealed via All Players' : undefined}
                  >
                    {isRevealed ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {isEditing && (
                <div className="pl-6 space-y-2 pb-2">
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={`Display name (leave blank to show "${entityName}")`}
                    className="h-8 text-sm"
                    autoFocus
                  />
                  <Input
                    value={displayDescription}
                    onChange={(e) => setDisplayDescription(e.target.value)}
                    placeholder="Display description (optional override)"
                    className="h-8 text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => reveal ? saveDisplayOverride(reveal.id) : togglePlayerReveal(member.userId).then(() => setEditingRevealId(null))}
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => setEditingRevealId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
