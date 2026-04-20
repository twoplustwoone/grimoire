'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { BookOpen, Eye, EyeOff, MoreHorizontal, Trash2, Pencil, Check, X } from 'lucide-react'
import { MentionRenderer } from '@/components/mentions/mention-renderer'

interface InfoNode {
  id: string
  title: string
  content: string
  visibility: 'GM_ONLY' | 'ALL_PLAYERS' | 'SPECIFIC_PLAYERS'
  createdAt: Date
}

interface Props {
  nodes: InfoNode[]
  campaignId: string
  entityType: string
  entityId: string
}

const visibilityConfig = {
  GM_ONLY: { label: 'GM Only', icon: EyeOff, color: 'text-muted-foreground' },
  ALL_PLAYERS: { label: 'All Players', icon: Eye, color: 'text-green-500' },
  SPECIFIC_PLAYERS: { label: 'Some Players', icon: Eye, color: 'text-yellow-500' },
}

export function InformationNodes({ nodes: initialNodes, campaignId }: Props) {
  const router = useRouter()
  const [nodes, setNodes] = useState<InfoNode[]>(initialNodes)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')

  async function handleDelete(nodeId: string) {
    const res = await fetch(
      `/api/v1/campaigns/${campaignId}/information-nodes/${nodeId}`,
      { method: 'DELETE', credentials: 'include' }
    )
    if (res.ok) {
      setNodes(nodes.filter(n => n.id !== nodeId))
      router.refresh()
    }
  }

  async function handleVisibilityToggle(node: InfoNode) {
    const next = node.visibility === 'GM_ONLY' ? 'ALL_PLAYERS' : 'GM_ONLY'
    const res = await fetch(
      `/api/v1/campaigns/${campaignId}/information-nodes/${node.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ visibility: next }),
      }
    )
    if (res.ok) {
      setNodes(nodes.map(n => n.id === node.id ? { ...n, visibility: next } : n))
      router.refresh()
    }
  }

  async function handleSaveEdit(nodeId: string) {
    const res = await fetch(
      `/api/v1/campaigns/${campaignId}/information-nodes/${nodeId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title: editTitle, content: editContent }),
      }
    )
    if (res.ok) {
      setNodes(nodes.map(n => n.id === nodeId ? { ...n, title: editTitle, content: editContent } : n))
      setEditingId(null)
      router.refresh()
    }
  }

  if (nodes.length === 0) return null

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          Known Information
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {nodes.map((node) => {
            const visConfig = visibilityConfig[node.visibility]
            const VisIcon = visConfig.icon
            const isEditing = editingId === node.id

            return (
              <div key={node.id} className="group border-l-2 pl-3 py-1 space-y-1">
                {isEditing ? (
                  <div className="space-y-2">
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      autoFocus
                    />
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={3}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleSaveEdit(node.id)}>
                        <Check className="h-3 w-3 mr-1" />Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                        <X className="h-3 w-3 mr-1" />Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">{node.title}</p>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleVisibilityToggle(node)}
                          className={`flex h-11 w-11 md:h-8 md:w-8 items-center justify-center rounded-md transition-colors ${visConfig.color} hover:opacity-70`}
                          title={`Visibility: ${visConfig.label} — click to toggle`}
                          aria-label={`Visibility: ${visConfig.label} — click to toggle`}
                        >
                          <VisIcon className="h-4 w-4" />
                        </button>
                        <InfoNodeActions
                          node={node}
                          onStartEdit={(id, t, c) => { setEditingId(id); setEditTitle(t); setEditContent(c) }}
                          onDelete={handleDelete}
                        />
                      </div>
                    </div>
                    <MentionRenderer content={node.content} campaignId={campaignId} />
                    <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">
                      {visConfig.label}
                    </p>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function InfoNodeActions({
  node,
  onStartEdit,
  onDelete,
}: {
  node: InfoNode
  onStartEdit: (id: string, title: string, content: string) => void
  onDelete: (id: string) => void
}) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex h-11 w-11 md:h-8 md:w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Information node actions"
        >
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={() => onStartEdit(node.id, node.title, node.content)}>
            <Pencil className="h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setDeleteDialogOpen(true)}>
            <Trash2 className="h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this information node?</AlertDialogTitle>
            <AlertDialogDescription>
              This information node will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete(node.id)
                setDeleteDialogOpen(false)
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
