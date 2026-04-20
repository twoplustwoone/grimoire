import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth-server'
import { prisma } from '@grimoire/db'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, GitBranch, Globe, Users, Activity, Plus } from 'lucide-react'
import { CampaignEditableFields } from '@/components/entities/campaign-editable-fields'
import { DemoBanner } from '@/components/campaign/demo-banner'
import { ArchiveCampaignButton } from '@/components/campaign/archive-campaign-button'
import { PageHeaderAction } from '@/components/layout/page-header-action'
import {
  ENTITY_ICON,
  ENTITY_LABEL_SENTENCE,
  type EntityType,
} from '@/lib/entity-display'
import { groupActivity, formatRelativeTime, type RawChangelogEntry } from '@/lib/activity-feed'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const campaign = await prisma.campaign.findUnique({ where: { id }, select: { name: true } })
  return { title: campaign?.name ?? 'Campaign' }
}

const URGENCY_BADGE: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  HIGH: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  MEDIUM: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  LOW: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
}

const STATUS_LABEL: Record<string, string> = {
  PAUSED: 'Paused',
  COMPLETED: 'Completed',
  ARCHIVED: 'Archived',
}

export default async function CampaignPage({ params }: Props) {
  const { id } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/sign-in')

  const membership = await prisma.campaignMembership.findFirst({
    where: { campaignId: id, userId: session.user.id },
    include: { campaign: true },
  })
  if (!membership) notFound()

  // Dashboard is GM-facing. Players get sent to the portal.
  if (membership.role === 'PLAYER') {
    redirect(`/portal/${id}`)
  }

  const campaign = membership.campaign
  const campaignId = id
  const isGM = membership.role === 'GM'

  const [lastSession, openThreads, party, recentActivity, recentWorldEvents, totalSessionCount] =
    await Promise.all([
      prisma.gameSession.findFirst({
        where: { campaignId },
        orderBy: { createdAt: 'desc' },
        select: { id: true, number: true, title: true, playedOn: true, status: true },
      }),
      prisma.thread.findMany({
        where: { campaignId, status: 'OPEN', deletedAt: null },
        orderBy: [{ urgency: 'desc' }, { updatedAt: 'desc' }],
        take: 3,
        select: { id: true, title: true, urgency: true, status: true },
      }),
      prisma.campaignMembership.findMany({
        where: { campaignId, role: 'PLAYER' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              playerCharacters: {
                where: { campaignId, deletedAt: null, status: 'ACTIVE' },
                select: { id: true, name: true, status: true },
                orderBy: { name: 'asc' },
              },
            },
          },
        },
        orderBy: { user: { name: 'asc' } },
      }),
      prisma.changelogEntry.findMany({
        where: { campaignId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { author: { select: { name: true } } },
      }),
      prisma.worldEvent.findMany({
        where: { campaignId },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: {
          id: true,
          title: true,
          description: true,
          createdAt: true,
          session: { select: { number: true, title: true } },
        },
      }),
      prisma.gameSession.count({ where: { campaignId } }),
    ])

  // Resolve entity names for the activity feed. Fetch each entity type once
  // with the set of ids referenced by the 50 changelog rows; grouping after
  // this fills in the label for rows that aren't create/delete.
  const activityRows: RawChangelogEntry[] = recentActivity.map(r => ({
    id: r.id,
    entityType: r.entityType as EntityType,
    entityId: r.entityId,
    authorId: r.authorId,
    field: r.field,
    oldValue: r.oldValue,
    newValue: r.newValue,
    createdAt: r.createdAt,
    author: r.author,
  }))

  const idsByType: Record<string, string[]> = {}
  for (const r of activityRows) (idsByType[r.entityType] ??= []).push(r.entityId)

  const [npcNames, pcNames, locNames, facNames, thrNames, clueNames, sessionNames, eventNames] =
    await Promise.all([
      prisma.nPC.findMany({ where: { id: { in: idsByType.NPC ?? [] } }, select: { id: true, name: true } }),
      prisma.playerCharacter.findMany({ where: { id: { in: idsByType.PLAYER_CHARACTER ?? [] } }, select: { id: true, name: true } }),
      prisma.location.findMany({ where: { id: { in: idsByType.LOCATION ?? [] } }, select: { id: true, name: true } }),
      prisma.faction.findMany({ where: { id: { in: idsByType.FACTION ?? [] } }, select: { id: true, name: true } }),
      prisma.thread.findMany({ where: { id: { in: idsByType.THREAD ?? [] } }, select: { id: true, title: true } }),
      prisma.clue.findMany({ where: { id: { in: idsByType.CLUE ?? [] } }, select: { id: true, title: true } }),
      prisma.gameSession.findMany({ where: { id: { in: idsByType.SESSION ?? [] } }, select: { id: true, number: true, title: true } }),
      prisma.worldEvent.findMany({ where: { id: { in: idsByType.WORLD_EVENT ?? [] } }, select: { id: true, title: true } }),
    ])

  const nameLookup = new Map<string, string>()
  for (const e of npcNames) nameLookup.set(`NPC:${e.id}`, e.name)
  for (const e of pcNames) nameLookup.set(`PLAYER_CHARACTER:${e.id}`, e.name)
  for (const e of locNames) nameLookup.set(`LOCATION:${e.id}`, e.name)
  for (const e of facNames) nameLookup.set(`FACTION:${e.id}`, e.name)
  for (const e of thrNames) nameLookup.set(`THREAD:${e.id}`, e.title)
  for (const e of clueNames) nameLookup.set(`CLUE:${e.id}`, e.title)
  for (const e of sessionNames) nameLookup.set(`SESSION:${e.id}`, e.title ?? `Session ${e.number}`)
  for (const e of eventNames) nameLookup.set(`WORLD_EVENT:${e.id}`, e.title)

  const activityGroups = groupActivity(activityRows, 10)

  const nonPlayerCharacterIcon = ENTITY_ICON.NPC

  return (
    <div className="max-w-4xl mx-auto">
      {campaign.isDemo && <DemoBanner />}

      {/* Identity header */}
      <div className="mb-8">
        <p className="text-sm text-muted-foreground mb-1">
          <Link href="/campaigns" className="hover:underline">Campaigns</Link>
          {' / '}
          <span>{campaign.name}</span>
        </p>
        <CampaignEditableFields
          campaignId={campaign.id}
          name={campaign.name}
          description={campaign.description}
          badge={
            campaign.status !== 'ACTIVE' ? (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                {STATUS_LABEL[campaign.status] ?? campaign.status}
              </span>
            ) : undefined
          }
        />
      </div>

      {/* Session briefing */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          {lastSession ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5" />
                  Last session
                </p>
                <Link
                  href={`/campaigns/${campaignId}/sessions/${lastSession.id}`}
                  className="text-lg font-medium hover:underline"
                >
                  Session {lastSession.number}{lastSession.title ? ` — ${lastSession.title}` : ''}
                </Link>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {lastSession.playedOn
                    ? new Date(lastSession.playedOn).toLocaleDateString()
                    : `${lastSession.status.toLowerCase()} · ${totalSessionCount} ${totalSessionCount === 1 ? 'session' : 'sessions'}`}
                </p>
              </div>
              <PageHeaderAction href={`/campaigns/${campaignId}/sessions/new`}>
                <Plus className="h-4 w-4 mr-2" />
                Start new session
              </PageHeaderAction>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium mb-1">No sessions yet.</p>
                <p className="text-xs text-muted-foreground">Start your first session to begin capturing the campaign.</p>
              </div>
              <PageHeaderAction href={`/campaigns/${campaignId}/sessions/new`}>
                <Plus className="h-4 w-4 mr-2" />
                Start new session
              </PageHeaderAction>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Two-column region: threads / world events, then party / activity */}
      <div className="grid gap-6 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              Open threads
            </CardTitle>
          </CardHeader>
          <CardContent>
            {openThreads.length === 0 ? (
              <p className="text-sm text-muted-foreground">No open threads.</p>
            ) : (
              <>
                <ul className="space-y-2">
                  {openThreads.map(t => (
                    <li key={t.id}>
                      <Link
                        href={`/campaigns/${campaignId}/threads/${t.id}`}
                        className="flex items-center justify-between text-sm hover:underline"
                      >
                        <span className="truncate pr-2">{t.title}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${URGENCY_BADGE[t.urgency] ?? ''}`}>
                          {t.urgency}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/campaigns/${campaignId}/threads`}
                  className="text-xs text-muted-foreground hover:text-foreground hover:underline mt-3 inline-block"
                >
                  View all threads →
                </Link>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4" />
              World events
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentWorldEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No world events recorded.</p>
            ) : (
              <>
                <ul className="space-y-2">
                  {recentWorldEvents.map(e => (
                    <li key={e.id} className="text-sm">
                      <p className="font-medium truncate">{e.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {e.session ? `Session ${e.session.number}${e.session.title ? ` — ${e.session.title}` : ''} · ` : ''}
                        {new Date(e.createdAt).toLocaleDateString()}
                      </p>
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/campaigns/${campaignId}/world-events`}
                  className="text-xs text-muted-foreground hover:text-foreground hover:underline mt-3 inline-block"
                >
                  View all world events →
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Party
            </CardTitle>
          </CardHeader>
          <CardContent>
            {party.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No players yet.{' '}
                <Link href={`/campaigns/${campaignId}/settings`} className="underline hover:text-foreground">
                  Invite players from Settings.
                </Link>
              </p>
            ) : (
              <ul className="space-y-2">
                {party.map(m => (
                  <li key={m.id} className="text-sm">
                    <span className="font-medium">{m.user.name ?? m.user.email}</span>
                    {m.user.playerCharacters.length === 0 ? (
                      <span className="text-muted-foreground"> — no character yet</span>
                    ) : (
                      <span className="text-muted-foreground"> · {m.user.playerCharacters.map((pc, i) => (
                        <span key={pc.id}>
                          {i > 0 && ', '}
                          <Link
                            href={`/campaigns/${campaignId}/player-characters/${pc.id}`}
                            className="text-foreground hover:underline"
                          >
                            {pc.name}
                          </Link>
                        </span>
                      ))}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Recent activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activityGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            ) : (
              <ul className="space-y-2">
                {activityGroups.map(g => {
                  const Icon = ENTITY_ICON[g.entityType] ?? nonPlayerCharacterIcon
                  const label = g.preferredLabel
                    ?? nameLookup.get(`${g.entityType}:${g.entityId}`)
                    ?? 'unknown'
                  const action =
                    g.kind === 'created' ? 'created' :
                    g.kind === 'deleted' ? 'deleted' :
                    g.fields.length === 1
                      ? `${g.fields[0]} updated`
                      : `${g.fields.length} fields updated`
                  return (
                    <li key={g.id} className="flex items-start gap-2 text-sm">
                      <Icon className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="truncate">
                          <span className="text-xs text-muted-foreground">{ENTITY_LABEL_SENTENCE[g.entityType]}</span>
                          {' · '}
                          <span className="font-medium">{label}</span>
                          <span className="text-muted-foreground"> — {action}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {g.authorName ? `${g.authorName} · ` : ''}{formatRelativeTime(g.createdAt)}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Danger zone */}
      {isGM && (
        <div className="mt-12 pt-6 border-t">
          <p className="text-sm text-muted-foreground mb-3">Danger zone</p>
          <div className="flex flex-wrap gap-2">
            {campaign.status !== 'ARCHIVED' && (
              <ArchiveCampaignButton
                campaignId={campaign.id}
                campaignName={campaign.name}
              />
            )}
            <Button variant="outline" size="sm" asChild className="text-destructive border-destructive/30 hover:bg-destructive/10">
              <Link href={`/campaigns/${campaignId}/settings`}>More settings</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
