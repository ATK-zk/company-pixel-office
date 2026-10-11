# Autonomous Trading HQ

Live pixel headquarters for our 8-person Polymarket Perps trading desk (David, Rex, Lyra, Kai, Finn, Jay, Quinn, Sage).

**Live:** https://atk-zk.github.io/company-pixel-office/

## Design
- **Palette:** obsidian and graphite, champagne-gold trim, one cyan accent for tech, green/red used only for P&L.
- **Materials:** black marble with gold veining on the trading floor, walnut parquet in the Executive Bar and VIP Lounge, charcoal carpet in the War Room, perforated steel raised floor in the Server Vault. All of it is drawn procedurally at 2x resolution.
- **Lighting:** a real light map. Ambient light is multiplied over the scene, warm downlights and pendants are added on top, monitors and screens are emissive, there is soft bloom, and baked ambient-occlusion and contact shadows ground the furniture.
- **Depth:** a panoramic night-skyline window with parallax, a parallax blueprint grid around the building, a floating drop shadow and architectural frame marks.
- **Typography:** Chakra Petch (UI) and JetBrains Mono (numbers). English only.
- **Centrepiece:** the NET ASSET VALUE display shows the **real** Polymarket Perps account equity and day P&L from `status.json` (`net_value`), plus a LIVE / LAST SYNC state. All other screens (wall chart, desk monitors, war-room heatmap) are decorative animation with no labels.
- **People:** speech and thought bubbles are occasional and staggered. Usually one or two ambient bubbles show at once (never more than three, never the whole team), with start times staggered; each fades in, stays about 3.5–5 seconds, then fades out. A bubble also appears when you select someone.
- **Camera:** eased glide-to-fit intro, smooth slow wheel/pinch zoom, drag with inertia, click a teammate to focus. Keys: `+` / `-` zoom, `0` or `Esc` to reset.
- **Sound:** CC0 soundtrack. It starts silent and plays only after you tap the sound button (see MUSIC_CREDITS.md).

## Data
`status.json` is the only live input. The read-only equity sync job (`/workspace/office-sync/sync_equity.py`) refreshes it from the trading droplet.

Character sprites and some furniture sprites come from pixel-agents (MIT, see LICENSE-pixel-agents-MIT).

## Top bar: volume & all-time volume rank
Pulled live in the browser (CORS-open, public, no auth) every 2 min from
`https://api.perpetuals.polymarket.com/v1/info/leaderboard?window=all&sort_by=notional&limit=1&address=<acct>` —
the same data behind https://polymarket.com/leaderboard/perps/all/volume. `account.notional` = our all-time volume,
`account.rank` = our rank, `total` = number of ranked traders. Set our account (owner/EOA) address in
`status.json` → `leaderboard_account` (kept by the equity sync). Until it is set, VOLUME/RANK show "—" (no invented numbers).
