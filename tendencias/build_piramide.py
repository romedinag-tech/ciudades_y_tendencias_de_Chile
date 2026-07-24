# -*- coding: utf-8 -*-
"""Pirámide poblacional animable 2002-2035 (edad x sexo x año) por ciudad/comuna,
desde la proyección INE 2002-2035 por comuna. Reusa las definiciones de ciudad
(id + comunas) de data/envejecimiento/*.json para calzar con el front.

Salida: data/piramide_index.json (anios, grupos, ids) + data/piramide/<id>.json ({id,nombre,H,M}).
H y M = matrices [año][grupo] de población (hombres / mujeres).
"""
import os, re, json, glob
import pandas as pd, numpy as np

ROOT = os.path.dirname(os.path.abspath(__file__))
XLSX = os.path.join(ROOT, "..", "Proyecciones Censo", "estimaciones-y-proyecciones-2002-2035-comunas.xlsx")
ENV  = os.path.join(ROOT, "data", "envejecimiento")
OUT  = os.path.join(ROOT, "data", "piramide"); os.makedirs(OUT, exist_ok=True)

GRUPOS = ['0-4','5-9','10-14','15-19','20-24','25-29','30-34','35-39','40-44',
          '45-49','50-54','55-59','60-64','65-69','70-74','75-79','80+']
def grp(e):
    try: e = int(re.match(r"\d+", str(e)).group())
    except Exception: e = 100
    return 16 if e >= 80 else e // 5

print("Leyendo INE (11 MB, puede tardar)...")
df = pd.read_excel(XLSX)
comcol = next(c for c in df.columns if c.strip().lower() == "comuna")
sexcol = next(c for c in df.columns if "sexo" in c.lower())
edadcol = next(c for c in df.columns if c.strip().lower() == "edad")
yearcols = [c for c in df.columns if str(c).lower().startswith("poblacion")]
ANIOS = sorted(int(re.search(r"\d{4}", str(c)).group()) for c in yearcols)
yidx = {a: i for i, a in enumerate(ANIOS)}

df = df[[comcol, sexcol, edadcol] + yearcols].copy()
df["cut"] = df[comcol].apply(lambda x: str(int(x)))
df["sx"]  = pd.to_numeric(df[sexcol], errors="coerce")
df["g"]   = df[edadcol].map(grp)
long = df.melt(id_vars=["cut", "sx", "g"], value_vars=yearcols, var_name="anio", value_name="pob")
long["anio"] = long["anio"].str.extract(r"(\d{4})").astype(int)
long["pob"]  = pd.to_numeric(long["pob"], errors="coerce").fillna(0)
agg = long.groupby(["cut", "sx", "anio", "g"], as_index=False)["pob"].sum()

# percut[cut] = array (2 sexos, nAnios, nGrupos)
percut = {}
for cut, sx, anio, g, pob in agg.itertuples(index=False):
    if sx not in (1, 2): continue
    a = percut.setdefault(cut, np.zeros((2, len(ANIOS), len(GRUPOS)), dtype=np.int64))
    a[int(sx) - 1, yidx[int(anio)], int(g)] += int(pob)
print(f"comunas con datos: {len(percut)}")

json.dump({"anios": ANIOS, "grupos": GRUPOS, "ids": []},
          open(os.path.join(ROOT, "data", "piramide_index.json"), "w", encoding="utf-8"), ensure_ascii=False)

ids = []
for fp in glob.glob(os.path.join(ENV, "*.json")):
    e = json.load(open(fp, encoding="utf-8"))
    cuts = [str(c) for c in e.get("comunas", [])]
    arrs = [percut[c] for c in cuts if c in percut]
    if not arrs: continue
    tot = np.sum(arrs, axis=0)
    out = {"id": e["id"], "nombre": e.get("nombre", e["id"]),
           "H": tot[0].tolist(), "M": tot[1].tolist()}
    json.dump(out, open(os.path.join(OUT, e["id"] + ".json"), "w", encoding="utf-8"), ensure_ascii=False)
    ids.append(e["id"])

idx = {"anios": ANIOS, "grupos": GRUPOS, "ids": sorted(ids)}
json.dump(idx, open(os.path.join(ROOT, "data", "piramide_index.json"), "w", encoding="utf-8"), ensure_ascii=False)
print(f"OK · {len(ids)} ciudades · años {ANIOS[0]}-{ANIOS[-1]} · {len(GRUPOS)} grupos")
# verificación: GC (área) o Puerto Montt
ej = json.load(open(os.path.join(OUT, ids[0] + ".json"), encoding="utf-8"))
print(f"ejemplo {ej['nombre']}: H[2002]={ej['H'][0][:4]}... H[2035]={ej['H'][-1][:4]}... grupos 80+ 2002={ej['H'][0][-1]}/{ej['M'][0][-1]} vs 2035={ej['H'][-1][-1]}/{ej['M'][-1][-1]}")
