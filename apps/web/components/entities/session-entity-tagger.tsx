'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { X, Plus, Tag } from 'lucide-react'
import { getEntityChipClasses, getEntityLabel } from '@/lib/entity-display'

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
                className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${getEntityChipClasses(tag.entityType)}`}
              >
                <span className="opacity-60">{getEntityLabel(tag.entityType)}</span>
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
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${getEntityChipClasses(entity.type)}`}>
                        {getEntityLabel(entity.type)}
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
