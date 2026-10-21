// Instanced furniture kits. A kit is a list of parts (geometry + material + local transform); parts sharing a
// material are merged into one geometry and drawn as one InstancedMesh for every placement of the kit,
// so draw calls stay constant (one per material per kit) however many desks, chairs or plants the office holds.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function createMaterials() {
  const m = {
    desk: new THREE.MeshStandardMaterial({ color: 0x0b0c0e, roughness: 0.45, metalness: 0.2 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x1b1d22, roughness: 0.35, metalness: 0.75 }),
    bezel: new THREE.MeshStandardMaterial({ color: 0x050607, roughness: 0.4, metalness: 0.3 }),
    // Plain glow only: monitors show no data until Phase 4 wires labelled panels to them.
    screenOn: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x1d4a78, emissiveIntensity: 1.5, roughness: 0.25 }),
    screenOff: new THREE.MeshStandardMaterial({ color: 0x030405, roughness: 0.15, metalness: 0.6 }),
    standby: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x10263c, emissiveIntensity: 1, roughness: 0.2 }),
    chair: new THREE.MeshStandardMaterial({ color: 0x101114, roughness: 0.85, metalness: 0.05 }),
    keys: new THREE.MeshStandardMaterial({ color: 0x15171b, roughness: 0.6, metalness: 0.1 }),
    planter: new THREE.MeshStandardMaterial({ color: 0x0e0f11, roughness: 0.6, metalness: 0.2 }),
    leaf: new THREE.MeshStandardMaterial({ color: 0x24442a, roughness: 0.8, flatShading: true }),
  };
  for (const k of ['screenOn', 'screenOff', 'standby', 'keys']) m[k].userData.noShadow = true;
  return m;
}

const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _one = new THREE.Vector3(1, 1, 1);
function part(geo, mat, pos, rot = [0, 0, 0]) {
  return { geo, mat, local: new THREE.Matrix4().compose(new THREE.Vector3(...pos), _q.clone().setFromEuler(_e.set(...rot)), _one) };
}

// Chair centred at (0, z0), the sitter facing -z.
function chairParts(m, z0 = 0) {
  const p = [
    part(box(0.52, 0.08, 0.5), m.chair, [0, 0.48, z0]),
    part(box(0.5, 0.62, 0.07), m.chair, [0, 0.86, z0 + 0.25], [-0.12, 0, 0]),
    part(box(0.26, 0.12, 0.06), m.chair, [0, 1.25, z0 + 0.3], [-0.12, 0, 0]),
    part(new THREE.CylinderGeometry(0.03, 0.03, 0.38, 8), m.metal, [0, 0.25, z0]),
    part(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 5), m.metal, [0, 0.06, z0]),
  ];
  for (const sx of [-0.28, 0.28]) p.push(part(box(0.04, 0.03, 0.34), m.chair, [sx, 0.66, z0 + 0.02]), part(box(0.03, 0.16, 0.03), m.metal, [sx, 0.57, z0 + 0.02]));
  return p;
}

// Desk centred on the origin, monitors on the -z edge facing +z, chair on the +z side.
export function workstationKit(m, screen) {
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
    parts.push(part(new THREE.PlaneGeometry(0.57, 0.335), screen, [x + fx * 0.017, 1.12, z + fz * 0.017], [0, ry, 0]));
    parts.push(part(box(0.035, 0.3, 0.035), m.metal, [x - fx * 0.03, 0.9, z - fz * 0.03]));
    parts.push(part(box(0.22, 0.012, 0.16), m.metal, [x - fx * 0.03, 0.771, z - fz * 0.03], [0, ry, 0]));
  }
  return parts.concat(chairParts(m, 0.8));
}

export const chairKit = m => chairParts(m, 0);

// Free-standing area display on two legs, screen facing +z.
export function displayKit(m) {
  return [
    part(box(1.7, 1.0, 0.06), m.bezel, [0, 1.65, 0]),
    part(new THREE.PlaneGeometry(1.62, 0.92), m.standby, [0, 1.65, 0.032]),
    part(box(0.05, 1.2, 0.05), m.metal, [-0.6, 0.6, -0.05]), part(box(0.05, 1.2, 0.05), m.metal, [0.6, 0.6, -0.05]),
    part(box(0.4, 0.03, 0.4), m.metal, [-0.6, 0.015, -0.05]), part(box(0.4, 0.03, 0.4), m.metal, [0.6, 0.015, -0.05]),
  ];
}

export function plantKit(m) {
  const leaf = (r, pos) => part(new THREE.IcosahedronGeometry(r, 0), m.leaf, pos, [pos[0] * 3, pos[2] * 5, 0]);
  return [
    part(box(0.55, 0.55, 0.55), m.planter, [0, 0.275, 0]),
    leaf(0.42, [0, 0.95, 0]), leaf(0.32, [0.18, 1.3, 0.05]), leaf(0.3, [-0.16, 1.22, -0.1]), leaf(0.26, [0.02, 1.55, 0.04]),
  ];
}

export function tableKit(m, w, d) {
  return [
    part(box(w, 0.06, d), m.desk, [0, 0.74, 0]),
    part(box(0.08, 0.7, d * 0.6), m.metal, [-w / 2 + 0.4, 0.36, 0]), part(box(0.08, 0.7, d * 0.6), m.metal, [w / 2 - 0.4, 0.36, 0]),
  ];
}

// transforms: [{ x, z, rotY }]. Returns { group, meshes } with one InstancedMesh per material.
export function buildKit(name, parts, transforms, { shadows = true } = {}) {
  const byMat = new Map();
  for (const p of parts) {
    if (!byMat.has(p.mat)) byMat.set(p.mat, []);
    byMat.get(p.mat).push(p.geo.applyMatrix4(p.local));
  }
  const group = new THREE.Group(); group.name = name;
  const meshes = [], mtx = new THREE.Matrix4(), pos = new THREE.Vector3(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  for (const [mat, geos] of byMat) {
    const geo = mergeGeometries(geos); geos.forEach(g => g.dispose());
    const im = new THREE.InstancedMesh(geo, mat, Math.max(1, transforms.length));
    im.count = transforms.length;
    transforms.forEach((t, i) => im.setMatrixAt(i, mtx.compose(pos.set(t.x, 0, t.z), q.setFromAxisAngle(up, t.rotY || 0), _one)));
    im.castShadow = shadows && !mat.userData.noShadow; im.receiveShadow = shadows;
    im.computeBoundingSphere();
    group.add(im); meshes.push(im);
  }
  return { group, meshes };
}
