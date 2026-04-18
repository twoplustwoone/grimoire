import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  forceX,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from 'd3-force'
import type { Node, Edge } from '@xyflow/react'

export interface RawNode {
  id: string
  type: string
  label: string
  status: string | null
  urgency?: string
}

export interface RawEdge {
  id: string
  source: string
  target: string
  label: string
  type: string
}

interface SimNode extends SimulationNodeDatum {
  id: string
  entityType: string
}

const typeCharge: Record<string, number> = {
  FACTION: -800,
  NPC: -500,
  LOCATION: -400,
  THREAD: -600,
  CLUE: -300,
}

const typeXBias: Record<string, number> = {
  FACTION: -300,
  NPC: -100,
  LOCATION: 100,
  THREAD: 300,
  CLUE: 400,
}

const edgeStyleMap: Record<string, { stroke: string; strokeDasharray?: string }> = {
  relationship: { stroke: '#e8b44b' },
  membership: { stroke: '#a78bfa' },
  location: { stroke: '#34d399' },
  thread_tag: { stroke: '#fb923c', strokeDasharray: '4 2' },
}

function buildEdges(rawEdges: RawEdge[], validIds: Set<string>): Edge[] {
  return rawEdges
    .filter(e => validIds.has(e.source) && validIds.has(e.target))
    .map(e => {
      const style = edgeStyleMap[e.type] ?? { stroke: '#6b7280' }
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label,
        type: 'smoothstep',
        animated: e.type === 'thread_tag',
        style,
        labelStyle: { fill: '#9ca3af', fontSize: 10 },
        labelBgStyle: { fill: 'transparent' },
        data: { edgeType: e.type },
      }
    })
}

export function buildGraphLayout(
  rawNodes: RawNode[],
  rawEdges: RawEdge[],
  campaignId: string
): { nodes: Node[]; edges: Edge[] } {
  if (rawNodes.length === 0) return { nodes: [], edges: [] }

  const width = 1200
  const height = 800

  const simNodes: SimNode[] = rawNodes.map(n => ({
    id: n.id,
    entityType: n.type,
    x: Math.random() * width - width / 2,
    y: Math.random() * height - height / 2,
  }))

  const nodeIndex = new Map(simNodes.map(n => [n.id, n]))

  const validEdges = rawEdges.filter(
    e => nodeIndex.has(e.source) && nodeIndex.has(e.target)
  )

  const simLinks: SimulationLinkDatum<SimNode>[] = validEdges.map(e => ({
    source: e.source,
    target: e.target,
  }))

  const simulation = forceSimulation<SimNode>(simNodes)
    .force(
      'link',
      forceLink<SimNode, SimulationLinkDatum<SimNode>>(simLinks)
        .id(d => d.id)
        .distance(180)
        .strength(0.6)
    )
    .force(
      'charge',
      forceManyBody<SimNode>().strength(d => typeCharge[d.entityType] ?? -400)
    )
    .force('center', forceCenter(0, 0).strength(0.05))
    .force('collide', forceCollide<SimNode>(90))
    .force(
      'xBias',
      forceX<SimNode>(d => typeXBias[d.entityType] ?? 0).strength(0.04)
    )
    .stop()

  const ticks = Math.ceil(
    Math.log(simulation.alphaMin()) / Math.log(1 - simulation.alphaDecay())
  )
  for (let i = 0; i < Math.min(ticks, 400); i++) {
    simulation.tick()
  }

  const rawById = new Map(rawNodes.map(n => [n.id, n]))
  const nodes: Node[] = simNodes.map(simNode => {
    const raw = rawById.get(simNode.id)!
    return {
      id: simNode.id,
      type: 'entityNode',
      position: {
        x: simNode.x ?? 0,
        y: simNode.y ?? 0,
      },
      data: {
        label: raw.label,
        type: raw.type,
        status: raw.status,
        urgency: raw.urgency,
        campaignId,
      },
    }
  })

  const edges: Edge[] = buildEdges(validEdges, new Set(nodeIndex.keys()))

  return { nodes, edges }
}

export function buildColumnLayout(
  rawNodes: RawNode[],
  rawEdges: RawEdge[],
  campaignId: string
): { nodes: Node[]; edges: Edge[] } {
  const TYPE_ORDER = ['FACTION', 'NPC', 'LOCATION', 'THREAD', 'CLUE']
  const SPACING_X = 220
  const SPACING_Y = 160

  const byType: Record<string, RawNode[]> = {}
  rawNodes.forEach(n => {
    if (!byType[n.type]) byType[n.type] = []
    byType[n.type].push(n)
  })

  const nodes: Node[] = []
  TYPE_ORDER.forEach((type, colIndex) => {
    const group = byType[type] ?? []
    group.forEach((node, rowIndex) => {
      nodes.push({
        id: node.id,
        type: 'entityNode',
        position: { x: colIndex * SPACING_X, y: rowIndex * SPACING_Y },
        data: {
          label: node.label,
          type: node.type,
          status: node.status,
          urgency: node.urgency,
          campaignId,
        },
      })
    })
  })

  const validIds = new Set(nodes.map(n => n.id))
  const edges = buildEdges(rawEdges, validIds)

  return { nodes, edges }
}
