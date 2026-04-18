# Grimoire MCP Server — Claude Desktop Setup

## Prerequisites
- Node.js 22+
- pnpm installed
- Grimoire repo cloned and dependencies installed

## Setup

1. Build the MCP server:
```bash
pnpm --filter @grimoire/mcp build
```

2. Add to Claude Desktop config at `~/Library/Application Support/Claude/claude_desktop_config.json`.

   Claude Desktop may pick up whichever Node is first on its PATH (often an old nvm default). Point `command` at a specific Node 22 binary to avoid that entirely:

```json
{
  "mcpServers": {
    "grimoire": {
      "command": "/Users/twoplustwoone/.nvm/versions/node/v22.21.1/bin/node",
      "args": ["/Users/twoplustwoone/code/personal/web/grimoire/apps/mcp/dist/index.js"],
      "env": {
        "DATABASE_URL": "postgresql://grimoire:grimoire@localhost:5432/grimoire"
      }
    }
  }
}
```

Adjust both paths for your machine. Run `which node` and `pwd` inside the repo to confirm. The MCP server requires Node 22+ — Node 16 and 18 will fail.

3. Restart Claude Desktop.

4. You should see the Grimoire tools available. Try asking:
- "List my Grimoire campaigns"
- "What are the open threads in campaign [id]?"
- "Give me a summary of the Dragon Heist campaign"
- "Which NPCs are in the Xanathar Guild?"

## Available Tools

| Tool | Description |
|---|---|
| `list_campaigns` | List all campaigns |
| `get_campaign` | Full campaign details |
| `get_campaign_summary` | High-level campaign overview |
| `list_npcs` | All NPCs with status and affiliations |
| `get_npc` | Full NPC details with notes |
| `list_open_threads` | Open/dormant plot threads by urgency |
| `get_session_recap` | Session notes and recap |
| `list_sessions` | All sessions with summaries |
| `search_entities` | Search across all entity types |
| `get_faction` | Faction details with members |
