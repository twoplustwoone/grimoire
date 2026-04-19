'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Eye, X, ChevronDown } from 'lucide-react'
import { PlayerPortalView } from '@/app/(app)/portal/[campaignId]/player-portal-view'

interface Member {
  userId: string
  name: string | null
  email: string
}

type PortalData = Parameters<typeof PlayerPortalView>[0]['data']

interface Props {
  campaignId: string
  players: Member[]
}

export function PlayerPreview({ campaignId, players }: Props) {
  const [previewingPlayer, setPreviewingPlayer] = useState<Member | null>(null)
  const [portalData, setPortalData] = useState<PortalData | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPlayerSelect, setShowPlayerSelect] = useState(false)

  if (players.length === 0) return null

  async function loadPreview(player: Member) {
    setLoading(true)
    setPreviewingPlayer(player)
    setShowPlayerSelect(false)

    const res = await fetch(
      `/api/v1/campaigns/${campaignId}/reveals/preview?userId=${player.userId}`,
      { credentials: 'include' }
    )

    if (res.ok) {
      const data = await res.json()
      setPortalData(data.data as PortalData)
    }
    setLoading(false)
  }

  function closePreview() {
    setPreviewingPlayer(null)
    setPortalData(null)
    setShowPlayerSelect(false)
  }

  if (!previewingPlayer) {
    return (
      <div className="relative">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPlayerSelect(v => !v)}
          className="flex items-center gap-2"
        >
          <Eye className="h-4 w-4" />
          Preview as Player
          <ChevronDown className="h-3 w-3" />
        </Button>

        {showPlayerSelect && (
          <div className="absolute top-full left-0 mt-1 bg-card border rounded-lg shadow-lg z-10 min-w-[200px]">
            <div className="px-3 py-2 border-b">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                View as
              </p>
            </div>
            {players.map((player) => (
              <button
                key={player.userId}
                onClick={() => loadPreview(player)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center gap-2"
              >
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                  {(player.name ?? player.email)[0].toUpperCase()}
                </div>
                <span className="truncate">{player.name ?? player.email}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="relative flex items-center justify-between px-4 py-2.5 bg-primary/10 border border-primary/20 rounded-lg">
        <div className="flex items-center gap-2 text-sm">
          <Eye className="h-4 w-4 text-primary" />
          <span className="text-muted-foreground">Previewing as</span>
          <span className="font-medium">
            {previewingPlayer.name ?? previewingPlayer.email}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPlayerSelect(v => !v)}
            className="text-xs text-primary hover:underline"
          >
            Switch player
          </button>
          <button
            onClick={closePreview}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close preview"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {showPlayerSelect && (
          <div className="absolute top-full right-0 mt-1 bg-card border rounded-lg shadow-lg z-10 min-w-[200px]">
            <div className="px-3 py-2 border-b">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                View as
              </p>
            </div>
            {players.map((player) => (
              <button
                key={player.userId}
                onClick={() => loadPreview(player)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center gap-2"
              >
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                  {(player.name ?? player.email)[0].toUpperCase()}
                </div>
                <span className="truncate">{player.name ?? player.email}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground py-8 text-center">
          Loading {previewingPlayer.name ?? previewingPlayer.email}&apos;s view...
        </div>
      ) : portalData ? (
        <div className="border rounded-xl p-4 bg-card/50">
          <PlayerPortalView data={portalData} />
        </div>
      ) : null}
    </div>
  )
}
