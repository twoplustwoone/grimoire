# Pre-J6 UX audit — diagnostic only

Diagnostic pass over the Journals feature (J1–J5) across player and GM
surfaces, desktop (1280×900) and mobile (375×812), using the seeded
demo campaign *The Shattered Conclave*. Three accounts were walked:
Serafine (player with journal, linked + shares 2 items), Kael (player
without journal), and the GM (`demo@grimoire.dev`). No code changes
were made. Screenshots in `docs/audit-screenshots/`.

## Summary

**Total findings:** 17 — 0 Critical · 6 Major · 6 Minor · 4 Flagged for J6 · 5 By design.

No crashes, no data-loss paths on the golden path, no broken core
flows. The shape is solid — the problems are all on the surface
(layout bugs, labels, icon-only controls, GM-side naming).

### Top 3

1. **The `N` avatar overlaps content on every page.** On desktop
   it's anchored bottom-left and clips the `Search` / `Account`
   labels. On mobile the same pill floats over the page and covers
   whatever happens to sit at y ≈ 700 — settings page, PC page, GM
   journal detail all affected. One layout bug, many victims.
2. **GM sees the player's real name, not the PC name.** The GM's
   journal list and the shared-journal detail header both read
   *"Jordan Reyes"* where the story-world name is *Serafine*.
   Breaks the GM's fiction-first mental model and makes the
   campaign PC mirror ceremony harder to reason about.
3. **The share toggle is almost invisible.** A single unlabeled
   eye/crossed-eye icon, the same color family as text. Edit /
   Delete have labels; share does not. Users won't find it, and
   once they do they won't know which state is "on".

### Recommendation

**One short polish session before J6.** The three items above are
the bulk of the felt badness and all are hours-of-work-each fixes.
The rest is minor and most of it can ride along. J6 is going to add
four more journal entity detail pages (Location, Faction, Thread,
Clue) — they'll inherit `share-toggle.tsx` as-is, so fixing the
share toggle once pays off four more times. Fix the `N` avatar
layout, label the share toggle, and pick a GM-side naming convention
(PC name, real name, or both) before shipping J6's new surfaces.

---

## Critical

None.

---

## Major

### M1 — Desktop sidebar footer: `N` avatar clips `Search` / `Account` labels

- **Surface:** every authenticated desktop page. Bottom-left sidebar.
- **Screenshots:** `03-journal-home-desktop.png`,
  `07-journal-settings-desktop.png`,
  `12-gm-journal-detail-desktop.png` (and most others).
- **Observed:** The circular user-avatar pill is z-indexed over the
  sidebar footer rows, cutting the leading letter off "Search" and
  "Account".
- **Expected:** Avatar sits beside or above the rows without
  overlapping them.
- **Severity:** Major — it's on every page, it's the first thing a
  screenshot reviewer notices, and it makes the app feel unpolished.

### M2 — Mobile floating `N` avatar overlaps page content

- **Surface:** many authenticated mobile pages.
- **Screenshots:** `05-journal-pc-mobile.png` (covers mirror banner),
  `07-journal-settings-mobile.png` (covers "2 items shared
  individually"), `12-gm-journal-detail-mobile.png` (covers NPC
  description), `06-journal-npc-mobile.png`.
- **Observed:** Same avatar, now used as a floating bottom-left
  button on mobile, sits at a fixed y position and occludes whatever
  content scrolls under it.
- **Expected:** Either tuck into a mobile bottom bar, or add
  `padding-bottom` to the page scroll container so nothing important
  ever sits under it.
- **Severity:** Major — actively hides information on pages the user
  is trying to read.

### M3 — GM view uses player real name instead of PC name

- **Surface:**
  `/campaigns/:id/journals` (list row title) and
  `/campaigns/:id/journals/:journalId` (page H1 + "Shared by …"
  framing).
- **Screenshots:** `11-gm-journals-list-desktop.png`,
  `12-gm-journal-detail-desktop.png`.
- **Observed:** Both pages show *"Jordan Reyes's journal"* and
  *"Shared by Jordan Reyes"*.
- **Expected:** The GM lives in the fiction and thinks in PC names.
  Prefer *"Serafine's journal"* (PC name) or a compound
  *"Serafine — Jordan Reyes"* that surfaces both. Match whatever
  the campaign-PC mirror page uses, which already shows
  `Serafine Ashveil` as the H1.
- **Severity:** Major — breaks the trust moment that J5 is supposed
  to deliver. The GM shouldn't have to mentally map real names back
  to characters when reading shared content.

### M4 — Share toggle is icon-only, unlabeled, state unclear

- **Surface:** capture rows
  (`/journals/:id` and `/journals/:id/sessions/:sessionId`), journal
  PC page, journal NPC page.
- **Screenshots:** `04-session-detail-desktop.png` (the two eye /
  crossed-eye icons next to `Edit` `Delete`), `06-journal-npc-desktop.png`
  (lone eye icon under description).
- **Observed:** A small `Eye` (shared) or `EyeOff` (not shared) icon
  with no adjacent text label. Neighboring destructive/edit buttons
  (`Edit`, `Delete`) have both icon + label. The shared vs. not-
  shared color difference is subtle enough that it reads as
  "some state" not "this state".
- **Expected:** Either a labeled button (`Share` / `Shared`) or a
  two-state switch with an explicit color flip. Anything that
  communicates state without requiring hover.
- **Severity:** Major — this is J5's primary affordance. If users
  can't find it or tell which state they're in, sharing won't get
  used.

### M5 — Capture editor `X` close bypasses the dirty-check that Cancel honors

- **Surface:** capture editor sheet (opened from "Start capturing").
- **Screenshots:** `44-cancel-dirty-state-desktop.png` (AlertDialog
  correctly appears), `45-x-close-dirty-state-desktop.png` (no
  dialog, sheet just closes).
- **Observed:** Pressing `Cancel` with unsaved changes shows
  "Discard changes? Your draft will be lost. This can't be undone."
  Pressing the `X` (top-right) or `Escape` skips the prompt and
  throws away the draft.
- **Expected:** Any close path — button, `X`, `Escape`, outside-click
  — should hit the same dirty-check.
- **Severity:** Major — silent data loss. Users train on the Cancel
  experience and get bitten by the `X`.

### M6 — Journal PC backstory has a duplicate "Backstory" label and an awkward share placement

- **Surface:** `/journals/:id/player-characters/:pcId`.
- **Screenshot:** `05-journal-pc-desktop.png`.
- **Observed:** The editor has a `BACKSTORY` uppercase label above
  the toolbar, a `Save backstory` button below it, and then
  *another* `Backstory` line (lowercase, with the crossed-eye share
  icon) below the Save button.
- **Expected:** One label. The share toggle should sit at the
  section header, not in a second "Backstory" line below the save
  button.
- **Severity:** Major — looks like a partially-merged design. Makes
  the share toggle hard to associate with the backstory itself.

---

## Minor

### m1 — Campaign PC subtitle on GM view isn't a link

- **Surface:** `/campaigns/:id/player-characters/:pcId` (GM view of a
  mirrored PC).
- **Screenshot:** `13-campaign-pc-mirrored-desktop.png`.
- **Observed:** Subtitle reads *"Linked to Jordan Reyes's journal."*
  as plain text.
- **Expected:** Make it a link to
  `/campaigns/:id/journals/:journalId` so the GM can jump to the
  shared view in one click.
- **Severity:** Minor — the nav exists via the sidebar "Journals"
  item, but an inline link would close the loop on the mirror
  ceremony.

### m2 — Inline rename pencil on journal PC is hover-only

- **Surface:** `/journals/:id/player-characters/:pcId`.
- **Observed:** The pencil icon next to the PC name uses
  `opacity-0 group-hover:opacity-*`, so it's invisible until the
  user happens to hover.
- **Expected:** Low-opacity but visible by default, full on hover.
- **Severity:** Minor — the settings page rename path still works,
  but the inline affordance doesn't announce itself.

### m3 — Mixed copy in "Start capturing" session dialog

- **Surface:** session-picker dialog opened from "Start capturing".
- **Screenshot:** `40-start-capture-dialog-desktop.png`.
- **Observed:** Options read *"New session"*, *"Continue Session 2"*
  (no title), and *"Continue Session 1 — The Tavern"* (with title).
  Session 2 has no title in the seed; Session 1 has "The Tavern".
- **Expected:** Consistent formatting. Either always show title
  (falling back to a placeholder), or always hide it.
- **Severity:** Minor — cosmetic, only visible when a session
  lacks a title.

### m4 — Mobile GM journal detail: title wraps under the badge

- **Surface:** `/campaigns/:id/journals/:journalId` on mobile.
- **Screenshot:** `12-gm-journal-detail-mobile.png`.
- **Observed:** The H1 ("Jordan Reyes's journal") and the
  `Individually shared items` badge compete for the same row.
- **Expected:** Stack the badge under the title at <640px, or move
  it into the subtitle line.
- **Severity:** Minor — readable, just noisy.

### m5 — GM journal list row lacks PC context

- **Surface:** `/campaigns/:id/journals`.
- **Screenshot:** `11-gm-journals-list-desktop.png`.
- **Observed:** Row shows *"Jordan Reyes"* + *"1 capture · 1 entity"*.
  No journal name, no PC name, no campaign link.
- **Expected:** At minimum, show the PC this journal's player is
  playing ("Jordan Reyes — Serafine Ashveil"). Extension of M3.
- **Severity:** Minor once M3 lands; duplicative otherwise.

### m6 — Journal NPC page: share toggle floats under description with no label

- **Surface:** `/journals/:id/npcs/:npcId`.
- **Screenshot:** `06-journal-npc-desktop.png`.
- **Observed:** The orange eye icon sits on its own line below the
  description, no label, no visual grouping.
- **Expected:** Move next to the NPC name / breadcrumb, or into a
  header-bar with "Share" text. Same fix as M4.
- **Severity:** Minor — extension of M4.

---

## Flagged for J6

### J6-1 — `campaignNavigation` shows `Journals` to non-GMs

- **Reference:** J5 flag #3 (carried forward).
- **Surface:** every campaign page, sidebar.
- **Observed:** Kael (PLAYER role) sees the `Journals` nav item
  and lands on `notFound()` when clicking it.
  (`22-kael-gm-page-denied-desktop.png` confirms the 404.)
- **Expected:** Hide the item for non-GMs, or render a scoped
  "your journal" link for players.
- **Why deferred:** Matches the existing "always-show, page gates"
  pattern. Role-aware nav is a cross-cutting change.

### J6-2 — Share-toggle error UX is revert-only

- **Reference:** J5 flag #9.
- **Observed:** On API failure the icon flips back with no toast
  and no inline error.
- **Expected:** Brief red outline / shake / toast when a toast lib
  lands.
- **Why deferred:** Paired with the general absence of a toast
  library. When one lands, wire this up in the same pass.

### J6-3 — Share rows survive soft-delete of the target entity

- **Reference:** J5 flag #8.
- **Observed:** Deleting a shared capture removes it from the GM
  view but the `JournalShare` row persists. If the capture were
  ever undeleted the share reactivates.
- **Expected:** Design property, not a bug. Document it in
  `docs/journals.md`.

### J6-4 — Invisibility rule may confuse GMs

- **Reference:** J5 flag #5.
- **Observed:** Journals with zero shares don't appear in the GM
  list at all. A player who says "I have a journal" but hasn't
  shared anything is invisible to the GM.
- **Expected:** Privacy default is correct; consider adding a
  passive counter ("3 players have journals, 1 has shared")
  if it becomes a pain point.

---

## By design

### b1 — Unlink preserves content and explains it

- `34-unlink-confirmation-desktop.png`. Copy is thoughtful: *"Your
  journal content stays with you — notes, entities, and writing
  are untouched."* Good trust moment.

### b2 — Sharing disabled when journal is unlinked

- Consistent with the `docs/journals.md` spec: no campaign → no
  share target.

### b3 — Kael's 404 on GM journals route

- Same `notFound()` pattern the campaign settings page uses for
  non-GMs. Consistent (see J6-1 for the nav-item side of this).

### b4 — Journal PC mirror banner

- `"Mirrored to your character in The Shattered Conclave. The GM
  sees your character name and any public one-liner, but not this
  backstory."` Clear about what's private vs. shared.

### b5 — Shared-with-GM settings card

- `07-journal-settings-desktop.png`. Journal-wide toggle plus an
  itemized "2 items shared individually" list with `×` unshare
  buttons. Matches the spec; reads well.

---

## Appendix — coverage checklist

| Surface | Desktop | Mobile |
|---|---|---|
| Sign-in | ✅ | ✅ |
| Serafine journals list | ✅ | ✅ |
| Serafine journal home | ✅ | ✅ |
| Serafine session detail | ✅ | ✅ |
| Serafine journal PC | ✅ | ✅ |
| Serafine journal NPC | ✅ | ✅ |
| Serafine journal settings | ✅ | ✅ |
| New-journal form | ✅ | ✅ |
| GM campaign overview | ✅ | ✅ |
| GM journals list | ✅ | ✅ |
| GM journal detail | ✅ | ✅ |
| GM campaign PC (mirrored) | ✅ | ✅ |
| GM campaign settings | ✅ | ✅ |
| Kael journals (empty) | ✅ | ✅ |
| Kael campaign overview | ✅ | ✅ |
| Kael → GM page (404) | ✅ | ✅ |
| Capture editor empty | ✅ | ✅ |
| Capture editor typed | ✅ | ✅ |
| Capture Cancel (dirty) | ✅ | — |
| Capture `X` close (dirty) | ✅ | — |
| Add cross-reference dialog | ✅ | ✅ |
| Unlink confirmation | ✅ | ✅ |
| Delete-journal confirmation | ✅ | ✅ |
| Start-capture session dialog | ✅ | ✅ |

All screenshots in `docs/audit-screenshots/`, named
`<number>-<surface>-<viewport>.png`.
