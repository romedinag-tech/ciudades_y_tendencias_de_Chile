# Uso de Suelo y Población en Chile — plataforma nacional

Página estática única (sin backend) que escala el análisis del Gran Concepción a las **345 comunas** del país: ficha por comuna / área metropolitana y comparador de ciudades. Censo INE 2017/2024 + Catastro SII.

## Estructura

```
web/
├── index.html              · estructura + estilos (tema navy/orange del sitio GC)
├── app.js                  · lógica: selector, agregación de KPIs, 4 pestañas, mapas y gráficos
└── data/
    ├── kpis_comunas.json   · 345 comunas × KPIs censo+SII  (maestro, se carga siempre)
    ├── metro_areas.json    · 9 áreas metropolitanas (CUT INE)
    ├── comunas.geojson     · 345 polígonos comunales (mapa nacional del comparador)
    ├── zonas/<slug>.geojson · mapa zonal intra-ciudad (lazy-load)   ← se amplía con el pipeline
    └── crecimiento/<slug>.json · series temporales por ciudad (lazy-load) ← idem
```

## Pestañas
1. **Resumen** — tarjetas KPI de la comuna/área seleccionada, con desvío vs. promedio nacional.
2. **Oferta de servicios por habitante** — choropleth por zona censal + selector de indicador + barras por comuna del grupo con referencia nacional.
3. **Dinámica de crecimiento** — variación intercensal (toggle comuna/zona) + personas vs. m², casa/depto, densificación/expansión.
4. **Comparar ciudades** — multiselección → tabla de KPIs, ranking nacional, dispersión y mapa coroplético nacional.

## Estado de datos
- **Nacional (las 345 comunas):** Resumen y Comparador funcionan completos con los JSON maestros. 302 comunas traen catastro SII; el resto muestra solo indicadores censales.
- **Intra-ciudad (zonal + crecimiento):** disponible para las **9 áreas metropolitanas** (`gran_santiago`, `gran_valparaiso`, `gran_concepcion`, `la_serena_coquimbo`, `iquique_alto_hospicio`, `gran_rancagua`, `temuco_padre_las_casas`, `chillan_chillan_viejo`, `puerto_montt_puerto_varas`). Para las comunas fuera de un área, las pestañas Oferta y Dinámica muestran un aviso "en preparación".
- Reportes/reproducción: `scripts/build_zonas.py` (zonal), `scripts/build_crecimiento.py` (temporal), `data/zonas_cobertura.json` (cobertura y comunas omitidas).

## Cómo encender una ciudad nueva (zonal/crecimiento)
Los mapas zonales (Oferta) y las series de crecimiento (Dinámica) se generan para cada comuna con
catastro enriquecido. Para **agregar una ciudad que hoy aparece "en preparación"** (p. ej. Valdivia,
Punta Arenas, Chillán — hoy sin archivo en `comunas_parquet/`):

1. Dejar el catastro enriquecido de la comuna en `comunas_parquet/<Nombre>_<codSII>.parquet`
   (debe traer columnas `lat`, `lon`, `dc_cod_destino`, `sup_construida_total`, `pisos_max`,
   `anio_construccion_min/max`). El nombre del archivo se mapea a la comuna INE por nombre.
2. Correr los dos pipelines (regeneran TODO de forma idempotente y saneando `NaN`→`null`):
   ```
   python proyecto_nacional/scripts/build_zonas.py        # data/zonas/c<cut>.geojson + zonas_index.json
   python proyecto_nacional/scripts/build_crecimiento.py  # data/crecimiento/c<cut>.json + crecimiento_index.json
   ```
3. `git add -A && git commit && git push` → se redeploya solo. **No hay que tocar `app.js`**: el front
   detecta la disponibilidad por manifiesto (`data/zonas_index.json`, `data/crecimiento_index.json`).

Notas de slug: área metropolitana = nombre normalizado (`gran_valparaiso`); comuna individual = `c<CUT>`.
Si el nombre del archivo no calza con el nombre INE, añadir un alias en el dict `ALIAS` de ambos scripts
(ya hay ejemplos: `calera→la calera`, `natales→puerto natales`).

## Deploy (GitHub Pages)
Servir la carpeta `web/` como raíz del sitio. Local: `python -m http.server` dentro de `web/`.

## Notas
- El loader (`getJSON`) tolera literales `NaN`/`Infinity` que escribe Python (no válidos en JSON) → los convierte a `null`.
- Nombres de áreas se toman de `metro_areas.json` (UTF-8 limpio), no del bloque `meta.metros` de `kpis_comunas.json` (que viene con encoding dañado).

Fuente: Censo INE 2017/2024 + Catastro SII · Rodrigo Medina González, Universidad de Concepción.
