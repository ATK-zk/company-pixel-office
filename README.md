# Company Pixel Office — Black Gold Desk

Static pixel office for our trading team (8 people: David, Rex, Lyra, Kai, Finn, Jay, Quinn, Sage).
Layout like atk-zk/pixel-office; sprites & style from pixel-agents (MIT, see LICENSE-pixel-agents-MIT).
Luxury hi-tech hacker theme: dark glass panels, gold trim + neon, brass furniture plaques, server vault, reef tank. English only. No settings / no editor.

- Wall screen: small BTC-PERP candlestick screen (decorative animation).
- Centre board: NET VALUE = real Polymarket Perps account equity (`status.json` → `net_value`).
  Synced by a read-only job (one GET /v1/account/portfolio on the trading droplet) → pushed here when it changes (checked every 10 min, at least hourly).
- Speech bubbles: short playful lines per role/status, rotating every 5 s.
- Background music: CC0 cyberpunk/synthwave, see MUSIC_CREDITS.md. Toggle with 🔇/🎵.

Live: https://atk-zk.github.io/company-pixel-office/
