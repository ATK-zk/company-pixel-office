// Detail panel contents (agent card, area, room) and the data-source chip. DOM only, built with
// textContent — status.json text is never injected as HTML.
import { STATES, formatAge } from './status.js';

const HISTORY_URL = 'https://github.com/ATK-zk/company-pixel-office/commits/main/status.json';
const h = (tag, props = {}, ...kids) => { const el = Object.assign(document.createElement(tag), props); el.append(...kids.filter(k => k != null)); return el; };
const chip = (text, color, title) => { const c = h('span', { className: 'chip', textContent: text, title: title || '' }); c.style.setProperty('--c', color); return c; };
const row = (dl, label, value, cls) => { dl.append(h('dt', { textContent: label }), h('dd', { className: cls || '' }, value)); };
const NA = 'No disponible en status.json';

export function stateChips(s) {
  const out = [chip(STATES[s.state].label, STATES[s.state].color, s.raw != null ? `status.json: ${s.raw}` : '')];
  if (s.demo) out.push(chip('DEMO', '#ffcf5c', 'Datos de demostración, no proceden de los agentes'));
  else if (s.stale) out.push(chip('Dato antiguo', '#ffcf5c', 'Más antiguo que el umbral configurado o sin hora'));
  return out;
}
function when(s) {
  if (s.demo) return 'Demostración (sin hora real)';
  if (s.asOf == null) return 'Sin hora en status.json';
  return `${new Date(s.asOf).toLocaleString('es-ES')} · ${formatAge(s.ageMs)}`;
}

export function renderAgent(body, { id, meta, dept, status: s, staleMinutes }) {
  const head = h('header', {}, h('h2', { textContent: meta.name }), h('p', { className: 'sub', textContent: `${meta.role} · ${dept.name}` }));
  head.querySelector('h2').style.color = dept.color;
  const dl = h('dl');
  row(dl, 'Estado', h('span', { className: 'chips' }, ...stateChips(s)));
  row(dl, 'Identificador', id, 'mono');
  row(dl, 'Función', meta.duty);
  row(dl, 'Tarea actual', s.task ? h('span', {}, s.task, h('small', { textContent: ' (texto original de status.json)' })) : '—');
  row(dl, 'Actualizado', when(s));
  if (s.reason) row(dl, 'Aviso', s.reason, 'warn');
  row(dl, 'Último resultado', NA, 'na');
  row(dl, 'Latencia', NA, 'na');
  row(dl, 'Errores recientes', s.state === 'error' ? 'status.json indica error, sin más detalle' : NA, s.state === 'error' ? 'warn' : 'na');
  row(dl, 'Métricas del rol', 'Pendiente de conectar (Fase 5)', 'na');
  const links = h('p', { className: 'links' },
    h('a', { href: 'status.json', target: '_blank', rel: 'noopener', textContent: 'Ver status.json' }), ' · ',
    h('a', { href: HISTORY_URL, target: '_blank', rel: 'noopener', textContent: 'Historial de cambios' }));
  const note = h('p', { className: 'note', textContent: `La animación de trabajo solo aparece si status.json dice WORKING y el dato tiene menos de ${staleMinutes} min.` });
  body.replaceChildren(head, dl, links, note);
}

const screenButton = onScreen => { const b = h('button', { type: 'button', className: 'agentlink', textContent: 'Ver pantalla →' }); b.addEventListener('click', onScreen); return b; };

export function renderArea(body, { dept, meta, status: s, onAgent, onScreen }) {
  const head = h('header', {}, h('h2', { textContent: dept.name }));
  head.querySelector('h2').style.color = dept.color;
  const dl = h('dl');
  const btn = h('button', { type: 'button', className: 'agentlink', textContent: `${meta.name} →` });
  btn.addEventListener('click', onAgent);
  row(dl, 'Agente', btn);
  row(dl, 'Estado', h('span', { className: 'chips' }, ...stateChips(s)));
  const nFree = (dept.free_desks || []).length;
  row(dl, 'Puestos', `${1 + nFree} (1 asignado, ${nFree} libres)`);
  row(dl, 'Pantalla del área', onScreen ? screenButton(onScreen) : 'Sin panel configurado', onScreen ? '' : 'na');
  body.replaceChildren(head, dl);
}

export function renderRoom(body, { room, onScreen }) {
  const dl = h('dl');
  row(dl, 'Uso', 'Sala compartida');
  row(dl, 'Asientos', String(room.seats || 0));
  row(dl, 'Pantalla de resumen', onScreen ? screenButton(onScreen) : 'Sin panel configurado', onScreen ? '' : 'na');
  body.replaceChildren(h('header', {}, h('h2', { textContent: room.name })), dl);
}

// Top-bar chip describing where agent states come from and how fresh they are.
export function renderSource(el, { status, error, statuses }) {
  const any = Object.values(statuses)[0];
  let text, color, title;
  if (error) { text = 'status.json: sin conexión'; color = '#ff5d73'; title = error; }
  else if (status && status.demo) { text = 'DATOS DE DEMOSTRACIÓN'; color = '#ffcf5c'; title = 'config/status.demo.json: no proceden de los agentes'; }
  else if (any && any.stale) { text = `status.json · ${formatAge(any.ageMs)} · ANTIGUO`; color = '#ffcf5c'; title = 'Los estados pueden no reflejar la situación actual'; }
  else { text = `status.json · ${formatAge(any && any.ageMs)}`; color = '#c6ff3d'; title = 'Estados leídos de status.json'; }
  el.textContent = text; el.title = title; el.style.setProperty('--c', color); el.hidden = false;
}
