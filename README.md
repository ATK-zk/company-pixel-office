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
- **Centrepiece:** the NET ASSET VALUE display shows the **real** Polymarket Perps account equity and day P&L from `status.json` (`net_value`), plus a LIVE / LAST SYNC state. All other screens (wall chart, desk monitors, war-room heatmap) are decorative animation with no labels.
- **People:** six distinct pixel characters, one desk each. Name tags use each role's color. WORKING deskmates get a soft glow; IDLE deskmates get a little zzz. Click a character (or their roster row) for a card with role, duty, and current task. Speech and thought bubbles are occasional and staggered. Usually one or two ambient bubbles show at once (never more than three, never the whole desk), with start times staggered; each fades in, stays about 3.5–5 seconds, then fades out. Selecting someone also shows their current task.
- **Time of day:** the skyline, sun or moon, window lights, and the wash of light inside the north windows follow Asia/Bangkok local time (dawn, day, dusk, night). The Bangkok clock in the top bar names the phase.
- **Camera:** eased glide-to-fit intro, smooth slow wheel/pinch zoom, drag with inertia, click a deskmate to focus. Keys: `+` / `-` zoom, `0` or `Esc` to reset.
- **Sound:** CC0 soundtrack. It starts silent and plays only after you tap the sound button (see MUSIC_CREDITS.md).

## Data
`status.json` is the only live input. The read-only equity sync job (`/workspace/office-sync/sync_equity.py`) refreshes it from the trading droplet.

Character sprites and some furniture sprites come from pixel-agents (MIT, see LICENSE-pixel-agents-MIT).

## Top bar: volume & all-time volume rank
VOLUME and VOL RANK read the published snapshot in `status.json` → `leaderboard` (`volume_usd`, `rank`, `total`, `as_of`). The short account label stays in `leaderboard_account` (`0x80f8…8C3F`) and is shown with the rank. If a figure is missing, that slot stays "—". The page does not call the public leaderboard API. The equity sync must not write a full address into this repo.
