'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Users, Copy, Check, Trash2, Clock } from 'lucide-react'

interface Invite {
  id: string
  email: string
  expiresAt: Date | string
  acceptedAt: Date | string | null
}

interface Member {
  id: string
  role: string
  user: { id: string; name: string | null; email: string }
}

interface Props {
  campaignId: string
  initialInvites: Invite[]
  members: Member[]
}

export function InvitePlayers({ campaignId, initialInvites, members }: Props) {
  const router = useRouter()
  const [invites, setInvites] = useState<Invite[]>(initialInvites)
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newInviteUrl, setNewInviteUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setSending(true)
    setError(null)
    setNewInviteUrl(null)

    const res = await fetch(`/api/v1/campaigns/${campaignId}/invites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email: email.trim() }),
    })

    const data = await res.json()
    if (res.ok) {
      setInvites([data.invite, ...invites])
      setNewInviteUrl(data.inviteUrl)
      setEmail('')
      router.refresh()
    } else {
      setError(data.error ?? 'Failed to create invite')
    }
    setSending(false)
  }

  async function copyInviteUrl(url: string) {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function revokeInvite(inviteId: string) {
    await fetch(`/api/v1/campaigns/${campaignId}/invites/${inviteId}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    setInvites(invites.filter(i => i.id !== inviteId))
    router.refresh()
  }

  const players = members.filter(m => m.role === 'PLAYER')

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" />
          Players
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {players.length > 0 && (
          <div className="space-y-2">
            {players.map((member) => (
              <div key={member.id} className="flex items-center gap-3 text-sm">
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                  {(member.user.name ?? member.user.email)[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{member.user.name ?? member.user.email}</p>
                  {member.user.name && (
                    <p className="text-xs text-muted-foreground truncate">{member.user.email}</p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">Player</span>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleInvite} className="space-y-2">
          <div className="flex gap-2">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="player@example.com"
              className="flex-1"
            />
            <Button type="submit" disabled={sending || !email.trim()} size="sm">
              {sending ? 'Sending...' : 'Invite'}
            </Button>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>

        {newInviteUrl && (
          <div className="p-3 bg-muted rounded-md space-y-2">
            <p className="text-xs text-muted-foreground">Share this link with your player:</p>
            <div className="flex gap-2">
              <code className="text-xs flex-1 truncate" title={newInviteUrl}>{newInviteUrl}</code>
              <button
                onClick={() => copyInviteUrl(newInviteUrl)}
                className="text-muted-foreground hover:text-foreground shrink-0"
                aria-label="Copy invite link"
              >
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>
        )}

        {invites.filter(i => !i.acceptedAt).length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pending Invites</p>
            {invites.filter(i => !i.acceptedAt).map((invite) => (
              <div key={invite.id} className="flex items-center gap-2 text-sm">
                <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="flex-1 truncate text-muted-foreground">{invite.email}</span>
                <button
                  onClick={() => revokeInvite(invite.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  aria-label="Revoke invite"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {players.length === 0 && invites.filter(i => !i.acceptedAt).length === 0 && (
          <p className="text-sm text-muted-foreground">No players yet. Invite them above.</p>
        )}
      </CardContent>
    </Card>
  )
}
