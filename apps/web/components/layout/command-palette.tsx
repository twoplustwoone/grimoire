'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Command } from 'cmdk'
import { Search, Users, MapPin, Shield, GitBranch, Calendar, X } from 'lucide-react'

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
  CLUE: Search,
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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />
      <div className="relative w-full max-w-lg mx-4 bg-card border rounded-xl shadow-2xl overflow-hidden">
        <Command shouldFilter={false}>
          <div className="flex items-center gap-3 px-4 py-3 border-b">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder={campaignId ? 'Search entities...' : 'Navigate to a campaign first'}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              autoFocus
            />
            {query && (
              <button onClick={() => setQuery('')} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
            <kbd className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground border rounded px-1.5 py-0.5">
              esc
            </kbd>
          </div>

          <Command.List className="max-h-80 overflow-y-auto p-2">
            {!campaignId && (
              <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                Open a campaign to search its entities.
              </Command.Empty>
            )}

            {campaignId && !query && (
              <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                Type to search NPCs, locations, factions, threads, clues, and sessions.
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
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:font-medium"
                >
                  {items.map((result) => (
                    <Command.Item
                      key={result.id}
                      value={result.id}
                      onSelect={() => handleSelect(result)}
                      className="flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer text-sm aria-selected:bg-accent aria-selected:text-accent-foreground"
                    >
                      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="flex-1 truncate">{result.name}</span>
                      {result.meta && (
                        <span className="text-xs text-muted-foreground shrink-0">{result.meta}</span>
                      )}
                    </Command.Item>
                  ))}
                </Command.Group>
              )
            })}
          </Command.List>

          {campaignId && (
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
