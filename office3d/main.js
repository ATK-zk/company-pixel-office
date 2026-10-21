// 3D office scene. Phase 1: floor, isometric camera, lighting. Phase 2: full floor plan from config (desks,
// area displays, meeting room, walls, plants). No agent data yet — nothing here represents real activity
// (Phase 5 connects status.json; Phase 4 puts labelled panels on the screens).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { validateDepartments, officeBounds, clampTarget, clampZoom, focusFor, overviewFrustum, easeInOut, workstationTransforms, roomFurniture, ZOOM, VIEW } from './layout.js';
import { createMaterials, workstationKit, chairKit, displayKit, plantKit, tableKit, buildKit } from './furniture.js';
import { buildArchitecture } from './architecture.js';
import { createPerf } from './perf.js';

const LIME = 0xc6ff3d, BG = 0x06080a, CAM_DIST = 90;
const deg = d => d * Math.PI / 180;
const $ = id => document.getElementById(id);

function tileTexture(renderer) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#1c1e22'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2500; i++) { const v = 24 + Math.random() * 10; g.fillStyle = `rgba(${v},${v + 1},${v + 4},.5)`; g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); }
  g.fillStyle = '#0c0d0f'; g.fillRect(0, 0, 256, 3); g.fillRect(0, 0, 3, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return t;
}

function stripGeometry(x0, z0, x1, z1, width, y) {
  const len = Math.hypot(x1 - x0, z1 - z0), g = new THREE.PlaneGeometry(len + width, width);
  g.rotateX(-Math.PI / 2); g.rotateY(Math.atan2(-(z1 - z0), x1 - x0)); g.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
  return g;
}

export async function start({ root, params, progress, onFatal }) {
  const t0 = performance.now();
  progress(0.15, 'Leyendo configuración de áreas');
  const res = await fetch('config/departments.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error(`config/departments.json → HTTP ${res.status}`);
  const cfg = await res.json();
  const errors = validateDepartments(cfg);
  if (errors.length) throw new Error('Configuración de áreas inválida: ' + errors.join('; '));

  const low = params.get('q') === 'low', shadows = !low;
  progress(0.35, 'Preparando renderizador');
  const renderer = new THREE.WebGLRenderer({ antialias: !low, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, low ? 1 : 1.5));
  renderer.setSize(root.clientWidth, root.clientHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.35;
  renderer.shadowMap.enabled = shadows; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute('aria-label', 'Oficina 3D: arrastra para desplazar, rueda para zoom, clic en un área para acercarte');
  root.appendChild(renderer.domElement);
  const labels = new CSS2DRenderer();
  labels.setSize(root.clientWidth, root.clientHeight); labels.domElement.className = 'labels3d';
  root.appendChild(labels.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  scene.fog = new THREE.Fog(BG, 120, 200);
  const pmrem = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment();
  scene.environment = pmrem.fromScene(room, 0.04).texture; scene.environmentIntensity = 0.25;
  room.dispose?.(); pmrem.dispose();

  // ---- camera + controls ----
  const bounds = officeBounds(cfg.office, 2);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400);
  const homeOffset = new THREE.Vector3().setFromSphericalCoords(CAM_DIST, deg(VIEW.polar), deg(VIEW.azimuth));
  camera.position.copy(homeOffset); camera.zoom = ZOOM.overview;
  const fitFrustum = () => {
    const [fw, fh] = overviewFrustum(cfg.office, root.clientWidth / Math.max(1, root.clientHeight));
    Object.assign(camera, { left: -fw / 2, right: fw / 2, top: fh / 2, bottom: -fh / 2 }); camera.updateProjectionMatrix();
  };
  fitFrustum();
  const controls = new OrbitControls(camera, renderer.domElement);
  Object.assign(controls, { enableDamping: true, dampingFactor: 0.09, screenSpacePanning: false, zoomToCursor: true,
    minZoom: ZOOM.min, maxZoom: ZOOM.max, minPolarAngle: deg(35), maxPolarAngle: deg(62), rotateSpeed: 0.5, keyPanSpeed: 25 });
  controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
  controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };
  controls.listenToKeyEvents(window);
  controls.update();

  // ---- lights: dim cool fill, one shadow-casting key, one warm spot per area ----
  progress(0.55, 'Montando la oficina');
  scene.add(new THREE.HemisphereLight(0x9fb3c8, 0x0a0c10, 0.9));
  const key = new THREE.DirectionalLight(0xdfe6f0, 1.0);
  key.position.set(14, 34, 18);
  if (shadows) {
    key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -36, right: 36, top: 30, bottom: -30, near: 1, far: 110 });
    key.shadow.bias = -0.0004; key.shadow.normalBias = 0.03;
  }
  scene.add(key);
  for (const d of cfg.departments) {
    const s = new THREE.SpotLight(0xffe2bd, 140, 18, deg(40), 0.85, 1.6);
    s.position.set(d.seat[0] + 1, 8, d.seat[1] + 2); s.target.position.set(d.seat[0], 0.7, d.seat[1]);
    scene.add(s, s.target);
  }
  for (const rm of cfg.rooms || []) {
    const [x0, z0, x1, z1] = rm.rect, s = new THREE.SpotLight(0xffe2bd, 110, 16, deg(50), 0.9, 1.6);
    s.position.set((x0 + x1) / 2 + 1, 7, (z0 + z1) / 2 + 2); s.target.position.set((x0 + x1) / 2, 0.7, (z0 + z1) / 2);
    scene.add(s, s.target);
  }

  // ---- floor + lime guide lines ----
  const fw = cfg.office.width + 16, fd = cfg.office.depth + 16, tex = tileTexture(renderer);
  tex.repeat.set(fw / 1.5, fd / 1.5);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(fw, fd), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.3, metalness: 0.3 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = shadows; scene.add(floor);
  const aisles = cfg.aisles || [];
  if (aisles.length) {
    const core = mergeGeometries(aisles.map(a => stripGeometry(...a, 0.09, 0.012)));
    const halo = mergeGeometries(aisles.map(a => stripGeometry(...a, 0.55, 0.01)));
    scene.add(new THREE.Mesh(core, new THREE.MeshBasicMaterial({ color: LIME, toneMapped: false })));
    scene.add(new THREE.Mesh(halo, new THREE.MeshBasicMaterial({ color: LIME, transparent: true, opacity: 0.09, depthWrite: false, blending: THREE.AdditiveBlending })));
  }

  // ---- zones (areas + rooms): tinted pad (also the click target), outline, floating label ----
  const ROOM_COLOR = '#9aa6b5';
  const zones = cfg.departments.map(d => ({ ...d, kind: 'dept' }))
    .concat((cfg.rooms || []).map(r => ({ ...r, kind: 'room', color: ROOM_COLOR, agent: null })));
  const pads = [], labelEls = new Map();
  for (const z of zones) {
    const [x0, z0, x1, z1] = z.rect, col = new THREE.Color(z.color), room = z.kind === 'room';
    const pad = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), room
      ? new THREE.MeshStandardMaterial({ color: 0x15171b, roughness: 0.95 })
      : new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.025, depthWrite: false }));
    pad.rotation.x = -Math.PI / 2; pad.position.set((x0 + x1) / 2, 0.006, (z0 + z1) / 2); pad.receiveShadow = room && shadows;
    pad.userData.zone = z;
    if (!room) pad.add(new THREE.LineSegments(new THREE.EdgesGeometry(pad.geometry), new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.3 })));
    scene.add(pad); pads.push(pad);
    const el = document.createElement('button');
    el.type = 'button'; el.className = 'zl' + (room ? ' room' : ''); el.style.setProperty('--c', z.color);
    el.append(Object.assign(document.createElement('span'), { textContent: z.name }), document.createElement('i'));
    el.addEventListener('click', () => select(z));
    const lbl = new CSS2DObject(el);
    if (room) lbl.position.set((x0 + x1) / 2, (cfg.office.wall_height || 4) - 0.2, (z0 + z1) / 2); else lbl.position.set(z.seat[0], 3.1, z.seat[1] - 0.3);
    scene.add(lbl); labelEls.set(z.id, el);
  }
  const zoneById = id => zones.find(z => z.id === id);

  // ---- shell + furniture, all instanced from config ----
  progress(0.7, 'Amueblando las áreas');
  scene.add(buildArchitecture(cfg, renderer, { shadows }));
  const mats = createMaterials(), opts = { shadows };
  const desks = workstationTransforms(cfg, Number(params.get('stress')) || 0);
  const ownedDesks = desks.filter(d => d.on), freeDesks = desks.filter(d => !d.on);
  const owned = buildKit('desks-owned', workstationKit(mats, mats.screenOn), ownedDesks, opts);
  const free = buildKit('desks-free', workstationKit(mats, mats.screenOff), freeDesks, opts);
  const displays = cfg.departments.filter(d => d.display).map(d => ({ x: d.display[0], z: d.display[1], rotY: d.display[2] || 0, dept: d.id }));
  const disp = buildKit('area-displays', displayKit(mats), displays, opts);
  scene.add(owned.group, free.group, disp.group);
  scene.add(buildKit('plants', plantKit(mats), (cfg.plants || []).map(([x, z]) => ({ x, z, rotY: (x * 7 + z * 3) % 6.28 })), opts).group);
  const roomPick = [];
  for (const rm of cfg.rooms || []) {
    const f = roomFurniture(rm);
    const t = buildKit('room-table', tableKit(mats, f.table.w, f.table.d), [f.table], opts);
    const c = buildKit('room-chairs', chairKit(mats), f.chairs, opts);
    // Summary screen: standby glow until Phase 4 gives it a labelled panel.
    const scr = new THREE.Group();
    const bez = new THREE.Mesh(new THREE.BoxGeometry(f.screen.w + 0.08, f.screen.w * 0.56 + 0.08, 0.06), mats.bezel);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(f.screen.w, f.screen.w * 0.56), mats.standby); face.position.z = 0.032;
    scr.add(bez, face); scr.position.set(f.screen.x, 1.9, f.screen.z);
    scene.add(t.group, c.group, scr);
    for (const m of [...t.meshes, ...c.meshes]) { m.userData.zone = zoneById(rm.id); roomPick.push(m); }
  }
  // instanced meshes → zone of the clicked instance
  const pickables = [...pads, ...roomPick];
  for (const [kit, list] of [[owned, ownedDesks], [free, freeDesks], [disp, displays]])
    for (const m of kit.meshes) { m.userData.instanceZone = i => zoneById(list[i].dept); pickables.push(m); }

  // ---- on-demand render loop ----
  let raf = 0, tween = null, disposed = false, loadMs = 0;
  const perf = createPerf({ renderer, el: $('perf'), loadMs: () => loadMs });
  const invalidate = () => { if (!raf && !disposed) raf = requestAnimationFrame(loop); };
  const clampView = () => {
    const t = controls.target, c = clampTarget(t.x, t.z, bounds);
    if (c.x !== t.x || c.z !== t.z || t.y !== 0) { const d = new THREE.Vector3(c.x - t.x, -t.y, c.z - t.z); t.add(d); camera.position.add(d); }
  };
  controls.addEventListener('change', () => { clampView(); invalidate(); });
  controls.addEventListener('start', () => { tween = null; });

  function flyTo(x, z, zoom, { ms = 750, offset = null } = {}) {
    tween = { t0: performance.now(), ms,
      from: { x: controls.target.x, z: controls.target.z, zoom: camera.zoom, off: camera.position.clone().sub(controls.target) },
      to: { x, z, zoom: clampZoom(zoom), off: offset } };
    invalidate();
  }
  function stepTween(now) {
    const k = Math.min(1, (now - tween.t0) / tween.ms), e = easeInOut(k), f = tween.from, to = tween.to;
    controls.target.set(f.x + (to.x - f.x) * e, 0, f.z + (to.z - f.z) * e);
    const off = to.off ? f.off.clone().lerp(to.off, e).setLength(CAM_DIST) : f.off;
    camera.position.copy(controls.target).add(off);
    camera.zoom = f.zoom + (to.zoom - f.zoom) * e; camera.updateProjectionMatrix();
    if (k >= 1) tween = null;
    return true;
  }
  const orbitAxis = new THREE.Vector3(0, 1, 0);
  function loop(now) {
    raf = 0;
    let active = false;
    if (tween) active = stepTween(now);
    if (perf.benching) { camera.position.sub(controls.target).applyAxisAngle(orbitAxis, 0.006).add(controls.target); active = true; }
    if (controls.update()) active = true;
    renderer.render(scene, camera); labels.render(scene, camera); perf.frame(now);
    if (active) invalidate();
  }

  // ---- selection + UI ----
  let selected = null;
  const panel = $('panel');
  function select(d) {
    selected = d;
    for (const p of pads) if (p.userData.zone.kind === 'dept') p.material.opacity = d && p.userData.zone.id === d.id ? 0.08 : 0.025;
    for (const [id, el] of labelEls) el.classList.toggle('sel', !!d && id === d.id);
    document.querySelectorAll('#depts button').forEach(b => b.setAttribute('aria-pressed', String(!!d && b.dataset.id === d.id)));
    if (d) {
      const f = focusFor(d, cfg.office); flyTo(f.x, f.z, f.zoom);
      $('pName').textContent = d.name; $('pName').style.color = d.color;
      if (d.kind === 'room') {
        $('pAgent').textContent = '— (sala compartida)';
        $('pState').textContent = 'Pantalla de resumen en espera: se conecta en la Fase 4';
      } else {
        const nFree = (d.free_desks || []).length;
        $('pAgent').textContent = d.agent;
        $('pState').textContent = `Sin conectar: se vincula a status.json en la Fase 5 · ${1 + nFree} puestos (${nFree} libres)`;
      }
      panel.hidden = false;
    } else panel.hidden = true;
    invalidate();
  }
  function recenter() { select(null); flyTo(0, 0, ZOOM.overview, { offset: homeOffset }); }

  const list = $('depts');
  for (const d of zones) {
    if (d.kind === 'room' && !list.querySelector('hr')) list.append(document.createElement('hr'));
    const b = document.createElement('button');
    b.type = 'button'; b.dataset.id = d.id; b.setAttribute('aria-pressed', 'false'); b.style.setProperty('--c', d.color);
    b.append(document.createElement('i'), Object.assign(document.createElement('span'), { textContent: d.name }));
    b.addEventListener('click', () => (selected === d ? recenter() : select(d)));
    list.append(b);
  }
  const zoomBy = k => flyTo(controls.target.x, controls.target.z, camera.zoom * k, { ms: 250 });
  $('zin').onclick = () => zoomBy(1.4); $('zout').onclick = () => zoomBy(1 / 1.4); $('zreset').onclick = recenter;
  $('pClose').onclick = recenter;
  $('perfBtn').onclick = () => { perf.toggle(); invalidate(); };

  // click (not drag) on the floor picks the area under the cursor
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(); let down = null;
  const el = renderer.domElement;
  const onDown = e => { down = [e.clientX, e.clientY]; };
  const onUp = e => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) { down = null; return; }
    down = null;
    const r = el.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(pickables, false)[0];
    if (!hit) return;
    const u = hit.object.userData, d = u.instanceZone ? u.instanceZone(hit.instanceId) : u.zone;
    if (d) select(d);
  };
  el.addEventListener('pointerdown', onDown); el.addEventListener('pointerup', onUp);
  const onKey = e => {
    if (e.target.closest && e.target.closest('input,textarea')) return;
    if (e.key === 'Escape' || e.key === '0') recenter();
    else if (e.key === '+' || e.key === '=') zoomBy(1.4);
    else if (e.key === '-') zoomBy(1 / 1.4);
    else if (e.key === 'p' || e.key === 'P') { perf.toggle(); invalidate(); }
    else if (e.key === 'b' || e.key === 'B') { perf.toggle(true); perf.runBench(); invalidate(); }
  };
  addEventListener('keydown', onKey);

  const ro = new ResizeObserver(() => {
    renderer.setSize(root.clientWidth, root.clientHeight); labels.setSize(root.clientWidth, root.clientHeight);
    fitFrustum(); invalidate();
  });
  ro.observe(root);
  el.addEventListener('webglcontextlost', e => { e.preventDefault(); onFatal('Se perdió el contexto WebGL (GPU reiniciada o sin memoria).'); });

  function dispose() {
    if (disposed) return; disposed = true;
    cancelAnimationFrame(raf); ro.disconnect(); controls.dispose(); removeEventListener('keydown', onKey);
    el.removeEventListener('pointerdown', onDown); el.removeEventListener('pointerup', onUp);
    scene.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      for (const m of [].concat(o.material || [])) { if (m.map) m.map.dispose(); m.dispose(); }
    });
    scene.environment && scene.environment.dispose();
    renderer.dispose(); el.remove(); labels.domElement.remove();
  }
  addEventListener('pagehide', e => { if (!e.persisted) dispose(); });

  progress(0.9, 'Compilando shaders');
  await renderer.compileAsync(scene, camera);
  loadMs = performance.now() - t0;
  window.__office3d = { ...(window.__office3d || {}), loadMs: Math.round(loadMs), desks: desks.length, runBench: () => { perf.toggle(true); const p = perf.runBench(); invalidate(); return p; }, info: perf.info };
  if (params.get('perf') === '1') perf.toggle(true);
  invalidate();
  return { dispose, select, recenter };
}
