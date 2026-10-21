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
| `office3d/perf.js` | Panel de rendimiento y benchmark |
| `office3d/webgl.js` | Detección de WebGL |
| `config/departments.json` | Oficina, áreas, puestos, pantallas, salas, plantas y pasillos |
| `config/agents.json` | Nombre, cargo, función y aspecto de cada agente; umbral de dato antiguo |
| `config/status.demo.json` | Fixture de demostración (`?status=demo`), marcado como demo |
| `tests/*.test.js` | Tests (`npm test`) |

## Uso

```bash
npm run serve        # http://localhost:8123/3d.html
npm test
```

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

## Pendiente (siguientes fases)

- **Fase 5:** el adaptador de estado ya existe (Fase 3); falta el panel de sistemas (`systems`), las métricas por rol y la insignia de modo MOCK/PAPER.
- **Fase 6/7:** documentar qué depende del backend externo (riesgo, paper trading, latencias) y optimizar.

## Seguridad

Este repositorio solo **lee datos**: no contiene código que firme ni envíe órdenes, ni claves. Llamadas de red de la vista 3D: three.js (CDN), los JSON de `config/`, `status.json` y, desde la Fase 4, dos GET públicos de solo lectura a la API de Polymarket Perps (portfolio y leaderboard), los mismos que ya usaba la vista 2D. LIVE no se habilita desde aquí.
