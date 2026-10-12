# Autonomous Trading HQ

Live pixel headquarters for our 6-person Polymarket Perps trading desk.

| Name | Role | What they do |
|---|---|---|
| Desk Lead | Team lead | The only one who talks to the CEO |
| Quant | Strategy & engine | Writes and deploys strategy and engine code |
| Critic | Code review | Reviews code and approves file hashes |
| Risk Watch | Health & loss cap | Monitors health checks and the 15% daily loss cap |
| Scout | Trading ideas | Finds trading ideas |
| Ops | Ledger & reports | Ledger, the daily 07:30 report, and expected vs actual |

**Live:** https://atk-zk.github.io/company-pixel-office/

GitHub Pages deploys from `main`. Merging to `main` publishes the site.

## Design
- **Palette:** obsidian and graphite, champagne-gold trim, one cyan accent for tech, green/red used only for P&L.
- **Materials:** black marble with gold veining on the trading floor, walnut parquet in the Executive Bar and VIP Lounge, charcoal carpet in the War Room, perforated steel raised floor in the Server Vault. All of it is drawn procedurally at 2x resolution.
- **Lighting:** a real light map. Ambient light is multiplied over the scene, warm downlights and pendants are added on top, monitors and screens are emissive, there is soft bloom, and baked ambient-occlusion and contact shadows ground the furniture.
- **Depth:** a panoramic night-skyline window with parallax, a parallax blueprint grid around the building, a floating drop shadow and architectural frame marks.
- **Typography:** Chakra Petch (UI) and JetBrains Mono (numbers). English only.
- **Centrepiece:** the NET ASSET VALUE display shows live Polymarket Perps equity from the public portfolio endpoint, with day P&L still read from `status.json` (`net_value`). A LIVE mark and an equity time show while that request is succeeding; if it fails, the figure falls back to `status.json` and the mark switches to LAST SYNC. All other screens (wall chart, desk monitors, war-room heatmap) are decorative animation with no labels.
- **People:** six distinct pixel characters, one desk each. Name tags use each role's color. WORKING deskmates get a soft glow; IDLE deskmates get a little zzz. Click a character (or their roster row) for a card with role, duty, and current task. Speech and thought bubbles are occasional and staggered. Usually one or two ambient bubbles show at once (never more than three, never the whole desk), with start times staggered; each fades in, stays about 3.5–5 seconds, then fades out. Selecting someone also shows their current task.
- **Time of day:** the skyline, sun or moon, window lights, and the wash of light inside the north windows follow Asia/Bangkok local time (dawn, day, dusk, night). The Bangkok clock in the top bar names the phase.
- **Camera:** eased glide-to-fit intro, smooth slow wheel/pinch zoom, drag with inertia, click a deskmate to focus. Keys: `+` / `-` zoom, `0` or `Esc` to reset.
- **Sound:** CC0 soundtrack. It starts silent and plays only after you tap the sound button (see MUSIC_CREDITS.md).

## Data
Team status, day P&L, and the fallback equity still come from `status.json`. The top-bar equity itself is read in the browser from the public perps portfolio (below), not from a private key or a server-side sync.

## Top bar: live equity
Pulled in the browser (CORS-open, public, no auth) every 20s from
`https://api.perpetuals.polymarket.com/v1/info/portfolio?address=<acct>`.
`equity` is the account equity in USD and `timestamp` is the last-updated time, shown in Bangkok time next to EQUITY SYNC. The address is `status.json` → `leaderboard_account`, the same full address the volume rank uses. If the request fails or the address is not a full 40-hex address, NAV falls back to `status.json` → `net_value` and the mark reads LAST SYNC.

Character sprites and some furniture sprites come from pixel-agents (MIT, see LICENSE-pixel-agents-MIT).

## Top bar: volume & all-time volume rank
Pulled live in the browser (CORS-open, public, no auth) every 2 min from
`https://api.perpetuals.polymarket.com/v1/info/leaderboard?window=all&sort_by=notional&limit=1&address=<acct>` —
the same data behind https://polymarket.com/leaderboard/perps/all/volume. `account.notional` = our all-time volume,
`account.rank` = our rank, `total` = number of ranked traders. Set our account (owner/EOA) address in
`status.json` → `leaderboard_account` (kept by the equity sync). Until it is set, VOLUME/RANK show "—" (no invented numbers).
The visible rank label stays shortened (`0x80f8…8C3F`); the lookup uses the full address.
