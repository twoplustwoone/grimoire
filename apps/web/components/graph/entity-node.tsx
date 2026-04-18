'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Users, MapPin, Shield, GitBranch, Search } from 'lucide-react'

const typeConfig = {
  NPC: { icon: Users, color: 'border-blue-400 bg-blue-950/80', textColor: 'text-blue-200', dotColor: 'bg-blue-400' },
  LOCATION: { icon: MapPin, color: 'border-green-400 bg-green-950/80', textColor: 'text-green-200', dotColor: 'bg-green-400' },
  FACTION: { icon: Shield, color: 'border-purple-400 bg-purple-950/80', textColor: 'text-purple-200', dotColor: 'bg-purple-400' },
  THREAD: { icon: GitBranch, color: 'border-orange-400 bg-orange-950/80', textColor: 'text-orange-200', dotColor: 'bg-orange-400' },
  CLUE: { icon: Search, color: 'border-yellow-400 bg-yellow-950/80', textColor: 'text-yellow-200', dotColor: 'bg-yellow-400' },
}

const urgencyColors = {
  CRITICAL: 'border-red-500',
  HIGH: 'border-orange-400',
  MEDIUM: 'border-yellow-400',
  LOW: 'border-gray-400',
}

export const EntityNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as { label: string; type: string; status: string; urgency?: string; campaignId?: string; entityId?: string }
  const config = typeConfig[nodeData.type as keyof typeof typeConfig] ?? typeConfig.NPC
  const Icon = config.icon

  const isInactive = nodeData.status === 'INACTIVE' || nodeData.status === 'DEAD' || nodeData.status === 'DESTROYED' || nodeData.status === 'RETIRED' || nodeData.status === 'RESOLVED'

  const urgencyBorder = nodeData.type === 'THREAD' && nodeData.urgency
    ? urgencyColors[nodeData.urgency as keyof typeof urgencyColors]
    : ''

  return (
    <>
      <Handle type="target" position={Position.Top} className="!border-0 !bg-white/20 !w-2 !h-2" />
      <div
        className={`
          relative px-3 py-2 rounded-lg border-2 backdrop-blur-sm
          min-w-[120px] max-w-[180px] cursor-pointer
          transition-all duration-150
          ${urgencyBorder || config.color}
          ${selected ? 'ring-2 ring-white/50 scale-105' : 'hover:scale-102'}
          ${isInactive ? 'opacity-50' : ''}
        `}
      >
        <div className="flex items-center gap-2">
          <Icon className={`h-3 w-3 shrink-0 ${config.textColor}`} />
          <span className={`text-xs font-medium truncate ${config.textColor}`}>
            {nodeData.label}
          </span>
        </div>
        {nodeData.status && nodeData.status !== 'ACTIVE' && nodeData.status !== 'OPEN' && (
          <div className="mt-1">
            <span className="text-[9px] text-white/40 uppercase tracking-wider">
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
