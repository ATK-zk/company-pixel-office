# Contrato de `status.json` (v1)

`status.json` es la única fuente del estado de los agentes que lee la oficina. Lo escribe un proceso externo de sincronización (los commits "Sync team status"), que **no está en este repositorio**. Este documento describe lo que la oficina lee hoy y los campos **opcionales** que mostrará en cuanto ese proceso los publique.

La oficina es de solo lectura: ningún campo de este archivo hace que envíe, firme ni controle órdenes.

## Campos que ya existen (no cambian)

| Campo | Tipo | Uso en la oficina |
|---|---|---|
| `team.as_of` | `"AAAA-MM-DD HH:MM ICT"` o ISO 8601 con zona | Hora del dato; si tiene más de `stale_after_minutes` (120), se marca como **antiguo** y nadie se anima |
| `team.<id>.state` | `WORKING`, `IDLE` (también admite `WAITING`, `BLOCKED`, `DONE`, `SUCCESS`, `DEGRADED`, `ERROR`, `FAILED`, `DISABLED`, `OFF`, `OFFLINE`) | Estado y pose. Otro valor → `unknown` con aviso |
| `team.<id>.task_en` | texto | Tarea actual (se muestra tal cual) |
| `team.<id>.role` | texto | No se usa (el cargo sale de `config/agents.json`) |
| `systems[]` | `{ "name": texto, "ok": booleano }` | Salud de servicios |
| `net_value` | `{ usd, day_pnl_usd, positions, source, as_of }` | Equity y P&L del día "según status.json" |
| `leaderboard_account` | dirección `0x` + 40 hex | Cuenta consultada en la API pública del proveedor |

`<id>` es uno de: `lead`, `quant`, `critic`, `risk`, `scout`, `ops` (los asignados en `config/departments.json`).

## Campos opcionales nuevos

Ninguno es obligatorio. Si falta, la oficina muestra **"No disponible en status.json"**, nunca un valor inventado.

| Campo | Tipo | Se muestra en | Límites |
|---|---|---|---|
| `mode` | `"MOCK"`, `"PAPER"` o `"LIVE"` | Insignia de la barra superior y panel de datos | Otro valor → aviso. `LIVE` se muestra en rojo, solo como información |
| `team.<id>.updated_at` | hora con zona | Antigüedad de ese agente (sustituye a `team.as_of` para él) | — |
| `team.<id>.last_result` | texto | Ficha: "Último resultado" | 300 caracteres |
| `team.<id>.latency_ms` | número ≥ 0 | Ficha: "Latencia" | — |
| `team.<id>.errors` | lista de textos | Ficha: "Errores recientes" | 5 elementos de 200 caracteres |
| `team.<id>.metrics` | objeto `{ nombre: número o texto }` | Ficha: "Métricas del rol" | 8 entradas; nombres de hasta 40 caracteres |
| `team.<id>.evidence` | URL `https://…` o ruta relativa del sitio | Ficha: enlace "Evidencia" | Cualquier otro esquema (`javascript:`, `data:`, `http:`) se ignora |
| `team.<id>.recent` | lista de `{ "at": hora con zona, "text": texto }` | Ficha: "Actividad reciente" (etiqueta *status.json*) | 10 elementos |

Ejemplo de un agente con todos los campos opcionales:

```json
"quant": {
  "state": "WORKING",
  "task_en": "Backtest desk42-tf 4h",
  "updated_at": "2026-10-22T08:05:00Z",
  "last_result": "Backtest OK: 120 operaciones, validación 70/30",
  "latency_ms": 1840,
  "errors": [],
  "metrics": { "backtests": 3, "cobertura de datos": "92 %" },
  "evidence": "https://github.com/ATK-zk/company-pixel-office/commits/main/status.json",
  "recent": [{ "at": "2026-10-22T08:00:00Z", "text": "Historial de precios cargado" }]
}
```

`config/status.demo.json` (`3d.html?status=demo`) usa todos estos campos con textos marcados `[DEMO]`.

## Actividad observada

Además de `recent`, la oficina anota en la ficha los cambios de estado y de tarea que observa entre dos lecturas correctas de `status.json` durante la sesión (etiqueta *observado*). No se guarda nada: al recargar la página se pierde.

## Calidad de datos

El panel de datos (botón `$`) incluye "Calidad de status.json", con avisos sobre: `team.as_of` sin zona, agentes que faltan, estados fuera del contrato, `updated_at` ilegible, enlaces no permitidos, `systems` o `net_value` mal formados, dirección inválida y `mode` ausente o desconocido.

## Pendiente del propietario

1. Decidir si el proceso de sincronización publicará `mode` y los campos por agente, y empezar a escribirlos.
2. Reanudar la sincronización: el último `status.json` es del 13-10-2026.
3. Revisar la discrepancia de equity: el proveedor indica ~0 $ y `status.json` 400 $.
