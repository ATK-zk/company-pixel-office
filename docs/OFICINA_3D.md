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
| `office3d/main.js` | Escena, luces, cámara, selección y bucle de render bajo demanda |
| `office3d/furniture.js` | Puestos instanciados (escritorio, 3 monitores, teclado, silla) |
| `office3d/layout.js` | Funciones puras: validación, límites de cámara, encuadre, distribución |
| `office3d/perf.js` | Panel de rendimiento y benchmark |
| `office3d/webgl.js` | Detección de WebGL |
| `config/departments.json` | Áreas, asientos y pasillos |
| `tests/*.test.js` | Tests (`npm test`) |

## Uso

```bash
npm run serve        # http://localhost:8123/3d.html
npm test
```

Parámetros: `?q=low` (sin sombras ni antialias, pixel ratio 1) · `?perf=1` (panel de rendimiento) · `?stress=N` (N escritorios extra sin dueño, máx. 240) · `?view=2d`.
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

## Pendiente (siguientes fases)

- **Fase 2:** plano completo: varios puestos por área, cristalera, sala de reuniones, plantas y paredes.
- **Fase 3:** personajes estilizados sentados, animaciones según el estado real, ficha de agente y filtros.
- **Fase 4:** monitores con paneles 2D: equity, ranking y P&L reales con su fuente y hora; todo lo demás marcado **DEMO**.
- **Fase 5:** adaptador de `status.json` (`WORKING` → `running`, `IDLE` → `idle`, más de 2 h → datos antiguos, ausente → `disabled`) e insignia de modo MOCK/PAPER.
- **Fase 6/7:** documentar qué depende del backend externo (riesgo, paper trading, latencias) y optimizar.

## Seguridad

Este repositorio solo **lee datos**: no contiene código que firme ni envíe órdenes, ni claves. La Fase 1 no añade llamadas de red salvo la carga de three.js y de `config/departments.json`. LIVE no se habilita desde aquí.
