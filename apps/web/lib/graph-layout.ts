import type { Node, Edge } from '@xyflow/react'

interface RawNode {
  id: string
  type: string
  label: string
  status: string | null
  urgency?: string
}

interface RawEdge {
  id: string
  source: string
  target: string
  label: string
  type: string
}

const TYPE_ORDER = ['FACTION', 'NPC', 'LOCATION', 'THREAD', 'CLUE']
const SPACING_X = 220
const SPACING_Y = 160

export function buildGraphLayout(
  rawNodes: RawNode[],
  rawEdges: RawEdge[],
  campaignId: string
): { nodes: Node[]; edges: Edge[] } {
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
        position: {
          x: colIndex * SPACING_X,
          y: rowIndex * SPACING_Y,
        },
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

  const edgeStyleMap: Record<string, { stroke: string; strokeDasharray?: string }> = {
    relationship: { stroke: '#e8b44b' },
    membership: { stroke: '#a78bfa' },
    location: { stroke: '#34d399' },
    thread_tag: { stroke: '#fb923c', strokeDasharray: '4 2' },
  }

  const edges: Edge[] = rawEdges.map(e => {
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
      labelBgStyle: { fill: '#1a1a2e', fillOpacity: 0.85 },
      labelBgPadding: [2, 4] as [number, number],
      labelBgBorderRadius: 3,
    }
  })

  return { nodes, edges }
}
