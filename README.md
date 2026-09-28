# dota2-coach

A Claude Code plugin that turns a Dota 2 match ID into a personalized
coaching report — laning, farming, deaths, itemization, objectives,
teamfights, and benchmark percentiles vs. your rank bracket — using match
data from the free [OpenDota API](https://docs.opendota.com/).

Give Claude a match ID (or a Dotabuff/OpenDota/Stratz match URL) and ask for
a review, and it does the rest.

## How it works

- `skills/dota2-coach/` — a Claude Code skill (`SKILL.md`) describing the
  coaching workflow and how to interpret the data.
- `lib/` — the actual fetch/cache/summarize logic, shared by both entry
  points below.
- `mcp-server/` — an MCP server exposing the same analysis as a tool,
  `analyze_dota2_match`, so it also works in clients that don't let a
  script make its own outbound API calls (e.g. claude.ai chat), not just
  Claude Code.

## Install (Claude Code)

This repo is its own marketplace (`.claude-plugin/marketplace.json`), so you
can register and install it directly from GitHub:

```
/plugin marketplace add gilangwinduasmara/dota2-coach
/plugin install dota2-coach@dota2-coach
```

That registers both the skill and its MCP server (`analyze_dota2_match`)
automatically — nothing else to configure. Then just ask Claude to review a
match:

> Can you review this game for me? https://www.dotabuff.com/matches/7891234567

## Use outside Claude Code (Claude Desktop / claude.ai)

The MCP server also runs standalone for Claude Desktop (local, stdio) or as
a remote custom connector for claude.ai web chat (HTTP). See
[`mcp-server/README.md`](mcp-server/README.md) for setup instructions for
each.

## License

[MIT](LICENSE)
