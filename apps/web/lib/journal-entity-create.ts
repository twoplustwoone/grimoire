export type CreatableEntityType = 'NPC' | 'LOCATION' | 'FACTION' | 'THREAD' | 'CLUE'

const ROUTE_SEGMENT: Record<CreatableEntityType, string> = {
  NPC: 'npcs',
  LOCATION: 'locations',
  FACTION: 'factions',
  THREAD: 'threads',
  CLUE: 'clues',
}

// Thread and Clue models key their primary label as `title`; the other
// journal entity types use `name`. The POST endpoints validate the
// corresponding field, so we route each request to the right field name.
const TITLE_FIELD_TYPES: ReadonlySet<CreatableEntityType> = new Set(['THREAD', 'CLUE'])

export interface CreatedJournalEntity {
  id: string
  name: string
  type: CreatableEntityType
}

export async function createJournalEntity(
  journalId: string,
  type: CreatableEntityType,
  name: string,
): Promise<CreatedJournalEntity | null> {
  const trimmed = name.trim()
  if (!trimmed) return null
  const field = TITLE_FIELD_TYPES.has(type) ? 'title' : 'name'
  const res = await fetch(`/api/v1/journals/${journalId}/${ROUTE_SEGMENT[type]}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ [field]: trimmed }),
  })
  if (!res.ok) return null
  const data = (await res.json()) as { id?: string; name?: string; title?: string }
  const resolved = data.name ?? data.title
  if (!data.id || !resolved) return null
  return { id: data.id, name: resolved, type }
}
