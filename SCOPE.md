# Grimoire — Scope & Roadmap

> A private GM tool for a small group where you can build a living campaign, run sessions against it, and get an AI recap that knows your world.

---

## V1 — Shipped ✅

- Auth — sign up, sign in, session management (Better Auth)
- App shell — sidebar, mobile nav, protected routes
- Campaigns — list, create, detail
- Entities — NPCs, Locations, Factions, Threads, Clues (full CRUD)
- Sessions — create, note logging, entity tagging, mark completed
- AI recap generation — reads real campaign state via Anthropic
- Root page redirect based on auth state
- Deployed on Railway with Postgres

---

## Backlog

### Polish (fast wins)
- [ ] Visual theme pass — dark atmospheric direction, custom accent color
- [ ] Seed script for local development with a full Dragon Heist campaign
- [ ] Update page titles and meta descriptions

### Features
- [ ] Player portal with controlled information reveal
- [ ] Information node reveal system (data model already supports it)
- [ ] Entity editing — update name, description, status inline on detail pages
- [ ] Note promotion — convert scratchpad notes to canonical information nodes
- [ ] Session entity tagging UI — tag NPCs/locations/factions from the session page
- [ ] Relationship visualization — graph view of entity connections
- [ ] In-world calendar UI
- [ ] Custom field UI — create and manage campaign-specific fields (e.g. faction reputation)

### AI
- [ ] AI-assisted prep — NPC voice suggestions, thread surfacing
- [ ] Session prep summary — what threads are open, what NPCs are relevant
- [ ] Between-session world event suggestions

### Infrastructure
- [ ] MCP server exposing campaign data to Claude and other clients
- [ ] Plugin system for module-specific configurations (Dragon Heist starter pack)
- [ ] Import from Obsidian, Notion, World Anvil
- [ ] Proper error boundaries and loading states throughout

### Growth
- [ ] Public launch and monetization (free/paid tiers)
- [ ] Self-hosting documentation
- [ ] Open source community plugins

---

## Decisions Log

| Decision | Rationale |
|---|---|
| Turborepo monorepo | Single repo for web, api, db, ai packages |
| Hono for API | Lightweight, TypeScript-native, good monorepo fit |
| Better Auth | Best self-hosted TypeScript auth library |
| Prisma + PostgreSQL | Relational model fits interconnected campaign data |
| Polymorphic entity_type + entity_id pattern | Cross-cutting concerns (notes, changelog, relationships) attach to any entity |
| GameSession model name | Avoids collision with Better Auth's Session model |
| Current state + changelog (not event sourcing) | 80% of AI value at fraction of complexity cost |
| Next.js rewrites + /api/v1 prefix | Avoids conflict between Next.js page routes and API routes |
| Railway for hosting | Simple deployment, built-in Postgres, no ops overhead |
