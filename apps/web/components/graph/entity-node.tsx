'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { ExternalLink } from 'lucide-react'
import {
  ENTITY_GRAPH_NODE_THEME,
  ENTITY_ICON,
  type EntityType,
} from '@/lib/entity-display'

function isLightTheme(): boolean {
  if (typeof document === 'undefined') return false
  const root = document.documentElement
  return root.classList.contains('theme-minimal') || root.classList.contains('theme-fey')
}

const urgencyColors = {
  CRITICAL: 'border-red-500',
  HIGH: 'border-orange-400',
  MEDIUM: 'border-yellow-400',
  LOW: 'border-gray-400',
} as const

export const EntityNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as { label: string; type: string; status: string; urgency?: string; campaignId?: string; entityId?: string; variant?: 'primary' | 'leaf'; dimmed?: boolean; highlighted?: boolean }
  const light = isLightTheme()
  const type = (nodeData.type as EntityType)
  const theme = ENTITY_GRAPH_NODE_THEME[type] ?? ENTITY_GRAPH_NODE_THEME.NPC
  const Icon = ENTITY_ICON[type] ?? ENTITY_ICON.NPC

  const bgClass = light ? theme.bgLight : theme.bgDark
  const textClass = light ? theme.textLight : theme.textDark

  const isInactive = nodeData.status === 'INACTIVE' || nodeData.status === 'DEAD' || nodeData.status === 'DESTROYED' || nodeData.status === 'RETIRED' || nodeData.status === 'RESOLVED'
  const isLeaf = nodeData.variant === 'leaf'

  const borderClass = isLeaf
    ? 'border-dashed border-white/30'
    : nodeData.type === 'THREAD' && nodeData.urgency && urgencyColors[nodeData.urgency as keyof typeof urgencyColors]
      ? urgencyColors[nodeData.urgency as keyof typeof urgencyColors]
      : theme.border

  const mutedTextColor = light ? 'text-foreground/50' : 'text-white/40'
  const isDimmed = nodeData.dimmed === true
  const isHighlighted = nodeData.highlighted === true

  return (
    <>
      <Handle type="target" position={Position.Top} className="!border-0 !bg-white/20 !w-2 !h-2" />
      <div
        className={`
          group relative px-3 py-2 rounded-lg border-2 backdrop-blur-sm
          min-w-[120px] max-w-[180px] cursor-pointer
          transition-all duration-150
          ${bgClass} ${borderClass}
          ${isLeaf && !isHighlighted && !isDimmed ? 'opacity-70' : ''}
          ${isHighlighted ? 'ring-2 ring-white/60 scale-110 shadow-lg' : ''}
          ${isDimmed ? 'opacity-20 scale-95' : ''}
          ${!isDimmed && !isHighlighted && selected ? 'ring-2 ring-white/50 scale-105' : ''}
          ${isInactive && !isDimmed ? 'opacity-50' : ''}
        `}
      >
        <div className="flex items-center gap-2">
          <Icon className={`h-3 w-3 shrink-0 ${textClass}`} />
          <span title={nodeData.label} className={`text-xs font-medium truncate ${textClass}`}>
            {nodeData.label}
          </span>
        </div>
        {isLeaf && (
          <div className="mt-1">
            <span className={`text-[9px] uppercase tracking-wider ${mutedTextColor}`}>
              campaign
            </span>
          </div>
        )}
        {!isLeaf && nodeData.status && nodeData.status !== 'ACTIVE' && nodeData.status !== 'OPEN' && (
          <div className="mt-1">
            <span className={`text-[9px] uppercase tracking-wider ${mutedTextColor}`}>
              {nodeData.status}
            </span>
          </div>
        )}
        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <ExternalLink className={`h-2.5 w-2.5 ${mutedTextColor}`} />
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!border-0 !bg-white/20 !w-2 !h-2" />
    </>
  )
})

EntityNode.displayName = 'EntityNode'
