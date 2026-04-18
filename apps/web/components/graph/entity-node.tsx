'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Users, MapPin, Shield, GitBranch, Search } from 'lucide-react'

function isLightTheme(): boolean {
  if (typeof document === 'undefined') return false
  const root = document.documentElement
  return root.classList.contains('theme-minimal') || root.classList.contains('theme-fey')
}

function getTypeConfig(light: boolean) {
  return {
    NPC: {
      icon: Users,
      bg: light ? 'bg-blue-50/90' : 'bg-blue-950/80',
      border: 'border-blue-400',
      textColor: light ? 'text-blue-700' : 'text-blue-200',
    },
    LOCATION: {
      icon: MapPin,
      bg: light ? 'bg-green-50/90' : 'bg-green-950/80',
      border: 'border-green-400',
      textColor: light ? 'text-green-700' : 'text-green-200',
    },
    FACTION: {
      icon: Shield,
      bg: light ? 'bg-purple-50/90' : 'bg-purple-950/80',
      border: 'border-purple-400',
      textColor: light ? 'text-purple-700' : 'text-purple-200',
    },
    THREAD: {
      icon: GitBranch,
      bg: light ? 'bg-orange-50/90' : 'bg-orange-950/80',
      border: 'border-orange-400',
      textColor: light ? 'text-orange-700' : 'text-orange-200',
    },
    CLUE: {
      icon: Search,
      bg: light ? 'bg-yellow-50/90' : 'bg-yellow-950/80',
      border: 'border-yellow-400',
      textColor: light ? 'text-yellow-700' : 'text-yellow-200',
    },
  } as const
}

const urgencyColors = {
  CRITICAL: 'border-red-500',
  HIGH: 'border-orange-400',
  MEDIUM: 'border-yellow-400',
  LOW: 'border-gray-400',
} as const

export const EntityNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as { label: string; type: string; status: string; urgency?: string; campaignId?: string; entityId?: string }
  const light = isLightTheme()
  const typeConfig = getTypeConfig(light)
  const config = typeConfig[nodeData.type as keyof typeof typeConfig] ?? typeConfig.NPC
  const Icon = config.icon

  const isInactive = nodeData.status === 'INACTIVE' || nodeData.status === 'DEAD' || nodeData.status === 'DESTROYED' || nodeData.status === 'RETIRED' || nodeData.status === 'RESOLVED'

  const borderClass = nodeData.type === 'THREAD' && nodeData.urgency && urgencyColors[nodeData.urgency as keyof typeof urgencyColors]
    ? urgencyColors[nodeData.urgency as keyof typeof urgencyColors]
    : config.border

  const mutedTextColor = light ? 'text-foreground/50' : 'text-white/40'

  return (
    <>
      <Handle type="target" position={Position.Top} className="!border-0 !bg-white/20 !w-2 !h-2" />
      <div
        className={`
          relative px-3 py-2 rounded-lg border-2 backdrop-blur-sm
          min-w-[120px] max-w-[180px] cursor-pointer
          transition-all duration-150
          ${config.bg} ${borderClass}
          ${selected ? 'ring-2 ring-white/50 scale-105' : 'hover:scale-105'}
          ${isInactive ? 'opacity-50' : ''}
        `}
      >
        <div className="flex items-center gap-2">
          <Icon className={`h-3 w-3 shrink-0 ${config.textColor}`} />
          <span title={nodeData.label} className={`text-xs font-medium truncate ${config.textColor}`}>
            {nodeData.label}
          </span>
        </div>
        {nodeData.status && nodeData.status !== 'ACTIVE' && nodeData.status !== 'OPEN' && (
          <div className="mt-1">
            <span className={`text-[9px] uppercase tracking-wider ${mutedTextColor}`}>
              {nodeData.status}
            </span>
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!border-0 !bg-white/20 !w-2 !h-2" />
    </>
  )
})

EntityNode.displayName = 'EntityNode'
