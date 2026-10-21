// Office shell: back wall with a night-skyline window band, solid west wall with accent light strips,
// glass enclosures (meeting room, partitions). The south and east sides stay open — a cutaway, so the
// isometric camera always sees in. Geometry is merged per material to keep draw calls low.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Box of length `len` along the segment (x0,z0)→(x1,z1), centred on it, from y to y+h.
function along(x0, z0, x1, z1, y, h, thick, extra = 0) {
  const len = Math.hypot(x1 - x0, z1 - z0) + extra, g = new THREE.BoxGeometry(len, h, thick);
  g.rotateY(Math.atan2(-(z1 - z0), x1 - x0)); g.translate((x0 + x1) / 2, y + h / 2, (z0 + z1) / 2);
  return g;
}
function pane(x0, z0, x1, z1, h) {
  const g = new THREE.PlaneGeometry(Math.hypot(x1 - x0, z1 - z0), h);
  g.rotateY(Math.atan2(-(z1 - z0), x1 - x0)); g.translate((x0 + x1) / 2, h / 2, (z0 + z1) / 2);
  return g;
}

function skylineTexture(renderer) {
  const W = 2048, H = 256, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#05070d'); sky.addColorStop(0.7, '#141327'); sky.addColorStop(1, '#22182c');
  g.fillStyle = sky; g.fillRect(0, 0, W, H);
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (const [layer, shade, lit] of [[0, '#0b0e17', 0.12], [1, '#06080d', 0.22]]) {
    for (let x = -20; x < W;) {
      const bw = 30 + rnd() * 70, bh = (layer ? 70 : 110) + rnd() * (layer ? 120 : 110);
      g.fillStyle = shade; g.fillRect(x, H - bh, bw, bh);
      for (let wy = H - bh + 6; wy < H - 4; wy += 7) for (let wx = x + 4; wx < x + bw - 4; wx += 6)
        if (rnd() < lit) { g.fillStyle = rnd() < 0.7 ? 'rgba(255,205,130,.85)' : 'rgba(150,210,255,.8)'; g.fillRect(wx, wy, 2.5, 3.5); }
      x += bw + rnd() * 8;
    }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return t;
}

// Glass box around a rect with an opening centred on one side. Returns geometry lists, not meshes.
export function enclosureGeometries(rect, { height, door, doorWidth }) {
  const [x0, z0, x1, z1] = rect, panes = [], frames = [];
  const sides = { north: [x0, z0, x1, z0], south: [x0, z1, x1, z1], west: [x0, z0, x0, z1], east: [x1, z0, x1, z1] };
  for (const [name, [ax, az, bx, bz]] of Object.entries(sides)) {
    const segs = [];
    if (name === door) {
      const len = Math.hypot(bx - ax, bz - az), cut = (len - doorWidth) / 2 / len;
      segs.push([ax, az, ax + (bx - ax) * cut, az + (bz - az) * cut], [bx - (bx - ax) * cut, bz - (bz - az) * cut, bx, bz]);
    } else segs.push([ax, az, bx, bz]);
    for (const [sx, sz, ex, ez] of segs) {
      const len = Math.hypot(ex - sx, ez - sz); if (len < 0.05) continue;
      panes.push(pane(sx, sz, ex, ez, height));
      frames.push(along(sx, sz, ex, ez, height - 0.05, 0.05, 0.06, 0.06), along(sx, sz, ex, ez, 0, 0.06, 0.06, 0.06));
      const n = Math.max(1, Math.round(len / 2));
      for (let k = 0; k <= n; k++) { const t = k / n, px = sx + (ex - sx) * t, pz = sz + (ez - sz) * t; frames.push(along(px, pz, px + 0.001, pz, 0, height, 0.05, 0.05)); }
    }
  }
  return { panes, frames };
}

export function buildArchitecture(cfg, renderer, { shadows }) {
  const { width: W, depth: D } = cfg.office, H = cfg.office.wall_height || 4, x0 = -W / 2, x1 = W / 2, z0 = -D / 2, z1 = D / 2;
  const group = new THREE.Group(); group.name = 'architecture';
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x0f1114, roughness: 0.75, metalness: 0.1 });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x08090b, roughness: 0.4, metalness: 0.7 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x9fc7d8, roughness: 0.05, metalness: 0.9, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide });
  const accentMat = new THREE.MeshBasicMaterial({ color: 0xffd27a, toneMapped: false });
  const T = 0.25, walls = [], frames = [], panes = [];

  // back wall: window band over the open floor, solid behind the rooms (their summary screens hang there)
  const solidFrom = Math.min(...(cfg.rooms || []).map(r => r.rect[0]), x1);
  const winY0 = 0.9, winY1 = H - 0.5;
  walls.push(along(x0, z0 - T / 2, solidFrom, z0 - T / 2, 0, winY0, T), along(x0, z0 - T / 2, solidFrom, z0 - T / 2, winY1, H - winY1, T));
  if (solidFrom < x1) walls.push(along(solidFrom, z0 - T / 2, x1, z0 - T / 2, 0, H, T));
  const n = Math.round((solidFrom - x0) / 2.2);
  for (let k = 0; k <= n; k++) { const x = x0 + (solidFrom - x0) * k / n; frames.push(along(x - 0.05, z0 - 0.02, x + 0.05, z0 - 0.02, winY0, winY1 - winY0, 0.08)); }
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(solidFrom - x0, winY1 - winY0), new THREE.MeshBasicMaterial({ map: skylineTexture(renderer), color: 0xb0b0b0 }));
  sky.position.set((x0 + solidFrom) / 2, (winY0 + winY1) / 2, z0 - T / 2); group.add(sky);

  // west wall with vertical accent strips (the warm uprights in the reference)
  walls.push(along(x0 - T / 2, z0 - T, x0 - T / 2, z1, 0, H, T));
  const strips = [];
  for (let z = z0 + 4; z < z1; z += 8) strips.push(along(x0 + 0.01, z - 0.06, x0 + 0.01, z + 0.06, 0.4, H - 0.9, 0.03));

  // meeting rooms and partitions
  for (const rm of cfg.rooms || []) {
    const e = enclosureGeometries(rm.rect, { height: H - 0.6, door: rm.door, doorWidth: rm.door_width || 2 });
    panes.push(...e.panes); frames.push(...e.frames);
  }
  for (const d of cfg.departments) if (d.partition) {
    const e = enclosureGeometries(d.rect, { height: d.partition.height, door: d.partition.door, doorWidth: d.partition.door_width });
    panes.push(...e.panes); frames.push(...e.frames);
  }

  const add = (geos, mat, cast) => { if (!geos.length) return; const mesh = new THREE.Mesh(mergeGeometries(geos), mat); geos.forEach(g => g.dispose()); mesh.castShadow = shadows && cast; mesh.receiveShadow = shadows; group.add(mesh); };
  add(walls, wallMat, true); add(frames, frameMat, true); add(strips, accentMat, false); add(panes, glassMat, false);
  return group;
}
