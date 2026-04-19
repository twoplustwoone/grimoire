# Grimoire

**A workstation for tabletop RPG campaigns.**

Grimoire is an opinionated note-taking and knowledge-management tool for long-running TTRPG campaigns. It's for GMs drowning in context — dozens of NPCs, shifting factions, threads that mature over months — and for players who want structured, queryable personal notes. It does one thing: help you remember your campaign and see how it connects.

It is not a character sheet manager, a virtual tabletop, or a dice roller. Read [VISION.md](./VISION.md) for the full philosophy.

🌐 **Hosted version:** [grimoire.twoplustwoone.dev](https://grimoire.twoplustwoone.dev)

---

## What's in the box

- **Campaigns** with NPCs, locations, factions, threads, clues, and player characters
- **Notes** on every entity, with @-mentions that create live links across your campaign
- **Sessions** with live note-taking, entity tagging, and AI-generated recaps
- **A relationship graph** that shows your campaign's topology — force-directed layout, hover highlighting, click-to-navigate
- **Per-player information visibility** — reveal entities to specific players, with optional aliases ("the grey-cloaked figure" vs. the NPC's real name)
- **A player portal** where each player sees only what their character knows
- **Invite system** — GMs invite players by email with shareable links
- **Command palette** (⌘K) for fast navigation across any campaign
- **MCP server** — connect Claude (and eventually other AI clients) to your campaign via OAuth. Ask "what does Serafine know about the Merchant Guild?" in Claude and get a real answer from your data.
- **Demo campaign** — every new account gets *The Shattered Conclave* pre-seeded so there's never an empty state

---

## Tech stack

TypeScript monorepo (Turborepo) with:

- **Web:** Next.js 16 (App Router), Tailwind CSS, shadcn/ui, React Flow + d3-force for the relationship graph, Tiptap for rich text and @-mentions
- **API:** Hono on Node 22
- **Database:** PostgreSQL + Prisma
- **Auth:** Better Auth (sessions for the web app, OAuth 2.1 + PKCE for the MCP server)
- **AI:** Vercel AI SDK + Anthropic Claude for recap generation
- **MCP:** `@modelcontextprotocol/sdk`, HTTP transport with dynamic client registration
- **Hosting:** Railway (API + Web + Postgres)

Monorepo structure:

```
grimoire/
├── apps/
│   ├── web/          # Next.js frontend
│   └── api/          # Hono API + MCP server
├── packages/
│   ├── db/           # Prisma schema, client, migrations, seed
│   ├── types/
│   ├── ai/
│   └── realtime/
├── docker-compose.yml
└── VISION.md
```

---

## Running it locally

**Prerequisites:**

- Node 22
- pnpm
- Docker (for local Postgres)

**Setup:**

```bash
# Install dependencies
pnpm install

# Start Postgres
docker compose up -d

# Run migrations and seed
pnpm --filter @grimoire/db exec prisma migrate deploy
pnpm --filter @grimoire/db exec prisma db seed

# Start both apps
pnpm dev
```

Web runs on [http://localhost:3000](http://localhost:3000), API on [http://localhost:3005](http://localhost:3005).

**Seeded accounts (local only):**

| Role | Email | Password |
|---|---|---|
| GM | `gm@grimoire.dev` | `password` |
| Player (Serafine) | `serafine@grimoire.dev` | `password` |
| Player (Rook) | `rook@grimoire.dev` | `password` |
| Player (Maren) | `maren@grimoire.dev` | `password` |

Signing in as the GM shows the full editorial view. Signing in as a player shows the player portal perspective with only revealed entities.

---

## Connecting Claude Desktop

Grimoire exposes an MCP server so Claude can query your campaign data directly.

1. Open Claude Desktop → Settings → Connectors → **Add custom connector**
2. Name: `Grimoire`
3. URL: `https://grimoire.twoplustwoone.dev/mcp` (or your local/self-hosted URL)
4. Claude opens a browser to authorize. Sign in and click Allow.
5. Ask Claude something like *"What are the open threads in my Shattered Conclave campaign?"*

The OAuth flow handles the whole thing — no API keys to copy, no config file to edit. Once authorized, Claude has read-only access to your campaigns.

Available tools include: `list_campaigns`, `get_campaign_summary`, `list_npcs`, `get_npc`, `list_open_threads`, `list_sessions`, `get_session_recap`, `search_entities`, `list_player_characters`, `get_player_knowledge`.

---

## Status

Grimoire is actively developed and used. It's stable enough to run a real campaign on. Expect rough edges on new features as they ship; expect the roadmap to shift as the product finds its shape.

See [VISION.md](./VISION.md) for the philosophy and the roadmap, and [docs/](./docs/) for architecture and decision records (coming soon).

---

## License

MIT. See [LICENSE](./LICENSE).

---

## Acknowledgments

Built because I wanted to run Dragon Heist and realized no existing tool fit how I actually think about running a long campaign. If you find it useful, let me know — I'd love to hear what you're using it for.
