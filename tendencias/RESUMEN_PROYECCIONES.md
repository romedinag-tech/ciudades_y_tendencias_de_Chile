# Resumen de proyecciones 2030 / 2035 — para revisión (NO publicado)

> **Estado: PROVISIONAL — no publicado.** Cumpliendo la regla de la Fase 4, las proyecciones quedan
> **locales** (no se hizo deploy ni push). Revisar calidad antes de decidir publicación.

## Qué se hizo (MVP, Fase 0)
- Proyección de **demografía** (población, hogares, viviendas) y **uso de suelo** (m² por uso) a **2030 y 2035**
  para **las 345 comunas** (341 con suelo; 4 sin catastro enriquecido → solo demografía).
- 3 escenarios: **Tendencial · Alto · Consolidación**.
- Método de suelo: **flujo-medio reciente** del stock por uso (ventana 7 años, **rezago-corregido**) +
  **coherencia residencial** (el suelo habitacional se ata a Δviviendas, no diverge de la demografía).
- Validado por **backtesting** (entrenar ≤T0, predecir T0+7, comparar con observado 2024).

## Cómo revisar
1. Servir la carpeta y abrir la página de revisión:
   `python -m http.server 8791 --directory proyecto_nacional/revision_proyecciones` → http://localhost:8791/
   (`proyecciones_preview.html`: trayectorias por comuna con escenarios, mapa nacional del cambio, tabla de backtest).
2. Datos crudos: `proyecto_nacional/data/proyecciones/<cut>.json` y `data/proyecciones_comunas.json`.
3. Informe metodológico completo: **`INFORME_PROYECCIONES.md`**.

## Calibración (backtest, MAPE % a 7 años, método elegido = flujo-medio)
Promedio por ciudad (T0=2016→2023): GC **10,2%**, Gran Santiago **8,5%**, Gran Valparaíso **7,4%**,
Antofagasta **14,8%**, Temuco **12,1%**, La Serena-Coquimbo **23,3%**. (CAGR da 20–32%: peor; se descartó.)

MAPE por uso (flujo-medio): **Habitacional 0–4%**, **Educación 0–8%**, **Comercio 3–18%**,
**Oficina/Industria 4–36%**, **Salud 16–75%** (muy volátil: un hospital mueve el total → requiere
pooling/escenarios, no punto). Detalle en el informe.

## Supuestos clave
- **Demografía = fallback** (extrapolación censal 2017→2024 amortiguada al nacional, caps ±1,5/+3,5%/año).
  Marcada `fuente_demografia:"fallback"` en cada JSON. Tamaño de hogar decreciente (−0,7%/año, piso 2,2).
- **Rezago de catastro**: los años recientes se inflan por su madurez (factor 2024 ×1,28 · 2023 ×1,08 · 2022 ×1,02),
  estimado comparando los cortes semestrales 2023-S2 vs 2025-S2.
- Escenarios de suelo no residencial: Alto = +30% del flujo, Consolidación = −30%.

## FALTA para publicar (TODOs)
1. **Archivo de proyecciones de población INE 2002–2035 por comuna** — NO está en `proyecto_nacional/data/`.
   Mientras no esté, la demografía es **provisional** (fallback). Es el reemplazo #1 antes de publicar.
2. **Mejorar usos volátiles** (Salud sobre todo): pooling nacional + modelo panel/GBM con drivers
   (población, NSE, saturación) — Fase 1 de la metodología. Hoy Salud va por flujo-medio con banda ancha.
3. **Bandas P10/P90 formales** desde el error de backtest por uso (hoy se entregan escenarios Alto/Cons;
   las bandas cuantílicas quedan para Fase 1).
4. **Asignación espacial** del m² proyectado a zonas/manzanas (densificación vs expansión) → mapas
   proyectados intra-ciudad (Fase 2).
5. Las **4 comunas sin catastro enriquecido** (Catemu, Doñihue, Cabo de Hornos, Trehuaco) no tienen
   proyección de suelo (sí demografía).

## Archivos generados (todos LOCALES)
- `scripts/proy_build.py` — pipeline MVP (reusa `proy_prototipo_gc.py`).
- `data/proyecciones/<cut>.json` (345) · `data/proyecciones_comunas.json` · `data/proyecciones_backtest.json`.
- `revision_proyecciones/proyecciones_preview.html` (+ copia de datos) — página de revisión, **no enlazada** al sitio público.
- `INFORME_PROYECCIONES.md` — informe metodológico con resultados.

**No se publicó nada.** Esperando tu revisión para decidir si (y con qué ajustes) se integra al sitio.
