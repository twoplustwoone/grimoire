'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Mention, { type MentionOptions } from '@tiptap/extension-mention'
import Placeholder from '@tiptap/extension-placeholder'
import { useParams } from 'next/navigation'
import { useEffect } from 'react'
import { createMentionSuggestion } from '@/lib/tiptap-mention-suggestion'
import { getMentionColor, buildMentionToken } from '@/lib/mentions'

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  className?: string
  onKeyDown?: (e: React.KeyboardEvent) => void
  onSave?: () => void
}

function tiptapToTokens(doc: Record<string, unknown>): string {
  if (!doc || !doc.content) return ''

  function processNode(node: Record<string, unknown>): string {
    if (node.type === 'text') {
      return (node.text as string) ?? ''
    }
    if (node.type === 'mention') {
      const attrs = node.attrs as { id: string; label: string; type: string; name: string }
      return buildMentionToken(attrs.name ?? attrs.label, attrs.type ?? 'NPC', attrs.id)
    }
    if (node.type === 'hardBreak') {
      return '\n'
    }
    if (node.content) {
      const children = (node.content as Record<string, unknown>[]).map(processNode).join('')
      if (node.type === 'paragraph') {
        return children
      }
      return children
    }
    return ''
  }

  const paragraphs = (doc.content as Record<string, unknown>[])
  return paragraphs.map(processNode).join('\n')
}

function tokensToTiptap(content: string): Record<string, unknown> {
  const regex = /@\[([^\]]+)\]\((\w+):([^)]+)\)/g
  const paragraphs = content.split('\n')

  const tiptapParagraphs = paragraphs.map((para) => {
    const nodes: Record<string, unknown>[] = []
    let lastIndex = 0
    let match

    regex.lastIndex = 0
    while ((match = regex.exec(para)) !== null) {
      if (match.index > lastIndex) {
        nodes.push({ type: 'text', text: para.slice(lastIndex, match.index) })
      }
      nodes.push({
        type: 'mention',
        attrs: {
          id: match[3],
          label: match[1],
          name: match[1],
          type: match[2].toUpperCase(),
        },
      })
      lastIndex = match.index + match[0].length
    }

    if (lastIndex < para.length) {
      nodes.push({ type: 'text', text: para.slice(lastIndex) })
    }

    return {
      type: 'paragraph',
      content: nodes.length > 0 ? nodes : undefined,
    }
  })

  return {
    type: 'doc',
    content: tiptapParagraphs,
  }
}

export function MentionInput({ value, onChange, placeholder, rows = 3, className, onSave }: Props) {
  const params = useParams()
  const campaignId = params?.id as string | undefined

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        bold: false,
        italic: false,
        strike: false,
        code: false,
        codeBlock: false,
        blockquote: false,
        heading: false,
        horizontalRule: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
      }),
      Placeholder.configure({
        placeholder: placeholder ?? 'Write a note... (type @ to mention an entity)',
      }),
      Mention.configure({
        HTMLAttributes: {
          class: 'mention-chip',
        },
        renderHTML({ node }) {
          const colorClass = getMentionColor(node.attrs.type ?? 'NPC')
          return [
            'span',
            {
              class: `inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium mx-0.5 cursor-default select-none ${colorClass}`,
              'data-mention-id': node.attrs.id,
              'data-mention-type': node.attrs.type,
            },
            `@${node.attrs.name ?? node.attrs.label}`,
          ]
        },
        suggestion: (campaignId
          ? createMentionSuggestion(campaignId)
          : undefined) as MentionOptions['suggestion'] | undefined,
      }),
    ],
    content: tokensToTiptap(value),
    onUpdate: ({ editor }) => {
      const tokens = tiptapToTokens(editor.getJSON() as Record<string, unknown>)
      onChange(tokens)
    },
    editorProps: {
      attributes: {
        class: 'focus:outline-none',
      },
      handleKeyDown: (view, event) => {
        if (onSave && event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
          onSave()
          return true
        }
        return false
      },
    },
  })

  useEffect(() => {
    if (!editor) return
    const current = tiptapToTokens(editor.getJSON() as Record<string, unknown>)
    if (current !== value) {
      editor.commands.setContent(tokensToTiptap(value), { emitUpdate: false })
    }
  }, [value, editor])

  const minHeight = `${rows * 1.5}rem`

  return (
    <div
      className={`
        w-full rounded-md border border-input bg-background px-3 py-2
        text-sm ring-offset-background cursor-text
        focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2
        ${className ?? ''}
      `}
      style={{ minHeight }}
      onClick={() => editor?.commands.focus()}
    >
      <EditorContent editor={editor} />
    </div>
  )
}
