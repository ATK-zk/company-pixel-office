// Seated, stylised people built from primitives — one per agent, at that agent's desk.
// Each person is five meshes (legs, torso, head, two arms) sharing one vertex-coloured material, so the
// whole cast costs ~30 draw calls. Pose comes from the agent's real state (status.js); only a fresh
// "running" state animates (typing), everything else holds a still pose so no activity is implied.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { STATES } from './status.js';

const Y = new THREE.Vector3(0, 1, 0);

function tint(geo, hex) {
  const c = new THREE.Color(hex), n = geo.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return geo;
}
function limb(from, to, r, hex) {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), dir = b.clone().sub(a), len = dir.length();
  const g = new THREE.CapsuleGeometry(r, Math.max(0.001, len - 2 * r), 4, 10);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(Y, dir.normalize()));
  g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  return tint(g, hex);
}
function ball(r, pos, hex, scale = [1, 1, 1]) { const g = new THREE.SphereGeometry(r, 16, 12); g.scale(...scale); g.translate(...pos); return tint(g, hex); }
function block(w, h, d, pos, hex) { const g = new THREE.BoxGeometry(w, h, d); g.translate(...pos); return tint(g, hex); }
const merged = list => { const g = mergeGeometries(list); list.forEach(x => x.dispose()); return g; };

// Local frame = the desk's frame: chair seat at (0, 0.52, 0.8), the person faces -z towards the monitors.
function buildPerson(look, material) {
  const { skin, hair, suit, shirt } = look, shoe = '#0a0a0b';
  const root = new THREE.Group();
  const legs = new THREE.Mesh(merged([
    limb([-0.1, 0.56, 0.86], [-0.11, 0.56, 0.45], 0.075, suit), limb([0.1, 0.56, 0.86], [0.11, 0.56, 0.45], 0.075, suit),
    limb([-0.11, 0.55, 0.45], [-0.12, 0.1, 0.42], 0.06, suit), limb([0.11, 0.55, 0.45], [0.12, 0.1, 0.42], 0.06, suit),
    block(0.1, 0.07, 0.24, [-0.12, 0.035, 0.36], shoe), block(0.1, 0.07, 0.24, [0.12, 0.035, 0.36], shoe),
  ]), material);
  const upper = new THREE.Group(); upper.position.set(0, 0.56, 0.86); // pivot at the hips
  const torso = new THREE.Mesh(merged([
    limb([0, 0.08, 0], [0, 0.46, 0], 0.17, suit),
    block(0.12, 0.2, 0.03, [0, 0.4, -0.155], shirt),
    limb([0, 0.48, -0.01], [0, 0.6, -0.02], 0.05, skin),
  ]), material);
  torso.scale.set(1.12, 1, 0.85);
  const head = new THREE.Group(); head.position.set(0, 0.6, -0.02);
  const hairParts = [ball(0.117, [0, 0.14, 0.015], hair, [1, 0.8, 1.05])];
  if (look.hair_style === 'bun') hairParts.push(ball(0.06, [0, 0.17, 0.12], hair));
  if (look.hair_style === 'long') hairParts.push(block(0.21, 0.24, 0.07, [0, 0.03, 0.08], hair));
  head.add(new THREE.Mesh(merged([ball(0.11, [0, 0.11, 0], skin, [0.92, 1.05, 1]), ...hairParts]), material));
  const arms = [-1, 1].map(s => {
    const g = new THREE.Group(); g.position.set(s * 0.21, 0.44, 0);
    g.add(new THREE.Mesh(merged([
      limb([0, 0, 0], [s * 0.04, -0.24, -0.1], 0.055, suit),
      limb([s * 0.04, -0.24, -0.1], [-s * 0.04, -0.21, -0.48], 0.045, suit),
      ball(0.045, [-s * 0.04, -0.21, -0.5], skin),
    ]), material));
    return g;
  });
  upper.add(torso, head, ...arms);
  root.add(legs, upper);
  return { root, upper, head, arms };
}

// Still poses per state. `typing` adds a small oscillation on top (see animate).
const POSES = {
  typing: { lean: 0.08, arms: 0, headX: 0.12, headY: 0 },
  focus: { lean: 0.05, arms: 0, headX: 0.1, headY: 0 },
  rest: { lean: -0.14, arms: -0.8, headX: -0.02, headY: 0.22 },
  slump: { lean: 0.22, arms: -0.85, headX: 0.45, headY: 0 },
};
function poseFor(s) {
  if (s.state === 'disabled') return 'slump';
  if (s.state === 'running') return s.animate ? 'typing' : 'focus';
  return 'rest';
}

export function buildAgents(cfg, agentsCfg, { shadows = true, reducedMotion = false } = {}) {
  const group = new THREE.Group(); group.name = 'agents';
  const people = new Map(), meshes = [];
  const ringGeo = new THREE.RingGeometry(0.55, 0.68, 40); ringGeo.rotateX(-Math.PI / 2);
  for (const d of cfg.departments) {
    const meta = agentsCfg.agents[d.agent];
    const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, metalness: 0.05, transparent: true });
    const p = buildPerson(meta.look, material);
    p.root.position.set(d.seat[0], 0, d.seat[1]); p.root.rotation.y = d.seat[2] || 0;
    p.root.traverse(o => { if (o.isMesh) { o.castShadow = shadows; o.receiveShadow = shadows; o.userData.agentId = d.agent; meshes.push(o); } });
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
    ring.position.set(0, 0.015, 0.8); p.root.add(ring);
    group.add(p.root);
    people.set(d.agent, { ...p, material, ring, pose: 'rest', status: null, selected: false, dim: false, phase: Math.random() * 6 });
  }

  function applyPose(p) {
    const k = POSES[p.pose];
    p.upper.rotation.x = k.lean; p.head.rotation.set(k.headX, k.headY, 0);
    for (const a of p.arms) a.rotation.set(k.arms, 0, 0);
  }
  function refreshLook(p) {
    const s = p.status;
    p.material.color.setScalar(s && s.state === 'disabled' ? 0.4 : 1);
    // transparent stays on permanently: toggling it would recompile the shader and stall a frame
    p.material.opacity = p.dim ? 0.18 : 1; p.material.depthWrite = !p.dim;
    // floor ring: lime when selected, otherwise only for states that need attention
    const warn = s && (s.state === 'error' || s.state === 'degraded' || s.state === 'unknown');
    if (p.selected) { p.ring.material.color.set('#c6ff3d'); p.ring.material.opacity = 0.9; }
    else if (warn) { p.ring.material.color.set(STATES[s.state].color); p.ring.material.opacity = p.dim ? 0.15 : 0.7; }
    else p.ring.material.opacity = 0;
  }
  for (const p of people.values()) applyPose(p);

  return {
    group, meshes,
    setStatus(id, s) { const p = people.get(id); if (!p) return; p.status = s; p.pose = poseFor(s); applyPose(p); refreshLook(p); },
    setSelected(id) { for (const [k, p] of people) { p.selected = k === id; refreshLook(p); } },
    setDim(id, dim) { const p = people.get(id); if (p && p.dim !== dim) { p.dim = dim; refreshLook(p); } },
    // Returns true while anyone is animating (the caller keeps rendering only then).
    animate(t) {
      if (reducedMotion) return false;
      let any = false;
      for (const p of people.values()) {
        if (p.pose !== 'typing') continue;
        any = true;
        const k = POSES.typing, w = t * 13 + p.phase;
        p.arms[0].rotation.x = k.arms + 0.05 * Math.max(0, Math.sin(w));
        p.arms[1].rotation.x = k.arms + 0.05 * Math.max(0, Math.sin(w + 2.1));
        p.head.rotation.y = 0.16 * Math.sin(t * 0.35 + p.phase);
        p.upper.rotation.x = k.lean + 0.01 * Math.sin(t * 1.3 + p.phase);
      }
      return any;
    },
    seatOf(id) { const d = cfg.departments.find(x => x.agent === id); return d ? { x: d.seat[0], z: d.seat[1] } : null; },
  };
}
