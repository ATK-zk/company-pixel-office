// Entry point: checks WebGL 2, then loads three.js and the scene. Any failure shows a readable error
// with a link to the 2D office (index.html), which keeps working without WebGL.
import { detectWebGL } from './webgl.js';

const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);

function progress(k, msg) { $('ldBar').style.width = Math.round(k * 100) + '%'; if (msg) $('ldMsg').textContent = msg; }
function fatal(title, detail) {
  $('loader').hidden = true;
  $('errTitle').textContent = title; $('errDetail').textContent = detail || '';
  $('error').hidden = false;
}

if (params.get('view') === '2d') location.replace('index.html');
else if (detectWebGL(document).version < 2) fatal('Este navegador no tiene WebGL 2', 'La oficina 3D necesita WebGL 2. Puedes usar la vista 2D clásica.');
else {
  try {
    progress(0.05, 'Cargando motor 3D');
    const { start } = await import('./main.js');
    await start({ root: $('stage'), params, progress, onFatal: msg => fatal('La escena 3D se ha detenido', msg) });
    progress(1, 'Listo');
    $('loader').classList.add('done');
    setTimeout(() => { $('loader').hidden = true; }, 400);
  } catch (e) {
    console.error(e);
    fatal('No se pudo cargar la oficina 3D', e && e.message ? e.message : String(e));
  }
}
