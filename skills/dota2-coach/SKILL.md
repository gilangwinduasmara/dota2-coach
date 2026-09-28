---
name: dota2-coach
description: Analyze a Dota 2 match by match ID and produce a personalized coaching report (laning, farming, deaths, itemization, objectives, teamfights, benchmark percentiles). Use when the user gives a Dota 2 match ID or link and asks for analysis, a review, feedback, or coaching on that match.
---

# Dota 2 Match Coach

Turns a raw Dota 2 match ID into a coaching report by pulling match data from the
[OpenDota API](https://docs.opendota.com/) and reasoning over it.

This plugin bundles an MCP server (`mcp-server/`) that exposes the exact same
analysis as a tool, `analyze_dota2_match`. **If that tool is available in this
conversation, use it instead of the script below** — same data, same JSON shape,
but it works in any MCP-capable client (Claude Desktop, claude.ai chat via a
custom connector), not just Claude Code. The script workflow below is the
fallback for Claude Code sessions where the MCP server isn't configured.

## Workflow

1. **Get the match ID** (and, if the user wants feedback on a specific player rather
   than a general match recap, their in-game name, Steam name, or the hero they
   played). Match IDs are the numeric id from the post-game screen, or from a
   Dotabuff/OpenDota/Stratz URL like `.../matches/7891234567`.

2. **Get the analysis**, preferring the MCP tool over the script:

   - **MCP tool available:** call `analyze_dota2_match` with `match_id` and,
     when relevant, `player` (see below for when to pass it).
   - **No MCP tool (Claude Code fallback):** run the analysis script from this
     skill's directory:

     ```
     node scripts/analyze_match.js <match_id> [--player <name_or_account_id>]
     ```

   Both paths accept the same inputs and produce the same JSON:

   - Always pass a player filter (`player` / `--player`) when the user is asking
     about their own performance ("how did I do", "review my game", a specific
     name) so you get the deep-dive section (lane efficiency, deaths log, item
     timing, gold/xp/last-hit timelines). Without it you only get the general
     10-player summary.
   - If the player filter is ambiguous or matches nobody, the call errors and
     lists the actual participant names/heroes — retry with a more specific
     value (account_id is always unambiguous) or ask the user to clarify.
   - First run for a given match can take up to ~1-2 minutes: if OpenDota hasn't
     seen the match yet it fetches it from Steam, and if it has no detailed parse
     yet it requests one and polls until it's ready. Results are cached (on
     match id), so re-running (e.g. with a different player filter) is instant.
   - If the match truly can't be found (bad ID, private/bot lobby, or a replay too
     old to still be parseable), the call errors out with an explanation — surface
     that to the user rather than guessing.
   - Use `refresh` / `--refresh` to bypass the cache (e.g. user says the match was
     reparsed).

3. **Read the JSON summary** and write the coaching report yourself — it only
   extracts and translates data (hero/item names, timestamps, percentiles); it
   does not generate any advice. Ground every claim in the JSON's actual
   numbers, don't invent stats.

## Interpreting the data

- `benchmark_percentiles_in_bracket` (0-100) compares that player's per-minute
  stats to others in the *same rank bracket* on the *same hero*. <35 is a real
  weakness worth flagging, >65 is a genuine strength. Don't over-index on a
  single metric — e.g. low `hero_healing_per_min` is meaningless for a hero with
  no healing.
- `lane_efficiency_pct` is last-hit/deny gold+xp efficiency during laning stage;
  under ~50% usually signals a rough lane.
- `focal_player_deep_dive.deaths_log` — look for deaths clustered early (bad lane
  trades), deaths with high `gold_lost` and long `seconds_dead` late game (poor
  buyback/positioning discipline), or repeated deaths to the same hero (a lane or
  matchup being lost repeatedly).
- `focal_player_deep_dive.gold_timeline` / `xp_timeline` / `net_worth_timeline`
  are 5-minute samples — compare their slope across the game (falling behind vs.
  scaling up) rather than just the final number.
- `item_purchase_timeline` vs. `boots_purchase_time` — slow core items or boots
  after 10 minutes is usually worth a note for a farming-priority hero.
- `objectives_timeline` and `teamfights` give the game's narrative arc (who got
  first blood, when towers fell, gold swings per fight) — use these to explain
  *why* a game was won/lost, not just list them.
- `parsed_detail_available: false` (rare — only when a parse request timed out or
  the replay is gone) means only final KDA/GPM/XPM/benchmarks exist. Say so
  explicitly instead of fabricating laning/teamfight detail.

## Report structure

Unless the user asks for something narrower, structure the coaching report as:

1. **Match overview** — result, duration, hero, role/lane, patch.
2. **Performance vs. bracket** — call out the 2-3 strongest and 2-3 weakest
   benchmark percentiles, in plain language.
3. **Laning phase** — lane efficiency, first blood/early deaths, how the lane
   was won or lost.
4. **Mid/late game** — farm pattern (gold/xp timeline trend), itemization
   timing, teamfight participation, death pattern.
5. **Objectives & map impact** — towers/Roshan/wards relative to their role.
6. **3-5 concrete takeaways** for the next game — specific and actionable
   ("ward the off-lane pull camp before 3:00", not "play better vision").

Keep it honest and specific — cite the actual numbers from the JSON (e.g. "38%
lane efficiency, well below the ~55% you'd want as offlane") rather than vague
praise or criticism.

## Notes

- No API key is needed; OpenDota's public API is free and rate-limited per IP.
- The fetch/cache/summarize logic lives in `../../lib/` (shared by the script
  and the MCP server) — see `../../mcp-server/README.md` for how the MCP
  server is set up and how to run it outside Claude Code.
- `lib/constants.js` caches hero/item/game-mode lookups for 14 days — safe to
  delete the cache dir anytime to force a refresh.
- This only covers standard match analysis (any public match ID). It does not
  cover pulling a player's full match history, live/in-progress games, or pro
  league data — those would need different OpenDota endpoints
  (`/players/{id}/matches`, `/live`, `/leagues`) not implemented here.
