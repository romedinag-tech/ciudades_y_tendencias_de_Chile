# Ciudades y tendencias de Chile

Plataforma web única (estática, sin backend) que reúne el **análisis de uso de suelo y
población** de las ciudades de Chile con las **proyecciones de tendencias** demográficas y
de uso de suelo (horizontes 2030 / 2035).

## Pestañas

- **Resumen** — ficha por comuna o área metropolitana, con desvío vs. promedio nacional.
- **Oferta de servicios por habitante** — m² por uso y mapas por zona censal.
- **Dinámica de crecimiento** — series temporales reconstruidas por año de construcción.
- **Comparar ciudades** — tabla de KPIs lado a lado, dispersión y mapa nacional.
- **Ranking** — orden nacional por dimensión.
- **Tendencias demográficas** — población, vivienda, **índice de envejecimiento** por zona
  (65+/<15) y estimación del **peak poblacional** (INE 2002–2035, anclado al Censo 2024).
- **Tendencias de uso de suelo** — proyección de m² por uso a nivel de zona, con escenarios
  (deriva reciente robusta a proyectos atípicos).

Las dos pestañas de *Tendencias* se integran embebidas desde `tendencias/` (sitio
autocontenido que también funciona por separado).

## Aviso

Es un **ejercicio estadístico provisional**. Las proyecciones **no incorporan los
instrumentos de planificación territorial (planes reguladores)** que imponen restricciones
al crecimiento, ni constituyen un pronóstico oficial.

## Estructura

```
index.html, app.js, data/      · plataforma principal (uso de suelo + población, 345 comunas)
tendencias/
  index.html                   · Tendencias demográficas (envejecimiento, peak poblacional)
  usos.html                    · Tendencias de uso de suelo (m² por uso, escenarios)
  data/                        · proyecciones + envejecimiento + geometrías por zona
```

## Fuentes

Censo 2024 (INE) · Estimaciones y Proyecciones de Población 2002–2035 por comuna (INE) ·
Catastro de bienes raíces (SII) reconstruido por año de construcción · CASEN 2024 (ingreso).

## Deploy (GitHub Pages)

Servir la raíz del repositorio. Local: `python -m http.server` en la raíz.

Rodrigo Medina González · Universidad de Concepción.
