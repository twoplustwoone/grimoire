import type { EntityType } from './entity-display'

// Raw changelog entry shape as fetched by the dashboard.
export interface RawChangelogEntry {
  id: string
  entityType: EntityType
  entityId: string
  authorId: string | null
  field: string
  oldValue: string | null
  newValue: string | null
  createdAt: Date
  author?: { name: string | null } | null
}

// Grouped feed entry — one row on the dashboard per group.
export interface ActivityGroup {
  id: string
  entityType: EntityType
  entityId: string
  authorName: string | null
  createdAt: Date
  kind: 'created' | 'deleted' | 'updated'
  fields: string[] // unique fields touched (for updated kind)
  /** If any row in the group has the resolved entity name, prefer that. */
  preferredLabel: string | null
}

// Bucket width for coalescing "same entity, same author, same moment" events.
const BUCKET_MS = 60_000

export function groupActivity(rows: RawChangelogEntry[], maxGroups = 10): ActivityGroup[] {
  const groups: ActivityGroup[] = []
  let currentKey: string | null = null
  let current: ActivityGroup | null = null

  for (const row of rows) {
    const bucket = Math.floor(row.createdAt.getTime() / BUCKET_MS)
    const key = `${row.entityType}|${row.entityId}|${row.authorId ?? ''}|${bucket}`
    if (key !== currentKey) {
      if (groups.length >= maxGroups) break
      current = {
        id: row.id,
        entityType: row.entityType,
        entityId: row.entityId,
        authorName: row.author?.name ?? null,
        createdAt: row.createdAt,
        kind: row.field === 'created' ? 'created' : row.field === 'deleted' ? 'deleted' : 'updated',
        fields: [row.field],
        preferredLabel:
          row.field === 'created' ? row.newValue :
          row.field === 'deleted' ? row.oldValue :
          null,
      }
      groups.push(current)
      currentKey = key
    } else if (current) {
      // merge into current group
      if (row.field === 'created' && !current.preferredLabel) current.preferredLabel = row.newValue
      if (row.field === 'deleted' && !current.preferredLabel) current.preferredLabel = row.oldValue
      if (!current.fields.includes(row.field)) current.fields.push(row.field)
      if (current.kind === 'updated' && row.field === 'deleted') current.kind = 'deleted'
      if (current.kind === 'updated' && row.field === 'created') current.kind = 'created'
    }
  }

  return groups
}

export function formatRelativeTime(date: Date, now: Date = new Date()): string {
  const diffMs = now.getTime() - date.getTime()
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `${weeks}w ago`
  return date.toLocaleDateString()
}
