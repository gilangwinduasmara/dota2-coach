# dota2-coach MCP server

Exposes one tool, `analyze_dota2_match`, that fetches a public Dota 2 match
from OpenDota and returns a coaching-report-ready JSON summary (same data the
skill's `scripts/analyze_match.js` produces — both call the shared logic in
`../lib/analyze.js`). Because the OpenDota fetch happens inside the MCP
server process rather than a script the model asks Claude Code to run, it
works in clients that don't allow the model's own sandbox to make outbound
API calls, including claude.ai chat.

Inputs: `match_id` (required), `player` (account_id, personaname substring,
or hero name substring — for a deep-dive on one participant), `refresh`
(bypass cache), `no_wait` (don't wait for OpenDota to parse an unparsed
match).

## 1. Claude Code (already wired up)

Nothing to do — installing this plugin registers the server automatically via
`mcpServers` in `.claude-plugin/plugin.json`, running the pre-built
`dist/server.cjs` over stdio. Cache is written under `${CLAUDE_PLUGIN_DATA}/cache`
so it survives plugin updates.

If you edit `server.js` or `../lib/*`, rebuild the bundle before it takes
effect in Claude Code:

```
npm install   # first time only
npm run build # regenerates dist/server.cjs
```

## 2. Claude Desktop app (stdio, local)

Run `npm install` in this directory once, then add to your
`claude_desktop_config.json` (Settings → Developer → Edit Config):

```json
{
  "mcpServers": {
    "dota2-coach": {
      "command": "node",
      "args": ["/absolute/path/to/dota2-coach/mcp-server/server.js"]
    }
  }
}
```

Restart Claude Desktop. The tool should appear as `dota2-coach:analyze_dota2_match`.

## 3. claude.ai web chat (remote HTTP connector)

claude.ai can't spawn local processes, so the server needs to be reachable
over HTTPS. Two ways to get there:

**Quick test with a tunnel** (no deployment, but the URL only lives as long
as the tunnel does):

```
npm install
npm run start:http          # listens on http://localhost:8787/mcp
# in another terminal:
ngrok http 8787              # or `cloudflared tunnel --url http://localhost:8787`
```

Take the `https://...ngrok...` URL, append `/mcp`, and add it as a custom
connector: claude.ai → Settings → Connectors → Add custom connector → paste
the URL.

**Real deployment** (durable, for regular use): deploy this directory to any
Node host (Fly.io, Render, Railway, a VPS, etc.) and run `npm run start:http`
there (respects `PORT` env var). Then add `https://your-host/mcp` as a
custom connector the same way. No auth is implemented — OpenDota's API is
public and free, so the server itself needs no secrets, but put it behind
your host's HTTPS and, if you don't want it open to anyone who finds the URL,
your host's access controls (this server doesn't implement its own).

Cache location: set `DOTA2_COACH_CACHE_DIR` to control where match/constant
JSON is cached; defaults to `mcp-server/../cache`.
