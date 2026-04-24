import { prisma, type EntityType } from '@grimoire/db'

/** Batched hydration: fetch `{ id -> name }` for every (type, id) pair
 *  in `refs`. One query per distinct type. Thread/Clue titles are
 *  renormalised to `name`. */
export async function hydrateEntityNames(
  refs: Array<{ type: EntityType; id: string }>
): Promise<Map<string, string>> {
  const byType = new Map<EntityType, Set<string>>()
  for (const { type, id } of refs) {
    if (!byType.has(type)) byType.set(type, new Set())
    byType.get(type)!.add(id)
  }
  const out = new Map<string, string>()
  const key = (t: EntityType, id: string) => `${t}:${id}`
  await Promise.all(
    Array.from(byType.entries()).map(async ([type, ids]) => {
      const where = { id: { in: Array.from(ids) } }
      if (type === 'NPC') {
        const rows = await prisma.nPC.findMany({ where, select: { id: true, name: true } })
        for (const r of rows) out.set(key(type, r.id), r.name)
      } else if (type === 'LOCATION') {
        const rows = await prisma.location.findMany({ where, select: { id: true, name: true } })
        for (const r of rows) out.set(key(type, r.id), r.name)
      } else if (type === 'FACTION') {
        const rows = await prisma.faction.findMany({ where, select: { id: true, name: true } })
        for (const r of rows) out.set(key(type, r.id), r.name)
      } else if (type === 'THREAD') {
        const rows = await prisma.thread.findMany({ where, select: { id: true, title: true } })
        for (const r of rows) out.set(key(type, r.id), r.title)
      } else if (type === 'CLUE') {
        const rows = await prisma.clue.findMany({ where, select: { id: true, title: true } })
        for (const r of rows) out.set(key(type, r.id), r.title)
      }
    })
  )
  return out
}
