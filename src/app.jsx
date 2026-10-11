const { useState, useEffect, useMemo, useRef } = React;

/* ---------- constantes ---------- */
const DISC = {
  course: { short:'Course',   label:'Course à pied', color:'var(--run)'  },
  velo:   { short:'Vélo',     label:'Vélo',          color:'var(--bike)' },
  nage:   { short:'Natation', label:'Natation',      color:'var(--swim)' },
  muscu:  { short:'Muscu',    label:'Musculation',   color:'var(--str)'  },
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
  maxHR: 212, z2Low: 127, z2High: 148, raceZoneLow: 180, raceZoneHigh: 195,
  ironmanDate: '', programStart: fmt(new Date()),
};

function defaultProgram(){
  return [
    { id: uid(), sessions: [
      { id: uid(), discipline:'course', day:1, desc:'Endurance fondamentale Z2', target:'45 min, Z2 (127-148 bpm)', done:false },
      { id: uid(), discipline:'muscu', day:2, desc:'Renfort général — full body', target:'45 min, charges modérées', done:false },
      { id: uid(), discipline:'velo', day:3, desc:'Sortie longue Z2', target:'1h30, Z2', done:false },
      { id: uid(), discipline:'nage', day:4, desc:'Technique + endurance', target:'40 min, SWOLF focus', done:false },
      { id: uid(), discipline:'course', day:5, desc:'Repos ou footing très léger', target:'0-30 min, très facile', done:false },
      { id: uid(), discipline:'velo', day:6, desc:'Sortie longue Z2', target:'2h00, Z2', done:false },
    ]},
    { id: uid(), sessions: [
      { id: uid(), discipline:'course', day:1, desc:'Endurance fondamentale Z2', target:'50 min, Z2', done:false },
      { id: uid(), discipline:'muscu', day:2, desc:'Renfort — bas du corps', target:'45 min', done:false },
      { id: uid(), discipline:'nage', day:3, desc:'Endurance nage libre', target:'45 min', done:false },
      { id: uid(), discipline:'velo', day:4, desc:'Sortie Z2 + gammes', target:'1h30, Z2', done:false },
      { id: uid(), discipline:'course', day:5, desc:'Sortie longue Z2', target:'1h00, Z2', done:false },
      { id: uid(), discipline:'velo', day:6, desc:'Sortie longue Z2', target:'2h15, Z2', done:false },
    ]},
    { id: uid(), sessions: [
      { id: uid(), discipline:'course', day:1, desc:'Endurance fondamentale Z2', target:'50 min, Z2', done:false },
      { id: uid(), discipline:'muscu', day:2, desc:'Renfort général', target:'45 min', done:false },
      { id: uid(), discipline:'nage', day:3, desc:'Endurance + technique', target:'45 min', done:false },
      { id: uid(), discipline:'velo', day:4, desc:'Sortie Z2', target:'1h45, Z2', done:false },
      { id: uid(), discipline:'course', day:5, desc:'Sortie longue Z2', target:'1h10, Z2', done:false },
      { id: uid(), discipline:'velo', day:6, desc:'Sortie longue Z2', target:'2h30, Z2', done:false },
    ]},
    { id: uid(), sessions: [
      { id: uid(), discipline:'course', day:1, desc:'Récupération active', target:'30 min, très facile', done:false },
      { id: uid(), discipline:'muscu', day:2, desc:'Renfort léger', target:'30 min', done:false },
      { id: uid(), discipline:'nage', day:3, desc:'Récupération technique', target:'30 min', done:false },
      { id: uid(), discipline:'velo', day:5, desc:'Sortie modérée', target:'1h00, Z2', done:false },
    ]},
  ];
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


/* ---------- Intervals.icu ---------- */
const ICU_CONN_KEY = 'allure_icu_conn_v1';
const ICU_CACHE_KEY = 'allure_icu_cache_v2';
const loadIcuConn = () => { try{ const r = localStorage.getItem(ICU_CONN_KEY); return r ? JSON.parse(r) : null; }catch(e){ return null; } };
const saveIcuConn = (c) => { try{ localStorage.setItem(ICU_CONN_KEY, JSON.stringify(c)); }catch(e){} };
const loadIcuCache = () => { try{ const r = localStorage.getItem(ICU_CACHE_KEY); return r ? JSON.parse(r) : null; }catch(e){ return null; } };
const saveIcuCache = (c) => { try{ localStorage.setItem(ICU_CACHE_KEY, JSON.stringify(c)); }catch(e){} };
const clearIcu = () => { try{ localStorage.removeItem(ICU_CONN_KEY); localStorage.removeItem(ICU_CACHE_KEY); localStorage.removeItem('allure_icu_cache_v1'); }catch(e){} };
const ACT_FIELDS = 'id,name,type,start_date_local,moving_time,elapsed_time,distance,total_elevation_gain,source';

// premier jour du mois précédent : on charge deux mois pour comparer
const rangeFrom = (todayStr) => { const t = parse(todayStr); return fmt(new Date(t.getFullYear(), t.getMonth() - 1, 1)); };

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
  for(let i = 13; i >= 0; i--){
    out.push({ id: fmt(addDays(parse(todayStr), -i)), ctl: 17 + (13 - i) * 0.25, atl: 13 + ((13 - i) % 5) * 1.7,
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
  try{ wellness = await icuGet(apiKey, 'wellness.json?oldest=' + fmt(addDays(parse(todayStr), -13)) + '&newest=' + todayStr); }
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
function formLabel(tsb){
  if(tsb > 30) return 'Très frais';
  if(tsb > 10) return 'Frais';
  if(tsb >= -10) return 'Entretien';
  if(tsb >= -30) return 'En progression';
  return 'Surcharge';
}

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
  const fit = (() => { for(let i = w.length - 1; i >= 0; i--) if(w[i].ctl != null && w[i].atl != null) return w[i]; return null; })();

  return {
    cumThis, cumPrev, day, prevLen, deltaDur: (cumThis[day - 1] || 0) - (cumPrev[pn - 1] || 0), hasPrev: prev.length > 0,
    monthTotal: cumThis[day - 1] || 0, calendar, lead, daysIn, today: day, sports,
    last7, last7Total: sumBy(last7, x => x.total), prev7Total: sumBy(prev7, x => x),
    elev: sumBy(month, a => a.elev), elevDelta: sumBy(month, a => a.elev) - sumBy(prevSame, a => a.elev),
    fit, sleep: { s: series('sleep'), last: latest('sleep') }, rhr: { s: series('rhr'), last: latest('rhr') },
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

function Card({ title, sub, wide, children }){
  return (
    <section className={"wd" + (wide ? " wide" : "")}>
      <h3>{title}</h3>
      {sub && <p className="s">{sub}</p>}
      {children}
    </section>
  );
}

function Dash({ icu, todayStr }){
  const D = useMemo(() => buildDash(icu, todayStr), [icu, todayStr]);
  const maxSport = Math.max(1, ...D.sports.map(x => x.secs));
  const dayLabel = (x) => x && x.date === todayStr ? "Aujourd'hui" : (x ? shortDate(parse(x.date)) : '');
  const sleepMax = Math.max(8 * 3600, ...D.sleep.s.filter(Boolean));
  return (
    <div className="dash">
      <h2 className="dash-title">Tableau de bord</h2>
      <div className="wgrid">
        <Card title="Durée" sub="Ce mois-ci">
          <p className="num">{fmtHM(D.monthTotal)}</p>
          {D.hasPrev && <p className="delta">{signedMin(D.deltaDur)} vs {D.prevName}</p>}
          <LineChart a={D.cumThis} b={D.hasPrev ? D.cumPrev : []} />
          <div className="axis"><span>{D.d1}</span><span>{D.dd}</span></div>
        </Card>

        <Card title={D.monthName.charAt(0).toUpperCase() + D.monthName.slice(1)} sub="Jours d'activité">
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
          <Card title="Activité" sub="Ce mois-ci" wide>
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

        {D.fit && (
          <Card title="Forme" sub="Aujourd'hui">
            <p className="label">{formLabel(D.fit.ctl - D.fit.atl)}</p>
            <div className="trio">
              <div><b>{Math.round(D.fit.ctl)}</b><span>Fitness</span></div>
              <div><b>{Math.round(D.fit.atl)}</b><span>Fatigue</span></div>
              <div><b>{(() => { const v = Math.round(D.fit.ctl - D.fit.atl); return (v > 0 ? '+' : '') + v; })()}</b><span>Forme</span></div>
            </div>
          </Card>
        )}

        <Card title="Durée" sub="7 derniers jours">
          <p className="num">{fmtHM(D.last7Total)}</p>
          <p className="delta">{signedMin(D.last7Total - D.prev7Total)} vs semaine préc.</p>
          <StackBars days={D.last7} />
        </Card>

        {D.elev > 0 && (
          <Card title="Dénivelé" sub="Ce mois-ci">
            <p className="num">{Math.round(D.elev)}<span className="u">m</span></p>
            {D.hasPrev && <p className="delta">{(D.elevDelta < 0 ? '−' : '+') + Math.abs(Math.round(D.elevDelta))} m vs {D.prevName}</p>}
          </Card>
        )}

        {D.sleep.last && (
          <Card title="Sommeil" sub={dayLabel(D.sleep.last)}>
            <p className="num">{fmtHM(D.sleep.last.sleep)}</p>
            <Spark values={D.sleep.s} bars min0={sleepMax} />
          </Card>
        )}

        {D.rhr.last && (
          <Card title="FC au repos" sub={dayLabel(D.rhr.last)}>
            <p className="num">{Math.round(D.rhr.last.rhr)}<span className="u">bpm</span></p>
            <Spark values={D.rhr.s} />
          </Card>
        )}

        {D.hrv.last && (
          <Card title="VFC" sub={dayLabel(D.hrv.last)}>
            <p className="num">{Math.round(D.hrv.last.hrv)}<span className="u">ms</span></p>
            <Spark values={D.hrv.s} />
          </Card>
        )}

        {D.steps && D.steps.date === todayStr && (
          <Card title="Pas" sub="Aujourd'hui">
            <p className="num">{Math.round(D.steps.steps).toLocaleString('fr-FR')}</p>
          </Card>
        )}
      </div>
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
  const weekStart = startOfWeek(today);
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
  const cur = days.find(d => d.iso === sel) || days.find(d => d.iso === todayStr);
  const isToday = cur.iso === todayStr;
  const icuDay = icuConn ? icu.activities.filter(a => a.date === cur.iso) : [];
  const raceIn = profile.ironmanDate ? diffDays(parse(profile.ironmanDate), today) : null;

  let sub = longDate(today);
  if(raceIn !== null && raceIn > 0) sub += ' · Ironman 70.3 dans ' + raceIn + ' j';
  if(raceIn === 0) sub += ' · jour de course';

  return (
    <div>
      <Header title="Aujourd'hui" sub={sub} onSettings={onSettings} />
      <IcuBlock conn={icuConn} icu={icu} onRefresh={onRefreshIcu} onConnect={onSettings} weekFrom={fmt(weekStart)} weekTo={fmt(addDays(weekStart, 6))} />

      <div className="weekbar">
        <b>{week ? 'Semaine ' + (wIdx+1) : 'Hors programme'}</b>
        {week && <span>{done} sur {total} faites</span>}
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
            <li key={a.id} className="item act" style={{'--c':dsc.color}}>
              <div className="item-text">
                <h3>{a.name || dsc.short}</h3>
                <p className="desc">{fmtMin(Math.round(a.secs / 60))}{a.meters ? ' · ' + fmtKm(a.meters) + ' km' : ''}</p>
                <p className="tag">{a.time ? a.time + ' · ' : ''}Intervals.icu</p>
              </div>
            </li>
          );
        })}
      </ul>
      {cur.planned.length === 0 && cur.free.length === 0 && icuDay.length === 0 && (
        <p className="rest">{week ? 'Repos.' : 'Rien de prévu.'}</p>
      )}
      {icuConn && icu.fetchedAt && <Dash icu={icu} todayStr={todayStr} />}
    </div>
  );
}

/* ---------- Plan ---------- */
function Plan({ program, profile, todayStr, onToggle, onEdit, onAdd, onAddWeek, onDeleteWeek, onSettings }){
  const curIdx = Math.floor(diffDays(startOfWeek(parse(todayStr)), startOfWeek(parse(profile.programStart))) / 7);
  const firstOpen = program[curIdx] ? program[curIdx].id : (program[0] && program[0].id);
  const [open, setOpen] = useState(()=> new Set(firstOpen ? [firstOpen] : []));
  const toggleOpen = (id) => setOpen(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const base = startOfWeek(parse(profile.programStart));

  return (
    <div>
      <Header title="Plan" sub={program.length + ' semaines'} onSettings={onSettings} />
      <div style={{height:20}}></div>
      {program.map((w, i) => {
        const isOpen = open.has(w.id);
        const start = addDays(base, i*7), end = addDays(start, 6);
        const done = w.sessions.filter(s=>s.done).length;
        return (
          <div key={w.id} className={"week"+(isOpen?" open":"")}>
            <button className="week-head" aria-expanded={isOpen} onClick={()=>toggleOpen(w.id)}>
              <div>
                <h3>Semaine {i+1}{i===curIdx ? ' · en cours' : ''}</h3>
                <p className="s">{shortDate(start)} – {shortDate(end)} · {done}/{w.sessions.length}</p>
              </div>
              <Icon name="chevron" />
            </button>
            {isOpen && (
              <div className="week-body">
                {w.sessions.slice().sort((a,b)=>a.day-b.day).map(s => (
                  <div key={s.id} className={"prow"+(s.done?" done":"")} style={{'--c':DISC[s.discipline].color}}>
                    <span className="d">{DAYS_ABBR[s.day]}</span>
                    <button className="m" onClick={()=>onEdit(i, s.id)} aria-label={'Modifier : ' + s.desc}>
                      <div className="t"><i></i>{s.desc}</div>
                      {s.target && <div className="g">{s.target}</div>}
                    </button>
                    <button className="mini" aria-label={s.done ? 'Marquer comme non faite' : 'Marquer comme faite'} aria-pressed={s.done} onClick={()=>onToggle(i, s.id)}>
                      <span className="c"><Icon name="check" size={15} sw={3} /></span>
                    </button>
                  </div>
                ))}
                <div className="week-actions">
                  <button className="btn ghost" style={{height:42, padding:'0 18px'}} onClick={()=>onAdd(i)}>+ Séance</button>
                  <button className="link" onClick={()=>onDeleteWeek(i)}>Supprimer la semaine</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
      <button className="btn full" style={{marginTop:6}} onClick={onAddWeek}>+ Ajouter une semaine</button>
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
      <label className="f">Jour</label>
      <div className="daypick" role="radiogroup" aria-label="Jour">
        {DAYS_LETTER.map((l, i) => (
          <button key={i} role="radio" aria-checked={f.day===i} aria-label={DAYS_LONG[i]} className={"chip"+(f.day===i?" on":"")} onClick={()=>set('day', i)}>{l}</button>
        ))}
      </div>
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

function MuscuList({ templates, onOpen, onNew, onSettings }){
  return (
    <div>
      <Header title="Muscu" sub={templates.length + (templates.length > 1 ? ' séances' : ' séance')} onSettings={onSettings} />
      <div style={{height:20}}></div>
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
          <div className="actions"><button className="btn warn" onClick={()=>{ if(confirm('Supprimer cette séance de muscu ?')) onDelete(); }}>Supprimer la séance</button></div>
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
function Settings({ profile, setProfile, onBack, onReset, getData, onImport, icuConn, icu, onConnectIcu, onDisconnectIcu, onRefreshIcu }){
  const [f, setF] = useState(profile);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef(null);
  const set = (k, v) => { setF(prev => ({...prev, [k]: v})); setSaved(false); };
  const num = (k) => ({ type:'number', inputMode:'numeric', value:f[k], onChange:(e)=>set(k, e.target.value) });
  const save = () => {
    const n = (k) => f[k] === '' ? '' : Number(f[k]);
    setProfile({ ...f, maxHR:n('maxHR'), z2Low:n('z2Low'), z2High:n('z2High'), raceZoneLow:n('raceZoneLow'), raceZoneHigh:n('raceZoneHigh') });
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
        <h3>Objectif</h3>
        <label className="f" htmlFor="r-race">Date de l'Ironman 70.3</label>
        <input id="r-race" type="date" value={f.ironmanDate} onChange={(e)=>set('ironmanDate', e.target.value)} />
        <label className="f" htmlFor="r-start">Début du plan (semaine 1)</label>
        <input id="r-start" type="date" value={f.programStart} onChange={(e)=>set('programStart', e.target.value)} />
      </div>

      <div className="card">
        <h3>Fréquence cardiaque</h3>
        <div className="grid2">
          <div><label className="f" htmlFor="r-max">FC max</label><input id="r-max" {...num('maxHR')} /></div>
          <div></div>
          <div><label className="f" htmlFor="r-z2l">Zone 2 · bas</label><input id="r-z2l" {...num('z2Low')} /></div>
          <div><label className="f" htmlFor="r-z2h">Zone 2 · haut</label><input id="r-z2h" {...num('z2High')} /></div>
          <div><label className="f" htmlFor="r-rl">Course · bas</label><input id="r-rl" {...num('raceZoneLow')} /></div>
          <div><label className="f" htmlFor="r-rh">Course · haut</label><input id="r-rh" {...num('raceZoneHigh')} /></div>
        </div>
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
  const init = useRef(loadState()).current;
  const [page, setPage] = useState('today');
  const [prevPage, setPrevPage] = useState('today');
  const [workouts, setWorkouts] = useState(init && init.workouts || []);
  const [program, setProgram] = useState(init && init.program || defaultProgram());
  const [profile, setProfile] = useState({ ...DEFAULT_PROFILE, ...(init && init.profile || {}) });
  const [templates, setTemplates] = useState(init && init.templates || defaultTemplates());
  const [muscuView, setMuscuView] = useState(null);
  const [icuConn, setIcuConn] = useState(() => loadIcuConn() || (window.ALLURE_DEMO ? { apiKey: 'demo' } : null));
  const emptyIcu = { status: 'idle', activities: [], wellness: [], stubs: 0, fetchedAt: null, from: '' };
  const [icu, setIcu] = useState(() => { const c = loadIcuCache(); return c && c.from === rangeFrom(fmt(new Date())) ? { ...c, status: 'idle' } : emptyIcu; });
  const [todayStr, setTodayStr] = useState(fmt(new Date()));
  const [sel, setSel] = useState(fmt(new Date()));
  const [sheet, setSheet] = useState(null);

  useEffect(()=>{ saveState({ workouts, program, profile, templates }); }, [workouts, program, profile, templates]);
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

  const saveSession = (wIdx, sid, data) => {
    if(sid){
      setProgram(program.map((w,i) => i!==wIdx ? w : { ...w, sessions: w.sessions.map(s => s.id===sid ? { ...s, ...data } : s) }));
      setWorkouts(workouts.map(w => w.sessionId===sid ? { ...w, discipline:data.discipline, date: fmt(addDays(weekStartFor(wIdx), data.day)) } : w));
    } else {
      setProgram(program.map((w,i) => i!==wIdx ? w : { ...w, sessions: [...w.sessions, { ...data, id: uid(), done:false }] }));
    }
    setSheet(null);
  };

  const deleteSession = (wIdx, sid) => {
    setProgram(program.map((w,i) => i!==wIdx ? w : { ...w, sessions: w.sessions.filter(s => s.id !== sid) }));
    setWorkouts(workouts.filter(w => w.sessionId !== sid));
    setSheet(null);
  };

  const deleteWeek = (wIdx) => {
    if(!confirm('Supprimer la semaine ' + (wIdx+1) + ' ?')) return;
    const ids = new Set(program[wIdx].sessions.map(s => s.id));
    setProgram(program.filter((_,i) => i !== wIdx));
    setWorkouts(workouts.filter(w => !ids.has(w.sessionId)));
  };

  const reset = () => {
    try{ localStorage.removeItem(KEY); }catch(e){}
    setWorkouts([]); setProgram(defaultProgram()); setProfile({ ...DEFAULT_PROFILE, programStart: fmt(new Date()) }); setTemplates(defaultTemplates()); setMuscuView(null); clearIcu(); setIcuConn(null); setIcu({ ...emptyIcu }); go('today');
  };
  const importData = (d) => {
    setWorkouts(d.workouts || []); setProgram(d.program || defaultProgram()); setProfile({ ...DEFAULT_PROFILE, ...(d.profile || {}) }); setTemplates(d.templates || defaultTemplates());
  };

  const tabs = [
    { id:'today', label:"Aujourd'hui", icon:'today' },
    { id:'plan', label:'Plan', icon:'plan' },
    { id:'muscu', label:'Muscu', icon:'muscu' },
    { id:'history', label:'Historique', icon:'history' },
  ];
  const onSettingsPage = page === 'settings';
  const inMuscuDetail = page === 'muscu' && !!muscuView;

  return (
    <div>
      <main className="shell">
        {page==='today' && <Today workouts={workouts} program={program} profile={profile} todayStr={todayStr} sel={sel} setSel={setSel} templates={templates} onOpenMuscu={(id, from)=>openMuscu(id, from)} icuConn={icuConn} icu={icu} onRefreshIcu={()=>refreshIcu()} onToggle={toggleSession} onSettings={openSettings} />}
        {page==='plan' && <Plan program={program} profile={profile} todayStr={todayStr} onToggle={toggleSession}
            onEdit={(wIdx, sid)=>setSheet({ type:'session', wIdx, sid })}
            onAdd={(wIdx)=>setSheet({ type:'session', wIdx, sid:null })}
            onAddWeek={()=>setProgram([...program, { id: uid(), sessions: [] }])}
            onDeleteWeek={deleteWeek} onSettings={openSettings} />}
        {page==='muscu' && !muscuView && <MuscuList templates={templates} onOpen={(id)=>openMuscu(id, null)} onNew={newTemplate} onSettings={openSettings} />}
        {page==='muscu' && muscuView && (() => {
          const t = templates.find(x => x.id === muscuView.templateId);
          if(!t) return null;
          return <MuscuDetail key={t.id} template={t} startEdit={muscuView.edit} onUpdate={updateTemplate} onDelete={()=>deleteTemplate(t.id)}
                  onBack={()=>{ const from = muscuView.from; setMuscuView(null); if(from) go('today'); else window.scrollTo(0,0); }}
                  onFinish={()=>setSheet({ type:'finish', templateId:t.id, from:muscuView.from })} />;
        })()}
        {page==='history' && <History workouts={workouts} onDelete={deleteWorkout} onSettings={openSettings} />}
        {page==='settings' && <Settings profile={profile} setProfile={setProfile} onBack={()=>go(prevPage)} onReset={reset}
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
        const initial = s ? { discipline:s.discipline, day:s.day, desc:s.desc, target:s.target, templateId:s.templateId || '' } : { discipline:'course', day:0, desc:'', target:'', templateId:'' };
        return <SessionSheet isNew={!s} initial={initial} templates={templates} onSave={(d)=>saveSession(sheet.wIdx, sheet.sid, d)} onDelete={()=>deleteSession(sheet.wIdx, sheet.sid)} onClose={()=>setSheet(null)} />;
      })()}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
