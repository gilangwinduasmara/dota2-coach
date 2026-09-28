# dota2-coach

A Claude Code plugin that turns a Dota 2 match ID into a personalized
coaching report — laning, farming, deaths, itemization, objectives,
teamfights, and benchmark percentiles vs. your rank bracket — using match
data from the free [OpenDota API](https://docs.opendota.com/).

Give Claude a match ID (or a Dotabuff/OpenDota/Stratz match URL) and ask for
a review, and it does the rest.

## How it works

This repo is intentionally thin — just the plugin manifest and the skill:

- `.claude-plugin/plugin.json` / `marketplace.json` — the plugin manifest,
  registering both the skill and a remote MCP tool, `analyze_dota2_match`.
- `skills/analyze-match/SKILL.md` — the coaching workflow and how to interpret
  the data the tool returns.

The actual match-fetching logic (OpenDota API calls, caching, JSON
summarization) lives in a separate repo,
[dota2-coach-mcp-server](https://github.com/gilangwinduasmara/dota2-coach-mcp-server),
deployed at `https://dota2-coach.promager.com/mcp`. Installing this plugin
just points Claude at that URL — no local process runs on your machine,
which is also why it works the same in Claude Code, Claude Desktop, and
claude.ai chat.

## Install

This repo is its own marketplace (`.claude-plugin/marketplace.json`), so you
can register and install it directly from GitHub:

```
/plugin marketplace add gilangwinduasmara/dota2-coach
/plugin install dota2-coach@dota2-coach
```

That registers both the skill and the `analyze_dota2_match` tool
automatically — nothing else to configure.

## Usage

Just ask Claude to review a match:

> Can you review this game for me? https://www.dotabuff.com/matches/7891234567

Claude will typically call the `analyze_dota2_match` tool directly, since
that alone is often enough to answer. If you want to guarantee the skill's
full coaching guidance is used (report structure, benchmark interpretation,
the full-match rating tables), invoke it explicitly, in Claude Code:

```
/dota2-coach:analyze-match Can you review this game for me? https://www.dotabuff.com/matches/7891234567
```

## License

[MIT](LICENSE)
