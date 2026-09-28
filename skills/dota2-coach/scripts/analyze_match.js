#!/usr/bin/env node
'use strict';

/**
 * CLI wrapper for the shared analyze_match logic (see ../../../lib/analyze.js).
 * Fetches a Dota 2 match from OpenDota, caches it locally, and prints a
 * compact JSON summary tailored for coaching analysis.
 *
 * Usage:
 *   node analyze_match.js <match_id> [--player <account_id|name|hero>] [--refresh] [--no-wait] [--raw]
 *
 *   --player   Focus the deep-dive section on one participant. Matches
 *              against account_id (exact), personaname (substring, ci), or
 *              hero localized name (substring, ci). If ambiguous, prints
 *              candidates and exits non-zero.
 *   --refresh  Ignore any cached match JSON and re-fetch from OpenDota.
 *   --no-wait  Don't request/wait for a full parse if the match is unparsed;
 *              analyze whatever basic data is available.
 *   --raw      Also print the path to the full raw match JSON (for manually
 *              inspecting fields this script doesn't summarize).
 *
 * This is the fallback path for Claude Code when the bundled MCP server
 * (../../../mcp-server/server.js) isn't configured. Prefer the MCP tool
 * (`analyze_dota2_match`) when it's available — it works the same way and
 * also runs in clients that can't execute scripts, like claude.ai chat.
 */

const { analyzeMatch, AnalyzeError } = require('../../../lib/analyze');

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--player') args.player = argv[++i];
    else if (a === '--refresh') args.refresh = true;
    else if (a === '--no-wait') args.noWait = true;
    else if (a === '--raw') args.raw = true;
    else args._.push(a);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const matchId = args._[0];
  if (!matchId || !/^\d+$/.test(matchId)) {
    console.error('Usage: node analyze_match.js <match_id> [--player <account_id|name|hero>] [--refresh] [--no-wait] [--raw]');
    process.exit(1);
  }

  const summary = await analyzeMatch({
    matchId,
    player: args.player,
    refresh: args.refresh,
    noWait: args.noWait,
    raw: args.raw,
    onProgress: (msg) => process.stderr.write(msg + '\n'),
  });

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(err instanceof AnalyzeError && err.candidates ? 2 : 1);
});
