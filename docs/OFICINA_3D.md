# Oficina 3D — registro de implementación

Rama: `feat/oficina-3d` (solo local, sin push). Hacer merge a `main` publica en GitHub Pages: no hacerlo hasta revisar.

## Decisiones

- **Motor: Three.js r170**, cargado como módulo ES desde jsDelivr con versión fija (import map en `3d.html`). Se descartó Babylon.js porque el sitio no tiene build ni bundler y Three.js pesa unas 5 veces menos; el instancing y `CSS2DRenderer` cubren lo necesario.
- **Migración incremental:** la vista 3D vive en `3d.html`. `index.html` (Canvas 2D) no se ha tocado y es el fallback: sin WebGL 2, con `?view=2d` o tras un error.
- **Sin dependencias de npm.** `package.json` solo define `npm test` (`node --test`) y `npm run serve` (servidor estático de `tools/serve.mjs`, solo en 127.0.0.1).
- **Áreas configurables** en `config/departments.json` (rectángulo, asiento, color y agente), validadas por `office3d/layout.js`.

| Área | Agente (`status.json` → `team`) |
|---|---|
| Investigación y Noticias | `scout` |
| Quant & Data | `quant` |
| Estrategia | `lead` |
| Control de Riesgo | `risk` |
| Ejecución | `ops` |
| Supervisión y Auditoría | `critic` |

## Archivos

| Archivo | Función |
|---|---|
| `3d.html` | Página 3D: import map, HUD, carga y error |
| `office3d/boot.js` | Comprueba WebGL 2, carga la escena y gestiona errores y fallback |
| `office3d/main.js` | Escena, luces, cámara, zonas (áreas y salas), selección y bucle de render bajo demanda |
| `office3d/architecture.js` | Paredes, ventanal con skyline, cristaleras y mamparas |
| `office3d/furniture.js` | Kits instanciados: puesto, silla, pantalla de área, planta, mesa |
| `office3d/layout.js` | Funciones puras: validación, límites de cámara, encuadre, distribución |
| `office3d/agents.js` | Personas sentadas, poses y animación por estado |
| `office3d/status.js` | Adaptador puro de `status.json`: estados, antigüedad, filtros, validación de agentes |
| `office3d/panel.js` | Ficha de agente, panel de área o sala y aviso de origen de datos |
| `office3d/data.js` | Proveedor público (equity, leaderboard), cálculos y etiquetas de origen |
| `office3d/screens.js` | Paneles 2D en canvas para las pantallas 3D |
| `office3d/dashboard.js` | Panel de datos fuera de la escena |
| `office3d/activity.js` | Actividad reciente: publicada en status.json y observada en la sesión |
| `office3d/perf.js` | Panel de rendimiento y benchmark |
| `office3d/webgl.js` | Detección de WebGL |
| `config/departments.json` | Oficina, áreas, puestos, pantallas, salas, plantas y pasillos |
| `config/agents.json` | Nombre, cargo, función y aspecto de cada agente; umbral de dato antiguo |
| `config/status.demo.json` | Fixture de demostración (`?status=demo`), marcado como demo |
| `tools/bump.mjs` | Versión de los módulos, import map y hash de la CSP (`npm run bump`) |
| `tools/serve.mjs` | Servidor estático local (`npm run serve`) |
| `docs/STATUS_CONTRACT.md` | Contrato de `status.json` |
| `tests/*.test.js` | Tests (`npm test`) |

## Uso

```bash
npm run serve        # http://localhost:8123/3d.html
npm test
```

Mantenimiento: tras cambiar cualquier archivo de `office3d/`, ejecutar `npm run bump` (sube la versión, el import map y el hash de la CSP).

Parámetros: `?status=demo` (fixture de demostración) · `?q=low` (sin sombras ni antialias, pixel ratio 1) · `?perf=1` (panel de rendimiento) · `?stress=N` (N escritorios extra sin dueño, máx. 240) · `?view=2d`.
Teclas: arrastrar = desplazar · rueda = zoom hacia el cursor · botón derecho = girar · flechas = desplazar · `+`/`-` · `Esc`/`0` = vista general · `P` = rendimiento · `B` = benchmark de 5 s.

## Fase 1 — escena base ✅

Terminado:
- Suelo oscuro de baldosas con reflejo suave (entorno PMREM) y líneas verde lima en pasillos y perímetro.
- Seis áreas con contorno, etiqueta flotante (píldora y rombo lima, como en la referencia) y lista lateral para localizarlas.
- Cámara isométrica ortográfica con zoom limitado (0,6–6) hacia el cursor, desplazamiento confinado a la oficina, giro limitado a 35–62° de inclinación, vuelo suave al seleccionar y botón de vista general.
- Selección por clic en el suelo, en un escritorio o en una etiqueta, con panel de detalle.
- Luces: relleno hemisférico, una direccional con sombras y un foco cálido por área.
- Un puesto por agente, instanciado: un draw call por material, sea cual sea el número de escritorios.
- Render bajo demanda: no se dibuja nada si la escena está quieta.
- Estados de carga (con progreso), error con enlaces a la vista 2D, reintento y calidad baja, aviso de contexto WebGL perdido y liberación de recursos al salir.

Provisional:
- Los monitores solo emiten un brillo azul liso: **no muestran datos**. Los paneles etiquetados llegan en la Fase 4.
- El panel de detalle indica "Sin conectar": los estados reales llegan en la Fase 5.

### Rendimiento medido (21-10-2026, navegador integrado de Claude Desktop, Windows 10, 629×558, DPR 1)

| Escena | Escritorios | Draw calls | Triángulos | Carga | FPS medios (bench 5 s) | p95 | Peor frame |
|---|---|---|---|---|---|---|---|
| Base | 6 | 19–21 | 1.900 | 303 ms | 60,1 | 16,8 ms | 16,9 ms |
| `?stress=240` | 102 | 21 | 31.662 | 269 ms | 59,6 | 16,8 ms | 49,9 ms (pico aislado) |

Los FPS están limitados a 60 por vsync. La carga no incluye la descarga de three.js desde el CDN (va en caché). **Falta medir** en un equipo modesto o un móvil y a pantalla completa con DPR 2.

### Tests

`npm test` → 17/17 en verde: validación de la configuración y del reparto, existencia de los agentes en `status.json`, límites de cámara y zoom, encuadre, frustum en pantallas anchas y verticales, easing, distribución sin solapes y detección de WebGL.
Comprobado a mano en el navegador: carga, selección, zoom, diseño estrecho, redirección `?view=2d` y error con la configuración ausente (HTTP 404). Sin errores en consola.

## Fase 2 — plano y departamentos ✅

Terminado:
- **Plano de 52 × 40 m** en `config/departments.json` (versión 2): dos filas de tres áreas de 14 × 11 m, pasillos de 3,5 m con líneas lima, franja trasera con la sala de reuniones y paseo frontal.
- **Puestos por área:** el puesto del agente (fila delantera, pantallas encendidas) y dos puestos libres (fila trasera, **pantallas apagadas**, para que no parezcan ocupados). Todos salen de `seat` y `free_desks` en la configuración.
- **Pantalla común por área** (`display`), sobre pie, en espera hasta la Fase 4.
- **Control de Riesgo diferenciado** con una mampara de cristal de 1,1 m y entrada por el pasillo este (`partition`).
- **Sala de reuniones acristalada** (`rooms`) con moqueta, mesa, 6 sillas orientadas a la mesa y pantalla de resumen en espera. Se puede seleccionar desde su etiqueta, la lista o con un clic, y tiene su propio foco de luz.
- **Envolvente:** pared norte con ventanal y skyline nocturno procedural (decorativo, no son datos); pared oeste con tiras de luz cálida verticales. Los lados sur y este quedan abiertos (vista en corte) para que la cámara isométrica nunca quede tapada.
- **16 plantas**, instanciadas.
- **Validación ampliada:** puestos dentro de su área y sin solapes, pantallas y plantas sin pisar puestos, salas sin invadir áreas, ids únicos entre áreas y salas, mamparas con puerta válida.
- El panel de detalle indica el número de puestos (libres y asignado) y el estado pendiente; para la sala, que es compartida y su pantalla está en espera.

Provisional:
- Los monitores de los puestos asignados brillan siempre: hasta la Fase 5 **no reflejan si el agente trabaja**.
- Las pantallas de área y de la sala muestran un brillo de espera sin contenido.
- `boot.js` importa `main.js` sin parámetro de versión; en GitHub Pages podría servirse un módulo antiguo desde caché tras publicar. Queda para la Fase 7 (cache busting).

### Rendimiento medido (21-10-2026, mismo entorno: navegador integrado, 629×558, DPR 1)

| Escena | Escritorios | Draw calls | Triángulos | Carga | FPS medios (bench 5 s) | p95 | Peor frame |
|---|---|---|---|---|---|---|---|
| Plano completo | 18 | 45 | 9.576 | 575 ms | 60,0 | 16,8 ms | 17,1 ms |
| `?stress=240` (se llena el espacio libre) | 72 | 45 | 26.316 | 551 ms | 60,0 | 16,8 ms | 17,0 ms |

Los draw calls no crecen con el número de muebles gracias al instancing (un draw call por material y kit, más la pasada de sombras). La carga sube respecto a la Fase 1 (≈300 ms) por la textura del skyline y la compilación de más materiales.

### Tests

`npm test` → 22/22 en verde. Nuevos: puestos fuera de su área, plantas sobre puestos, sala que invade un área, mampara inválida, ids duplicados entre áreas y salas, sillas de la sala (dentro, orientadas a la mesa, sin chocar), efecto de las paredes en el encuadre y regla de solape de escritorios.
Comprobado a mano: vista general, selección de la sala (etiqueta) y de Control de Riesgo (vuelo de cámara y panel), y sin errores nuevos en consola.

## Fase 3 — personas y puestos ✅

Terminado:
- **Una persona sentada por agente** en su puesto, hecha con primitivas: piernas, torso, cabeza con tres peinados (`short`, `bun`, `long`) y brazos articulados. Piel, pelo, traje y camisa salen de `config/agents.json`. Son cinco mallas por persona con un material de colores por vértice: unos 30 draw calls para todo el reparto.
- **Estado real desde `status.json`**, mediante el adaptador puro `office3d/status.js` (adelantado de la Fase 5 para no simular actividad):
  - `WORKING` → `running`, `IDLE` → `idle`, y además `WAITING`, `ERROR`, `DISABLED`, etc. Un estado no reconocido → `unknown`, con el valor original visible.
  - Un agente que no aparece → `disabled` ("no aparece en status.json"). Si falla la lectura → `unknown` con el error.
  - **Dato antiguo** si `team.as_of` supera `stale_after_minutes` (120 por defecto) o no lleva zona horaria. Formato admitido: `2026-10-13 20:01 ICT` o ISO.
- **Poses según el estado**, sin fingir actividad:

  | Estado | Pose |
  |---|---|
  | `running` con dato reciente | Teclea: oscilación discreta de brazos y cabeza |
  | `running` con dato antiguo | Sentado frente a las pantallas, **quieto** |
  | `idle`, `waiting`, `success`, `degraded`, `unknown` | Recostado, manos en el regazo |
  | `disabled` | Cabizbajo y oscurecido |
  | `error`, `degraded`, `unknown` | Además, un anillo de color en el suelo |

- **Etiqueta sobre cada agente** (píldora con punto de estado y rombo lima, como en la referencia), con la marca "antiguo" o "demo". Los nombres de área pasan a un rótulo discreto al fondo de cada área.
- **Ficha del agente** (clic en la persona, su etiqueta o desde el panel del área): nombre, cargo, área, identificador, función, estado y avisos, tarea actual (texto original), hora de actualización local y antigüedad, y enlaces a `status.json` y a su historial en GitHub. Último resultado, latencia, errores y métricas aparecen como **"No disponible en status.json"**, porque esos datos no existen todavía.
- **Filtros por estado** con recuento (Todos, Trabajando, Inactivos, Error/degradado, Desactivados, Datos antiguos): atenúan a las personas y etiquetas que no coinciden.
- **Origen de los datos** en la barra superior: `status.json · hace 8 d · ANTIGUO`, `sin conexión` o `DATOS DE DEMOSTRACIÓN`. Se relee cada 60 s.
- **Modo demo** `?status=demo`: carga `config/status.demo.json`, marcado como demo en la barra, en las etiquetas y en la ficha. Sirve para ver todos los estados (teclear, error, desactivado…).
- **Rendimiento:** solo se anima a quien está en `running` con dato reciente; esa animación está limitada a ~30 fps y sin animaciones no se redibuja nada. Se respeta `prefers-reduced-motion`.
- Zoom máximo ampliado a 10 y acercamiento al agente a 7.

Estado real hoy: `status.json` es del 13-10-2026 20:01 ICT (unos 8 días), así que **los seis agentes salen como dato antiguo y nadie se anima**. Risk Watch y Ops figuran como `WORKING` en el archivo y se muestran en pose de trabajo, quietos.

Provisional:
- Los personajes son estilizados y de baja poligonización; no se parecen al realismo de la imagen de referencia. Para eso harían falta modelos 3D con licencia (GLB), que se pueden cambiar dentro de `agents.js` sin tocar el resto.
- No hay animaciones de caminar ni de reunión: personajes fijos en su puesto, como pedía la especificación para la primera entrega.
- La tarea se muestra en inglés porque así llega en `status.json` (`task_en`).

### Rendimiento medido (21-10-2026, navegador integrado, 629×558, DPR 1)

| Escena | Draw calls | Triángulos | Carga | Resultado |
|---|---|---|---|---|
| Datos reales (nadie anima) | 81 | 39.484 | ~890 ms | **0 frames en 3 s** sin interacción |
| `?status=demo` (2 tecleando) | 81 | 39.484 | ~980 ms | 91 frames en 3 s (≈30 fps, límite activo) |
| Bench 5 s, demo con filtro | 81 | 39.484 | — | 60,0 FPS · p95 16,8 ms · peor 16,8 ms |
| Bench 5 s, demo sin filtro | 81 | 39.484 | — | 59,2 FPS · p95 16,8 ms · peor 66,7 ms (pico aislado) |

Corregido durante la medición: al filtrar se producía un frame de 500 ms porque cambiar `transparent` en los materiales obligaba a recompilar shaders. Ahora los materiales de las personas son siempre transparentes y solo cambia la opacidad.

### Tests

`npm test` → 33/33 en verde. Nuevos (`tests/status.test.js`): mapeo de estados, lectura de `as_of` (ICT, ISO y sin zona), `status.json` real como dato antiguo, solo anima `WORKING` con dato reciente, umbral de antigüedad, agente ausente, estado desconocido, fallo de lectura, fixture demo, formato de antigüedad, filtros y validación de `config/agents.json`.
Comprobado a mano: etiquetas y estados reales, ficha de Quant, demo con Quant tecleando y Risk Watch en error, filtro "Error / degradado" y sin errores en consola.

## Fase 4 — pantallas y panel de datos ✅

### Fuentes de datos

| Origen | Etiqueta | Qué aporta | Frecuencia |
|---|---|---|---|
| API pública Polymarket Perps `…/v1/info/portfolio?address=` | **REAL · proveedor** | Equity, número de posiciones abiertas, hora del proveedor | 20 s |
| API pública `…/v1/info/leaderboard?…&address=` | **REAL · proveedor** | P&L y ROI acumulados (definición del proveedor), volumen, ranking | 120 s |
| `status.json` (sync externo) | **status.json** | Estados y tareas de los agentes, `net_value` (equity y P&L del día), `systems` | 60 s |
| Cálculo en el navegador | **CALCULADO** | Uso del límite diario, discrepancia de equity, exposición cuando hay 0 posiciones | al cambiar los datos |
| Sin fuente | **SIN DATOS** | Se muestra "—" con el motivo; nunca se rellena | — |

Son los mismos endpoints públicos, sin autenticación y de solo lectura (GET), que ya usaba la vista 2D. La dirección de cuenta se lee de `status.json` → `leaderboard_account`. **Ningún código de esta vista puede enviar órdenes.**

### Hallazgo en los datos reales (22-10-2026)

- El proveedor indica **equity ≈ 0,00 $** (6,6·10⁻⁷) y **0 posiciones abiertas**. El leaderboard da un P&L acumulado de **−134,24 $**, un ROI de −31,1 % y un volumen de 129,7 K $ (puesto 1013 de ~31.786).
- `status.json` sigue diciendo **400,00 $** de equity y −32,89 $ de P&L del día, con fecha del 12-10-2026.
- La oficina lo marca como **"Discrepancia entre fuentes"** en la pantalla de Riesgo, en la de resumen y en el panel de datos. No se ha investigado la causa (fuera del alcance de este repositorio); la decisión es del propietario.

Terminado:
- **Paneles 2D sobre las pantallas 3D** (`office3d/screens.js`): canvas de 768×432 como textura en las 6 pantallas de área y en la de la sala, configurados con `panel` en `config/departments.json`. Solo se repintan cuando cambian los datos.

  | Pantalla | Contenido |
  |---|---|
  | Investigación | Estado y tarea de Scout; feed de noticias **sin integración** |
  | Quant & Data | Equity real, posiciones, gráfico de la sesión (una muestra cada 20 s); backtests sin datos |
  | Estrategia | Estado y tarea del Desk Lead; propuestas: ninguna publicada (una propuesta no es una orden) |
  | Control de Riesgo | P&L del día (status.json), uso del límite del 15 % (calculado, con fórmula), discrepancia, sistemas |
  | Ejecución | Estado de Ops; órdenes MOCK/PAPER sin registro; aviso de solo lectura; posiciones reales |
  | Supervisión | Estado de los 6 agentes y sistemas; costes y latencia sin datos |
  | Sala de reuniones | Resumen: equity, P&L acumulado, volumen, P&L del día, ranking, agentes trabajando |

- **Visor de pantalla**: un clic en una pantalla 3D, o "Ver pantalla →" en el panel del área o de la sala, la abre a tamaño completo. Desde la vista isométrica el texto en 3D no se lee, así que este visor es la forma de leerlas.
- **Panel de datos** (botón `$`): todas las métricas de la especificación, cada una con origen y hora: equity (proveedor y status.json), discrepancia, posiciones, exposición, P&L acumulado, ROI, P&L del día, uso del límite diario, volumen, ranking, sistemas. P&L realizado/no realizado, drawdown, operaciones y tasa de acierto, costes de modelos y latencia aparecen como **SIN DATOS**, con el motivo. El **modo operativo** figura como "No publicado": `status.json` no indica MOCK, PAPER o LIVE.
- En el **modo demo** no se consulta el proveedor: ningún valor aparece como REAL.
- **Errores:** tiempo de espera de 8 s por petición. Si falla, se conserva el último dato bueno con su hora y el error queda visible.
- **Corregido durante los tests:** si llegaba tarde una respuesta de una cuenta anterior, podía mostrarse como de la cuenta nueva. Ahora un contador de generación la descarta.

Provisional:
- Los **monitores de los puestos** siguen con un brillo genérico, sin datos (no muestran nada inventado). Pintar datos por puesto obligaría a dejar de instanciarlos; queda como opción.
- El gráfico de equity solo cubre **la sesión actual**: no hay historial persistente. Por eso no se calcula el drawdown.
- La fórmula del límite diario usa `net_value` de `status.json`, que hoy tiene 10 días.

### Rendimiento medido (22-10-2026, navegador integrado, 629×558, DPR 1)

| Escena | Draw calls | Texturas | Triángulos | Carga | Resultado |
|---|---|---|---|---|---|
| Datos reales con proveedor | 87 | 11 | 39.496 | ~1.220 ms | 0 frames en 3 s en reposo · bench 59,2 FPS · p95 16,8 ms · peor 66,7 ms (pico aislado) |

### Tests

`npm test` → 42/42 en verde. Nuevos (`tests/data.test.js`): lectura de portfolio y leaderboard con las formas reales de la API, segundos frente a milisegundos, `net_value` de `status.json`, fórmula del límite diario, discrepancia, formatos, solo dos endpoints de lectura, panel de datos (ninguna cifra sin origen, lo que falta etiquetado, discrepancia detectada, ningún REAL sin datos del proveedor) y poller (dirección inválida, errores HTTP, parada limpia y descarte de respuestas tardías).
Comprobado a mano: pantallas de Riesgo, Resumen y Quant en el visor, panel de datos completo, modo demo sin consultas al proveedor y sin errores en consola.

## Fase 5 — integración de agentes ✅ (hasta donde llega este repositorio)

El backend que ejecuta los agentes **no está en este repositorio**. La única interfaz con él es `status.json`, que escribe un proceso externo. Esta fase, por tanto, define y consume un contrato sin inventar datos: **[docs/STATUS_CONTRACT.md](STATUS_CONTRACT.md)**.

Terminado:
- **Contrato v1 de `status.json`**, con campos opcionales: `mode`, y por agente `updated_at`, `last_result`, `latency_ms`, `errors`, `metrics`, `evidence` y `recent`. Todos se validan y se acotan (longitudes, número de elementos). Si faltan, la ficha dice "No disponible en status.json".
- **Antigüedad por agente:** `updated_at` sustituye a `team.as_of` para ese agente y decide si se anima.
- **Enlaces de evidencia seguros:** solo `https://` o rutas relativas del sitio. `javascript:`, `data:`, `http:` y `//host` se descartan.
- **Insignia de modo** en la barra superior, según `status.json` → `mode`: "Modo no publicado" (hoy), MOCK, PAPER o **LIVE en rojo**, siempre con "vista solo lectura". Mostrar LIVE no habilita nada: esta vista no tiene ningún camino para operar.
- **Actividad reciente** en la ficha, de dos fuentes separadas y etiquetadas: `recent` publicado en `status.json` y los cambios de estado o tarea **observados** en esta sesión entre dos lecturas correctas (no se inventa nada en la primera lectura ni sin cambios).
- **Calidad de `status.json`** en el panel de datos: avisos de contrato (hora sin zona, agentes ausentes o sobrantes, estados desconocidos, `systems`/`net_value` mal formados, dirección inválida, enlaces no permitidos, modo ausente o desconocido). Con el archivo actual, el único aviso es que `mode` no se publica.
- El panel de sistemas (`systems`) ya aparecía en Riesgo, Supervisión y el panel de datos desde la Fase 4.
- El fixture demo usa todos los campos nuevos, marcados `[DEMO]`, y `mode: PAPER`, que se muestra como "PAPER (demo)".

Pendiente del propietario (no se puede hacer desde aquí):
1. Que el proceso de sincronización publique `mode` y los campos por agente del contrato.
2. Reanudar la sincronización: el último `status.json` es del 13-10-2026.
3. Revisar la discrepancia de equity (proveedor ~0 $ frente a 400 $ en `status.json`).

### Tests

`npm test` → 52/52 en verde. Nuevos (`tests/contract.test.js`): `status.json` actual sin campos opcionales, lectura y límites de los campos nuevos, enlaces permitidos y bloqueados, `updated_at` por agente, modos (ausente, conocido, LIVE, desconocido), validación del archivo actual y de uno roto, fixture demo conforme al contrato, actividad observada (nada en la primera lectura, cambios de estado y tarea, límite de 20), mezcla de actividad publicada y observada, y fila de modo del panel de datos con LIVE.
Comprobado a mano: insignia "Modo no publicado" con datos reales, calidad de datos con un único aviso, ninguna actividad inventada tras dos lecturas iguales, ficha de Quant en demo con todos los campos y consola sin errores.

## Fase 6 — riesgo y paper trading ⛔ depende del backend externo

**No implementada en este repositorio, a propósito.** La especificación (§6, §10, §11) pide que el motor de riesgo, la ejecución, la conciliación y el kill switch sean servicios separados del frontend, y que "el frontend nunca sea la autoridad de saldo, P&L, órdenes o posiciones". Este repositorio es solo ese frontend: un sitio estático de GitHub Pages sin backend. Implementar aquí un "motor de riesgo" o un "simulador de órdenes" sería justo lo que la especificación prohíbe, porque daría una falsa sensación de control.

| Requisito | Dónde debe vivir | Estado verificable desde aquí | Qué mostraría la oficina |
|---|---|---|---|
| Motor de riesgo determinista que rechaza propuestas | Backend externo | **No verificable.** El README menciona un límite de pérdida diaria del 15 % vigilado por Risk Watch, sin código visible | Estado de Risk Watch; uso del límite calculado con `net_value` (Fase 4) |
| Propuestas con esquema versionado (§8) | Backend externo | **No existe** ningún registro de propuestas publicado | Pantalla de Estrategia preparada ("0 conocidas") |
| Ejecución MOCK/PAPER con costes, deslizamiento y rechazos | Backend externo | **No verificable.** `status.json` menciona "DRY" y "paper AAVE/XRP/SILVER" en las tareas, pero no publica órdenes | Pantalla de Ejecución preparada; posiciones reales del proveedor |
| Conciliación de órdenes, posiciones y saldo | Backend externo | **Indicio de fallo:** discrepancia actual entre proveedor (~0 $) y `status.json` (400 $) | Aviso "Discrepancia entre fuentes" (Fase 4) |
| Kill switch y política de órdenes pendientes | Backend externo | **No verificable** | Se podría mostrar si `status.json` publicara su estado (ampliación del contrato) |
| Bloqueo ante datos obsoletos | Backend externo (decisión) / oficina (aviso) | La oficina avisa de datos antiguos y no anima; **no puede bloquear** nada porque no opera | Marca "antiguo", calidad de datos |
| LIVE deshabilitado | Backend externo | **No verificable desde aquí.** El `status.json` del 13-10 habla de un "go-live" previsto a las ~20:15 ICT | Insignia de modo (hoy "no publicado") |

**Riesgo importante para el propietario:** el último `status.json` describe la preparación de un paso a LIVE con dinero real, y el proveedor muestra hoy la cuenta prácticamente vacía. Este trabajo no ha tocado, consultado ni modificado ese sistema. Conviene revisar qué ocurrió después del 13-10 antes de reanudar nada.

Para avanzar la Fase 6 hace falta acceso al repositorio o servicio del backend. Con él: revisar el motor de riesgo y sus tests, el modo de ejecución, la conciliación y el kill switch, y después publicar su estado en `status.json` según el contrato ampliado.

## Fase 7 — optimización y validación ✅

Terminado:
- **Caché sin mezclas de versiones:** todos los módulos de `office3d/` se cargan con `?v=N` mediante el import map de `3d.html`, igual que `boot.js` y el CSS. `npm run bump [N]` lo regenera todo; un test comprueba que `3d.html` coincide exactamente con lo que genera el script (versión actual: **v8**). Resuelve el aviso de caché de la Fase 2.
- **Content-Security-Policy** en `3d.html`:
  - scripts solo del propio sitio y de `cdn.jsdelivr.net` (three.js 0.170.0, versión fija), y el import map inline solo mediante su hash SHA-256;
  - conexiones solo al propio sitio y a `api.perpetuals.polymarket.com`;
  - sin `unsafe-inline` ni `unsafe-eval`, con `object-src 'none'`, `base-uri 'none'`, `form-action 'none'` y `referrer: no-referrer`.

  Así queda **impuesto por el navegador** que la página no puede enviar datos a ningún otro destino.
- **Accesibilidad:**
  - con `prefers-reduced-motion`, la cámara salta en lugar de deslizarse y no hay animación de tecleo;
  - el visor de pantallas devuelve el foco al elemento que lo abrió y retiene el tabulador;
  - todos los controles son botones con etiqueta accesible y foco visible.
- **Móvil:** en pantallas estrechas se ocultan los rótulos de área (siguen en la lista inferior) y se reducen las etiquetas de agente. La marca "antiguo" se mantiene visible.
- **Ciclo de vida verificado:** tras `dispose()` desaparecen el canvas y las etiquetas, no hay más frames ni peticiones, y los controles no lanzan errores.

### Rendimiento final (22-10-2026, navegador integrado de Claude Desktop, Windows 10)

| Escenario | Viewport | Draw calls | Triángulos | Carga | Bench 5 s | p95 | Peor frame |
|---|---|---|---|---|---|---|---|
| Normal, datos reales | 629×558, DPR 1 | 87 | 39.496 | 1.124 ms | 59,2 FPS | 16,8 ms | 49,3 ms |
| `?q=low` | 629×558, DPR 1 | 87 | 39.496 | 3.602 ms* | 59,4 FPS | 16,8 ms | 50,2 ms |
| Móvil emulado | 375×812, DPR 2 | 87 | 39.496 | 1.087 ms | 59,2 FPS | 16,8 ms | 49,9 ms |
| Reposo (sin animaciones) | — | — | — | — | **0 frames en 3 s** | — | — |

\*Una sola muestra, probablemente por la descarga desde el CDN; no se ha repetido. Los FPS están limitados por vsync (60). Se observa siempre **un pico aislado de ~50 ms** durante el benchmark, sin identificar (posiblemente la primera actualización de sombras o de texturas al girar).

**No medido:** equipo modesto real, móvil físico, GPU integrada antigua, Safari y Firefox. El móvil "emulado" usa la GPU del PC, así que **no representa** el rendimiento de un teléfono.

### Tests

`npm test` → **59/59 en verde**. Nuevos (`tests/build.test.js`): versión única para todos los módulos, `3d.html` igual a la salida de `npm run bump`, hash y directivas de la CSP, sintaxis de todo el JavaScript (incluidos `office.js` y `music.js` de la vista 2D), ausencia de `innerHTML`/`eval`, URLs y métodos de red permitidos, y ausencia de secretos en los archivos servidos.

## Estado final

| | Estado |
|---|---|
| Oficina 3D interactiva (cámara, zoom, desplazamiento, giro, selección, transiciones) | ✅ Terminado |
| Seis áreas configurables, sala de reuniones, puestos, mobiliario y ventanal | ✅ Terminado |
| Una persona por agente real, con pose según `status.json` y sin fingir actividad | ✅ Terminado (estilizado, no realista) |
| Ficha de agente, filtros por estado, actividad, modo | ✅ Terminado; muchos campos "no disponibles" hasta que el sync los publique |
| Pantallas con datos reales o etiquetados; panel de datos | ✅ Terminado |
| Carga, error, fallback 2D, datos antiguos, sin conexión | ✅ Terminado |
| Rendimiento y ciclo de vida | ✅ Medido en un entorno; ⚠️ falta hardware modesto real |
| Seguridad (solo lectura, CSP, sin secretos, MOCK/PAPER) | ✅ En la vista; ⚠️ el modo real del backend no es verificable |
| Motor de riesgo, paper trading, conciliación, kill switch | ⛔ Backend externo (Fase 6) |
| Personajes realistas como en la imagen de referencia | ⚠️ Provisional: requiere modelos GLB con licencia |
| Monitores de puesto con datos | ⚠️ Brillo genérico sin datos (decisión de rendimiento) |
| `3d.html` como página principal | ⏸ Decisión del propietario; `index.html` sigue intacto |

## Riesgos conocidos

1. **Posible paso a LIVE en el backend** (según el `status.json` del 13-10) y cuenta casi vacía según el proveedor. Fuera de este repositorio: revisar con prioridad.
2. **`status.json` lleva 9 días sin actualizarse**: toda la oficina muestra datos antiguos.
3. **Discrepancia de equity** (proveedor ~0 $ frente a 400 $ en `status.json`).
4. Dependencia del CDN jsDelivr para three.js: si cae, la vista 3D muestra el error y el enlace a la 2D. Alternativa: copiar three.js al repositorio (unos 700 KB).
5. Hacer merge a `main` **publica** el sitio. Revisar antes.

## Pasos que requieren al propietario

1. Revisar la rama `feat/oficina-3d` y decidir si se publica (merge a `main`) y si `3d.html` sustituye a `index.html` o convive con ella.
2. Reanudar el sync de `status.json` y, si se quiere, publicar `mode` y los campos del contrato ([STATUS_CONTRACT.md](STATUS_CONTRACT.md)).
3. Dar acceso al backend para abordar la Fase 6.
4. Investigar la discrepancia de equity.
5. Opcional: aportar modelos 3D con licencia para personajes más realistas.

## Seguridad

Este repositorio solo **lee datos**: no contiene código que firme ni envíe órdenes, ni claves. Llamadas de red de la vista 3D: three.js (CDN), los JSON de `config/`, `status.json` y, desde la Fase 4, dos GET públicos de solo lectura a la API de Polymarket Perps (portfolio y leaderboard), los mismos que ya usaba la vista 2D. LIVE no se habilita desde aquí.
