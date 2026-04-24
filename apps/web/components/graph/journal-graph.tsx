'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
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
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { EntityNode } from './entity-node'
import {
  buildGraphLayout,
  buildColumnLayout,
  type RawNode,
  type RawEdge,
} from '@/lib/graph-layout'
import {
  ENTITY_DOT_CLASS,
  ENTITY_LABEL_SENTENCE,
  ENTITY_ROUTE_PATH,
  getEntityMinimapColor,
  type EntityType,
} from '@/lib/entity-display'
import type { ProseMirrorDoc } from '@grimoire/db/prosemirror'
import { MentionRenderer } from '@/components/mentions/mention-renderer'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

const nodeTypes = { entityNode: EntityNode }

interface Props {
  journalId: string
  campaignId: string | null
}

type FilterType = 'ALL' | 'NPC' | 'PC' | 'LOCATION' | 'FACTION' | 'THREAD' | 'CLUE'
type LayoutMode = 'force' | 'column'

interface CaptureDetail {
  id: string
  createdAt: string
  content: ProseMirrorDoc | null
  session: { id: string; title: string | null; number: number } | null
}

interface EdgeDetailState {
  edgeId: string
  edgeType: 'cross_ref' | 'co_mention'
  sourceLabel: string
  targetLabel: string
  weight?: number
  createdAt?: string
  proposedBy?: string
  captureIds?: string[]
  captures?: CaptureDetail[]
  loading?: boolean
}

export function JournalGraph({ journalId, campaignId }: Props) {
  const router = useRouter()
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterType>('ALL')
  const [showRefs, setShowRefs] = useState(true)
  const [allNodes, setAllNodes] = useState<Node[]>([])
  const [rawData, setRawData] = useState<{ nodes: RawNode[]; edges: RawEdge[] } | null>(null)
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('force')
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [edgeDetail, setEdgeDetail] = useState<EdgeDetailState | null>(null)

  useEffect(() => {
    async function loadGraph() {
      setLoading(true)
      try {
        const res = await fetch(`/api/v1/journals/${journalId}/graph`, {
          credentials: 'include',
        })
        if (!res.ok) throw new Error('Failed to load graph')
        const data = await res.json()
        setRawData({ nodes: data.nodes, edges: data.edges })
      } catch {
        setError('Failed to load journal graph')
      } finally {
        setLoading(false)
      }
    }
    loadGraph()
  }, [journalId])

  const labelById = useMemo(() => {
    const m = new Map<string, string>()
    rawData?.nodes.forEach((n) => m.set(n.id, n.label))
    return m
  }, [rawData])

  useEffect(() => {
    if (!rawData) return
    const layoutFn = layoutMode === 'force' ? buildGraphLayout : buildColumnLayout
    // campaignId threading isn't needed here — click handler decides routes.
    const { nodes: layoutNodes, edges: layoutEdges } = layoutFn(
      rawData.nodes,
      rawData.edges,
      journalId
    )
    setAllNodes(layoutNodes)
    setNodes(layoutNodes)
    setEdges(layoutEdges)
    setHoveredNodeId(null)
  }, [rawData, layoutMode, journalId, setNodes, setEdges])

  useEffect(() => {
    const filtered = allNodes.filter((n) => {
      const d = n.data as { type: string; variant?: 'primary' | 'leaf' }
      if (d.variant === 'leaf' && !showRefs) return false
      if (filter === 'ALL') return true
      const targetType = filter === 'PC' ? 'PLAYER_CHARACTER' : filter
      return d.type === targetType
    })
    setNodes(filtered)
    setHoveredNodeId(null)
  }, [filter, showRefs, allNodes, setNodes])

  useEffect(() => {
    if (!hoveredNodeId) {
      setNodes((ns) => ns.map((n) => ({
        ...n,
        data: { ...n.data, dimmed: false, highlighted: false },
      })))
      setEdges((es) => es.map((e) => {
        const base = (e.data as { baseOpacity?: number } | undefined)?.baseOpacity ?? 1
        return {
          ...e,
          style: { ...e.style, opacity: base },
          labelStyle: { ...e.labelStyle, opacity: 1 },
        }
      }))
      return
    }

    const connectedNodeIds = new Set<string>([hoveredNodeId])
    setEdges((es) => es.map((e) => {
      const isConnected = e.source === hoveredNodeId || e.target === hoveredNodeId
      if (isConnected) {
        connectedNodeIds.add(e.source as string)
        connectedNodeIds.add(e.target as string)
      }
      const base = (e.data as { baseOpacity?: number } | undefined)?.baseOpacity ?? 1
      return {
        ...e,
        style: { ...e.style, opacity: isConnected ? 1 : Math.min(base, 0.08) },
        labelStyle: { ...e.labelStyle, opacity: isConnected ? 1 : 0 },
      }
    }))

    setNodes((ns) => ns.map((n) => ({
      ...n,
      data: {
        ...n.data,
        dimmed: !connectedNodeIds.has(n.id),
        highlighted: n.id === hoveredNodeId,
      },
    })))
  }, [hoveredNodeId, setNodes, setEdges])

  function handleNodeClick(_: React.MouseEvent, node: Node) {
    const d = node.data as { type: string; variant?: 'primary' | 'leaf' }
    const path = ENTITY_ROUTE_PATH[d.type as EntityType]
    if (!path) return
    if (d.variant === 'leaf') {
      // Leaf clicks go to the campaign side. Leaves can only exist when
      // the journal has a linked campaign (cross-refs require one).
      if (campaignId) router.push(`/campaigns/${campaignId}/${path}/${node.id}`)
    } else {
      router.push(`/journals/${journalId}/${path}/${node.id}`)
    }
  }

  async function handleEdgeClick(_: React.MouseEvent, edge: Edge) {
    const d = edge.data as
      | { edgeType?: string; weight?: number; captureIds?: string[]; createdAt?: string; proposedBy?: string }
      | undefined
    if (!d?.edgeType) return
    const edgeType = d.edgeType as 'cross_ref' | 'co_mention'
    const sourceLabel = labelById.get(edge.source as string) ?? '(unknown)'
    const targetLabel = labelById.get(edge.target as string) ?? '(unknown)'
    const next: EdgeDetailState = {
      edgeId: edge.id,
      edgeType,
      sourceLabel,
      targetLabel,
      weight: d.weight,
      createdAt: d.createdAt,
      proposedBy: d.proposedBy,
      captureIds: d.captureIds,
      loading: edgeType === 'co_mention' && (d.captureIds?.length ?? 0) > 0,
    }
    setEdgeDetail(next)

    if (edgeType === 'co_mention' && d.captureIds && d.captureIds.length > 0) {
      try {
        const res = await fetch(`/api/v1/journals/${journalId}/captures`, {
          credentials: 'include',
        })
        if (res.ok) {
          const rows = await res.json()
          const wanted = new Set(d.captureIds)
          const captures: CaptureDetail[] = (rows as Array<{
            id: string
            createdAt: string
            content: unknown
            journalSession?: { id: string; title: string | null; number: number } | null
          }>)
            .filter((r) => wanted.has(r.id))
            .map((r) => ({
              id: r.id,
              createdAt: r.createdAt,
              content: (r.content as ProseMirrorDoc | null) ?? null,
              session: r.journalSession ?? null,
            }))
          setEdgeDetail((prev) =>
            prev && prev.edgeId === next.edgeId
              ? { ...prev, captures, loading: false }
              : prev
          )
        } else {
          setEdgeDetail((prev) =>
            prev && prev.edgeId === next.edgeId ? { ...prev, loading: false } : prev
          )
        }
      } catch {
        setEdgeDetail((prev) =>
          prev && prev.edgeId === next.edgeId ? { ...prev, loading: false } : prev
        )
      }
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

  const filterTypes: FilterType[] = ['ALL', 'NPC', 'PC', 'LOCATION', 'FACTION', 'THREAD', 'CLUE']
  const hasAnyLeaves = allNodes.some((n) => (n.data as { variant?: string }).variant === 'leaf')

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
        {hasAnyLeaves && (
          <>
            <div className="w-px bg-border self-stretch mx-0.5" />
            <button
              onClick={() => setShowRefs((s) => !s)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
                showRefs
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border hover:text-foreground'
              }`}
              title="Toggle campaign cross-references"
            >
              Campaign refs
            </button>
          </>
        )}
        <div className="w-px bg-border self-stretch mx-0.5" />
        <button
          onClick={() => setLayoutMode((m) => (m === 'force' ? 'column' : 'force'))}
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
              Your journal&apos;s graph will appear here as you write captures and create entities.
            </p>
          </div>
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onNodeMouseEnter={(_event, node) => setHoveredNodeId(node.id)}
        onNodeMouseLeave={() => setHoveredNodeId(null)}
        onPaneClick={() => setHoveredNodeId(null)}
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
            nodeColor={(node) => getEntityMinimapColor((node.data as { type: string }).type)}
          />
        </div>
      </ReactFlow>

      <div className="absolute top-16 right-4 z-10 bg-card border rounded-lg p-3 text-xs space-y-1.5 hidden md:block">
        <p className="font-semibold text-foreground/60 uppercase tracking-wider text-[10px] mb-2">Legend</p>
        {(['NPC', 'PLAYER_CHARACTER', 'LOCATION', 'FACTION', 'THREAD', 'CLUE'] as const).map((type) => (
          <div key={type} className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${ENTITY_DOT_CLASS[type]}`} />
            <span className="text-muted-foreground">{ENTITY_LABEL_SENTENCE[type]}</span>
          </div>
        ))}
        <div className="border-t mt-2 pt-2 space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-4 h-px bg-indigo-400" />
            <span className="text-muted-foreground">Cross-ref</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-px border-t-2 border-dashed border-slate-400" />
            <span className="text-muted-foreground">Co-mentioned</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded border-2 border-dashed border-white/50" />
            <span className="text-muted-foreground">Campaign ref</span>
          </div>
        </div>
      </div>

      <Sheet open={!!edgeDetail} onOpenChange={(open) => !open && setEdgeDetail(null)}>
        <SheetContent side="right" className="overflow-y-auto">
          {edgeDetail && (
            <EdgeDetailPanel
              detail={edgeDetail}
              journalId={journalId}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

function EdgeDetailPanel({
  detail,
  journalId,
}: {
  detail: EdgeDetailState
  journalId: string
}) {
  if (detail.edgeType === 'cross_ref') {
    return (
      <>
        <SheetHeader>
          <SheetTitle>Cross-reference</SheetTitle>
          <SheetDescription>
            {detail.sourceLabel} &rarr; {detail.targetLabel}
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-3 text-sm">
          {detail.createdAt && (
            <p className="text-muted-foreground">
              Linked on{' '}
              <time dateTime={detail.createdAt}>
                {new Date(detail.createdAt).toLocaleDateString()}
              </time>
            </p>
          )}
          {detail.proposedBy && (
            <p className="text-muted-foreground">
              Proposed by <span className="font-medium">{detail.proposedBy.toLowerCase()}</span>
            </p>
          )}
          <p className="text-muted-foreground">
            The journal entity on the left is tagged as the same thing as the
            campaign entity on the right.
          </p>
        </div>
      </>
    )
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle>Co-mentioned</SheetTitle>
        <SheetDescription>
          {detail.sourceLabel} &harr; {detail.targetLabel}
        </SheetDescription>
      </SheetHeader>
      <div className="space-y-4 text-sm">
        <p className="text-muted-foreground">
          {(detail.weight ?? 1) === 1
            ? 'Mentioned together in 1 capture.'
            : `Mentioned together in ${detail.weight} captures.`}
        </p>
        {detail.loading && <p className="text-muted-foreground">Loading captures...</p>}
        {detail.captures?.map((capture) => (
          <div key={capture.id} className="border rounded-lg p-3 space-y-2 bg-card">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {capture.session?.title?.trim()
                  ? capture.session.title
                  : capture.session
                  ? `Session ${capture.session.number}`
                  : 'Capture'}
                {' · '}
                <time dateTime={capture.createdAt}>
                  {new Date(capture.createdAt).toLocaleString()}
                </time>
              </span>
              {capture.session && (
                <Link
                  href={`/journals/${journalId}/sessions/${capture.session.id}`}
                  className="hover:underline"
                >
                  Open in session
                </Link>
              )}
            </div>
            <MentionRenderer content={capture.content} journalId={journalId} />
          </div>
        ))}
      </div>
    </>
  )
}
