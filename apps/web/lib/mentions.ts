export interface Mention {
  entityType: string
  entityId: string
  name: string
}

export function parseMentions(content: string): Mention[] {
  const regex = /@\[([^\]]+)\]\((\w+):([^)]+)\)/g
  const mentions: Mention[] = []
  let match
  while ((match = regex.exec(content)) !== null) {
    mentions.push({
      name: match[1],
      entityType: match[2].toUpperCase(),
      entityId: match[3],
    })
  }
  return mentions
}

export function mentionTokenToText(content: string): string {
  return content.replace(/@\[([^\]]+)\]\(\w+:[^)]+\)/g, '@$1')
}

export function buildMentionToken(name: string, entityType: string, entityId: string): string {
  return `@[${name}](${entityType.toLowerCase()}:${entityId})`
}

const entityTypeColors: Record<string, string> = {
  NPC: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  PLAYER_CHARACTER: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  LOCATION: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  FACTION: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  THREAD: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  CLUE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  SESSION: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
}

export function getMentionColor(entityType: string): string {
  return entityTypeColors[entityType.toUpperCase()] ?? 'bg-muted text-muted-foreground'
}

export function parseContentForDisplay(
  content: string
): Array<{ type: 'text'; value: string } | { type: 'mention'; mention: Mention }> {
  const regex = /@\[([^\]]+)\]\((\w+):([^)]+)\)/g
  const parts: Array<{ type: 'text'; value: string } | { type: 'mention'; mention: Mention }> = []
  let lastIndex = 0
  let match

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: content.slice(lastIndex, match.index) })
    }
    parts.push({
      type: 'mention',
      mention: {
        name: match[1],
        entityType: match[2].toUpperCase(),
        entityId: match[3],
      },
    })
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < content.length) {
    parts.push({ type: 'text', value: content.slice(lastIndex) })
  }

  return parts
}
