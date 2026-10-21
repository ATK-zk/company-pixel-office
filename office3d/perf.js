// Frame statistics + a fixed benchmark (continuous render while the camera orbits).
// The scene renders on demand, so idle FPS is 0 by design; the benchmark is the representative number.
export function createPerf({ renderer, el, loadMs }) {
  let frames = 0, total = 0, windowStart = performance.now(), fps = 0, last = 0, bench = null, shown = false;

  function frame(now) {
    frames++; total++;
    if (bench) { if (last) bench.dts.push(now - last); if (now - bench.t0 >= bench.ms) finishBench(); }
    last = now;
    if (now - windowStart >= 500) { fps = frames * 1000 / (now - windowStart); frames = 0; windowStart = now; if (shown) draw(); }
  }
  function finishBench() {
    const d = bench.dts.slice().sort((a, b) => a - b), avg = d.reduce((s, v) => s + v, 0) / (d.length || 1);
    const result = { frames: d.length, avgFps: +(1000 / avg).toFixed(1), p95Ms: +(d[Math.floor(d.length * 0.95)] || 0).toFixed(1), worstMs: +(d[d.length - 1] || 0).toFixed(1), at: new Date().toISOString() };
    const done = bench.done; bench = null; window.__office3d = { ...(window.__office3d || {}), lastBench: result }; draw(result); if (done) done(result);
  }
  function info() {
    const r = renderer.info, mem = performance.memory;
    return { frames: total, calls: r.render.calls, triangles: r.render.triangles, geometries: r.memory.geometries, textures: r.memory.textures,
      loadMs: Math.round(loadMs()), heapMB: mem ? +(mem.usedJSHeapSize / 1048576).toFixed(1) : null };
  }
  function draw(result) {
    if (!el) return;
    const i = info(), b = result || (window.__office3d && window.__office3d.lastBench);
    el.textContent = [
      `FPS (interacción) ${fps.toFixed(0)}`, `draw calls ${i.calls} · tris ${i.triangles}`, `geom ${i.geometries} · tex ${i.textures}`,
      `carga ${i.loadMs} ms` + (i.heapMB != null ? ` · heap ${i.heapMB} MB` : ''),
      bench ? 'benchmark en curso…' : b ? `bench 5 s: ${b.avgFps} fps · p95 ${b.p95Ms} ms · peor ${b.worstMs} ms` : 'bench: pulsa B',
    ].join('\n');
  }
  return {
    frame, info,
    get benching() { return !!bench; },
    runBench(ms = 5000) { return new Promise(done => { last = 0; bench = { t0: performance.now(), ms, dts: [], done }; draw(); }); },
    toggle(force) { shown = force ?? !shown; if (el) { el.hidden = !shown; if (shown) draw(); } return shown; },
  };
}
