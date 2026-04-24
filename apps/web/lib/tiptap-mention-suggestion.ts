import { ReactRenderer, type Editor } from '@tiptap/react'
import tippy, { Instance as TippyInstance } from 'tippy.js'
import type { SuggestionOptions, SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion'
import { MentionList } from '@/components/mentions/mention-list'

type Range = { from: number; to: number }

export interface MentionItem {
  id: string
  type: string
  name: string
  label: string
}

/** Sentinel id used for the synthetic "Create entity" row that the
 *  journal suggestion surfaces when there are zero matches and the
 *  caller has opted into noun-promotion. */
export const CREATE_ITEM_ID = '__create__'

export interface CreateEntityRequest {
  /** The verbatim query typed after `@` (no `@` prefix, untrimmed). */
  name: string
  /** Position in the editor where the mention should be inserted once
   *  the user picks a type. The suggestion's `@<query>` range has
   *  already been removed from the doc, so this is a single point. */
  insertAt: number
  editor: Editor
}

type MentionSuggestion = Omit<SuggestionOptions<MentionItem, MentionItem>, 'editor'>

export function createMentionSuggestion(campaignId: string): MentionSuggestion {
  return buildMentionSuggestion({
    buildUrl: (q) => `/api/v1/search?campaignId=${campaignId}&q=${encodeURIComponent(q)}`,
  })
}

/** Journal-scoped mention source. Surfaces only entities owned by
 *  the journal (ownerType=JOURNAL, ownerId=journalId) — campaign
 *  entities are reached via cross-references, not mentions.
 *
 *  Passing `onRequestCreate` enables the noun-promotion "Create
 *  entity …" row when a query returns zero matches. The caller is
 *  responsible for opening the type picker and inserting the mention
 *  at the returned `insertAt` once the user confirms. */
export function createJournalMentionSuggestion(
  journalId: string,
  onRequestCreate?: (req: CreateEntityRequest) => void,
): MentionSuggestion {
  return buildMentionSuggestion({
    buildUrl: (q) => `/api/v1/journals/${journalId}/search?q=${encodeURIComponent(q)}`,
    onRequestCreate,
  })
}

interface BuildOptions {
  buildUrl: (query: string) => string
  onRequestCreate?: (req: CreateEntityRequest) => void
}

function buildMentionSuggestion(opts: BuildOptions): MentionSuggestion {
  const { buildUrl, onRequestCreate } = opts
  return {
    items: async ({ query }) => {
      const q = query.length > 0 ? query : 'a'
      let matches: MentionItem[] = []
      try {
        const res = await fetch(buildUrl(q), { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          matches = data
            .slice(0, 8)
            .map((item: { id: string; type: string; name: string }) => ({
              id: item.id,
              type: item.type,
              name: item.name,
              label: item.name,
            }))
        }
      } catch {
        matches = []
      }
      if (onRequestCreate && query.trim().length > 0 && matches.length === 0) {
        matches.push({
          id: CREATE_ITEM_ID,
          type: 'CREATE',
          name: query,
          label: query,
        })
      }
      return matches
    },

    command: ({ editor, range, props: item }) => {
      if (item.id === CREATE_ITEM_ID && onRequestCreate) {
        // Delete the `@<query>` text so the suggestion plugin exits
        // (doc changed → no active match → popup closes). If the user
        // then cancels the type picker, the name is lost — they opted
        // in to creating an entity when they picked the Create row.
        editor.chain().focus().deleteRange(range).run()
        onRequestCreate({ name: item.name, insertAt: range.from, editor })
        return
      }
      const nodeAfter = editor.view.state.selection.$to.nodeAfter
      const overrideSpace = nodeAfter?.text?.startsWith(' ')
      const insertRange: Range = overrideSpace ? { ...range, to: range.to + 1 } : range
      editor
        .chain()
        .focus()
        .insertContentAt(insertRange, [
          {
            type: 'mention',
            attrs: { id: item.id, type: item.type, name: item.name, label: item.name },
          },
          { type: 'text', text: ' ' },
        ])
        .run()
    },

    render: () => {
      let component: ReactRenderer<{ onKeyDown: (props: SuggestionKeyDownProps) => boolean }>
      let popup: TippyInstance[]

      return {
        onStart: (props: SuggestionProps<MentionItem, MentionItem>) => {
          component = new ReactRenderer(MentionList, {
            props,
            editor: props.editor,
          })

          if (!props.clientRect) return

          popup = tippy('body', {
            getReferenceClientRect: props.clientRect as () => DOMRect,
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: 'manual',
            placement: 'bottom-start',
          })
        },

        onUpdate(props: SuggestionProps<MentionItem, MentionItem>) {
          component.updateProps(props)
          if (!props.clientRect) return
          popup[0].setProps({
            getReferenceClientRect: props.clientRect as () => DOMRect,
          })
        },

        onKeyDown(props: SuggestionKeyDownProps): boolean {
          if (props.event.key === 'Escape') {
            popup[0].hide()
            return true
          }
          return component.ref?.onKeyDown(props) ?? false
        },

        onExit() {
          popup[0].destroy()
          component.destroy()
        },
      }
    },
  }
}
