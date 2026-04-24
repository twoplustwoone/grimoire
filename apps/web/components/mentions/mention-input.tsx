'use client'

import { useEditor, EditorContent, useEditorState, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Mention, { type MentionOptions } from '@tiptap/extension-mention'
import Placeholder from '@tiptap/extension-placeholder'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
} from 'lucide-react'
import {
  createJournalMentionSuggestion,
  createMentionSuggestion,
} from '@/lib/tiptap-mention-suggestion'
import { getEntityChipClasses } from '@/lib/entity-display'
import { EntityTypePicker } from '@/components/mentions/entity-type-picker'
import { createJournalEntity, type CreatableEntityType } from '@/lib/journal-entity-create'
import { emptyDoc, type ProseMirrorDoc } from '@grimoire/db/prosemirror'

interface Props {
  value: ProseMirrorDoc | null | undefined
  onChange: (value: ProseMirrorDoc) => void
  placeholder?: string
  rows?: number
  className?: string
  onKeyDown?: (e: React.KeyboardEvent) => void
  onSave?: () => void
  /** Enable the Mention extension + suggestion UI. Defaults to true. */
  allowMentions?: boolean
  /** Scope @-mentions to this journal's owned entities. When set,
   *  takes precedence over the route-based campaign detection so
   *  callers on journal routes (e.g. capture editor) surface the
   *  right suggestion list. Also enables J7 noun-promotion. */
  mentionJournalId?: string
}

/** In-flight state for the type picker. The `@query` range has
 *  already been deleted by the suggestion-row flow, so we insert
 *  the resolved mention at a single point. */
type PendingCreate = { name: string; at: number }

export function MentionInput({
  value,
  onChange,
  placeholder,
  rows = 3,
  className,
  onSave,
  allowMentions = true,
  mentionJournalId,
}: Props) {
  const params = useParams()
  const campaignId = params?.id as string | undefined
  const [pendingCreate, setPendingCreate] = useState<PendingCreate | null>(null)
  const suggestion: MentionOptions['suggestion'] | undefined = mentionJournalId
    ? (createJournalMentionSuggestion(mentionJournalId, (req) => {
        setPendingCreate({ name: req.name, at: req.insertAt })
      }) as MentionOptions['suggestion'])
    : campaignId
      ? (createMentionSuggestion(campaignId) as MentionOptions['suggestion'])
      : undefined

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
        placeholder:
          placeholder ??
          (allowMentions
            ? 'Write a note... (type @ to mention an entity)'
            : 'What happened?'),
      }),
      ...(allowMentions
        ? [
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
              suggestion,
            }),
          ]
        : []),
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

  async function handlePickType(type: CreatableEntityType) {
    if (!pendingCreate || !mentionJournalId || !editor) return
    const result = await createJournalEntity(mentionJournalId, type, pendingCreate.name)
    if (!result) {
      // Revert: the typed `@<query>` is already gone from the
      // doc, so the user can retype if they want to try again.
      console.error('Failed to create journal entity', { type, name: pendingCreate.name })
      setPendingCreate(null)
      return
    }
    const mentionContent = [
      {
        type: 'mention',
        attrs: {
          id: result.id,
          type: result.type,
          name: result.name,
          label: result.name,
        },
      },
      { type: 'text', text: ' ' },
    ]
    editor
      .chain()
      .focus()
      .insertContentAt(pendingCreate.at, mentionContent)
      .run()
    setPendingCreate(null)
  }

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
      <EntityTypePicker
        open={pendingCreate !== null}
        onOpenChange={(open) => {
          if (!open) setPendingCreate(null)
        }}
        name={pendingCreate?.name ?? ''}
        onPick={handlePickType}
      />
    </div>
  )
}

function Toolbar({ editor }: { editor: Editor }) {
  // Subscribe to editor transactions so active state reflects the
  // current selection, not just the last content update.
  const activeState = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor.isActive('bold'),
      italic: editor.isActive('italic'),
      underline: editor.isActive('underline'),
      h2: editor.isActive('heading', { level: 2 }),
      h3: editor.isActive('heading', { level: 3 }),
      bulletList: editor.isActive('bulletList'),
      orderedList: editor.isActive('orderedList'),
      blockquote: editor.isActive('blockquote'),
    }),
  }) ?? {
    bold: false,
    italic: false,
    underline: false,
    h2: false,
    h3: false,
    bulletList: false,
    orderedList: false,
    blockquote: false,
  }

  const buttons: Array<{
    label: string
    icon: React.ComponentType<{ className?: string }>
    action: () => void
    active: boolean
  }> = [
    {
      label: 'Bold',
      icon: Bold,
      action: () => editor.chain().focus().toggleBold().run(),
      active: activeState.bold,
    },
    {
      label: 'Italic',
      icon: Italic,
      action: () => editor.chain().focus().toggleItalic().run(),
      active: activeState.italic,
    },
    {
      label: 'Underline',
      icon: UnderlineIcon,
      action: () => editor.chain().focus().toggleUnderline().run(),
      active: activeState.underline,
    },
    {
      label: 'Heading 2',
      icon: Heading2,
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      active: activeState.h2,
    },
    {
      label: 'Heading 3',
      icon: Heading3,
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      active: activeState.h3,
    },
    {
      label: 'Bullet list',
      icon: List,
      action: () => editor.chain().focus().toggleBulletList().run(),
      active: activeState.bulletList,
    },
    {
      label: 'Numbered list',
      icon: ListOrdered,
      action: () => editor.chain().focus().toggleOrderedList().run(),
      active: activeState.orderedList,
    },
    {
      label: 'Quote',
      icon: Quote,
      action: () => editor.chain().focus().toggleBlockquote().run(),
      active: activeState.blockquote,
    },
    {
      label: 'Divider',
      icon: Minus,
      action: () => editor.chain().focus().setHorizontalRule().run(),
      active: false,
    },
  ]

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border px-1 py-1">
      {buttons.map((b) => {
        const Icon = b.icon
        return (
          <button
            key={b.label}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault()
              b.action()
            }}
            aria-label={b.label}
            aria-pressed={b.active}
            className={`flex h-11 w-11 md:h-8 md:w-8 items-center justify-center rounded transition-colors ${
              b.active
                ? 'bg-foreground/10 text-foreground ring-1 ring-inset ring-foreground/20 hover:bg-foreground/15'
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
