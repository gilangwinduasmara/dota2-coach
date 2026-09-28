---
name: dota2-coach
description: Analyze a Dota 2 match by match ID and produce a personalized coaching report (laning, farming, deaths, itemization, objectives, teamfights, benchmark percentiles). Use when the user gives a Dota 2 match ID or link and asks for analysis, a review, feedback, or coaching on that match.
---

# Dota 2 Match Coach

Turns a raw Dota 2 match ID into a coaching report by pulling match data from the
[OpenDota API](https://docs.opendota.com/) and reasoning over it.

This plugin registers a remote MCP tool, `analyze_dota2_match`, backed by a
server deployed at `dota2-coach.promager.com` (source:
[dota2-coach-mcp-server](https://github.com/gilangwinduasmara/dota2-coach-mcp-server)).
Installing the plugin wires this up automatically in `.claude-plugin/plugin.json`,
no local process, no setup, works the same in Claude Code, Claude Desktop, and
claude.ai chat.

## Workflow

1. **Get the match ID** (and, if the user wants feedback on a specific player rather
   than a general match recap, their in-game name, Steam name, or the hero they
   played). Match IDs are the numeric id from the post-game screen, or from a
   Dotabuff/OpenDota/Stratz URL like `.../matches/7891234567`.

2. **Call `analyze_dota2_match`** with `match_id` and, when relevant, `player`:

   - Always pass a player filter (`player`) when the user is asking about their
     own performance ("how did I do", "review my game", a specific name) so you
     get the deep-dive section (lane efficiency, deaths log, item timing,
     gold/xp/last-hit timelines). Without it you only get the general 10-player
     summary.
   - If the player filter is ambiguous or matches nobody, the call errors and
     lists the actual participant names/heroes. Retry with a more specific
     value (account_id is always unambiguous) or ask the user to clarify.
   - First run for a given match can take up to ~1-2 minutes: if OpenDota hasn't
     seen the match yet it fetches it from Steam, and if it has no detailed parse
     yet it requests one and polls until it's ready. Results are cached
     server-side (on match id), so re-running (e.g. with a different player
     filter) is instant.
   - If the match truly can't be found (bad ID, private/bot lobby, or a replay too
     old to still be parseable), the call errors out with an explanation. Surface
     that to the user rather than guessing.
   - Use `refresh: true` to bypass the cache (e.g. user says the match was
     reparsed).

3. **Read the JSON summary** and write the coaching report yourself. It only
   extracts and translates data (hero/item names, timestamps, percentiles); it
   does not generate any advice. Ground every claim in the JSON's actual
   numbers, don't invent stats.

## Interpreting the data

- `benchmark_percentiles_in_bracket` (0-100) compares that player's per-minute
  stats to others in the *same rank bracket* on the *same hero*. <35 is a real
  weakness worth flagging, >65 is a genuine strength. Don't over-index on a
  single metric, e.g. low `hero_healing_per_min` is meaningless for a hero with
  no healing.
- `lane_efficiency_pct` is last-hit/deny gold+xp efficiency during laning stage;
  under ~50% usually signals a rough lane.
- `focal_player_deep_dive.deaths_log`: look for deaths clustered early (bad lane
  trades), deaths with high `gold_lost` and long `seconds_dead` late game (poor
  buyback/positioning discipline), or repeated deaths to the same hero (a lane or
  matchup being lost repeatedly).
- `focal_player_deep_dive.gold_timeline` / `xp_timeline` / `net_worth_timeline`
  are 5-minute samples; compare their slope across the game (falling behind vs.
  scaling up) rather than just the final number.
- `item_purchase_timeline` vs. `boots_purchase_time`: slow core items or boots
  after 10 minutes is usually worth a note for a farming-priority hero.
- `objectives_timeline` and `teamfights` give the game's narrative arc (who got
  first blood, when towers fell, gold swings per fight); use these to explain
  *why* a game was won/lost, not just list them.
- `parsed_detail_available: false` (rare, only when a parse request timed out or
  the replay is gone) means only final KDA/GPM/XPM/benchmarks exist. Say so
  explicitly instead of fabricating laning/teamfight detail.
- `players[].rank_medal`: the player's actual rank (e.g. "Divine 5"); use it to
  calibrate tone, not to gate advice (benchmarks already control for bracket).
  `null` means the profile hides rank; don't guess one.
- `focal_player_deep_dive.skill_build`: the level-up order of abilities. Check
  whether they maxed their point-click/farming skill or their teamfight skill
  first given the hero's role, and whether the ultimate came online at 6/12/18
  or got delayed for stat points/a different skill.
- `focal_player_deep_dive.damage_sources`: hero damage broken down by
  ability/item, sorted by share of total. Tells you whether damage came from
  their core combo, a single overused ability, or mostly basic attacks
  ("Basic attacks / other"), relevant for judging whether they're using their
  kit or just right-clicking.
- `focal_player_deep_dive.ability_cast_counts` / `item_activation_counts`: raw
  activation counts for abilities/active items actually used. **A missing key
  means an ability/item was never cast, but for items this only tells you
  about active items** (things with a use/target action, like Blink Dagger or
  BKB); purely passive items (e.g. Vanguard, most stat sticks) never appear
  here at all, so don't read their absence as "unused." Only flag an item as
  underused if it's genuinely active and either missing or has a
  suspiciously low count for a full game.
- `focal_player_deep_dive.rune_control`: bounty/power rune pickups by time.
  Sparse or late bounty rune pickups (spawn every few minutes) can signal weak
  map movement/farm efficiency; frequent power rune control mid-game is a good
  tempo signal.
- `comeback_gold`: the winning team's largest gold deficit before they turned
  the game around (per OpenDota's own field description); worth a mention if
  it's large relative to the game's overall gold swings. `stomp_gold` is the
  mirror image (the winning team's biggest lead); OpenDota doesn't formally
  document this one, so treat it as directional color, not a precise stat.

## Report structure

Unless the user asks for something narrower, structure the coaching report as:

1. **Match overview**: result, duration, hero, role/lane, patch, rank.
2. **Performance vs. bracket**: call out the 2-3 strongest and 2-3 weakest
   benchmark percentiles, in plain language.
3. **Laning phase**: lane efficiency, first blood/early deaths, how the lane
   was won or lost.
4. **Mid/late game**: farm pattern (gold/xp timeline trend), itemization
   timing, skill build, damage sources, rune control, teamfight participation,
   death pattern.
5. **Objectives & map impact**: towers/Roshan/wards relative to their role.
6. **3-5 concrete takeaways** for the next game, specific and actionable
   ("ward the off-lane pull camp before 3:00", not "play better vision").

Keep it honest and specific: cite the actual numbers from the JSON (e.g. "38%
lane efficiency, well below the ~55% you'd want as offlane") rather than vague
praise or criticism.

## Full-match rating tables (all 10 heroes)

Use this format instead of the narrative structure above when the user asks
for a scorecard across the whole match, rating every hero's performance
and/or itemization, rather than a deep-dive on one player. No `player`
filter is needed for this: `players[]` already has every participant's
items, KDA, GPM/XPM, benchmark percentiles, and damage regardless of focus.

Produce one or both tables depending on what was asked:

**Performance ratings**

| Hero | Rating | Notes |
| --- | --- | --- |
| Huskar | 6.5/10 | ... |

**Itemization ratings**

| Hero | Rating | Item notes |
| --- | --- | --- |
| Huskar | 6.5/10 | ... |

Scoring guidance (keep both tables consistent with this so ratings are
comparable across heroes and across reports):

- **~8-10**: multiple strong (>65) benchmark percentiles, deaths in line with
  role/game length, itemization fits the matchup.
- **~6-7.5**: solid overall with one clear gap (e.g. good damage but a
  missing survivability item given a high death count).
- **~4-5.5**: below expectation for the rank/role: weak percentiles, a build
  that didn't fit how the game played out, or a death count that outpaces the
  itemization's payoff (e.g. a costly damage item on a hero who died before
  using it much).
- **<4**: build or performance actively worked against the team (e.g. a
  situational item that never helps because nothing here counters it).

For **performance** notes, ground the score in the same signals as the
narrative report: benchmark percentiles, KDA, deaths vs. game length,
hero/tower damage, objective and teamfight participation. Cite at least one
concrete number per hero.

For **itemization** notes, judge the *build*, not the outcome: whether the
items make sense for the hero's role, the game's pace, and (this is the part
the JSON can't tell you) how it interacts with the other 9 players' items.
Cross-reference `players[].items` across **both** teams using your own Dota 2
knowledge: evasion items (Butterfly, Talisman) are devalued when enemies
carry true-strike (MKB and equivalents); BKB matters more against heavy
disable/burst lineups and less against pure true-strike/magic-immunity-piercing
threats; a core damage item bought late or on a hero with a high death count
often means it never paid for itself. When `focal_player_deep_dive` is
available for one of the rows (i.e. you also ran the deep dive on that
player), use its `item_purchase_timeline`/timing for a more precise note
("Blink 15:57, Blade Mail 24:45..."); for the other 9 heroes you only have
final inventory, so reason from that plus deaths/damage rather than inventing
timings you don't have.

Match the user's language and terseness in the notes: the goal is a quick
scorecard, not a paragraph per hero.

## Notes

- No API key is needed; OpenDota's public API is free and rate-limited per IP.
- The fetch/cache/summarize logic and its own deployment/setup instructions
  live in the separate [dota2-coach-mcp-server](https://github.com/gilangwinduasmara/dota2-coach-mcp-server)
  repo, not in this plugin repo. This plugin only knows the server's URL.
- If `analyze_dota2_match` ever fails to connect (server down, DNS issue),
  say so plainly rather than guessing at match data from general knowledge.
- This only covers standard match analysis (any public match ID). It does not
  cover pulling a player's full match history, live/in-progress games, or pro
  league data; those would need different OpenDota endpoints
  (`/players/{id}/matches`, `/live`, `/leagues`) not implemented here.
