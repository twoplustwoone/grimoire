'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { X, Plus, Tag } from 'lucide-react'

interface EntityTag {
  id: string
  entityType: string
  entityId: string
  entityName?: string
}

interface AvailableEntity {
  id: string
  name: string
  type: string
}

interface Props {
  campaignId: string
  sessionId: string
  initialTags: EntityTag[]
  availableEntities: AvailableEntity[]
}

const entityTypeColors: Record<string, string> = {
  NPC: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  LOCATION: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  FACTION: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  THREAD: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  CLUE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
}

export function SessionEntityTagger({
  campaignId,
  sessionId,
  initialTags,
  availableEntities,
}: Props) {
  const router = useRouter()
  const [tags, setTags] = useState<EntityTag[]>(initialTags)
  const [search, setSearch] = useState('')
  const [showSearch, setShowSearch] = useState(false)

  const taggedIds = new Set(tags.map((t) => t.entityId))

  const filtered = availableEntities.filter(
    (e) =>
      !taggedIds.has(e.id) &&
      e.name.toLowerCase().includes(search.toLowerCase())
  )

  async function addTag(entity: AvailableEntity) {
    const res = await fetch(
      `/api/v1/campaigns/${campaignId}/sessions/${sessionId}/tags`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ entityType: entity.type, entityId: entity.id }),
      }
    )
    if (res.ok) {
      const tag = await res.json()
      setTags([...tags, { ...tag, entityName: entity.name }])
      setSearch('')
      router.refresh()
    }
  }

  async function removeTag(tagId: string) {
    const res = await fetch(
      `/api/v1/campaigns/${campaignId}/sessions/${sessionId}/tags/${tagId}`,
      {
        method: 'DELETE',
        credentials: 'include',
      }
    )
    if (res.ok) {
      setTags(tags.filter((t) => t.id !== tagId))
      router.refresh()
    }
  }

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Tag className="h-4 w-4" />
          Entities in this session
        </CardTitle>
      </CardHeader>
      <CardContent>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {tags.map((tag) => (
              <span
                key={tag.id}
                className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${entityTypeColors[tag.entityType] ?? 'bg-muted'}`}
              >
                <span className="opacity-60">{tag.entityType}</span>
                <span>{tag.entityName ?? tag.entityId.slice(0, 8)}</span>
                <button
                  onClick={() => removeTag(tag.id)}
                  className="ml-1 hover:opacity-70 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {showSearch ? (
          <div className="space-y-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search entities..."
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setShowSearch(false)
                  setSearch('')
                }
              }}
            />
            {search.length > 0 && (
              <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
                {filtered.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-3">No results</p>
                ) : (
                  filtered.slice(0, 10).map((entity) => (
                    <button
                      key={entity.id}
                      onClick={() => addTag(entity)}
                      className="w-full text-left px-3 py-2 hover:bg-accent transition-colors flex items-center gap-2"
                    >
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${entityTypeColors[entity.type] ?? 'bg-muted'}`}>
                        {entity.type}
                      </span>
                      <span className="text-sm">{entity.name}</span>
                    </button>
                  ))
                )}
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setShowSearch(false); setSearch('') }}
            >
              Done
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSearch(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Tag entity
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
