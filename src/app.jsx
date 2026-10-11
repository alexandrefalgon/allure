const { useState, useEffect, useMemo, useRef } = React;

/* ---------- constantes ---------- */
const DISC = {
  course: { short:'Course',   label:'Course à pied', color:'var(--run)'  },
  velo:   { short:'Vélo',     label:'Vélo',          color:'var(--bike)' },
  nage:   { short:'Natation', label:'Natation',      color:'var(--swim)' },
  muscu:  { short:'Musculation', label:'Musculation',   color:'var(--str)'  },
  autre:  { short:'Activité', label:'Autre',         color:'var(--ink2)' },
};
const DISC_IDS = ['course','velo','nage','muscu'];
const DAYS_LETTER = ['L','M','M','J','V','S','D'];
const DAYS_ABBR = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
const DAYS_LONG = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
const MONTHS = ['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
const MONTHS_LONG = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];

/* ---------- dates (toutes en heure locale) ---------- */
const pad = (n) => String(n).padStart(2,'0');
const fmt = (d) => d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate());
const parse = (s) => { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); };
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const startOfWeek = (d) => addDays(d, -((d.getDay() + 6) % 7));
const diffDays = (a, b) => Math.round((Date.UTC(a.getFullYear(),a.getMonth(),a.getDate()) - Date.UTC(b.getFullYear(),b.getMonth(),b.getDate())) / 86400000);
const shortDate = (d) => d.getDate() + ' ' + MONTHS[d.getMonth()];
const longDate = (d) => DAYS_LONG[(d.getDay()+6)%7] + ' ' + d.getDate() + ' ' + MONTHS_LONG[d.getMonth()];
const fmtMin = (n) => { n = Number(n)||0; if(!n) return '—'; if(n < 60) return n + ' min'; const h = Math.floor(n/60), m = n%60; return h + 'h' + (m ? pad(m) : ''); };

function parseTargetMinutes(t){
  if(!t) return 0;
  const s = String(t).toLowerCase();
  let m = s.match(/(\d+)\s*h\s*(\d+)?/);
  if(m) return Number(m[1])*60 + Number(m[2]||0);
  m = s.match(/(\d+)\s*-\s*(\d+)\s*min/);
  if(m) return Number(m[2]);
  m = s.match(/(\d+)\s*min/);
  if(m) return Number(m[1]);
  return 0;
}

/* ---------- données ---------- */
const uid = () => Math.random().toString(36).slice(2,10);

const DEFAULT_PROFILE = {
  maxHR: 212, zones: [[116, 146], [147, 160], [161, 175], [176, 190], [191, 205]],
  programStart: fmt(new Date()),
};

/* ---------- programme type (12 semaines : 3 blocs de 3 semaines de charge + 1 semaine allégée) ----------
   Lun  Push + Course facile
   Mar  Pull
   Mer  Course qualité
   Jeu  Jambes
   Ven  (repos)
   Sam  Sortie longue (vélo) + Rappel haut du corps
   Dim  Natation */
const dur = (m) => m < 60 ? m + ' min' : Math.floor(m / 60) + 'h' + pad(m % 60);
const DELOAD_WEEKS = [3, 7, 11];
const P_RUN_Q = [
  'Fartlek : 8 × (1 min vite / 1 min trot)', 'Fractionné : 6 × 3 min à 5\'15/km, récup 90 s', 'Fractionné : 5 × 1000 m à 5\'05/km, récup 2 min', 'Fartlek léger : 6 × (1 min vite / 2 min trot)',
  'Seuil : 3 × 10 min à 5\'20/km, récup 2 min', 'Fractionné : 6 × 1000 m à 5\'00/km, récup 90 s', 'Seuil : 2 × 15 min à 5\'15/km, récup 3 min', 'Fractionné léger : 5 × 3 min à 5\'10/km, récup 90 s',
  'Fractionné : 5 × 1200 m à 5\'00/km, récup 2 min', 'Seuil : 3 × 12 min à 5\'15/km, récup 2 min', 'Fractionné : 8 × 800 m à 4\'55/km, récup 90 s', 'Test : 5 km chrono (échauffement 15 min)',
];
const P_RUN_Q_MIN = [45, 50, 55, 40, 55, 60, 60, 45, 60, 60, 60, 50];
const P_RUN_EASY = [30, 35, 35, 25, 35, 40, 40, 30, 40, 40, 45, 30];
const P_BIKE_LONG = [90, 105, 120, 75, 120, 135, 150, 90, 150, 165, 180, 100];
const P_SWIM = [
  '5 × 200 m à 1\'45/100 m, récup 20 s', '6 × 200 m à 1\'43/100 m, récup 20 s', '8 × 150 m à 1\'42/100 m, récup 15 s', '4 × 200 m souples',
  '3 × 400 m à 1\'42/100 m, récup 30 s', '10 × 100 m à 1\'38/100 m, récup 15 s', '2 × 600 m à 1\'42/100 m, récup 40 s', '4 × 200 m souples',
  '4 × 400 m à 1\'40/100 m, récup 30 s', '12 × 100 m à 1\'35/100 m, récup 15 s', '1500 m continu à 1\'42/100 m', 'Test : 400 m puis 200 m chrono',
];
const P_SWIM_M = [1700, 1900, 2000, 1400, 2100, 2200, 2300, 1700, 2400, 2500, 2600, 1700];
const swimMin = (m) => Math.round(m * 0.027 / 5) * 5;

function buildProgram(templates, zones){
  const Zn = zones && zones.length === 5 ? zones : DEFAULT_PROFILE.zones;
  const z1 = (n) => 'Z' + n + ' (' + Zn[n - 1][0] + '–' + Zn[n - 1][1] + ' bpm)';
  const zr = (a, b) => 'Z' + a + '-Z' + b + ' (' + Zn[a - 1][0] + '–' + Zn[b - 1][1] + ' bpm)';
  const qZone = [z1(5), z1(4), zr(4, 5), z1(5), z1(4), zr(4, 5), z1(4), z1(4), zr(4, 5), z1(4), z1(5), ''];
  const tid = (name) => { const t = (templates || []).find(x => x.name === name); return t ? t.id : ''; };
  return Array.from({ length: 12 }, (_, i) => {
    const dl = DELOAD_WEEKS.includes(i), blk = Math.floor(i / 4);
    const S = (discipline, day, desc, target, templateId) => ({ id: uid(), discipline, day, desc, target, done: false, ...(templateId ? { templateId } : {}) });
    const muscuT = dl ? ' · semaine allégée (−10 % de charge)' : '';
    const longDesc = dl ? 'Sortie souple ' + zr(1, 2) : blk === 0 ? 'Sortie longue ' + zr(1, 2) : 'Sortie longue ' + zr(1, 2) + ' dont ' + (blk === 1 ? 2 : 3) + ' × 15 min en ' + z1(3);
    const swolf = dl || i === 11 ? '' : ' · SWOLF visé ≤ ' + [38, 37, 36][blk];
    return { id: uid(), sessions: [
      S('course', 0, 'Footing très facile ' + z1(1), dur(P_RUN_EASY[i])),
      S('muscu', 0, MUSCLES.Push, dur(60) + muscuT, tid('Push force')),
      S('muscu', 1, MUSCLES.Pull, dur(60) + muscuT, tid('Pull force')),
      S('course', 2, P_RUN_Q[i] + (qZone[i] ? ' · efforts en ' + qZone[i] : ''), dur(P_RUN_Q_MIN[i]) + ' · échauffement 15 min, retour au calme 10 min'),
      S('muscu', 3, MUSCLES.Jambes, dur(65) + muscuT, tid('Jambes force')),
      S('velo', 5, longDesc, dur(P_BIKE_LONG[i])),
      S('muscu', 5, MUSCLES.Rappel, dur(50) + muscuT, tid('Rappel haut du corps force')),
      S('nage', 6, 'Éducatifs 300 m + ' + P_SWIM[i] + swolf, dur(swimMin(P_SWIM_M[i])) + ' · ' + P_SWIM_M[i] + ' m'),
    ]};
  });
}


/* ---------- séances de muscu (d'après les captures) ---------- */
const NOTE_DB = 'Deux haltères : indique le poids combiné.';
const NOTE_LUNGE = 'Poids combiné des deux haltères ; répétitions des deux côtés cumulées.';
const NOTE_PULLUP = 'Soustrais le poids de ton corps lors de la saisie du poids.';
const mkEx = (name, sets, note, kgLabel) => ({ id: uid(), name, note: note || '', kgLabel: kgLabel || '', sets: sets.map(([reps, kg]) => ({ id: uid(), reps, kg })) });
const times = (n, reps, kg) => Array.from({ length: n }, () => [reps, kg]);
const mkBlock = (...exs) => ({ id: uid(), exercises: exs });

function defaultTemplates(){
  return [
    { id: uid(), name: 'Jambes force', blocks: [
      mkBlock(mkEx('Squat arrière – Barre', times(4, 5, 0))),
      mkBlock(mkEx('Soulevé de terre roumain – Barre', times(3, 6, 0))),
      mkBlock(mkEx('Fente – En alternance – Haltère', times(3, 16, 0), NOTE_LUNGE)),
      mkBlock(mkEx('Flexion des jambes couché', times(3, 10, 0))),
      mkBlock(mkEx('Élévation de mollets – Debout', times(4, 12, 0))),
    ]},
    { id: uid(), name: 'Pull force', blocks: [
      mkBlock(mkEx('Traction', times(3, 6, 0), NOTE_PULLUP, '+ Poids (kg)')),
      mkBlock(mkEx('Rameur buste penché – Barre', [[6,60],[6,70],[6,70]])),
      mkBlock(mkEx('Tirage poitrine – Prise serrée', [[8,70],[8,70],[6,70]])),
      mkBlock(mkEx('Flexion des biceps – Haltère', times(3, 24, 32), NOTE_DB)),
      mkBlock(mkEx('Tirage vers le visage avec câble', times(2, 12, 40))),
    ]},
    { id: uid(), name: 'Push force', blocks: [
      mkBlock(mkEx('Développé couché à la Smith machine', [[4,70],[4,76.5],[4,70]])),
      mkBlock(mkEx('Extension des triceps', [[8,30],[8,35],[8,35]], NOTE_DB)),
      mkBlock(mkEx('Développé couché – Position inclinée', [[8,50],[8,60],[8,60]], NOTE_DB)),
      mkBlock(mkEx('Développé militaire – Position assise', times(3, 8, 58), NOTE_DB)),
      mkBlock(
        mkEx('Élévation latérale – Câble – D', times(3, 10, 10)),
        mkEx('Élévation latérale – Câble – G', times(3, 10, 10))
      ),
    ]},
    { id: uid(), name: 'Rappel haut du corps force', blocks: [
      mkBlock(mkEx('Développé couché – Position inclinée', [[6,50],[6,60],[6,65],[6,65]], NOTE_DB)),
      mkBlock(
        mkEx('Rameur – Un bras – G – Haltère', [[6,24],[6,32],[6,32],[6,32]], NOTE_DB),
        mkEx('Rameur – Un bras – D – Haltère', [[6,24],[6,32],[6,32],[6,32]], NOTE_DB)
      ),
      mkBlock(mkEx('Tirage poitrine – Avant', [[10,70],[10,65],[10,0]])),
      mkBlock(mkEx('Développé militaire – Position assise', [[8,59],[8,59],[8,69]], NOTE_DB)),
      mkBlock(mkEx('Flexion des biceps – Haltère', times(3, 8, 36), NOTE_DB)),
      mkBlock(mkEx('Extension des triceps', [[10,25],[10,0],[10,0]], NOTE_DB)),
      mkBlock(mkEx('Élévation latérale des épaules', [[12,24],[12,0],[12,0]], NOTE_DB)),
    ]},
  ];
}

const KEY = 'allure_state_v1';
function loadState(){
  try{ const raw = localStorage.getItem(KEY); if(raw) return JSON.parse(raw); }catch(e){}
  return null;
}
function saveState(s){ try{ localStorage.setItem(KEY, JSON.stringify(s)); }catch(e){} }

const PLAN_VERSION = 4;
const MUSCLES = { Push: 'Pectoraux · épaules · triceps', Pull: 'Dos · biceps · arrière des épaules', Jambes: 'Quadriceps · ischio-jambiers · fessiers · mollets', Rappel: 'Pectoraux · dos · épaules · bras' };
const muscleDesc = (d) => { const m = /^(Push|Pull|Jambes|Rappel)\b/.exec(d || ''); return m ? MUSCLES[m[1]] : d; };
// début du plan : le lundi de cette semaine si on est lundi ou mardi, sinon lundi prochain
function planStart(){ const d = new Date(), dow = (d.getDay() + 6) % 7; return fmt(dow <= 1 ? addDays(d, -dow) : addDays(d, 7 - dow)); }
function bootState(){
  const init = loadState();
  if(!init){
    const templates = defaultTemplates();
    return { workouts: [], templates, program: buildProgram(templates, DEFAULT_PROFILE.zones), profile: { ...DEFAULT_PROFILE, programStart: planStart() }, planVersion: PLAN_VERSION };
  }
  if(init.planVersion === PLAN_VERSION) return init;
  if(init.planVersion === 3){
    // seule la description des séances de musculation change : le calendrier de l'utilisateur est conservé
    return { ...init, planVersion: PLAN_VERSION, program: (init.program || []).map(w => ({ ...w, sessions: w.sessions.map(x => x.discipline === 'muscu' ? { ...x, desc: muscleDesc(x.desc) } : x) })) };
  }
  // ancien plan (préparation triathlon) → nouveau programme ; l'historique des séances est conservé
  const templates = init.templates && init.templates.length ? init.templates : defaultTemplates();
  const { ironmanDate, z2Low, z2High, raceZoneLow, raceZoneHigh, ...prof } = init.profile || {};
  const profile = { ...DEFAULT_PROFILE, ...prof, programStart: planStart() };
  return { ...init, templates, program: buildProgram(templates, profile.zones), profile,
           workouts: (init.workouts || []).map(({ sessionId, ...w }) => w), planVersion: PLAN_VERSION };
}

// retrouve (ou crée) la semaine du plan qui contient une date
function locateWeek(program, programStart, iso){
  let base = startOfWeek(parse(programStart));
  const d = parse(iso);
  let idx = Math.floor(diffDays(startOfWeek(d), base) / 7), shift = 0, prog = program;
  if(idx < 0){ shift = -idx; prog = [...Array.from({ length: shift }, () => ({ id: uid(), sessions: [] })), ...prog]; base = addDays(base, -7 * shift); idx = 0; }
  while(prog.length <= idx) prog = [...prog, { id: uid(), sessions: [] }];
  return { program: prog, programStart: fmt(base), shift, wIdx: idx, day: (d.getDay() + 6) % 7 };
}


/* ---------- Intervals.icu ---------- */
const ICU_CONN_KEY = 'allure_icu_conn_v1';
const ICU_CACHE_KEY = 'allure_icu_cache_v3';
const loadIcuConn = () => { try{ const r = localStorage.getItem(ICU_CONN_KEY); return r ? JSON.parse(r) : null; }catch(e){ return null; } };
const saveIcuConn = (c) => { try{ localStorage.setItem(ICU_CONN_KEY, JSON.stringify(c)); }catch(e){} };
const loadIcuCache = () => { try{ const r = localStorage.getItem(ICU_CACHE_KEY); return r ? JSON.parse(r) : null; }catch(e){ return null; } };
const saveIcuCache = (c) => { try{ localStorage.setItem(ICU_CACHE_KEY, JSON.stringify(c)); }catch(e){} };
const clearIcu = () => { try{ localStorage.removeItem(ICU_CONN_KEY); localStorage.removeItem(ICU_CACHE_KEY); localStorage.removeItem('allure_icu_cache_v1'); localStorage.removeItem('allure_icu_cache_v2'); }catch(e){} };
const ACT_FIELDS = 'id,name,type,start_date_local,moving_time,elapsed_time,distance,total_elevation_gain,source';

// premier jour du mois précédent : on charge deux mois pour comparer
const rangeFrom = (todayStr) => { const t = parse(todayStr); return fmt(new Date(t.getFullYear(), t.getMonth() - 5, 1)); };

function icuKind(type){
  const t = String(type || '');
  if(/run/i.test(t)) return 'course';
  if(/ride|cycl|bike/i.test(t)) return 'velo';
  if(/swim/i.test(t)) return 'nage';
  if(/weight|strength|workout|crossfit|gym/i.test(t)) return 'muscu';
  return 'autre';
}
function normIcu(a){
  const secs = Number(a.moving_time) || Number(a.elapsed_time) || 0;
  const meters = Number(a.distance) || 0;
  const local = String(a.start_date_local || '');
  return {
    id: a.id, date: local.slice(0, 10), time: local.slice(11, 16), name: a.name || '', type: a.type || '',
    kind: icuKind(a.type), secs, meters, elev: Number(a.total_elevation_gain) || 0,
    // Intervals.icu ne renvoie qu'une fiche vide pour les activités Strava
    stub: !local || (!secs && !meters),
  };
}
const normWell = (w) => ({
  date: String(w.id || '').slice(0, 10),
  ctl: w.ctl == null ? null : Number(w.ctl), atl: w.atl == null ? null : Number(w.atl),
  sleep: Number(w.sleepSecs) || null, rhr: Number(w.restingHR) || null, hrv: Number(w.hrv) || null, steps: Number(w.steps) || null,
});

/* données fictives pour l'aperçu */
function demoActivities(from, todayStr){
  const out = []; const end = parse(todayStr);
  for(let d = parse(from), n = 0; d <= end; d = addDays(d, 1), n++){
    const wd = (d.getDay() + 6) % 7, j = d.getDate(), iso = fmt(d);
    if((j * 7) % 5 === 0) continue;
    const jit = (j * 13) % 7;
    const at = (h) => iso + 'T' + pad(h) + ':' + pad(10 + jit * 6) + ':00';
    let x = null;
    if(wd === 1) x = ['Run', 'Footing endurance', 46 + jit, 8 + jit * 0.25, 70 + jit * 7, 7];
    if(wd === 2) x = ['WeightTraining', ['Jambes force','Pull force','Push force'][j % 3], 55 + jit, 0, 0, 12];
    if(wd === 3) x = ['Ride', 'Sortie vélo Z2', 80 + jit * 2, 32 + jit, 250 + jit * 25, 18];
    if(wd === 4) x = ['Swim', 'Natation technique', 38 + jit, 1.6 + jit * 0.06, 0, 18];
    if(wd === 5) x = ['Run', 'Footing', 34 + jit, 5 + jit * 0.15, 40 + jit * 4, 8];
    if(wd === 6) x = ['Ride', 'Sortie longue', 120 + jit * 4, 50 + jit, 400 + jit * 40, 9];
    if(x) out.push({ id: 'demo' + n, start_date_local: at(x[5]), name: x[1], type: x[0], moving_time: x[2] * 60, distance: x[3] * 1000, total_elevation_gain: x[4] });
  }
  return out;
}
function demoWellness(todayStr){
  const out = [];
  for(let i = 89; i >= 0; i--){
    out.push({ id: fmt(addDays(parse(todayStr), -i)), ctl: 17 + (89 - i) * 0.1, atl: 13 + ((89 - i) % 5) * 1.7,
      sleepSecs: Math.round((6.4 + ((i * 7) % 11) / 10) * 3600), restingHR: 52 + (i % 3), hrv: 58 + (i * 5) % 14,
      steps: i === 0 ? 6480 : 5000 + (i * 1337) % 6000 });
  }
  return out;
}

async function icuGet(apiKey, path){
  let res;
  try{
    res = await fetch('https://intervals.icu/api/v1/athlete/0/' + path, { headers: { Authorization: 'Basic ' + btoa('API_KEY:' + apiKey), Accept: 'application/json' } });
  }catch(e){ throw { code: 'net' }; }
  if(res.status === 401 || res.status === 403) throw { code: 'auth' };
  if(!res.ok) throw { code: 'http' };
  return res.json();
}
async function fetchIcuAll(apiKey, from, todayStr){
  if(window.ALLURE_DEMO){ await new Promise(r => setTimeout(r, 350)); return { activities: demoActivities(from, todayStr), wellness: demoWellness(todayStr) }; }
  const base = 'activities?oldest=' + from + '&newest=' + todayStr + 'T23:59:59';
  let acts = await icuGet(apiKey, base + '&fields=' + ACT_FIELDS);
  if(Array.isArray(acts) && acts.length && acts.every(a => !a.start_date_local)) acts = await icuGet(apiKey, base);
  let wellness = [];
  // le bien-être est facultatif : une erreur ici ne doit pas bloquer le reste
  try{ wellness = await icuGet(apiKey, 'wellness.json?oldest=' + fmt(addDays(parse(todayStr), -89)) + '&newest=' + todayStr); }
  catch(e){ wellness = []; }
  return { activities: Array.isArray(acts) ? acts : [], wellness: Array.isArray(wellness) ? wellness : [] };
}

const hhmm = (ms) => { const d = new Date(ms); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
const fmtKm = (meters) => (meters / 1000).toFixed(meters >= 100000 ? 0 : 1).replace('.', ',');
function fmtHM(secs){
  const m = Math.round(secs / 60), h = Math.floor(m / 60), r = m % 60;
  return h ? <>{h}<span className="u">h</span>{pad(r)}</> : <>{r}<span className="u">min</span></>;
}
const signedMin = (secs) => { const m = Math.round(Math.abs(secs) / 60); return (secs < 0 ? '−' : '+') + fmtMin(m); };

/* ---------- icônes ---------- */
const PATHS = {
  today:   <><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none"/></>,
  plan:    <><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/></>,
  history: <><path d="M9 7h11M9 12h11M9 17h11"/><circle cx="4.7" cy="7" r="1" fill="currentColor" stroke="none"/><circle cx="4.7" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="4.7" cy="17" r="1" fill="currentColor" stroke="none"/></>,
  settings:<><path d="M4 8h9M19 8h1M4 16h1M11 16h9"/><circle cx="16" cy="8" r="2.2"/><circle cx="8" cy="16" r="2.2"/></>,
  muscu:   <path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>,
  plus:    <path d="M12 5v14M5 12h14"/>,
  check:   <path d="M5 12.5l4.5 4.5L19 7.5"/>,
  chevron: <path d="M6 9l6 6 6-6"/>,
  back:    <path d="M15 5l-7 7 7 7"/>,
  next:    <path d="M9 5l7 7-7 7"/>,
  refresh: <path d="M20 11a8 8 0 1 0-2.4 5.7M20 4.5V11h-6.5"/>,
  close:   <path d="M6 6l12 12M18 6L6 18"/>,
};
function Icon({ name, size=22, sw=1.9 }){
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{PATHS[name]}</svg>;
}

/* ---------- petits composants ---------- */
function Header({ title, sub, onSettings }){
  return (
    <div className="head">
      <div>
        <h1>{title}</h1>
        {sub && <p className="sub">{sub}</p>}
      </div>
      {onSettings && <button className="icon" aria-label="Réglages" onClick={onSettings}><Icon name="settings" /></button>}
    </div>
  );
}

function Sheet({ title, onClose, children }){
  useEffect(()=>{
    const onKey = (e)=>{ if(e.key==='Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return ()=>{ window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, []);
  return (
    <div className="scrim" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e)=>e.stopPropagation()}>
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="icon" aria-label="Fermer" onClick={onClose}><Icon name="close" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function DiscChips({ value, onChange }){
  return (
    <div className="chips" role="radiogroup" aria-label="Discipline">
      {DISC_IDS.map(id => (
        <button key={id} role="radio" aria-checked={value===id} className={"chip"+(value===id?" on":"")} style={{'--c':DISC[id].color}} onClick={()=>onChange(id)}>
          <i></i>{DISC[id].short}
        </button>
      ))}
    </div>
  );
}

/* ---------- Intervals.icu : chiffres de la semaine ---------- */
function IcuBlock({ conn, icu, onRefresh, onConnect, weekFrom, weekTo }){
  if(!conn) return (
    <div className="connect">
      <p>Connecte Intervals.icu pour voir ici tes heures, tes kilomètres, tes activités et ton tableau de bord.</p>
      <button className="btn" onClick={onConnect}>Connecter Intervals.icu</button>
    </div>
  );
  const acts = icu.activities.filter(a => a.date >= weekFrom && a.date <= weekTo);
  const secs = acts.reduce((n, a) => n + a.secs, 0);
  const meters = acts.reduce((n, a) => n + a.meters, 0);
  const first = icu.status === 'loading' && !icu.fetchedAt;
  let msg = icu.fetchedAt ? 'Intervals.icu · actualisé à ' + hhmm(icu.fetchedAt) : 'Intervals.icu';
  let bad = false;
  if(icu.status === 'loading') msg = 'Actualisation…';
  if(icu.status === 'auth'){ msg = 'Clé refusée par Intervals.icu. Vérifie-la dans les réglages.'; bad = true; }
  if(icu.status === 'offline'){ msg = icu.fetchedAt ? 'Hors connexion · données de ' + hhmm(icu.fetchedAt) : 'Impossible de joindre Intervals.icu.'; bad = !icu.fetchedAt; }
  if(icu.stubs > 0 && icu.status !== 'loading' && icu.status !== 'auth') msg += ' · ' + icu.stubs + (icu.stubs > 1 ? ' activités Strava illisibles' : ' activité Strava illisible');
  return (
    <div>
      <div className="figs" aria-busy={first}>
        <div className="fig"><span className="v">{first ? '–' : fmtHM(secs)}</span><span className="k">de sport</span></div>
        <div className="fig"><span className="v">{first ? '–' : <>{fmtKm(meters)}<span className="u">km</span></>}</span><span className="k">parcourus</span></div>
        <div className="fig"><span className="v">{first ? '–' : acts.length}</span><span className="k">{acts.length > 1 ? 'activités' : 'activité'}</span></div>
      </div>
      <div className="figfoot">
        <span className={bad ? 'bad' : ''}>{msg}</span>
        <button className={icu.status === 'loading' ? 'spin' : ''} aria-label="Actualiser Intervals.icu" onClick={onRefresh}><Icon name="refresh" size={19} /></button>
      </div>
    </div>
  );
}

/* ---------- Tableau de bord (cartes) ---------- */
const sumBy = (list, f) => list.reduce((n, a) => n + f(a), 0);
const KIND_ORDER = ['course', 'velo', 'nage', 'muscu', 'autre'];
const dominantKind = (list) => {
  const t = {}; list.forEach(a => { t[a.kind] = (t[a.kind] || 0) + a.secs; });
  return Object.keys(t).sort((x, y) => t[y] - t[x])[0] || null;
};

function buildDash(icu, todayStr){
  const t = parse(todayStr);
  const day = t.getDate(), daysIn = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
  const prevLen = new Date(t.getFullYear(), t.getMonth(), 0).getDate();
  const ym = todayStr.slice(0, 7), pym = fmt(new Date(t.getFullYear(), t.getMonth() - 1, 1)).slice(0, 7);
  const acts = icu.activities;
  const month = acts.filter(a => a.date.slice(0, 7) === ym);
  const prev = acts.filter(a => a.date.slice(0, 7) === pym);
  const dayOf = (a) => Number(a.date.slice(8, 10));
  const cum = (list, n) => { const out = []; let c = 0; for(let d = 1; d <= n; d++){ c += sumBy(list.filter(a => dayOf(a) === d), a => a.secs); out.push(c); } return out; };
  const pn = Math.min(day, prevLen);
  const cumThis = cum(month, day), cumPrev = cum(prev, pn);
  const prevSame = prev.filter(a => dayOf(a) <= pn);

  const calendar = []; // jour -> couleur dominante
  for(let d = 1; d <= daysIn; d++) calendar.push(dominantKind(month.filter(a => dayOf(a) === d)));
  const lead = (new Date(t.getFullYear(), t.getMonth(), 1).getDay() + 6) % 7;

  const sports = KIND_ORDER.map(k => { const l = month.filter(a => a.kind === k); return { kind: k, secs: sumBy(l, a => a.secs), meters: sumBy(l, a => a.meters) }; }).filter(x => x.secs > 0);

  const last7 = [];
  for(let i = 6; i >= 0; i--){
    const d = addDays(t, -i), iso = fmt(d), l = acts.filter(a => a.date === iso);
    last7.push({ iso, letter: DAYS_LETTER[(d.getDay() + 6) % 7], today: i === 0, total: sumBy(l, a => a.secs), segs: KIND_ORDER.map(k => ({ kind: k, secs: sumBy(l.filter(a => a.kind === k), a => a.secs) })).filter(x => x.secs > 0) });
  }
  const prev7 = [];
  for(let i = 13; i >= 7; i--) prev7.push(sumBy(acts.filter(a => a.date === fmt(addDays(t, -i))), a => a.secs));

  const w = icu.wellness || [];
  const byDate = {}; w.forEach(x => { byDate[x.date] = x; });
  const series = (key) => { const out = []; for(let i = 6; i >= 0; i--){ const x = byDate[fmt(addDays(t, -i))]; out.push(x && x[key] ? x[key] : null); } return out; };
  const latest = (key) => { for(let i = w.length - 1; i >= 0; i--) if(w[i][key]) return w[i]; return null; };

  return {
    cumThis, cumPrev, day, prevLen, deltaDur: (cumThis[day - 1] || 0) - (cumPrev[pn - 1] || 0), hasPrev: prev.length > 0,
    monthTotal: cumThis[day - 1] || 0, calendar, lead, daysIn, today: day, sports,
    last7, last7Total: sumBy(last7, x => x.total), prev7Total: sumBy(prev7, x => x),
    elev: sumBy(month, a => a.elev), elevDelta: sumBy(month, a => a.elev) - sumBy(prevSame, a => a.elev),
    sleep: { s: series('sleep'), last: latest('sleep') }, rhr: { s: series('rhr'), last: latest('rhr') },
    hrv: { s: series('hrv'), last: latest('hrv') }, steps: latest('steps'),
    monthName: MONTHS_LONG[t.getMonth()], prevName: MONTHS[t.getMonth() === 0 ? 11 : t.getMonth() - 1],
    dd: pad(day) + '/' + pad(t.getMonth() + 1), d1: '01/' + pad(t.getMonth() + 1),
  };
}

function LineChart({ a, b }){
  const W = 150, H = 54, n = a.length;
  const max = Math.max(1, ...a, ...b);
  const X = (i) => n > 1 ? 2 + (i / (n - 1)) * (W - 4) : W / 2;
  const Y = (v) => H - 3 - (v / max) * (H - 8);
  const path = (arr) => arr.map((v, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1)).join(' ');
  return (
    <svg className="chart" viewBox={'0 0 ' + W + ' ' + H} role="img" aria-label="Durée cumulée du mois">
      <line x1="0" y1={H - 1} x2={W} y2={H - 1} style={{stroke:'var(--line)'}} strokeWidth="1" />
      {b.length > 1 && <path d={path(b)} fill="none" style={{stroke:'var(--ink2)'}} strokeWidth="1.5" strokeDasharray="3 3" opacity=".7" />}
      {n > 1 && <path d={path(a)} fill="none" style={{stroke:'var(--ink)'}} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />}
      <circle cx={X(n - 1)} cy={Y(a[n - 1] || 0)} r="3.2" style={{fill:'var(--ink)'}} />
    </svg>
  );
}

function StackBars({ days }){
  const W = 150, H = 56, gap = 6, bw = (W - gap * 6) / 7;
  const max = Math.max(1, ...days.map(d => d.total));
  return (
    <div>
      <svg className="chart" viewBox={'0 0 ' + W + ' ' + H} role="img" aria-label="Durée par jour sur 7 jours">
        {days.map((d, i) => {
          let y = H; const x = i * (bw + gap);
          if(d.total === 0) return <rect key={d.iso} x={x} y={H - 2} width={bw} height="2" rx="1" style={{fill:'var(--line)'}} />;
          return <g key={d.iso}>{d.segs.map(sg => { const h = Math.max(2, (sg.secs / max) * (H - 2)); y -= h; return <rect key={sg.kind} x={x} y={y} width={bw} height={h} rx="2" style={{fill:(DISC[sg.kind] || DISC.autre).color}} />; })}</g>;
        })}
      </svg>
      <div className="letters">{days.map(d => <span key={d.iso} className={d.today ? 'now' : ''}>{d.letter}</span>)}</div>
    </div>
  );
}

function Spark({ values, bars, min0 }){
  const W = 150, H = 40, vals = values.map(v => v == null ? null : v);
  const real = vals.filter(v => v != null);
  if(real.length === 0) return null;
  const hi = Math.max(...real, min0 || 0), lo = bars ? 0 : Math.min(...real);
  const span = Math.max(hi - lo, 1e-6);
  if(bars){
    const gap = 6, bw = (W - gap * 6) / 7;
    return (
      <svg className="chart" viewBox={'0 0 ' + W + ' ' + H} aria-hidden="true">
        {vals.map((v, i) => <rect key={i} x={i * (bw + gap)} y={v == null ? H - 2 : H - Math.max(3, (v / hi) * (H - 2))} width={bw} height={v == null ? 2 : Math.max(3, (v / hi) * (H - 2))} rx="2" style={{fill: v == null ? 'var(--line)' : 'var(--ink)'}} opacity={v == null ? 1 : 0.85} />)}
      </svg>
    );
  }
  const X = (i) => 3 + (i / 6) * (W - 6), Y = (v) => H - 5 - ((v - lo) / span) * (H - 12);
  let d = ''; vals.forEach((v, i) => { if(v != null) d += (d ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1) + ' '; });
  const li = vals.map((v, i) => v != null ? i : -1).filter(i => i >= 0).pop();
  return (
    <svg className="chart" viewBox={'0 0 ' + W + ' ' + H} aria-hidden="true">
      <path d={d} fill="none" style={{stroke:'var(--ink)'}} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={X(li)} cy={Y(vals[li])} r="3" style={{fill:'var(--ink)'}} />
    </svg>
  );
}

function Card({ title, sub, wide, onClick, children }){
  const tap = onClick ? { role: 'button', tabIndex: 0, onClick, onKeyDown: (e) => { if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); onClick(); } } } : {};
  return (
    <section className={"wd" + (wide ? " wide" : "") + (onClick ? " tap" : "")} {...tap}>
      <h3>{title}</h3>
      {sub && <p className="s">{sub}</p>}
      {children}
    </section>
  );
}


/* ---------- Historique des cartes du tableau de bord ---------- */
function monthKeys(todayStr, n){
  const t = parse(todayStr);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(t.getFullYear(), t.getMonth() - (n - 1 - i), 1);
    return { key: d.getFullYear() + '-' + pad(d.getMonth() + 1), label: MONTHS[d.getMonth()].replace('.', ''), long: MONTHS_LONG[d.getMonth()] + ' ' + d.getFullYear(), days: new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() };
  });
}
const bySport = (l) => KIND_ORDER.map(k => ({ kind: k, secs: sumBy(l.filter(a => a.kind === k), a => a.secs), meters: sumBy(l.filter(a => a.kind === k), a => a.meters) })).filter(x => x.secs > 0);
function aggMonths(acts, todayStr){
  return monthKeys(todayStr, 6).map(m => {
    const l = acts.filter(a => a.date.slice(0, 7) === m.key);
    return { ...m, secs: sumBy(l, a => a.secs), meters: sumBy(l, a => a.meters), count: l.length, active: new Set(l.map(a => a.date)).size, sports: bySport(l) };
  });
}
function aggWeeks(acts, todayStr){
  const ws = startOfWeek(parse(todayStr));
  return Array.from({ length: 12 }, (_, i) => {
    const s = addDays(ws, -7 * (11 - i)), a = fmt(s), b = fmt(addDays(s, 6));
    const l = acts.filter(x => x.date >= a && x.date <= b);
    return { key: a, label: String(s.getDate()), long: 'Semaine du ' + shortDate(s), secs: sumBy(l, x => x.secs), meters: sumBy(l, x => x.meters), count: l.length, active: new Set(l.map(x => x.date)).size, sports: bySport(l) };
  });
}
const kmStr = (m) => fmtKm(m) + ' km';

function BarChart({ items, sel, onSel }){
  const W = 320, H = 150, T = 10, B = 22, n = items.length, gap = n > 8 ? 6 : 12, bw = (W - gap * (n - 1)) / n;
  const max = Math.max(1, ...items.map(i => i.total));
  return (
    <svg className="hist-svg" viewBox={'0 0 ' + W + ' ' + H} role="img" aria-label="Historique">
      <line x1="0" y1={H - B} x2={W} y2={H - B} style={{ stroke: 'var(--line)' }} strokeWidth="1" />
      {items.map((it, k) => {
        const x = k * (bw + gap); let y = H - B;
        return (
          <g key={it.key} onClick={() => onSel(k)} style={{ cursor: 'pointer' }} opacity={sel === k ? 1 : .5}>
            <rect x={x - gap / 2} y="0" width={bw + gap} height={H} fill="transparent" />
            {it.total === 0
              ? <rect x={x} y={H - B - 2} width={bw} height="2" rx="1" style={{ fill: 'var(--line)' }} />
              : it.segs.map((sg, j) => { const h = Math.max(2, (sg.v / max) * (H - T - B)); y -= h; return <rect key={j} x={x} y={y} width={bw} height={h} rx="3" style={{ fill: sg.color }} />; })}
            <text x={x + bw / 2} y={H - 7} textAnchor="middle" style={{ fontWeight: sel === k ? 700 : 400 }}>{it.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function TrendChart({ pts, fmtV }){
  const W = 320, H = 150, L = 8, R = 8, T = 14, B = 22;
  const [hi, setHi] = useState(null);
  const idxs = pts.map((p, i) => p.v != null ? i : -1).filter(i => i >= 0);
  if(idxs.length === 0) return <p className="empty" style={{ margin: '24px 0' }}>Pas encore de données sur cette période.</p>;
  const vals = idxs.map(i => pts[i].v);
  let lo = Math.min(...vals), up = Math.max(...vals);
  const margin = (up - lo) * 0.15 || Math.abs(up) * 0.05 || 1; lo -= margin; up += margin;
  const X = (i) => L + (pts.length > 1 ? i / (pts.length - 1) : .5) * (W - L - R);
  const Y = (v) => T + (1 - (v - lo) / (up - lo)) * (H - T - B);
  const d = idxs.map((i, k) => (k ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(pts[i].v).toFixed(1)).join(' ');
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  const sel = hi != null ? hi : idxs[idxs.length - 1];
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W;
    let best = idxs[0], bd = 1e9;
    idxs.forEach(i => { const dd = Math.abs(X(i) - x); if(dd < bd){ bd = dd; best = i; } });
    setHi(best);
  };
  return (
    <div>
      <div className="hist-read"><b>{fmtV(pts[sel].v)}</b><span>{pts[sel].label}</span></div>
      <svg className="hist-svg" viewBox={'0 0 ' + W + ' ' + H} role="img" aria-label="Évolution" onPointerDown={onMove} onPointerMove={onMove}>
        <line x1={L} y1={H - B} x2={W - R} y2={H - B} style={{ stroke: 'var(--line)' }} strokeWidth="1" />
        <line x1={L} y1={Y(avg)} x2={W - R} y2={Y(avg)} style={{ stroke: 'var(--ink2)' }} strokeWidth="1" strokeDasharray="3 4" opacity=".6" />
        <path d={d} fill="none" style={{ stroke: 'var(--ink)' }} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
        {idxs.length <= 40 && idxs.map(i => <circle key={i} cx={X(i)} cy={Y(pts[i].v)} r="2.6" style={{ fill: 'var(--ink)' }} />)}
        <line x1={X(sel)} y1={T - 4} x2={X(sel)} y2={H - B} style={{ stroke: 'var(--ink2)' }} strokeWidth="1" opacity=".5" />
        <circle cx={X(sel)} cy={Y(pts[sel].v)} r="5" style={{ fill: 'var(--ink)', stroke: 'var(--card)' }} strokeWidth="2" />
        <text x={L} y={H - 6}>{pts[0].short || pts[0].label}</text>
        <text x={W - R} y={H - 6} textAnchor="end">{pts[pts.length - 1].short || pts[pts.length - 1].label}</text>
      </svg>
      <p className="hist-hint">Ligne pointillée : moyenne de la période ({fmtV(avg)}). Glisse le doigt sur la courbe pour lire chaque valeur.</p>
    </div>
  );
}

const WELL = {
  sleep: { title: 'Sommeil', f: (v) => fmtMin(Math.round(v / 60)) },
  rhr: { title: 'FC au repos', f: (v) => Math.round(v) + ' bpm' },
  hrv: { title: 'VFC', f: (v) => Math.round(v) + ' ms' },
  steps: { title: 'Pas', f: (v) => Math.round(v).toLocaleString('fr-FR') },
};
const BAR_TITLES = { month: 'Durée par mois', week: 'Durée par semaine', cal: "Jours d'activité", sports: 'Activité par sport' };

function HistorySheet({ kind, icu, todayStr, onClose }){
  const w = WELL[kind];
  const [range, setRange] = useState(30);
  const [selIdx, setSelIdx] = useState(null);
  const months = useMemo(() => aggMonths(icu.activities, todayStr), [icu, todayStr]);
  const weeks = useMemo(() => aggWeeks(icu.activities, todayStr), [icu, todayStr]);

  if(w){
    const byDate = {}; (icu.wellness || []).forEach(x => { byDate[x.date] = x; });
    const t = parse(todayStr);
    const pts = Array.from({ length: range }, (_, i) => {
      const dt = addDays(t, -(range - 1 - i)), x = byDate[fmt(dt)];
      return { label: longDate(dt), short: shortDate(dt), v: x && x[kind] ? x[kind] : null };
    });
    const real = pts.filter(p => p.v != null).map(p => p.v);
    const last7 = pts.slice(-7).filter(p => p.v != null).map(p => p.v);
    const mean = (a) => a.length ? a.reduce((s, v) => s + v, 0) / a.length : null;
    const stat = (label, v) => <div><b>{v == null ? '–' : w.f(v)}</b><span>{label}</span></div>;
    return (
      <Sheet title={w.title} onClose={onClose}>
        <div className="seg" role="tablist" aria-label="Période">
          {[30, 90].map(r => <button key={r} role="tab" aria-selected={range === r} className={range === r ? 'on' : ''} onClick={() => setRange(r)}>{r} jours</button>)}
        </div>
        <TrendChart key={kind + range} pts={pts} fmtV={w.f} />
        <div className="hist-stats">
          {stat('Moy. 7 jours', mean(last7))}
          {stat('Moy. ' + range + ' j', mean(real))}
          {stat('Min', real.length ? Math.min(...real) : null)}
          {stat('Max', real.length ? Math.max(...real) : null)}
          {stat('Dernière', real.length ? real[real.length - 1] : null)}
          <div><b>{real.length}</b><span>jours renseignés</span></div>
        </div>
      </Sheet>
    );
  }

  const list = kind === 'week' ? weeks : months;
  const idx = selIdx == null ? list.length - 1 : selIdx;
  const cur = list[idx];
  let items;
  if(kind === 'cal') items = list.map(m => ({ key: m.key, label: m.label, total: m.active, segs: [{ v: m.active, color: 'var(--ink)' }] }));
  else if(kind === 'sports' || kind === 'week') items = list.map(m => ({ key: m.key, label: m.label, total: m.secs, segs: m.sports.map(s => ({ v: s.secs, color: (DISC[s.kind] || DISC.autre).color })) }));
  else items = list.map(m => ({ key: m.key, label: m.label, total: m.secs, segs: [{ v: m.secs, color: 'var(--ink)' }] }));
  const head = kind === 'cal' ? cur.active + (cur.active > 1 ? ' jours actifs' : ' jour actif') : fmtMin(Math.round(cur.secs / 60));
  const count = cur.count + (cur.count > 1 ? ' activités' : ' activité');
  const subline = kind === 'cal' ? 'sur ' + cur.days + ' jours · ' + cur.long : (cur.long || '') + ' · ' + count + (cur.meters ? ' · ' + kmStr(cur.meters) : '');
  return (
    <Sheet title={BAR_TITLES[kind]} onClose={onClose}>
      <div className="hist-read"><b>{head}</b><span>{subline}</span></div>
      <BarChart items={items} sel={idx} onSel={setSelIdx} />
      {(kind === 'sports' || kind === 'week') && (
        <div className="hist-rows">
          {cur.sports.length === 0 && <p className="empty" style={{ margin: '14px 0' }}>Aucune activité sur cette période.</p>}
          {cur.sports.map(s => {
            const dsc = DISC[s.kind] || DISC.autre;
            return <div className="r" key={s.kind} style={{ '--c': dsc.color }}><span><i></i>{dsc.short}</span><span>{fmtMin(Math.round(s.secs / 60))}{s.meters ? ' · ' + (s.kind === 'nage' ? Math.round(s.meters) + ' m' : kmStr(s.meters)) : ''}</span></div>;
          })}
        </div>
      )}
      {(kind === 'month' || kind === 'cal') && (
        <div className="hist-rows">
          {[...list].reverse().map(m => (
            <div className="r" key={m.key}><span style={{ textTransform: 'capitalize' }}>{m.long}</span><span>{kind === 'cal' ? m.active + ' j' : fmtMin(Math.round(m.secs / 60)) + (m.meters ? ' · ' + kmStr(m.meters) : '')}</span></div>
          ))}
        </div>
      )}
    </Sheet>
  );
}

/* ---------- Fiche d'une activité Intervals.icu (carte floutée + tracé interactif) ---------- */
async function icuFetch(apiKey, path){
  let res;
  try{ res = await fetch('https://intervals.icu/api/v1/' + path, { headers: { Authorization: 'Basic ' + btoa('API_KEY:' + apiKey), Accept: 'application/json' } }); }
  catch(e){ throw { code: 'net' }; }
  if(!res.ok) throw { code: res.status === 401 || res.status === 403 ? 'auth' : 'http' };
  return res.json();
}
function parseRoute(streams){
  let ll = null;
  if(Array.isArray(streams)) ll = streams.find(s => s && s.type === 'latlng');
  else if(streams && typeof streams === 'object') ll = streams.latlng || null;
  if(!ll || !Array.isArray(ll.data) || !Array.isArray(ll.data2)) return [];
  const pts = [];
  for(let i = 0; i < ll.data.length; i++){
    const la = ll.data[i], lo = ll.data2[i];
    if(typeof la === 'number' && typeof lo === 'number' && (la !== 0 || lo !== 0)) pts.push([la, lo]);
  }
  const step = Math.ceil(pts.length / 1500);
  return step > 1 ? pts.filter((_, i) => i % step === 0 || i === pts.length - 1) : pts;
}
function demoRoute(){
  const pts = [];
  for(let i = 0; i <= 140; i++){ const a = i / 140 * Math.PI * 2; pts.push([48.8300 + Math.sin(a) * 0.012 + Math.sin(a * 3) * 0.002, 2.3300 + Math.cos(a) * 0.018 + Math.cos(a * 2) * 0.003]); }
  return pts;
}
const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#111';
const clock = (secs) => { secs = Math.round(secs); const h = Math.floor(secs / 3600), m = Math.floor(secs % 3600 / 60), s = secs % 60; return h ? h + ':' + pad(m) + ':' + pad(s) : m + ':' + pad(s); };
const paceStr = (secs, meters, per) => { if(!secs || !meters) return '–'; const p = secs / meters * per; return Math.floor(p / 60) + "'" + pad(Math.round(p % 60) % 60) + '"'; };

function actStats(act, d){
  const secs = Number(d && d.moving_time) || act.secs, meters = Number(d && d.distance) || act.meters;
  const out = [];
  if(meters) out.push([act.kind === 'nage' ? Math.round(meters) + ' m' : fmtKm(meters) + ' km', 'Distance']);
  out.push([clock(secs), 'Durée']);
  if(meters && secs){
    if(act.kind === 'course') out.push([paceStr(secs, meters, 1000) + '/km', 'Allure moyenne']);
    else if(act.kind === 'nage') out.push([paceStr(secs, meters, 100) + '/100 m', 'Allure moyenne']);
    else if(act.kind === 'velo') out.push([(meters / secs * 3.6).toFixed(1).replace('.', ',') + ' km/h', 'Vitesse moyenne']);
  }
  if(d && d.average_heartrate) out.push([Math.round(d.average_heartrate) + ' bpm', 'FC moyenne']);
  if(d && d.max_heartrate) out.push([Math.round(d.max_heartrate) + ' bpm', 'FC max']);
  const elev = Number(d && d.total_elevation_gain) || act.elev;
  if(elev > 0 && (act.kind === 'course' || act.kind === 'velo')) out.push([Math.round(elev) + ' m', 'Dénivelé positif']);
  if(d && d.calories) out.push([Math.round(d.calories) + ' kcal', 'Calories']);
  if(d && d.icu_training_load) out.push([String(Math.round(d.icu_training_load)), "Charge d'entraînement"]);
  return out;
}

function RouteMap({ points, color }){
  const ref = useRef(null);
  useEffect(() => {
    if(!window.L || !ref.current || points.length < 2) return;
    const L = window.L;
    const map = L.map(ref.current, { zoomControl: true, scrollWheelZoom: true });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
    const line = L.polyline(points, { color, weight: 5, opacity: .95, lineJoin: 'round' }).addTo(map);
    L.circleMarker(points[0], { radius: 7, color: '#fff', weight: 2, fillColor: '#1a9850', fillOpacity: 1 }).addTo(map);
    L.circleMarker(points[points.length - 1], { radius: 7, color: '#fff', weight: 2, fillColor: '#d73027', fillOpacity: 1 }).addTo(map);
    map.fitBounds(line.getBounds(), { padding: [26, 26] });
    return () => map.remove();
  }, [points]);
  return <div ref={ref} className="routemap" role="application" aria-label="Carte du parcours, zoomable" />;
}

function ActivityModal({ act, conn, onClose }){
  const [st, setSt] = useState({ status: 'loading', detail: null, route: [] });
  const dsc = DISC[act.kind] || DISC.autre;
  useEffect(() => {
    const onKey = (e) => { if(e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, []);
  useEffect(() => {
    let off = false;
    (async () => {
      if(window.ALLURE_DEMO){
        await new Promise(r => setTimeout(r, 300));
        if(!off) setSt({ status: 'ok', detail: { average_heartrate: 152, max_heartrate: 171, calories: 540, icu_training_load: 62 }, route: act.kind === 'nage' ? [] : demoRoute() });
        return;
      }
      let detail = null, route = [], failed = 0;
      try{ detail = await icuFetch(conn.apiKey, 'activity/' + encodeURIComponent(act.id)); }catch(e){ failed++; }
      try{ route = parseRoute(await icuFetch(conn.apiKey, 'activity/' + encodeURIComponent(act.id) + '/streams.json?types=latlng')); }catch(e){ failed++; }
      if(!off) setSt({ status: failed === 2 ? 'error' : 'ok', detail, route });
    })();
    return () => { off = true; };
  }, [act.id]);
  const stats = actStats(act, st.detail);
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal-card" role="dialog" aria-modal="true" aria-label={act.name || dsc.short} onClick={(e) => e.stopPropagation()} style={{ '--c': dsc.color }}>
        <div className="modal-head">
          <div>
            <p className="mk"><i></i>{dsc.short}</p>
            <h2>{act.name || dsc.short}</h2>
            <p className="ms">{longDate(parse(act.date))}{act.time ? ' · ' + act.time : ''}</p>
          </div>
          <button className="icon" aria-label="Fermer" onClick={onClose}><Icon name="close" /></button>
        </div>
        <div className="mstats">{stats.map(([v, k]) => <div key={k}><b>{v}</b><span>{k}</span></div>)}</div>
        {st.status === 'loading' && <p className="mnote">Chargement du parcours…</p>}
        {st.status === 'error' && <p className="mnote">Impossible de charger les détails. Vérifie ta connexion.</p>}
        {st.status === 'ok' && st.route.length > 1 && <RouteMap points={st.route} color={cssVar('--' + ({ course: 'run', velo: 'bike', nage: 'swim', muscu: 'str' }[act.kind] || 'run'))} />}
        {st.status === 'ok' && st.route.length <= 1 && <p className="mnote">Pas de tracé GPS pour cette activité.</p>}
        {st.status === 'ok' && st.route.length > 1 && <p className="mnote small">Pince ou utilise + et − pour zoomer, glisse pour te déplacer.</p>}
      </div>
    </div>
  );
}

function Dash({ icu, todayStr }){
  const D = useMemo(() => buildDash(icu, todayStr), [icu, todayStr]);
  const [detail, setDetail] = useState(null);
  const maxSport = Math.max(1, ...D.sports.map(x => x.secs));
  const dayLabel = (x) => x && x.date === todayStr ? "Aujourd'hui" : (x ? shortDate(parse(x.date)) : '');
  const sleepMax = Math.max(8 * 3600, ...D.sleep.s.filter(Boolean));
  return (
    <div className="dash">
      <h2 className="dash-title">Tableau de bord</h2>
      <div className="wgrid">
        <Card title="Durée" sub="Ce mois-ci" onClick={() => setDetail('month')}>
          <p className="num">{fmtHM(D.monthTotal)}</p>
          {D.hasPrev && <p className="delta">{signedMin(D.deltaDur)} vs {D.prevName}</p>}
          <LineChart a={D.cumThis} b={D.hasPrev ? D.cumPrev : []} />
          <div className="axis"><span>{D.d1}</span><span>{D.dd}</span></div>
        </Card>

        <Card title={D.monthName.charAt(0).toUpperCase() + D.monthName.slice(1)} sub="Jours d'activité" onClick={() => setDetail('cal')}>
          <div className="cal" role="img" aria-label="Calendrier des activités du mois">
            {DAYS_LETTER.map((l, i) => <span key={'h' + i}>{l}</span>)}
            {Array.from({ length: D.lead }).map((_, i) => <b key={'e' + i}></b>)}
            {D.calendar.map((k, i) => {
              const dn = i + 1;
              const cls = dn > D.today ? 'future' : (k ? 'on' : 'none');
              return <b key={dn}><i className={cls + (dn === D.today ? ' today' : '')} style={k ? { '--c': (DISC[k] || DISC.autre).color } : undefined}></i></b>;
            })}
          </div>
        </Card>

        {D.sports.length > 0 && (
          <Card title="Activité" sub="Ce mois-ci" wide onClick={() => setDetail('sports')}>
            <div className="sports">
              {D.sports.map(x => (
                <div className="sp" key={x.kind} style={{'--c': (DISC[x.kind] || DISC.autre).color}}>
                  <div className="sp-row">
                    <span className="sp-name"><i></i>{(DISC[x.kind] || DISC.autre).short}</span>
                    <span className="sp-time">{fmtMin(Math.round(x.secs / 60))}</span>
                    <span className="sp-dist">{x.meters ? (x.kind === 'nage' ? Math.round(x.meters) + ' m' : fmtKm(x.meters) + ' km') : ''}</span>
                  </div>
                  <div className="sp-bar"><i style={{width: Math.max(3, (x.secs / maxSport) * 100) + '%'}}></i></div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card title="Durée" sub="7 derniers jours" onClick={() => setDetail('week')}>
          <p className="num">{fmtHM(D.last7Total)}</p>
          <p className="delta">{signedMin(D.last7Total - D.prev7Total)} vs semaine préc.</p>
          <StackBars days={D.last7} />
        </Card>

        {D.sleep.last && (
          <Card title="Sommeil" sub={dayLabel(D.sleep.last)} onClick={() => setDetail('sleep')}>
            <p className="num">{fmtHM(D.sleep.last.sleep)}</p>
            <Spark values={D.sleep.s} bars min0={sleepMax} />
          </Card>
        )}

        {D.rhr.last && (
          <Card title="FC au repos" sub={dayLabel(D.rhr.last)} onClick={() => setDetail('rhr')}>
            <p className="num">{Math.round(D.rhr.last.rhr)}<span className="u">bpm</span></p>
            <Spark values={D.rhr.s} />
          </Card>
        )}

        {D.hrv.last && (
          <Card title="VFC" sub={dayLabel(D.hrv.last)} onClick={() => setDetail('hrv')}>
            <p className="num">{Math.round(D.hrv.last.hrv)}<span className="u">ms</span></p>
            <Spark values={D.hrv.s} />
          </Card>
        )}

        {D.steps && D.steps.date === todayStr && (
          <Card title="Pas" sub="Aujourd'hui" onClick={() => setDetail('steps')}>
            <p className="num">{Math.round(D.steps.steps).toLocaleString('fr-FR')}</p>
          </Card>
        )}
      </div>
      {detail && <HistorySheet kind={detail} icu={icu} todayStr={todayStr} onClose={() => setDetail(null)} />}
    </div>
  );
}

function IcuSettings({ conn, icu, onConnect, onDisconnect, onRefresh }){
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const connect = async () => {
    setBusy(true); setMsg('');
    const r = await onConnect(key);
    setBusy(false);
    if(r.ok) setKey('');
    else setMsg(r.code === 'auth' ? "Clé refusée par Intervals.icu. Vérifie qu'elle est complète." : r.code === 'empty' ? 'Colle ta clé API.' : "Impossible de joindre Intervals.icu. Vérifie ta connexion.");
  };
  return (
    <div className="card">
      <h3>Intervals.icu</h3>
      {window.ALLURE_DEMO && <p className="note">Aperçu : les données affichées sont fictives, la vraie connexion ne fonctionne que dans l'application installée.</p>}
      {conn ? (
        <div>
          <p className="note">Connecté{icu.fetchedAt ? ' · dernière mise à jour à ' + hhmm(icu.fetchedAt) : ''}.</p>
          <div className="actions">
            <button className="btn ghost" onClick={onRefresh}>Actualiser</button>
            <button className="btn warn" onClick={()=>{ if(confirm('Déconnecter Intervals.icu et oublier la clé sur cet appareil ?')) onDisconnect(); }}>Déconnecter</button>
          </div>
        </div>
      ) : (
        <div>
          <p className="note">Sur Intervals.icu, ouvre la page Settings et copie la clé API tout en bas (Developer Settings). Elle reste sur cet appareil.</p>
          <label className="f" htmlFor="icu-key">Clé API</label>
          <input id="icu-key" type="password" autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck="false" value={key} onChange={(e)=>{ setKey(e.target.value); setMsg(''); }} />
          {msg && <p className="err" role="alert">{msg}</p>}
          <div className="actions"><button className="btn" disabled={busy} onClick={connect}>{busy ? 'Connexion…' : 'Connecter'}</button></div>
        </div>
      )}
    </div>
  );
}

/* ---------- Aujourd'hui ---------- */
function Today({ workouts, program, profile, todayStr, sel, setSel, templates, onOpenMuscu, icuConn, icu, onRefreshIcu, onToggle, onSettings }){
  const today = parse(todayStr);
  const [off, setOff] = useState(0);
  const touch = useRef(null);
  const [openAct, setOpenAct] = useState(null);
  useEffect(() => { setOff(0); }, [todayStr]);
  const weekStart = addDays(startOfWeek(today), off * 7);
  const wIdx = Math.floor(diffDays(weekStart, startOfWeek(parse(profile.programStart))) / 7);
  const week = wIdx >= 0 && wIdx < program.length ? program[wIdx] : null;

  const days = DAYS_LONG.map((_, i) => {
    const date = addDays(weekStart, i), iso = fmt(date);
    return {
      i, date, iso,
      planned: week ? week.sessions.filter(s => s.day === i) : [],
      free: workouts.filter(w => w.date === iso && !w.sessionId),
    };
  });
  const total = week ? week.sessions.length : 0;
  const done = week ? week.sessions.filter(s => s.done).length : 0;
  const cur = days.find(d => d.iso === sel) || days.find(d => d.iso === todayStr) || days[0];
  const isToday = cur.iso === todayStr;
  const icuDay = icuConn ? icu.activities.filter(a => a.date === cur.iso) : [];

  const goWeek = (delta) => {
    const n = Math.max(-52, Math.min(52, off + delta));
    if(n === off) return;
    setOff(n);
    setSel(n === 0 ? todayStr : fmt(addDays(addDays(startOfWeek(today), n * 7), cur.i)));
  };
  const backToToday = () => { setOff(0); setSel(todayStr); };
  const onTouchStart = (e) => { const t = e.touches[0]; touch.current = { x: t.clientX, y: t.clientY }; };
  const onTouchEnd = (e) => {
    const s0 = touch.current; touch.current = null;
    if(!s0) return;
    const t = e.changedTouches[0], dx = t.clientX - s0.x, dy = t.clientY - s0.y;
    if(Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) goWeek(dx < 0 ? 1 : -1);
  };

  let sub = longDate(today);

  return (
    <div>
      <Header title="Aujourd'hui" sub={sub} onSettings={onSettings} />
      <IcuBlock conn={icuConn} icu={icu} onRefresh={onRefreshIcu} onConnect={onSettings} weekFrom={fmt(weekStart)} weekTo={fmt(addDays(weekStart, 6))} />

      <div className="swipe" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="weekbar">
        <div>
          <b>{week ? 'Semaine ' + (wIdx+1) : 'Hors programme'}</b>
          <span>{shortDate(weekStart)} – {shortDate(addDays(weekStart, 6))}{week ? ' · ' + done + ' sur ' + total + ' faites' : ''}</span>
        </div>
        <div className="wnav">
          {off !== 0 && <button className="wtoday" onClick={backToToday}>Aujourd'hui</button>}
          <button aria-label="Semaine précédente" onClick={()=>goWeek(-1)}><Icon name="back" size={20} /></button>
          <button aria-label="Semaine suivante" onClick={()=>goWeek(1)}><Icon name="next" size={20} /></button>
        </div>
      </div>
      <div className="strip">
        {days.map(d => (
          <button key={d.iso} className={"day"+(d.iso===cur.iso?" sel":"")+(d.iso===todayStr?" today":"")}
                  aria-pressed={d.iso===cur.iso} aria-label={longDate(d.date)} onClick={()=>setSel(d.iso)}>
            <span className="l">{DAYS_LETTER[d.i]}</span>
            <span className="n">{d.date.getDate()}</span>
            <span className="dots">
              {d.planned.map(s => <i key={s.id} className={"dot"+(s.done?" on":"")} style={{'--c':DISC[s.discipline].color}}></i>)}
              {d.free.map(w => <i key={w.id} className="dot on" style={{'--c':(DISC[w.discipline]||DISC.course).color}}></i>)}
            </span>
          </button>
        ))}
      </div>

      {!isToday && <h2 className="daytitle">{longDate(cur.date)}</h2>}

      <ul>
        {cur.planned.map(s => (
          <li key={s.id} className={"item"+(s.done?" done":"")} style={{'--c':DISC[s.discipline].color}}>
            <div className="item-text">
              <h3>{(s.templateId && (templates.find(t => t.id === s.templateId) || {}).name) || DISC[s.discipline].short}</h3>
              <p className="desc">{s.desc}</p>
              {s.target && <p className="tgt">{s.target}</p>}
              {s.templateId && templates.some(t => t.id === s.templateId) && (
                <button className="openlink" onClick={()=>onOpenMuscu(s.templateId, { wIdx, sid: s.id })}>Voir les exercices</button>
              )}
            </div>
            <button className="check" aria-label={s.done ? 'Marquer comme non faite' : 'Marquer comme faite'} aria-pressed={s.done} onClick={()=>onToggle(wIdx, s.id)}>
              <span className="c"><Icon name="check" size={18} sw={2.6} /></span>
            </button>
          </li>
        ))}
        {cur.free.map(w => {
          const dsc = DISC[w.discipline] || DISC.course;
          return (
            <li key={w.id} className="item done" style={{'--c':dsc.color}}>
              <div className="item-text" style={{opacity:1}}>
                <h3>{w.title || dsc.short}</h3>
                <p className="desc">{fmtMin(w.duration)}{w.distance ? ' · ' + w.distance + ' km' : ''}</p>
                <p className="tag">Hors plan</p>
              </div>
              <div className="check"><span className="c"><Icon name="check" size={18} sw={2.6} /></span></div>
            </li>
          );
        })}
        {icuDay.map(a => {
          const dsc = DISC[a.kind] || DISC.autre;
          return (
            <li key={a.id} className="item act" style={{'--c':dsc.color}} role="button" tabIndex={0} aria-label={'Détails : ' + (a.name || dsc.short)}
                onClick={()=>setOpenAct(a)} onKeyDown={(e)=>{ if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); setOpenAct(a); } }}>
              <div className="item-text">
                <h3>{a.name || dsc.short}</h3>
                <p className="desc">{fmtMin(Math.round(a.secs / 60))}{a.meters ? ' · ' + fmtKm(a.meters) + ' km' : ''}</p>
                <p className="tag">{a.time ? a.time + ' · ' : ''}Intervals.icu</p>
              </div>
              <span className="acthint"><Icon name="chevron" /></span>
            </li>
          );
        })}
      </ul>
      {cur.planned.length === 0 && cur.free.length === 0 && icuDay.length === 0 && (
        <p className="rest">{week ? 'Repos.' : 'Rien de prévu.'}</p>
      )}
      </div>
      {icuConn && icu.fetchedAt && <Dash icu={icu} todayStr={todayStr} />}
      {openAct && icuConn && <ActivityModal act={openAct} conn={icuConn} onClose={()=>setOpenAct(null)} />}
    </div>
  );
}

/* ---------- Calendrier ---------- */
function chipLabel(s, templates){
  if(s.discipline === 'muscu'){
    const t = s.templateId && templates.find(x => x.id === s.templateId);
    if(t) return t.name.replace(/ force$/i, '').replace(/^Rappel haut du corps/i, 'Haut');
  }
  return s.discipline === 'nage' ? 'Nage' : s.discipline === 'muscu' ? 'Muscu.' : DISC[s.discipline].short;
}

function Calendar({ program, profile, todayStr, templates, onToggle, onEdit, onAdd, onMove, onOpenMuscu, onSettings }){
  const today = parse(todayStr);
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selDay, setSelDay] = useState(todayStr);
  const [ghost, setGhost] = useState(null);
  const [over, setOver] = useState(null);
  const drag = useRef(null);
  const timer = useRef(null);
  const latest = useRef({});
  latest.current = { onMove };
  const base = startOfWeek(parse(profile.programStart));

  const byDate = useMemo(() => {
    const m = {};
    program.forEach((w, i) => w.sessions.forEach(x => {
      const iso = fmt(addDays(base, i * 7 + x.day));
      (m[iso] = m[iso] || []).push({ s: x, w: i });
    }));
    Object.keys(m).forEach(k => m[k].sort((p, q) => (p.s.discipline === 'muscu') - (q.s.discipline === 'muscu')));
    return m;
  }, [program, profile.programStart]);

  // glisser-déposer : appui long sur une séance (tactile) ou simple glissement (souris)
  useEffect(() => {
    const cellAt = (x, y) => { const el = document.elementFromPoint(x, y), c = el && el.closest ? el.closest('[data-iso]') : null; return c ? c.getAttribute('data-iso') : null; };
    const stop = () => { clearTimeout(timer.current); drag.current = null; setGhost(null); setOver(null); };
    const activate = (st) => { st.active = true; setGhost({ x: st.x, y: st.y, label: st.label, color: st.color }); setOver(st.from); try{ navigator.vibrate && navigator.vibrate(12); }catch(e){} };
    const move = (e) => {
      const st = drag.current;
      if(!st || e.pointerId !== st.pid) return;
      st.x = e.clientX; st.y = e.clientY;
      if(!st.active){
        if(Math.hypot(e.clientX - st.sx, e.clientY - st.sy) > 8){
          if(st.mouse){ clearTimeout(timer.current); activate(st); } else { clearTimeout(timer.current); drag.current = null; }
        }
        return;
      }
      setGhost(g => g && { ...g, x: e.clientX, y: e.clientY });
      setOver(cellAt(e.clientX, e.clientY));
    };
    const up = (e) => {
      const st = drag.current;
      if(!st || e.pointerId !== st.pid) return;
      const was = st.active, iso = was ? cellAt(e.clientX, e.clientY) : null;
      stop();
      if(was && iso && iso !== st.from) latest.current.onMove(st.w, st.sid, iso);
    };
    const blockScroll = (e) => { if(drag.current && drag.current.active && e.cancelable) e.preventDefault(); };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', stop);
    document.addEventListener('touchmove', blockScroll, { passive: false });
    return () => {
      document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', stop); document.removeEventListener('touchmove', blockScroll);
      clearTimeout(timer.current);
    };
  }, []);

  const onChipDown = (e, w, x, iso) => {
    if(e.pointerType === 'mouse' && e.button !== 0) return;
    const st = { pid: e.pointerId, sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY, w, sid: x.id, from: iso, mouse: e.pointerType === 'mouse', active: false,
                 label: chipLabel(x, templates), color: DISC[x.discipline].color };
    drag.current = st;
    clearTimeout(timer.current);
    if(!st.mouse) timer.current = setTimeout(() => { if(drag.current === st){ const act = st; act.active = true; setGhost({ x: act.x, y: act.y, label: act.label, color: act.color }); setOver(act.from); try{ navigator.vibrate && navigator.vibrate(12); }catch(er){} } }, 350);
  };

  const gridStart = startOfWeek(month);
  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const rows = Math.ceil((diffDays(lastDay, gridStart) + 1) / 7);
  const cells = Array.from({ length: rows * 7 }, (_, i) => addDays(gridStart, i));
  const shiftMonth = (n) => setMonth(m => new Date(m.getFullYear(), m.getMonth() + n, 1));
  const goToday = () => { setMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setSelDay(todayStr); };
  const monthTitle = MONTHS_LONG[month.getMonth()] + ' ' + month.getFullYear();
  const dayList = byDate[selDay] || [];
  const onCurrentMonth = month.getFullYear() === today.getFullYear() && month.getMonth() === today.getMonth();

  return (
    <div>
      <Header title="Calendrier" sub="Maintiens une séance pour la déplacer" onSettings={onSettings} />
      <div className="cal-nav">
        <b>{monthTitle}</b>
        <div className="wnav">
          {!onCurrentMonth && <button className="wtoday" onClick={goToday}>Aujourd'hui</button>}
          <button aria-label="Mois précédent" onClick={()=>shiftMonth(-1)}><Icon name="back" size={20} /></button>
          <button aria-label="Mois suivant" onClick={()=>shiftMonth(1)}><Icon name="next" size={20} /></button>
        </div>
      </div>
      <div className="cal-head">{DAYS_LETTER.map((l, i) => <span key={i}>{l}</span>)}</div>
      <div className="cal-grid">
        {cells.map(d => {
          const iso = fmt(d), list = byDate[iso] || [];
          return (
            <div key={iso} data-iso={iso} aria-label={longDate(d)}
                 className={"cal-cell" + (d.getMonth() === month.getMonth() ? '' : ' out') + (iso === todayStr ? ' today' : '') + (iso === selDay ? ' sel' : '') + (over === iso ? ' over' : '')}
                 onClick={()=>setSelDay(iso)}>
              <span className="cn">{d.getDate()}</span>
              {list.slice(0, 3).map(({ s: x, w }) => (
                <div key={x.id} className={"cchip" + (x.done ? ' done' : '') + (ghost && drag.current && drag.current.sid === x.id ? ' lift' : '')}
                     style={{ '--c': DISC[x.discipline].color }} onPointerDown={(e)=>onChipDown(e, w, x, iso)} onContextMenu={(e)=>e.preventDefault()}>
                  {chipLabel(x, templates)}
                </div>
              ))}
              {list.length > 3 && <span className="more">+{list.length - 3}</span>}
            </div>
          );
        })}
      </div>

      <h2 className="daytitle" style={{ marginTop: 22 }}>{longDate(parse(selDay))}</h2>
      {dayList.length === 0 && <p className="rest" style={{ marginBottom: 10 }}>Rien de prévu.</p>}
      {dayList.map(({ s: x, w }) => (
        <div key={x.id} className={"srow" + (x.done ? ' done' : '')} style={{ '--c': DISC[x.discipline].color }}>
          <div className="m">
            <button className="t" onClick={()=>onEdit(w, x.id)} aria-label={'Modifier : ' + x.desc}>
              <b>{chipLabel(x, templates)}</b>
              <span>{x.desc}</span>
              {x.target && <em>{x.target}</em>}
            </button>
            {x.templateId && templates.some(t => t.id === x.templateId) && (
              <button className="openlink" onClick={()=>onOpenMuscu(x.templateId, { wIdx: w, sid: x.id })}>Voir les exercices</button>
            )}
          </div>
          <button className="mini" aria-label={x.done ? 'Marquer comme non faite' : 'Marquer comme faite'} aria-pressed={x.done} onClick={()=>onToggle(w, x.id)}>
            <span className="c"><Icon name="check" size={15} sw={3} /></span>
          </button>
        </div>
      ))}
      <div className="fabwrap"><div className="fabin">
        <button className="fab" onClick={()=>onAdd(selDay)}><Icon name="plus" size={20} sw={2.4} /> Séance</button>
      </div></div>

      {ghost && <div className="cghost" style={{ left: ghost.x, top: ghost.y, '--c': ghost.color }}>{ghost.label}</div>}
    </div>
  );
}

/* ---------- Historique ---------- */
function History({ workouts, onDelete, onSettings }){
  const [open, setOpen] = useState(null);
  const sorted = useMemo(()=> [...workouts].sort((a,b)=> b.date.localeCompare(a.date)), [workouts]);
  const groups = [];
  sorted.forEach(w => {
    const key = w.date.slice(0,7);
    let g = groups[groups.length-1];
    if(!g || g.key !== key){ g = { key, items: [] }; groups.push(g); }
    g.items.push(w);
  });
  return (
    <div>
      <Header title="Historique" sub={workouts.length ? workouts.length + (workouts.length>1 ? ' séances' : ' séance') : null} onSettings={onSettings} />
      {workouts.length === 0 && <p className="empty">Aucune séance pour le moment. Coche une séance du plan ou ajoute-en une avec le bouton +.</p>}
      {groups.map(g => {
        const [y, m] = g.key.split('-').map(Number);
        return (
          <div key={g.key}>
            <p className="month">{MONTHS_LONG[m-1]} {y}</p>
            {g.items.map(w => {
              const dsc = DISC[w.discipline] || DISC.course;
              const isOpen = open === w.id;
              const hasMore = w.avgHR || w.rpe || w.notes || (w.exercises && w.exercises.length);
              return (
                <div className="hrow" key={w.id} style={{'--c':dsc.color}}>
                  <button className="hmain" aria-expanded={isOpen} onClick={()=>setOpen(isOpen ? null : w.id)}>
                    <span className="hdate">{shortDate(parse(w.date))}</span>
                    <span className="hwhat"><b>{w.title || dsc.short}</b><span>{fmtMin(w.duration)}{w.distance ? ' · ' + w.distance + ' km' : ''}</span></span>
                  </button>
                  {isOpen && (
                    <div className="hmore">
                      {w.avgHR ? <p><b>{w.avgHR}</b> bpm en moyenne</p> : null}
                      {w.rpe ? <p>Effort ressenti <b>{w.rpe}/10</b></p> : null}
                      {w.notes ? <p>{w.notes}</p> : null}
                      {w.exercises && w.exercises.map((e, k) => (
                        <p key={k}><b>{e.name}</b><br/>{fmtSets(e.sets)}</p>
                      ))}
                      {!hasMore && <p>Pas de détail.</p>}
                      <div className="actions" style={{marginTop:14}}>
                        <button className="link" style={{padding:'8px 0'}} onClick={()=>{ if(confirm('Supprimer cette séance ?')) onDelete(w); }}>Supprimer</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Feuille : séance faite ---------- */
function LogSheet({ date, onSave, onClose }){
  const [f, setF] = useState({ date, discipline:'course', duration:'', distance:'', avgHR:'', rpe:'', notes:'' });
  const [more, setMore] = useState(false);
  const [err, setErr] = useState('');
  const set = (k, v) => setF(prev => ({...prev, [k]: v}));
  const save = () => {
    if(!(Number(f.duration) > 0)){ setErr('Indique la durée en minutes.'); return; }
    onSave({ ...f, duration: Number(f.duration) });
  };
  return (
    <Sheet title="Séance faite" onClose={onClose}>
      <label className="f">Discipline</label>
      <DiscChips value={f.discipline} onChange={(v)=>set('discipline', v)} />
      <label className="f" htmlFor="log-dur">Durée (minutes)</label>
      <input id="log-dur" className="big" type="number" inputMode="numeric" min="1" placeholder="45" value={f.duration} onChange={(e)=>{ set('duration', e.target.value); setErr(''); }} autoFocus />
      <label className="f" htmlFor="log-date">Date</label>
      <input id="log-date" type="date" value={f.date} onChange={(e)=>set('date', e.target.value)} />
      {!more && <button className="more-toggle" onClick={()=>setMore(true)}>Ajouter des détails</button>}
      {more && (
        <div>
          <div className="grid2">
            <div><label className="f" htmlFor="log-km">Distance (km)</label><input id="log-km" type="number" inputMode="decimal" step="0.1" value={f.distance} onChange={(e)=>set('distance', e.target.value)} /></div>
            <div><label className="f" htmlFor="log-hr">FC moyenne</label><input id="log-hr" type="number" inputMode="numeric" value={f.avgHR} onChange={(e)=>set('avgHR', e.target.value)} /></div>
          </div>
          <label className="f" htmlFor="log-rpe">Effort ressenti (1 à 10)</label>
          <input id="log-rpe" type="number" inputMode="numeric" min="1" max="10" value={f.rpe} onChange={(e)=>set('rpe', e.target.value)} />
          <label className="f" htmlFor="log-notes">Notes</label>
          <textarea id="log-notes" value={f.notes} onChange={(e)=>set('notes', e.target.value)}></textarea>
        </div>
      )}
      {err && <p className="err" role="alert">{err}</p>}
      <div className="actions"><button className="btn" onClick={save}>Enregistrer</button></div>
    </Sheet>
  );
}

/* ---------- Feuille : modifier une séance du plan ---------- */
function SessionSheet({ initial, isNew, templates, onSave, onDelete, onClose }){
  const [f, setF] = useState(initial);
  const [err, setErr] = useState('');
  const set = (k, v) => setF(prev => ({...prev, [k]: v}));
  const save = () => {
    if(!f.desc.trim()){ setErr('Ajoute une description.'); return; }
    if(!f.date){ setErr('Choisis une date.'); return; }
    onSave({ ...f, desc: f.desc.trim(), target: f.target.trim() });
  };
  return (
    <Sheet title={isNew ? 'Nouvelle séance' : 'Modifier la séance'} onClose={onClose}>
      <label className="f">Discipline</label>
      <DiscChips value={f.discipline} onChange={(v)=>setF(prev => ({...prev, discipline: v, templateId: v==='muscu' ? prev.templateId : ''}))} />
      {f.discipline === 'muscu' && templates.length > 0 && (
        <div>
          <label className="f">Séance type</label>
          <div className="chips" role="radiogroup" aria-label="Séance type">
            <button role="radio" aria-checked={!f.templateId} className={"chip"+(!f.templateId?" on":"")} onClick={()=>set('templateId','')}>Aucune</button>
            {templates.map(t => (
              <button key={t.id} role="radio" aria-checked={f.templateId===t.id} className={"chip"+(f.templateId===t.id?" on":"")}
                      onClick={()=>setF(prev => ({...prev, templateId: t.id, desc: prev.desc.trim() ? prev.desc : t.name}))}>{t.name}</button>
            ))}
          </div>
        </div>
      )}
      <label className="f" htmlFor="s-date">Date</label>
      <input id="s-date" type="date" value={f.date} onChange={(e)=>{ set('date', e.target.value); setErr(''); }} />
      <label className="f" htmlFor="s-desc">Description</label>
      <input id="s-desc" value={f.desc} placeholder="Sortie longue Z2" onChange={(e)=>{ set('desc', e.target.value); setErr(''); }} />
      <label className="f" htmlFor="s-tgt">Objectif</label>
      <input id="s-tgt" value={f.target} placeholder="1h30, Z2" onChange={(e)=>set('target', e.target.value)} />
      {err && <p className="err" role="alert">{err}</p>}
      <div className="actions">
        <button className="btn" onClick={save}>Enregistrer</button>
        {!isNew && <button className="btn warn" onClick={()=>{ if(confirm('Supprimer cette séance du plan ?')) onDelete(); }}>Supprimer</button>}
      </div>
    </Sheet>
  );
}

/* ---------- Muscu ---------- */
const num = (v) => Number(String(v).replace(',', '.')) || 0;
const countEx = (t) => t.blocks.reduce((n, b) => n + b.exercises.length, 0);
const countSets = (t) => t.blocks.reduce((n, b) => n + b.exercises.reduce((m, e) => m + e.sets.length, 0), 0);
const fmtSets = (sets) => sets.map(s => s.kg ? s.reps + ' × ' + s.kg + ' kg' : String(s.reps)).join(' · ');

/* ---------- Journal de musculation : historique des charges et records ---------- */
const fmtKg = (v) => String(Math.round(v * 10) / 10).replace('.', ',') + ' kg';
function buildJournal(workouts){
  const map = {};
  workouts.filter(w => w.exercises && w.exercises.length).forEach(w => {
    w.exercises.forEach(e => {
      const sets = (e.sets || []).filter(s => s.reps > 0 || s.kg > 0);
      if(!sets.length) return;
      const top = sets.reduce((b, s) => (s.kg > b.kg || (s.kg === b.kg && s.reps > b.reps)) ? s : b, sets[0]);
      (map[e.name] = map[e.name] || []).push({ date: w.date, sets, top, e1rm: Math.max(...sets.map(s => s.kg * (1 + s.reps / 30))), volume: sets.reduce((n, s) => n + s.kg * s.reps, 0) });
    });
  });
  return Object.keys(map).map(name => {
    const h = map[name].sort((a, b) => a.date.localeCompare(b.date));
    const weighted = h.some(x => x.top.kg > 0);
    const metric = (x) => weighted ? x.top.kg : x.top.reps;
    let best = -1, prs = 0;
    h.forEach((x, i) => { const v = metric(x); x.pr = i > 0 && v > best; if(x.pr) prs++; if(v > best) best = v; });
    const prSession = h.filter(x => metric(x) === best).pop();
    return { name, h, weighted, metric, best, prs, prSession, last: h[h.length - 1], e1rm: weighted ? Math.max(...h.map(x => x.e1rm)) : 0 };
  }).sort((a, b) => b.last.date.localeCompare(a.last.date));
}
const topStr = (ex, x) => ex.weighted ? fmtKg(x.top.kg) + ' × ' + x.top.reps : x.top.reps + ' reps';

function ExerciseSheet({ ex, onClose }){
  const pts = ex.h.map(x => ({ label: longDate(parse(x.date)) + ' · ' + topStr(ex, x), short: shortDate(parse(x.date)), v: ex.metric(x) }));
  const fmtV = (v) => ex.weighted ? fmtKg(v) : v + ' reps';
  return (
    <Sheet title={ex.name} onClose={onClose}>
      <TrendChart pts={pts} fmtV={fmtV} />
      <div className="hist-stats">
        <div><b>{fmtV(ex.best)}</b><span>Record{ex.weighted ? ' (' + ex.prSession.top.reps + ' reps)' : ''}</span></div>
        {ex.weighted && <div><b>{fmtKg(ex.e1rm)}</b><span>1RM estimé</span></div>}
        <div><b>{ex.h.length}</b><span>{ex.h.length > 1 ? 'séances' : 'séance'}</span></div>
      </div>
      <div className="hist-rows">
        {[...ex.h].reverse().map((x, i) => (
          <div className="r col" key={i}>
            <span><b>{shortDate(parse(x.date))}</b>{x.pr && <em className="prtag">Record</em>}</span>
            <span className="sets">{fmtSets(x.sets)}</span>
          </div>
        ))}
      </div>
    </Sheet>
  );
}

function MuscuJournal({ workouts }){
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(null);
  const all = useMemo(() => buildJournal(workouts), [workouts]);
  const list = all.filter(e => e.name.toLowerCase().includes(q.trim().toLowerCase()));
  if(all.length === 0) return <p className="empty">Le journal se remplit quand tu termines une séance de musculation depuis l'onglet Séances : chaque exercice y garde l'historique de ses charges et tes records.</p>;
  return (
    <div>
      <input type="search" placeholder="Rechercher un exercice" aria-label="Rechercher un exercice" value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 12 }} />
      {list.length === 0 && <p className="empty">Aucun exercice ne correspond.</p>}
      {list.map(ex => (
        <button key={ex.name} className="tcard jr" onClick={() => setOpen(ex)}>
          <div>
            <h3>{ex.name}</h3>
            <p>Dernière : {topStr(ex, ex.last)} · {shortDate(parse(ex.last.date))}</p>
            <p>Record : <b>{ex.weighted ? fmtKg(ex.best) : ex.best + ' reps'}</b>{ex.weighted ? ' × ' + ex.prSession.top.reps : ''} · {ex.h.length} {ex.h.length > 1 ? 'séances' : 'séance'}</p>
          </div>
          <span className="go"><Icon name="chevron" /></span>
        </button>
      ))}
      {open && <ExerciseSheet ex={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function MuscuHome({ templates, workouts, onOpen, onNew, onSettings }){
  const [tab, setTab] = useState('seances');
  return (
    <div>
      <Header title="Musculation" sub={templates.length + (templates.length > 1 ? ' séances' : ' séance')} onSettings={onSettings} />
      <div className="seg" role="tablist" aria-label="Musculation">
        <button role="tab" aria-selected={tab === 'seances'} className={tab === 'seances' ? 'on' : ''} onClick={() => setTab('seances')}>Séances</button>
        <button role="tab" aria-selected={tab === 'journal'} className={tab === 'journal' ? 'on' : ''} onClick={() => setTab('journal')}>Journal</button>
      </div>
      {tab === 'seances' ? <MuscuList templates={templates} onOpen={onOpen} onNew={onNew} /> : <MuscuJournal workouts={workouts} />}
    </div>
  );
}

function MuscuList({ templates, onOpen, onNew }){
  return (
    <div>
      {templates.map(t => (
        <button key={t.id} className="tcard" onClick={()=>onOpen(t.id)}>
          <div>
            <h3>{t.name}</h3>
            <p>{countEx(t)} exercices · {countSets(t)} séries</p>
          </div>
          <span className="go"><Icon name="chevron" /></span>
        </button>
      ))}
      <button className="btn ghost full" style={{marginTop:6}} onClick={onNew}>+ Nouvelle séance</button>
    </div>
  );
}

function MuscuDetail({ template, startEdit, onUpdate, onDelete, onBack, onFinish }){
  const [edit, setEdit] = useState(!!startEdit);
  const upd = (fn) => onUpdate({ ...template, blocks: fn(template.blocks) });
  const mapEx = (exId, fn) => upd(bl => bl.map(b => ({ ...b, exercises: b.exercises.map(e => e.id === exId ? fn(e) : e) })));
  const setVal = (exId, setId, k, v) => mapEx(exId, e => ({ ...e, sets: e.sets.map(x => x.id === setId ? { ...x, [k]: v } : x) }));
  const addSet = (exId) => mapEx(exId, e => { const last = e.sets[e.sets.length - 1]; return { ...e, sets: [...e.sets, { id: uid(), reps: last ? last.reps : 10, kg: last ? last.kg : 0 }] }; });
  const delSet = (exId, setId) => mapEx(exId, e => ({ ...e, sets: e.sets.filter(x => x.id !== setId) }));
  const rename = (exId, name) => mapEx(exId, e => ({ ...e, name }));
  const delEx = (exId) => upd(bl => bl.map(b => ({ ...b, exercises: b.exercises.filter(e => e.id !== exId) })).filter(b => b.exercises.length));
  const addEx = () => upd(bl => [...bl, mkBlock(mkEx('Nouvel exercice', times(3, 10, 0)))]);

  const renderEx = (e) => (
    <div className="ex" key={e.id}>
      {edit
        ? <input className="exname" aria-label="Nom de l'exercice" value={e.name} onChange={(ev)=>rename(e.id, ev.target.value)} />
        : <h3>{e.name}</h3>}
      {e.note && <p className="exnote">{e.note}</p>}
      <div className="sets">
        <div className="seth"><span></span><span>Répétitions</span><span>{e.kgLabel || 'Poids (kg)'}</span><span></span></div>
        {e.sets.map((x, i) => (
          <div className="set" key={x.id}>
            <span className="n">{i + 1}</span>
            <input type="text" inputMode="numeric" aria-label={'Répétitions, série ' + (i+1)} value={x.reps} onChange={(ev)=>setVal(e.id, x.id, 'reps', ev.target.value)} />
            <input type="text" inputMode="decimal" aria-label={'Poids, série ' + (i+1)} value={x.kg} onChange={(ev)=>setVal(e.id, x.id, 'kg', ev.target.value)} />
            <button className="x" aria-label={'Retirer la série ' + (i+1)} onClick={()=>delSet(e.id, x.id)}><Icon name="close" size={18} /></button>
          </div>
        ))}
      </div>
      <div className="exfoot">
        <button className="link" onClick={()=>addSet(e.id)}>+ Série</button>
        {edit && <button className="link" onClick={()=>{ if(confirm('Supprimer cet exercice ?')) delEx(e.id); }}>Supprimer l'exercice</button>}
      </div>
    </div>
  );

  return (
    <div>
      <button className="back" onClick={onBack}><Icon name="back" size={20} /> Retour</button>
      <div className="head">
        <div style={{flex:1, minWidth:0}}>
          {edit
            ? <input className="titleinput" aria-label="Nom de la séance" value={template.name} onChange={(ev)=>onUpdate({ ...template, name: ev.target.value })} />
            : <h1>{template.name}</h1>}
          <p className="sub">{countEx(template)} exercices · {countSets(template)} séries</p>
        </div>
        <button className="textbtn" onClick={()=>setEdit(!edit)}>{edit ? 'OK' : 'Modifier'}</button>
      </div>
      <div style={{height:18}}></div>

      {template.blocks.map(b => b.exercises.length > 1 ? (
        <div className="superset" key={b.id}>
          <p className="sstag">Super-série</p>
          {b.exercises.map(renderEx)}
        </div>
      ) : renderEx(b.exercises[0]))}

      {edit && (
        <div>
          <button className="btn ghost full" onClick={addEx}>+ Exercice</button>
          <div className="actions"><button className="btn warn" onClick={()=>{ if(confirm('Supprimer cette séance de musculation ?')) onDelete(); }}>Supprimer la séance</button></div>
        </div>
      )}
      <div style={{height:96}}></div>

      <div className="dock"><div className="dockin">
        <button className="btn full" onClick={onFinish}>Terminer la séance</button>
      </div></div>
    </div>
  );
}

function FinishSheet({ title, date, onSave, onClose }){
  const [duration, setDuration] = useState('60');
  const [d, setD] = useState(date);
  const [err, setErr] = useState('');
  const save = () => {
    if(!(Number(duration) > 0)){ setErr('Indique la durée en minutes.'); return; }
    onSave(Number(duration), d);
  };
  return (
    <Sheet title="Terminer la séance" onClose={onClose}>
      <p className="sub" style={{marginTop:4}}>{title}</p>
      <label className="f" htmlFor="fin-dur">Durée (minutes)</label>
      <input id="fin-dur" className="big" type="number" inputMode="numeric" min="1" value={duration} onChange={(e)=>{ setDuration(e.target.value); setErr(''); }} autoFocus />
      <label className="f" htmlFor="fin-date">Date</label>
      <input id="fin-date" type="date" value={d} onChange={(e)=>setD(e.target.value)} />
      {err && <p className="err" role="alert">{err}</p>}
      <div className="actions"><button className="btn" onClick={save}>Enregistrer la séance</button></div>
    </Sheet>
  );
}

/* ---------- Réglages ---------- */
function Settings({ profile, setProfile, onBack, onReset, onLoadPlan, getData, onImport, icuConn, icu, onConnectIcu, onDisconnectIcu, onRefreshIcu }){
  const [f, setF] = useState(profile);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef(null);
  const set = (k, v) => { setF(prev => ({...prev, [k]: v})); setSaved(false); };
  const num = (k) => ({ type:'number', inputMode:'numeric', value:f[k], onChange:(e)=>set(k, e.target.value) });
  const zonesNum = () => f.zones.map(z => z.map(v => v === '' ? 0 : Number(v)));
  const setZone = (i, j, v) => { setF(prev => ({ ...prev, zones: prev.zones.map((z, k) => k !== i ? z : z.map((x, m) => m === j ? v : x)) })); setSaved(false); };
  const save = () => {
    setProfile({ ...f, maxHR: f.maxHR === '' ? '' : Number(f.maxHR), zones: zonesNum() });
    setSaved(true);
  };
  const exportData = () => {
    const blob = new Blob([JSON.stringify(getData(), null, 2)], { type:'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'allure-' + fmt(new Date()) + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
  };
  const importFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if(!file) return;
    const r = new FileReader();
    r.onload = () => {
      try{
        const d = JSON.parse(r.result);
        if(!d || typeof d !== 'object' || !Array.isArray(d.workouts)) throw new Error('format');
        if(confirm('Remplacer les données actuelles par celles du fichier ?')){ onImport(d); setF({ ...DEFAULT_PROFILE, ...(d.profile||{}) }); }
      }catch(err){ alert("Fichier invalide : ce n'est pas un export Allure."); }
      e.target.value = '';
    };
    r.readAsText(file);
  };
  return (
    <div>
      <button className="back" onClick={onBack}><Icon name="back" size={20} /> Retour</button>
      <Header title="Réglages" />

      <IcuSettings conn={icuConn} icu={icu} onConnect={onConnectIcu} onDisconnect={onDisconnectIcu} onRefresh={onRefreshIcu} />

      <div className="card">
        <h3>Plan</h3>
        <label className="f" htmlFor="r-start">Début du plan (semaine 1)</label>
        <input id="r-start" type="date" value={f.programStart} onChange={(e)=>set('programStart', e.target.value)} />
        <p className="note" style={{marginTop:14}}>Remplace le calendrier par le programme type de 12 semaines (course, vélo, natation et tes 4 séances de musculation), avec les zones de fréquence cardiaque ci-dessous. Les séances déjà enregistrées restent dans l'historique.</p>
        <div className="actions">
          <button className="btn ghost" onClick={()=>{ const st = onLoadPlan(zonesNum()); if(st) set('programStart', st); }}>Recharger le programme type</button>
        </div>
      </div>

      <div className="card">
        <h3>Fréquence cardiaque</h3>
        <label className="f" htmlFor="r-max">FC max</label>
        <input id="r-max" {...num('maxHR')} />
        {f.zones.map((z, i) => (
          <div key={i}>
            <label className="f">Zone {i + 1}</label>
            <div className="grid2">
              <input type="number" inputMode="numeric" aria-label={'Zone ' + (i + 1) + ' : bas'} value={z[0]} onChange={(e)=>setZone(i, 0, e.target.value)} />
              <input type="number" inputMode="numeric" aria-label={'Zone ' + (i + 1) + ' : haut'} value={z[1]} onChange={(e)=>setZone(i, 1, e.target.value)} />
            </div>
          </div>
        ))}
      </div>

      <div className="actions" style={{marginTop:18}}>
        <button className="btn" onClick={save}>{saved ? 'Enregistré ✓' : 'Enregistrer'}</button>
      </div>

      <div className="card">
        <h3>Sauvegarde</h3>
        <p className="note">Tes données restent dans ce navigateur. Un fichier d'export permet de les sauvegarder ou de les passer sur un autre appareil.</p>
        <div className="actions">
          <button className="btn ghost" onClick={exportData}>Exporter</button>
          <button className="btn ghost" onClick={()=>fileRef.current && fileRef.current.click()}>Importer</button>
          <input ref={fileRef} type="file" accept="application/json,.json" style={{display:'none'}} onChange={importFile} />
        </div>
      </div>

      <div className="card">
        <h3>Réinitialiser</h3>
        <p className="note">Efface les séances, le plan, les réglages et la connexion Intervals.icu.</p>
        <div className="actions">
          <button className="btn warn" onClick={()=>{ if(confirm('Effacer toutes les données (séances, plan, réglages) ? Cette action est irréversible.')) onReset(); }}>Tout effacer</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- application ---------- */
function App(){
  const initRef = useRef(null);
  if(initRef.current === null) initRef.current = bootState();
  const init = initRef.current;
  const [page, setPage] = useState('today');
  const [prevPage, setPrevPage] = useState('today');
  const [workouts, setWorkouts] = useState(init.workouts || []);
  const [program, setProgram] = useState(init.program);
  const [profile, setProfile] = useState({ ...DEFAULT_PROFILE, ...(init.profile || {}) });
  const [templates, setTemplates] = useState(init.templates);
  const [muscuView, setMuscuView] = useState(null);
  const [icuConn, setIcuConn] = useState(() => loadIcuConn() || (window.ALLURE_DEMO ? { apiKey: 'demo' } : null));
  const emptyIcu = { status: 'idle', activities: [], wellness: [], stubs: 0, fetchedAt: null, from: '' };
  const [icu, setIcu] = useState(() => { const c = loadIcuCache(); return c && c.from === rangeFrom(fmt(new Date())) ? { ...c, status: 'idle' } : emptyIcu; });
  const [todayStr, setTodayStr] = useState(fmt(new Date()));
  const [sel, setSel] = useState(fmt(new Date()));
  const [sheet, setSheet] = useState(null);

  useEffect(()=>{ saveState({ workouts, program, profile, templates, planVersion: PLAN_VERSION }); }, [workouts, program, profile, templates]);
  useEffect(()=>{ try{ navigator.storage && navigator.storage.persist && navigator.storage.persist(); }catch(e){} }, []);
  // si l'appli reste ouverte d'un jour à l'autre
  useEffect(()=>{
    const onVis = ()=>{ if(document.visibilityState === 'visible'){ const t = fmt(new Date()); setTodayStr(prev => { if(prev !== t) setSel(t); return t; }); } };
    document.addEventListener('visibilitychange', onVis);
    return ()=>document.removeEventListener('visibilitychange', onVis);
  }, []);

  const go = (p) => { setPage(p); window.scrollTo(0, 0); };
  const openSettings = () => { setPrevPage(page === 'settings' ? prevPage : page); go('settings'); };
  const weekStartFor = (idx) => addDays(startOfWeek(parse(profile.programStart)), idx*7);


  /* Intervals.icu */
  const rangeStart = rangeFrom(todayStr);
  const refreshIcu = async (connOverride) => {
    const conn = connOverride || icuConn;
    if(!conn) return { ok: false, code: 'none' };
    setIcu(p => ({ ...p, status: 'loading' }));
    try{
      const data = await fetchIcuAll(conn.apiKey, rangeStart, todayStr);
      const all = data.activities.map(normIcu);
      const next = { status: 'ok', activities: all.filter(a => !a.stub), stubs: all.filter(a => a.stub).length, wellness: data.wellness.map(normWell), fetchedAt: Date.now(), from: rangeStart };
      setIcu(next); saveIcuCache(next);
      return { ok: true };
    }catch(e){
      const code = e && e.code === 'auth' ? 'auth' : 'net';
      setIcu(p => ({ ...p, status: code === 'auth' ? 'auth' : 'offline' }));
      return { ok: false, code };
    }
  };
  const icuRef = useRef(null);
  icuRef.current = { refreshIcu, icu, icuConn };
  useEffect(() => {
    if(icuConn && icu.from !== rangeStart) setIcu({ ...emptyIcu });
    if(icuConn) icuRef.current.refreshIcu();
  }, [icuConn, todayStr]);
  useEffect(() => {
    const onVis = () => {
      const r = icuRef.current;
      if(document.visibilityState === 'visible' && r.icuConn && (!r.icu.fetchedAt || Date.now() - r.icu.fetchedAt > 3 * 60 * 1000)) r.refreshIcu();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);
  const connectIcu = async (key) => {
    const conn = { apiKey: String(key || '').trim() };
    if(!conn.apiKey) return { ok: false, code: 'empty' };
    const r = await refreshIcu(conn);
    if(r.ok){ saveIcuConn(conn); setIcuConn(conn); } else setIcu({ ...emptyIcu });
    return r;
  };
  const disconnectIcu = () => { clearIcu(); setIcuConn(null); setIcu({ ...emptyIcu }); };

  const openMuscu = (templateId, from, edit) => { setMuscuView({ templateId, from: from || null, edit: !!edit }); setPage('muscu'); window.scrollTo(0, 0); };
  const updateTemplate = (t) => setTemplates(templates.map(x => x.id === t.id ? t : x));
  const newTemplate = () => { const t = { id: uid(), name: 'Nouvelle séance', blocks: [] }; setTemplates([...templates, t]); openMuscu(t.id, null, true); };
  const deleteTemplate = (id) => {
    setTemplates(templates.filter(t => t.id !== id));
    setProgram(program.map(w => ({ ...w, sessions: w.sessions.map(s => s.templateId === id ? { ...s, templateId: '' } : s) })));
    setMuscuView(null);
  };
  const sessionDate = (from) => {
    const s = program[from.wIdx] && program[from.wIdx].sessions.find(x => x.id === from.sid);
    return s ? fmt(addDays(weekStartFor(from.wIdx), s.day)) : todayStr;
  };
  const finishMuscu = (template, from, duration, date) => {
    const exercises = template.blocks.flatMap(b => b.exercises).map(e => ({ name: e.name, sets: e.sets.map(x => ({ reps: num(x.reps), kg: num(x.kg) })) }));
    const entry = { id: uid(), discipline:'muscu', title: template.name, templateId: template.id, duration, date, distance:'', avgHR:'', rpe:'', notes:'', exercises };
    let next = workouts;
    if(from){
      next = workouts.filter(w => w.sessionId !== from.sid);
      entry.sessionId = from.sid;
      setProgram(program.map((w,i) => i!==from.wIdx ? w : { ...w, sessions: w.sessions.map(s => s.id===from.sid ? { ...s, done:true } : s) }));
    }
    setWorkouts([...next, entry]);
    setSheet(null); setMuscuView(null);
    go(from ? 'today' : 'history');
  };

  const toggleSession = (wIdx, sid) => {
    const s = program[wIdx] && program[wIdx].sessions.find(x => x.id === sid);
    if(!s) return;
    const done = !s.done;
    setProgram(program.map((w,i) => i!==wIdx ? w : { ...w, sessions: w.sessions.map(x => x.id===sid ? { ...x, done } : x) }));
    if(done){
      setWorkouts([...workouts, { id: uid(), sessionId: sid, date: fmt(addDays(weekStartFor(wIdx), s.day)), discipline: s.discipline, duration: parseTargetMinutes(s.target) || '', distance:'', avgHR:'', rpe:'', notes:'' }]);
    } else {
      setWorkouts(workouts.filter(w => w.sessionId !== sid));
    }
  };

  const logWorkout = (data) => { setWorkouts([...workouts, { ...data, id: uid() }]); setSheet(null); };

  const deleteWorkout = (w) => {
    setWorkouts(workouts.filter(x => x.id !== w.id));
    if(w.sessionId) setProgram(program.map(wk => ({ ...wk, sessions: wk.sessions.map(s => s.id===w.sessionId ? { ...s, done:false } : s) })));
  };

  // déplace une séance vers une date (crée les semaines manquantes) et applique d'éventuelles modifications
  const placeSession = (wIdx, sid, iso, fields) => {
    const loc = locateWeek(program, profile.programStart, iso);
    const fw = wIdx + loc.shift;
    const old = loc.program[fw] && loc.program[fw].sessions.find(x => x.id === sid);
    if(!old) return;
    const moved = { ...old, ...(fields || {}), day: loc.day };
    const prog = loc.program.map((w, i) => {
      let ss = w.sessions;
      if(i === fw) ss = ss.filter(x => x.id !== sid);
      if(i === loc.wIdx) ss = [...ss, moved];
      return ss === w.sessions ? w : { ...w, sessions: ss };
    });
    setProgram(prog);
    if(loc.programStart !== profile.programStart) setProfile(p => ({ ...p, programStart: loc.programStart }));
    setWorkouts(ws => ws.map(w => w.sessionId === sid ? { ...w, date: iso, ...(fields && fields.discipline ? { discipline: fields.discipline } : {}) } : w));
  };

  const saveSession = (wIdx, sid, data) => {
    const { date, ...fields } = data;
    if(sid){
      placeSession(wIdx, sid, date, fields);
    } else {
      const loc = locateWeek(program, profile.programStart, date);
      setProgram(loc.program.map((w, i) => i !== loc.wIdx ? w : { ...w, sessions: [...w.sessions, { ...fields, id: uid(), day: loc.day, done: false }] }));
      if(loc.programStart !== profile.programStart) setProfile(p => ({ ...p, programStart: loc.programStart }));
    }
    setSheet(null);
  };

  const deleteSession = (wIdx, sid) => {
    setProgram(program.map((w,i) => i!==wIdx ? w : { ...w, sessions: w.sessions.filter(s => s.id !== sid) }));
    setWorkouts(workouts.filter(w => w.sessionId !== sid));
    setSheet(null);
  };

  const reset = () => {
    try{ localStorage.removeItem(KEY); }catch(e){}
    const tpls = defaultTemplates();
    setWorkouts([]); setProgram(buildProgram(tpls, DEFAULT_PROFILE.zones)); setProfile({ ...DEFAULT_PROFILE, programStart: planStart() }); setTemplates(tpls); setMuscuView(null); clearIcu(); setIcuConn(null); setIcu({ ...emptyIcu }); go('today');
  };
  const importData = (d) => {
    const tpls = d.templates || defaultTemplates();
    setWorkouts(d.workouts || []); setProgram(d.program || buildProgram(tpls, ((d.profile || {}).zones))); setProfile({ ...DEFAULT_PROFILE, ...(d.profile || {}) }); setTemplates(tpls);
  };
  const loadPlan = (zones) => {
    if(!confirm("Remplacer le calendrier par le programme type ? Les séances déjà enregistrées restent dans l'historique.")) return null;
    const st = planStart();
    setProgram(buildProgram(templates, zones || profile.zones)); setProfile(p => ({ ...p, programStart: st, ...(zones ? { zones } : {}) }));
    setWorkouts(ws => ws.map(({ sessionId, ...w }) => w)); setSel(todayStr);
    return st;
  };

  const tabs = [
    { id:'today', label:"Aujourd'hui", icon:'today' },
    { id:'plan', label:'Calendrier', icon:'plan' },
    { id:'muscu', label:'Musculation', icon:'muscu' },
    { id:'history', label:'Historique', icon:'history' },
  ];
  const onSettingsPage = page === 'settings';
  const inMuscuDetail = page === 'muscu' && !!muscuView;

  return (
    <div>
      <main className="shell">
        {page==='today' && <Today workouts={workouts} program={program} profile={profile} todayStr={todayStr} sel={sel} setSel={setSel} templates={templates} onOpenMuscu={(id, from)=>openMuscu(id, from)} icuConn={icuConn} icu={icu} onRefreshIcu={()=>refreshIcu()} onToggle={toggleSession} onSettings={openSettings} />}
        {page==='plan' && <Calendar program={program} profile={profile} todayStr={todayStr} templates={templates} onToggle={toggleSession}
            onEdit={(wIdx, sid)=>setSheet({ type:'session', wIdx, sid })}
            onAdd={(date)=>setSheet({ type:'session', wIdx:null, sid:null, date })}
            onMove={(wIdx, sid, iso)=>placeSession(wIdx, sid, iso)}
            onOpenMuscu={(id, from)=>openMuscu(id, from)} onSettings={openSettings} />}
        {page==='muscu' && !muscuView && <MuscuHome templates={templates} workouts={workouts} onOpen={(id)=>openMuscu(id, null)} onNew={newTemplate} onSettings={openSettings} />}
        {page==='muscu' && muscuView && (() => {
          const t = templates.find(x => x.id === muscuView.templateId);
          if(!t) return null;
          return <MuscuDetail key={t.id} template={t} startEdit={muscuView.edit} onUpdate={updateTemplate} onDelete={()=>deleteTemplate(t.id)}
                  onBack={()=>{ const from = muscuView.from; setMuscuView(null); if(from) go('today'); else window.scrollTo(0,0); }}
                  onFinish={()=>setSheet({ type:'finish', templateId:t.id, from:muscuView.from })} />;
        })()}
        {page==='history' && <History workouts={workouts} onDelete={deleteWorkout} onSettings={openSettings} />}
        {page==='settings' && <Settings profile={profile} setProfile={setProfile} onBack={()=>go(prevPage)} onReset={reset} onLoadPlan={loadPlan}
            getData={()=>({ workouts, program, profile, templates })} onImport={importData}
            icuConn={icuConn} icu={icu} onConnectIcu={connectIcu} onDisconnectIcu={disconnectIcu} onRefreshIcu={()=>refreshIcu()} />}
      </main>

      {!onSettingsPage && (page==='today' || page==='history') && (
        <div className="fabwrap"><div className="fabin">
          <button className="fab" onClick={()=>setSheet({ type:'log' })}><Icon name="plus" size={20} sw={2.4} /> Séance</button>
        </div></div>
      )}

      {!onSettingsPage && !inMuscuDetail && (
        <nav className="tabs" aria-label="Navigation"><div className="tabsin">
          {tabs.map(t => (
            <button key={t.id} className={"tab"+(page===t.id?" on":"")} aria-current={page===t.id ? 'page' : undefined} onClick={()=>go(t.id)}>
              <Icon name={t.icon} size={23} />{t.label}
            </button>
          ))}
        </div></nav>
      )}

      {sheet && sheet.type==='log' && <LogSheet date={page==='today' ? sel : todayStr} onSave={logWorkout} onClose={()=>setSheet(null)} />}
      {sheet && sheet.type==='finish' && (() => {
        const t = templates.find(x => x.id === sheet.templateId);
        if(!t) return null;
        return <FinishSheet title={t.name} date={sheet.from ? sessionDate(sheet.from) : todayStr} onSave={(dur, d)=>finishMuscu(t, sheet.from, dur, d)} onClose={()=>setSheet(null)} />;
      })()}
      {sheet && sheet.type==='session' && (() => {
        const s = sheet.sid ? program[sheet.wIdx].sessions.find(x => x.id === sheet.sid) : null;
        const initial = s ? { discipline:s.discipline, date: fmt(addDays(weekStartFor(sheet.wIdx), s.day)), desc:s.desc, target:s.target, templateId:s.templateId || '' } : { discipline:'course', date: sheet.date || todayStr, desc:'', target:'', templateId:'' };
        return <SessionSheet isNew={!s} initial={initial} templates={templates} onSave={(d)=>saveSession(sheet.wIdx, sheet.sid, d)} onDelete={()=>deleteSession(sheet.wIdx, sheet.sid)} onClose={()=>setSheet(null)} />;
      })()}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
