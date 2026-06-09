# Informe — Proyección de demografía y uso de suelo a 2030 y 2035

**Proyecto:** Plataforma nacional de uso de suelo · Rodrigo Medina González (U. de Concepción)
**Estado:** MVP (Fase 0) — **provisional, no publicado.** Documento para revisar la calidad antes de decidir publicación.

---

## 1. Propuesta metodológica

Se proyecta, por comuna y a 2030/2035, la **demografía** (población → hogares → viviendas) y el **uso de suelo**
(m² construidos por uso). No es un pronóstico puntual: son **escenarios calibrados y validados**.

### 1.1 Bloque demográfico
- **Población:** lo correcto es re-anclar la **proyección comunal INE 2002–2035** al Censo 2024. **Ese archivo no está
  en la carpeta**, así que este MVP usa un **fallback** transparente: extrapola la tendencia comunal 2017→2024
  **amortiguada hacia el crecimiento nacional** (peso 50/50) con topes (−1,5% a +3,5%/año). Marcado
  `fuente_demografia:"fallback"` en cada salida. **Debe reemplazarse por INE antes de publicar.**
- **Hogares:** vía **tamaño medio del hogar** proyectado (tendencia decreciente −0,7%/año, piso 2,2 pers./hogar).
  Hogares = Población / tamaño. (La versión fina usa tasas de jefatura por edad — Fase 1.)
- **Viviendas:** Viviendas = Hogares × (viviendas/hogares observado 2024) → incorpora desocupación/segunda vivienda.
  La **demanda de vivienda nueva** = Δviviendas.

### 1.2 Bloque de uso de suelo
- **Serie reconstruida:** desde `anio_construccion` del catastro SII se reconstruye el **stock anual de m² por uso y
  comuna**; el flujo del año Y = m² de predios con año = Y.
- **Corrección de rezago:** los años recientes están sub-registrados. Comparando los cortes semestrales **2023-S2 vs
  2025-S2** se estimó la madurez por antigüedad (factor **2024 ×1,28 · 2023 ×1,08 · 2022 ×1,02**), con la que se
  inflan los flujos recientes (si no, el modelo "ve" una caída falsa al final).
- **Residencial (coherente con demografía):** el m² habitacional se ata a **Δviviendas × m²/vivienda** (no puede
  diverger de la población).
- **No residencial (comercio, educación, salud, oficina, industria):** **flujo-medio reciente** (ventana 7 años,
  rezago-corregido) — el método más robusto según el backtest (§2).
- **Escenarios:** **Tendencial** (flujo-medio), **Alto** (+30% del flujo / demografía alta), **Consolidación**
  (−30% / demografía baja).

---

## 2. Calibración y niveles de ajuste (backtesting)

Validación **temporal** (no aleatoria): se entrena con datos **≤ T0** y se predice **T0+7**, comparando con el stock
**observado** 2023/2024. Error = |predicho − observado| / observado. Se comparan **CAGR** (tasa compuesta) vs
**flujo-medio** (promedio del flujo reciente).

### 2.1 MAPE promedio por ciudad (T0 = 2016 → 2023)
| Ciudad | CAGR | **Flujo-medio (elegido)** |
|---|---:|---:|
| Gran Concepción | 27,4% | **10,2%** |
| Gran Santiago | 20,5% | **8,5%** |
| Gran Valparaíso | 29,1% | **7,4%** |
| Antofagasta | 10,5% | **14,8%** |
| Temuco | 31,9% | **12,1%** |
| La Serena-Coquimbo | 22,3% | **23,3%** |

**Decisión:** se elige **flujo-medio**. CAGR **sobre-reacciona** cuando un uso se acelera (extrapola la aceleración →
20–32% de error); flujo-medio es más estable (~8–15% en ciudades grandes). Coincide con el prototipo (MAPE ≈ 10% a 7 años).

### 2.2 MAPE por uso (flujo-medio) — dónde el modelo es fuerte y dónde no
| Ciudad | Habitac. | Comercio | Educación | Salud | Oficina | Industria |
|---|---:|---:|---:|---:|---:|---:|
| Gran Concepción | 3,0% | 11,3% | 8,5% | 16,7% | 17,4% | 4,5% |
| Gran Santiago | 0,6% | 11,4% | 0,2% | 18,3% | 13,3% | 7,1% |
| Gran Valparaíso | 1,5% | 7,4% | 4,6% | 24,4% | 0,6% | 6,1% |
| Antofagasta | 4,1% | 15,5% | 6,5% | 51,3% | 1,2% | 10,5% |
| Temuco | 0,0% | 3,2% | 3,9% | 45,7% | 3,1% | 16,8% |
| La Serena-Coquimbo | 2,3% | 18,0% | 3,0% | 74,8% | 5,4% | 36,1% |

**Lectura:**
- **Usos grandes y estables (Habitacional, Educación):** error típicamente **< 5%** a 7 años → el modelo simple es muy bueno.
- **Comercio, Oficina, Industria:** error **moderado (5–18%)**, con casos altos donde un megaproyecto domina el periodo base.
- **Salud:** **muy volátil (16–75%)** — un solo hospital mueve el total comunal. Para Salud hay que **agrupar
  (pooling nacional) y trabajar con escenarios/bandas**, no con punto. Es la principal mejora de la Fase 1.

---

## 3. Ejemplo aplicado de punta a cabo — Gran Concepción

**Demografía (tendencial):** 1.025.448 (2024) → **1.062.407 (2030)** → **1.094.806 (2035)** (+6,8% a 2035).

**Uso de suelo (m², escenario tendencial):**
| Uso | 2024 | 2030 | 2035 | Δ 2024→35 |
|---|---:|---:|---:|---:|
| Habitacional | 26.181.394 | 28.294.429 | 30.196.097 | +15,3% |
| Comercio | 3.512.334 | 4.206.153 | 4.784.331 | +36,2% |
| Educación | 1.731.803 | 2.133.758 | 2.468.722 | +42,6% |
| Salud | 431.357 | 537.698 | 626.314 | +45,2% |
| Oficina | 899.847 | 987.240 | 1.060.066 | +17,8% |
| Industria | 3.111.716 | 4.021.971 | 4.780.516 | +53,6% |

**Lectura y coherencia:**
- El **habitacional crece +15%** mientras la **población crece +6,8%** → más m²/habitante (hogares más chicos,
  segunda vivienda). Está **acotado por la coherencia con viviendas** (atado a Δviviendas), por eso no se dispara.
- **Industria (+54%) y Educación (+43%)** crecen fuerte: revisar **sensibilidad a megaproyectos** del periodo base
  (el flujo-medio reciente puede estar arrastrado por una o dos obras grandes). Los escenarios Alto/Consolidación
  (±30%) acotan ese rango.
- **Salud (+45%)** debe leerse con cautela por su alta volatilidad (ver §2.2).

---

## 4. Límites y advertencias (explícitos)

1. **Demografía provisional (fallback).** Falta el archivo de **proyecciones INE por comuna 2002–2035**; al
   incorporarlo, la población/hogares/viviendas deben recalcularse. Es el reemplazo #1 antes de publicar.
2. **Solo dos cortes censales (2017, 2024):** la tendencia demográfica propia es débil; por eso se apoya en INE.
3. **Rezago de catastro:** los años recientes se corrigen con la curva de madurez, pero queda incertidumbre.
4. **Quiebres no capturados:** cambios de Plan Regulador, shocks o grandes proyectos no se modelan salvo vía escenarios.
5. **Cobertura SII:** 4 comunas sin catastro enriquecido (solo demografía); subdivisiones SII de Santiago consolidadas.
6. **Uso efectivo (fiscal), no normativo.** Son **escenarios**, no certezas.

### Próximos pasos (Fases 1–2)
- Fase 1: incorporar INE; modelo **panel/GBM con catch-up** y pooling para usos volátiles; bandas **P10/P50/P90**
  formales desde el error de backtest; tasas de jefatura por edad.
- Fase 2: **asignación espacial** del m² proyectado a manzanas/zonas (densificación vs expansión) → mapas proyectados;
  perillas de política (límite urbano, incentivo a densificar).

---
*Salidas: `data/proyecciones/<cut>.json`, `data/proyecciones_comunas.json`, `data/proyecciones_backtest.json`,
`revision_proyecciones/proyecciones_preview.html`. Generado por `scripts/proy_build.py`. **No publicado.***
