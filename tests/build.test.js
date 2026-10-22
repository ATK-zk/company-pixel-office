import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { bump, modulesIn, sha256 } from '../tools/bump.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const html = readFileSync(root + '3d.html', 'utf8');
const version = Number(html.match(/office3d\/boot\.js\?v=(\d+)/)[1]);
const mapText = html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1];
const csp = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]*)">/)[1];
const directive = name => (csp.split(';').map(s => s.trim()).find(s => s.startsWith(name + ' ')) || '').split(/\s+/).slice(1);
const jsFiles = dir => readdirSync(root + dir).filter(f => /\.m?js$/.test(f)).map(f => `${dir}/${f}`);

test('every module is versioned through the import map, with one version for boot.js, CSS and modules', () => {
  const imports = JSON.parse(mapText).imports;
  for (const m of modulesIn(root + 'office3d')) assert.equal(imports[`./office3d/${m}`], `./office3d/${m}?v=${version}`, m);
  assert.match(html, new RegExp(`office3d/office3d\\.css\\?v=${version}"`));
  assert.match(imports.three, /three@\d+\.\d+\.\d+\//, 'three.js is pinned to an exact version');
});

test('3d.html is exactly what `npm run bump` produces for its version (nothing edited by hand)', () => {
  assert.equal(bump(html, version, modulesIn(root + 'office3d')), html);
});

test('CSP: inline import map allowed only by its hash; network limited to the site and the provider API', () => {
  assert.ok(directive('script-src').includes(sha256(mapText)), 'import map hash matches');
  assert.deepEqual(directive('connect-src'), ["'self'", 'https://api.perpetuals.polymarket.com']);
  assert.deepEqual(directive('script-src').filter(s => !s.startsWith("'sha256-")), ["'self'", 'https://cdn.jsdelivr.net']);
  for (const bad of ["'unsafe-inline'", "'unsafe-eval'", '*']) assert.ok(!csp.includes(bad), `CSP must not contain ${bad}`);
  for (const d of ['default-src', 'object-src', 'base-uri', 'form-action']) assert.ok(directive(d).length, `${d} is set`);
});

test('all JavaScript parses', () => {
  for (const f of [...jsFiles('office3d'), ...jsFiles('tools'), 'office.js', 'music.js']) {
    const r = spawnSync(process.execPath, ['--check', root + f], { encoding: 'utf8' });
    assert.equal(r.status, 0, `${f}: ${r.stderr}`);
  }
});

test('3D code never injects HTML or evaluates strings', () => {
  for (const f of jsFiles('office3d')) {
    const src = readFileSync(root + f, 'utf8');
    for (const re of [/\.innerHTML\s*=/, /\.outerHTML\s*=/, /insertAdjacentHTML/, /\beval\(/, /new Function\(/, /document\.write/])
      assert.ok(!re.test(src), `${f} uses ${re}`);
  }
});

test('the 3D code only talks to known hosts and only with GET', () => {
  const allowed = ['https://api.perpetuals.polymarket.com/', 'https://github.com/ATK-zk/company-pixel-office/', 'https://cdn.jsdelivr.net/'];
  for (const f of jsFiles('office3d')) {
    const src = readFileSync(root + f, 'utf8');
    for (const url of src.match(/https?:\/\/[^\s'"`)]+/g) || []) assert.ok(allowed.some(a => url.startsWith(a)), `${f}: unexpected URL ${url}`);
    assert.ok(!/method\s*:\s*['"](POST|PUT|PATCH|DELETE)/i.test(src), `${f} sends a non-GET request`);
    assert.ok(!/sendBeacon|WebSocket\(|EventSource\(/.test(src), `${f} opens another channel`);
  }
});

test('no secrets in the repository files the site serves', () => {
  const files = ['3d.html', 'index.html', 'status.json', ...jsFiles('office3d'), ...readdirSync(root + 'config').map(f => 'config/' + f)];
  for (const f of files) {
    const src = readFileSync(root + f, 'utf8');
    for (const re of [/sk-[A-Za-z0-9]{20,}/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/, /\b0x[0-9a-fA-F]{64}\b/, /api[_-]?key\s*[:=]\s*['"][^'"]{8,}/i, /secret\s*[:=]\s*['"][^'"]{8,}/i])
      assert.ok(!re.test(src), `${f} matches ${re}`);
  }
});
