import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectWebGL } from '../office3d/webgl.js';

const fakeDoc = support => ({ createElement: () => ({ getContext: name => (support.includes(name) ? { getExtension: () => null } : null) }) });

test('WebGL 2 available', () => assert.deepEqual(detectWebGL(fakeDoc(['webgl2', 'webgl'])), { version: 2 }));
test('only WebGL 1 → version 1 (2D fallback)', () => assert.deepEqual(detectWebGL(fakeDoc(['webgl'])), { version: 1 }));
test('no WebGL → version 0', () => assert.deepEqual(detectWebGL(fakeDoc([])), { version: 0 }));
test('probe that throws → version 0', () => assert.deepEqual(detectWebGL({ createElement() { throw new Error('blocked'); } }), { version: 0 }));
test('releases the probe context when possible', () => {
  let lost = false;
  const doc = { createElement: () => ({ getContext: () => ({ getExtension: () => ({ loseContext: () => { lost = true; } }) }) }) };
  detectWebGL(doc); assert.ok(lost);
});
