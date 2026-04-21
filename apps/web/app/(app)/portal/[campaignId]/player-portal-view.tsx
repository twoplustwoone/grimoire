'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, UserCircle, MapPin, Shield, GitBranch, Search } from 'lucide-react'

interface InfoNode {
  id: string
  title: string
  content: string
}

interface PortalEntity {
  id: string
  name: string
  description: string
  isNameRevealed: boolean
  nodes: InfoNode[]
}

interface PortalData {
  yourCharacter?: PortalEntity | null
  npcs: PortalEntity[]
  playerCharacters: PortalEntity[]
  locations: PortalEntity[]
  factions: PortalEntity[]
  threads: PortalEntity[]
  clues: PortalEntity[]
}

const sections = [
  { key: 'playerCharacters' as const, label: 'Party', icon: UserCircle },
  { key: 'npcs' as const, label: 'People', icon: Users },
  { key: 'locations' as const, label: 'Places', icon: MapPin },
  { key: 'factions' as const, label: 'Factions', icon: Shield },
  { key: 'threads' as const, label: 'Threads', icon: GitBranch },
  { key: 'clues' as const, label: 'Clues', icon: Search },
]

export function PlayerPortalView({ data }: { data: PortalData }) {
  const hasSections = sections.some(s => data[s.key].length > 0)
  const hasAnything = hasSections || !!data.yourCharacter

  if (!hasAnything) {
    return (
      <Card className="text-center py-16">
        <CardContent>
          <p className="text-muted-foreground mb-2">Nothing revealed yet.</p>
          <p className="text-sm text-muted-foreground/70">
            Your GM will reveal information as you discover it in the campaign.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-8">
      {data.yourCharacter && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-primary mb-3 flex items-center gap-2">
            <UserCircle className="h-4 w-4" />
            Your Character
          </h2>
          <Card className="border-primary/40 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">{data.yourCharacter.name}</CardTitle>
            </CardHeader>
            <CardContent>
              {data.yourCharacter.description && (
                <p className="text-sm text-muted-foreground mb-3">{data.yourCharacter.description}</p>
              )}
              {data.yourCharacter.nodes.length > 0 && (
                <div className="space-y-2 border-t pt-3">
                  {data.yourCharacter.nodes.map((node) => (
                    <div key={node.id} className="text-sm border-l-2 border-primary/30 pl-3">
                      <p className="font-medium text-xs text-muted-foreground mb-0.5">{node.title}</p>
                      <p className="text-sm whitespace-pre-wrap">{node.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {sections.map(({ key, label, icon: Icon }) => {
        const entities = data[key]
        if (entities.length === 0) return null

        return (
          <div key={key}>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
              <Icon className="h-4 w-4" />
              {label} ({entities.length})
            </h2>
            <div className="space-y-3">
              {entities.map((entity) => (
                <Card key={entity.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      {entity.name}
                      {!entity.isNameRevealed && (
                        <span className="text-xs text-muted-foreground font-normal italic">
                          (alias)
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {entity.description && (
                      <p className="text-sm text-muted-foreground mb-3">{entity.description}</p>
                    )}
                    {entity.nodes.length > 0 && (
                      <div className="space-y-2 border-t pt-3">
                        {entity.nodes.map((node) => (
                          <div key={node.id} className="text-sm border-l-2 border-primary/30 pl-3">
                            <p className="font-medium text-xs text-muted-foreground mb-0.5">{node.title}</p>
                            <p className="text-sm whitespace-pre-wrap">{node.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
