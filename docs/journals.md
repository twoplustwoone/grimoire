# Journals

*Design doc. Last updated: April 21, 2026.*

This document captures the design of Grimoire's Journal feature — a
first-class personal space for players to track their campaign
experience from their character's perspective. It is the output of two
design sessions (A: data model, B: lifecycle and UX), a codebase
investigation, and a post-investigation revision that took advantage
of Grimoire's pre-launch status to flip several architectural
compromises.

The doc has two halves:

- **Principles and decisions** — what we're building and why. Prose
  first, rationale included. This is for future-you and any
  collaborator who needs to understand the *why* before the *what*.
- **Implementation spec** — schema, field ownership, flow descriptions,
  explicit out-of-scope. This is what a build session would execute
  against.

A third session (C: import from pre-Grimoire notes) is noted at the
end as a stub pending its own design pass.

---

## Part 1 — Principles and decisions

### Why Journals exist

VISION.md names two user archetypes: GMs and players. Today, Grimoire
serves the GM well and the player adequately. The player portal lets a
player see what the GM has revealed; it does not let the player
*author* anything of their own. This misses a large class of real use:

- A player whose GM doesn't use Grimoire but who wants structured
  notes for their own character's story
- A player in a Grimoire campaign who wants private backstory, theories,
  and session notes that aren't visible to the GM
- A player who has been writing notes in Notion/Google Docs for a
  campaign and wants to bring them into Grimoire

A "player-owned campaign" isn't the right model for these needs — a
campaign is the GM's artifact. What's needed is a separate,
player-authored surface that *references* a campaign rather than
competing with it. That is a Journal.

### What a Journal *is*

A Journal is a **sovereign personal chronicle**. It has its own entities
(NPCs, locations, factions, threads, clues, sessions, world events),
its own relationship graph, its own notes. The player owns it
completely. It exists whether or not it is linked to a campaign.

When linked to a campaign, the journal gains the ability to
**reference** campaign entities — "my node 'The Masked Man' is the same
as the campaign's NPC 'Lord Varis Blackwood'" — without either side
losing its independence. The campaign remains the GM's source of truth;
the journal remains the player's. The link is a lightweight
cross-reference, not a merge.

This sovereignty is the central design principle. Everything else
follows from it.

### Core product principles

These are worth stating explicitly because they constrain every future
design decision related to Journals.

1. **The player is the author of their character.** Backstory,
   motivations, secrets, internal state — these belong to the player.
   Grimoire supports this; it doesn't get in its way. GMs do not author
   content in the player's sovereign space.

2. **A Journal is sovereign.** A journal's content is owned by its
   author and never modified by external events. Campaigns ending,
   players leaving, GMs deleting entities — none of these mutate the
   journal. References may go stale; notes do not disappear.

3. **Opinion is the product.** A Journal is not "a folder of notes." It
   is a structured space with specific shape — the same entity types a
   campaign has, because players form beliefs about the same kinds of
   things GMs author. The structure is the value.

4. **Raw capture first, structure later.** Players take *unstructured
   notes* during sessions. Structure emerges after, either through
   manual review or AI-assisted structuring (premium). This matches
   how players actually work mid-session.

5. **One author per field, always.** Any time there's temptation to add
   a field that "the GM authors now, and the player might override
   later," resist. Cross-boundary flow happens through explicit
   mechanisms (linking, revealing, sharing), never through field-level
   ambiguity.

### Key design decisions with rationale

**Journals use the same entity types as Campaigns.** NPCs, locations,
factions, threads, clues, sessions, world events. Players form beliefs
about the same kinds of things GMs author. A journal's NPC is a
*belief*; a campaign's NPC is a *fact*. Same shape, different
epistemic status.

**Linking is reference-only, not merge.** When the player's "The Masked
Man" is linked to the GM's "Lord Varis Blackwood," the player's node
stays theirs — same name, same notes, same framing. The link just
says "these refer to the same underlying thing." The GM's truth is
visible on the other side of the link (when accessible); the player's
belief is not overwritten.

This was reached after considering (and rejecting) a merge model where
linked nodes become views onto the GM's entity. The merge model
compromises sovereignty: the player's node becomes a window into
someone else's authorship. The reference model preserves full
authorship on both sides.

**One journal per campaign membership.** When a player joins a
campaign, a journal is created for them automatically (if they don't
have one to bring). A journal is bound to at most one campaign at a
time. A player who is a member of five campaigns has five journals,
plus any freestanding journals for campaigns not in Grimoire.

**Links survive unlinking.** When a journal is unlinked from a campaign
(player leaves, campaign ends, manual unlink), cross-references remain
in the journal as historical records. They render as "referenced
entity no longer accessible" until re-linked. The player's content is
never lost. No snapshots — snapshotting violates the GM's sovereignty
and creates a staleness problem worse than the one it solves.

**PC authorship is layered.** The campaign PC is *lean* (name, public
one-liner, status, party-visible relationships). The journal PC is
*deep* (backstory, private motivations, secrets, internal state). They
are paired via mirror relationship. GMs never author backstory; GMs
author public one-liners and keep their own private notes on the PC
via the existing note system. This resolves the "what happens when
both sides have backstory" problem by preventing it: the fields don't
collide because they live in different layers.

**Capture is unstructured; structure is emergent.** The Journal's
primary input surface is raw session capture — rich text with
mentions, written fast, during or after a session. Structured entities
emerge later: either through manual review ("highlight this, create an
NPC") or AI-assisted structuring (premium feature). This is a direct
consequence of principle 4, and it reshapes the UX: the Journal's home
surface is capture-first, entity-list-second.

**Free tier delivers value without AI.** A player using only the free
tier still gets: raw note capture, organized by session, searchable
across their entire RPG history, persistent across campaigns. The
structured graph is a bonus on top, earned through manual work or AI.
Non-AI heuristic structuring is *not* feasible at a quality bar worth
shipping (heuristics catch proper nouns but miss semantic content; the
output is noise + signal with no way to distinguish them). Free tier
is manual structuring plus good tooling — specifically a
noun-promotion nudge in the editor that offers to create journal
entities inline from mentions. That is not "AI-lite"; it is just a
well-placed affordance.

**Content storage is Tiptap JSON (ProseMirror documents).** This is a
deliberate departure from Grimoire's current `Note.content` format,
which stores plaintext with custom mention tokens. The current format
exists because someone had to pick one, not because it's ideal — it
makes mentions primary and formatting impossible. Tiptap JSON is a
proper document model: mentions are one node type among many, rich
text is first-class, and the existing Tiptap editor in
`mention-input.tsx` already produces this structure (it just serializes
it back down to the token grammar for storage).

Because Grimoire is pre-launch, the content storage shift absorbs
`Note.content` in the same migration — Notes and Journal captures both
store Tiptap JSON. Two content storage formats would be worse than
either alone.

**Rich text in capture is the full Tiptap set.** Bold, italic, lists
(bulleted and numbered), headings (h2, h3), horizontal rule,
blockquote, hardbreak, mentions. No tables, no images (file uploads
aren't shipped), no code blocks, no custom blocks. The rule of thumb
is "if it's in a paper notebook, it belongs; if it's in Notion, be
skeptical." Players write session notes, not knowledge bases.

The AI structuring pipeline reads Tiptap JSON natively — Claude can
parse ProseMirror documents, and formatting gives signal (bolded
words are probably entity names, bullet points delineate discrete
items). Rich text doesn't hurt AI structuring; it helps.

**Mentions inside a journal resolve only to journal entities.** If a
player writes `@Garreth`, the suggestion UI surfaces their own journal
entities. This enforces sovereignty at the input layer — the player
writes about their own graph, not the GM's. Mentioning a name that
exists in the linked campaign but not the journal prompts "create a
Journal entity for this?" — which is how players incrementally build
their graph from inside the capture flow.

**Sharing is opt-in, journal-first, per-node-fallback.** The primary
sharing action is journal-level: "Share this journal with the GM."
When a journal is shared, the GM can read all content. When not shared
(the default), the player can still opt individual nodes or captures
in via a subtle per-node share toggle. Nothing leaks without the
player's affirmative action. The GM does not see the journal unless
the player shares.

### Decisions we explicitly did not make

- **The journal name.** "Journal" is the user-facing name, locked in.
  No re-opening.
- **GM reverse-view as a first-class feature.** The data model supports
  querying "who has linked their journal node to my campaign entity,"
  but no UI ships in v1. When GM demand surfaces, the query is
  available.
- **Non-AI heuristic structuring.** Considered and rejected on quality
  grounds. Free tier is manual, premium tier is AI.
- **Multi-campaign journals.** A journal links to at most one campaign
  at a time. Players with multiple campaigns get multiple journals.

---

## Part 2 — Implementation spec

### Data model

**New model: `Journal`.**

```
Journal
  id                  string    @id
  ownerId             string    // User
  linkedCampaignId    string?   // Campaign, nullable
  name                string
  createdAt           DateTime
  updatedAt           DateTime
  deletedAt           DateTime? // soft-delete, journals are user content

  @@index([ownerId])
  @@index([linkedCampaignId])
```

A journal is owned by a single user. It may be linked to at most one
campaign at a time. It is soft-deleted (consistent with the six
first-class entity models, which are also soft-deleted; journals are
user-authored content worth preserving).

**Entity ownership discriminator.**

All seven entity models (`Npc`, `PlayerCharacter`, `Location`,
`Faction`, `Thread`, `Clue`, `GameSession`, `WorldEvent`) gain:

```
  ownerType  OwnerType  // enum: CAMPAIGN | JOURNAL
  ownerId    string     // either Campaign.id or Journal.id
```

This is a new pattern. Existing cross-cutting tables (`Note`,
`ChangelogEntry`, `EntityReveal`, etc.) use `entityType`/`entityId`
because they key off an *entity*. Journals introduce ownership of
*entities themselves* by a non-entity container (a Journal or a
Campaign), so `ownerType`/`ownerId` is the right naming. Note this in
`docs/schema.md` when the migration ships — it's a deliberate
divergence from the established idiom, justified by different
semantics.

The existing `campaignId` foreign key on each entity is replaced by
`ownerType` + `ownerId`. Queries that previously filtered `campaignId`
now filter `ownerType = CAMPAIGN AND ownerId = <campaignId>`. This is
the largest migration in the feature and affects every entity query.
Because Grimoire is pre-launch, this is a **big-bang migration**:
reshape, nuke and reseed, move on. No two-step nullable-first needed.

Existing unique constraints scoped to `campaignId` (e.g.,
`GameSession`'s unique `(campaignId, number)`) re-scope to
`(ownerType, ownerId, number)`.

**New model: `JournalLink` (the cross-reference table).**

```
JournalLink
  id                    string      @id
  journalId             string
  journalEntityType     EntityType
  journalEntityId       string
  campaignEntityType    EntityType
  campaignEntityId      string
  proposedBy            LinkOrigin  // enum: PLAYER | GM
  createdAt             DateTime

  @@unique([journalEntityType, journalEntityId, campaignEntityType, campaignEntityId])
  @@index([journalId])
  @@index([campaignEntityType, campaignEntityId])
```

A link says "this journal entity refers to this campaign entity." It
carries no content of its own. The unique constraint prevents duplicate
links. The `campaignEntityType, campaignEntityId` index supports the
eventual GM reverse-view ("what journal nodes point at this entity").
`proposedBy` records whether the player or GM originated the link —
not used for auth in v1, but useful signal for UX.

Both the player and the GM can create links, and v1 does not require
acceptance — a link is a link.

**New model: `PlayerCharacterMirror` (PC pairing).**

```
PlayerCharacterMirror
  id                    string    @id
  campaignPcId          string    @unique
  journalPcId           string    @unique
  createdAt             DateTime
```

A 1:1 pairing between a campaign-owned PlayerCharacter and a
journal-owned PlayerCharacter. Auto-created when:

- A player joins a campaign with an existing journal-owned PC (at
  linking time)
- A player creates a PC in a campaign they're already in with a linked
  journal (at PC creation time)
- A player accepts an invite that reserves a PC slot, and the journal
  gets linked during acceptance

Both paths converge on a single `ensurePcMirror(campaignPcId,
journalId)` function that creates both sides as needed.

**Field ownership (post-migration).**

`PlayerCharacter` is the same shape on both sides of the mirror, but
*content conventions* differ:

- **Campaign PC:** `name`, `description` (the public one-liner),
  `status`, relationships. GM-editable. Party-visible.
- **Journal PC:** `name` (synced from campaign if mirrored),
  `description` (backstory — player writes deep character content
  here), relationships within the journal graph. Player-editable.
  Private by default.

The schema does not enforce this; the *UI* enforces it. The campaign
PC's detail page presents `description` as a "public one-liner" with a
short-form editor. The journal PC's detail page presents `description`
as "backstory" with a long-form Tiptap editor. Same field, different
treatment.

**Name sync.** When a journal PC is renamed, the campaign PC renames
to match (via the mirror). The reverse does not happen — the player
owns the character's name. The rename affordance on mirrored campaign
PCs is removed from the GM's UI (or routed through a request-to-player
action; implementation choice).

**`PlayerCharacter.externalUrl` (new, nullable).** A URL field on the
campaign PC for GMs to link to an external character sheet when the
player isn't on Grimoire. Pure reference data; does not conflict with
any journal content.

### Content model

**Storage format migration.** Both `Note.content` and the new Journal
capture content store **Tiptap JSON** (ProseMirror documents). This
replaces the current plaintext-with-tokens format on Notes.

Concretely:

- `Note.content` changes from `String` to `Json`. The ProseMirror doc
  is stored as JSON.
- The `mentions` sidecar on `Note` is retained — it's a denormalized
  index for efficient "find all notes mentioning X" queries, still
  valuable even with structured storage. Populated from the
  ProseMirror tree at write time.
- The `parseContentForDisplay` / `tiptapToTokens` /
  `tokensToTiptap` helpers are deleted. The Tiptap editor works with
  ProseMirror JSON directly on both ends.
- The `MentionRenderer` component (read-path) is rewritten to render a
  ProseMirror document tree, not a parsed token string.

This is a breaking change to every code path that reads or writes note
content. The blast radius is real but contained: search the codebase
for `parseContentForDisplay`, `tiptapToTokens`, `tokensToTiptap`, and
the places that read `note.content` directly. Each becomes either
"render ProseMirror" or "store ProseMirror."

**Enabled Tiptap extensions.** The editor used across Notes and
Journal captures enables: paragraph, text, hardBreak, bold, italic,
bulletList, orderedList, listItem, heading (levels 2 and 3),
horizontalRule, blockquote, Mention, Placeholder. Explicitly disabled:
code, codeBlock, strike, link (unless/until link support is scoped),
any third-party extensions for tables, images, embeds, or custom
blocks.

**New model: `JournalCapture`.**

```
JournalCapture
  id                  string              @id
  journalId           string
  journalSessionId    string              // the session this belongs to
  content             Json                // Tiptap ProseMirror doc
  mentions            Json?               // denormalized sidecar
  structuredStatus    StructuredStatus    // enum: RAW | PARTIALLY_STRUCTURED | STRUCTURED
  createdAt           DateTime
  updatedAt           DateTime
  deletedAt           DateTime?

  @@index([journalId])
  @@index([journalSessionId])
```

Captures are sequenced within a journal session via `createdAt`.
`content` is a full ProseMirror document — same format as `Note.content`
post-migration. `mentions` denormalizes the mention node IDs for
efficient querying. `structuredStatus` tracks whether this capture has
been reviewed/structured by the player or AI.

Captures are a separate model from Notes because they have different
semantics (sequenced timeline within a session) than Notes (attached
to a single entity). Forcing them into one model would create a
confused polymorphic shape.

**Mentions inside captures.** The mention suggestion UI resolves only
to journal-owned entities (not the linked campaign's). If the player
types an `@` and mentions a name that exists in the linked campaign
but not the journal, the suggestion offers "Create journal entity for
'[name]'" — creating a journal entity inline and inserting a mention
node pointing at it. This is the noun-promotion nudge; it is the
primary free-tier structuring path.

**Structuring.**

- **Manual structuring (free):** player reviews raw captures, highlights
  spans, and converts them to journal entities via a UI action. This
  happens anywhere the capture is readable, not just in a dedicated
  mode.
- **AI structuring (premium):** Claude reads one or more captures and
  proposes entities, threads, mentions, and links. Player reviews,
  accepts per-item, edits, or rejects with optional reason. Same
  pipeline as pre-Grimoire notes import (Session C).

### Lifecycle

**Journal creation — four entry points.**

1. **Campaign invite acceptance, no existing journals.** The player
   accepts, a journal auto-creates for that campaign, the mirror is
   established if a PC exists. One-line confirmation: "We've created a
   journal for this campaign."

2. **Campaign invite acceptance, existing freestanding journals.** The
   acceptance flow offers: "Start a new journal, or link one of yours?"
   If "link existing," a picker shows the player's freestanding
   journals (name + last-updated + capture-count). Selecting one
   triggers the linking ceremony (see below).

3. **App shell: new freestanding journal.** A "New journal" action in
   the nav. Asks for a name, nothing else. No linking at creation —
   linking happens later via the invite flow or from journal settings.

4. **Lazy-create on first capture.** A logged-in user with no journals
   who taps a "start capturing" action gets a journal auto-created
   (freestanding, default name "Untitled journal" or similar). The
   capture begins immediately. This is the lowest-friction entry.

**Every campaign membership guarantees a journal exists.** There is no
state where a player is a campaign member with no journal. This is
enforced by the invite acceptance flow (paths 1 and 2).

**Invite-carries-PC.** `CampaignInvite` gains an optional `pcId` field
referencing a `PlayerCharacter`. When set, acceptance assigns the
invitee to that PC. When null, acceptance does not assign a PC; the
player lands on the journal home with a "claim your character or
create one" affordance. This closes the current gap (no "claim your
character" moment) and enables the GM's "reserve this slot for a
specific invitee" intent.

If the invitee accepts with a reserved PC, the PC mirror is created
alongside the journal (or using the player's existing freestanding
journal if they linked one at acceptance).

**First moment of value — journal home.**

The journal home page leads with:

- A prominent **capture** button at the top. Tapping begins a new
  capture, continuing the active session if one exists within the
  active window (~12 hours of recent capture activity), prompting for
  new-or-existing otherwise.
- A **feed of past captures**, grouped by session. Each session shows
  title (or "Session N" if untitled), total word count, capture count,
  last-updated time. Tapping expands to per-capture timestamps.
- Secondary surfaces (entity lists, graph, settings) are reachable via
  sub-navigation but are not the focus.

This is a departure from the campaign home's dashboard pattern.
Justified: campaigns are prep-heavy, journals are capture-heavy. The
home reflects the primary job.

**Capture flow.**

A *session* is a container for captures. A *capture* is a timestamped
piece of content within a session. The `GameSession.number` field is
the canonical sort key and is mandatory and unique per owner;
`playedOn` is optional and `title` is optional (and is flavor, not
identity). Journal sessions follow the same convention.

- **Start capture, no active session:** prompt "New session or
  existing?" If new, create a `GameSession` with the next available
  `number` for this journal. If existing, list recent sessions.
- **Start capture, active session within window:** default to
  continuing it. One-tap "new session instead" is always available.
- **Each capture** is a new `JournalCapture` row attached to the
  journal session.
- **Session metadata** (title, playedOn, number override) is
  fill-in-when-convenient and never required at capture time.

**Linking ceremony.**

- **Path 1 (auto-create on invite):** no ceremony. One-line
  confirmation, done.
- **Paths 2/3 (link existing freestanding journal):** confirmation
  sheet with five short bullets:
  1. What will happen ("This journal will link to [campaign]")
  2. What changes ("You can reference campaign entities; your PC in
     the campaign will be mirrored to this journal")
  3. What doesn't change ("Your notes, nodes, and writing stay as
     they are")
  4. Privacy ("The GM cannot see anything in your journal unless you
     share")
  5. Reversibility ("You can unlink later")

  Two buttons: "Link journal" (primary), "Don't link, create new"
  (secondary). Select-your-journal step precedes this if multiple
  freestanding journals exist.

- **Post-hoc linking from settings:** lighter one-line confirmation.
  The user self-selected into this; no need to re-explain journals.

**Unlinking.**

- Manual unlink from journal settings.
- Automatic-ish: when a player leaves or is removed from a campaign,
  links are preserved but become stale (the campaign entities render
  as "no longer accessible"). The player's journal content is
  untouched.
- Re-linking a journal to a campaign rehydrates stale links
  automatically if the referenced entities still exist.

### Sharing

- **Journal-level share:** toggle on the journal. When on, the linked
  campaign's GM can read all journal content. When off (default),
  nothing is visible.
- **Per-node share:** opt-in toggle on individual entities and captures.
  Only meaningful when journal-level share is off. Shared items appear
  to the GM; unshared do not.
- **"Send to GM" moment:** optional UX affordance (not required for
  v1) that lets the player mark something shared with a deliberate
  "notify GM" action, giving a buffer between "I'm writing for me" and
  "the GM is reading this." Worth revisiting if users ask for it; not
  required to ship.

**Share state storage.** A polymorphic `JournalShare` table,
structured like `EntityReveal` in reverse:

```
JournalShare
  id                  string      @id
  journalId           string
  sharedEntityType    ShareScope  // enum: JOURNAL | NPC | LOCATION | ... | CAPTURE
  sharedEntityId      string?     // null when sharedEntityType = JOURNAL
  createdAt           DateTime

  @@unique([journalId, sharedEntityType, sharedEntityId])
  @@index([journalId])
```

A journal-level share is a row with `sharedEntityType = JOURNAL` and
`sharedEntityId = null`. A per-node share has both set. Absence of a
row means "not shared."

### PC mirroring and field authorship

When a PC mirror exists:

- The campaign PC's `name` is read-only from the GM's perspective and
  writable from the player's (synced from the journal PC).
- The campaign PC's `description` is the *public one-liner*, writable
  by the GM.
- The journal PC's `description` is the *backstory*, writable by the
  player. Not visible to the GM unless shared.
- The campaign PC's `status` is writable by the GM (retirement, death
  are campaign-scale events).
- The campaign PC's `externalUrl` is writable by the GM (reference for
  when the player isn't on Grimoire; survives the player joining
  later).

GMs who want to take notes on a PC (plot hooks, character arc
thinking) use the existing note system attached to the campaign PC.
These notes are GM-private unless the GM reveals them. They are *not*
the player's backstory.

**Pre-filled PC migration (opt-in seed).** If the GM has written in
the campaign PC's `description` field before the player arrives, at
linking time the player is offered "Your GM drafted a backstory for
you. Use it as a starting point?" with three choices: accept the seed
into the journal PC, see it but start fresh, or ignore. The GM's
original content is never silently destroyed. This handles the real
case where a GM pre-writes for their players.

### Migration plan (big-bang)

Grimoire is pre-launch — no users, no production data worth
preserving. The migration is a single schema reshape, nuke and reseed.

**Schema changes in one migration:**

1. New tables: `Journal`, `JournalLink`, `PlayerCharacterMirror`,
   `JournalCapture`, `JournalShare`.
2. New enums: `OwnerType`, `LinkOrigin`, `StructuredStatus`,
   `ShareScope`.
3. Seven entity models gain `ownerType` + `ownerId`, drop
   `campaignId`. Existing unique constraints re-scoped.
4. `Note.content` changes from `String` to `Json`.
5. `CampaignInvite` gains optional `pcId`.
6. `PlayerCharacter` gains `externalUrl`.

**Code changes that follow:**

1. Delete `tiptapToTokens`, `tokensToTiptap`, `parseContentForDisplay`
   and rewrite `MentionRenderer` for ProseMirror JSON.
2. Rewrite the Tiptap editor config in `mention-input.tsx` to enable
   the full scoped extension set.
3. Update all entity queries to filter `ownerType`/`ownerId`
   replacing `campaignId`.
4. Update MCP tools to reason about `ownerType` (existing tools assume
   campaign ownership; they should keep doing so explicitly).
5. Update seed scripts to populate `ownerType` on all entity creates.
6. Reseed demo campaign and Dragon Heist from scratch.

**Verification:** `pnpm check-types`, `pnpm lint`, `pnpm build` all
green. Demo campaign signup works. Dragon Heist loads with all
entities visible. Existing web routes (every entity list, every detail
page, every note create/update) function.

### Out of scope for v1

- **Non-AI heuristic structuring.** Explicitly not feasible at ship
  quality. Free tier gets manual structuring and noun-promotion
  nudges.
- **Tables, images, code blocks, embeds in capture.** Narrow rich-text
  scope.
- **GM reverse-view UI.** Data model supports it; UI deferred.
- **Multi-campaign journals.** One campaign per journal.
- **"Send to GM" ceremony for shared items.** Worth revisiting if users
  ask.
- **Journal templates or presets.** Journals start empty.
- **Import from pre-Grimoire notes** — see Session C below.

---

## Part 3 — Session C stub (import)

Not yet designed. Flagged because it shares infrastructure with AI
structuring and the overall feature.

**The key insight from Session B:** pre-Grimoire notes import and
AI-powered capture structuring are the same pipeline with different
entry points. Input is a text document (uploaded file, pasted text, or
a set of existing `JournalCapture` rows). Output is a proposed set of
entities, mentions, and edits for the player to review. The review UX
is the same regardless of source.

**Free tier import** is raw — the document becomes one or more
`JournalCapture` rows (split by heading-date heuristic if possible,
single capture if not), structured status = RAW. No AI involved. The
player now has their old notes in Grimoire as searchable, organized
text.

**Premium tier import** adds the AI structuring pass on top of the raw
import, treating the imported content as if it were captures and
proposing structure.

Session C will cover:

- Supported input formats (markdown, plain text, Google Docs export,
  Notion export, PDFs?)
- Session-splitting heuristic (look for date headings, session numbers,
  etc.; fall back to single capture)
- Review/accept/reject UX for AI-proposed structure (entity by entity,
  link by link)
- Error handling for AI failures (truncation, hallucinations, rejected
  proposals)
- Format conversion (incoming content → ProseMirror JSON)

---

## Appendix: terminology

- **Journal:** The player-owned sovereign space. Contains entities,
  sessions, captures.
- **Capture:** A single timestamped piece of raw content within a
  journal session. The atomic unit of writing.
- **Journal session:** A container for captures. Same model as a
  campaign's `GameSession`; owned by a journal via `ownerType`.
- **Link / journal link:** The cross-reference from a journal entity
  to a campaign entity. No content; pure reference.
- **Mirror / PC mirror:** The pairing between a campaign PC and a
  journal PC. 1:1, auto-created.
- **Freestanding journal:** A journal not linked to any campaign. Can
  be linked later.
- **Linked journal:** A journal linked to exactly one campaign at a
  time.

---

## Appendix: open implementation choices

These are flagged items that need resolution during build, not during
design:

- **GM name-change affordance on mirrored campaign PCs.** Remove the
  rename UI entirely, route through a "request rename" flow, or allow
  the GM to rename with the change propagating to the journal PC?
  V1 lean: remove the rename UI on mirrored campaign PCs; direct the
  GM to ask the player.
- **Journal capture ordering within a session.** `createdAt` is the
  natural order. Whether captures can be reordered manually (drag to
  rearrange) is a UX call; v1 lean is no, use `createdAt` strictly.
- **Share-state invalidation on unlink.** When a journal unlinks from a
  campaign, do per-node shares persist (in case of re-link) or get
  cleared? V1 lean: persist, same reasoning as stale links.
- **Active-session window duration.** The "is there an active session
  to continue?" check uses a time window (e.g., 12 hours since last
  capture). Final duration is a UX tuning call after initial use.
