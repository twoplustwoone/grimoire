'use client'

import { Fragment, type ReactNode } from 'react'
import Link from 'next/link'
import { getEntityChipClasses, getEntityRoutePath } from '@/lib/entity-display'
import type {
  ProseMirrorDoc,
  ProseMirrorNode,
  ProseMirrorMark,
} from '@grimoire/db/prosemirror'

interface Props {
  content: ProseMirrorDoc | null | undefined
  campaignId?: string
}

export function MentionRenderer({ content, campaignId }: Props) {
  if (!content || !isDoc(content)) {
    return null
  }
  return (
    <div className="space-y-2 text-sm">
      {(content.content ?? []).map((node, i) => (
        <Fragment key={i}>{renderBlock(node, campaignId)}</Fragment>
      ))}
    </div>
  )
}

function isDoc(value: unknown): value is ProseMirrorDoc {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { type?: unknown }).type === 'doc'
  )
}

function renderBlock(node: ProseMirrorNode, campaignId: string | undefined): ReactNode {
  switch (node.type) {
    case 'paragraph':
      return (
        <p className="leading-relaxed">
          {renderInline(node.content ?? [], campaignId)}
        </p>
      )
    case 'heading': {
      const level = (node.attrs?.level as number) ?? 2
      const Tag = level === 3 ? 'h3' : 'h2'
      const cls = level === 3 ? 'text-base font-semibold' : 'text-lg font-semibold'
      return <Tag className={cls}>{renderInline(node.content ?? [], campaignId)}</Tag>
    }
    case 'bulletList':
      return (
        <ul className="list-disc pl-5 space-y-1">
          {(node.content ?? []).map((item, i) => (
            <Fragment key={i}>{renderBlock(item, campaignId)}</Fragment>
          ))}
        </ul>
      )
    case 'orderedList':
      return (
        <ol className="list-decimal pl-5 space-y-1">
          {(node.content ?? []).map((item, i) => (
            <Fragment key={i}>{renderBlock(item, campaignId)}</Fragment>
          ))}
        </ol>
      )
    case 'listItem':
      return (
        <li>
          {(node.content ?? []).map((child, i) => (
            <Fragment key={i}>{renderBlock(child, campaignId)}</Fragment>
          ))}
        </li>
      )
    case 'blockquote':
      return (
        <blockquote className="border-l-2 border-muted pl-3 italic text-muted-foreground">
          {(node.content ?? []).map((child, i) => (
            <Fragment key={i}>{renderBlock(child, campaignId)}</Fragment>
          ))}
        </blockquote>
      )
    case 'horizontalRule':
      return <hr className="my-2 border-border" />
    default:
      return null
  }
}

function renderInline(
  nodes: ProseMirrorNode[],
  campaignId: string | undefined
): ReactNode {
  return nodes.map((node, i) => {
    if (node.type === 'hardBreak') {
      return <br key={i} />
    }
    if (node.type === 'text') {
      return <Fragment key={i}>{applyMarks(node.text ?? '', node.marks)}</Fragment>
    }
    if (node.type === 'mention') {
      return <MentionChip key={i} node={node} campaignId={campaignId} />
    }
    return null
  })
}

function applyMarks(text: string, marks: ProseMirrorMark[] | undefined): ReactNode {
  let out: ReactNode = text
  for (const mark of marks ?? []) {
    if (mark.type === 'bold') {
      out = <strong>{out}</strong>
    } else if (mark.type === 'italic') {
      out = <em>{out}</em>
    }
  }
  return out
}

function MentionChip({
  node,
  campaignId,
}: {
  node: ProseMirrorNode
  campaignId: string | undefined
}) {
  const attrs = (node.attrs ?? {}) as {
    id?: string
    name?: string
    label?: string
    type?: string
  }
  const entityType = String(attrs.type ?? 'NPC').toUpperCase()
  const name = attrs.name ?? attrs.label ?? ''
  const path = getEntityRoutePath(entityType)
  const colorClass = getEntityChipClasses(entityType)

  if (campaignId && path && attrs.id) {
    return (
      <Link
        href={`/campaigns/${campaignId}/${path}/${attrs.id}`}
        className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium mx-0.5 hover:opacity-80 transition-opacity ${colorClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        @{name}
      </Link>
    )
  }

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium mx-0.5 ${colorClass}`}
    >
      @{name}
    </span>
  )
}
