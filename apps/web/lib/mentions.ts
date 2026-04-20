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
