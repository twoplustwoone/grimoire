'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Command } from 'cmdk'
import { Search, Users, MapPin, Shield, GitBranch, Calendar, X, Lightbulb } from 'lucide-react'

interface SearchResult {
  id: string
  type: 'NPC' | 'LOCATION' | 'FACTION' | 'THREAD' | 'CLUE' | 'SESSION'
  name: string
  meta: string | null
}

const typeIcons = {
  NPC: Users,
  LOCATION: MapPin,
  FACTION: Shield,
  THREAD: GitBranch,
  CLUE: Lightbulb,
  SESSION: Calendar,
}

const typeLabels = {
  NPC: 'NPCs',
  LOCATION: 'Locations',
  FACTION: 'Factions',
  THREAD: 'Threads',
  CLUE: 'Clues',
  SESSION: 'Sessions',
}

function getEntityPath(campaignId: string, result: SearchResult): string {
  const base = `/campaigns/${campaignId}`
  switch (result.type) {
    case 'NPC': return `${base}/npcs/${result.id}`
    case 'LOCATION': return `${base}/locations/${result.id}`
    case 'FACTION': return `${base}/factions/${result.id}`
    case 'THREAD': return `${base}/threads/${result.id}`
    case 'CLUE': return `${base}/clues/${result.id}`
    case 'SESSION': return `${base}/sessions/${result.id}`
  }
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const params = useParams()
  const campaignId = params?.id as string | undefined

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (!query.trim() || !campaignId) {
      setResults([])
      return
    }

    const timeout = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(
          `/api/v1/search?campaignId=${campaignId}&q=${encodeURIComponent(query)}`,
          { credentials: 'include' }
        )
        if (res.ok) {
          const data = await res.json()
          setResults(data)
        }
      } finally {
        setLoading(false)
      }
    }, 150)

    return () => clearTimeout(timeout)
  }, [query, campaignId])

  function handleSelect(result: SearchResult) {
    if (!campaignId) return
    router.push(getEntityPath(campaignId, result))
    setOpen(false)
    setQuery('')
    setResults([])
  }

  const grouped = results.reduce((acc, r) => {
    if (!acc[r.type]) acc[r.type] = []
    acc[r.type].push(r)
    return acc
  }, {} as Record<string, SearchResult[]>)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] animate-in fade-in duration-150">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />
      <div className="relative w-full max-w-lg mx-4 bg-card border rounded-xl shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
        <Command shouldFilter={false}>
          <div className="flex items-center gap-3 px-4 py-3 border-b">
            <Search className="h-5 w-5 text-muted-foreground shrink-0" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder={campaignId ? 'Search entities...' : 'Navigate to a campaign first'}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              autoFocus
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <Command.List className="max-h-80 overflow-y-auto p-2">
            {!campaignId && (
              <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                Open a campaign to search its entities.
              </Command.Empty>
            )}

            {campaignId && !query && (
              <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                Search NPCs, locations, sessions…
              </Command.Empty>
            )}

            {campaignId && query && !loading && results.length === 0 && (
              <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                No results for &quot;{query}&quot;
              </Command.Empty>
            )}

            {loading && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Searching...
              </div>
            )}

            {Object.entries(grouped).map(([type, items]) => {
              const Icon = typeIcons[type as keyof typeof typeIcons]
              return (
                <Command.Group
                  key={type}
                  heading={typeLabels[type as keyof typeof typeLabels]}
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:text-foreground/50 [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider"
                >
                  {items.map((result) => (
                    <Command.Item
                      key={result.id}
                      value={result.id}
                      onSelect={() => handleSelect(result)}
                      className="flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer text-sm aria-selected:bg-muted aria-selected:text-foreground"
                    >
                      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="flex-1 truncate">{result.name}</span>
                      {result.meta && (
                        <span className={`text-[10px] font-mono uppercase tracking-wider shrink-0 ${
                          result.meta === 'CRITICAL' ? 'text-red-400' :
                          result.meta === 'HIGH' ? 'text-orange-400' :
                          result.meta === 'MEDIUM' ? 'text-yellow-400' :
                          'text-muted-foreground'
                        }`}>
                          {result.meta}
                        </span>
                      )}
                    </Command.Item>
                  ))}
                </Command.Group>
              )
            })}
          </Command.List>

          {campaignId && results.length > 0 && (
            <div className="px-4 py-2 border-t flex items-center justify-between text-xs text-muted-foreground">
              <span>↑↓ navigate</span>
              <span>↵ open</span>
              <span>esc close</span>
            </div>
          )}
        </Command>
      </div>
    </div>
  )
}
