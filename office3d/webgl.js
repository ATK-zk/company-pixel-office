// WebGL capability probe. three.js r163+ needs WebGL 2, so version < 2 means "use the 2D office".
export function detectWebGL(doc = globalThis.document) {
  try {
    const c = doc.createElement('canvas');
    for (const [name, version] of [['webgl2', 2], ['webgl', 1]]) {
      const gl = c.getContext(name);
      if (gl) { const ext = gl.getExtension && gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext(); return { version }; }
    }
  } catch (e) { /* treated as no WebGL */ }
  return { version: 0 };
}
