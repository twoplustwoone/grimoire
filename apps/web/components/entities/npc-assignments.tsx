'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MapPin, Shield, X, Plus } from 'lucide-react'
import Link from 'next/link'

interface Location {
  id: string
  name: string
}

interface Faction {
  id: string
  name: string
}

interface FactionMembership {
  factionId: string
  faction: { id: string; name: string }
  role: string | null
}

interface Props {
  campaignId: string
  npcId: string
  currentLocationId: string | null
  currentLocation: Location | null
  factionMemberships: FactionMembership[]
  availableLocations: Location[]
  availableFactions: Faction[]
}

export function NpcAssignments({
  campaignId,
  npcId,
  currentLocation,
  factionMemberships,
  availableLocations,
  availableFactions,
}: Props) {
  const router = useRouter()
  const [showLocationSelect, setShowLocationSelect] = useState(false)
  const [showFactionSelect, setShowFactionSelect] = useState(false)
  const [saving, setSaving] = useState(false)

  async function assignLocation(locationId: string | null) {
    setSaving(true)
    await fetch(`/api/v1/campaigns/${campaignId}/npcs/${npcId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ locationId }),
    })
    setSaving(false)
    setShowLocationSelect(false)
    router.refresh()
  }

  async function addFaction(factionId: string) {
    setSaving(true)
    await fetch(`/api/v1/campaigns/${campaignId}/npcs/${npcId}/factions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ factionId }),
    })
    setSaving(false)
    setShowFactionSelect(false)
    router.refresh()
  }

  async function removeFaction(factionId: string) {
    await fetch(`/api/v1/campaigns/${campaignId}/npcs/${npcId}/factions/${factionId}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    router.refresh()
  }

  function handleLocationChange(value: string) {
    if (!value) return
    assignLocation(value === 'none' ? null : value)
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 mb-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Location
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={() => setShowLocationSelect(!showLocationSelect)}
            >
              {currentLocation ? 'Change' : 'Assign'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {showLocationSelect ? (
            <div className="space-y-2">
              <select
                className="w-full text-sm border rounded-md px-2 py-1 bg-background"
                defaultValue=""
                onChange={(e) => handleLocationChange(e.target.value)}
                disabled={saving}
              >
                <option value="" disabled>Select location...</option>
                {currentLocation && (
                  <option value="none">— Remove location</option>
                )}
                {availableLocations.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setShowLocationSelect(false)}>
                Cancel
              </Button>
            </div>
          ) : currentLocation ? (
            <Link
              href={`/campaigns/${campaignId}/locations/${currentLocation.id}`}
              className="text-sm hover:underline"
            >
              {currentLocation.name}
            </Link>
          ) : (
            <p className="text-sm text-muted-foreground italic">No location assigned</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Factions
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={() => setShowFactionSelect(!showFactionSelect)}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {factionMemberships.length > 0 ? (
            <div className="space-y-1 mb-2">
              {factionMemberships.map((fm) => (
                <div key={fm.factionId} className="flex items-center justify-between">
                  <div>
                    <Link
                      href={`/campaigns/${campaignId}/factions/${fm.faction.id}`}
                      className="text-sm hover:underline"
                    >
                      {fm.faction.name}
                    </Link>
                    {fm.role && (
                      <span className="text-xs text-muted-foreground ml-2">{fm.role}</span>
                    )}
                  </div>
                  <button
                    onClick={() => removeFaction(fm.factionId)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic mb-2">No faction memberships</p>
          )}
          {showFactionSelect && (
            <div className="space-y-2 mt-2">
              <select
                className="w-full text-sm border rounded-md px-2 py-1 bg-background"
                defaultValue=""
                onChange={(e) => e.target.value && addFaction(e.target.value)}
                disabled={saving}
              >
                <option value="" disabled>Select faction...</option>
                {availableFactions
                  .filter((f) => !factionMemberships.find((fm) => fm.factionId === f.id))
                  .map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
              </select>
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setShowFactionSelect(false)}>
                Cancel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
