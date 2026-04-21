'use client'

import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Mention, { type MentionOptions } from '@tiptap/extension-mention'
import Placeholder from '@tiptap/extension-placeholder'
import { useParams } from 'next/navigation'
import { useEffect } from 'react'
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
} from 'lucide-react'
import { createMentionSuggestion } from '@/lib/tiptap-mention-suggestion'
import { getEntityChipClasses } from '@/lib/entity-display'
import { emptyDoc, type ProseMirrorDoc } from '@grimoire/db/prosemirror'

interface Props {
  value: ProseMirrorDoc | null | undefined
  onChange: (value: ProseMirrorDoc) => void
  placeholder?: string
  rows?: number
  className?: string
  onKeyDown?: (e: React.KeyboardEvent) => void
  onSave?: () => void
}

export function MentionInput({ value, onChange, placeholder, rows = 3, className, onSave }: Props) {
  const params = useParams()
  const campaignId = params?.id as string | undefined

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        strike: false,
        code: false,
        codeBlock: false,
        heading: { levels: [2, 3] },
      }),
      Placeholder.configure({
        placeholder: placeholder ?? 'Write a note... (type @ to mention an entity)',
      }),
      Mention.configure({
        HTMLAttributes: {
          class: 'mention-chip',
        },
        renderHTML({ node }) {
          const colorClass = getEntityChipClasses(node.attrs.type ?? 'NPC')
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
    content: value ?? emptyDoc(),
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON() as ProseMirrorDoc)
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none dark:prose-invert',
      },
      handleKeyDown: (_view, event) => {
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
    const current = editor.getJSON()
    if (!docsEqual(current, value)) {
      editor.commands.setContent(value ?? emptyDoc(), { emitUpdate: false })
    }
  }, [value, editor])

  const minHeight = `${rows * 1.5}rem`

  return (
    <div
      className={`
        w-full rounded-md border border-input bg-background
        text-sm ring-offset-background
        focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2
        ${className ?? ''}
      `}
    >
      {editor ? <Toolbar editor={editor} /> : null}
      <div
        className="px-3 py-2 cursor-text"
        style={{ minHeight }}
        onClick={() => editor?.commands.focus()}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

function Toolbar({ editor }: { editor: Editor }) {
  const buttons: Array<{
    label: string
    icon: React.ComponentType<{ className?: string }>
    action: () => void
    isActive: () => boolean
  }> = [
    {
      label: 'Bold',
      icon: Bold,
      action: () => editor.chain().focus().toggleBold().run(),
      isActive: () => editor.isActive('bold'),
    },
    {
      label: 'Italic',
      icon: Italic,
      action: () => editor.chain().focus().toggleItalic().run(),
      isActive: () => editor.isActive('italic'),
    },
    {
      label: 'Heading 2',
      icon: Heading2,
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: () => editor.isActive('heading', { level: 2 }),
    },
    {
      label: 'Heading 3',
      icon: Heading3,
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      isActive: () => editor.isActive('heading', { level: 3 }),
    },
    {
      label: 'Bullet list',
      icon: List,
      action: () => editor.chain().focus().toggleBulletList().run(),
      isActive: () => editor.isActive('bulletList'),
    },
    {
      label: 'Numbered list',
      icon: ListOrdered,
      action: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: () => editor.isActive('orderedList'),
    },
    {
      label: 'Quote',
      icon: Quote,
      action: () => editor.chain().focus().toggleBlockquote().run(),
      isActive: () => editor.isActive('blockquote'),
    },
    {
      label: 'Divider',
      icon: Minus,
      action: () => editor.chain().focus().setHorizontalRule().run(),
      isActive: () => false,
    },
  ]

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border px-1 py-1">
      {buttons.map((b) => {
        const Icon = b.icon
        const active = b.isActive()
        return (
          <button
            key={b.label}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault()
              b.action()
            }}
            aria-label={b.label}
            aria-pressed={active}
            className={`flex h-11 w-11 md:h-8 md:w-8 items-center justify-center rounded transition-colors ${
              active
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
            title={b.label}
          >
            <Icon className="h-4 w-4" />
          </button>
        )
      })}
    </div>
  )
}

function docsEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (!a || !b) return false
  try {
    return JSON.stringify(a) === JSON.stringify(b)
  } catch {
    return false
  }
}
