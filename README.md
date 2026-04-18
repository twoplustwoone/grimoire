# Grimoire

> A GM companion platform for running rich, stateful tabletop campaigns.

Grimoire helps game masters build and manage living campaign worlds — tracking NPCs, locations, factions, threads, and clues across sessions. At the end of each session, an AI recap engine reads your actual campaign state and generates a structured summary that knows your world.

[Add a screenshot or demo gif here once available]

---

## Features

- **Campaign management** — Create and manage campaigns with full entity graphs: NPCs, locations, factions, plot threads, and clues
- **Living world model** — Every entity has status, relationships, faction memberships, and a structured changelog tracking how it evolved across sessions
- **Session tracking** — Log notes mid-session, tag which entities were involved, write GM summaries
- **AI recap generation** — After each session, Claude reads your tagged entities, notes, and campaign context to generate a structured recap that reflects your specific world
- **Inline editing** — Every entity field is editable in place with optimistic UI and audit trail
- **Three themes** — Dark atmospheric (Grimoire), clean (Minimal), and whimsical (Fey) — persisted per user
- **Mobile-first session mode** — Fast entity lookup and note logging during play

---

## Architecture

Grimoire is a TypeScript monorepo built with Turborepo, structured as two applications sharing a common database package.

```
grimoire/
├── apps/
│   ├── web/          # Next.js 15 — UI, server components, auth-gated routes
│   └── api/          # Hono — REST API, business logic, AI pipeline
├── packages/
│   ├── db/           # Prisma schema, client singleton, migrations
│   ├── types/        # Shared TypeScript types
│   ├── ai/           # AI pipeline utilities (planned)
│   └── realtime/     # Real-time layer (planned)
```

### Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | Next.js 15 (App Router) | Server components for data fetching, client components for interactivity |
| API | Hono | Lightweight, TypeScript-native, excellent monorepo fit |
| Database | PostgreSQL + Prisma | Relational model fits interconnected campaign data |
| Auth | Better Auth | Best self-hosted TypeScript auth library, Prisma adapter |
| AI | Vercel AI SDK + Anthropic | Model-agnostic SDK, claude-sonnet-4 for recap generation |
| Styling | Tailwind CSS + shadcn/ui | Owned components, CSS variable theming |
| Hosting | Railway | Postgres + API + web in one platform |

### Data model highlights

The schema uses a **polymorphic entity pattern** — cross-cutting concerns (notes, changelog entries, relationships, session tags) reference any entity type via `entityType + entityId` pairs rather than separate join tables per entity. This keeps the schema extensible without an explosion of tables.

Key design decisions:
- **GameSession vs Session** — the campaign session model is named `GameSession` in Prisma to avoid collision with Better Auth's `Session` model
- **Soft deletes** — all entities have `deletedAt` for safe removal without losing historical references
- **Changelog over event sourcing** — every field mutation writes a structured changelog entry, giving the AI pipeline historical context without the complexity of full event sourcing
- **Custom field definitions** — campaigns can define typed custom fields (text, number, progress, select) per entity type, enabling module-specific tracking like Dragon Heist faction reputation

### AI pipeline

The recap generator in `apps/api/src/lib/recap.ts` builds a structured context payload from:
- Session notes (chronological)
- Tagged entity details (NPCs with descriptions and status, locations, factions with agendas, threads with urgency, clues)
- Campaign settings (system, world, tone)
- GM's own summary notes

This context is passed to Claude with a system prompt instructing it to write a concise, evocative recap in 3-5 paragraphs using only information present in the notes. The result is stored as `aiSummary` on the session, distinct from the GM's own `gmSummary`.

---

## Getting started

### Prerequisites

- Node.js 22+
- pnpm 10+
- Docker (for local Postgres)

### Installation

```bash
git clone https://github.com/twoplustwoone/grimoire.git
cd grimoire
pnpm install
```

### Local development

```bash
# Start local Postgres
pnpm db:up

# Apply migrations
pnpm db:migrate

# Seed with a full Dragon Heist campaign
pnpm seed
# Login: gm@grimoire.dev / grimoire123

# Start both servers
pnpm dev
# Web: http://localhost:3000
# API: http://localhost:3005
```

### Environment variables

**`apps/api/.env`**
```
DATABASE_URL=postgresql://grimoire:grimoire@localhost:5432/grimoire
BETTER_AUTH_SECRET=your-secret-here
BETTER_AUTH_URL=http://localhost:3005
WEB_URL=http://localhost:3000
ANTHROPIC_API_KEY=your-anthropic-key-here
PORT=3005
```

**`apps/web/.env.local`**
```
DATABASE_URL=postgresql://grimoire:grimoire@localhost:5432/grimoire
BETTER_AUTH_SECRET=your-secret-here
BETTER_AUTH_URL=http://localhost:3005
NEXT_PUBLIC_API_URL=http://localhost:3005
API_INTERNAL_URL=http://localhost:3005
```

### Useful commands

```bash
pnpm db:up        # Start Postgres container
pnpm db:down      # Stop Postgres container
pnpm db:migrate   # Apply pending migrations
pnpm db:reset     # Wipe DB, reapply migrations, reseed
pnpm seed         # Seed Dragon Heist campaign data
pnpm dev          # Start API + web dev servers
pnpm build        # Build all packages
```

---

## Roadmap

See [SCOPE.md](./SCOPE.md) for the full backlog. Near-term priorities:

- [ ] MCP server — expose campaign data to Claude and other MCP clients
- [ ] Player portal — controlled information reveal per player
- [ ] Relationship visualization — graph view of entity connections
- [ ] Plugin system — shareable campaign module configurations

---

## License

MIT
