// Instanced workstations: desk, three monitors, keyboard and ergonomic chair.
// Parts sharing a material are merged into one geometry, then drawn as one InstancedMesh for every desk,
// so draw calls stay constant (one per material) however many desks the office holds.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

function materials() {
  const m = {
    desk: new THREE.MeshStandardMaterial({ color: 0x0b0c0e, roughness: 0.45, metalness: 0.2 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x1b1d22, roughness: 0.35, metalness: 0.75 }),
    bezel: new THREE.MeshStandardMaterial({ color: 0x050607, roughness: 0.4, metalness: 0.3 }),
    // Plain glow only: monitors show no data until Phase 4 wires labelled panels to them.
    screen: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x1d4a78, emissiveIntensity: 1.5, roughness: 0.25 }),
    chair: new THREE.MeshStandardMaterial({ color: 0x101114, roughness: 0.85, metalness: 0.05 }),
    keys: new THREE.MeshStandardMaterial({ color: 0x15171b, roughness: 0.6, metalness: 0.1 }),
  };
  m.screen.userData.noShadow = m.keys.userData.noShadow = true;
  return m;
}

const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _one = new THREE.Vector3(1, 1, 1);
function part(geo, mat, pos, rot = [0, 0, 0]) {
  return { geo, mat, local: new THREE.Matrix4().compose(new THREE.Vector3(...pos), _q.clone().setFromEuler(_e.set(...rot)), _one) };
}

// Local frame: desk centred on the origin, monitors on the -z edge facing +z, chair on the +z side.
function workstationParts(m) {
  const parts = [
    part(box(1.8, 0.05, 0.8), m.desk, [0, 0.74, 0]),
    part(box(0.45, 0.68, 0.72), m.desk, [0.6, 0.34, 0]),
    part(box(0.04, 0.7, 0.72), m.desk, [-0.86, 0.35, 0]),
    part(box(0.46, 0.016, 0.15), m.keys, [-0.05, 0.773, 0.14]),
    part(box(0.07, 0.012, 0.11), m.keys, [0.33, 0.772, 0.16]),
  ];
  for (const [x, z, ry] of [[-0.64, -0.17, 0.38], [0, -0.27, 0], [0.64, -0.17, -0.38]]) {
    const fx = Math.sin(ry), fz = Math.cos(ry);
    parts.push(part(box(0.6, 0.37, 0.03), m.bezel, [x, 1.12, z], [0, ry, 0]));
    parts.push(part(new THREE.PlaneGeometry(0.57, 0.335), m.screen, [x + fx * 0.017, 1.12, z + fz * 0.017], [0, ry, 0]));
    parts.push(part(box(0.035, 0.3, 0.035), m.metal, [x - fx * 0.03, 0.9, z - fz * 0.03]));
    parts.push(part(box(0.22, 0.012, 0.16), m.metal, [x - fx * 0.03, 0.771, z - fz * 0.03], [0, ry, 0]));
  }
  parts.push(
    part(box(0.52, 0.08, 0.5), m.chair, [0, 0.48, 0.8]),
    part(box(0.5, 0.62, 0.07), m.chair, [0, 0.86, 1.05], [-0.12, 0, 0]),
    part(box(0.26, 0.12, 0.06), m.chair, [0, 1.25, 1.1], [-0.12, 0, 0]),
    part(new THREE.CylinderGeometry(0.03, 0.03, 0.38, 8), m.metal, [0, 0.25, 0.8]),
    part(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 5), m.metal, [0, 0.06, 0.8]),
  );
  for (const sx of [-0.28, 0.28]) parts.push(part(box(0.04, 0.03, 0.34), m.chair, [sx, 0.66, 0.82]), part(box(0.03, 0.16, 0.03), m.metal, [sx, 0.57, 0.82]));
  return parts;
}

export function buildWorkstations(transforms, { shadows = true } = {}) {
  const m = materials(), byMat = new Map();
  for (const p of workstationParts(m)) {
    if (!byMat.has(p.mat)) byMat.set(p.mat, []);
    byMat.get(p.mat).push(p.geo.applyMatrix4(p.local));
  }
  const group = new THREE.Group(); group.name = 'workstations';
  const meshes = [], mtx = new THREE.Matrix4(), pos = new THREE.Vector3(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  for (const [mat, geos] of byMat) {
    const geo = mergeGeometries(geos); geos.forEach(g => g.dispose());
    const im = new THREE.InstancedMesh(geo, mat, transforms.length);
    transforms.forEach((t, i) => im.setMatrixAt(i, mtx.compose(pos.set(t.x, 0, t.z), q.setFromAxisAngle(up, t.rotY), _one)));
    im.castShadow = shadows && !mat.userData.noShadow; im.receiveShadow = shadows;
    im.computeBoundingSphere();
    group.add(im); meshes.push(im);
  }
  return { group, meshes };
}
