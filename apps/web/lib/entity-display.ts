import {
  Users,
  UserCircle,
  MapPin,
  Shield,
  GitBranch,
  Search,
  Calendar,
  Globe,
  type LucideIcon,
} from 'lucide-react'

export type EntityType =
  | 'NPC'
  | 'PLAYER_CHARACTER'
  | 'LOCATION'
  | 'FACTION'
  | 'THREAD'
  | 'CLUE'
  | 'SESSION'
  | 'WORLD_EVENT'

// Short uppercase label for chips and pills. Matches the pre-existing
// uppercase treatment; only PLAYER_CHARACTER and WORLD_EVENT are shortened.
export const ENTITY_LABEL: Record<EntityType, string> = {
  NPC: 'NPC',
  PLAYER_CHARACTER: 'PC',
  LOCATION: 'LOCATION',
  FACTION: 'FACTION',
  THREAD: 'THREAD',
  CLUE: 'CLUE',
  SESSION: 'SESSION',
  WORLD_EVENT: 'EVENT',
}

// Sentence-case variant for legends and longer text surfaces.
export const ENTITY_LABEL_SENTENCE: Record<EntityType, string> = {
  NPC: 'NPC',
  PLAYER_CHARACTER: 'Player Character',
  LOCATION: 'Location',
  FACTION: 'Faction',
  THREAD: 'Thread',
  CLUE: 'Clue',
  SESSION: 'Session',
  WORLD_EVENT: 'World Event',
}

export const ENTITY_ICON: Record<EntityType, LucideIcon> = {
  NPC: Users,
  PLAYER_CHARACTER: UserCircle,
  LOCATION: MapPin,
  FACTION: Shield,
  THREAD: GitBranch,
  CLUE: Search,
  SESSION: Calendar,
  WORLD_EVENT: Globe,
}

// The URL segment under /campaigns/:id for each entity type. null means
// the type doesn't have a dedicated detail page.
export const ENTITY_ROUTE_PATH: Record<EntityType, string | null> = {
  NPC: 'npcs',
  PLAYER_CHARACTER: 'player-characters',
  LOCATION: 'locations',
  FACTION: 'factions',
  THREAD: 'threads',
  CLUE: 'clues',
  SESSION: 'sessions',
  WORLD_EVENT: 'world-events',
}

// Chip styling used for mention pills and session-tag chips.
// Tailwind JIT can't see dynamic class composition, so each entry is a
// pre-composed string.
export const ENTITY_CHIP_CLASSES: Record<EntityType, string> = {
  NPC: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  PLAYER_CHARACTER: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  LOCATION: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  FACTION: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  THREAD: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  CLUE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  SESSION: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  WORLD_EVENT: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200',
}

// Graph node theming: semi-transparent light/dark backgrounds with a
// saturated border. Graph nodes sit against the canvas, not a chip
// background, so they use a different Tailwind intensity than chips.
export interface GraphNodeTheme {
  bgLight: string
  bgDark: string
  border: string
  textLight: string
  textDark: string
}

export const ENTITY_GRAPH_NODE_THEME: Record<EntityType, GraphNodeTheme> = {
  NPC: {
    bgLight: 'bg-blue-50/90', bgDark: 'bg-blue-950/80',
    border: 'border-blue-400',
    textLight: 'text-blue-700', textDark: 'text-blue-200',
  },
  PLAYER_CHARACTER: {
    bgLight: 'bg-indigo-50/90', bgDark: 'bg-indigo-950/80',
    border: 'border-indigo-400',
    textLight: 'text-indigo-700', textDark: 'text-indigo-200',
  },
  LOCATION: {
    bgLight: 'bg-green-50/90', bgDark: 'bg-green-950/80',
    border: 'border-green-400',
    textLight: 'text-green-700', textDark: 'text-green-200',
  },
  FACTION: {
    bgLight: 'bg-purple-50/90', bgDark: 'bg-purple-950/80',
    border: 'border-purple-400',
    textLight: 'text-purple-700', textDark: 'text-purple-200',
  },
  THREAD: {
    bgLight: 'bg-orange-50/90', bgDark: 'bg-orange-950/80',
    border: 'border-orange-400',
    textLight: 'text-orange-700', textDark: 'text-orange-200',
  },
  CLUE: {
    bgLight: 'bg-yellow-50/90', bgDark: 'bg-yellow-950/80',
    border: 'border-yellow-400',
    textLight: 'text-yellow-700', textDark: 'text-yellow-200',
  },
  SESSION: {
    bgLight: 'bg-gray-50/90', bgDark: 'bg-gray-900/80',
    border: 'border-gray-400',
    textLight: 'text-gray-700', textDark: 'text-gray-200',
  },
  WORLD_EVENT: {
    bgLight: 'bg-slate-50/90', bgDark: 'bg-slate-900/80',
    border: 'border-slate-400',
    textLight: 'text-slate-700', textDark: 'text-slate-200',
  },
}

// Solid legend dot (used in the graph legend and elsewhere entities are
// listed with a color swatch).
export const ENTITY_DOT_CLASS: Record<EntityType, string> = {
  NPC: 'bg-blue-400',
  PLAYER_CHARACTER: 'bg-indigo-400',
  LOCATION: 'bg-green-400',
  FACTION: 'bg-purple-400',
  THREAD: 'bg-orange-400',
  CLUE: 'bg-yellow-400',
  SESSION: 'bg-gray-400',
  WORLD_EVENT: 'bg-slate-400',
}

// CSS hex colors keyed by type — for the ReactFlow minimap, which can't
// consume Tailwind classes.
export const ENTITY_MINIMAP_COLOR: Record<EntityType, string> = {
  NPC: '#60a5fa',            // blue-400
  PLAYER_CHARACTER: '#818cf8', // indigo-400
  LOCATION: '#34d399',       // green-400
  FACTION: '#a78bfa',        // purple-400 (violet-400)
  THREAD: '#fb923c',         // orange-400
  CLUE: '#fbbf24',           // amber-400
  SESSION: '#9ca3af',        // gray-400
  WORLD_EVENT: '#94a3b8',    // slate-400
}

function asEntityType(type: string): EntityType | null {
  return type.toUpperCase() in ENTITY_LABEL ? (type.toUpperCase() as EntityType) : null
}

export function getEntityLabel(type: string): string {
  const t = asEntityType(type)
  return t ? ENTITY_LABEL[t] : type
}

export function getEntityLabelSentence(type: string): string {
  const t = asEntityType(type)
  return t ? ENTITY_LABEL_SENTENCE[t] : type
}

export function getEntityChipClasses(type: string): string {
  const t = asEntityType(type)
  return t ? ENTITY_CHIP_CLASSES[t] : 'bg-muted text-muted-foreground'
}

export function getEntityRoutePath(type: string): string | null {
  const t = asEntityType(type)
  return t ? ENTITY_ROUTE_PATH[t] : null
}

export function getEntityDotClass(type: string): string {
  const t = asEntityType(type)
  return t ? ENTITY_DOT_CLASS[t] : 'bg-muted-foreground'
}

export function getEntityGraphNodeTheme(type: string): GraphNodeTheme {
  const t = asEntityType(type)
  return t ? ENTITY_GRAPH_NODE_THEME[t] : ENTITY_GRAPH_NODE_THEME.NPC
}

export function getEntityMinimapColor(type: string): string {
  const t = asEntityType(type)
  return t ? ENTITY_MINIMAP_COLOR[t] : '#6b7280'
}
