# Company Pixel Office — hacker edition

Static pixel office for our trading team (8 people: David, Rex, Lyra, Kai, Finn, Jay, Quinn, Sage).
Layout like atk-zk/pixel-office; sprites & style from pixel-agents (MIT, see LICENSE-pixel-agents-MIT).
Dark neon / hacker theme: server racks, neon signs, glowing monitors, scanlines. No settings / no editor.

- Top wall screen: **FAKE candlestick chart** (random-walk demo data, labelled "ข้อมูลจำลอง · FAKE DEMO DATA"). Not real prices.
- Centre LED board: **มูลค่าสุทธิ / NET VALUE** + day PnL, read from `status.json` → `net_value` `{usd, day_pnl_usd, note_th, note_en}`.
  Currently a placeholder ($430, not linked to a live account). Edit `status.json` and push to update.
- Status of each person comes from `status.json` → `team` (static snapshot).
- Background music: CC0 cyberpunk/synthwave, see MUSIC_CREDITS.md. Toggle with 🔇/🎵.

Live: https://atk-zk.github.io/company-pixel-office/
