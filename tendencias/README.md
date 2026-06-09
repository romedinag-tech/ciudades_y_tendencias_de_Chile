# Tendencias 2030 / 2035 — Demografía y uso de suelo (Chile)

Proyecciones **provisionales** por comuna de población, hogares, viviendas y m² construidos por uso a 2030 y 2035,
con escenarios (Tendencial · Alto · Consolidación) y calibración por backtesting. Sitio estático (HTML + Leaflet + Chart.js).

- **`index.html`** — visor: trayectorias por comuna con escenarios, mapa nacional del cambio proyectado, tabla de backtest.
- **`data/`** — `proyecciones_comunas.json` (resumen), `proyecciones/<cut>.json` (detalle por comuna), `comunas.geojson`, `proyecciones_backtest.json`.
- **`INFORME_PROYECCIONES.md`** — metodología, calibración (MAPE por uso y método) y resultados.
- **`RESUMEN_PROYECCIONES.md`** — resumen y pendientes.

## Método (resumen)
- **Suelo:** stock de m² por uso reconstruido desde el año de construcción del Catastro SII; proyección por
  **flujo-medio reciente** (rezago-corregido); el habitacional se ata a la demanda de viviendas (coherencia residencial).
- **Demografía:** trayectoria nacional **INE (Estimaciones y Proyecciones base 2024)** re-anclada al Censo 2024 y repartida a comunas. Pendiente
  reemplazo por la **proyección oficial INE 2002–2035**.
- **Calibración:** backtesting (entrenar ≤T0, predecir T0+7). Flujo-medio: MAPE ~7–15% en ciudades grandes.

## Advertencia
Son **escenarios**, no pronósticos oficiales. La demografía es provisional hasta incorporar INE. Uso efectivo (fiscal)
del suelo, no normativo.

Fuente: Censo INE 2017/2024 + Catastro de bienes raíces SII · Rodrigo Medina González, Universidad de Concepción.
