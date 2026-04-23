import { ReactRenderer } from '@tiptap/react'
import tippy, { Instance as TippyInstance } from 'tippy.js'
import type { SuggestionOptions, SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion'
import { MentionList } from '@/components/mentions/mention-list'

export interface MentionItem {
  id: string
  type: string
  name: string
  label: string
}

type MentionSuggestion = Omit<SuggestionOptions<MentionItem, MentionItem>, 'editor'>

export function createMentionSuggestion(campaignId: string): MentionSuggestion {
  return buildMentionSuggestion((q) =>
    `/api/v1/search?campaignId=${campaignId}&q=${encodeURIComponent(q)}`
  )
}

/** Journal-scoped mention source. Surfaces only entities owned by
 *  the journal (ownerType=JOURNAL, ownerId=journalId) — campaign
 *  entities are reached via cross-references, not mentions. */
export function createJournalMentionSuggestion(journalId: string): MentionSuggestion {
  return buildMentionSuggestion((q) =>
    `/api/v1/journals/${journalId}/search?q=${encodeURIComponent(q)}`
  )
}

function buildMentionSuggestion(buildUrl: (query: string) => string): MentionSuggestion {
  return {
    items: async ({ query }) => {
      const q = query.length > 0 ? query : 'a'
      try {
        const res = await fetch(buildUrl(q), { credentials: 'include' })
        if (!res.ok) return []
        const data = await res.json()
        return data.slice(0, 8).map((item: { id: string; type: string; name: string }) => ({
          id: item.id,
          type: item.type,
          name: item.name,
          label: item.name,
        }))
      } catch {
        return []
      }
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
