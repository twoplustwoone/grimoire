'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Copy, Check, Trash2, Plus, Key } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface ApiKey {
  id: string
  name: string
  keyPrefix: string
  lastUsedAt: string | null
  createdAt: string
}

export function ApiKeyManager() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/v1/api-keys', { credentials: 'include' })
      .then(r => r.json())
      .then(data => { setKeys(data); setLoading(false) })
  }, [])

  async function handleCreate() {
    setCreating(true)
    const res = await fetch('/api/v1/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name: newKeyName || 'My API Key' }),
    })
    const data = await res.json()
    if (res.ok) {
      setKeys([data, ...keys])
      setNewKeyValue(data.key)
      setNewKeyName('')
      setShowCreateForm(false)
    }
    setCreating(false)
  }

  async function handleDelete(keyId: string) {
    await fetch(`/api/v1/api-keys/${keyId}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    setKeys(keys.filter(k => k.id !== keyId))
  }

  async function copyKey(key: string) {
    await navigator.clipboard.writeText(key)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      {newKeyValue && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base text-primary">API Key Created</CardTitle>
            <CardDescription>
              Copy this key now — it won&apos;t be shown again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 items-center">
              <code className="flex-1 text-xs bg-background border rounded-md px-3 py-2 font-mono truncate">
                {newKeyValue}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyKey(newKeyValue)}
                aria-label="Copy API key"
              >
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="mt-2 text-muted-foreground"
              onClick={() => setNewKeyValue(null)}
            >
              I&apos;ve saved my key
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Key className="h-4 w-4" />
                API Keys
              </CardTitle>
              <CardDescription className="mt-1">
                Use API keys to connect Grimoire to Claude Desktop and other MCP clients.
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => setShowCreateForm(!showCreateForm)}
              variant={showCreateForm ? 'outline' : 'default'}
            >
              <Plus className="h-4 w-4 mr-1" />
              New Key
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showCreateForm && (
            <div className="flex gap-2 mb-4">
              <Input
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="Key name (e.g. Claude Desktop)"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
              <Button onClick={handleCreate} disabled={creating} size="sm">
                {creating ? 'Creating...' : 'Create'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
            </div>
          )}

          {loading ? (
            <div className="py-4 text-sm text-muted-foreground">Loading...</div>
          ) : keys.length === 0 && !showCreateForm ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No API keys yet. Create one to connect Grimoire to Claude Desktop.
            </div>
          ) : (
            <div className="space-y-3">
              {keys.map((key) => (
                <div key={key.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{key.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {key.keyPrefix}••••••••
                      {key.lastUsedAt
                        ? ` · Last used ${new Date(key.lastUsedAt).toLocaleDateString()}`
                        : ' · Never used'}
                    </p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        className="text-muted-foreground hover:text-destructive transition-colors p-1"
                        aria-label="Delete API key"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete API key?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Any Claude Desktop or MCP client using this key will lose access immediately.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(key.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Connect to Claude Desktop</CardTitle>
          <CardDescription>
            The recommended way to connect Grimoire to Claude
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>1. Open Claude Desktop → Settings → Connectors</p>
            <p>2. Click &ldquo;Add custom connector&rdquo;</p>
            <p>3. Enter:</p>
            <ul className="ml-4 space-y-1">
              <li>Name: <code className="text-xs bg-muted px-1 py-0.5 rounded">Grimoire</code></li>
              <li>URL: <code className="text-xs bg-muted px-1 py-0.5 rounded">https://grimoire.twoplustwoone.dev/mcp</code></li>
            </ul>
            <p>4. Click Add. Claude will open a browser window to authorize access.</p>
            <p>5. Click Allow to connect. Done!</p>
            <p className="text-xs text-muted-foreground/70 pt-2">
              Once connected, try asking: <em>&ldquo;List my Grimoire campaigns&rdquo;</em> or <em>&ldquo;What&rsquo;s happening in The Shattered Conclave?&rdquo;</em>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
