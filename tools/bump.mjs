// Sets the asset version of 3d.html in one go (no build step needed):
//   - every office3d/*.js module gets "?v=N" through the import map, so browsers never mix old and new modules
//   - boot.js and office3d.css get the same "?v=N"
//   - the Content-Security-Policy hash of the inline import map is recomputed
// Usage: node tools/bump.mjs [N]   (no N → current version + 1)
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const THREE = '0.170.0';
export const CSP_BASE = [
  "default-src 'self'",
  "script-src 'self' https://cdn.jsdelivr.net %HASH%",
  "connect-src 'self' https://api.perpetuals.polymarket.com",
  "img-src 'self' data: blob:",
  "style-src 'self'",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
];

export function importMapText(version, modules) {
  const imports = {
    three: `https://cdn.jsdelivr.net/npm/three@${THREE}/build/three.module.js`,
    'three/addons/': `https://cdn.jsdelivr.net/npm/three@${THREE}/examples/jsm/`,
  };
  for (const m of modules) imports[`./office3d/${m}`] = `./office3d/${m}?v=${version}`;
  return '\n' + JSON.stringify({ imports }, null, 2) + '\n';
}
export const sha256 = text => "'sha256-" + createHash('sha256').update(text, 'utf8').digest('base64') + "'";
export const modulesIn = dir => readdirSync(dir).filter(f => f.endsWith('.js') && f !== 'boot.js').sort();

export function bump(html, version, modules) {
  const map = importMapText(version, modules);
  const csp = CSP_BASE.join('; ').replace('%HASH%', sha256(map));
  return html
    .replace(/<script type="importmap">[\s\S]*?<\/script>/, `<script type="importmap">${map}</script>`)
    .replace(/<meta http-equiv="Content-Security-Policy" content="[^"]*">/, `<meta http-equiv="Content-Security-Policy" content="${csp}">`)
    .replace(/office3d\/boot\.js\?v=\d+/, `office3d/boot.js?v=${version}`)
    .replace(/office3d\/office3d\.css\?v=\d+/, `office3d/office3d.css?v=${version}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const file = root + '3d.html', html = readFileSync(file, 'utf8');
  const current = Number((html.match(/boot\.js\?v=(\d+)/) || [])[1] || 0);
  const version = Number(process.argv[2]) || current + 1;
  if (!/http-equiv="Content-Security-Policy"/.test(html)) throw new Error('3d.html has no CSP meta tag to update');
  writeFileSync(file, bump(html, version, modulesIn(root + 'office3d')));
  console.log(`3d.html → v${version}`);
}
