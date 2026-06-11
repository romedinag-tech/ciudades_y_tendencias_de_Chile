/* ===================================================================
   Plataforma nacional de uso de suelo y población — Chile
   Datos: kpis_comunas.json (345 comunas) + metro_areas.json + comunas.geojson
   Mapas zonales / dinámica por comuna: lazy-load data/zonas|intercensal|crecimiento/<slug>.(geo)json
   =================================================================== */
const NAVY="#1f4e79",NAVY2="#2e5e8c",OR="#c55a11",TEAL="#21918c",GREEN="#1a9850",RED="#d73027",GREY="#9aa7b4";
Chart.defaults.font.family="Inter,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif";
Chart.defaults.color="#5e6e80";
if(window.ChartDataLabels){Chart.register(ChartDataLabels);Chart.defaults.plugins.datalabels.display=false;}

const R={
 YlOrRd:["#ffffb2","#fecc5c","#fd8d3c","#f03b20","#bd0026"],
 PuBu:["#f1eef6","#bdc9e1","#74a9cf","#2b8cbe","#045a8d"],
 Viridis:["#440154","#3b528b","#21918c","#5ec962","#fde725"],
 Greens:["#edf8e9","#bae4b3","#74c476","#31a354","#006d2c"],
 OrRd:["#fef0d9","#fdcc8a","#fc8d59","#e34a33","#b30000"],
 BuPu:["#edf8fb","#b3cde3","#8c96c6","#8856a7","#810f7c"],
 RdYlGn:["#d73027","#fc8d59","#fee08b","#91cf60","#1a9850"]};
// Nivel socioeconómico: 5 clases fijas (no quintiles dinámicos)
const NSE_COLORS={1:"#d73027",2:"#fc8d59",3:"#fee08b",4:"#91cf60",5:"#1a9850"};
const NSE_LABEL={1:"Bajo",2:"Medio-bajo",3:"Medio",4:"Medio-alto",5:"Alto"};
function nseLevel(score){if(score==null)return null;const t=(S.nseMeta&&S.nseMeta.umbral_score_inicio_nivel)||{};
 if(score>=(t["Alto"]??80))return 5; if(score>=(t["Medio-alto"]??60))return 4;
 if(score>=(t["Medio"]??40))return 3; if(score>=(t["Medio-bajo"]??20))return 2; return 1;}

/* ---------- catálogo de KPIs ----------
   agg: 'sum' | 'wmean' | 'dens' | 'varpct'   (cómo se agrega un área metropolitana)
   wt : campo de ponderación para wmean
   sii: requiere catastro SII (puede venir null)
   log: escala log para cortes de color / mapas                         */
const KPI={
 pob_2024:   {lbl:"Población 2024",grp:"Demografía y vivienda (Censo 2024)",u:"",dec:0,agg:"sum",sii:false,ramp:"YlOrRd",log:true},
 var_pct:    {lbl:"Crecimiento de población 2017→2024",grp:"Demografía y vivienda (Censo 2024)",u:"%",dec:1,agg:"varpct",sii:false,ramp:"Greens",log:false},
 dens_hab_ha:{lbl:"Densidad poblacional (área comunal)",grp:"Demografía y vivienda (Censo 2024)",u:"hab/ha",dec:1,agg:"dens",sii:false,ramp:"YlOrRd",log:true},
 dens_consol:{lbl:"Densidad del sector consolidado",grp:"Demografía y vivienda (Censo 2024)",u:"hab/ha",dec:1,agg:"dens_consol",sii:false,ramp:"YlOrRd",log:true},
 pct_depto:  {lbl:"Viviendas en departamento",grp:"Demografía y vivienda (Censo 2024)",u:"%",dec:1,agg:"wmean",wt:"viviendas",sii:false,ramp:"BuPu",log:false},
 per_hog:    {lbl:"Personas por hogar",grp:"Demografía y vivienda (Censo 2024)",u:"",dec:2,agg:"wmean",wt:"hogares",sii:false,ramp:"OrRd",log:false},
 pct_60mas:  {lbl:"Población de 60 años o más",grp:"Demografía y vivienda (Censo 2024)",u:"%",dec:1,agg:"wmean",wt:"pob_2024",sii:false,ramp:"OrRd",log:false},
 pct_inmig:  {lbl:"Población inmigrante",grp:"Demografía y vivienda (Censo 2024)",u:"%",dec:1,agg:"wmean",wt:"pob_2024",sii:false,ramp:"BuPu",log:false},
 escol:      {lbl:"Escolaridad promedio (18+)",grp:"Demografía y vivienda (Censo 2024)",u:"años",dec:1,agg:"wmean",wt:"pob_2024",sii:false,ramp:"Viridis",log:false},
 pct_hacin:  {lbl:"Viviendas hacinadas",grp:"Demografía y vivienda (Censo 2024)",u:"%",dec:1,agg:"wmean",wt:"viviendas",sii:false,ramp:"YlOrRd",log:false},
 pct_arriendo:{lbl:"Hogares arrendatarios",grp:"Demografía y vivienda (Censo 2024)",u:"%",dec:1,agg:"wmean",wt:"hogares",sii:false,ramp:"PuBu",log:false},
 nse_score:{lbl:"Nivel socioeconómico (índice)",grp:"Demografía y vivienda (Censo 2024)",u:"/100",dec:0,agg:"wmean",wt:"pob_2024",sii:false,ramp:"RdYlGn",log:false,nse:true},
 pct_terciaria:{lbl:"Educación terciaria (18+)",grp:"Demografía y vivienda (Censo 2024)",u:"%",dec:1,agg:"wmean",wt:"pob_2024",sii:false,ramp:"Greens",log:false},
 pct_ciuo123:{lbl:"Ocupados directivos/profesionales/técnicos",grp:"Demografía y vivienda (Censo 2024)",u:"%",dec:1,agg:"wmean",wt:"pob_2024",sii:false,ramp:"BuPu",log:false},
 pct_internet:{lbl:"Viviendas con internet",grp:"Demografía y vivienda (Censo 2024)",u:"%",dec:1,agg:"wmean",wt:"viviendas",sii:false,ramp:"PuBu",log:false},
 casen_ing_pc:{lbl:"Ingreso del hogar per cápita (mediana)",grp:"Ingreso y pobreza (CASEN 2024)",u:"CLP",dec:0,agg:"wmean",wt:"pob_2024",sii:false,ramp:"Greens",log:true},
 casen_pobreza_pct:{lbl:"Pobreza por ingresos",grp:"Ingreso y pobreza (CASEN 2024)",u:"%",dec:1,agg:"wmean",wt:"pob_2024",sii:false,ramp:"OrRd",log:false},
 m2_total:   {lbl:"Superficie construida total",grp:"Uso de suelo (Catastro SII)",u:"m²",dec:0,agg:"sum",sii:true,ramp:"Viridis",log:true},
 m2pp_tot:   {lbl:"Suelo construido / habitante",grp:"Uso de suelo (Catastro SII)",u:"m²/hab",dec:1,agg:"wmean",wt:"pob_2024",sii:true,ramp:"Viridis",log:true},
 m2pp_hab:   {lbl:"Suelo habitacional / hab.",grp:"Uso de suelo (Catastro SII)",u:"m²/hab",dec:1,agg:"wmean",wt:"pob_2024",sii:true,ramp:"Greens",log:true},
 m2pp_comercio:{lbl:"Comercio / hab.",grp:"Uso de suelo (Catastro SII)",u:"m²/hab",dec:2,agg:"wmean",wt:"pob_2024",sii:true,ramp:"OrRd",log:true},
 m2pp_educacion:{lbl:"Educación y cultura / hab.",grp:"Uso de suelo (Catastro SII)",u:"m²/hab",dec:2,agg:"wmean",wt:"pob_2024",sii:true,ramp:"BuPu",log:true},
 m2pp_salud: {lbl:"Salud / hab.",grp:"Uso de suelo (Catastro SII)",u:"m²/hab",dec:2,agg:"wmean",wt:"pob_2024",sii:true,ramp:"YlOrRd",log:true},
 m2pp_oficina:{lbl:"Oficina / hab.",grp:"Uso de suelo (Catastro SII)",u:"m²/hab",dec:2,agg:"wmean",wt:"pob_2024",sii:true,ramp:"PuBu",log:true},
 m2pp_industria:{lbl:"Industria / hab.",grp:"Uso de suelo (Catastro SII)",u:"m²/hab",dec:2,agg:"wmean",wt:"pob_2024",sii:true,ramp:"OrRd",log:true},
 m2pp_deporte:{lbl:"Deporte y recreación / hab.",grp:"Uso de suelo (Catastro SII)",u:"m²/hab",dec:2,agg:"wmean",wt:"pob_2024",sii:true,ramp:"Greens",log:true},
 pct_8pisos: {lbl:"Predios de 8+ pisos (verticalización)",grp:"Uso de suelo (Catastro SII)",u:"%",dec:1,agg:"wmean",wt:"n_predios",sii:true,ramp:"BuPu",log:false},
 ratio_depto_casa:{lbl:"Ratio departamento ÷ casa (construido)",grp:"Uso de suelo (Catastro SII)",u:"",dec:2,agg:"wmean",wt:"n_predios",sii:true,ramp:"PuBu",log:false},
 anio_mediano:{lbl:"Antigüedad — año de construcción mediano",grp:"Uso de suelo (Catastro SII)",u:"",dec:0,agg:"wmean",wt:"n_predios",sii:true,ramp:"OrRd",log:false},
 valor_suelo_med:{lbl:"Valor de suelo mediano",grp:"Uso de suelo (Catastro SII)",u:"CLP/m²",dec:0,agg:"wmean",wt:"n_predios",sii:true,ramp:"YlOrRd",log:true},
 avaluo_total:{lbl:"Avalúo fiscal total",grp:"Avalúo fiscal (Catastro SII)",u:"millones CLP",dec:0,agg:"sum",sii:true,ramp:"Greens",log:true},
 avaluo_pp:{lbl:"Avalúo fiscal per cápita",grp:"Avalúo fiscal (Catastro SII)",u:"CLP/hab",dec:0,agg:"wmean",wt:"pob_2024",sii:true,ramp:"Greens",log:true},
 pct_exento:{lbl:"Avalúo exento (sin contribuciones)",grp:"Avalúo fiscal (Catastro SII)",u:"%",dec:1,agg:"wmean",wt:"avaluo_total",sii:true,ramp:"OrRd",log:false},
 valor_suelo:{lbl:"Valor de suelo mediano",grp:"Uso de suelo (Catastro SII)",u:"CLP/m²",dec:0,ramp:"YlOrRd",log:true,cmpKey:"valor_suelo_med"},
 pct_tpub:{lbl:"Viajes al trabajo en transporte público",grp:"Movilidad (Censo 2024)",u:"%",dec:1,agg:"wmean",wt:"ocup_modal",ramp:"PuBu",log:false},
 pct_auto:{lbl:"Viajes al trabajo en auto",grp:"Movilidad (Censo 2024)",u:"%",dec:1,agg:"wmean",wt:"ocup_modal",ramp:"OrRd",log:false},
 pct_activa:{lbl:"Movilidad activa (caminata + bicicleta)",grp:"Movilidad (Censo 2024)",u:"%",dec:1,agg:"wmean",wt:"ocup_modal",ramp:"Greens",log:false},
 pct_teletrabajo:{lbl:"Teletrabajo (trabaja en su vivienda)",grp:"Movilidad (Censo 2024)",u:"%",dec:1,agg:"wmean",wt:"ocup_modal",ramp:"BuPu",log:false},
 pct_fuera:{lbl:"Trabaja fuera de su comuna",grp:"Movilidad (Censo 2024)",u:"%",dec:1,agg:"wmean",wt:"ocup_modal",ramp:"OrRd",log:false},
 viajes_atraidos:{lbl:"Atracción de viajes (trabajan aquí, viven en otra comuna)",grp:"Movilidad (Censo 2024)",u:"ocupados",dec:0,agg:"sum",ramp:"Viridis",log:true}
};
// indicadores que existen a nivel zona censal (para el módulo Oferta)
const ZKEYS=["nse_score","dens_hab_ha","pct_depto","per_hog","pct_60mas","pct_inmig","escol","pct_hacin","pct_arriendo",
 "m2pp_tot","m2pp_hab","m2pp_comercio","m2pp_educacion","m2pp_salud","m2pp_oficina","m2pp_industria","m2pp_deporte","valor_suelo"];

/* ---------- estado global ---------- */
const S={kpis:[],byCut:{},metros:{},comunasGeo:null,natAgg:{},natMed:{},sel:null,
 zonasCache:{},interCache:{},crecCache:{}};
// slugs con mapa zonal (Oferta) y con crecimiento. Se pueblan desde los manifiestos
// data/zonas_index.json y data/crecimiento_index.json (9 áreas + comunas individuales).
// GC se incluye por defecto como fallback si el manifiesto no carga.
const HAS_ZONAL={"gran_concepcion":1};
const HAS_CREC={"gran_concepcion":1};
// intercensal por zona (toggle "Por zona"): sólo donde el geojson trae vpct/pob17 (de momento GC)
const HAS_ZONAL_INTER={"gran_concepcion":1};
// cobertura zonal (comunas omitidas por falta de catastro enriquecido)
let ZCOV={};

/* ---------- utilidades ---------- */
// loader tolerante: Python escribe NaN/Infinity (no válidos en JSON) → null
function getJSON(url){return fetch(url).then(r=>r.text())
 .then(t=>JSON.parse(t.replace(/\bNaN\b/g,"null").replace(/-?\bInfinity\b/g,"null")));}
const num=x=>x==null||!isFinite(x)?null:x;
function fmt(x,d){if(x==null||!isFinite(x))return "s/d";
 return x.toLocaleString('es-CL',{minimumFractionDigits:d,maximumFractionDigits:d});}
function fmtKpi(k,x){if(x==null||!isFinite(x))return "s/d";const m=KPI[k];
 if(k==="anio_mediano")return String(Math.round(x));
 let s=fmt(x,m.dec); if(m.u==="%")s+="%"; else if(m.u)s+=" "+m.u; return s;}
function sg(v){return (v>=0?"+":"")+v;}
function slugify(s){return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"")
 .replace(/\([^)]*\)/g,"").replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"");}

/* ---------- agregación de un conjunto de comunas ---------- */
function aggregate(rows,k){const m=KPI[k];
 if(m.agg==="sum"){let s=0,any=false;rows.forEach(r=>{if(num(r[k])!=null){s+=r[k];any=true;}});return any?s:null;}
 if(m.agg==="varpct"){let a=0,p=0;rows.forEach(r=>{if(num(r.var_abs)!=null&&num(r.pob_2017)){a+=r.var_abs;p+=r.pob_2017;}});return p>0?100*a/p:null;}
 if(m.agg==="dens"){let P=0,A=0;rows.forEach(r=>{if(num(r.dens_hab_ha)>0&&num(r.pob_2024)>0){P+=r.pob_2024;A+=r.pob_2024/r.dens_hab_ha;}});return A>0?P/A:null;}
 if(m.agg==="dens_consol"){let P=0,A=0;rows.forEach(r=>{if(num(r.pob_consol)>0&&num(r.area_consol)>0){P+=r.pob_consol;A+=r.area_consol;}});return A>0?P/A:null;}
 // wmean
 let nu=0,de=0;rows.forEach(r=>{const v=num(r[k]),w=num(r[m.wt]);if(v!=null&&w>0){nu+=v*w;de+=w;}});
 return de>0?nu/de:null;}
function median(arr){const v=arr.filter(x=>x!=null&&isFinite(x)).sort((a,b)=>a-b);
 if(!v.length)return null;const i=Math.floor(v.length/2);return v.length%2?v[i]:(v[i-1]+v[i])/2;}

/* ---------- selección: comuna o metro ---------- */
function selectComuna(cut){const r=S.byCut[cut];if(!r)return;
 S.sel={type:"comuna",key:cut,name:titleCase(r.comuna),cuts:[cut],rows:[r],region:r.region,metro:r.metro};
 finishSelect();}
function selectMetro(name){const cuts=S.metros[name]||[];const rows=cuts.map(c=>S.byCut[c]).filter(Boolean);
 if(!rows.length)return;
 S.sel={type:"metro",key:name,name:name,cuts:rows.map(r=>r.cut),rows:rows,region:rows[0].region,metro:name};
 finishSelect();}
// comunas del "grupo" para las barras comparativas (área, o región si es comuna suelta)
function groupRows(){const s=S.sel;
 if(s.type==="metro")return s.rows;
 if(s.metro&&S.metros[s.metro])return S.metros[s.metro].map(c=>S.byCut[c]).filter(Boolean);
 return S.kpis.filter(r=>r.region===s.region);}
function groupLabel(){const s=S.sel;
 if(s.type==="metro")return "área metropolitana";
 if(s.metro)return s.metro; return "Región "+titleCase(s.region);}
// agregado del grupo seleccionado (para la ficha)
function selAgg(k){return aggregate(S.sel.rows,k);}
// info NSE de un conjunto de comunas: score ponderado por población -> nivel/label
function nseInfo(rows){const s=aggregate(rows,"nse_score");if(s==null)return null;
 const n=nseLevel(s);return {score:s,nivel:n,label:NSE_LABEL[n]};}
function dataSlug(){const s=S.sel;
 if(s.type==="metro")return slugify(s.key);
 // comuna dentro de un metro con datos → usa el metro
 if(s.metro&&HAS_ZONAL[slugify(s.metro)])return slugify(s.metro);
 return "c"+s.key;}

function titleCase(s){return (s||"").toLowerCase().replace(/(^|[\s\-\/])([a-záéíóúñü])/g,(m,p,c)=>p+c.toUpperCase());}

/* =================================================================
   CARGA INICIAL
   ================================================================= */
Promise.all([
 getJSON("data/kpis_comunas.json?v=3"),
 getJSON("data/metro_areas.json"),
 getJSON("data/comunas.geojson"),
 getJSON("data/zonas_index.json").catch(()=>({slugs:[]})),
 getJSON("data/crecimiento_index.json").catch(()=>({slugs:[]})),
 getJSON("data/ranking_growth.json").catch(()=>({})),
 getJSON("data/intercensal_index.json").catch(()=>({slugs:[]}))
]).then(([kp,ma,geo,zi,ci,rg,ii])=>{
 S.kpis=kp.comunas; S.metros=ma.metros; S.comunasGeo=geo; S.rg=rg||{}; S.nseMeta=(kp.meta&&kp.meta.nse)||null;
 (zi.slugs||[]).forEach(s=>HAS_ZONAL[s]=1);
 (ci.slugs||[]).forEach(s=>HAS_CREC[s]=1);
 (ii.slugs||[]).forEach(s=>HAS_ZONAL_INTER[s]=1);
 S.kpis.forEach(r=>S.byCut[r.cut]=r);
 // estadísticas nacionales (promedio del país agregando todas las comunas, y mediana entre comunas)
 Object.keys(KPI).forEach(k=>{S.natAgg[k]=aggregate(S.kpis,k);S.natMed[k]=median(S.kpis.map(r=>num(r[k])));});
 const nSii=S.kpis.filter(r=>num(r.m2_total)!=null).length;
 document.getElementById("htag").textContent=S.kpis.length+" comunas · "+Object.keys(S.metros).length+" áreas metropolitanas · "+nSii+" con catastro SII";
 document.getElementById("nt-sii").textContent=nSii;
 buildSelector(); buildComparador(); buildRegionNav(); buildRanking();
 // cobertura zonal (no bloquea; sólo para la nota de comunas omitidas)
 getJSON("data/zonas_cobertura.json").then(c=>{ZCOV=c;}).catch(()=>{});
 // selección inicial desde la URL (enlace compartido) o Gran Concepción por defecto
 applyURL();
}).catch(e=>{document.body.insertAdjacentHTML("afterbegin",
 '<div class="loading">No se pudieron cargar los datos: '+e+'</div>');});

/* =================================================================
   SELECTOR (buscador comuna / área)
   ================================================================= */
function selectorOptions(){
 const opts=[];
 Object.keys(S.metros).forEach(n=>{const rows=S.metros[n].map(c=>S.byCut[c]).filter(Boolean);
  opts.push({kind:"metro",key:n,label:n,sub:rows.length+" comunas",region:rows[0]?titleCase(rows[0].region):"",metro:true});});
 S.kpis.forEach(r=>opts.push({kind:"comuna",key:r.cut,label:titleCase(r.comuna),sub:titleCase(r.region),region:titleCase(r.region)}));
 return opts;
}
function buildSelector(){
 const box=document.getElementById("cbox"),list=document.getElementById("clist");
 const ALL=selectorOptions();let hi=-1,shown=[];
 function render(q){q=(q||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");
  shown=ALL.filter(o=>(o.label+" "+o.sub).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").includes(q));
  const metros=shown.filter(o=>o.kind==="metro"),comunas=shown.filter(o=>o.kind==="comuna").slice(0,120);
  let h="";
  if(metros.length){h+='<div class="grouphd">Áreas metropolitanas</div>';
   metros.forEach(o=>h+=optHtml(o));}
  if(comunas.length){h+='<div class="grouphd">Comunas</div>';comunas.forEach(o=>h+=optHtml(o));}
  if(!shown.length)h='<div class="opt">Sin resultados</div>';
  list.innerHTML=h;list.style.display="block";hi=-1;
  shown=metros.concat(comunas);
  [...list.querySelectorAll(".opt")].forEach((el,i)=>{el.onclick=()=>pick(shown[i]);});}
 function optHtml(o){return '<div class="opt"><span>'+o.label+(o.metro?' <span class="badge">Metro</span>':"")+
   '</span><span class="rg">'+o.sub+'</span></div>';}
 function pick(o){if(!o)return;box.value=o.label;list.style.display="none";
  if(o.kind==="metro")selectMetro(o.key);else selectComuna(o.key);}
 box.addEventListener("focus",()=>render(box.value));
 box.addEventListener("input",()=>render(box.value));
 box.addEventListener("keydown",e=>{const els=list.querySelectorAll(".opt");
  if(e.key==="ArrowDown"){hi=Math.min(hi+1,shown.length-1);}
  else if(e.key==="ArrowUp"){hi=Math.max(hi-1,0);}
  else if(e.key==="Enter"){if(hi>=0)pick(shown[hi]);else if(shown.length)pick(shown[0]);return;}
  else return;
  e.preventDefault();els.forEach((el,i)=>el.classList.toggle("hi",i===hi));
  if(els[hi])els[hi].scrollIntoView({block:"nearest"});});
 document.addEventListener("click",e=>{if(!e.target.closest(".field"))list.style.display="none";});
}

/* =================================================================
   MENÚ LATERAL POR REGIÓN (norte → sur)
   ================================================================= */
const GEO=[15,1,2,3,4,5,13,6,7,16,8,9,14,10,11,12];
function buildRegionNav(){
 const list=document.getElementById("rn-list");if(!list)return;
 const byReg={};
 S.kpis.forEach(r=>{(byReg[r.region_cod]=byReg[r.region_cod]||{name:titleCase(r.region),comunas:[]}).comunas.push(r);});
 const metrosByReg={};
 Object.keys(S.metros).forEach(mn=>{const first=S.metros[mn].map(c=>S.byCut[c]).filter(Boolean)[0];
  if(first)(metrosByReg[first.region_cod]=metrosByReg[first.region_cod]||[]).push(mn);});
 const order=Object.keys(byReg).sort((a,b)=>{
  let ra=GEO.indexOf(parseInt(a,10)),rb=GEO.indexOf(parseInt(b,10));
  return (ra<0?99:ra)-(rb<0?99:rb);});
 let h="";
 order.forEach(rc=>{const reg=byReg[rc];
  const comunas=[...reg.comunas].sort((a,b)=>(b.pob_2024||0)-(a.pob_2024||0));
  let inner="";
  (metrosByReg[rc]||[]).forEach(mn=>{inner+='<button class="metro" data-selkey="m:'+mn+'" data-metro="'+encodeURIComponent(mn)+'">'+
    '<span>'+mn+'<span class="mbadge">Área</span></span></button>';});
  comunas.forEach(r=>{inner+='<button data-selkey="c:'+r.cut+'" data-cut="'+r.cut+'">'+
    '<span>'+titleCase(r.comuna)+'</span><span class="pob">'+(r.pob_2024?Math.round(r.pob_2024/1000)+'k hab':'')+'</span></button>';});
  h+='<div class="rn-region" data-reg="'+rc+'"><div class="rn-head"><span class="rt"><span class="chev">▶</span>'+reg.name+
     '</span><span class="cnt">'+comunas.length+'</span></div><div class="rn-comunas">'+inner+'</div></div>';});
 list.innerHTML=h;
 // acordeón: una región abierta a la vez
 list.querySelectorAll(".rn-region").forEach(rg=>{
  rg.querySelector(".rn-head").onclick=()=>{const open=rg.classList.contains("open");
   list.querySelectorAll(".rn-region").forEach(x=>x.classList.remove("open"));
   if(!open)rg.classList.add("open");};});
 // selección de comuna/área
 list.querySelectorAll(".rn-comunas button").forEach(b=>{b.onclick=()=>{
  const m=b.getAttribute("data-metro");
  if(m)selectMetro(decodeURIComponent(m));else selectComuna(b.getAttribute("data-cut"));
  if(window.innerWidth<=900)document.getElementById("regionnav").classList.add("collapsed");
  window.scrollTo({top:0,behavior:"smooth"});};});
 const tg=document.getElementById("sbToggle");
 if(tg)tg.onclick=()=>document.getElementById("regionnav").classList.toggle("collapsed");
 if(window.innerWidth<=900)document.getElementById("regionnav").classList.add("collapsed");  // móvil/tablet: el menú de regiones parte plegado (se abre con ☰)
}
function updateRegionNavActive(){const list=document.getElementById("rn-list");if(!list||!S.sel)return;
 const key=S.sel.type==="metro"?("m:"+S.sel.key):("c:"+S.sel.key);
 list.querySelectorAll(".rn-comunas button").forEach(b=>b.classList.toggle("on",b.getAttribute("data-selkey")===key));
 const active=list.querySelector(".rn-comunas button.on");
 if(active){const rg=active.closest(".rn-region");
  if(rg&&!rg.classList.contains("open")){list.querySelectorAll(".rn-region").forEach(x=>x.classList.remove("open"));rg.classList.add("open");}
  active.scrollIntoView({block:"nearest"});}
}

/* =================================================================
   despues de seleccionar → refrescar todo
   ================================================================= */
function finishSelect(){
 const s=S.sel;document.getElementById("cbox").value=s.name;
 // contexto
 let ctx="";
 if(s.type==="metro")ctx='<b>'+s.name+'</b> · '+s.cuts.length+' comunas · '+titleCase(s.region);
 else ctx='<b>'+s.name+'</b> · '+titleCase(s.region)+(s.metro?' · pertenece a '+s.metro:'');
 document.getElementById("selctx").innerHTML=ctx;
 renderResumen(); renderOferta(); renderDinamica(); updateRegionNavActive();
 if(document.getElementById("p-ranking").classList.contains("on"))drawRanking();
 syncTendCity();   // tendencias embebidas siguen la ciudad seleccionada
 if(typeof writeURL==="function")writeURL();   // refleja la ciudad en la URL (compartible)
}

/* =================================================================
   TAB 1 · RESUMEN
   ================================================================= */
// polaridad: dónde "más es mejor" (verde si > nacional) o "menos es mejor" (verde si < nacional). Resto = neutro (gris).
const POS_HI=new Set(["escol","pct_terciaria","pct_ciuo123","pct_internet","casen_ing_pc","nse_score",
 "m2pp_tot","m2pp_hab","m2pp_comercio","m2pp_educacion","m2pp_salud","m2pp_oficina","m2pp_deporte"]);
const POS_LO=new Set(["pct_hacin","casen_pobreza_pct"]);
function kpiCard(k,extraClass){const v=selAgg(k);const m=KPI[k];
 let cls="v",sub="";
 if(k==="var_pct"&&v!=null){cls+=v>=0?" green":" red";sub='<div class="s">'+sg(fmt(v,1))+'% vs Censo 2017</div>';}
 const nat=S.natAgg[k];
 if(!sub&&nat!=null&&v!=null&&k!=="anio_mediano"){
  const above=(v-nat)>=0;const arrow=above?"▲":"▼";
  let color=GREY;                                    // neutro: solo informa arriba/abajo
  if(POS_HI.has(k))color=above?GREEN:RED;            // más es mejor
  else if(POS_LO.has(k))color=above?RED:GREEN;       // menos es mejor
  sub='<div class="s" style="color:'+color+'">'+arrow+' '+fmt(Math.abs(v-nat),m.dec)+(m.u==="%"?"%":"")+' vs nacional</div>';}
 return '<div class="kpi"><div class="'+cls+'">'+(k==="var_pct"&&v!=null?sg(fmt(v,1))+"%":fmtKpi(k,v))+
   '</div><div class="l">'+m.lbl+(m.u&&m.u!=="%"?" ("+m.u+")":"")+'</div>'+sub+'</div>';}
function renderResumen(){const s=S.sel;
 document.getElementById("res-title").innerHTML=s.name+'<span class="bar"></span>';
 const pob=selAgg("pob_2024"),vp=selAgg("var_pct"),m2=selAgg("m2_total");
 const hasSii=s.rows.some(r=>num(r.m2_total)!=null);
 let lead=s.type==="metro"
  ? 'Área metropolitana de <b>'+s.cuts.length+' comunas</b>, '+fmt(pob,0)+' habitantes (2024). Los indicadores agregan las comunas del área.'
  : 'Comuna de la '+titleCase(s.region)+', '+fmt(pob,0)+' habitantes (2024)'+(s.metro?', parte del '+s.metro:'')+'.';
 if(vp!=null)lead+=' Población '+(vp>=0?'creció':'cayó')+' <b style="color:'+(vp>=0?GREEN:RED)+'">'+sg(fmt(vp,1))+'%</b> entre censos.';
 if(!hasSii)lead+=' <b>Sin catastro SII enriquecido</b>: se muestran solo indicadores censales.';
 document.getElementById("res-lead").innerHTML=lead;
 const demog=["pob_2024","var_pct","dens_hab_ha","dens_consol","pct_depto","per_hog","pct_60mas","pct_inmig","escol","pct_terciaria","pct_ciuo123","pct_internet","pct_hacin","pct_arriendo"];
 // tarjeta NSE destacada (nivel coloreado + score)
 const nse=nseInfo(s.rows);
 let nseCard="";
 if(nse){nseCard='<div class="kpi" style="border-left:5px solid '+NSE_COLORS[nse.nivel]+'">'+
   '<div class="v" style="color:'+NSE_COLORS[nse.nivel]+'">'+nse.label+'</div>'+
   '<div class="l">Nivel socioeconómico (índice '+Math.round(nse.score)+'/100)</div>'+
   '<div class="s" style="color:'+NSE_COLORS[nse.nivel]+'">quintil de ingreso (CASEN 2024)</div></div>';}
 const casen=["casen_ing_pc","casen_pobreza_pct"];
 const sii=["m2_total","m2pp_tot","m2pp_hab","m2pp_comercio","m2pp_educacion","m2pp_salud","m2pp_oficina","m2pp_industria","m2pp_deporte","pct_8pisos","ratio_depto_casa","anio_mediano","valor_suelo_med"];
 let h='<div class="grp-hd">Demografía y vivienda (Censo 2024)</div><div class="kpis">'+nseCard+demog.map(k=>kpiCard(k)).join("")+'</div>';
 h+='<div class="grp-hd">Ingreso y pobreza (CASEN 2024)</div><div class="kpis">'+casen.map(k=>kpiCard(k)).join("")+'</div>';
 if(hasSii)h+='<div class="grp-hd">Uso de suelo — uso efectivo (Catastro SII)</div><div class="kpis">'+sii.map(k=>kpiCard(k)).join("")+'</div>';
 const avaluo=["avaluo_total","avaluo_pp","pct_exento"];
 if(s.rows.some(r=>num(r.avaluo_total)!=null))h+='<div class="grp-hd">Avalúo fiscal (Catastro SII)</div><div class="kpis">'+avaluo.map(k=>kpiCard(k)).join("")+'</div>';
 const movil=["pct_tpub","pct_auto","pct_activa","pct_teletrabajo","pct_fuera"];
 if(s.rows.some(r=>num(r.pct_tpub)!=null))h+='<div class="grp-hd">Movilidad (Censo 2024)</div><div class="kpis">'+movil.map(k=>kpiCard(k)).join("")+'</div>';
 document.getElementById("res-kpis").innerHTML=h;
}

/* =================================================================
   TAB 2 · OFERTA DE SERVICIOS POR HABITANTE (mapa zonal)
   ================================================================= */
// ---- tema claro / oscuro ----
const CARTO_LIGHT="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const CARTO_DARK="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const MAPS=[];
function isDark(){return document.documentElement.classList.contains("dark");}
function applyMapTheme(){const u=isDark()?CARTO_DARK:CARTO_LIGHT;MAPS.forEach(m=>{try{m.carto.setUrl(u);}catch(e){}});}
function applyChartTheme(){if(!window.Chart)return;const d=isDark();Chart.defaults.color=d?"#a9c0de":"#5e6e80";Chart.defaults.borderColor=d?"rgba(140,165,200,.14)":"rgba(20,40,70,.07)";}
function rerenderActive(){const t=currentTab();if(t==="resumen"||t==="oferta"||t==="dinamica"){if(S.sel)finishSelect();}else if(t==="comparar"){cmpRefresh();}else if(t==="ranking"){drawRanking();}else if(t==="economia"){renderEconomia();}else if(t==="mapa"){renderNmap();}else if(t==="movilidad"){renderMovilidad();}}
function postTheme(){const th=isDark()?"dark":"light";["if-demo","if-suelo"].forEach(id=>{const f=document.getElementById(id);if(f&&f.contentWindow)try{f.contentWindow.postMessage({__tendTheme:th},"*");}catch(e){}});}
function setTheme(dark){document.documentElement.classList.toggle("dark",dark);try{localStorage.setItem("theme",dark?"dark":"light");}catch(e){}updateThemeIcon();applyChartTheme();applyMapTheme();rerenderActive();postTheme();}
const MOON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>';
const SUN='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
function updateThemeIcon(){const b=document.getElementById("themeToggle");if(b)b.innerHTML=isDark()?SUN:MOON;}
// marca de autor en los mapas (visible y viaja en capturas)
function authorWM(map){const c=L.control({position:"bottomleft"});c.onAdd=function(){const d=L.DomUtil.create("div","author-wm");d.textContent="By Rodrigo Medina G.";return d;};c.addTo(map);return c;}
// capas base (Mapa claro/oscuro según tema / Satélite) + pantalla completa + marca de autor
function mapChrome(map){
 const claro=L.tileLayer(isDark()?CARTO_DARK:CARTO_LIGHT,{attribution:'&copy; OpenStreetMap &copy; CARTO',maxZoom:19});
 const sat=L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",{attribution:'Imagery &copy; Esri, Maxar, Earthstar Geographics',maxZoom:19});
 claro.addTo(map);MAPS.push({map,carto:claro});
 L.control.layers({"Mapa":claro,"Satélite":sat},null,{position:"topright"}).addTo(map);
 const fc=L.control({position:"topleft"});
 fc.onAdd=function(){const d=L.DomUtil.create("div","leaflet-bar fs-ctrl");const a=L.DomUtil.create("a","",d);a.href="#";a.title="Pantalla completa";a.setAttribute("role","button");a.setAttribute("aria-label","Pantalla completa");
   a.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3m13-5v3a2 2 0 0 1-2 2h-3"/></svg>';
   L.DomEvent.on(a,"click",function(e){L.DomEvent.stop(e);const el=map.getContainer();
     if(!document.fullscreenElement){(el.requestFullscreen||el.webkitRequestFullscreen||function(){}).call(el);}
     else{(document.exitFullscreen||document.webkitExitFullscreen||function(){}).call(document);}
     setTimeout(function(){map.invalidateSize();},250);});
   return d;};
 fc.addTo(map);
 authorWM(map);
 return {claro,sat};
}
let zMap=null,zLayer=null,zLegend=null,zInfo=null,zCur="dens_hab_ha",zFeats=[],zComp=null;
function ensureZMap(){if(zMap)return;
 zMap=L.map("z-map",{preferCanvas:false}).setView([-36.86,-73.03],11);
 mapChrome(zMap);
 zInfo=L.control({position:"topright"});
 zInfo.onAdd=function(){this._d=L.DomUtil.create("div","info");this.update();return this._d;};
 zInfo.update=function(p,m){if(!p){this._d.innerHTML="<b>Pasa el cursor</b><br>sobre una zona";return;}
  const meta=KPI[m];this._d.innerHTML="<b>Zona "+p.zona+"</b> · "+titleCase(p.comuna)+"<br>Pob: "+fmt(p.pob,0)+
   "<br>"+meta.lbl+":<br><b>"+fmtKpi(m,p[m])+"</b>";};
 zInfo.addTo(zMap);
 // dropdown
 const sel=document.getElementById("z-sel");const groups={};
 ZKEYS.forEach(k=>{(groups[KPI[k].grp]=groups[KPI[k].grp]||[]).push(k);});
 let h="";Object.entries(groups).forEach(([g,arr])=>{h+='<optgroup label="'+g+'">'+
  arr.map(k=>'<option value="'+k+'">'+KPI[k].lbl+'</option>').join("")+'</optgroup>';});
 sel.innerHTML=h;sel.value=zCur;sel.onchange=()=>zDraw(sel.value);
 document.getElementById("z-note").innerHTML='<b>Cómo leer estos mapas:</b> las zonas censales son urbanas; las áreas rurales no tienen zona y quedan fuera. La disponibilidad de suelo (m²/hab) es uso <b>efectivo</b> del SII, no normativo. Los cortes de color son por quintiles (escala logarítmica en densidad y m²/hab). Zonas con población ≈0 aparecen como "sin dato".';
}
function quant(vals,log){let v=vals.filter(x=>x!=null&&isFinite(x)&&(!log||x>0)).sort((a,b)=>a-b);
 if(!v.length)return [0,0,0,0,0];const q=p=>v[Math.min(v.length-1,Math.floor(p*(v.length-1)))];
 return [q(.2),q(.4),q(.6),q(.8),q(.92)];}
function colorFor(x,brk,cols,log){if(x==null||!isFinite(x)||(log&&x<=0))return "#d8dde3";
 for(let i=0;i<brk.length;i++)if(x<=brk[i])return cols[i];return cols[cols.length-1];}
function zDraw(m){zCur=m;const meta=KPI[m],cols=R[meta.ramp];
 const isNse=!!meta.nse;  // NSE por zona: color por nivel (5 clases fijas)
 const vals=zFeats.map(f=>f.properties[m]);const brk=quant(vals,meta.log);
 const fillFor=p=>isNse?(p.nse_nivel?NSE_COLORS[p.nse_nivel]:"#d8dde3"):colorFor(p[m],brk,cols,meta.log);
 if(zLayer)zMap.removeLayer(zLayer);
 zLayer=L.geoJSON({type:"FeatureCollection",features:zFeats},{
  style:f=>({color:"#5b6b7b",weight:.5,fillColor:fillFor(f.properties),fillOpacity:.78}),
  onEachFeature:(f,l)=>{const p=f.properties;
   l.on("mouseover",()=>{l.setStyle({weight:2,color:"#1f4e79"});zInfo.update(p,m);});
   l.on("mouseout",()=>{l.setStyle({weight:.5,color:"#5b6b7b"});zInfo.update();});
   const val=isNse?(p.nse_nivel?NSE_LABEL[p.nse_nivel]+' · score '+Math.round(p.nse_score):'s/d'):fmtKpi(m,p[m]);
   l.bindPopup('<b>Zona '+p.zona+'</b> · '+titleCase(p.comuna)+'<br>Población: '+fmt(p.pob,0)+
     '<br><b>'+meta.lbl+': '+val+'</b>');}
 }).addTo(zMap);
 if(zLegend)zMap.removeControl(zLegend);
 zLegend=L.control({position:"bottomright"});
 zLegend.onAdd=()=>{const d=L.DomUtil.create("div","legend");let h;
  if(isNse){h='<b>Nivel socioeconómico</b><br>';for(let i=5;i>=1;i--)h+='<i style="background:'+NSE_COLORS[i]+'"></i>'+NSE_LABEL[i]+'<br>';h+='<i style="background:#d8dde3"></i>sin dato';}
  else{h='<b>'+meta.lbl+'</b>'+(meta.u?' ('+meta.u+')':"")+'<br><i style="background:'+cols[0]+'"></i>≤ '+fmt(brk[0],meta.dec)+'<br>';
   for(let i=1;i<brk.length;i++)h+='<i style="background:'+cols[i]+'"></i>'+fmt(brk[i-1],meta.dec)+' – '+fmt(brk[i],meta.dec)+'<br>';
   h+='<i style="background:'+cols[4]+'"></i>> '+fmt(brk[4],meta.dec)+'<br><i style="background:#d8dde3"></i>sin dato';}
  d.innerHTML=h;return d;};
 zLegend.addTo(zMap);
 document.getElementById("z-desc").innerHTML="<b>"+meta.lbl+"</b>";
 document.getElementById("z-sel").value=m;
 zComparison(m);
 setTimeout(()=>zMap.invalidateSize(),60);
}
// barras: comunas del grupo + promedio nacional, para el indicador del mapa
function zComparison(m){const meta=KPI[m];const ck=meta.cmpKey||m;
 const rows=groupRows().map(r=>[titleCase(r.comuna),num(r[ck])]).filter(r=>r[1]!=null).sort((a,b)=>b[1]-a[1]);
 const nat=S.natAgg[ck];
 const labels=rows.map(r=>r[0]).concat(["▸ Promedio nacional"]);
 const data=rows.map(r=>Math.round(r[1]*100)/100).concat([nat!=null?Math.round(nat*100)/100:null]);
 const colors=rows.map(()=>R[meta.ramp][3]).concat([OR]);
 if(zComp)zComp.destroy();
 zComp=new Chart(document.getElementById("z-ccomp"),{type:"bar",
  data:{labels,datasets:[{data,backgroundColor:colors}]},
  options:{indexAxis:"y",maintainAspectRatio:false,plugins:{legend:{display:false},
   tooltip:{callbacks:{label:c=>fmtKpi(m,c.parsed.x)}}},
   scales:{x:{title:{display:true,text:meta.lbl+(meta.u?" ("+meta.u+")":"")}}}}});
 document.getElementById("z-cct").textContent="Comparación por comuna — "+meta.lbl;
 document.getElementById("z-ccs").innerHTML="El indicador agregado por comuna del grupo ("+groupLabel()+"). <b style='color:"+OR+"'>La barra naranja es el promedio nacional.</b>";
}
function renderOferta(){const slug=dataSlug();
 const mapEl=document.getElementById("z-map"),emptyEl=document.getElementById("z-empty");
 const panel=document.querySelector("#p-oferta .panelctrl"),box=document.querySelector("#p-oferta .chartbox"),note=document.getElementById("z-note");
 if(!HAS_ZONAL[slug]){
  mapEl.style.display="none";note.style.display="none";panel.style.display="none";box.style.display="none";
  emptyEl.style.display="block";
  emptyEl.innerHTML="<b>Mapa zonal en preparación para "+S.sel.name+".</b><br>"+
   "El detalle intra-ciudad por zona censal se genera con el pipeline espacial (catastro SII + cartografía censal). "+
   "Por ahora está disponible para el <b>Gran Concepción</b>. Mientras tanto, usa la pestaña <b>Comparar ciudades</b> y el <b>Resumen</b> para los indicadores a nivel comunal.";
  return;}
 mapEl.style.display="";note.style.display="";panel.style.display="";box.style.display="";emptyEl.style.display="none";
 ensureZMap();zOmitNote(slug);
 if(S.zonasCache[slug]){zFeats=S.zonasCache[slug];afterZonas();return;}
 getJSON("data/zonas/"+slug+".geojson?v=4").then(g=>{S.zonasCache[slug]=g.features;zFeats=g.features;afterZonas();});
}
// nota de comunas omitidas (sin catastro enriquecido) y % de m² asignado
function zOmitNote(slug){const cov=ZCOV[slug];const el=document.getElementById("z-omit");
 if(!el)return;
 if(!cov){el.style.display="none";return;}
 const om=(cov.omitidas||[]).map(o=>o.comuna);
 let h="";
 if(om.length)h+="<b>Comunas omitidas</b> (sin catastro enriquecido con coordenadas, no aparecen en el mapa): "+om.join(", ")+". ";
 if(cov.pct_asignado!=null)h+=(h?" ":"")+"<b>"+cov.pct_asignado+"%</b> de los m² del área quedaron asignados a una zona (el resto es rural o quedó fuera del límite zonal).";
 el.style.display=h?"block":"none";el.innerHTML=h;}
function afterZonas(){zDraw(zCur);if(zLayer)zMap.fitBounds(zLayer.getBounds(),{padding:[10,10]});}

/* =================================================================
   TAB 3 · DINÁMICA (intercensal + crecimiento)
   ================================================================= */
let iMap=null,imLayer=null,imLegend=null,imPanel=null,imChart=null,iMode="com",iData={};
const fmtN=x=>x==null?"s/d":Math.round(x).toLocaleString('es-CL');
function colC(v){if(v==null)return "#d8dde3";
 if(v<=-5)return "#d73027"; if(v<0)return "#fc8d59"; if(v<5)return "#fee08b";
 if(v<10)return "#a6d96a"; if(v<15)return "#66bd63"; return "#1a9850";}
function ensureIMap(){if(iMap)return;
 iMap=L.map("d-imap",{preferCanvas:false}).setView([-36.86,-73.03],11);
 mapChrome(iMap);
 document.getElementById("d-bt-com").onclick=()=>setIMode("com");
 document.getElementById("d-bt-zon").onclick=()=>setIMode("zon");
}
function imClear(){if(imLayer){iMap.removeLayer(imLayer);imLayer=null;}
 if(imLegend){iMap.removeControl(imLegend);imLegend=null;}
 if(imPanel){iMap.removeControl(imPanel);imPanel=null;}}
function legendPct(){const lg=L.control({position:"bottomright"});
 lg.onAdd=()=>{const d=L.DomUtil.create("div","legend");
  d.innerHTML='<b>Variación 2017→2024 (%)</b><br>'+
  '<i style="background:#d73027"></i>≤ -5%<br><i style="background:#fc8d59"></i>-5 a 0%<br>'+
  '<i style="background:#fee08b"></i>0 a 5%<br><i style="background:#a6d96a"></i>5 a 10%<br>'+
  '<i style="background:#66bd63"></i>10 a 15%<br><i style="background:#1a9850"></i>&gt; 15%';return d;};
 return lg;}
// geojson de comunas del grupo (recorta el nacional)
function groupComunasGeo(){const cuts=new Set(groupRows().map(r=>String(r.cut)));
 return {type:"FeatureCollection",features:S.comunasGeo.features.filter(f=>cuts.has(String(f.properties.cut)))
  .map(f=>{const r=S.byCut[f.properties.cut];return {type:"Feature",geometry:f.geometry,
   properties:{cut:f.properties.cut,comuna:titleCase(f.properties.comuna),
    pob17:r?r.pob_2017:null,pob24:r?r.pob_2024:null,dpob:r?r.var_abs:null,vpct:r?r.var_pct:null}};})};}
// gráfico inferior: SIEMPRE comparación intercensal entre comunas del grupo
function comunaInterChart(){const feats=iData.com.features;
 if(imChart)imChart.destroy();
 const ord=[...feats].sort((a,b)=>(b.properties.vpct??-1e9)-(a.properties.vpct??-1e9));
 imChart=new Chart(document.getElementById("d-cint"),{type:"bar",
  data:{labels:ord.map(f=>f.properties.comuna),
   datasets:[{data:ord.map(f=>f.properties.vpct),backgroundColor:ord.map(f=>f.properties.vpct>=0?GREEN:RED)}]},
  options:{indexAxis:"y",maintainAspectRatio:false,plugins:{legend:{display:false},
    tooltip:{callbacks:{label:c=>{const p=ord[c.dataIndex].properties;
      return sg(fmt(p.vpct,1))+"% ("+sg(fmtN(p.dpob))+" hab) · "+fmtN(p.pob17)+"→"+fmtN(p.pob24);}}}},
    scales:{x:{title:{display:true,text:"variación % de población 2017→2024"}}}}});
 document.getElementById("d-cint-title").textContent="Variación intercensal de población por comuna ("+groupLabel()+")";
 document.getElementById("d-cint-sub").textContent="Comparación entre las comunas del grupo sobre los totales censales oficiales.";}
function renderComuna(){imClear();const feats=iData.com.features;
 imLayer=L.geoJSON(iData.com,{
  style:f=>({color:"#fff",weight:1,fillColor:colC(f.properties.vpct),fillOpacity:.82}),
  onEachFeature:(f,l)=>{const p=f.properties;
    l.on("mouseover",()=>l.setStyle({weight:2.5,color:"#1f4e79"}));
    l.on("mouseout",()=>l.setStyle({weight:1,color:"#fff"}));
    l.bindTooltip(p.comuna+": "+sg(fmt(p.vpct,1))+"%",{sticky:true});
    l.bindPopup('<b>'+p.comuna+'</b><br>Población 2017: '+fmtN(p.pob17)+'<br>Población 2024: '+fmtN(p.pob24)+
      '<br><b>Variación: '+sg(fmtN(p.dpob))+' hab ('+sg(fmt(p.vpct,1))+'%)</b>');}
 }).addTo(iMap);
 iMap.fitBounds(imLayer.getBounds(),{padding:[10,10]});
 imLegend=legendPct();imLegend.addTo(iMap);
 comunaInterChart();document.getElementById("d-inote").style.display="none";
 setTimeout(()=>iMap.invalidateSize(),60);}
function renderZona(){imClear();const feats=iData.zon.features;
 imLayer=L.geoJSON(iData.zon,{
  style:f=>({color:"#5b6b7b",weight:.5,fillColor:colC(f.properties.vpct),fillOpacity:.8}),
  onEachFeature:(f,l)=>{const p=f.properties;
    l.on("mouseover",()=>l.setStyle({weight:2,color:"#1f4e79"}));
    l.on("mouseout",()=>l.setStyle({weight:.5,color:"#5b6b7b"}));
    l.bindPopup('<b>Zona '+p.zona+'</b> · '+titleCase(p.comuna)+'<br>Pob. consolidada 2017: '+fmtN(p.pob17)+
      '<br>2024: '+fmtN(p.pob24i)+'<br><b>'+sg(fmtN(p.dpob))+' hab ('+(p.vpct==null?'s/d':sg(fmt(p.vpct,1))+'%')+')</b>');}
 }).addTo(iMap);
 iMap.fitBounds(imLayer.getBounds(),{padding:[10,10]});
 imLegend=legendPct();imLegend.addTo(iMap);
 comunaInterChart();
 const nt=document.getElementById("d-inote");nt.style.display="block";
 nt.innerHTML='<b>Ojo:</b> esta vista compara solo las <b>manzanas presentes en ambos censos</b> (núcleo consolidado). No incluye las <b>manzanas nuevas</b>, donde ocurre buena parte del crecimiento de comunas en expansión; por eso un casco antiguo puede aparecer rojo aunque la comuna crezca. Para el dato oficial usa <b>Por comuna (%)</b>.';
 setTimeout(()=>iMap.invalidateSize(),60);}
function setIMode(m){iMode=m;
 document.getElementById("d-bt-com").classList.toggle("on",m==="com");
 document.getElementById("d-bt-zon").classList.toggle("on",m==="zon");
 if(m==="com")renderComuna();
 else{if(iData.zon)renderZona();else{ // sin zonas: vuelve a comuna
  document.getElementById("d-bt-zon").classList.remove("on");
  document.getElementById("d-bt-com").classList.add("on");renderComuna();}}}
function renderDinamica(){ensureIMap();
 iData.com=groupComunasGeo();
 const slug=dataSlug();
 // botón "por zona" solo si el geojson zonal trae variación intercensal (vpct/pob17)
 const hasZon=!!HAS_ZONAL_INTER[slug];
 document.getElementById("d-bt-zon").style.display=hasZon?"":"none";
 if(hasZon&&S.interCache[slug]){iData.zon=S.interCache[slug];}
 else iData.zon=null;
 setIMode("com");
 if(hasZon&&!S.interCache[slug]){
  getJSON("data/zonas/"+slug+".geojson?v=4").then(g=>{
   S.interCache[slug]=g; iData.zon=g; });}
 renderCrecimiento(slug);
 if(HAS_CREC[slug])loadDmap(slug); else document.getElementById("d-dmapbox").style.display="none";
}
/* ---- gráficos de crecimiento (lazy crecimiento/<slug>.json) ---- */
let cg1=null,cg2=null,cg3=null,cg3b=null;
function renderCrecimiento(slug){
 const wrap=document.getElementById("d-growth"),empty=document.getElementById("d-growth-empty");
 if(!HAS_CREC[slug]){wrap.style.display="none";empty.style.display="block";
  empty.innerHTML="<b>Análisis temporal en preparación para "+S.sel.name+".</b><br>Las series de construcción por año (personas vs. m², casa/depto, densificación/expansión) se generan con el pipeline SII por comuna. Disponible para el <b>Gran Concepción</b>.";return;}
 wrap.style.display="";empty.style.display="none";
 if(S.crecCache[slug]){drawCrec(S.crecCache[slug]);return;}
 getJSON("data/crecimiento/"+slug+".json").then(D=>{S.crecCache[slug]=D;drawCrec(D);});
}
function drawCrec(D){
 // C1 índice base 2017
 const an=D.ej1_personas_vs_m2.stock_m2_por_anio.anios,st=D.ej1_personas_vs_m2.stock_m2_por_anio.stock;
 const i17=an.indexOf(2017),base=st[i17];
 const m2idx=st.map((x,i)=>(an[i]>2024)?null:Math.round(1000*x/base)/10);
 const pob={};pob[2017]=100;pob[2024]=Math.round(1000*D.ej1_personas_vs_m2.pob_2024/D.ej1_personas_vs_m2.pob_2017)/10;
 const pobd=an.map(y=>y in pob?pob[y]:null);
 if(cg1)cg1.destroy();
 cg1=new Chart(document.getElementById("d-c1"),{type:"line",data:{labels:an,datasets:[
   {label:"m² construidos (índice)",data:m2idx,borderColor:OR,backgroundColor:OR,tension:.25,pointRadius:0,borderWidth:3,spanGaps:true},
   {label:"Población (índice)",data:pobd,borderColor:NAVY,backgroundColor:NAVY,pointRadius:6,pointHoverRadius:7,showLine:true,borderWidth:2,borderDash:[6,4],spanGaps:true}]},
  options:{maintainAspectRatio:false,plugins:{legend:{position:"bottom"},
   tooltip:{callbacks:{label:c=>c.dataset.label+": "+c.parsed.y+" (base 2017=100)"}}},
   scales:{y:{title:{display:true,text:"Índice (2017 = 100)"}}}}});
 // C2 casas vs deptos
 const cd=D.ej5_casa_depto;
 const rdc=cd.map(x=>x.casas>0?x.deptos/x.casas:null).filter(v=>v!=null);
 const avgR=rdc.reduce((a,b)=>a+b,0)/rdc.length;
 const clas=avgR>1.25?"Densificación":(avgR<0.75?"Extensión":"Mixta");
 const clasCol=clas==="Densificación"?GREEN:(clas==="Extensión"?OR:NAVY2);
 if(cg2)cg2.destroy();
 cg2=new Chart(document.getElementById("d-c2"),{data:{labels:cd.map(x=>x.anio),datasets:[
   {type:"bar",label:"Casas (1–2 pisos)",data:cd.map(x=>x.casas),backgroundColor:NAVY,order:2},
   {type:"bar",label:"Departamentos (3+ pisos)",data:cd.map(x=>x.deptos),backgroundColor:OR,order:2},
   {type:"line",label:"Ratio depto ÷ casa",data:cd.map(x=>x.casas>0?Math.round(100*x.deptos/x.casas)/100:null),borderColor:TEAL,backgroundColor:TEAL,yAxisID:"y2",tension:.25,pointRadius:4,borderWidth:2,order:1,datalabels:{display:false}}]},
  options:{maintainAspectRatio:false,plugins:{legend:{position:"bottom"}},
   scales:{y:{title:{display:true,text:"unidades nuevas"}},
     y2:{position:"right",grid:{drawOnChartArea:false},title:{display:true,text:"ratio depto/casa"},suggestedMin:0,suggestedMax:2}}}});
 document.getElementById("d-cdbox").innerHTML='<b>Dinámica:</b> ratio promedio <b>departamentos ÷ casas = '+avgR.toFixed(2).replace(".",",")+'</b> → <b style="color:'+clasCol+'">'+clas+'</b>. <b>Criterio:</b> &gt;1,25 densificación · &lt;0,75 extensión · 0,75–1,25 mixta.';
 // C3 expansion/densif por año
 const ed=D.ej6_expansion_densidad.filter(x=>x.densificacion+x.expansion>0);
 if(cg3)cg3.destroy();
 cg3=new Chart(document.getElementById("d-c3"),{data:{labels:ed.map(x=>x.anio),datasets:[
   {type:"bar",label:"Densificación (m²)",data:ed.map(x=>x.densificacion),backgroundColor:NAVY,stack:"s"},
   {type:"bar",label:"Expansión (m²)",data:ed.map(x=>x.expansion),backgroundColor:OR,stack:"s"},
   {type:"line",label:"% densificación",data:ed.map(x=>x.pct_densif),borderColor:TEAL,backgroundColor:TEAL,yAxisID:"y2",tension:.25,pointRadius:4,borderWidth:2,datalabels:{display:false}}]},
  options:{maintainAspectRatio:false,plugins:{legend:{position:"bottom"},
   datalabels:{display:ctx=>ctx.dataset.type==="bar",color:"#fff",font:{size:10,weight:"bold"},
     formatter:(v,ctx)=>{const e=ed[ctx.dataIndex];const tot=e.densificacion+e.expansion;return tot&&v/tot>=0.06?Math.round(100*v/tot)+"%":"";}}},
   scales:{x:{stacked:true},y:{stacked:true,title:{display:true,text:"m² nuevos"}},
     y2:{position:"right",grid:{drawOnChartArea:false},min:0,max:100,title:{display:true,text:"% densif."}}}}});
 // C3b dona
 const t=D.ej6_totales;const tt=t.densificacion+t.expansion;
 if(cg3b)cg3b.destroy();
 cg3b=new Chart(document.getElementById("d-c3b"),{type:"doughnut",data:{labels:["Densificación","Expansión"],
   datasets:[{data:[t.densificacion,t.expansion],backgroundColor:[NAVY,OR],borderWidth:2,borderColor:"#fff"}]},
  options:{maintainAspectRatio:false,cutout:"58%",plugins:{legend:{position:"bottom"},
    datalabels:{display:true,color:"#fff",font:{size:16,weight:"bold"},formatter:v=>Math.round(100*v/tt)+"%"},
    tooltip:{callbacks:{label:c=>c.label+": "+(c.parsed/1e6).toFixed(1)+"M m² ("+Math.round(100*c.parsed/tt)+"%)"}}}}});
}
/* ---- mapa densificación vs expansión por zona (lazy) ---- */
let dMap=null,dLayer=null,dLegend=null;
// escala divergente: naranjo = expansión (pct bajo) · azul = densificación (pct alto)
function colDE(p){if(p==null)return "#d8dde3";
 if(p<40)return "#d6604d"; if(p<60)return "#f4a582"; if(p<80)return "#d1e5f0";
 if(p<95)return "#67a9cf"; return "#2166ac";}
function ensureDMap(){if(dMap)return;
 dMap=L.map("d-dmap",{preferCanvas:false}).setView([-36.86,-73.03],11);
 mapChrome(dMap);}
function drawDmap(feats){ensureDMap();
 if(dLayer){dMap.removeLayer(dLayer);dLayer=null;}
 if(dLegend){dMap.removeControl(dLegend);dLegend=null;}
 dLayer=L.geoJSON({type:"FeatureCollection",features:feats},{
  style:f=>({color:"#5b6b7b",weight:.5,fillColor:colDE(f.properties.pct_densif_z),fillOpacity:.82}),
  onEachFeature:(f,l)=>{const p=f.properties;
   l.on("mouseover",()=>l.setStyle({weight:2,color:"#1f4e79"}));
   l.on("mouseout",()=>l.setStyle({weight:.5,color:"#5b6b7b"}));
   const pd=p.pct_densif_z;
   const tip=pd==null?"sin obra nueva 2016–2025":(pd>=50?Math.round(pd)+"% densificación":Math.round(100-pd)+"% expansión");
   l.bindPopup('<b>Zona '+p.zona+'</b> · '+titleCase(p.comuna)+'<br>'+
     'Densificación: '+fmtN(p.densif_m2)+' m²<br>Expansión: '+fmtN(p.expan_m2)+' m²<br>'+
     '<b>'+tip+'</b>');}
 }).addTo(dMap);
 if(dLayer.getBounds().isValid())dMap.fitBounds(dLayer.getBounds(),{padding:[10,10]});
 dLegend=L.control({position:"bottomright"});
 dLegend.onAdd=()=>{const d=L.DomUtil.create("div","legend");
  d.innerHTML='<b>m² nuevos 2016–2025</b><br>'+
   '<i style="background:#d6604d"></i>Expansión &gt;60%<br>'+
   '<i style="background:#f4a582"></i>Expansión 40–60%<br>'+
   '<i style="background:#d1e5f0"></i>Mixto<br>'+
   '<i style="background:#67a9cf"></i>Densificación 80–95%<br>'+
   '<i style="background:#2166ac"></i>Densificación &gt;95%<br>'+
   '<i style="background:#d8dde3"></i>sin obra nueva';return d;};
 dLegend.addTo(dMap);
 setTimeout(()=>dMap.invalidateSize(),60);}
function loadDmap(slug){const box=document.getElementById("d-dmapbox");
 const draw=g=>{const fe=g.features?g.features:g;
   if(fe.some(f=>f.properties.pct_densif_z!=null)){box.style.display="";drawDmap(fe);}
   else box.style.display="none";};
 if(S.zonasCache[slug]){draw(S.zonasCache[slug]);return;}
 if(S.interCache[slug]){draw(S.interCache[slug]);return;}
 getJSON("data/zonas/"+slug+".geojson?v=4").then(g=>{S.zonasCache[slug]=g.features;draw(g.features);})
  .catch(()=>{box.style.display="none";});}

/* =================================================================
   TAB · ECONOMÍA (avalúo / contribuciones, serie 2021–2025 + proyección)
   ================================================================= */
let ecoC1=null,ecoC2=null,ecoC3=null,ecoLoaded=false;
// períodos "2022-S1" -> textos sin siglas: año ("2022") o semestre legible ("1er semestre 2022")
function ecoYr(t){return String(t).slice(0,4);}
function ecoSem(t){return (/-S2$/.test(t)?"2º semestre ":"1er semestre ")+String(t).slice(0,4);}
function fmtCLP(mm){ // mm = millones CLP
 if(mm==null)return "s/d";
 if(mm>=1e6)return (mm/1e6).toLocaleString('es-CL',{maximumFractionDigits:2})+" billones";
 if(mm>=1e3)return (mm/1e3).toLocaleString('es-CL',{maximumFractionDigits:1})+" mil MM";
 return Math.round(mm).toLocaleString('es-CL')+" MM";}
function ecoProj(series,t){const ys=series.filter(v=>v>0);if(ys.length<3)return{pt:[],pv:[]};
 const r=ys.slice(-4);let g=Math.pow(r[r.length-1]/r[0],1/(r.length-1));g=Math.min(Math.max(g,0.99),1.06);
 let last=ys[ys.length-1],y=+t[t.length-1].slice(0,4),s=+t[t.length-1].slice(-1);
 const pt=[],pv=[];for(let k=0;k<2;k++){s++;if(s>2){s=1;y++;}last=Math.round(last*g);pt.push(y+"-S"+s);pv.push(last);}return{pt,pv};}
function ecoSeries(){const s=S.sel;if(!s||!S.eco)return null;
 if(s.type==="comuna"){const r=S.eco[s.key];return r?{t:r.t,avaluo:r.avaluo_mm,contrib:r.contrib_mm,npred:r.npred,proj_t:r.proj_t,proj:r.proj_avaluo_mm,members:[s.key]}:null;}
 const recs=(S.metros[s.key]||[]).map(c=>S.eco[c]).filter(Boolean);if(!recs.length)return null;
 const t=recs[0].t,n=t.length,sum=key=>{const o=Array(n).fill(0);recs.forEach(r=>{for(let i=0;i<n;i++)o[i]+=(r[key][i]||0);});return o;};
 const av=sum("avaluo_mm"),ct=sum("contrib_mm"),np=sum("npred"),pj=ecoProj(av,t);
 return {t,avaluo:av,contrib:ct,npred:np,proj_t:pj.pt,proj:pj.pv,members:recs.map(r=>r.cut)};}
function renderEconomia(){
 if(!ecoLoaded){getJSON("data/economia/comunas.json?v=5").then(d=>{S.eco={};(d.comunas||[]).forEach(c=>S.eco[c.cut]=c);S.ecoMeta=d.meta;ecoLoaded=true;drawEco();})
   .catch(()=>{document.getElementById("eco-kpis").innerHTML='<div class="note">Serie económica no disponible.</div>';});return;}
 drawEco();}
function drawEco(){const d=ecoSeries();
 const kp=document.getElementById("eco-kpis");
 document.getElementById("eco-title").firstChild.textContent="Economía: avalúo fiscal y contribuciones — "+(S.sel?S.sel.name:"");
 if(!d){kp.innerHTML='<div class="note">Sin serie de avalúo para esta selección (requiere catastro SII enriquecido).</div>';
   [ecoC1,ecoC2,ecoC3].forEach(c=>c&&c.destroy());ecoC1=ecoC2=ecoC3=null;return;}
 const a0=d.avaluo[0],a1=d.avaluo[d.avaluo.length-1],crec=a0>0?100*(a1-a0)/a0:null;
 const ct1=d.contrib[d.contrib.length-1],np1=d.npred[d.npred.length-1];
 const card=(v,l,s,col)=>'<div class="kpi"><div class="v"'+(col?' style="color:'+col+'"':'')+'>'+v+'</div><div class="l">'+l+'</div>'+(s?'<div class="s">'+s+'</div>':'')+'</div>';
 kp.innerHTML='<div class="kpis">'+
   card(fmtCLP(a1),"Avalúo fiscal total","al "+ecoSem(d.t[d.t.length-1]))+
   card((crec>=0?"+":"")+fmt(crec,1)+"%","Crecimiento del avalúo",ecoYr(d.t[0])+" → "+ecoYr(d.t[d.t.length-1]),crec>=0?GREEN:RED)+
   card(fmtCLP(ct1),"Contribuciones del semestre","impuesto territorial girado")+
   card(fmtN(np1),"Predios catastrados","al "+ecoSem(d.t[d.t.length-1]))+'</div>';
 // C1 avalúo + proyección + línea IPC (UF)
 const labels=d.t.concat(d.proj_t);
 const hist=d.avaluo.concat(d.proj_t.map(()=>null));
 const pj=d.t.map(()=>null);pj[d.t.length-1]=d.avaluo[d.avaluo.length-1];d.proj.forEach(v=>pj.push(v));
 // contrafactual: avalúo inicial reajustado solo por IPC (UF al inicio de cada semestre)
 const uf=(S.ecoMeta&&S.ecoMeta.ipc_uf)||{};const uf0=uf[d.t[0]];
 const ipc=d.t.map(t=>(uf0&&uf[t])?Math.round(d.avaluo[0]*uf[t]/uf0):null).concat(d.proj_t.map(()=>null));
 // eje X: mostrar solo el año (en el S1), manteniendo todos los puntos semestrales
 const xYears={ticks:{autoSkip:false,maxRotation:0,callback:function(v){const l=this.getLabelForValue(v);return /-S1$/.test(l)?l.slice(0,4):"";}}};
 if(ecoC1)ecoC1.destroy();
 ecoC1=new Chart(document.getElementById("eco-c1"),{type:"line",data:{labels,datasets:[
   {label:"Avalúo (observado)",data:hist,borderColor:NAVY,backgroundColor:NAVY,tension:.2,pointRadius:3,borderWidth:3,spanGaps:false},
   {label:"Proyección",data:pj,borderColor:OR,backgroundColor:OR,borderDash:[6,4],tension:.2,pointRadius:3,borderWidth:2,spanGaps:true,datalabels:{display:false}},
   {label:"Si solo siguiera al IPC (UF)",data:ipc,borderColor:"#8696a7",backgroundColor:"#8696a7",borderDash:[3,3],tension:.2,pointRadius:0,borderWidth:2,spanGaps:true,datalabels:{display:false}}]},
  options:{maintainAspectRatio:false,plugins:{legend:{position:"bottom"},datalabels:{display:false},
   tooltip:{callbacks:{title:items=>ecoSem(items[0].label),label:c=>c.dataset.label+": "+fmtCLP(c.parsed.y)+" CLP"}}},
   scales:{x:xYears,y:{title:{display:true,text:"avalúo (millones CLP)"},ticks:{callback:v=>fmtCLP(v)}}}}});
 // C2 contribuciones
 if(ecoC2)ecoC2.destroy();
 ecoC2=new Chart(document.getElementById("eco-c2"),{type:"bar",data:{labels:d.t,datasets:[
   {label:"Contribución semestral",data:d.contrib,backgroundColor:TEAL}]},
  options:{maintainAspectRatio:false,plugins:{legend:{display:false},datalabels:{display:false},
   tooltip:{callbacks:{title:items=>ecoSem(items[0].label),label:c=>fmtCLP(c.parsed.y)+" CLP"}}},
   scales:{x:xYears,y:{title:{display:true,text:"contribuciones (millones CLP)"},ticks:{callback:v=>fmtCLP(v)}}}}});
 // C3 contexto nacional: crecimiento del avalúo por comuna (top 25), destaca la selección
 const sel=new Set(d.members.map(String));
 const all=Object.values(S.eco).filter(c=>c.crec_total_pct!=null).sort((a,b)=>b.crec_total_pct-a.crec_total_pct);
 const top=all.slice(0,25);
 // asegura que las comunas seleccionadas aparezcan aunque no estén en el top
 d.members.forEach(c=>{if(S.eco[c]&&!top.includes(S.eco[c]))top.push(S.eco[c]);});
 top.sort((a,b)=>b.crec_total_pct-a.crec_total_pct);
 if(ecoC3)ecoC3.destroy();
 ecoC3=new Chart(document.getElementById("eco-c3"),{type:"bar",data:{labels:top.map(c=>c.nombre),datasets:[
   {data:top.map(c=>c.crec_total_pct),backgroundColor:top.map(c=>sel.has(String(c.cut))?OR:NAVY2)}]},
  options:{indexAxis:"y",maintainAspectRatio:false,plugins:{legend:{display:false},datalabels:{display:false},
   tooltip:{callbacks:{label:c=>"+"+fmt(c.parsed.x,1)+"% ("+ecoYr(top[c.dataIndex].t[0])+"→"+ecoYr(top[c.dataIndex].t[top[c.dataIndex].t.length-1])+")"}}},
   scales:{x:{title:{display:true,text:"crecimiento del avalúo total "+d.t[0].slice(0,4)+"→"+d.t[d.t.length-1].slice(0,4)+" (%)"}}}}});
 document.getElementById("eco-c3s").innerHTML="Variación del avalúo total entre "+ecoYr(d.t[0])+" y "+ecoYr(d.t[d.t.length-1])+". <b style='color:"+OR+"'>En naranjo, tu selección.</b>";
 drawEcoMap(dataSlug());
}
/* ---- mapa de crecimiento del avalúo por zona (Economía) ---- */
let ecoMap=null,ecoLayer=null,ecoLegend=null;
function ensureEcoMap(){if(ecoMap)return;
 ecoMap=L.map("eco-map",{preferCanvas:false}).setView([-36.86,-73.03],11);mapChrome(ecoMap);}
function drawEcoMap(slug){const box=document.getElementById("eco-mapbox");
 if(!slug){box.style.display="none";return;}
 S.ecoZcache=S.ecoZcache||{};
 const geoP=S.zonasCache[slug]?Promise.resolve(S.zonasCache[slug]):getJSON("data/zonas/"+slug+".geojson?v=4").then(g=>{S.zonasCache[slug]=g.features;return g.features;});
 const ecoP=S.ecoZcache[slug]?Promise.resolve(S.ecoZcache[slug]):getJSON("data/economia/zonas/"+slug+".json?v=4").then(d=>{S.ecoZcache[slug]=d;return d;});
 Promise.all([geoP,ecoP]).then(([gf,d])=>{
  const feats=gf.map(f=>{const za=String(f.properties.zona);
    return {type:"Feature",geometry:f.geometry,properties:{zona:za,comuna:f.properties.comuna,
      growth:d.growth?d.growth[za]:null,serie:d.zonas?d.zonas[za]:null,t:d.t}};});
  ensureEcoMap();
  if(ecoLayer){ecoMap.removeLayer(ecoLayer);ecoLayer=null;}
  if(ecoLegend){ecoMap.removeControl(ecoLegend);ecoLegend=null;}
  const cols=R["YlOrRd"],vals=feats.map(f=>f.properties.growth),brk=quant(vals,false);
  ecoLayer=L.geoJSON({type:"FeatureCollection",features:feats},{
   style:f=>({color:"#5b6b7b",weight:.5,fillColor:colorFor(f.properties.growth,brk,cols,false),fillOpacity:.82}),
   onEachFeature:(f,l)=>{const p=f.properties;
    l.on("mouseover",()=>l.setStyle({weight:2,color:"#1f4e79"}));
    l.on("mouseout",()=>l.setStyle({weight:.5,color:"#5b6b7b"}));
    const last=p.serie?p.serie[p.serie.length-1]:null;
    l.bindPopup('<b>Zona '+p.zona+'</b> · '+titleCase(p.comuna)+'<br>'+
      (p.growth!=null?'Crecimiento '+ecoYr(p.t[0])+'→'+ecoYr(p.t[p.t.length-1])+': <b>'+(p.growth>=0?'+':'')+fmt(p.growth,1)+'%</b><br>':'')+
      (last!=null?'Avalúo '+ecoYr(p.t[p.t.length-1])+': '+fmtCLP(last)+' CLP':'sin dato'));}
  }).addTo(ecoMap);
  if(ecoLayer.getBounds().isValid())ecoMap.fitBounds(ecoLayer.getBounds(),{padding:[10,10]});
  ecoLegend=L.control({position:"bottomright"});
  ecoLegend.onAdd=()=>{const dd=L.DomUtil.create("div","legend");
   let h='<b>Crecimiento avalúo '+d.t[0].slice(0,4)+'→'+d.t[d.t.length-1].slice(0,4)+' (%)</b><br><i style="background:'+cols[0]+'"></i>≤ '+fmt(brk[0],0)+'%<br>';
   for(let i=1;i<brk.length;i++)h+='<i style="background:'+cols[i]+'"></i>'+fmt(brk[i-1],0)+' – '+fmt(brk[i],0)+'%<br>';
   h+='<i style="background:'+cols[4]+'"></i>&gt; '+fmt(brk[4],0)+'%<br><i style="background:#d8dde3"></i>s/d';dd.innerHTML=h;return dd;};
  ecoLegend.addTo(ecoMap);
  box.style.display="";
  setTimeout(()=>ecoMap.invalidateSize(),60);
 }).catch(()=>{box.style.display="none";});}

/* =================================================================
   TAB · MOVILIDAD (Censo 2024: P44 lugar de trabajo, P45 modo)
   ================================================================= */
let mvC1=null,mvC2=null,mvC3=null,mvMap=null,mvLayer=null,mvLegend=null,mvKey="mv_tpub";
const MV_LBL={mv_tpub:"Transporte público",mv_auto:"Auto",mv_activa:"Caminata + bicicleta"};
const MV_RAMP={mv_tpub:"PuBu",mv_auto:"OrRd",mv_activa:"Greens"};
function renderMovilidad(){const s=S.sel;if(!s)return;
 document.getElementById("mv-title").firstChild.textContent="Movilidad: viajes al trabajo — "+s.name;
 const kp=document.getElementById("mv-kpis");
 if(!s.rows.some(r=>num(r.pct_tpub)!=null)){kp.innerHTML='<div class="note">Sin datos de movilidad para esta selección.</div>';return;}
 kp.innerHTML='<div class="kpis">'+["pct_tpub","pct_auto","pct_activa","pct_teletrabajo","pct_fuera"].map(k=>kpiCard(k)).join("")+'</div>';
 // C1: partición modal apilada (selección vs país)
 const part=rows=>{const o=aggregate(rows,"pct_tpub"),a=aggregate(rows,"pct_auto"),m=aggregate(rows,"pct_activa");
   return [o||0,a||0,m||0,Math.max(0,100-(o||0)-(a||0)-(m||0))];};
 const selP=part(s.rows),natP=part(S.kpis);
 if(mvC1)mvC1.destroy();
 mvC1=new Chart(document.getElementById("mv-c1"),{type:"bar",
  data:{labels:[s.name,"Chile"],datasets:[
   {label:"Transporte público",data:[selP[0],natP[0]],backgroundColor:"#2b8cbe",stack:"s"},
   {label:"Auto",data:[selP[1],natP[1]],backgroundColor:"#e34a33",stack:"s"},
   {label:"Caminata + bici",data:[selP[2],natP[2]],backgroundColor:"#31a354",stack:"s"},
   {label:"Otros",data:[selP[3],natP[3]],backgroundColor:"#9aa7b4",stack:"s"}]},
  options:{indexAxis:"y",maintainAspectRatio:false,plugins:{legend:{position:"bottom"},
    datalabels:{display:true,color:"#fff",font:{size:11,weight:"bold"},formatter:v=>v>=7?Math.round(v)+"%":""},
    tooltip:{callbacks:{label:c=>c.dataset.label+": "+fmt(c.parsed.x,1)+"%"}}},
   scales:{x:{stacked:true,max:100,ticks:{callback:v=>v+"%"}},y:{stacked:true}}}});
 // mapa zonal de partición modal
 mvDrawMap(dataSlug());
 // atracción + teletrabajo por comuna (solo áreas metropolitanas)
 const isMetro=s.type==="metro"||!!s.metro;
 const grp=isMetro?groupRows():[];
 const box=document.getElementById("mv-metro");
 if(grp.length<2){box.style.display="none";}
 else{box.style.display="";
  const at=grp.map(r=>[titleCase(r.comuna),num(r.viajes_atraidos),num(r.pct_fuera)]).filter(r=>r[1]!=null).sort((a,b)=>b[1]-a[1]);
  if(mvC2)mvC2.destroy();
  mvC2=new Chart(document.getElementById("mv-c2"),{type:"bar",
   data:{labels:at.map(r=>r[0]),datasets:[{data:at.map(r=>r[1]),backgroundColor:R.Viridis[2]}]},
   options:{indexAxis:"y",maintainAspectRatio:false,plugins:{legend:{display:false},datalabels:{display:false},
     tooltip:{callbacks:{label:c=>fmtN(c.parsed.x)+" ocupados llegan · "+fmt(at[c.dataIndex][2],1)+"% de sus residentes sale"}}},
    scales:{x:{title:{display:true,text:"ocupados que llegan desde otras comunas"}}}}});
  const tl=grp.map(r=>[titleCase(r.comuna),num(r.pct_teletrabajo)]).filter(r=>r[1]!=null).sort((a,b)=>b[1]-a[1]);
  if(mvC3)mvC3.destroy();
  mvC3=new Chart(document.getElementById("mv-c3"),{type:"bar",
   data:{labels:tl.map(r=>r[0]),datasets:[{data:tl.map(r=>r[1]),backgroundColor:R.BuPu[3]}]},
   options:{indexAxis:"y",maintainAspectRatio:false,plugins:{legend:{display:false},datalabels:{display:false},
     tooltip:{callbacks:{label:c=>fmt(c.parsed.x,1)+"% trabaja desde su vivienda"}}},
    scales:{x:{title:{display:true,text:"% de ocupados en teletrabajo"}}}}});}
}
function ensureMvMap(){if(mvMap)return;
 mvMap=L.map("mv-map",{preferCanvas:true}).setView([-36.86,-73.03],11);mapChrome(mvMap);}
function mvDrawMap(slug){const box=document.getElementById("mv-mapbox");
 if(!slug||!HAS_ZONAL[slug]){box.style.display="none";return;}
 const sel=document.getElementById("mv-sel");sel.value=mvKey;
 sel.onchange=()=>{mvKey=sel.value;mvDrawMap(slug);};
 const geoP=S.zonasCache[slug]?Promise.resolve(S.zonasCache[slug]):getJSON("data/zonas/"+slug+".geojson?v=4").then(g=>{S.zonasCache[slug]=g.features;return g.features;});
 geoP.then(gf=>{
  if(!gf.some(f=>f.properties.mv_tpub!=null)){box.style.display="none";return;}
  box.style.display="";ensureMvMap();
  if(mvLayer){mvMap.removeLayer(mvLayer);mvLayer=null;}
  if(mvLegend){mvMap.removeControl(mvLegend);mvLegend=null;}
  const cols=R[MV_RAMP[mvKey]];
  const vals=gf.map(f=>f.properties[mvKey]);const brk=quant(vals,false);
  mvLayer=L.geoJSON({type:"FeatureCollection",features:gf},{
   style:f=>({color:"#5b6b7b",weight:.5,fillColor:colorFor(f.properties[mvKey],brk,cols,false),fillOpacity:.82}),
   onEachFeature:(f,l)=>{const p=f.properties;
    l.on("mouseover",()=>l.setStyle({weight:2,color:"#1f4e79"}));
    l.on("mouseout",()=>l.setStyle({weight:.5,color:"#5b6b7b"}));
    l.bindPopup('<b>Zona '+p.zona+'</b> · '+titleCase(p.comuna)+
      '<br>Transporte público: <b>'+fmt(p.mv_tpub,1)+'%</b><br>Auto: <b>'+fmt(p.mv_auto,1)+'%</b>'+
      '<br>Caminata + bici: <b>'+fmt(p.mv_activa,1)+'%</b>'+(p.mv_n?'<br><span style="color:#888">'+fmtN(p.mv_n)+' ocupados con modo declarado</span>':''));}
  }).addTo(mvMap);
  if(mvLayer.getBounds().isValid())mvMap.fitBounds(mvLayer.getBounds(),{padding:[10,10]});
  mvLegend=L.control({position:"bottomright"});
  mvLegend.onAdd=()=>{const d=L.DomUtil.create("div","legend");
   let h='<b>'+MV_LBL[mvKey]+' (%)</b><br><i style="background:'+cols[0]+'"></i>≤ '+fmt(brk[0],0)+'%<br>';
   for(let i=1;i<brk.length;i++)h+='<i style="background:'+cols[i]+'"></i>'+fmt(brk[i-1],0)+' – '+fmt(brk[i],0)+'%<br>';
   h+='<i style="background:'+cols[4]+'"></i>&gt; '+fmt(brk[4],0)+'%<br><i style="background:#d8dde3"></i>s/d';d.innerHTML=h;return d;};
  mvLegend.addTo(mvMap);
  document.getElementById("mv-desc").innerHTML="<b>"+MV_LBL[mvKey]+"</b> — % de los viajes al trabajo de la zona";
  setTimeout(()=>mvMap.invalidateSize(),60);
 }).catch(()=>{box.style.display="none";});}

/* =================================================================
   TAB 4 · COMPARAR CIUDADES
   ================================================================= */
const CMP={items:[],kpi:"m2pp_comercio",kx:"dens_hab_ha",ky:"m2pp_comercio",map:null,layer:null,legend:null,rank:null,scatter:null};
function cmpEntity(o){ // o = {kind,key}
 if(o.kind==="metro"){const rows=S.metros[o.key].map(c=>S.byCut[c]).filter(Boolean);
  return {id:"m:"+o.key,name:o.key,kind:"metro",cuts:rows.map(r=>r.cut),rows};}
 const r=S.byCut[o.key];return {id:"c:"+o.key,name:titleCase(r.comuna),kind:"comuna",cuts:[r.cut],rows:[r]};}
function cmpVal(it,k){return aggregate(it.rows,k);}
function buildComparador(){
 // selects de KPI
 const fill=sel=>{const groups={};Object.keys(KPI).forEach(k=>{(groups[KPI[k].grp]=groups[KPI[k].grp]||[]).push(k);});
  sel.innerHTML=Object.entries(groups).map(([g,arr])=>'<optgroup label="'+g+'">'+
   arr.map(k=>'<option value="'+k+'">'+KPI[k].lbl+'</option>').join("")+'</optgroup>').join("");};
 const kx=document.getElementById("cmp-kx"),ky=document.getElementById("cmp-ky");
 fill(kx);fill(ky);
 kx.value=CMP.kx;ky.value=CMP.ky;
 kx.onchange=()=>{CMP.kx=kx.value;cmpScatter();};
 ky.onchange=()=>{CMP.ky=ky.value;cmpScatter();cmpMapDraw();};   // el eje Y también define el color del mapa
 // buscador agregar
 const box=document.getElementById("cmp-add"),list=document.getElementById("alist");
 const ALL=selectorOptions();let hi=-1,shown=[];
 function render(q){q=(q||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");
  shown=ALL.filter(o=>(o.label+" "+o.sub).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").includes(q)).slice(0,80);
  list.innerHTML=shown.map(o=>'<div class="opt"><span>'+o.label+(o.metro?' ·metro':'')+'</span><span class="rg">'+o.sub+'</span></div>').join("")||'<div class="opt">Sin resultados</div>';
  list.style.display="block";hi=-1;
  [...list.querySelectorAll(".opt")].forEach((el,i)=>el.onclick=()=>add(shown[i]));}
 function add(o){if(!o)return;const it=cmpEntity({kind:o.kind,key:o.key});
  if(!CMP.items.find(x=>x.id===it.id))CMP.items.push(it);
  box.value="";list.style.display="none";cmpRefresh();}
 box.addEventListener("focus",()=>render(box.value));
 box.addEventListener("input",()=>render(box.value));
 box.addEventListener("keydown",e=>{const els=list.querySelectorAll(".opt");
  if(e.key==="ArrowDown")hi=Math.min(hi+1,shown.length-1);
  else if(e.key==="ArrowUp")hi=Math.max(hi-1,0);
  else if(e.key==="Enter"){if(hi>=0)add(shown[hi]);else if(shown.length)add(shown[0]);return;}
  else return;e.preventDefault();els.forEach((el,i)=>el.classList.toggle("hi",i===hi));});
 document.addEventListener("click",e=>{if(!e.target.closest(".addrow .field"))list.style.display="none";});
 // selección inicial: Gran Concepción + Gran Santiago + Gran Valparaíso
 ["Gran Concepción","Gran Santiago","Gran Valparaíso"].forEach(n=>{if(S.metros[n])CMP.items.push(cmpEntity({kind:"metro",key:n}));});
 cmpRefresh();
}
function cmpRefresh(){
 // chips
 document.getElementById("cmp-chips").innerHTML=CMP.items.map(it=>
  '<div class="chip"><b>'+it.name+'</b><span data-id="'+it.id+'">✕</span></div>').join("")||'<span style="color:#5b6b7b;font-size:.85rem">Agrega ciudades para comparar.</span>';
 document.querySelectorAll("#cmp-chips .chip span").forEach(s=>s.onclick=()=>{
  CMP.items=CMP.items.filter(x=>x.id!==s.getAttribute("data-id"));cmpRefresh();});
 cmpTable();cmpScatter();cmpMapDraw();
}
const CMP_ROWS=["pob_2024","var_pct","dens_hab_ha","dens_consol","pct_depto","per_hog","pct_60mas","escol",
 "nse_score","casen_ing_pc","casen_pobreza_pct","pct_terciaria","pct_ciuo123","pct_internet","pct_hacin","pct_arriendo",
 "m2_total","m2pp_tot","m2pp_comercio","m2pp_educacion","m2pp_salud","pct_8pisos","anio_mediano","valor_suelo_med",
 "avaluo_total","avaluo_pp","pct_exento",
 "pct_tpub","pct_auto","pct_activa","pct_teletrabajo","pct_fuera","viajes_atraidos"];
function cmpTable(){const w=document.getElementById("cmp-tablewrap");
 if(!CMP.items.length){w.innerHTML='<div class="loading">Sin ciudades seleccionadas.</div>';return;}
 let h='<table><thead><tr><th>Indicador</th>'+CMP.items.map(it=>'<th>'+it.name+'</th>').join("")+
   '<th>Promedio nac.</th><th>Mediana nac.</th></tr></thead><tbody>';
 // fila titular NSE: nivel con badge de color
 h+='<tr data-k="nse_score"><td>Nivel socioeconómico</td>'+CMP.items.map(it=>{const ni=nseInfo(it.rows);
   return '<td>'+(ni?'<span style="background:'+NSE_COLORS[ni.nivel]+';color:#fff;padding:2px 8px;border-radius:10px;font-size:.78rem;font-weight:700">'+ni.label+'</span>':'s/d')+'</td>';}).join("")+
   '<td style="color:#9aa7b4">—</td><td style="color:#9aa7b4">—</td></tr>';
 CMP_ROWS.forEach(k=>{const m=KPI[k];
  const vals=CMP.items.map(it=>cmpVal(it,k));
  const valid=vals.filter(v=>v!=null);
  const hi=valid.length?Math.max(...valid):null,lo=valid.length?Math.min(...valid):null;
  // mejor/peor solo en indicadores con polaridad clara (verde=mejor, rojo=peor); el resto sin color
  const best=POS_HI.has(k)?hi:(POS_LO.has(k)?lo:null), worst=POS_HI.has(k)?lo:(POS_LO.has(k)?hi:null);
  h+='<tr data-k="'+k+'"><td>'+m.lbl+(m.u&&m.u!=="%"?" <span style=\"color:#9aa7b4\">("+m.u+")</span>":"")+'</td>';
  vals.forEach(v=>{let c="";if(CMP.items.length>1&&v!=null){if(best!=null&&v===best)c=" class=best";else if(worst!=null&&v===worst)c=" class=worst";}
   h+='<td'+c+'>'+fmtKpi(k,v)+'</td>';});
  h+='<td style="color:#9aa7b4">'+fmtKpi(k,S.natAgg[k])+'</td>'+
     '<td style="color:#9aa7b4">'+fmtKpi(k,S.natMed[k])+'</td></tr>';});
 h+='</tbody></table>';w.innerHTML=h;
 // hover -> mini gráfico comparado; click -> gráfico grande en pantalla
 w.querySelectorAll("tbody tr[data-k]").forEach(tr=>{const k=tr.dataset.k;
   tr.onmouseenter=ev=>cmpShowPop(k,ev);tr.onmousemove=cmpMovePop;tr.onmouseleave=cmpHidePop;
   tr.onclick=()=>{cmpHidePop();cmpOpenModal(k);};});
}
// ---- gráfico comparado por indicador (hover = popup; click = modal) ----
function cmpChartConfig(k,big){const m=KPI[k];
 const labels=CMP.items.map(it=>it.name).concat(["Prom. nac.","Mediana nac."]);
 const vals=CMP.items.map(it=>cmpVal(it,k)).concat([num(S.natAgg[k]),num(S.natMed[k])]);
 const cols=CMP.items.map(()=>OR).concat(["#c3cedd","#9aa7b4"]);
 return {type:"bar",data:{labels:labels,datasets:[{data:vals,backgroundColor:cols,borderRadius:5}]},
  options:{maintainAspectRatio:false,indexAxis:"y",__noWM:!big,
   plugins:{legend:{display:false},
     title:{display:true,text:m.lbl+(m.u?" ("+m.u+")":""),font:{size:big?15:11,weight:"700"}},
     tooltip:{callbacks:{label:c=>fmtKpi(k,c.raw)}},
     datalabels:{display:true,anchor:"end",align:"end",clamp:true,color:"#7d8ea3",
       font:{size:big?11:9,weight:"600"},formatter:v=>v==null?"s/d":fmtKpi(k,v)}},
   scales:{x:{type:m.log?"logarithmic":"linear",ticks:{font:{size:big?11:9}}},
           y:{ticks:{font:{size:big?12:9}}}}}};}
let cmpPopChart=null,cmpModalChart=null;
function cmpShowPop(k,ev){if(!KPI[k])return;const pop=document.getElementById("cmp-pop");if(!pop)return;
 if(cmpPopChart)cmpPopChart.destroy();
 cmpPopChart=new Chart(document.getElementById("cmp-pop-cv"),cmpChartConfig(k,false));
 pop.style.display="block";cmpMovePop(ev);}
function cmpMovePop(ev){const pop=document.getElementById("cmp-pop");if(!pop||pop.style.display==="none")return;
 const w=pop.offsetWidth||340,hh=pop.offsetHeight||220;let x=ev.clientX+16,y=ev.clientY+16;
 if(x+w>innerWidth-8)x=ev.clientX-w-16;if(x<8)x=8;if(y+hh>innerHeight-8)y=innerHeight-hh-8;if(y<8)y=8;
 pop.style.left=x+"px";pop.style.top=y+"px";}
function cmpHidePop(){const pop=document.getElementById("cmp-pop");if(pop)pop.style.display="none";if(cmpPopChart){cmpPopChart.destroy();cmpPopChart=null;}}
function cmpOpenModal(k){const md=document.getElementById("cmp-modal");if(!md)return;md.classList.add("on");
 if(cmpModalChart)cmpModalChart.destroy();
 cmpModalChart=new Chart(document.getElementById("cmp-modal-cv"),cmpChartConfig(k,true));}
function cmpCloseModal(){const md=document.getElementById("cmp-modal");if(!md)return;md.classList.remove("on");if(cmpModalChart){cmpModalChart.destroy();cmpModalChart=null;}}
(function(){const x=document.getElementById("cmp-modal-x"),md=document.getElementById("cmp-modal");
 if(x)x.onclick=cmpCloseModal;
 if(md)md.onclick=e=>{if(e.target===md)cmpCloseModal();};
 document.addEventListener("keydown",e=>{if(e.key==="Escape")cmpCloseModal();});})();
function cmpScatter(){const kx=CMP.kx,ky=CMP.ky,mx=KPI[kx],my=KPI[ky];
 // un rombo por ENTIDAD seleccionada (metro = valor agregado), no por cada comuna miembro
 const selPts=CMP.items.map(it=>{const x=num(cmpVal(it,kx)),y=num(cmpVal(it,ky));
  return (x==null||y==null)?null:{x,y,name:it.name};}).filter(Boolean);
 // nube gris: todas las comunas, menos las seleccionadas directamente como comuna
 const directCuts=new Set(CMP.items.filter(it=>it.kind==="comuna").flatMap(it=>it.cuts.map(String)));
 const base=[];
 S.kpis.forEach(r=>{const x=num(r[kx]),y=num(r[ky]);if(x==null||y==null)return;
  if(directCuts.has(String(r.cut)))return;
  base.push({x,y,name:titleCase(r.comuna)});});
 if(CMP.scatter)CMP.scatter.destroy();
 CMP.scatter=new Chart(document.getElementById("cmp-scatter"),{type:"scatter",
  data:{datasets:[
   {label:"Comunas",data:base,backgroundColor:"rgba(154,167,180,.45)",pointRadius:3,pointStyle:"circle",datalabels:{display:false}},
   {label:"Seleccionadas",data:selPts,backgroundColor:OR,borderColor:"#fff",borderWidth:1.5,pointStyle:"rectRot",pointRadius:8,pointHoverRadius:11,
     datalabels:{display:selPts.length<=14,anchor:"end",align:"top",offset:5,clamp:true,color:OR,
       font:{size:9,weight:"700",family:"Inter,Segoe UI,sans-serif"},
       formatter:(v,ctx)=>ctx.dataset.data[ctx.dataIndex].name}}]},
  options:{maintainAspectRatio:false,layout:{padding:{top:14}},plugins:{legend:{position:"bottom",labels:{usePointStyle:true}},
    tooltip:{callbacks:{label:c=>c.raw.name+": ("+fmt(c.raw.x,mx.dec)+(mx.u?" "+mx.u:"")+", "+fmt(c.raw.y,my.dec)+(my.u?" "+my.u:"")+")"}}},
    scales:{x:{type:mx.log?"logarithmic":"linear",title:{display:true,text:mx.lbl+(mx.u?" ("+mx.u+")":"")}},
            y:{type:my.log?"logarithmic":"linear",title:{display:true,text:my.lbl+(my.u?" ("+my.u+")":"")}}}}});
 document.getElementById("cmp-sc-title").textContent="Dispersión — "+my.lbl+" vs "+mx.lbl;
 document.getElementById("cmp-sc-sub").innerHTML="Cada punto gris es una comuna; cada <b style='color:"+OR+"'>ciudad seleccionada</b> aparece como un rombo con su nombre (las áreas metropolitanas, con su valor agregado).";
}
function ensureCmpMap(){if(CMP.map)return;
 CMP.map=L.map("cmp-map",{preferCanvas:true}).setView([-38,-72],5);
 mapChrome(CMP.map);
}
function cmpMapDraw(){ensureCmpMap();const k=CMP.ky,m=KPI[k],cols=R[m.ramp];
 const isNse=!!m.nse;  // NSE: colorear por nivel (5 clases fijas)
 const vals=S.kpis.map(r=>num(r[k]));const brk=quant(vals,m.log);
 const selCuts=new Set(CMP.items.flatMap(it=>it.cuts.map(String)));
 const fillFor=r=>isNse?(r&&r.nse_nivel?NSE_COLORS[r.nse_nivel]:"#d8dde3"):colorFor(r?num(r[k]):null,brk,cols,m.log);
 if(CMP.layer)CMP.map.removeLayer(CMP.layer);
 CMP.layer=L.geoJSON(S.comunasGeo,{
  style:f=>{const r=S.byCut[f.properties.cut];
   const onSel=selCuts.has(String(f.properties.cut));
   return {color:onSel?"#1f4e79":"#9aa7b4",weight:onSel?2.2:.3,fillColor:fillFor(r),fillOpacity:.82};},
  onEachFeature:(f,l)=>{const r=S.byCut[f.properties.cut];const v=r?num(r[k]):null;
   const extra=isNse&&r&&r.nse_nivel?'<br><b>'+NSE_LABEL[r.nse_nivel]+'</b> · score '+Math.round(r.nse_score):'';
   l.bindPopup('<b>'+titleCase(f.properties.comuna)+'</b><br>'+m.lbl+': <b>'+fmtKpi(k,v)+'</b>'+extra);
   l.on("mouseover",()=>l.setStyle({weight:2,color:"#1f4e79"}));
   l.on("mouseout",()=>l.setStyle({weight:selCuts.has(String(f.properties.cut))?2.2:.3,color:selCuts.has(String(f.properties.cut))?"#1f4e79":"#9aa7b4"}));}
 }).addTo(CMP.map);
 if(CMP.legend)CMP.map.removeControl(CMP.legend);
 CMP.legend=L.control({position:"bottomright"});
 CMP.legend.onAdd=()=>{const d=L.DomUtil.create("div","legend");let h;
  if(isNse){h='<b>Nivel socioeconómico</b><br>';for(let i=5;i>=1;i--)h+='<i style="background:'+NSE_COLORS[i]+'"></i>'+NSE_LABEL[i]+'<br>';h+='<i style="background:#d8dde3"></i>sin dato';}
  else{h='<b>'+m.lbl+'</b>'+(m.u?' ('+m.u+')':"")+'<br><i style="background:'+cols[0]+'"></i>≤ '+fmt(brk[0],m.dec)+'<br>';
   for(let i=1;i<brk.length;i++)h+='<i style="background:'+cols[i]+'"></i>'+fmt(brk[i-1],m.dec)+' – '+fmt(brk[i],m.dec)+'<br>';
   h+='<i style="background:'+cols[4]+'"></i>> '+fmt(brk[4],m.dec)+'<br><i style="background:#d8dde3"></i>sin dato';}
  d.innerHTML=h;return d;};
 CMP.legend.addTo(CMP.map);
 document.getElementById("cmp-map-title").textContent="Mapa nacional por comuna — "+m.lbl;
 setTimeout(()=>CMP.map.invalidateSize(),60);
}

/* =================================================================
   TAB · MAPA NACIONAL (coroplético independiente con selector)
   ================================================================= */
const NMAP={key:"pct_60mas",map:null,layer:null,legend:null,built:false};
function nmapGo(cut){selectComuna(cut);activateTab("resumen");window.scrollTo({top:0,behavior:"smooth"});}
function nmapBuildSel(){if(NMAP.built)return;NMAP.built=true;
 const sel=document.getElementById("n-sel");const groups={};
 Object.keys(KPI).forEach(k=>{if(!S.kpis.some(r=>num(r[k])!=null))return;
  (groups[KPI[k].grp]=groups[KPI[k].grp]||[]).push(k);});
 sel.innerHTML=Object.entries(groups).map(([g,arr])=>'<optgroup label="'+g+'">'+
  arr.map(k=>'<option value="'+k+'">'+KPI[k].lbl+'</option>').join("")+'</optgroup>').join("");
 sel.value=NMAP.key;
 sel.onchange=()=>{NMAP.key=sel.value;nmapDraw();};}
function ensureNMap(){if(NMAP.map)return;
 NMAP.map=L.map("n-map",{preferCanvas:true}).setView([-38,-72],5);
 mapChrome(NMAP.map);}
function nmapDraw(){ensureNMap();const k=NMAP.key,m=KPI[k],cols=R[m.ramp];
 const isNse=!!m.nse;
 const vals=S.kpis.map(r=>num(r[k]));const brk=quant(vals,m.log);
 const selCuts=new Set(S.sel?S.sel.cuts.map(String):[]);
 const fillFor=r=>isNse?(r&&r.nse_nivel?NSE_COLORS[r.nse_nivel]:"#d8dde3"):colorFor(r?num(r[k]):null,brk,cols,m.log);
 if(NMAP.layer)NMAP.map.removeLayer(NMAP.layer);
 NMAP.layer=L.geoJSON(S.comunasGeo,{
  style:f=>{const r=S.byCut[f.properties.cut];
   const on=selCuts.has(String(f.properties.cut));
   return {color:on?"#1f4e79":"#9aa7b4",weight:on?2.2:.3,fillColor:fillFor(r),fillOpacity:.82};},
  onEachFeature:(f,l)=>{const cut=String(f.properties.cut);const r=S.byCut[cut];const v=r?num(r[k]):null;
   const extra=isNse&&r&&r.nse_nivel?'<br><b>'+NSE_LABEL[r.nse_nivel]+'</b> · score '+Math.round(r.nse_score):'';
   l.bindPopup('<b>'+titleCase(f.properties.comuna)+'</b><br>'+m.lbl+': <b>'+fmtKpi(k,v)+'</b>'+extra+
     '<br><a href="#" onclick="nmapGo(\''+cut+'\');return false">Ver ficha de la comuna →</a>');
   l.on("mouseover",()=>l.setStyle({weight:2,color:"#1f4e79"}));
   l.on("mouseout",()=>l.setStyle({weight:selCuts.has(cut)?2.2:.3,color:selCuts.has(cut)?"#1f4e79":"#9aa7b4"}));}
 }).addTo(NMAP.map);
 if(NMAP.legend)NMAP.map.removeControl(NMAP.legend);
 NMAP.legend=L.control({position:"bottomright"});
 NMAP.legend.onAdd=()=>{const d=L.DomUtil.create("div","legend");let h;
  if(isNse){h='<b>Nivel socioeconómico</b><br>';for(let i=5;i>=1;i--)h+='<i style="background:'+NSE_COLORS[i]+'"></i>'+NSE_LABEL[i]+'<br>';h+='<i style="background:#d8dde3"></i>sin dato';}
  else{h='<b>'+m.lbl+'</b>'+(m.u?' ('+m.u+')':"")+'<br><i style="background:'+cols[0]+'"></i>≤ '+fmt(brk[0],m.dec)+'<br>';
   for(let i=1;i<brk.length;i++)h+='<i style="background:'+cols[i]+'"></i>'+fmt(brk[i-1],m.dec)+' – '+fmt(brk[i],m.dec)+'<br>';
   h+='<i style="background:'+cols[4]+'"></i>> '+fmt(brk[4],m.dec)+'<br><i style="background:#d8dde3"></i>sin dato';}
  d.innerHTML=h;return d;};
 NMAP.legend.addTo(NMAP.map);
 document.getElementById("n-desc").innerHTML="<b>"+m.lbl+"</b>"+(m.u?" ("+m.u+")":"");
 setTimeout(()=>NMAP.map.invalidateSize(),60);}
function renderNmap(){nmapBuildSel();nmapDraw();}

/* =================================================================
   TAB 5 · RANKING NACIONAL
   ================================================================= */
const RANKDIMS=[
 {g:"Demografía y población",k:"pct_60mas",src:"k",dir:"desc",lbl:"Más población mayor (60+ años)"},
 {g:"Demografía y población",k:"pct_60mas",src:"k",dir:"asc",lbl:"Ciudades más jóvenes (menor 60+)"},
 {g:"Demografía y población",k:"var_pct",src:"k",dir:"desc",lbl:"Mayor crecimiento de población 2017→2024"},
 {g:"Demografía y población",k:"var_pct",src:"k",dir:"asc",lbl:"Mayor pérdida de población"},
 {g:"Demografía y población",k:"dens_consol",src:"k",dir:"desc",lbl:"Mayor densidad (sector consolidado)"},
 {g:"Demografía y población",k:"dens_hab_ha",src:"k",dir:"desc",lbl:"Mayor densidad (área comunal completa)"},
 {g:"Demografía y población",k:"nse_score",src:"k",dir:"desc",lbl:"Mayor nivel socioeconómico"},
 {g:"Demografía y población",k:"nse_score",src:"k",dir:"asc",lbl:"Menor nivel socioeconómico"},
 {g:"Ingreso y pobreza (CASEN)",k:"casen_ing_pc",src:"k",dir:"desc",lbl:"Mayor ingreso per cápita (CASEN)"},
 {g:"Ingreso y pobreza (CASEN)",k:"casen_ing_pc",src:"k",dir:"asc",lbl:"Menor ingreso per cápita (CASEN)"},
 {g:"Ingreso y pobreza (CASEN)",k:"casen_pobreza_pct",src:"k",dir:"desc",lbl:"Mayor pobreza por ingresos (CASEN)"},
 {g:"Ingreso y pobreza (CASEN)",k:"casen_pobreza_pct",src:"k",dir:"asc",lbl:"Menor pobreza por ingresos (CASEN)"},
 {g:"Demografía y población",k:"pct_terciaria",src:"k",dir:"desc",lbl:"Mayor educación terciaria"},
 {g:"Demografía y población",k:"pct_inmig",src:"k",dir:"desc",lbl:"Mayor población inmigrante"},
 {g:"Demografía y población",k:"escol",src:"k",dir:"desc",lbl:"Mayor escolaridad"},
 {g:"Demografía y población",k:"escol",src:"k",dir:"asc",lbl:"Menor escolaridad"},
 {g:"Vivienda",k:"pct_depto",src:"k",dir:"desc",lbl:"Más viviendas en departamento"},
 {g:"Vivienda",k:"pct_hacin",src:"k",dir:"desc",lbl:"Más hacinamiento"},
 {g:"Vivienda",k:"pct_arriendo",src:"k",dir:"desc",lbl:"Más hogares arrendatarios"},
 {g:"Uso de suelo y servicios",k:"m2pp_comercio",src:"k",dir:"desc",lbl:"Mejor disponibilidad de comercio"},
 {g:"Uso de suelo y servicios",k:"m2pp_comercio",src:"k",dir:"asc",lbl:"Peor disponibilidad de comercio"},
 {g:"Uso de suelo y servicios",k:"m2pp_salud",src:"k",dir:"desc",lbl:"Mejor disponibilidad de salud"},
 {g:"Uso de suelo y servicios",k:"m2pp_educacion",src:"k",dir:"desc",lbl:"Mejor disponibilidad de educación"},
 {g:"Uso de suelo y servicios",k:"m2pp_deporte",src:"k",dir:"desc",lbl:"Mejor disponibilidad de deporte y recreación"},
 {g:"Uso de suelo y servicios",k:"m2pp_tot",src:"k",dir:"desc",lbl:"Más suelo construido por habitante"},
 {g:"Uso de suelo y servicios",k:"pct_8pisos",src:"k",dir:"desc",lbl:"Más verticalizadas (predios 8+ pisos)"},
 {g:"Uso de suelo y servicios",k:"valor_suelo_med",src:"k",dir:"desc",lbl:"Suelo más caro"},
 {g:"Avalúo fiscal (SII)",k:"avaluo_total",src:"k",dir:"desc",lbl:"Mayor avalúo fiscal total"},
 {g:"Avalúo fiscal (SII)",k:"avaluo_pp",src:"k",dir:"desc",lbl:"Mayor avalúo fiscal per cápita"},
 {g:"Avalúo fiscal (SII)",k:"avaluo_pp",src:"k",dir:"asc",lbl:"Menor avalúo fiscal per cápita"},
 {g:"Avalúo fiscal (SII)",k:"pct_exento",src:"k",dir:"desc",lbl:"Mayor % de avalúo exento de contribuciones"},
 {g:"Movilidad (Censo 2024)",k:"pct_tpub",src:"k",dir:"desc",lbl:"Más uso de transporte público al trabajo"},
 {g:"Movilidad (Censo 2024)",k:"pct_auto",src:"k",dir:"desc",lbl:"Más uso de auto al trabajo"},
 {g:"Movilidad (Censo 2024)",k:"pct_activa",src:"k",dir:"desc",lbl:"Más movilidad activa (caminata + bicicleta)"},
 {g:"Movilidad (Censo 2024)",k:"pct_teletrabajo",src:"k",dir:"desc",lbl:"Más teletrabajo"},
 {g:"Movilidad (Censo 2024)",k:"pct_fuera",src:"k",dir:"desc",lbl:"Más dependencia laboral de otras comunas (dormitorio)"},
 {g:"Movilidad (Censo 2024)",k:"viajes_atraidos",src:"k",dir:"desc",lbl:"Mayor atracción de viajes al trabajo"},
 {g:"Uso de suelo y servicios",k:"anio_mediano",src:"k",dir:"desc",lbl:"Parque construido más nuevo"},
 {g:"Uso de suelo y servicios",k:"anio_mediano",src:"k",dir:"asc",lbl:"Parque construido más antiguo"},
 {g:"Dinámica de crecimiento",k:"crec_m2",src:"g",dir:"desc",lbl:"Mayor crecimiento urbano (m² construidos)"},
 {g:"Dinámica de crecimiento",k:"pct_densif",src:"g",dir:"desc",lbl:"Se densifican más (crecen sobre sí mismas)"},
 {g:"Dinámica de crecimiento",k:"pct_densif",src:"g",dir:"asc",lbl:"Se expanden más rápido (hacia los bordes)"},
];
let rkChart=null;
function rkMeta(d){
 if(d.src==="k")return {dec:KPI[d.k].dec,u:KPI[d.k].u,lbl2:KPI[d.k].lbl};
 if(d.k==="crec_m2")return {dec:1,u:"%",lbl2:"crecimiento de m² construidos 2017→2024"};
 return {dec:1,u:"%",lbl2:"% de m² nuevos en densificación (2016–2025)"};
}
function rkValue(o,d){
 if(d.src==="k")return d.scopeArea?aggregate(o.rows,d.k):num(o.r[d.k]);
 const key=d.scopeArea?o.slug:("c"+o.r.cut);
 const g=(S.rg||{})[key]; return g?num(g[d.k]):null;
}
function buildRanking(){
 const sel=document.getElementById("rk-dim");
 const groups={};RANKDIMS.forEach((d,i)=>{(groups[d.g]=groups[d.g]||[]).push([i,d.lbl]);});
 sel.innerHTML=Object.entries(groups).map(([g,arr])=>'<optgroup label="'+g+'">'+
  arr.map(([i,l])=>'<option value="'+i+'">'+l+'</option>').join("")+'</optgroup>').join("");
 const rsel=document.getElementById("rk-region");
 const regs={};S.kpis.forEach(r=>regs[r.region_cod]=titleCase(r.region));
 const G=[15,1,2,3,4,5,13,6,7,16,8,9,14,10,11,12];
 const order=Object.keys(regs).sort((a,b)=>(G.indexOf(+a)<0?99:G.indexOf(+a))-(G.indexOf(+b)<0?99:G.indexOf(+b)));
 rsel.innerHTML='<option value="">Todo Chile</option>'+order.map(c=>'<option value="'+c+'">'+regs[c]+'</option>').join("");
 ["rk-dim","rk-scope","rk-region","rk-minpob","rk-top"].forEach(id=>document.getElementById(id).onchange=drawRanking);
}
function drawRanking(){
 if(!S.kpis.length)return;
 const d={...RANKDIMS[+document.getElementById("rk-dim").value]};
 d.scopeArea=document.getElementById("rk-scope").value==="area";
 const reg=document.getElementById("rk-region").value;
 const minpob=+document.getElementById("rk-minpob").value;
 const topN=+document.getElementById("rk-top").value;
 const meta=rkMeta(d);
 document.getElementById("rk-region").disabled=d.scopeArea;
 let rows=[];
 if(d.scopeArea){
  Object.keys(S.metros).forEach(mn=>{const mr=S.metros[mn].map(c=>S.byCut[c]).filter(Boolean);
   if(mr.length)rows.push({name:mn,slug:slugify(mn),rows:mr,isArea:true,key:"m:"+mn,pob:aggregate(mr,"pob_2024")});});
 }else{
  S.kpis.forEach(r=>{if(reg&&r.region_cod!==reg)return; if((r.pob_2024||0)<minpob)return;
   rows.push({name:titleCase(r.comuna),r:r,key:"c:"+r.cut,pob:r.pob_2024});});
 }
 rows.forEach(o=>o.v=rkValue(o,d));
 rows=rows.filter(o=>o.v!=null).sort((a,b)=>d.dir==="asc"?a.v-b.v:b.v-a.v);
 const total=rows.length;
 const selKey=S.sel?(S.sel.type==="metro"?"m:"+S.sel.key:"c:"+S.sel.key):null;
 const selIdx=rows.findIndex(o=>o.key===selKey);
 const show=rows.slice(0,topN);
 if(selIdx>=topN)show.push(rows[selIdx]);
 const labels=show.map(o=>(rows.indexOf(o)+1)+". "+o.name);
 const data=show.map(o=>Math.round(o.v*100)/100);
 const colors=show.map(o=>o.key===selKey?OR:NAVY);
 const wrap=document.getElementById("rk-wrap");wrap.style.height=Math.max(260,show.length*23+70)+"px";
 if(rkChart)rkChart.destroy();
 rkChart=new Chart(document.getElementById("rk-chart"),{type:"bar",
  data:{labels,datasets:[{data,backgroundColor:colors}]},
  options:{indexAxis:"y",maintainAspectRatio:false,plugins:{legend:{display:false},
   tooltip:{callbacks:{label:c=>{const o=show[c.dataIndex];return o.name+": "+fmt(c.parsed.x,meta.dec)+(meta.u==="%"?"%":(meta.u?" "+meta.u:""))+(o.pob?"  ("+fmt(o.pob,0)+" hab)":"");}}}},
   onClick:(ev,els)=>{if(!els.length)return;const o=show[els[0].index];o.isArea?selectMetro(o.name):selectComuna(o.r.cut);},
   scales:{x:{title:{display:true,text:meta.lbl2+(meta.u&&meta.u!=="%"?" ("+meta.u+")":"")}}}}});
 document.getElementById("rk-title").textContent=d.lbl+(d.scopeArea?" — áreas metropolitanas":"");
 let sub=total+(d.scopeArea?" áreas":" comunas")+" en el ranking";
 if(reg&&!d.scopeArea)sub+=" · "+document.getElementById("rk-region").selectedOptions[0].textContent;
 if(minpob&&!d.scopeArea)sub+=" · ≥ "+fmt(minpob,0)+" hab";
 if(selIdx>=0)sub+=" · "+S.sel.name+" va en el puesto "+(selIdx+1)+" de "+total;
 document.getElementById("rk-sub").textContent=sub;
 const isPC=["m2pp_comercio","m2pp_salud","m2pp_educacion","m2pp_deporte","m2pp_tot"].includes(d.k);
 document.getElementById("rk-desc").innerHTML="<b>"+meta.lbl2+".</b> "+
  (d.src==="g"?"Calculado desde el catastro SII (año de construcción); disponible para las comunas con catastro enriquecido.":
   (isPC?"m² construidos de ese uso ÷ población de la comuna. En comunas pequeñas el cociente puede inflarse (el catastro cubre mucho suelo para poca gente) — usa el filtro de <b>población mínima</b>.":
    "Fuente: Censo INE 2024 / Catastro SII."));
}

/* =================================================================
   TABS
   ================================================================= */
function activateTab(t){
 document.querySelectorAll(".tabs button").forEach(x=>{const on=x.dataset.tab===t;x.classList.toggle("on",on);x.setAttribute("aria-selected",on?"true":"false");});
 document.querySelectorAll(".panel").forEach(p=>p.classList.toggle("on",p.id==="p-"+t));
 // refrescar mapas al hacerse visibles
 if(t==="oferta"&&zMap)setTimeout(()=>{zMap.invalidateSize();if(zLayer)zMap.fitBounds(zLayer.getBounds(),{padding:[10,10]});},60);
 if(t==="dinamica"&&iMap)setTimeout(()=>{iMap.invalidateSize();if(imLayer)iMap.fitBounds(imLayer.getBounds(),{padding:[10,10]});},60);
 if(t==="dinamica"&&dMap)setTimeout(()=>{dMap.invalidateSize();if(dLayer&&dLayer.getBounds().isValid())dMap.fitBounds(dLayer.getBounds(),{padding:[10,10]});},80);
 if(t==="comparar"){cmpMapDraw();}
 if(t==="ranking")drawRanking();
 if(t==="mapa")renderNmap();
 if(t==="movilidad"){renderMovilidad();if(mvMap)setTimeout(()=>{mvMap.invalidateSize();if(mvLayer&&mvLayer.getBounds().isValid())mvMap.fitBounds(mvLayer.getBounds(),{padding:[10,10]});},80);}
 if(t==="economia"){renderEconomia();if(ecoMap)setTimeout(()=>{ecoMap.invalidateSize();if(ecoLayer&&ecoLayer.getBounds().isValid())ecoMap.fitBounds(ecoLayer.getBounds(),{padding:[10,10]});},80);}
 if(t==="tend-demo")lazyFrame("if-demo");
 if(t==="tend-suelo")lazyFrame("if-suelo");
 writeURL();
}
document.querySelectorAll(".tabs button").forEach(b=>b.onclick=()=>activateTab(b.dataset.tab));
// accesibilidad de las pestañas: roles ARIA + navegación con flechas
(function(){const nav=document.querySelector(".tabs");if(!nav)return;const btns=[...nav.querySelectorAll("button")];
 nav.setAttribute("role","tablist");nav.setAttribute("aria-label","Secciones");
 btns.forEach(b=>{b.setAttribute("role","tab");b.setAttribute("aria-controls","p-"+b.dataset.tab);b.setAttribute("aria-selected",b.classList.contains("on")?"true":"false");});
 document.querySelectorAll(".panel").forEach(p=>{p.setAttribute("role","tabpanel");p.setAttribute("tabindex","0");});
 nav.addEventListener("keydown",e=>{if(e.key!=="ArrowRight"&&e.key!=="ArrowLeft")return;const i=btns.indexOf(document.activeElement);if(i<0)return;e.preventDefault();const n=(i+(e.key==="ArrowRight"?1:btns.length-1)+btns.length)%btns.length;btns[n].focus();activateTab(btns[n].dataset.tab);});
})();
// ---- enlaces profundos: estado (ciudad + pestaña) en la URL, compartible ----
function cityParam(){const s=S.sel;if(!s)return null;return s.type==="metro"?slugify(s.key):String(s.key);}
function currentTab(){const b=document.querySelector(".tabs button.on");return b?b.dataset.tab:"resumen";}
function writeURL(){try{const c=cityParam(),t=currentTab();const q=new URLSearchParams();
 if(c)q.set("c",c); if(t&&t!=="resumen")q.set("t",t);
 history.replaceState(null,"",location.pathname+(q.toString()?"?"+q.toString():""));}catch(e){}}
function applyURL(){const q=new URLSearchParams(location.search);const c=q.get("c"),t=q.get("t");let ok=false;
 if(c){ if(S.byCut[c]){selectComuna(c);ok=true;}
   else {const mn=Object.keys(S.metros).find(n=>slugify(n)===c); if(mn){selectMetro(mn);ok=true;}} }
 if(!ok)selectMetro("Gran Concepción");
 if(t&&document.getElementById("p-"+t))activateTab(t);
}
// ---- pestañas de tendencias embebidas: ancladas al menú de ciudades ----
function lazyFrame(id){const f=document.getElementById(id);if(!f)return;
 if(!f.src&&f.dataset.src){f.addEventListener("load",()=>postToFrame(id));f.src=f.dataset.src;}
 else postToFrame(id);}                                  // ya cargado -> solo sincroniza
function tendIds(){const s=S.sel;if(!s)return null;const isMetro=s.type==="metro";
 return {demo:isMetro?slugify(s.key):String(s.key),      // demografía: metro=slug, comuna=cut (hay para todas)
         usos:isMetro?slugify(s.key):(s.metro?slugify(s.metro):slugify(s.name)), // uso de suelo zonal: si la comuna integra un área, usa el área
         name:s.name};}
function postToFrame(id){const f=document.getElementById(id);if(!f||!f.src||!f.contentWindow)return;
 const t=tendIds();if(t)f.contentWindow.postMessage({__tend:true,demo:t.demo,usos:t.usos,name:t.name,theme:isDark()?"dark":"light"},"*");}
function syncTendCity(){postToFrame("if-demo");postToFrame("if-suelo");}
window.addEventListener("message",e=>{const d=e.data;if(!d||!d.__tendH)return;
 ["if-demo","if-suelo"].forEach(id=>{const f=document.getElementById(id);
   if(f&&f.contentWindow===e.source)f.style.height=Math.max(620,d.h)+"px";});});
// botón "Compartir vista": copia el enlace de la vista actual (ciudad + pestaña)
(function(){const b=document.getElementById("shareBtn");if(!b)return;
 b.onclick=async()=>{const u=location.href,old=b.innerHTML;
   try{await navigator.clipboard.writeText(u);}catch(e){try{const t=document.createElement("textarea");t.value=u;document.body.appendChild(t);t.select();document.execCommand("copy");t.remove();}catch(_){prompt("Copia el enlace:",u);return;}}
   b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Enlace copiado';
   setTimeout(()=>b.innerHTML=old,1700);};})();
// toggle de tema claro/oscuro
(function(){applyChartTheme();updateThemeIcon();const b=document.getElementById("themeToggle");if(b)b.onclick=()=>setTheme(!isDark());})();
