'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { EditableField } from './editable-field'
import { EntityStatusSelect } from './entity-status-select'

interface PlayerOption {
  userId: string
  label: string
}

export interface MirrorInfo {
  /** Name of the player whose journal holds the mirrored PC. */
  ownerName: string | null
  /** The current viewer is the mirrored player. */
  viewerIsMirrorPlayer: boolean
  /** Journal id to deep-link the player back into their own journal PC. */
  journalId: string | null
  journalPcId: string | null
}

interface Props {
  campaignId: string
  pcId: string
  name: string
  description: string | null
  status: string
  linkedUserId: string | null
  players: PlayerOption[]
  isGM: boolean
  /** Null when the PC is not mirrored. */
  mirror?: MirrorInfo | null
}

export function PcEditableFields({
  campaignId, pcId, name, description, status, linkedUserId, players, isGM, mirror,
}: Props) {
  const router = useRouter()
  const isMirrored = !!mirror

  async function save(field: string, value: string | null) {
    await fetch(`/api/v1/campaigns/${campaignId}/player-characters/${pcId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ [field]: value }),
    })
    router.refresh()
  }

  const descriptionLabel = isMirrored ? 'Public one-liner' : null
  const descriptionPlaceholder = isMirrored
    ? 'How the party introduces this character. One or two sentences.'
    : 'Add a description...'

  return (
    <>
      <div className="flex items-start justify-between">
        <h1 className="text-3xl font-bold flex-1">
          {isGM && !isMirrored ? (
            <EditableField value={name} onSave={(v) => save('name', v)} placeholder="PC name" />
          ) : (
            <span
              className={isMirrored && isGM ? 'cursor-default' : ''}
              title={
                isMirrored && isGM
                  ? "Name is owned by the player. Ask them to rename from their journal."
                  : undefined
              }
            >
              {name}
            </span>
          )}
        </h1>
        {isGM ? (
          <EntityStatusSelect status={status} entityType="PLAYER_CHARACTER" onSave={(v) => save('status', v)} />
        ) : (
          <span className="text-xs px-2 py-1 rounded-full font-medium bg-muted text-muted-foreground">{status}</span>
        )}
      </div>

      {isMirrored && mirror && (
        <div className="mt-2 text-sm text-muted-foreground">
          {isGM && mirror.journalId ? (
            <>
              Linked to{' '}
              <Link
                href={`/campaigns/${campaignId}/journals/${mirror.journalId}`}
                className="text-primary hover:underline"
              >
                <strong>{mirror.ownerName ? `${mirror.ownerName}'s` : "a player's"}</strong>{' '}
                journal
              </Link>
              .
            </>
          ) : (
            <>
              Linked to{' '}
              {mirror.ownerName ? <strong>{mirror.ownerName}&apos;s</strong> : 'a player&apos;s'}{' '}
              journal.
            </>
          )}
          {mirror.viewerIsMirrorPlayer && mirror.journalId && mirror.journalPcId && (
            <>
              {' '}
              <Link
                href={`/journals/${mirror.journalId}/player-characters/${mirror.journalPcId}`}
                className="text-primary hover:underline"
              >
                Open in your journal →
              </Link>
            </>
          )}
        </div>
      )}

      <div className="mt-2">
        {descriptionLabel && (
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
            {descriptionLabel}
          </p>
        )}
        {isGM ? (
          <EditableField
            value={description}
            onSave={(v) => save('description', v)}
            type="textarea"
            placeholder={descriptionPlaceholder}
            emptyText={isMirrored ? 'No one-liner yet — click to add' : 'No description — click to add'}
            className="text-muted-foreground"
          />
        ) : description ? (
          <p className="text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {isGM && (
        <div className="mt-4 flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Linked player:</span>
          <select
            value={linkedUserId ?? ''}
            onChange={(e) => save('linkedUserId', e.target.value || null)}
            className="text-sm border rounded-md px-2 py-1 bg-background"
          >
            <option value="">Unlinked</option>
            {players.map(p => (
              <option key={p.userId} value={p.userId}>{p.label}</option>
            ))}
          </select>
        </div>
      )}
    </>
  )
}
