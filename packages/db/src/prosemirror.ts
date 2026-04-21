export interface ProseMirrorMark {
  type: string
  attrs?: Record<string, unknown>
}

export interface ProseMirrorNode {
  type: string
  attrs?: Record<string, unknown>
  content?: ProseMirrorNode[]
  marks?: ProseMirrorMark[]
  text?: string
}

export interface ProseMirrorDoc {
  type: 'doc'
  content?: ProseMirrorNode[]
}

export interface DocMention {
  entityType: string
  entityId: string
  name: string
}

export function emptyDoc(): ProseMirrorDoc {
  return { type: 'doc', content: [{ type: 'paragraph' }] }
}

// Returns `any` so callers can pass directly into Prisma `content: Json`
// fields without the type friction that `ProseMirrorDoc` would introduce
// (Prisma's InputJsonValue doesn't accept structurally-typed interfaces).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function plainTextToDoc(text: string): any {
  const paragraphs = text.split('\n').map<ProseMirrorNode>((line) =>
    line.length > 0
      ? { type: 'paragraph', content: [{ type: 'text', text: line }] }
      : { type: 'paragraph' }
  )
  return { type: 'doc', content: paragraphs }
}

// Returns `any` so callers can pass the result directly into Prisma's
// `mentions: Json?` sidecar without structural-type friction.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractMentionsFromDoc(doc: unknown): any {
  const mentions: DocMention[] = []
  walk(doc, (node) => {
    if (node.type === 'mention') {
      const attrs = (node.attrs ?? {}) as {
        id?: string
        name?: string
        label?: string
        type?: string
      }
      if (attrs.id && attrs.type) {
        mentions.push({
          entityType: String(attrs.type).toUpperCase(),
          entityId: String(attrs.id),
          name: String(attrs.name ?? attrs.label ?? ''),
        })
      }
    }
  })
  return mentions
}

export function docToPlainText(doc: unknown): string {
  const blocks: string[] = []
  let current: string[] = []
  let listDepth = 0
  let orderedCounter: number[] = []

  const flush = () => {
    if (current.length > 0) {
      blocks.push(current.join(''))
      current = []
    }
  }

  const walkNode = (node: ProseMirrorNode | undefined): void => {
    if (!node || typeof node !== 'object') return

    switch (node.type) {
      case 'doc':
        for (const child of node.content ?? []) walkNode(child)
        break

      case 'paragraph':
      case 'heading':
      case 'blockquote':
        for (const child of node.content ?? []) walkNode(child)
        flush()
        break

      case 'bulletList':
        listDepth++
        for (const item of node.content ?? []) walkNode(item)
        listDepth--
        break

      case 'orderedList':
        listDepth++
        orderedCounter.push(0)
        for (const item of node.content ?? []) walkNode(item)
        orderedCounter.pop()
        listDepth--
        break

      case 'listItem': {
        const indent = '  '.repeat(Math.max(0, listDepth - 1))
        const isOrdered = orderedCounter.length > 0
        let bullet = '- '
        if (isOrdered) {
          orderedCounter[orderedCounter.length - 1]++
          bullet = `${orderedCounter[orderedCounter.length - 1]}. `
        }
        current.push(indent + bullet)
        for (const child of node.content ?? []) walkNode(child)
        flush()
        break
      }

      case 'horizontalRule':
        blocks.push('---')
        break

      case 'hardBreak':
        current.push('\n')
        break

      case 'text':
        current.push(node.text ?? '')
        break

      case 'mention': {
        const attrs = (node.attrs ?? {}) as { name?: string; label?: string }
        current.push(`@${attrs.name ?? attrs.label ?? ''}`)
        break
      }

      default:
        for (const child of node.content ?? []) walkNode(child)
    }
  }

  walkNode(doc as ProseMirrorNode)
  flush()
  return blocks.join('\n').trim()
}

function walk(node: unknown, visit: (node: ProseMirrorNode) => void): void {
  if (!node || typeof node !== 'object') return
  const n = node as ProseMirrorNode
  visit(n)
  for (const child of n.content ?? []) walk(child, visit)
}

export function isProseMirrorDoc(value: unknown): value is ProseMirrorDoc {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { type?: unknown }).type === 'doc'
  )
}

// Prisma's Json input type is structurally incompatible with specific
// interfaces (it expects either primitives or recursive { [k: string]: Json }).
// This cast is a narrow escape hatch so seed code / route handlers can hand
// a typed ProseMirrorDoc to Prisma without each call site casting separately.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function asJson(doc: ProseMirrorDoc | unknown): any {
  return doc
}
