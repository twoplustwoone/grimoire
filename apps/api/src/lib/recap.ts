import { generateText } from 'ai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { prisma } from '@grimoire/db'
import { docToPlainText } from '@grimoire/db/prosemirror'

interface RecapContext {
  campaignId: string
  sessionId: string
}

export async function generateSessionRecap({ campaignId, sessionId }: RecapContext): Promise<string> {
  const anthropic = createAnthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })

  const session = await prisma.gameSession.findFirst({
    where: { id: sessionId, ownerType: 'CAMPAIGN', ownerId: campaignId },
    include: { entityTags: true },
  })
  if (!session) throw new Error('Session not found')

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { name: true, description: true, settings: true },
  })

  const notes = await prisma.note.findMany({
    where: { entityType: 'SESSION', entityId: sessionId },
    orderBy: { createdAt: 'asc' },
  })

  const taggedNPCs = session.entityTags
    .filter(t => t.entityType === 'NPC')
    .map(t => t.entityId)

  const taggedLocations = session.entityTags
    .filter(t => t.entityType === 'LOCATION')
    .map(t => t.entityId)

  const taggedFactions = session.entityTags
    .filter(t => t.entityType === 'FACTION')
    .map(t => t.entityId)

  const taggedThreads = session.entityTags
    .filter(t => t.entityType === 'THREAD')
    .map(t => t.entityId)

  const taggedClues = session.entityTags
    .filter(t => t.entityType === 'CLUE')
    .map(t => t.entityId)

  const [npcs, locations, factions, threads, clues] = await Promise.all([
    taggedNPCs.length > 0 ? prisma.nPC.findMany({
      where: { id: { in: taggedNPCs } },
      select: { name: true, description: true, status: true },
    }) : [],
    taggedLocations.length > 0 ? prisma.location.findMany({
      where: { id: { in: taggedLocations } },
      select: { name: true, description: true },
    }) : [],
    taggedFactions.length > 0 ? prisma.faction.findMany({
      where: { id: { in: taggedFactions } },
      select: { name: true, agenda: true },
    }) : [],
    taggedThreads.length > 0 ? prisma.thread.findMany({
      where: { id: { in: taggedThreads } },
      select: { title: true, description: true, status: true, urgency: true },
    }) : [],
    taggedClues.length > 0 ? prisma.clue.findMany({
      where: { id: { in: taggedClues } },
      select: { title: true, description: true },
    }) : [],
  ])

  const contextParts: string[] = []

  contextParts.push(`CAMPAIGN: ${campaign?.name ?? 'Unknown'}`)
  if (campaign?.description) contextParts.push(`Campaign description: ${campaign.description}`)

  contextParts.push(`\nSESSION: ${session.title ?? `started ${session.createdAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`}`)
  if (session.playedOn) contextParts.push(`Played on: ${session.playedOn.toLocaleDateString()}`)
  if (session.gmSummary) contextParts.push(`GM's own notes: ${session.gmSummary}`)

  if (notes.length > 0) {
    contextParts.push(`\nSESSION NOTES (in chronological order):`)
    notes.forEach((n, i) => contextParts.push(`${i + 1}. ${docToPlainText(n.content)}`))
  }

  if (npcs.length > 0) {
    contextParts.push(`\nNPCs INVOLVED:`)
    npcs.forEach(n => {
      const parts = [n.name]
      if (n.description) parts.push(n.description)
      if (n.status !== 'ACTIVE') parts.push(`(${n.status})`)
      contextParts.push(`- ${parts.join(' — ')}`)
    })
  }

  if (locations.length > 0) {
    contextParts.push(`\nLOCATIONS VISITED:`)
    locations.forEach(l => contextParts.push(`- ${l.name}${l.description ? ` — ${l.description}` : ''}`))
  }

  if (factions.length > 0) {
    contextParts.push(`\nFACTIONS INVOLVED:`)
    factions.forEach(f => contextParts.push(`- ${f.name}${f.agenda ? ` — ${f.agenda}` : ''}`))
  }

  if (threads.length > 0) {
    contextParts.push(`\nTHREADS TOUCHED:`)
    threads.forEach(t => contextParts.push(`- [${t.status}] ${t.title}${t.description ? ` — ${t.description}` : ''}`))
  }

  if (clues.length > 0) {
    contextParts.push(`\nCLUES DISCOVERED:`)
    clues.forEach(c => contextParts.push(`- ${c.title}${c.description ? ` — ${c.description}` : ''}`))
  }

  const context = contextParts.join('\n')

  const { text } = await generateText({
    model: anthropic('claude-sonnet-4-20250514'),
    system: `You are a helpful assistant for tabletop RPG game masters.
Your job is to write concise, evocative session recaps that capture what happened, who was involved, and what threads remain unresolved.
Write in past tense, third person. Be specific about names and events.
Keep the recap focused — 3 to 5 paragraphs maximum.
Do not invent events or details not present in the notes. If notes are sparse, say so briefly and work with what you have.`,
    prompt: `Please write a session recap based on the following information:\n\n${context}`,
  })

  return text
}
