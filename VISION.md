# Grimoire

## What it is

Grimoire is a workstation for tabletop RPG campaigns.

Not a knowledge base. Not a character sheet manager. Not a virtual tabletop. A workstation — the desk a GM sits at to run their game, and the notebook a player keeps open to follow along. The centerpiece of campaign prep and play, not a storage bin for it.

## What it's for

Grimoire exists for the specific experience of running or playing a **long campaign** — the kind that goes for months or years, with dozens of NPCs, shifting factions, threads that mature over time, and a party whose shared memory outgrows anyone's ability to keep it in their head.

One-shots don't need this. Vibes-only GMs don't need this. The people who need this are the ones who, six months into a campaign, find themselves asking "wait, did the party ever meet that noble? What did they tell her?" and having no good way to answer.

Grimoire is for:

- **GMs running long campaigns** who are tired of their notes being scattered across Notion pages, Google Docs, notebook paper, and memory.
- **Players in those campaigns** who want structured, queryable personal notes — not just to pass time between sessions but to actually remember what happened.
- **Solo users on either side** — a GM prepping their world with no players yet, or a player in a campaign whose GM doesn't use any tools. Grimoire works for either one alone. When the whole table uses it, the experience is richer, but it's never required.

## The problem

Existing tools are either too generic or too ambitious.

Notion is too generic. You can build anything in it, which means you spend your time building your system instead of running your campaign. There's no opinion in Notion about what a faction is, how an NPC relates to a location, or what a player knows versus what the GM knows. You have to invent all of that yourself, and because you invented it yourself, no one else's Notion template quite fits your game.

Purpose-built TTRPG tools tend to over-reach. They try to be character sheets and battle maps and dice rollers and note-takers all at once, and end up doing none of it well. They want to be the whole experience of the game instead of an aid to it.

Both types of tools share a deeper failure: they don't understand the **flow** of a campaign. They store facts. They don't help you see that Faction A and Faction B are heading toward a collision, or that three separate clues point to the same hidden NPC, or that one player knows something the rest of the table doesn't. Campaigns are about information in motion. Tools that treat them as static facts miss the point.

## What Grimoire believes

**Opinionated beats flexible.** The system knows what an NPC is, what a faction is, what a thread is, and how they connect. You don't design the schema; you use it. That constraint is the feature.

**Notes and knowledge, not stats.** Grimoire will not track hit points, inventory, or character class progression. There are good tools for that. Grimoire is for the narrative layer: who knows what, who wants what, what's happening, what it means.

**Information asymmetry is core.** A campaign isn't a shared document. The GM knows things the players don't. One player knows things the other players don't. The whole point of a mystery, a betrayal, or a slow reveal is that someone is finding out what someone else already knew. Grimoire treats this as a first-class feature: every entity and every piece of information has visibility, and those visibilities are controllable per-player with optional aliases.

**The connections matter more than the facts.** An NPC in isolation is a card. An NPC in context — allied with this faction, hostile to that one, hiding something from this player, known only as an alias to that one — is a character in a story. Grimoire's job is to surface those connections, not just to store them. The relationship graph is not a feature; it's the point.

**Human-first, not tool-first.** TTRPGs are fun because of the people at the table. Grimoire is not a replacement for any of that magic. It's an aid that removes friction. The test for every feature is: "Does this let the GM spend more of their energy on the game and less on the logistics?" If the answer is no, it doesn't ship.

## Who it's *not* for

- One-shot GMs. Grimoire's cost-to-value ratio only makes sense past session ~5.
- GMs who prefer to run games entirely from a single notebook. That's a valid style; Grimoire isn't the right tool.
- Players who just want to roll dice and enjoy the ride without tracking anything. Also valid, also not the target.
- Anyone looking for a VTT, a battle map tool, or a character sheet manager. Those are different products.

## What's in

**Core (shipping now):**

- Campaigns, NPCs, locations, factions, threads, clues, player characters
- Structured notes on every entity, with @-mentions that create live links between things
- Sessions with live note-taking, entity tagging, and AI-generated recaps
- A relationship graph that shows the campaign's topology — connections, clusters, isolates
- Per-player information visibility: reveal entities to specific players, with optional aliases ("the grey-cloaked figure" instead of the NPC's real name)
- A player portal where each player sees only what their character knows
- An invite system so GMs can add players to a campaign by email
- A command palette for fast navigation
- An MCP server so Claude (and eventually other AI clients) can query your campaign directly
- A demo campaign seeded for every new user so nobody faces an empty app

**Roadmap:**

- **Random tables** — create your own, roll on them from anywhere, reference them during play
- **In-world calendar** — track dates in your campaign's time system, not just real-world dates. Flexible month/week/day lengths so Waterdeep's calendar or your homebrew world's calendar both work
- **Customizable workstation layouts** — shipped with good defaults (References / Knowledge / Tools as a three-panel layout), with per-entity-type templates and user-authored variants
- **File uploads** — maps, images, NPC portraits, handouts
- **Unstructured notes import** — feed in old Notion pages, Google Docs, session logs, and get a structured Grimoire campaign back
- **Worldbuilding toolkit** — build a world independently of any specific campaign; spin up multiple campaigns from the same world
- **Storybook export** — at the end of a long campaign, get a readable retrospective: the story of what happened, told back to you
- **More AI clients** — ChatGPT and others via the MCP server
- **Plugins / extensions** — far future, but the architecture is designed to allow it

## What's not, ever

- Character sheets (HP, stats, class features, inventory)
- Virtual tabletops (battle maps, token movement)
- Dice rolling as a primary feature (small integrations with random tables are fine; a full roller isn't the point)
- Generic note-taking. Grimoire is for TTRPG campaigns specifically, and opinionated about it. Use Notion for your groceries.

## The north star

At the end of a three-year campaign, a player or GM should be able to open Grimoire and see not a pile of data but **the story of what happened** — the arc, the betrayals, the moments, the characters who mattered, in a form that can be read back like a book.

That's the aspiration. Every feature is judged against whether it moves toward that.

## How it's built (briefly)

Grimoire is open source, MIT-licensed, and self-hostable. The hosted version is free for core features. Premium tier covers AI features (recap generation, unstructured import), high-scale usage, and advanced workstation customization — things with real cost attached. The free tier is not crippled; it's a complete tool. You can run a real campaign on it without ever paying.

This is a portfolio project first. If it earns a place as a real product through use and feedback, it will become one. It doesn't need to be a business to be worth building.

## Principles for building it

1. **Ship polish, not features.** Every feature goes out finished. A half-built feature is a broken feature.
2. **Defaults over customization.** Customization is for the 10% who want to tinker. The 90% should get a good experience out of the box without touching settings.
3. **Opinion is the product.** If a feature makes Grimoire more generic, it probably shouldn't ship. If it makes Grimoire more specifically good at campaigns, it should.
4. **The graph is the point.** Any new entity type has to fit into the relationship graph, the mention system, and the reveal system. If it can't, it probably doesn't belong.
5. **Humans at the table come first.** Nothing Grimoire does should replace a moment of play. Only remove friction around it.
