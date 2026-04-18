'use client'

import { Fragment, useEffect, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  BackgroundVariant,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { EntityNode } from './entity-node'
import { buildGraphLayout, buildColumnLayout, type RawNode, type RawEdge } from '@/lib/graph-layout'
import { useRouter } from 'next/navigation'

const nodeTypes = { entityNode: EntityNode }

interface Props {
  campaignId: string
}

type FilterType = 'ALL' | 'NPC' | 'LOCATION' | 'FACTION' | 'THREAD' | 'CLUE'
type LayoutMode = 'force' | 'column'

export function CampaignGraph({ campaignId }: Props) {
  const router = useRouter()
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterType>('ALL')
  const [allNodes, setAllNodes] = useState<Node[]>([])
  const [rawData, setRawData] = useState<{ nodes: RawNode[]; edges: RawEdge[] } | null>(null)
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('force')

  useEffect(() => {
    async function loadGraph() {
      setLoading(true)
      try {
        const res = await fetch(`/api/v1/graph?campaignId=${campaignId}`, {
          credentials: 'include',
        })
        if (!res.ok) throw new Error('Failed to load graph')
        const data = await res.json()
        setRawData({ nodes: data.nodes, edges: data.edges })
      } catch {
        setError('Failed to load relationship graph')
      } finally {
        setLoading(false)
      }
    }
    loadGraph()
  }, [campaignId])

  useEffect(() => {
    if (!rawData) return
    const layoutFn = layoutMode === 'force' ? buildGraphLayout : buildColumnLayout
    const { nodes: layoutNodes, edges: layoutEdges } = layoutFn(
      rawData.nodes,
      rawData.edges,
      campaignId
    )
    setAllNodes(layoutNodes)
    setNodes(layoutNodes)
    setEdges(layoutEdges)
  }, [rawData, layoutMode, campaignId, setNodes, setEdges])

  useEffect(() => {
    if (filter === 'ALL') {
      setNodes(allNodes)
    } else {
      setNodes(allNodes.filter(n => (n.data as { type: string }).type === filter))
    }
  }, [filter, allNodes, setNodes])

  function handleNodeClick(_: React.MouseEvent, node: Node) {
    const data = node.data as { type: string }
    const typePaths: Record<string, string> = {
      NPC: 'npcs',
      LOCATION: 'locations',
      FACTION: 'factions',
      THREAD: 'threads',
      CLUE: 'clues',
    }
    const path = typePaths[data.type]
    if (path) {
      router.push(`/campaigns/${campaignId}/${path}/${node.id}`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Loading graph...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-destructive">
        {error}
      </div>
    )
  }

  const filterTypes: FilterType[] = ['ALL', 'NPC', 'LOCATION', 'FACTION', 'THREAD', 'CLUE']

  return (
    <div className="w-full h-full relative">
      <div className="absolute top-4 left-4 right-4 z-10 flex gap-1.5 flex-wrap">
        {filterTypes.map((type, i) => (
          <Fragment key={type}>
            <button
              onClick={() => setFilter(type)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
                filter === type
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border hover:text-foreground'
              }`}
            >
              {type}
            </button>
            {i === 0 && <div className="w-px bg-border self-stretch mx-0.5" />}
          </Fragment>
        ))}
        <div className="w-px bg-border self-stretch mx-0.5" />
        <button
          onClick={() => setLayoutMode(m => m === 'force' ? 'column' : 'force')}
          className="px-2.5 py-1 rounded-full text-xs font-medium transition-colors border bg-card text-muted-foreground border-border hover:text-foreground"
          title={layoutMode === 'force' ? 'Switch to column layout' : 'Switch to force layout'}
        >
          {layoutMode === 'force' ? '⬡ Force' : '▦ Grid'}
        </button>
      </div>

      {!loading && !error && allNodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="text-center space-y-2 max-w-sm px-6">
            <p className="text-muted-foreground font-medium">No entities yet</p>
            <p className="text-sm text-muted-foreground/70">
              Create NPCs, Locations, Factions, Threads, or Clues to see them connected here.
            </p>
          </div>
        </div>
      )}

      <div className="absolute top-14 left-4 right-4 z-10 flex gap-3 flex-wrap md:hidden">
        {[
          { color: 'bg-blue-400', label: 'NPC' },
          { color: 'bg-green-400', label: 'Loc' },
          { color: 'bg-purple-400', label: 'Faction' },
          { color: 'bg-orange-400', label: 'Thread' },
          { color: 'bg-yellow-400', label: 'Clue' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${color}`} />
            <span className="text-[10px] text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={handleNodeClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2}
        className="bg-background"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="currentColor"
          className="text-muted-foreground/20"
        />
        <Controls className="[&>button]:bg-card [&>button]:border-border [&>button]:text-foreground" />
        <div className="hidden md:block">
          <MiniMap
            className="!bg-card !border-border"
            nodeColor={(node) => {
              const colors: Record<string, string> = {
                NPC: '#60a5fa',
                LOCATION: '#34d399',
                FACTION: '#a78bfa',
                THREAD: '#fb923c',
                CLUE: '#fbbf24',
              }
              return colors[(node.data as { type: string }).type] ?? '#6b7280'
            }}
          />
        </div>
      </ReactFlow>

      <div className="absolute top-16 right-4 z-10 bg-card border rounded-lg p-3 text-xs space-y-1.5 hidden md:block">
        <p className="font-semibold text-foreground/60 uppercase tracking-wider text-[10px] mb-2">Legend</p>
        {[
          { color: 'bg-blue-400', label: 'NPC' },
          { color: 'bg-green-400', label: 'Location' },
          { color: 'bg-purple-400', label: 'Faction' },
          { color: 'bg-orange-400', label: 'Thread' },
          { color: 'bg-yellow-400', label: 'Clue' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${color}`} />
            <span className="text-muted-foreground">{label}</span>
          </div>
        ))}
        <div className="border-t mt-2 pt-2 space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-4 h-px bg-yellow-400" />
            <span className="text-muted-foreground">Relationship</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-px bg-purple-400" />
            <span className="text-muted-foreground">Membership</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-px bg-green-400" />
            <span className="text-muted-foreground">Location</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-px border-t-2 border-dashed border-orange-400" />
            <span className="text-muted-foreground">Thread</span>
          </div>
        </div>
      </div>
    </div>
  )
}
