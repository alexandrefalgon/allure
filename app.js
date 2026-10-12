const { useState, useEffect, useMemo, useRef } = React;
const DISC = {
    course: { short: 'Course', label: 'Course à pied', color: 'var(--run)' },
    velo: { short: 'Vélo', label: 'Vélo', color: 'var(--bike)' },
    nage: { short: 'Natation', label: 'Natation', color: 'var(--swim)' },
    muscu: { short: 'Musculation', label: 'Musculation', color: 'var(--str)' },
    autre: { short: 'Activité', label: 'Autre', color: 'var(--ink2)' },
};
const DISC_IDS = ['course', 'velo', 'nage', 'muscu'];
const DAYS_LETTER = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const DAYS_ABBR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const DAYS_LONG = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const MONTHS_LONG = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const pad = (n) => String(n).padStart(2, '0');
const fmt = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const startOfWeek = (d) => addDays(d, -((d.getDay() + 6) % 7));
const diffDays = (a, b) => Math.round((Date.UTC(a.getFullYear(), a.getMonth(), a.getDate()) - Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())) / 86400000);
const shortDate = (d) => d.getDate() + ' ' + MONTHS[d.getMonth()];
const longDate = (d) => DAYS_LONG[(d.getDay() + 6) % 7] + ' ' + d.getDate() + ' ' + MONTHS_LONG[d.getMonth()];
const fmtMin = (n) => { n = Number(n) || 0; if (!n)
    return '—'; if (n < 60)
    return n + ' min'; const h = Math.floor(n / 60), m = n % 60; return h + 'h' + (m ? pad(m) : ''); };
const resultOf = (workouts, sid) => workouts.find(w => w.sessionId === sid) || null;
const resultSummary = (w) => [fmtMin(w.duration), w.avgHR ? 'FC moy ' + w.avgHR : '', w.maxHR ? 'FC max ' + w.maxHR : '', w.strain ? 'strain ' + String(w.strain).replace('.', ',') : ''].filter(Boolean).join(' · ');
function parseTargetMinutes(t) {
    if (!t)
        return 0;
    const s = String(t).toLowerCase();
    let m = s.match(/(\d+)\s*h\s*(\d+)?/);
    if (m)
        return Number(m[1]) * 60 + Number(m[2] || 0);
    m = s.match(/(\d+)\s*-\s*(\d+)\s*min/);
    if (m)
        return Number(m[2]);
    m = s.match(/(\d+)\s*min/);
    if (m)
        return Number(m[1]);
    return 0;
}
const uid = () => Math.random().toString(36).slice(2, 10);
const DEFAULT_PROFILE = {
    maxHR: 212, zones: [[116, 146], [147, 160], [161, 175], [176, 190], [191, 205]],
    programStart: fmt(new Date()),
};
const PACE_RE = /(\d+)'(\d{2})\/(km|100 m)/g;
const hasPace = (t) => /(\d+)'(\d{2})\/(km|100 m)/.test(t || '');
const shiftPaces = (text, n) => String(text || '').replace(PACE_RE, (m, mi, se, u) => { const t = Math.max(60, Number(mi) * 60 + Number(se) + n); return Math.floor(t / 60) + "'" + pad(t % 60) + '/' + u; });
const setLeadingDuration = (target, minutes) => { const d = dur(minutes), t = String(target || ''); return /^\s*(\d+h\d{2}|\d+h|\d+\s*min)/.test(t) ? t.replace(/^\s*(\d+h\d{2}|\d+h|\d+\s*min)/, d) : (t ? d + ' · ' + t : d); };
const applyDelta = (x, d) => {
    let desc = x.desc, target = x.target;
    if (d.pace)
        desc = shiftPaces(desc, d.pace);
    if (d.dur) {
        const m = parseTargetMinutes(target);
        if (m)
            target = setLeadingDuration(target, Math.max(5, m + d.dur));
    }
    return { ...x, desc, target };
};
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
function buildProgram(templates, zones) {
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
            ] };
    });
}
const NOTE_DB = 'Deux haltères : indique le poids combiné.';
const NOTE_LUNGE = 'Poids combiné des deux haltères ; répétitions des deux côtés cumulées.';
const NOTE_PULLUP = 'Soustrais le poids de ton corps lors de la saisie du poids.';
const mkEx = (name, sets, note, kgLabel) => ({ id: uid(), name, note: note || '', kgLabel: kgLabel || '', sets: sets.map(([reps, kg]) => ({ id: uid(), reps, kg })) });
const times = (n, reps, kg) => Array.from({ length: n }, () => [reps, kg]);
const mkBlock = (...exs) => ({ id: uid(), exercises: exs });
function defaultTemplates() {
    return [
        { id: uid(), name: 'Jambes force', blocks: [
                mkBlock(mkEx('Squat arrière – Barre', times(4, 5, 0))),
                mkBlock(mkEx('Soulevé de terre roumain – Barre', times(3, 6, 0))),
                mkBlock(mkEx('Fente – En alternance – Haltère', times(3, 16, 0), NOTE_LUNGE)),
                mkBlock(mkEx('Flexion des jambes couché', times(3, 10, 0))),
                mkBlock(mkEx('Élévation de mollets – Debout', times(4, 12, 0))),
            ] },
        { id: uid(), name: 'Pull force', blocks: [
                mkBlock(mkEx('Traction', times(3, 6, 0), NOTE_PULLUP, '+ Poids (kg)')),
                mkBlock(mkEx('Rameur buste penché – Barre', [[6, 60], [6, 70], [6, 70]])),
                mkBlock(mkEx('Tirage poitrine – Prise serrée', [[8, 70], [8, 70], [6, 70]])),
                mkBlock(mkEx('Flexion des biceps – Haltère', times(3, 24, 32), NOTE_DB)),
                mkBlock(mkEx('Tirage vers le visage avec câble', times(2, 12, 40))),
            ] },
        { id: uid(), name: 'Push force', blocks: [
                mkBlock(mkEx('Développé couché à la Smith machine', [[4, 70], [4, 76.5], [4, 70]])),
                mkBlock(mkEx('Extension des triceps', [[8, 30], [8, 35], [8, 35]], NOTE_DB)),
                mkBlock(mkEx('Développé couché – Position inclinée', [[8, 50], [8, 60], [8, 60]], NOTE_DB)),
                mkBlock(mkEx('Développé militaire – Position assise', times(3, 8, 58), NOTE_DB)),
                mkBlock(mkEx('Élévation latérale – Câble – D', times(3, 10, 10)), mkEx('Élévation latérale – Câble – G', times(3, 10, 10))),
            ] },
        { id: uid(), name: 'Rappel haut du corps force', blocks: [
                mkBlock(mkEx('Développé couché – Position inclinée', [[6, 50], [6, 60], [6, 65], [6, 65]], NOTE_DB)),
                mkBlock(mkEx('Rameur – Un bras – G – Haltère', [[6, 24], [6, 32], [6, 32], [6, 32]], NOTE_DB), mkEx('Rameur – Un bras – D – Haltère', [[6, 24], [6, 32], [6, 32], [6, 32]], NOTE_DB)),
                mkBlock(mkEx('Tirage poitrine – Avant', [[10, 70], [10, 65], [10, 0]])),
                mkBlock(mkEx('Développé militaire – Position assise', [[8, 59], [8, 59], [8, 69]], NOTE_DB)),
                mkBlock(mkEx('Flexion des biceps – Haltère', times(3, 8, 36), NOTE_DB)),
                mkBlock(mkEx('Extension des triceps', [[10, 25], [10, 0], [10, 0]], NOTE_DB)),
                mkBlock(mkEx('Élévation latérale des épaules', [[12, 24], [12, 0], [12, 0]], NOTE_DB)),
            ] },
    ];
}
const KEY = 'allure_state_v1';
function loadState() {
    try {
        const raw = localStorage.getItem(KEY);
        if (raw)
            return JSON.parse(raw);
    }
    catch (e) { }
    return null;
}
function saveState(s) { try {
    localStorage.setItem(KEY, JSON.stringify(s));
}
catch (e) { } }
const PLAN_VERSION = 4;
const MUSCLES = { Push: 'Pectoraux · épaules · triceps', Pull: 'Dos · biceps · arrière des épaules', Jambes: 'Quadriceps · ischio-jambiers · fessiers · mollets', Rappel: 'Pectoraux · dos · épaules · bras' };
const muscleDesc = (d) => { const m = /^(Push|Pull|Jambes|Rappel)\b/.exec(d || ''); return m ? MUSCLES[m[1]] : d; };
function planStart() { const d = new Date(), dow = (d.getDay() + 6) % 7; return fmt(dow <= 1 ? addDays(d, -dow) : addDays(d, 7 - dow)); }
function bootState() {
    const init = loadState();
    if (!init) {
        const templates = defaultTemplates();
        return { workouts: [], templates, program: buildProgram(templates, DEFAULT_PROFILE.zones), profile: { ...DEFAULT_PROFILE, programStart: planStart() }, planVersion: PLAN_VERSION };
    }
    if (init.planVersion === PLAN_VERSION)
        return init;
    if (init.planVersion === 3) {
        return { ...init, planVersion: PLAN_VERSION, program: (init.program || []).map(w => ({ ...w, sessions: w.sessions.map(x => x.discipline === 'muscu' ? { ...x, desc: muscleDesc(x.desc) } : x) })) };
    }
    const templates = init.templates && init.templates.length ? init.templates : defaultTemplates();
    const { ironmanDate, z2Low, z2High, raceZoneLow, raceZoneHigh, ...prof } = init.profile || {};
    const profile = { ...DEFAULT_PROFILE, ...prof, programStart: planStart() };
    return { ...init, templates, program: buildProgram(templates, profile.zones), profile,
        workouts: (init.workouts || []).map(({ sessionId, ...w }) => w), planVersion: PLAN_VERSION };
}
function locateWeek(program, programStart, iso) {
    let base = startOfWeek(parse(programStart));
    const d = parse(iso);
    let idx = Math.floor(diffDays(startOfWeek(d), base) / 7), shift = 0, prog = program;
    if (idx < 0) {
        shift = -idx;
        prog = [...Array.from({ length: shift }, () => ({ id: uid(), sessions: [] })), ...prog];
        base = addDays(base, -7 * shift);
        idx = 0;
    }
    while (prog.length <= idx)
        prog = [...prog, { id: uid(), sessions: [] }];
    return { program: prog, programStart: fmt(base), shift, wIdx: idx, day: (d.getDay() + 6) % 7 };
}
const ICU_CONN_KEY = 'allure_icu_conn_v1';
const ICU_CACHE_KEY = 'allure_icu_cache_v3';
const loadIcuConn = () => { try {
    const r = localStorage.getItem(ICU_CONN_KEY);
    return r ? JSON.parse(r) : null;
}
catch (e) {
    return null;
} };
const saveIcuConn = (c) => { try {
    localStorage.setItem(ICU_CONN_KEY, JSON.stringify(c));
}
catch (e) { } };
const loadIcuCache = () => { try {
    const r = localStorage.getItem(ICU_CACHE_KEY);
    return r ? JSON.parse(r) : null;
}
catch (e) {
    return null;
} };
const saveIcuCache = (c) => { try {
    localStorage.setItem(ICU_CACHE_KEY, JSON.stringify(c));
}
catch (e) { } };
const clearIcu = () => { try {
    localStorage.removeItem(ICU_CONN_KEY);
    localStorage.removeItem(ICU_CACHE_KEY);
    localStorage.removeItem('allure_icu_cache_v1');
    localStorage.removeItem('allure_icu_cache_v2');
}
catch (e) { } };
const ACT_FIELDS = 'id,name,type,start_date_local,moving_time,elapsed_time,distance,total_elevation_gain,source';
const rangeFrom = (todayStr) => { const t = parse(todayStr); return fmt(new Date(t.getFullYear(), t.getMonth() - 5, 1)); };
function icuKind(type) {
    const t = String(type || '');
    if (/run/i.test(t))
        return 'course';
    if (/ride|cycl|bike/i.test(t))
        return 'velo';
    if (/swim/i.test(t))
        return 'nage';
    if (/weight|strength|workout|crossfit|gym/i.test(t))
        return 'muscu';
    return 'autre';
}
function normIcu(a) {
    const secs = Number(a.moving_time) || Number(a.elapsed_time) || 0;
    const meters = Number(a.distance) || 0;
    const local = String(a.start_date_local || '');
    return {
        id: a.id, date: local.slice(0, 10), time: local.slice(11, 16), name: a.name || '', type: a.type || '',
        kind: icuKind(a.type), secs, meters, elev: Number(a.total_elevation_gain) || 0,
        stub: !local || (!secs && !meters),
    };
}
const normWell = (w) => ({
    date: String(w.id || '').slice(0, 10),
    ctl: w.ctl == null ? null : Number(w.ctl), atl: w.atl == null ? null : Number(w.atl),
    sleep: Number(w.sleepSecs) || null, rhr: Number(w.restingHR) || null, hrv: Number(w.hrv) || null, steps: Number(w.steps) || null,
});
function demoActivities(from, todayStr) {
    const out = [];
    const end = parse(todayStr);
    for (let d = parse(from), n = 0; d <= end; d = addDays(d, 1), n++) {
        const wd = (d.getDay() + 6) % 7, j = d.getDate(), iso = fmt(d);
        if ((j * 7) % 5 === 0)
            continue;
        const jit = (j * 13) % 7;
        const at = (h) => iso + 'T' + pad(h) + ':' + pad(10 + jit * 6) + ':00';
        let x = null;
        if (wd === 1)
            x = ['Run', 'Footing endurance', 46 + jit, 8 + jit * 0.25, 70 + jit * 7, 7];
        if (wd === 2)
            x = ['WeightTraining', ['Jambes force', 'Pull force', 'Push force'][j % 3], 55 + jit, 0, 0, 12];
        if (wd === 3)
            x = ['Ride', 'Sortie vélo Z2', 80 + jit * 2, 32 + jit, 250 + jit * 25, 18];
        if (wd === 4)
            x = ['Swim', 'Natation technique', 38 + jit, 1.6 + jit * 0.06, 0, 18];
        if (wd === 5)
            x = ['Run', 'Footing', 34 + jit, 5 + jit * 0.15, 40 + jit * 4, 8];
        if (wd === 6)
            x = ['Ride', 'Sortie longue', 120 + jit * 4, 50 + jit, 400 + jit * 40, 9];
        if (x)
            out.push({ id: 'demo' + n, start_date_local: at(x[5]), name: x[1], type: x[0], moving_time: x[2] * 60, distance: x[3] * 1000, total_elevation_gain: x[4] });
    }
    return out;
}
function demoWellness(todayStr) {
    const out = [];
    for (let i = 89; i >= 0; i--) {
        out.push({ id: fmt(addDays(parse(todayStr), -i)), ctl: 17 + (89 - i) * 0.1, atl: 13 + ((89 - i) % 5) * 1.7,
            sleepSecs: Math.round((6.4 + ((i * 7) % 11) / 10) * 3600), restingHR: 52 + (i % 3), hrv: 58 + (i * 5) % 14,
            steps: i === 0 ? 6480 : 5000 + (i * 1337) % 6000 });
    }
    return out;
}
async function icuGet(apiKey, path) {
    let res;
    try {
        res = await fetch('https://intervals.icu/api/v1/athlete/0/' + path, { headers: { Authorization: 'Basic ' + btoa('API_KEY:' + apiKey), Accept: 'application/json' } });
    }
    catch (e) {
        throw { code: 'net' };
    }
    if (res.status === 401 || res.status === 403)
        throw { code: 'auth' };
    if (!res.ok)
        throw { code: 'http' };
    return res.json();
}
async function fetchIcuAll(apiKey, from, todayStr) {
    if (window.ALLURE_DEMO) {
        await new Promise(r => setTimeout(r, 350));
        return { activities: demoActivities(from, todayStr), wellness: demoWellness(todayStr) };
    }
    const base = 'activities?oldest=' + from + '&newest=' + todayStr + 'T23:59:59';
    let acts = await icuGet(apiKey, base + '&fields=' + ACT_FIELDS);
    if (Array.isArray(acts) && acts.length && acts.every(a => !a.start_date_local))
        acts = await icuGet(apiKey, base);
    let wellness = [];
    try {
        wellness = await icuGet(apiKey, 'wellness.json?oldest=' + fmt(addDays(parse(todayStr), -89)) + '&newest=' + todayStr);
    }
    catch (e) {
        wellness = [];
    }
    return { activities: Array.isArray(acts) ? acts : [], wellness: Array.isArray(wellness) ? wellness : [] };
}
const hhmm = (ms) => { const d = new Date(ms); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
const fmtKm = (meters) => (meters / 1000).toFixed(meters >= 100000 ? 0 : 1).replace('.', ',');
function fmtHM(secs) {
    const m = Math.round(secs / 60), h = Math.floor(m / 60), r = m % 60;
    return h ? React.createElement(React.Fragment, null,
        h,
        React.createElement("span", { className: "u" }, "h"),
        pad(r)) : React.createElement(React.Fragment, null,
        r,
        React.createElement("span", { className: "u" }, "min"));
}
const signedMin = (secs) => { const m = Math.round(Math.abs(secs) / 60); return (secs < 0 ? '−' : '+') + fmtMin(m); };
const PATHS = {
    today: React.createElement(React.Fragment, null,
        React.createElement("circle", { cx: "12", cy: "12", r: "8" }),
        React.createElement("circle", { cx: "12", cy: "12", r: "2.4", fill: "currentColor", stroke: "none" })),
    plan: React.createElement(React.Fragment, null,
        React.createElement("rect", { x: "4", y: "5", width: "16", height: "15", rx: "2" }),
        React.createElement("path", { d: "M4 10h16M9 3v4M15 3v4" })),
    history: React.createElement(React.Fragment, null,
        React.createElement("path", { d: "M9 7h11M9 12h11M9 17h11" }),
        React.createElement("circle", { cx: "4.7", cy: "7", r: "1", fill: "currentColor", stroke: "none" }),
        React.createElement("circle", { cx: "4.7", cy: "12", r: "1", fill: "currentColor", stroke: "none" }),
        React.createElement("circle", { cx: "4.7", cy: "17", r: "1", fill: "currentColor", stroke: "none" })),
    settings: React.createElement(React.Fragment, null,
        React.createElement("path", { d: "M4 8h9M19 8h1M4 16h1M11 16h9" }),
        React.createElement("circle", { cx: "16", cy: "8", r: "2.2" }),
        React.createElement("circle", { cx: "8", cy: "16", r: "2.2" })),
    muscu: React.createElement("path", { d: "M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11" }),
    plus: React.createElement("path", { d: "M12 5v14M5 12h14" }),
    coach: React.createElement("path", { d: "M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-4 3.5V17H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" }),
    send: React.createElement("path", { d: "M4 12l16-8-6 16-2.5-6.5z M11.5 13.5L20 4" }),
    map: React.createElement(React.Fragment, null,
        React.createElement("path", { d: "M3 6.5l6-2.5 6 2.5 6-2.5v13.5l-6 2.5-6-2.5-6 2.5z" }),
        React.createElement("path", { d: "M9 4v13.5M15 6.5V20" })),
    check: React.createElement("path", { d: "M5 12.5l4.5 4.5L19 7.5" }),
    chevron: React.createElement("path", { d: "M6 9l6 6 6-6" }),
    back: React.createElement("path", { d: "M15 5l-7 7 7 7" }),
    next: React.createElement("path", { d: "M9 5l7 7-7 7" }),
    refresh: React.createElement("path", { d: "M20 11a8 8 0 1 0-2.4 5.7M20 4.5V11h-6.5" }),
    close: React.createElement("path", { d: "M6 6l12 12M18 6L6 18" }),
};
function Icon({ name, size = 22, sw = 1.9 }) {
    return React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: sw, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, PATHS[name]);
}
function Header({ title, sub, onSettings }) {
    return (React.createElement("div", { className: "head" },
        React.createElement("div", null,
            React.createElement("h1", null, title),
            sub && React.createElement("p", { className: "sub" }, sub)),
        onSettings && React.createElement("button", { className: "icon", "aria-label": "R\u00E9glages", onClick: onSettings },
            React.createElement(Icon, { name: "settings" }))));
}
function Sheet({ title, onClose, children }) {
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape')
            onClose(); };
        window.addEventListener('keydown', onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
    }, []);
    return (React.createElement("div", { className: "scrim", onClick: onClose },
        React.createElement("div", { className: "sheet", role: "dialog", "aria-modal": "true", "aria-label": title, onClick: (e) => e.stopPropagation() },
            React.createElement("div", { className: "sheet-head" },
                React.createElement("h2", null, title),
                React.createElement("button", { className: "icon", "aria-label": "Fermer", onClick: onClose },
                    React.createElement(Icon, { name: "close" }))),
            children)));
}
function DiscChips({ value, onChange }) {
    return (React.createElement("div", { className: "chips", role: "radiogroup", "aria-label": "Discipline" }, DISC_IDS.map(id => (React.createElement("button", { key: id, role: "radio", "aria-checked": value === id, className: "chip" + (value === id ? " on" : ""), style: { '--c': DISC[id].color }, onClick: () => onChange(id) },
        React.createElement("i", null),
        DISC[id].short)))));
}
function IcuBlock({ conn, icu, onRefresh, onConnect, weekFrom, weekTo }) {
    if (!conn)
        return (React.createElement("div", { className: "connect" },
            React.createElement("p", null, "Connecte Intervals.icu pour voir ici tes heures, tes kilom\u00E8tres, tes activit\u00E9s et ton tableau de bord."),
            React.createElement("button", { className: "btn", onClick: onConnect }, "Connecter Intervals.icu")));
    const acts = icu.activities.filter(a => a.date >= weekFrom && a.date <= weekTo);
    const secs = acts.reduce((n, a) => n + a.secs, 0);
    const meters = acts.reduce((n, a) => n + a.meters, 0);
    const first = icu.status === 'loading' && !icu.fetchedAt;
    let msg = icu.fetchedAt ? 'Intervals.icu · actualisé à ' + hhmm(icu.fetchedAt) : 'Intervals.icu';
    let bad = false;
    if (icu.status === 'loading')
        msg = 'Actualisation…';
    if (icu.status === 'auth') {
        msg = 'Clé refusée par Intervals.icu. Vérifie-la dans les réglages.';
        bad = true;
    }
    if (icu.status === 'offline') {
        msg = icu.fetchedAt ? 'Hors connexion · données de ' + hhmm(icu.fetchedAt) : 'Impossible de joindre Intervals.icu.';
        bad = !icu.fetchedAt;
    }
    if (icu.stubs > 0 && icu.status !== 'loading' && icu.status !== 'auth')
        msg += ' · ' + icu.stubs + (icu.stubs > 1 ? ' activités Strava illisibles' : ' activité Strava illisible');
    return (React.createElement("div", null,
        React.createElement("div", { className: "figs", "aria-busy": first },
            React.createElement("div", { className: "fig" },
                React.createElement("span", { className: "v" }, first ? '–' : fmtHM(secs)),
                React.createElement("span", { className: "k" }, "de sport")),
            React.createElement("div", { className: "fig" },
                React.createElement("span", { className: "v" }, first ? '–' : React.createElement(React.Fragment, null,
                    fmtKm(meters),
                    React.createElement("span", { className: "u" }, "km"))),
                React.createElement("span", { className: "k" }, "parcourus")),
            React.createElement("div", { className: "fig" },
                React.createElement("span", { className: "v" }, first ? '–' : acts.length),
                React.createElement("span", { className: "k" }, acts.length > 1 ? 'activités' : 'activité'))),
        React.createElement("div", { className: "figfoot" },
            React.createElement("span", { className: bad ? 'bad' : '' }, msg),
            React.createElement("button", { className: icu.status === 'loading' ? 'spin' : '', "aria-label": "Actualiser Intervals.icu", onClick: onRefresh },
                React.createElement(Icon, { name: "refresh", size: 19 })))));
}
const sumBy = (list, f) => list.reduce((n, a) => n + f(a), 0);
const KIND_ORDER = ['course', 'velo', 'nage', 'muscu', 'autre'];
const dominantKind = (list) => {
    const t = {};
    list.forEach(a => { t[a.kind] = (t[a.kind] || 0) + a.secs; });
    return Object.keys(t).sort((x, y) => t[y] - t[x])[0] || null;
};
function buildDash(icu, todayStr) {
    const t = parse(todayStr);
    const day = t.getDate(), daysIn = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
    const prevLen = new Date(t.getFullYear(), t.getMonth(), 0).getDate();
    const ym = todayStr.slice(0, 7), pym = fmt(new Date(t.getFullYear(), t.getMonth() - 1, 1)).slice(0, 7);
    const acts = icu.activities;
    const month = acts.filter(a => a.date.slice(0, 7) === ym);
    const prev = acts.filter(a => a.date.slice(0, 7) === pym);
    const dayOf = (a) => Number(a.date.slice(8, 10));
    const cum = (list, n) => { const out = []; let c = 0; for (let d = 1; d <= n; d++) {
        c += sumBy(list.filter(a => dayOf(a) === d), a => a.secs);
        out.push(c);
    } return out; };
    const pn = Math.min(day, prevLen);
    const cumThis = cum(month, day), cumPrev = cum(prev, pn);
    const prevSame = prev.filter(a => dayOf(a) <= pn);
    const calendar = [];
    for (let d = 1; d <= daysIn; d++)
        calendar.push(dominantKind(month.filter(a => dayOf(a) === d)));
    const lead = (new Date(t.getFullYear(), t.getMonth(), 1).getDay() + 6) % 7;
    const sports = KIND_ORDER.map(k => { const l = month.filter(a => a.kind === k); return { kind: k, secs: sumBy(l, a => a.secs), meters: sumBy(l, a => a.meters) }; }).filter(x => x.secs > 0);
    const last7 = [];
    for (let i = 6; i >= 0; i--) {
        const d = addDays(t, -i), iso = fmt(d), l = acts.filter(a => a.date === iso);
        last7.push({ iso, letter: DAYS_LETTER[(d.getDay() + 6) % 7], today: i === 0, total: sumBy(l, a => a.secs), segs: KIND_ORDER.map(k => ({ kind: k, secs: sumBy(l.filter(a => a.kind === k), a => a.secs) })).filter(x => x.secs > 0) });
    }
    const prev7 = [];
    for (let i = 13; i >= 7; i--)
        prev7.push(sumBy(acts.filter(a => a.date === fmt(addDays(t, -i))), a => a.secs));
    const w = icu.wellness || [];
    const byDate = {};
    w.forEach(x => { byDate[x.date] = x; });
    const series = (key) => { const out = []; for (let i = 6; i >= 0; i--) {
        const x = byDate[fmt(addDays(t, -i))];
        out.push(x && x[key] ? x[key] : null);
    } return out; };
    const latest = (key) => { for (let i = w.length - 1; i >= 0; i--)
        if (w[i][key])
            return w[i]; return null; };
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
function LineChart({ a, b }) {
    const W = 150, H = 54, n = a.length;
    const max = Math.max(1, ...a, ...b);
    const X = (i) => n > 1 ? 2 + (i / (n - 1)) * (W - 4) : W / 2;
    const Y = (v) => H - 3 - (v / max) * (H - 8);
    const path = (arr) => arr.map((v, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1)).join(' ');
    return (React.createElement("svg", { className: "chart", viewBox: '0 0 ' + W + ' ' + H, role: "img", "aria-label": "Dur\u00E9e cumul\u00E9e du mois" },
        React.createElement("line", { x1: "0", y1: H - 1, x2: W, y2: H - 1, style: { stroke: 'var(--line)' }, strokeWidth: "1" }),
        b.length > 1 && React.createElement("path", { d: path(b), fill: "none", style: { stroke: 'var(--ink2)' }, strokeWidth: "1.5", strokeDasharray: "3 3", opacity: ".7" }),
        n > 1 && React.createElement("path", { d: path(a), fill: "none", style: { stroke: 'var(--ink)' }, strokeWidth: "2.2", strokeLinejoin: "round", strokeLinecap: "round" }),
        React.createElement("circle", { cx: X(n - 1), cy: Y(a[n - 1] || 0), r: "3.2", style: { fill: 'var(--ink)' } })));
}
function StackBars({ days }) {
    const W = 150, H = 56, gap = 6, bw = (W - gap * 6) / 7;
    const max = Math.max(1, ...days.map(d => d.total));
    return (React.createElement("div", null,
        React.createElement("svg", { className: "chart", viewBox: '0 0 ' + W + ' ' + H, role: "img", "aria-label": "Dur\u00E9e par jour sur 7 jours" }, days.map((d, i) => {
            let y = H;
            const x = i * (bw + gap);
            if (d.total === 0)
                return React.createElement("rect", { key: d.iso, x: x, y: H - 2, width: bw, height: "2", rx: "1", style: { fill: 'var(--line)' } });
            return React.createElement("g", { key: d.iso }, d.segs.map(sg => { const h = Math.max(2, (sg.secs / max) * (H - 2)); y -= h; return React.createElement("rect", { key: sg.kind, x: x, y: y, width: bw, height: h, rx: "2", style: { fill: (DISC[sg.kind] || DISC.autre).color } }); }));
        })),
        React.createElement("div", { className: "letters" }, days.map(d => React.createElement("span", { key: d.iso, className: d.today ? 'now' : '' }, d.letter)))));
}
function Spark({ values, bars, min0 }) {
    const W = 150, H = 40, vals = values.map(v => v == null ? null : v);
    const real = vals.filter(v => v != null);
    if (real.length === 0)
        return null;
    const hi = Math.max(...real, min0 || 0), lo = bars ? 0 : Math.min(...real);
    const span = Math.max(hi - lo, 1e-6);
    if (bars) {
        const gap = 6, bw = (W - gap * 6) / 7;
        return (React.createElement("svg", { className: "chart", viewBox: '0 0 ' + W + ' ' + H, "aria-hidden": "true" }, vals.map((v, i) => React.createElement("rect", { key: i, x: i * (bw + gap), y: v == null ? H - 2 : H - Math.max(3, (v / hi) * (H - 2)), width: bw, height: v == null ? 2 : Math.max(3, (v / hi) * (H - 2)), rx: "2", style: { fill: v == null ? 'var(--line)' : 'var(--ink)' }, opacity: v == null ? 1 : 0.85 }))));
    }
    const X = (i) => 3 + (i / 6) * (W - 6), Y = (v) => H - 5 - ((v - lo) / span) * (H - 12);
    let d = '';
    vals.forEach((v, i) => { if (v != null)
        d += (d ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1) + ' '; });
    const li = vals.map((v, i) => v != null ? i : -1).filter(i => i >= 0).pop();
    return (React.createElement("svg", { className: "chart", viewBox: '0 0 ' + W + ' ' + H, "aria-hidden": "true" },
        React.createElement("path", { d: d, fill: "none", style: { stroke: 'var(--ink)' }, strokeWidth: "2", strokeLinejoin: "round", strokeLinecap: "round" }),
        React.createElement("circle", { cx: X(li), cy: Y(vals[li]), r: "3", style: { fill: 'var(--ink)' } })));
}
function Card({ title, sub, wide, onClick, children }) {
    const tap = onClick ? { role: 'button', tabIndex: 0, onClick, onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
        } } } : {};
    return (React.createElement("section", { className: "wd" + (wide ? " wide" : "") + (onClick ? " tap" : ""), ...tap },
        React.createElement("h3", null, title),
        sub && React.createElement("p", { className: "s" }, sub),
        children));
}
function monthKeys(todayStr, n) {
    const t = parse(todayStr);
    return Array.from({ length: n }, (_, i) => {
        const d = new Date(t.getFullYear(), t.getMonth() - (n - 1 - i), 1);
        return { key: d.getFullYear() + '-' + pad(d.getMonth() + 1), label: MONTHS[d.getMonth()].replace('.', ''), long: MONTHS_LONG[d.getMonth()] + ' ' + d.getFullYear(), days: new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() };
    });
}
const bySport = (l) => KIND_ORDER.map(k => ({ kind: k, secs: sumBy(l.filter(a => a.kind === k), a => a.secs), meters: sumBy(l.filter(a => a.kind === k), a => a.meters) })).filter(x => x.secs > 0);
function aggMonths(acts, todayStr) {
    return monthKeys(todayStr, 6).map(m => {
        const l = acts.filter(a => a.date.slice(0, 7) === m.key);
        return { ...m, secs: sumBy(l, a => a.secs), meters: sumBy(l, a => a.meters), count: l.length, active: new Set(l.map(a => a.date)).size, sports: bySport(l) };
    });
}
function aggWeeks(acts, todayStr) {
    const ws = startOfWeek(parse(todayStr));
    return Array.from({ length: 12 }, (_, i) => {
        const s = addDays(ws, -7 * (11 - i)), a = fmt(s), b = fmt(addDays(s, 6));
        const l = acts.filter(x => x.date >= a && x.date <= b);
        return { key: a, label: String(s.getDate()), long: 'Semaine du ' + shortDate(s), secs: sumBy(l, x => x.secs), meters: sumBy(l, x => x.meters), count: l.length, active: new Set(l.map(x => x.date)).size, sports: bySport(l) };
    });
}
const kmStr = (m) => fmtKm(m) + ' km';
function BarChart({ items, sel, onSel }) {
    const W = 320, H = 150, T = 10, B = 22, n = items.length, gap = n > 8 ? 6 : 12, bw = (W - gap * (n - 1)) / n;
    const max = Math.max(1, ...items.map(i => i.total));
    return (React.createElement("svg", { className: "hist-svg", viewBox: '0 0 ' + W + ' ' + H, role: "img", "aria-label": "Historique" },
        React.createElement("line", { x1: "0", y1: H - B, x2: W, y2: H - B, style: { stroke: 'var(--line)' }, strokeWidth: "1" }),
        items.map((it, k) => {
            const x = k * (bw + gap);
            let y = H - B;
            return (React.createElement("g", { key: it.key, onClick: () => onSel(k), style: { cursor: 'pointer' }, opacity: sel === k ? 1 : .5 },
                React.createElement("rect", { x: x - gap / 2, y: "0", width: bw + gap, height: H, fill: "transparent" }),
                it.total === 0
                    ? React.createElement("rect", { x: x, y: H - B - 2, width: bw, height: "2", rx: "1", style: { fill: 'var(--line)' } })
                    : it.segs.map((sg, j) => { const h = Math.max(2, (sg.v / max) * (H - T - B)); y -= h; return React.createElement("rect", { key: j, x: x, y: y, width: bw, height: h, rx: "3", style: { fill: sg.color } }); }),
                React.createElement("text", { x: x + bw / 2, y: H - 7, textAnchor: "middle", style: { fontWeight: sel === k ? 700 : 400 } }, it.label)));
        })));
}
function TrendChart({ pts, fmtV }) {
    const W = 320, H = 150, L = 8, R = 8, T = 14, B = 22;
    const [hi, setHi] = useState(null);
    const idxs = pts.map((p, i) => p.v != null ? i : -1).filter(i => i >= 0);
    if (idxs.length === 0)
        return React.createElement("p", { className: "empty", style: { margin: '24px 0' } }, "Pas encore de donn\u00E9es sur cette p\u00E9riode.");
    const vals = idxs.map(i => pts[i].v);
    let lo = Math.min(...vals), up = Math.max(...vals);
    const margin = (up - lo) * 0.15 || Math.abs(up) * 0.05 || 1;
    lo -= margin;
    up += margin;
    const X = (i) => L + (pts.length > 1 ? i / (pts.length - 1) : .5) * (W - L - R);
    const Y = (v) => T + (1 - (v - lo) / (up - lo)) * (H - T - B);
    const d = idxs.map((i, k) => (k ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(pts[i].v).toFixed(1)).join(' ');
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    const sel = hi != null ? hi : idxs[idxs.length - 1];
    const onMove = (e) => {
        const r = e.currentTarget.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W;
        let best = idxs[0], bd = 1e9;
        idxs.forEach(i => { const dd = Math.abs(X(i) - x); if (dd < bd) {
            bd = dd;
            best = i;
        } });
        setHi(best);
    };
    return (React.createElement("div", null,
        React.createElement("div", { className: "hist-read" },
            React.createElement("b", null, fmtV(pts[sel].v)),
            React.createElement("span", null, pts[sel].label)),
        React.createElement("svg", { className: "hist-svg", viewBox: '0 0 ' + W + ' ' + H, role: "img", "aria-label": "\u00C9volution", onPointerDown: onMove, onPointerMove: onMove },
            React.createElement("line", { x1: L, y1: H - B, x2: W - R, y2: H - B, style: { stroke: 'var(--line)' }, strokeWidth: "1" }),
            React.createElement("line", { x1: L, y1: Y(avg), x2: W - R, y2: Y(avg), style: { stroke: 'var(--ink2)' }, strokeWidth: "1", strokeDasharray: "3 4", opacity: ".6" }),
            React.createElement("path", { d: d, fill: "none", style: { stroke: 'var(--ink)' }, strokeWidth: "2.2", strokeLinejoin: "round", strokeLinecap: "round" }),
            idxs.length <= 40 && idxs.map(i => React.createElement("circle", { key: i, cx: X(i), cy: Y(pts[i].v), r: "2.6", style: { fill: 'var(--ink)' } })),
            React.createElement("line", { x1: X(sel), y1: T - 4, x2: X(sel), y2: H - B, style: { stroke: 'var(--ink2)' }, strokeWidth: "1", opacity: ".5" }),
            React.createElement("circle", { cx: X(sel), cy: Y(pts[sel].v), r: "5", style: { fill: 'var(--ink)', stroke: 'var(--card)' }, strokeWidth: "2" }),
            React.createElement("text", { x: L, y: H - 6 }, pts[0].short || pts[0].label),
            React.createElement("text", { x: W - R, y: H - 6, textAnchor: "end" }, pts[pts.length - 1].short || pts[pts.length - 1].label)),
        React.createElement("p", { className: "hist-hint" },
            "Ligne pointill\u00E9e : moyenne de la p\u00E9riode (",
            fmtV(avg),
            "). Glisse le doigt sur la courbe pour lire chaque valeur.")));
}
const WELL = {
    sleep: { title: 'Sommeil', f: (v) => fmtMin(Math.round(v / 60)) },
    rhr: { title: 'FC au repos', f: (v) => Math.round(v) + ' bpm' },
    hrv: { title: 'VFC', f: (v) => Math.round(v) + ' ms' },
};
const BAR_TITLES = { month: 'Durée par mois', week: 'Durée par semaine', cal: "Jours d'activité", sports: 'Activité par sport' };
function HistorySheet({ kind, icu, todayStr, onClose }) {
    const w = WELL[kind];
    const [range, setRange] = useState(30);
    const [selIdx, setSelIdx] = useState(null);
    const months = useMemo(() => aggMonths(icu.activities, todayStr), [icu, todayStr]);
    const weeks = useMemo(() => aggWeeks(icu.activities, todayStr), [icu, todayStr]);
    if (w) {
        const byDate = {};
        (icu.wellness || []).forEach(x => { byDate[x.date] = x; });
        const t = parse(todayStr);
        const pts = Array.from({ length: range }, (_, i) => {
            const dt = addDays(t, -(range - 1 - i)), x = byDate[fmt(dt)];
            return { label: longDate(dt), short: shortDate(dt), v: x && x[kind] ? x[kind] : null };
        });
        const real = pts.filter(p => p.v != null).map(p => p.v);
        const last7 = pts.slice(-7).filter(p => p.v != null).map(p => p.v);
        const mean = (a) => a.length ? a.reduce((s, v) => s + v, 0) / a.length : null;
        const stat = (label, v) => React.createElement("div", null,
            React.createElement("b", null, v == null ? '–' : w.f(v)),
            React.createElement("span", null, label));
        return (React.createElement(Sheet, { title: w.title, onClose: onClose },
            React.createElement("div", { className: "seg", role: "tablist", "aria-label": "P\u00E9riode" }, [30, 90].map(r => React.createElement("button", { key: r, role: "tab", "aria-selected": range === r, className: range === r ? 'on' : '', onClick: () => setRange(r) },
                r,
                " jours"))),
            React.createElement(TrendChart, { key: kind + range, pts: pts, fmtV: w.f }),
            React.createElement("div", { className: "hist-stats" },
                stat('Moy. 7 jours', mean(last7)),
                stat('Moy. ' + range + ' j', mean(real)),
                stat('Min', real.length ? Math.min(...real) : null),
                stat('Max', real.length ? Math.max(...real) : null),
                stat('Dernière', real.length ? real[real.length - 1] : null),
                React.createElement("div", null,
                    React.createElement("b", null, real.length),
                    React.createElement("span", null, "jours renseign\u00E9s")))));
    }
    const list = kind === 'week' ? weeks : months;
    const idx = selIdx == null ? list.length - 1 : selIdx;
    const cur = list[idx];
    let items;
    if (kind === 'cal')
        items = list.map(m => ({ key: m.key, label: m.label, total: m.active, segs: [{ v: m.active, color: 'var(--ink)' }] }));
    else if (kind === 'sports' || kind === 'week')
        items = list.map(m => ({ key: m.key, label: m.label, total: m.secs, segs: m.sports.map(s => ({ v: s.secs, color: (DISC[s.kind] || DISC.autre).color })) }));
    else
        items = list.map(m => ({ key: m.key, label: m.label, total: m.secs, segs: [{ v: m.secs, color: 'var(--ink)' }] }));
    const head = kind === 'cal' ? cur.active + (cur.active > 1 ? ' jours actifs' : ' jour actif') : fmtMin(Math.round(cur.secs / 60));
    const count = cur.count + (cur.count > 1 ? ' activités' : ' activité');
    const subline = kind === 'cal' ? 'sur ' + cur.days + ' jours · ' + cur.long : (cur.long || '') + ' · ' + count + (cur.meters ? ' · ' + kmStr(cur.meters) : '');
    return (React.createElement(Sheet, { title: BAR_TITLES[kind], onClose: onClose },
        React.createElement("div", { className: "hist-read" },
            React.createElement("b", null, head),
            React.createElement("span", null, subline)),
        React.createElement(BarChart, { items: items, sel: idx, onSel: setSelIdx }),
        (kind === 'sports' || kind === 'week') && (React.createElement("div", { className: "hist-rows" },
            cur.sports.length === 0 && React.createElement("p", { className: "empty", style: { margin: '14px 0' } }, "Aucune activit\u00E9 sur cette p\u00E9riode."),
            cur.sports.map(s => {
                const dsc = DISC[s.kind] || DISC.autre;
                return React.createElement("div", { className: "r", key: s.kind, style: { '--c': dsc.color } },
                    React.createElement("span", null,
                        React.createElement("i", null),
                        dsc.short),
                    React.createElement("span", null,
                        fmtMin(Math.round(s.secs / 60)),
                        s.meters ? ' · ' + (s.kind === 'nage' ? Math.round(s.meters) + ' m' : kmStr(s.meters)) : ''));
            }))),
        (kind === 'month' || kind === 'cal') && (React.createElement("div", { className: "hist-rows" }, [...list].reverse().map(m => (React.createElement("div", { className: "r", key: m.key },
            React.createElement("span", { style: { textTransform: 'capitalize' } }, m.long),
            React.createElement("span", null, kind === 'cal' ? m.active + ' j' : fmtMin(Math.round(m.secs / 60)) + (m.meters ? ' · ' + kmStr(m.meters) : '')))))))));
}
async function icuFetch(apiKey, path) {
    let res;
    try {
        res = await fetch('https://intervals.icu/api/v1/' + path, { headers: { Authorization: 'Basic ' + btoa('API_KEY:' + apiKey), Accept: 'application/json' } });
    }
    catch (e) {
        throw { code: 'net' };
    }
    if (!res.ok)
        throw { code: res.status === 401 || res.status === 403 ? 'auth' : 'http' };
    return res.json();
}
function parseRoute(streams) {
    let ll = null;
    if (Array.isArray(streams))
        ll = streams.find(s => s && s.type === 'latlng');
    else if (streams && typeof streams === 'object')
        ll = streams.latlng || null;
    if (!ll || !Array.isArray(ll.data) || !Array.isArray(ll.data2))
        return [];
    const pts = [];
    for (let i = 0; i < ll.data.length; i++) {
        const la = ll.data[i], lo = ll.data2[i];
        if (typeof la === 'number' && typeof lo === 'number' && (la !== 0 || lo !== 0))
            pts.push([la, lo]);
    }
    const step = Math.ceil(pts.length / 1500);
    return step > 1 ? pts.filter((_, i) => i % step === 0 || i === pts.length - 1) : pts;
}
function demoRoute() {
    const pts = [];
    for (let i = 0; i <= 140; i++) {
        const a = i / 140 * Math.PI * 2;
        pts.push([48.8300 + Math.sin(a) * 0.012 + Math.sin(a * 3) * 0.002, 2.3300 + Math.cos(a) * 0.018 + Math.cos(a * 2) * 0.003]);
    }
    return pts;
}
const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#111';
const clock = (secs) => { secs = Math.round(secs); const h = Math.floor(secs / 3600), m = Math.floor(secs % 3600 / 60), s = secs % 60; return h ? h + ':' + pad(m) + ':' + pad(s) : m + ':' + pad(s); };
const paceStr = (secs, meters, per) => { if (!secs || !meters)
    return '–'; const p = secs / meters * per; return Math.floor(p / 60) + "'" + pad(Math.round(p % 60) % 60) + '"'; };
function actStats(act, d) {
    const secs = Number(d && d.moving_time) || act.secs, meters = Number(d && d.distance) || act.meters;
    const out = [];
    if (meters)
        out.push([act.kind === 'nage' ? Math.round(meters) + ' m' : fmtKm(meters) + ' km', 'Distance']);
    out.push([clock(secs), 'Durée']);
    if (meters && secs) {
        if (act.kind === 'course')
            out.push([paceStr(secs, meters, 1000) + '/km', 'Allure moyenne']);
        else if (act.kind === 'nage')
            out.push([paceStr(secs, meters, 100) + '/100 m', 'Allure moyenne']);
        else if (act.kind === 'velo')
            out.push([(meters / secs * 3.6).toFixed(1).replace('.', ',') + ' km/h', 'Vitesse moyenne']);
    }
    if (d && d.average_heartrate)
        out.push([Math.round(d.average_heartrate) + ' bpm', 'FC moyenne']);
    if (d && d.max_heartrate)
        out.push([Math.round(d.max_heartrate) + ' bpm', 'FC max']);
    const elev = Number(d && d.total_elevation_gain) || act.elev;
    if (elev > 0 && (act.kind === 'course' || act.kind === 'velo'))
        out.push([Math.round(elev) + ' m', 'Dénivelé positif']);
    if (d && d.calories)
        out.push([Math.round(d.calories) + ' kcal', 'Calories']);
    if (d && d.icu_training_load)
        out.push([String(Math.round(d.icu_training_load)), "Charge d'entraînement"]);
    return out;
}
function RouteMap({ points, color }) {
    const ref = useRef(null);
    useEffect(() => {
        if (!window.L || !ref.current || points.length < 2)
            return;
        const L = window.L;
        const map = L.map(ref.current, { zoomControl: true, scrollWheelZoom: true });
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
        const line = L.polyline(points, { color, weight: 5, opacity: .95, lineJoin: 'round' }).addTo(map);
        L.circleMarker(points[0], { radius: 7, color: '#fff', weight: 2, fillColor: '#1a9850', fillOpacity: 1 }).addTo(map);
        L.circleMarker(points[points.length - 1], { radius: 7, color: '#fff', weight: 2, fillColor: '#d73027', fillOpacity: 1 }).addTo(map);
        map.fitBounds(line.getBounds(), { padding: [26, 26] });
        return () => map.remove();
    }, [points]);
    return React.createElement("div", { ref: ref, className: "routemap", role: "application", "aria-label": "Carte du parcours, zoomable" });
}
function ActivityModal({ act, conn, onClose }) {
    const [st, setSt] = useState({ status: 'loading', detail: null, route: [] });
    const dsc = DISC[act.kind] || DISC.autre;
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape')
            onClose(); };
        window.addEventListener('keydown', onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
    }, []);
    useEffect(() => {
        let off = false;
        (async () => {
            if (window.ALLURE_DEMO) {
                await new Promise(r => setTimeout(r, 300));
                if (!off)
                    setSt({ status: 'ok', detail: { average_heartrate: 152, max_heartrate: 171, calories: 540, icu_training_load: 62 }, route: act.kind === 'nage' ? [] : demoRoute() });
                return;
            }
            let detail = null, route = [], failed = 0;
            try {
                detail = await icuFetch(conn.apiKey, 'activity/' + encodeURIComponent(act.id));
            }
            catch (e) {
                failed++;
            }
            try {
                route = parseRoute(await icuFetch(conn.apiKey, 'activity/' + encodeURIComponent(act.id) + '/streams.json?types=latlng'));
            }
            catch (e) {
                failed++;
            }
            if (!off)
                setSt({ status: failed === 2 ? 'error' : 'ok', detail, route });
        })();
        return () => { off = true; };
    }, [act.id]);
    const stats = actStats(act, st.detail);
    return (React.createElement("div", { className: "modal-back", onClick: onClose },
        React.createElement("div", { className: "modal-card", role: "dialog", "aria-modal": "true", "aria-label": act.name || dsc.short, onClick: (e) => e.stopPropagation(), style: { '--c': dsc.color } },
            React.createElement("div", { className: "modal-head" },
                React.createElement("div", null,
                    React.createElement("p", { className: "mk" },
                        React.createElement("i", null),
                        dsc.short),
                    React.createElement("h2", null, act.name || dsc.short),
                    React.createElement("p", { className: "ms" },
                        longDate(parse(act.date)),
                        act.time ? ' · ' + act.time : '')),
                React.createElement("button", { className: "icon", "aria-label": "Fermer", onClick: onClose },
                    React.createElement(Icon, { name: "close" }))),
            React.createElement("div", { className: "mstats" }, stats.map(([v, k]) => React.createElement("div", { key: k },
                React.createElement("b", null, v),
                React.createElement("span", null, k)))),
            st.status === 'loading' && React.createElement("p", { className: "mnote" }, "Chargement du parcours\u2026"),
            st.status === 'error' && React.createElement("p", { className: "mnote" }, "Impossible de charger les d\u00E9tails. V\u00E9rifie ta connexion."),
            st.status === 'ok' && st.route.length > 1 && React.createElement(RouteMap, { points: st.route, color: cssVar('--' + ({ course: 'run', velo: 'bike', nage: 'swim', muscu: 'str' }[act.kind] || 'run')) }),
            st.status === 'ok' && st.route.length <= 1 && React.createElement("p", { className: "mnote" }, "Pas de trac\u00E9 GPS pour cette activit\u00E9."),
            st.status === 'ok' && st.route.length > 1 && React.createElement("p", { className: "mnote small" }, "Pince ou utilise + et \u2212 pour zoomer, glisse pour te d\u00E9placer."))));
}
function stepsMap(icu, manual) {
    const m = {};
    (icu.wellness || []).forEach(w => { if (w.steps)
        m[w.date] = w.steps; });
    Object.keys(manual || {}).forEach(k => { if (manual[k] > 0)
        m[k] = manual[k]; });
    return m;
}
const nFr = (n) => Math.round(n).toLocaleString('fr-FR');
function StepsSheet({ data, manual, todayStr, onSave, onClose }) {
    const [range, setRange] = useState(30);
    const [date, setDate] = useState(todayStr);
    const [val, setVal] = useState(data[todayStr] ? String(Math.round(data[todayStr])) : '');
    const [msg, setMsg] = useState('');
    const t = parse(todayStr);
    const pts = Array.from({ length: range }, (_, i) => {
        const dt = addDays(t, -(range - 1 - i));
        return { label: longDate(dt), short: shortDate(dt), v: data[fmt(dt)] || null };
    });
    const real = pts.filter(p => p.v != null).map(p => p.v);
    const last7 = pts.slice(-7).filter(p => p.v != null).map(p => p.v);
    const mean = (a) => a.length ? a.reduce((s, v) => s + v, 0) / a.length : null;
    const stat = (label, v) => React.createElement("div", null,
        React.createElement("b", null, v == null ? '–' : nFr(v)),
        React.createElement("span", null, label));
    const pickDate = (d) => { setDate(d); setMsg(''); setVal(data[d] ? String(Math.round(data[d])) : ''); };
    const save = () => {
        const n = Math.round(Number(String(val).replace(/\s/g, '')));
        if (!(n > 0 && n <= 200000)) {
            setMsg('Indique un nombre de pas entre 1 et 200 000.');
            return;
        }
        onSave(date, n);
        setMsg('Enregistré ✓');
    };
    const remove = () => { onSave(date, 0); setVal(''); setMsg('Saisie supprimée.'); };
    return (React.createElement(Sheet, { title: "Pas", onClose: onClose },
        React.createElement("div", { className: "seg", role: "tablist", "aria-label": "P\u00E9riode" }, [30, 90].map(r => React.createElement("button", { key: r, role: "tab", "aria-selected": range === r, className: range === r ? 'on' : '', onClick: () => setRange(r) },
            r,
            " jours"))),
        React.createElement(TrendChart, { key: range + ':' + real.length + ':' + (real[real.length - 1] || 0), pts: pts, fmtV: nFr }),
        React.createElement("div", { className: "hist-stats" },
            stat('Moy. 7 jours', mean(last7)),
            stat('Moy. ' + range + ' j', mean(real)),
            stat('Max', real.length ? Math.max(...real) : null)),
        React.createElement("h3", { className: "subh" }, "Saisir mes pas"),
        React.createElement("div", { className: "grid2" },
            React.createElement("div", null,
                React.createElement("label", { className: "f", htmlFor: "st-date" }, "Jour"),
                React.createElement("input", { id: "st-date", type: "date", max: todayStr, value: date, onChange: (e) => pickDate(e.target.value) })),
            React.createElement("div", null,
                React.createElement("label", { className: "f", htmlFor: "st-val" }, "Pas"),
                React.createElement("input", { id: "st-val", type: "number", inputMode: "numeric", placeholder: "8500", value: val, onChange: (e) => { setVal(e.target.value); setMsg(''); } }))),
        msg && React.createElement("p", { className: msg.includes('Indique') ? 'err' : 'note', role: "status", style: { marginTop: 10 } }, msg),
        React.createElement("div", { className: "actions" },
            React.createElement("button", { className: "btn", onClick: save }, "Enregistrer"),
            manual[date] > 0 && React.createElement("button", { className: "btn ghost", onClick: remove }, "Supprimer")),
        React.createElement("p", { className: "note", style: { marginTop: 14 } }, "Les pas envoy\u00E9s par Intervals.icu s'affichent automatiquement. Une saisie manuelle les remplace pour le jour choisi.")));
}
const ROUTE_KEY = 'allure_routes_v1';
const ROUTES = (() => { try {
    return JSON.parse(localStorage.getItem(ROUTE_KEY)) || {};
}
catch (e) {
    return {};
} })();
const saveRoutes = () => { try {
    localStorage.setItem(ROUTE_KEY, JSON.stringify(ROUTES));
}
catch (e) { } };
const GPS_TYPE = /(run|ride|walk|hike|ski|kayak|row|canoe|paddle|snowboard|sail|surf)/i;
const NO_GPS_TYPE = /(virtual|weight|strength|zwift|trainer|indoor|treadmill)/i;
const hasGps = (a) => GPS_TYPE.test(a.type || '') && !NO_GPS_TYPE.test(a.type || '');
function rdp(pts, eps) {
    const n = pts.length;
    if (n < 3)
        return pts;
    const keep = new Uint8Array(n);
    keep[0] = 1;
    keep[n - 1] = 1;
    const stack = [[0, n - 1]];
    while (stack.length) {
        const [a, b] = stack.pop();
        const ax = pts[a][0], ay = pts[a][1], dx = pts[b][0] - ax, dy = pts[b][1] - ay, len2 = dx * dx + dy * dy;
        let dmax = 0, idx = -1;
        for (let i = a + 1; i < b; i++) {
            let t = len2 ? ((pts[i][0] - ax) * dx + (pts[i][1] - ay) * dy) / len2 : 0;
            t = Math.max(0, Math.min(1, t));
            const ex = ax + t * dx - pts[i][0], ey = ay + t * dy - pts[i][1], d = ex * ex + ey * ey;
            if (d > dmax) {
                dmax = d;
                idx = i;
            }
        }
        if (idx > 0 && dmax > eps * eps) {
            keep[idx] = 1;
            stack.push([a, idx], [idx, b]);
        }
    }
    return pts.filter((_, i) => keep[i]);
}
function simplifyRoute(pts) {
    let out = pts, eps = 2e-5;
    for (let k = 0; k < 6 && out.length > 450; k++) {
        out = rdp(pts, eps);
        eps *= 2;
    }
    if (out === pts)
        out = rdp(pts, 2e-5);
    return out.map(p => [Math.round(p[0] * 1e5) / 1e5, Math.round(p[1] * 1e5) / 1e5]);
}
function demoRouteFor(id) {
    let k = 0;
    for (const ch of String(id))
        k = (k * 31 + ch.charCodeAt(0)) % 9973;
    const cy = 48.83 + ((k % 7) - 3) * 0.011, cx = 2.33 + (((k * 3) % 9) - 4) * 0.012, r = 0.006 + (k % 5) * 0.003;
    return Array.from({ length: 121 }, (_, i) => { const a = i / 120 * Math.PI * 2; return [cy + Math.sin(a) * r + Math.sin(a * 3 + k) * r * .15, cx + Math.cos(a) * r * 1.4 + Math.cos(a * 2) * r * .2]; });
}
async function fetchRoute(apiKey, id) {
    if (window.ALLURE_DEMO) {
        await new Promise(r => setTimeout(r, 60));
        return simplifyRoute(demoRouteFor(id));
    }
    let pts = [], ok = false;
    try {
        const m = await icuFetch(apiKey, 'activity/' + encodeURIComponent(id) + '/map');
        ok = true;
        pts = (m && Array.isArray(m.latlngs) ? m.latlngs : []).filter(p => Array.isArray(p) && typeof p[0] === 'number' && typeof p[1] === 'number' && (p[0] !== 0 || p[1] !== 0));
    }
    catch (e) {
        if (e && e.code === 'auth')
            throw e;
    }
    if (pts.length < 2) {
        try {
            pts = parseRoute(await icuFetch(apiKey, 'activity/' + encodeURIComponent(id) + '/streams.json?types=latlng'));
            ok = true;
        }
        catch (e) {
            if (e && e.code === 'auth')
                throw e;
        }
    }
    if (pts.length >= 2)
        return simplifyRoute(pts);
    return ok ? null : undefined;
}
const ROUTE_FAMILY = { course: [8, 38], velo: [195, 40], autre: [110, 30] };
const routeColor = (kind, i) => { const f = ROUTE_FAMILY[kind] || [270, 40]; return 'hsl(' + (f[0] + (i * 17) % f[1]) + ' 80% ' + (34 + (i * 11) % 22) + '%)'; };
function RoutesMap({ items, fitKey, onPick }) {
    const ref = useRef(null), mapRef = useRef(null), layerRef = useRef(null), fitted = useRef(null);
    const pick = useRef(onPick);
    pick.current = onPick;
    useEffect(() => {
        if (!window.L || !ref.current)
            return;
        const L = window.L;
        const map = L.map(ref.current, { zoomControl: true, scrollWheelZoom: true }).setView([46.6, 2.5], 5);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
        layerRef.current = L.layerGroup().addTo(map);
        mapRef.current = map;
        return () => { map.remove(); mapRef.current = null; };
    }, []);
    useEffect(() => {
        const L = window.L, map = mapRef.current, group = layerRef.current;
        if (!L || !map || !group)
            return;
        group.clearLayers();
        const all = [];
        items.forEach(it => {
            const line = L.polyline(it.pts, { color: it.color, weight: 4, opacity: .9, lineJoin: 'round' }).addTo(group);
            const hit = L.polyline(it.pts, { color: '#000', weight: 18, opacity: .01 }).addTo(group);
            hit.on('click', () => pick.current(it.act));
            hit.on('mouseover', () => line.setStyle({ weight: 7, opacity: 1 }));
            hit.on('mouseout', () => line.setStyle({ weight: 4, opacity: .9 }));
            all.push(...it.pts);
        });
        if (all.length && fitted.current !== fitKey) {
            fitted.current = fitKey;
            map.fitBounds(L.latLngBounds(all), { padding: [28, 28] });
        }
    }, [items, fitKey]);
    return React.createElement("div", { ref: ref, className: "bigmap", role: "application", "aria-label": "Carte de tous les parcours, zoomable" });
}
function MyRoutes({ icu, conn, todayStr, onSettings }) {
    const [period, setPeriod] = useState(90);
    const [sport, setSport] = useState('all');
    const [tick, setTick] = useState(0);
    const [prog, setProg] = useState({ done: 0, total: 0 });
    const [openAct, setOpenAct] = useState(null);
    const acts = useMemo(() => {
        const cutoff = fmt(addDays(parse(todayStr), -period));
        return icu.activities.filter(a => a.date >= cutoff && hasGps(a) && (sport === 'all' || a.kind === sport)).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    }, [icu, period, sport, todayStr]);
    const actKey = acts.map(a => a.id).join(',');
    useEffect(() => {
        if (!conn)
            return;
        const todo = acts.filter(a => !(a.id in ROUTES));
        setProg({ done: 0, total: todo.length });
        if (!todo.length)
            return;
        let off = false, next = 0, done = 0;
        const worker = async () => {
            while (!off && next < todo.length) {
                const a = todo[next++];
                try {
                    const r = await fetchRoute(conn.apiKey, a.id);
                    if (r !== undefined)
                        ROUTES[a.id] = r;
                }
                catch (e) {
                    if (e && e.code === 'auth') {
                        off = true;
                    }
                }
                done++;
                if (!off && (done % 4 === 0 || done === todo.length)) {
                    setProg({ done, total: todo.length });
                    setTick(t => t + 1);
                }
                if (done % 12 === 0)
                    saveRoutes();
            }
        };
        Promise.all([worker(), worker(), worker()]).then(() => { saveRoutes(); if (!off) {
            setProg({ done: todo.length, total: todo.length });
            setTick(t => t + 1);
        } });
        return () => { off = true; saveRoutes(); };
    }, [actKey, conn]);
    const items = useMemo(() => {
        const idx = {};
        return acts.filter(a => ROUTES[a.id] && ROUTES[a.id].length > 1).map(a => { idx[a.kind] = (idx[a.kind] || 0) + 1; return { act: a, pts: ROUTES[a.id], color: routeColor(a.kind, idx[a.kind] - 1) }; });
    }, [actKey, tick]);
    if (!conn)
        return (React.createElement("div", null,
            React.createElement("div", { className: "connect" },
                React.createElement("p", null, "Connecte Intervals.icu pour voir tous tes parcours sur une carte."),
                React.createElement("button", { className: "btn", onClick: onSettings }, "Connecter Intervals.icu"))));
    const kinds = ['course', 'velo', 'autre'].filter(k => items.some(i => i.act.kind === k));
    const loading = prog.total > 0 && prog.done < prog.total;
    const chip = (v, cur, set, label) => React.createElement("button", { key: String(v), role: "tab", "aria-selected": cur === v, className: cur === v ? 'on' : '', onClick: () => set(v) }, label);
    return (React.createElement("div", null,
        React.createElement("div", { className: "seg three", role: "tablist", "aria-label": "P\u00E9riode" }, [[30, '30 jours'], [90, '3 mois'], [180, '6 mois']].map(([v, l]) => chip(v, period, setPeriod, l))),
        React.createElement("div", { className: "seg three", role: "tablist", "aria-label": "Sport", style: { marginTop: 0 } }, [['all', 'Tout'], ['course', 'Course'], ['velo', 'Vélo']].map(([v, l]) => chip(v, sport, setSport, l))),
        React.createElement(RoutesMap, { items: items, fitKey: period + ':' + sport + ':' + (items.length > 0), onPick: setOpenAct }),
        React.createElement("div", { className: "maplegend" },
            kinds.map(k => React.createElement("span", { key: k, style: { '--c': routeColor(k, 0) } },
                React.createElement("i", null),
                (DISC[k] || DISC.autre).short)),
            loading ? React.createElement("em", null,
                "Chargement des trac\u00E9s ",
                prog.done,
                "/",
                prog.total,
                "\u2026") : React.createElement("em", null, items.length === 0 ? 'Aucun parcours GPS sur cette période.' : 'Touche un tracé pour ouvrir l\'activité.')),
        openAct && React.createElement(ActivityModal, { act: openAct, conn: conn, onClose: () => setOpenAct(null) })));
}
const ORS_KEY = 'allure_ors_key_v1', ROUTE_PREFS = 'allure_route_prefs_v1';
const lsGet = (k) => { try {
    return localStorage.getItem(k);
}
catch (e) {
    return null;
} };
const lsSet = (k, v) => { try {
    localStorage.setItem(k, v);
}
catch (e) { } };
const RB_DEFAULTS = { mode: 'km', km: '10', min: '60', elev: 'any', quiet: true, pace: '6:30', start: null };
const loadRb = () => { try {
    return { ...RB_DEFAULTS, ...(JSON.parse(lsGet(ROUTE_PREFS)) || {}) };
}
catch (e) {
    return { ...RB_DEFAULTS };
} };
const paceToSec = (s) => { const m = /^\s*(\d{1,2})\s*[:'.]\s*(\d{1,2})\s*$/.exec(String(s || '')); return m ? Number(m[1]) * 60 + Number(m[2]) : 0; };
const rad = (d) => d * Math.PI / 180;
const hav = (a, b) => { const dLat = rad(b[0] - a[0]), dLng = rad(b[1] - a[1]), x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2; return 2 * 6371000 * Math.asin(Math.sqrt(x)); };
function loopStats(c) {
    let dist = 0;
    for (let i = 1; i < c.length; i++)
        dist += hav(c[i - 1], c[i]);
    const el = c.map(p => p[2]);
    const sm = el.map((_, i) => { let s = 0, n = 0; for (let k = Math.max(0, i - 2); k <= Math.min(el.length - 1, i + 2); k++) {
        if (typeof el[k] === 'number') {
            s += el[k];
            n++;
        }
    } return n ? s / n : null; });
    let up = 0, down = 0;
    for (let i = 1; i < sm.length; i++) {
        if (sm[i] == null || sm[i - 1] == null)
            continue;
        const d = sm[i] - sm[i - 1];
        if (d > 0)
            up += d;
        else
            down -= d;
    }
    return { dist, ascent: up, descent: down };
}
const xmlEsc = (s) => String(s).replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]));
function toGpx(name, coords) {
    const pts = coords.map(p => '      <trkpt lat="' + p[0].toFixed(6) + '" lon="' + p[1].toFixed(6) + '">' + (typeof p[2] === 'number' ? '<ele>' + p[2].toFixed(1) + '</ele>' : '') + '</trkpt>').join('\n');
    return '<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Allure" xmlns="http://www.topografix.com/GPX/1/1">\n  <metadata><name>' + xmlEsc(name) + '</name><time>' + new Date().toISOString() + '</time></metadata>\n  <trk>\n    <name>' + xmlEsc(name) + '</name>\n    <trkseg>\n' + pts + '\n    </trkseg>\n  </trk>\n</gpx>\n';
}
const gpxFileName = (name) => (String(name).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'itineraire') + '.gpx';
function downloadGpx(name, xml) {
    const blob = new Blob([xml], { type: 'application/gpx+xml' }), url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url;
    a.download = gpxFileName(name);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
}
async function shareGpx(name, xml) {
    const file = new File([xml], gpxFileName(name), { type: 'application/gpx+xml' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: name });
        return true;
    }
    return false;
}
async function orsLoop(key, start, length, seed, quiet) {
    const body = { coordinates: [[start[1], start[0]]], elevation: true, instructions: false, options: { round_trip: { length: Math.round(length), points: 3, seed } } };
    if (quiet)
        body.options.profile_params = { weightings: { green: { factor: 0.8 }, quiet: { factor: 0.8 } } };
    let res;
    try {
        res = await fetch('https://api.openrouteservice.org/v2/directions/foot-walking/geojson', { method: 'POST', headers: { Authorization: key, 'Content-Type': 'application/json', Accept: 'application/geo+json, application/json' }, body: JSON.stringify(body) });
    }
    catch (e) {
        throw { code: 'net' };
    }
    if (res.status === 401 || res.status === 403)
        throw { code: 'auth' };
    if (res.status === 429)
        throw { code: 'rate' };
    if (!res.ok) {
        if (quiet && res.status === 400) {
            const r = await orsLoop(key, start, length, seed, false);
            r.quietDropped = true;
            return r;
        }
        throw { code: 'http', status: res.status };
    }
    const j = await res.json();
    const f = j && j.features && j.features[0];
    const raw = f && f.geometry && f.geometry.coordinates;
    if (!Array.isArray(raw) || raw.length < 2)
        throw { code: 'empty' };
    const coords = raw.map(c => [c[1], c[0], typeof c[2] === 'number' ? c[2] : null]);
    return { coords, ...loopStats(coords), len: length, seed };
}
const hillLabel = (r) => { const k = r.ascent / (r.dist / 1000); return k < 6 ? 'Plat' : k < 15 ? 'Légèrement vallonné' : 'Vallonné'; };
async function generateLoops({ key, start, targetM, quiet, elev, onProgress }) {
    const seeds = [1, 2, 3, 4, 5, 6], total = seeds.length * 2;
    let done = 0, noQuiet = false, dropped = false;
    const tick = () => { done++; onProgress(Math.min(done, total), total); };
    const call = async (seed, len) => { const r = await orsLoop(key, start, len, seed, quiet && !noQuiet); if (r.quietDropped) {
        noQuiet = true;
        dropped = true;
    } return r; };
    const pool = async (jobs) => {
        const out = [];
        let i = 0;
        await Promise.all([0, 1, 2].map(async () => {
            while (i < jobs.length) {
                const k = i++;
                try {
                    out[k] = await jobs[k]();
                }
                catch (e) {
                    if (e && (e.code === 'auth' || e.code === 'rate' || e.code === 'net'))
                        throw e;
                    out[k] = null;
                }
                tick();
            }
        }));
        return out;
    };
    const first = await pool(seeds.map(sd => () => call(sd, targetM)));
    const second = await pool(first.map((r, k) => async () => {
        if (!r)
            return null;
        const ratio = targetM / r.dist;
        if (Math.abs(1 - ratio) <= 0.06 || ratio < 0.4 || ratio > 2.5)
            return r;
        const r2 = await call(seeds[k], r.len * ratio);
        return Math.abs(r2.dist - targetM) < Math.abs(r.dist - targetM) ? r2 : r;
    }));
    const all = second.filter(Boolean);
    if (!all.length)
        throw { code: 'empty' };
    const uniq = [];
    all.forEach(r => { if (!uniq.some(u => Math.abs(u.dist - r.dist) < 150 && Math.abs(u.ascent - r.ascent) < 8))
        uniq.push(r); });
    const near = (r) => Math.abs(r.dist - targetM);
    const within = uniq.filter(r => near(r) / targetM <= 0.1);
    const cand = within.length >= 2 ? within : [...uniq].sort((a, b) => near(a) - near(b)).slice(0, 4);
    const perKm = (r) => r.ascent / (r.dist / 1000);
    if (elev === 'flat')
        cand.sort((a, b) => perKm(a) - perKm(b));
    else if (elev === 'hilly')
        cand.sort((a, b) => perKm(b) - perKm(a));
    else
        cand.sort((a, b) => near(a) - near(b));
    return { routes: cand.slice(0, 3), dropped, farOff: within.length < 2 };
}
const CAND_COLORS = ['#e8590c', '#1c7ed6', '#2f9e44'];
function BuilderMap({ start, picking, onPick, routes, sel, onSel, fitKey }) {
    const ref = useRef(null), mapRef = useRef(null), layerRef = useRef(null), fitted = useRef(null);
    const cb = useRef({});
    cb.current = { onPick, onSel, picking };
    useEffect(() => {
        if (!window.L || !ref.current)
            return;
        const L = window.L;
        const map = L.map(ref.current, { zoomControl: true, scrollWheelZoom: true }).setView(start || [46.6, 2.5], start ? 14 : 5);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
        layerRef.current = L.layerGroup().addTo(map);
        mapRef.current = map;
        map.on('click', (e) => { if (cb.current.picking)
            cb.current.onPick([e.latlng.lat, e.latlng.lng]); });
        return () => { map.remove(); mapRef.current = null; };
    }, []);
    useEffect(() => {
        const L = window.L, map = mapRef.current, g = layerRef.current;
        if (!L || !map || !g)
            return;
        g.clearLayers();
        routes.forEach((r, i) => {
            const on = i === sel, pts = r.coords.map(p => [p[0], p[1]]);
            const line = L.polyline(pts, { color: CAND_COLORS[i % 3], weight: on ? 6 : 3, opacity: on ? .95 : .55 }).addTo(g);
            if (!on)
                line.on('click', () => cb.current.onSel(i));
        });
        if (start)
            L.circleMarker(start, { radius: 8, color: '#fff', weight: 3, fillColor: '#1a9850', fillOpacity: 1 }).addTo(g);
        if (routes.length && fitted.current !== fitKey) {
            fitted.current = fitKey;
            map.fitBounds(L.latLngBounds(routes.flatMap(r => r.coords.map(p => [p[0], p[1]]))), { padding: [28, 28] });
        }
        else if (!routes.length && start)
            map.setView(start, Math.max(map.getZoom(), 14));
    }, [start, routes, sel, fitKey]);
    return React.createElement("div", { ref: ref, className: 'rbmap' + (picking ? ' picking' : ''), role: "application", "aria-label": "Carte pour choisir le d\u00E9part et voir les itin\u00E9raires" });
}
function RouteBuilder() {
    const init = useRef(loadRb()).current;
    const [key, setKey] = useState(() => lsGet(ORS_KEY) || '');
    const [keyIn, setKeyIn] = useState('');
    const [p, setP] = useState(init);
    const [start, setStart] = useState(init.start);
    const [label, setLabel] = useState(init.startLabel || '');
    const [picking, setPicking] = useState(false);
    const [q, setQ] = useState('');
    const [hits, setHits] = useState([]);
    const [msg, setMsg] = useState('');
    const [st, setSt] = useState({ status: 'idle', routes: [], done: 0, total: 12, note: '' });
    const [sel, setSel] = useState(0);
    const [fitKey, setFitKey] = useState(0);
    const set = (k, v) => setP(prev => ({ ...prev, [k]: v }));
    useEffect(() => { lsSet(ROUTE_PREFS, JSON.stringify({ ...p, start, startLabel: label })); }, [p, start, label]);
    const paceSec = paceToSec(p.pace) || 390;
    const targetM = p.mode === 'km' ? Number(String(p.km).replace(',', '.')) * 1000 : (Number(p.min) * 60 / paceSec) * 1000;
    const valid = targetM >= 2000 && targetM <= 60000;
    const saveKey = () => { const k = keyIn.trim(); if (k.length < 20) {
        setMsg('Colle la clé complète (une longue suite de caractères).');
        return;
    } lsSet(ORS_KEY, k); setKey(k); setKeyIn(''); setMsg(''); };
    const useMyPosition = () => {
        setMsg('Recherche de ta position…');
        setPicking(false);
        if (!navigator.geolocation) {
            setMsg('La localisation n\'est pas disponible. Choisis un point sur la carte.');
            return;
        }
        navigator.geolocation.getCurrentPosition((pos) => { setStart([pos.coords.latitude, pos.coords.longitude]); setLabel('Ma position'); setMsg(''); setSt(s => ({ ...s, routes: [] })); }, () => setMsg('Position indisponible : autorise la localisation pour ce site, ou choisis un point sur la carte.'), { enableHighAccuracy: true, timeout: 12000 });
    };
    const search = async () => {
        if (!q.trim())
            return;
        setMsg('Recherche…');
        setHits([]);
        try {
            const res = await fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&accept-language=fr&q=' + encodeURIComponent(q.trim()));
            const j = await res.json();
            setHits(Array.isArray(j) ? j : []);
            setMsg(Array.isArray(j) && j.length ? '' : 'Aucun lieu trouvé.');
        }
        catch (e) {
            setMsg('Recherche impossible : vérifie ta connexion.');
        }
    };
    const pickHit = (h) => { setStart([Number(h.lat), Number(h.lon)]); setLabel(String(h.display_name).split(',').slice(0, 2).join(',')); setHits([]); setQ(''); setSt(s => ({ ...s, routes: [] })); };
    const pickOnMap = (pt) => { setStart(pt); setLabel('Point choisi sur la carte'); setPicking(false); setSt(s => ({ ...s, routes: [] })); };
    const generate = async () => {
        if (!start) {
            setMsg('Choisis d\'abord un départ.');
            return;
        }
        if (!valid) {
            setMsg('Choisis une distance entre 2 et 60 km (ou une durée équivalente).');
            return;
        }
        setMsg('');
        setSel(0);
        setSt({ status: 'loading', routes: [], done: 0, total: 12, note: '' });
        try {
            const r = await generateLoops({ key, start, targetM, quiet: p.quiet, elev: p.elev, onProgress: (d, t) => setSt(s => ({ ...s, done: d, total: t })) });
            setSt({ status: 'done', routes: r.routes, done: 12, total: 12, note: (r.dropped ? 'L\'option parcs et rues calmes n\'a pas pu être appliquée. ' : '') + (r.farOff ? 'Peu d\'itinéraires proches de la distance demandée : change légèrement la distance ou le départ pour plus de choix.' : '') });
            setFitKey(k => k + 1);
        }
        catch (e) {
            const code = e && e.code;
            setSt({ status: 'error', routes: [], done: 0, total: 12, note: code === 'auth' ? 'Clé OpenRouteService refusée. Vérifie-la (bouton « Changer la clé »).' : code === 'rate' ? 'Trop de requêtes : attends une minute puis réessaie.' : code === 'net' ? 'Impossible de joindre OpenRouteService. Vérifie ta connexion.' : code === 'empty' ? 'Aucun itinéraire trouvé autour de ce point. Essaie un autre départ ou une autre distance.' : 'OpenRouteService a refusé la demande' + (e && e.status ? ' (erreur ' + e.status + ')' : '') + '. Réessaie avec une autre distance ou un autre départ.' });
        }
    };
    const chosen = st.routes[sel];
    const kmTxt = (r) => (r.dist / 1000).toFixed(1).replace('.', ',') + ' km';
    const gpxName = chosen ? 'Allure ' + kmTxt(chosen) + ' D+ ' + Math.round(chosen.ascent) + ' m' : '';
    const [shareMsg, setShareMsg] = useState('');
    const share = async () => { try {
        const ok = await shareGpx(gpxName, toGpx(gpxName, chosen.coords));
        setShareMsg(ok ? '' : 'Le partage de fichier n\'est pas disponible ici : utilise « Télécharger le GPX ».');
    }
    catch (e) {
        if (!(e && e.name === 'AbortError'))
            setShareMsg('Partage impossible : utilise « Télécharger le GPX ».');
    } };
    if (!key)
        return (React.createElement("div", { className: "card" },
            React.createElement("h3", null, "Connecter OpenRouteService"),
            React.createElement("p", { className: "note" }, "Le calcul des itin\u00E9raires passe par OpenRouteService, gratuit (2 000 calculs par jour). Cr\u00E9e un compte, g\u00E9n\u00E8re une cl\u00E9 API (\u00AB Token \u00BB), puis colle-la ici. Elle reste sur ton t\u00E9l\u00E9phone."),
            React.createElement("p", { className: "note", style: { marginTop: 8 } },
                React.createElement("a", { href: "https://openrouteservice.org/dev/#/signup", target: "_blank", rel: "noopener noreferrer" }, "Cr\u00E9er mon compte OpenRouteService")),
            React.createElement("label", { className: "f", htmlFor: "ors-key" }, "Cl\u00E9 API"),
            React.createElement("input", { id: "ors-key", type: "password", autoComplete: "off", autoCapitalize: "off", autoCorrect: "off", spellCheck: "false", value: keyIn, onChange: (e) => { setKeyIn(e.target.value); setMsg(''); } }),
            msg && React.createElement("p", { className: "err", role: "alert" }, msg),
            React.createElement("div", { className: "actions" },
                React.createElement("button", { className: "btn", onClick: saveKey }, "Enregistrer la cl\u00E9"))));
    return (React.createElement("div", null,
        React.createElement("label", { className: "f" }, "Objectif"),
        React.createElement("div", { className: "seg", role: "tablist", "aria-label": "Objectif", style: { margin: '6px 0 10px' } }, [['km', 'Distance'], ['min', 'Durée']].map(([v, l]) => React.createElement("button", { key: v, role: "tab", "aria-selected": p.mode === v, className: p.mode === v ? 'on' : '', onClick: () => set('mode', v) }, l))),
        p.mode === 'km'
            ? React.createElement("div", null,
                React.createElement("label", { className: "f", htmlFor: "rb-km" }, "Distance (km)"),
                React.createElement("input", { id: "rb-km", className: "big", type: "number", inputMode: "decimal", min: "2", max: "60", step: "0.5", value: p.km, onChange: (e) => set('km', e.target.value) }))
            : React.createElement("div", { className: "grid2" },
                React.createElement("div", null,
                    React.createElement("label", { className: "f", htmlFor: "rb-min" }, "Dur\u00E9e (minutes)"),
                    React.createElement("input", { id: "rb-min", className: "big", type: "number", inputMode: "numeric", min: "10", value: p.min, onChange: (e) => set('min', e.target.value) })),
                React.createElement("div", null,
                    React.createElement("label", { className: "f", htmlFor: "rb-pace" }, "Allure (min/km)"),
                    React.createElement("input", { id: "rb-pace", className: "big", value: p.pace, onChange: (e) => set('pace', e.target.value), placeholder: "6:30" }))),
        p.mode === 'min' && valid && React.createElement("p", { className: "note", style: { marginTop: 6 } },
            "\u2248 ",
            (targetM / 1000).toFixed(1).replace('.', ','),
            " km \u00E0 ",
            Math.floor(paceSec / 60),
            "'",
            pad(paceSec % 60),
            "/km"),
        React.createElement("label", { className: "f" }, "D\u00E9nivel\u00E9"),
        React.createElement("div", { className: "seg three", role: "tablist", "aria-label": "D\u00E9nivel\u00E9", style: { margin: '6px 0 4px' } }, [['any', 'Peu importe'], ['flat', 'Plutôt plat'], ['hilly', 'Vallonné']].map(([v, l]) => React.createElement("button", { key: v, role: "tab", "aria-selected": p.elev === v, className: p.elev === v ? 'on' : '', onClick: () => set('elev', v) }, l))),
        React.createElement("label", { className: "checkrow" },
            React.createElement("input", { type: "checkbox", checked: p.quiet, onChange: (e) => set('quiet', e.target.checked) }),
            " Privil\u00E9gier parcs et rues calmes"),
        React.createElement("label", { className: "f" }, "D\u00E9part"),
        React.createElement("div", { className: "actions", style: { marginTop: 6 } },
            React.createElement("button", { className: "btn ghost", style: { height: 42, padding: '0 14px' }, onClick: useMyPosition }, "Ma position"),
            React.createElement("button", { className: 'btn ghost' + (picking ? ' on' : ''), style: { height: 42, padding: '0 14px' }, onClick: () => setPicking(v => !v) }, picking ? 'Touche la carte…' : 'Sur la carte')),
        React.createElement("div", { className: "rbsearch" },
            React.createElement("input", { type: "search", placeholder: "Adresse ou lieu (ex. Parc Montsouris)", "aria-label": "Rechercher un lieu de d\u00E9part", value: q, onChange: (e) => setQ(e.target.value), onKeyDown: (e) => { if (e.key === 'Enter')
                    search(); } }),
            React.createElement("button", { className: "btn ghost", style: { height: 46, padding: '0 16px' }, onClick: search }, "Chercher")),
        hits.map(h => React.createElement("button", { key: h.place_id, className: "hit", onClick: () => pickHit(h) }, h.display_name)),
        msg && React.createElement("p", { className: /impossible|indisponible|Aucun|Choisis|disponible/.test(msg) ? 'err' : 'note', role: "status", style: { marginTop: 8 } }, msg),
        React.createElement("p", { className: "note", style: { marginTop: 8 } }, start ? 'Départ : ' + label : 'Aucun départ choisi pour le moment.'),
        React.createElement(BuilderMap, { start: start, picking: picking, onPick: pickOnMap, routes: st.routes, sel: sel, onSel: setSel, fitKey: fitKey }),
        React.createElement("button", { className: "btn full", onClick: generate, disabled: st.status === 'loading' }, st.status === 'loading' ? 'Calcul des boucles… ' + st.done + '/' + st.total : 'Générer des itinéraires'),
        st.status === 'error' && React.createElement("p", { className: "err", role: "alert", style: { marginTop: 10 } }, st.note),
        st.status === 'done' && st.note && React.createElement("p", { className: "note", role: "status", style: { marginTop: 10 } }, st.note),
        st.routes.length > 0 && (React.createElement("div", { style: { marginTop: 16 } },
            st.routes.map((r, i) => (React.createElement("button", { key: i, className: 'rcand' + (i === sel ? ' on' : ''), onClick: () => setSel(i), "aria-pressed": i === sel, style: { '--c': CAND_COLORS[i % 3] } },
                React.createElement("span", { className: "rc-main" },
                    React.createElement("i", null),
                    React.createElement("b", null, kmTxt(r))),
                React.createElement("span", { className: "rc-sub" },
                    "D+ ",
                    Math.round(r.ascent),
                    " m \u00B7 ",
                    hillLabel(r),
                    " \u00B7 \u2248 ",
                    fmtMin(Math.round(r.dist / 1000 * paceSec / 60)))))),
            React.createElement("div", { className: "actions", style: { marginTop: 10 } },
                React.createElement("button", { className: "btn", onClick: () => downloadGpx(gpxName, toGpx(gpxName, chosen.coords)) }, "T\u00E9l\u00E9charger le GPX"),
                typeof navigator !== 'undefined' && navigator.share && React.createElement("button", { className: "btn ghost", onClick: share }, "Envoyer vers une app")),
            shareMsg && React.createElement("p", { className: "note", style: { marginTop: 8 } }, shareMsg),
            React.createElement("details", { className: "howto" },
                React.createElement("summary", null, "Envoyer sur ma montre Suunto"),
                React.createElement("p", null,
                    "1. T\u00E9l\u00E9charge le GPX (ou utilise \u00AB Envoyer vers une app \u00BB et choisis Suunto).",
                    React.createElement("br", null),
                    "2. Ouvre l'app Suunto, va dans la vue carte et touche le \u00AB + \u00BB.",
                    React.createElement("br", null),
                    "3. Importe le fichier GPX, enregistre l'itin\u00E9raire.",
                    React.createElement("br", null),
                    "4. Synchronise la montre : l'itin\u00E9raire appara\u00EEt dans la navigation.")))),
        React.createElement("p", { className: "note", style: { marginTop: 18 } },
            "Itin\u00E9raires calcul\u00E9s par OpenRouteService, donn\u00E9es \u00A9 contributeurs OpenStreetMap. Le d\u00E9nivel\u00E9 vient d'un mod\u00E8le d'altitude : il est indicatif. ",
            React.createElement("button", { className: "link", onClick: () => { lsSet(ORS_KEY, ''); setKey(''); } }, "Changer la cl\u00E9"))));
}
function MapPage({ icu, conn, todayStr, onSettings }) {
    const [mode, setMode] = useState('mine');
    return (React.createElement("div", null,
        React.createElement(Header, { title: "Carte", onSettings: onSettings }),
        React.createElement("div", { className: "seg", role: "tablist", "aria-label": "Carte", style: { marginTop: 14 } },
            React.createElement("button", { role: "tab", "aria-selected": mode === 'mine', className: mode === 'mine' ? 'on' : '', onClick: () => setMode('mine') }, "Mes parcours"),
            React.createElement("button", { role: "tab", "aria-selected": mode === 'new', className: mode === 'new' ? 'on' : '', onClick: () => setMode('new') }, "Cr\u00E9er un itin\u00E9raire")),
        mode === 'mine' ? React.createElement(MyRoutes, { icu: icu, conn: conn, todayStr: todayStr, onSettings: onSettings }) : React.createElement(RouteBuilder, null)));
}
const COACH_KEY = 'allure_coach_key_v1', COACH_STORE = 'allure_coach_v1';
const COACH_DEFAULTS = { model: 'gemini-2.5-flash', goal: '', inc: { sleep: true, hrv: true, steps: true, muscu: true }, messages: [] };
const loadCoach = () => {
    try {
        const c = JSON.parse(lsGet(COACH_STORE)) || {};
        return { ...COACH_DEFAULTS, ...c, inc: { ...COACH_DEFAULTS.inc, ...(c.inc || {}) }, messages: Array.isArray(c.messages) ? c.messages : [] };
    }
    catch (e) {
        return { ...COACH_DEFAULTS, inc: { ...COACH_DEFAULTS.inc }, messages: [] };
    }
};
const saveCoach = (c) => lsSet(COACH_STORE, JSON.stringify({ ...c, messages: c.messages.slice(-40) }));
const dFr = (d) => DAYS_ABBR[(d.getDay() + 6) % 7].toLowerCase() + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()];
const COACH_SYSTEM = `Tu es le coach d'entraînement intégré à l'application Allure (course à pied, vélo, natation, musculation). Tu parles à son utilisateur, en français, en le tutoyant.
Règles :
- Réponds de façon concrète et concise (150 mots maximum, sauf demande de détail). Tu peux utiliser **gras** et des listes avec « - ».
- Appuie-toi UNIQUEMENT sur les données fournies ci-dessous. Si une donnée manque, dis-le. N'invente jamais de chiffre, d'allure ou de date.
- Sois prudent sur la santé : pas de diagnostic ni de conseil médical. En cas de douleur, de malaise ou de symptôme inquiétant, recommande de consulter un professionnel de santé.
- Utilise les zones de fréquence cardiaque de l'utilisateur, pas des formules génériques.
- Tu peux proposer de modifier le programme dans le champ « actions » (3 maximum), uniquement si l'utilisateur le demande ou si c'est clairement justifié par ses données. Utilise exclusivement les références [A1], [A2]… du plan (séances à venir). Types : « adjust » (durMin = nouvelle durée totale en minutes ; paceDeltaSec = écart d'allure en secondes par km ou par 100 m, négatif = plus rapide), « move » (newDate au format AAAA-MM-JJ, à partir d'aujourd'hui), « delete ». Chaque action a un « why » d'une phrase. Sans proposition, laisse « actions » vide.
- L'utilisateur validera lui-même chaque action : décris-les aussi dans « reply ».
Réponds toujours en JSON : {"reply": "...", "actions": [...]}.`;
function buildCoachContext({ program, profile, workouts, icu, icuConn, steps, templates, matches, todayStr, coach }) {
    const today = parse(todayStr), base = startOfWeek(parse(profile.programStart));
    const L = [], refs = {};
    L.push('DONNÉES DE L\'UTILISATEUR (à la date du ' + longDate(today) + ')');
    L.push('ZONES DE FC : ' + (profile.zones || []).map((r, i) => 'Z' + (i + 1) + ' ' + r[0] + '-' + r[1]).join(' | ') + (profile.maxHR ? ' | FC max ' + profile.maxHR : ''));
    if (coach.goal && coach.goal.trim())
        L.push('OBJECTIF : ' + coach.goal.trim());
    L.push('', 'PLAN (semaine précédente, en cours et suivante) :');
    const wNow = Math.floor(diffDays(startOfWeek(today), base) / 7);
    let n = 0, any = false;
    for (let wi = wNow - 1; wi <= wNow + 1; wi++) {
        if (wi < 0 || wi >= program.length)
            continue;
        any = true;
        const ws = addDays(base, wi * 7);
        L.push('Semaine ' + (wi + 1) + ' (du ' + dFr(ws) + ' au ' + dFr(addDays(ws, 6)) + ')');
        [...program[wi].sessions].sort((a, b) => a.day - b.day).forEach(x => {
            const d = addDays(ws, x.day), iso = fmt(d), act = matches[x.id];
            const name = (x.templateId && (templates.find(t => t.id === x.templateId) || {}).name) || (DISC[x.discipline] || DISC.autre).short;
            let status;
            if (act)
                status = 'FAIT, activité réelle : ' + actSummary(act);
            else if (x.done)
                status = 'FAIT';
            else if (iso < todayStr)
                status = 'NON FAITE';
            else if (iso === todayStr)
                status = "AUJOURD'HUI, à faire";
            else
                status = 'à venir';
            let ref = '';
            if (!act && !x.done && iso >= todayStr) {
                n++;
                ref = '[A' + n + '] ';
                refs['A' + n] = { sid: x.id };
            }
            L.push('- ' + ref + dFr(d) + ' · ' + name + ' · ' + x.desc + (x.target ? ' · ' + x.target : '') + ' → ' + status);
        });
    }
    if (!any)
        L.push('(aucun plan sur cette période)');
    const from14 = fmt(addDays(today, -14)), done = [];
    if (icuConn)
        (icu.activities || []).filter(a => a.date >= from14 && a.date <= todayStr).forEach(a => done.push({ d: a.date + (a.time || ''), t: dFr(parse(a.date)) + ' · ' + (DISC[a.kind] || DISC.autre).short + ' · ' + actSummary(a) + ' (Intervals.icu)' }));
    workouts.filter(w => w.date >= from14 && w.date <= todayStr).forEach(w => done.push({ d: w.date + '99', t: dFr(parse(w.date)) + ' · ' + (DISC[w.discipline] || DISC.course).short + (w.title ? ' « ' + w.title + ' »' : '') + ' · ' + fmtMin(w.duration) + (w.distance ? ' · ' + w.distance + ' km' : '') + (w.avgHR ? ' · FC moy ' + w.avgHR : '') + (w.maxHR ? ' · FC max ' + w.maxHR : '') + (w.strain ? ' · strain Whoop ' + w.strain : '') + (w.rpe ? ' · effort ' + w.rpe + '/10' : '') }));
    L.push('', 'SÉANCES RÉALISÉES (14 derniers jours) :');
    if (done.length)
        done.sort((a, b) => a.d.localeCompare(b.d)).forEach(x => L.push('- ' + x.t));
    else
        L.push('(aucune)');
    const inc = coach.inc, byDate = {};
    (icu.wellness || []).forEach(x => { byDate[x.date] = x; });
    const sm = inc.steps ? stepsMap(icu, steps) : {}, wl = [];
    for (let i = 13; i >= 0; i--) {
        const d = addDays(today, -i), iso = fmt(d), x = byDate[iso] || {}, p = [];
        if (inc.sleep && x.sleep)
            p.push('sommeil ' + fmtMin(Math.round(x.sleep / 60)));
        if (inc.hrv && x.rhr)
            p.push('FC repos ' + Math.round(x.rhr) + ' bpm');
        if (inc.hrv && x.hrv)
            p.push('VFC ' + Math.round(x.hrv) + ' ms');
        if (inc.steps && sm[iso])
            p.push(nFr(sm[iso]) + ' pas');
        if (p.length)
            wl.push('- ' + dFr(d) + ' : ' + p.join(' · '));
    }
    if (inc.sleep || inc.hrv || inc.steps) {
        L.push('', 'BIEN-ÊTRE (14 derniers jours) :');
        if (wl.length)
            L.push(...wl);
        else
            L.push('(aucune donnée)');
    }
    if (inc.muscu) {
        const j = buildJournal(workouts).slice(0, 10);
        if (j.length) {
            L.push('', 'MUSCULATION (charges) :');
            j.forEach(ex => L.push('- ' + ex.name + ' : dernière ' + topStr(ex, ex.last) + ' (' + dFr(parse(ex.last.date)) + '), record ' + (ex.weighted ? fmtKg(ex.best) : ex.best + ' reps')));
        }
    }
    return { text: L.join('\n'), refs };
}
const COACH_SCHEMA = { type: 'OBJECT', properties: { reply: { type: 'STRING' }, actions: { type: 'ARRAY', items: { type: 'OBJECT', properties: { type: { type: 'STRING', enum: ['adjust', 'move', 'delete'] }, ref: { type: 'STRING' }, durMin: { type: 'INTEGER' }, paceDeltaSec: { type: 'INTEGER' }, newDate: { type: 'STRING' }, why: { type: 'STRING' } }, required: ['type', 'ref', 'why'] } } }, required: ['reply'] };
async function geminiCall(key, model, body) {
    let res;
    try {
        res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify(body) });
    }
    catch (e) {
        throw { code: 'net' };
    }
    let j = null;
    try {
        j = await res.json();
    }
    catch (e) { }
    if (!res.ok) {
        const msg = (j && j.error && j.error.message) || '', st = res.status;
        if (st === 429)
            throw { code: 'quota' };
        if (st === 401 || st === 403 || /API key not valid|API_KEY_INVALID/i.test(msg))
            throw { code: 'auth' };
        if (st === 404)
            throw { code: 'model' };
        if (st === 400)
            throw { code: 'bad', msg };
        if (st >= 500)
            throw { code: 'busy' };
        throw { code: 'http', status: st };
    }
    return j;
}
function parseCoachReply(text) {
    const t = String(text).trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim();
    try {
        const o = JSON.parse(t);
        if (o && typeof o.reply === 'string')
            return { reply: o.reply, actions: Array.isArray(o.actions) ? o.actions : [] };
    }
    catch (e) { }
    return { reply: String(text).trim(), actions: [] };
}
async function geminiChat({ key, model, system, history }) {
    const base = { systemInstruction: { parts: [{ text: system }] }, contents: history.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text }] })) };
    const gc = { temperature: 0.5, maxOutputTokens: 2048 };
    const variants = [{ ...gc, responseMimeType: 'application/json', responseSchema: COACH_SCHEMA, thinkingConfig: { thinkingBudget: 0 } }, { ...gc, responseMimeType: 'application/json', responseSchema: COACH_SCHEMA }, { ...gc, responseMimeType: 'application/json' }, gc];
    let j = null, last = null;
    for (const v of variants) {
        try {
            j = await geminiCall(key, model, { ...base, generationConfig: v });
            break;
        }
        catch (e) {
            last = e;
            if (!(e && e.code === 'bad'))
                throw e;
        }
    }
    if (!j)
        throw last;
    const cand = j.candidates && j.candidates[0];
    const text = cand && cand.content && cand.content.parts ? cand.content.parts.map(p => p.text || '').join('') : '';
    if (!text.trim())
        throw { code: j.promptFeedback && j.promptFeedback.blockReason ? 'blocked' : 'empty' };
    return parseCoachReply(text);
}
const coachError = (e) => {
    const c = e && e.code;
    return c === 'auth' ? 'Clé Gemini refusée. Vérifie-la dans les réglages du coach.'
        : c === 'quota' ? 'Quota gratuit atteint pour le moment (limite par minute ou par jour). Réessaie un peu plus tard.'
            : c === 'model' ? 'Modèle introuvable. Change de modèle dans les réglages du coach.'
                : c === 'net' ? 'Impossible de joindre Gemini. Vérifie ta connexion.'
                    : c === 'busy' ? 'Le service Gemini est surchargé. Réessaie dans un instant.'
                        : c === 'blocked' ? 'Gemini a refusé de répondre à cette demande. Reformule-la.'
                            : c === 'empty' ? 'Réponse vide. Réessaie.'
                                : 'Le coach n\'a pas pu répondre. Réessaie.';
};
function resolveActions(raw, refs, ctx) {
    const out = [];
    (Array.isArray(raw) ? raw : []).slice(0, 3).forEach(a => {
        const r = a && refs[a.ref];
        if (!r)
            return;
        let wIdx = -1, s = null;
        ctx.program.forEach((w, i) => w.sessions.forEach(x => { if (x.id === r.sid) {
            wIdx = i;
            s = x;
        } }));
        if (!s)
            return;
        const d = addDays(ctx.base, wIdx * 7 + s.day);
        const name = (s.templateId && (ctx.templates.find(t => t.id === s.templateId) || {}).name) || (DISC[s.discipline] || DISC.autre).short;
        const act = { id: uid(), type: a.type, sid: s.id, label: dFr(d) + ' · ' + name, why: String(a.why || '').slice(0, 220), status: 'pending' };
        if (a.type === 'adjust') {
            const parts = [], dm = Math.round(Number(a.durMin)), pd = Math.round(Number(a.paceDeltaSec)), cur = parseTargetMinutes(s.target);
            if (dm >= 5 && dm <= 300 && cur && dm !== cur) {
                act.durMin = dm;
                parts.push('Durée : ' + dur(cur) + ' → ' + dur(dm));
            }
            if (pd && Math.abs(pd) <= 60 && hasPace(s.desc)) {
                act.paceDelta = pd;
                parts.push('Allure : ' + (pd > 0 ? '+' : '−') + Math.abs(pd) + ' s');
            }
            if (!parts.length)
                return;
            act.summary = parts.join(' · ');
        }
        else if (a.type === 'move') {
            const nd = String(a.newDate || '');
            if (!/^\d{4}-\d{2}-\d{2}$/.test(nd) || nd < ctx.todayStr || nd > fmt(addDays(parse(ctx.todayStr), 60)))
                return;
            act.newDate = nd;
            act.summary = 'Déplacer au ' + longDate(parse(nd));
        }
        else if (a.type === 'delete') {
            act.summary = 'Supprimer cette séance';
        }
        else
            return;
        out.push(act);
    });
    return out;
}
const inlineFmt = (t) => String(t).split(/(\*\*[^*]+\*\*)/g).map((p, i) => /^\*\*[^*]+\*\*$/.test(p) ? React.createElement("b", { key: i }, p.slice(2, -2)) : p);
function CoachFmt({ text }) {
    return String(text).split(/\n{2,}/).map((b, i) => {
        const lines = b.split('\n');
        if (lines.every(l => /^\s*[-•*]\s+/.test(l)))
            return React.createElement("ul", { key: i }, lines.map((l, j) => React.createElement("li", { key: j }, inlineFmt(l.replace(/^\s*[-•*]\s+/, '')))));
        return React.createElement("p", { key: i }, lines.map((l, j) => React.createElement(React.Fragment, { key: j },
            j > 0 && React.createElement("br", null),
            inlineFmt(l))));
    });
}
function CoachSettings({ coach, setCoach, keyVal, onClearKey, onClear, onClose }) {
    const [models, setModels] = useState([]);
    const [msg, setMsg] = useState('');
    const set = (k, v) => setCoach(c => ({ ...c, [k]: v }));
    const tog = (k) => setCoach(c => ({ ...c, inc: { ...c.inc, [k]: !c.inc[k] } }));
    const test = async () => {
        setMsg('Test en cours…');
        try {
            const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=100', { headers: { 'x-goog-api-key': keyVal } });
            if ([400, 401, 403].includes(res.status)) {
                setMsg('Clé refusée par Google.');
                return;
            }
            if (!res.ok) {
                setMsg('Test impossible (erreur ' + res.status + ').');
                return;
            }
            const j = await res.json();
            const ms = (j.models || []).filter(m => (m.supportedGenerationMethods || []).includes('generateContent') && /flash/i.test(m.name)).map(m => m.name.replace(/^models\//, ''));
            setModels(ms);
            setMsg('Clé valide ✓ · ' + ms.length + ' modèles Flash disponibles.');
        }
        catch (e) {
            setMsg('Connexion impossible.');
        }
    };
    const rows = [['sleep', 'Sommeil'], ['hrv', 'VFC et FC au repos'], ['steps', 'Pas'], ['muscu', 'Charges de musculation']];
    return (React.createElement(Sheet, { title: "R\u00E9glages du coach", onClose: onClose },
        React.createElement("label", { className: "f", htmlFor: "co-goal" }, "Mon objectif (facultatif)"),
        React.createElement("input", { id: "co-goal", placeholder: "ex. 10 km en moins de 50 min", value: coach.goal, onChange: (e) => set('goal', e.target.value) }),
        React.createElement("label", { className: "f", htmlFor: "co-model" }, "Mod\u00E8le Gemini"),
        React.createElement("input", { id: "co-model", list: "co-models", autoCapitalize: "off", autoCorrect: "off", spellCheck: "false", value: coach.model, onChange: (e) => set('model', e.target.value.trim()) }),
        React.createElement("datalist", { id: "co-models" }, models.map(m => React.createElement("option", { key: m, value: m }))),
        React.createElement("div", { className: "actions", style: { marginTop: 10 } },
            React.createElement("button", { className: "btn ghost", style: { height: 42 }, onClick: test }, "Tester la cl\u00E9")),
        msg && React.createElement("p", { className: "note", role: "status", style: { marginTop: 8 } }, msg),
        React.createElement("h3", { className: "subh" }, "Donn\u00E9es envoy\u00E9es au coach"),
        React.createElement("p", { className: "note" }, "Le plan, tes s\u00E9ances et tes zones de FC sont toujours envoy\u00E9s. Tu peux exclure :"),
        rows.map(([k, l]) => React.createElement("label", { key: k, className: "checkrow" },
            React.createElement("input", { type: "checkbox", checked: !!coach.inc[k], onChange: () => tog(k) }),
            " ",
            l)),
        React.createElement("p", { className: "note", style: { marginTop: 12 } }, "Ni ta cl\u00E9, ni ton nom ne sont envoy\u00E9s. Avec une cl\u00E9 gratuite, les conditions de Google s'appliquent : v\u00E9rifie-les \u00E0 la cr\u00E9ation de ta cl\u00E9."),
        React.createElement("div", { className: "actions", style: { marginTop: 16 } },
            React.createElement("button", { className: "btn ghost", onClick: () => { if (confirm('Effacer toute la conversation ?')) {
                    onClear();
                    onClose();
                } } }, "Effacer la conversation"),
            React.createElement("button", { className: "btn ghost", onClick: () => { if (confirm('Supprimer la clé Gemini de ce téléphone ?')) {
                    onClearKey();
                    onClose();
                } } }, "Changer la cl\u00E9"))));
}
const COACH_SUGGESTIONS = ['Résume ma semaine', 'Comment est ma récupération ?', 'Ma charge de la semaine est-elle bien répartie ?', 'Que dois-je faire demain ?'];
function CoachPage({ program, profile, workouts, icu, icuConn, steps, templates, matches, todayStr, onApply, onSettings }) {
    const [coach, setCoach] = useState(loadCoach);
    const [key, setKey] = useState(() => lsGet(COACH_KEY) || '');
    const [keyIn, setKeyIn] = useState('');
    const [keyMsg, setKeyMsg] = useState('');
    const [input, setInput] = useState('');
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState('');
    const [cfg, setCfg] = useState(false);
    const endRef = useRef(null), ta = useRef(null);
    useEffect(() => { saveCoach(coach); }, [coach]);
    useEffect(() => { if (endRef.current && coach.messages.length)
        endRef.current.scrollIntoView({ block: 'end' }); }, [coach.messages.length, busy, err]);
    const saveKey = () => { const k = keyIn.trim(); if (k.length < 20) {
        setKeyMsg('Colle la clé complète (une longue suite de caractères).');
        return;
    } lsSet(COACH_KEY, k); setKey(k); setKeyIn(''); setKeyMsg(''); };
    const setAct = (mid, aid, patch) => setCoach(c => ({ ...c, messages: c.messages.map(m => m.id !== mid ? m : { ...m, actions: (m.actions || []).map(a => a.id !== aid ? a : { ...a, ...patch }) }) }));
    const apply = (m, a) => { const r = onApply(a); setAct(m.id, a.id, r.ok ? { status: 'done' } : { status: 'failed', error: r.msg }); };
    const send = async (text) => {
        const q = String(text || '').trim();
        if (!q || busy)
            return;
        const um = { id: uid(), role: 'user', text: q, ts: Date.now() };
        const hist = [...coach.messages, um].slice(-10);
        while (hist.length && hist[0].role !== 'user')
            hist.shift();
        setCoach(c => ({ ...c, messages: [...c.messages, um] }));
        setInput('');
        setBusy(true);
        setErr('');
        try {
            const { text: ctx, refs } = buildCoachContext({ program, profile, workouts, icu, icuConn, steps, templates, matches, todayStr, coach });
            const out = await geminiChat({ key, model: coach.model, system: COACH_SYSTEM + '\n\n' + ctx, history: hist });
            const actions = resolveActions(out.actions, refs, { program, base: startOfWeek(parse(profile.programStart)), templates, todayStr });
            setCoach(c => ({ ...c, messages: [...c.messages, { id: uid(), role: 'model', text: out.reply, actions, ts: Date.now() }] }));
        }
        catch (e) {
            setErr(coachError(e));
        }
        setBusy(false);
    };
    if (!key)
        return (React.createElement("div", null,
            React.createElement(Header, { title: "Coach", onSettings: onSettings }),
            React.createElement("div", { className: "card", style: { marginTop: 18 } },
                React.createElement("h3", null, "Connecter Gemini"),
                React.createElement("p", { className: "note" }, "Le coach utilise l'IA gratuite de Google (Gemini). Cr\u00E9e une cl\u00E9 sur Google AI Studio (bouton \u00AB Create API key \u00BB), puis colle-la ici. Elle reste sur ton t\u00E9l\u00E9phone."),
                React.createElement("p", { className: "note", style: { marginTop: 8 } },
                    React.createElement("a", { href: "https://aistudio.google.com/app/apikey", target: "_blank", rel: "noopener noreferrer" }, "Ouvrir Google AI Studio")),
                React.createElement("p", { className: "note", style: { marginTop: 8 } }, "Le coach re\u00E7oit ton plan, tes s\u00E9ances, tes zones de FC et, si tu le souhaites, ton sommeil, ta VFC et tes pas. Ses conseils ne remplacent pas un avis m\u00E9dical."),
                React.createElement("label", { className: "f", htmlFor: "gem-key" }, "Cl\u00E9 API Gemini"),
                React.createElement("input", { id: "gem-key", type: "password", autoComplete: "off", autoCapitalize: "off", autoCorrect: "off", spellCheck: "false", value: keyIn, onChange: (e) => { setKeyIn(e.target.value); setKeyMsg(''); } }),
                keyMsg && React.createElement("p", { className: "err", role: "alert" }, keyMsg),
                React.createElement("div", { className: "actions" },
                    React.createElement("button", { className: "btn", onClick: saveKey }, "Enregistrer la cl\u00E9")))));
    return (React.createElement("div", null,
        React.createElement(Header, { title: "Coach", sub: "Pose tes questions sur ton entra\u00EEnement", onSettings: onSettings }),
        React.createElement("div", { className: "coachtools" },
            React.createElement("button", { onClick: () => setCfg(true) }, "R\u00E9glages du coach")),
        React.createElement("div", { className: "chat", "aria-live": "polite" },
            coach.messages.length === 0 && (React.createElement("div", null,
                React.createElement("p", { className: "coachintro" }, "Je connais ton plan, tes derni\u00E8res s\u00E9ances et tes zones de FC. Pose-moi une question, ou essaie :"),
                React.createElement("div", { className: "coachsug" }, COACH_SUGGESTIONS.map(s => React.createElement("button", { key: s, onClick: () => send(s) }, s))),
                React.createElement("p", { className: "coachintro", style: { marginTop: 14, fontSize: 13.5 } }, "Les conseils du coach ne remplacent pas un avis m\u00E9dical."))),
            coach.messages.map(m => (React.createElement(React.Fragment, { key: m.id },
                React.createElement("div", { className: 'msg ' + (m.role === 'user' ? 'user' : 'model') }, m.role === 'user' ? m.text : React.createElement(CoachFmt, { text: m.text })),
                (m.actions || []).map(a => (React.createElement("div", { key: a.id, className: 'proposal' + (a.status !== 'pending' ? ' done' : '') },
                    React.createElement("b", null, a.label),
                    React.createElement("p", { className: "sum" }, a.summary),
                    a.why && React.createElement("p", { className: "why" }, a.why),
                    a.status === 'pending' && React.createElement("div", { className: "btns" },
                        React.createElement("button", { className: "ok", onClick: () => apply(m, a) }, "Appliquer"),
                        React.createElement("button", { className: "no", onClick: () => setAct(m.id, a.id, { status: 'ignored' }) }, "Ignorer")),
                    a.status === 'done' && React.createElement("p", { className: "why" }, "Appliqu\u00E9 \u2713"),
                    a.status === 'ignored' && React.createElement("p", { className: "why" }, "Ignor\u00E9"),
                    a.status === 'failed' && React.createElement("p", { className: "why" },
                        "Impossible : ",
                        a.error))))))),
            busy && React.createElement("div", { className: "msg model typing" }, "Le coach r\u00E9fl\u00E9chit\u2026"),
            err && React.createElement("p", { className: "err", role: "alert" }, err),
            React.createElement("div", { ref: endRef })),
        React.createElement("div", { className: "composer" },
            React.createElement("div", { className: "in" },
                React.createElement("textarea", { ref: ta, rows: 1, placeholder: "Ta question\u2026", "aria-label": "Ta question pour le coach", value: input, onChange: (e) => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(120, e.target.scrollHeight) + 'px'; }, onKeyDown: (e) => { if (e.key === 'Enter' && !e.shiftKey && !('ontouchstart' in window)) {
                        e.preventDefault();
                        send(input);
                    } } }),
                React.createElement("button", { className: "send", "aria-label": "Envoyer", disabled: busy || !input.trim(), onClick: () => { send(input); if (ta.current)
                        ta.current.style.height = 'auto'; } },
                    React.createElement(Icon, { name: "send", size: 20, sw: 2.2 })))),
        cfg && React.createElement(CoachSettings, { coach: coach, setCoach: setCoach, keyVal: key, onClearKey: () => { lsSet(COACH_KEY, ''); setKey(''); }, onClear: () => setCoach(c => ({ ...c, messages: [] })), onClose: () => setCfg(false) })));
}
function Dash({ icu, todayStr }) {
    const D = useMemo(() => buildDash(icu, todayStr), [icu, todayStr]);
    const [detail, setDetail] = useState(null);
    const maxSport = Math.max(1, ...D.sports.map(x => x.secs));
    const dayLabel = (x) => x && x.date === todayStr ? "Aujourd'hui" : (x ? shortDate(parse(x.date)) : '');
    const sleepMax = Math.max(8 * 3600, ...D.sleep.s.filter(Boolean));
    return (React.createElement("div", { className: "dash" },
        React.createElement("h2", { className: "dash-title" }, "Tableau de bord"),
        React.createElement("div", { className: "wgrid" },
            React.createElement(Card, { title: "Dur\u00E9e", sub: "Ce mois-ci", onClick: () => setDetail('month') },
                React.createElement("p", { className: "num" }, fmtHM(D.monthTotal)),
                D.hasPrev && React.createElement("p", { className: "delta" },
                    signedMin(D.deltaDur),
                    " vs ",
                    D.prevName),
                React.createElement(LineChart, { a: D.cumThis, b: D.hasPrev ? D.cumPrev : [] }),
                React.createElement("div", { className: "axis" },
                    React.createElement("span", null, D.d1),
                    React.createElement("span", null, D.dd))),
            React.createElement(Card, { title: D.monthName.charAt(0).toUpperCase() + D.monthName.slice(1), sub: "Jours d'activit\u00E9", onClick: () => setDetail('cal') },
                React.createElement("div", { className: "cal", role: "img", "aria-label": "Calendrier des activit\u00E9s du mois" },
                    DAYS_LETTER.map((l, i) => React.createElement("span", { key: 'h' + i }, l)),
                    Array.from({ length: D.lead }).map((_, i) => React.createElement("b", { key: 'e' + i })),
                    D.calendar.map((k, i) => {
                        const dn = i + 1;
                        const cls = dn > D.today ? 'future' : (k ? 'on' : 'none');
                        return React.createElement("b", { key: dn },
                            React.createElement("i", { className: cls + (dn === D.today ? ' today' : ''), style: k ? { '--c': (DISC[k] || DISC.autre).color } : undefined }));
                    }))),
            D.sports.length > 0 && (React.createElement(Card, { title: "Activit\u00E9", sub: "Ce mois-ci", wide: true, onClick: () => setDetail('sports') },
                React.createElement("div", { className: "sports" }, D.sports.map(x => (React.createElement("div", { className: "sp", key: x.kind, style: { '--c': (DISC[x.kind] || DISC.autre).color } },
                    React.createElement("div", { className: "sp-row" },
                        React.createElement("span", { className: "sp-name" },
                            React.createElement("i", null),
                            (DISC[x.kind] || DISC.autre).short),
                        React.createElement("span", { className: "sp-time" }, fmtMin(Math.round(x.secs / 60))),
                        React.createElement("span", { className: "sp-dist" }, x.meters ? (x.kind === 'nage' ? Math.round(x.meters) + ' m' : fmtKm(x.meters) + ' km') : '')),
                    React.createElement("div", { className: "sp-bar" },
                        React.createElement("i", { style: { width: Math.max(3, (x.secs / maxSport) * 100) + '%' } })))))))),
            React.createElement(Card, { title: "Dur\u00E9e", sub: "7 derniers jours", onClick: () => setDetail('week') },
                React.createElement("p", { className: "num" }, fmtHM(D.last7Total)),
                React.createElement("p", { className: "delta" },
                    signedMin(D.last7Total - D.prev7Total),
                    " vs semaine pr\u00E9c."),
                React.createElement(StackBars, { days: D.last7 })),
            D.sleep.last && (React.createElement(Card, { title: "Sommeil", sub: dayLabel(D.sleep.last), onClick: () => setDetail('sleep') },
                React.createElement("p", { className: "num" }, fmtHM(D.sleep.last.sleep)),
                React.createElement(Spark, { values: D.sleep.s, bars: true, min0: sleepMax }))),
            D.rhr.last && (React.createElement(Card, { title: "FC au repos", sub: dayLabel(D.rhr.last), onClick: () => setDetail('rhr') },
                React.createElement("p", { className: "num" },
                    Math.round(D.rhr.last.rhr),
                    React.createElement("span", { className: "u" }, "bpm")),
                React.createElement(Spark, { values: D.rhr.s }))),
            D.hrv.last && (React.createElement(Card, { title: "VFC", sub: dayLabel(D.hrv.last), onClick: () => setDetail('hrv') },
                React.createElement("p", { className: "num" },
                    Math.round(D.hrv.last.hrv),
                    React.createElement("span", { className: "u" }, "ms")),
                React.createElement(Spark, { values: D.hrv.s })))),
        detail && React.createElement(HistorySheet, { kind: detail, icu: icu, todayStr: todayStr, onClose: () => setDetail(null) })));
}
function IcuSettings({ conn, icu, onConnect, onDisconnect, onRefresh }) {
    const [key, setKey] = useState('');
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState('');
    const connect = async () => {
        setBusy(true);
        setMsg('');
        const r = await onConnect(key);
        setBusy(false);
        if (r.ok)
            setKey('');
        else
            setMsg(r.code === 'auth' ? "Clé refusée par Intervals.icu. Vérifie qu'elle est complète." : r.code === 'empty' ? 'Colle ta clé API.' : "Impossible de joindre Intervals.icu. Vérifie ta connexion.");
    };
    return (React.createElement("div", { className: "card" },
        React.createElement("h3", null, "Intervals.icu"),
        window.ALLURE_DEMO && React.createElement("p", { className: "note" }, "Aper\u00E7u : les donn\u00E9es affich\u00E9es sont fictives, la vraie connexion ne fonctionne que dans l'application install\u00E9e."),
        conn ? (React.createElement("div", null,
            React.createElement("p", { className: "note" },
                "Connect\u00E9",
                icu.fetchedAt ? ' · dernière mise à jour à ' + hhmm(icu.fetchedAt) : '',
                "."),
            React.createElement("div", { className: "actions" },
                React.createElement("button", { className: "btn ghost", onClick: onRefresh }, "Actualiser"),
                React.createElement("button", { className: "btn warn", onClick: () => { if (confirm('Déconnecter Intervals.icu et oublier la clé sur cet appareil ?'))
                        onDisconnect(); } }, "D\u00E9connecter")))) : (React.createElement("div", null,
            React.createElement("p", { className: "note" }, "Sur Intervals.icu, ouvre la page Settings et copie la cl\u00E9 API tout en bas (Developer Settings). Elle reste sur cet appareil."),
            React.createElement("label", { className: "f", htmlFor: "icu-key" }, "Cl\u00E9 API"),
            React.createElement("input", { id: "icu-key", type: "password", autoComplete: "off", autoCapitalize: "off", autoCorrect: "off", spellCheck: "false", value: key, onChange: (e) => { setKey(e.target.value); setMsg(''); } }),
            msg && React.createElement("p", { className: "err", role: "alert" }, msg),
            React.createElement("div", { className: "actions" },
                React.createElement("button", { className: "btn", disabled: busy, onClick: connect }, busy ? 'Connexion…' : 'Connecter'))))));
}
function matchActivities(program, programStart, acts) {
    const out = {};
    if (!acts || !acts.length || !program.length)
        return out;
    const base = startOfWeek(parse(programStart)), planned = {}, byDay = {};
    program.forEach((w, i) => w.sessions.forEach(x => { if (x.done)
        return; const d = fmt(addDays(base, i * 7 + x.day)); (planned[d] = planned[d] || []).push(x); }));
    acts.forEach(a => { if (planned[a.date] && a.secs >= 600)
        (byDay[a.date] = byDay[a.date] || []).push(a); });
    Object.keys(byDay).forEach(d => {
        const list = byDay[d].slice().sort((u, v) => (u.time || '').localeCompare(v.time || '')), used = new Set();
        planned[d].forEach(x => { const a = list.find(y => !used.has(y.id) && y.kind === x.discipline); if (a) {
            used.add(a.id);
            out[x.id] = a;
        } });
    });
    return out;
}
function actSummary(a) {
    let t = fmtMin(Math.round(a.secs / 60));
    if (a.kind === 'nage' && a.meters)
        t += ' · ' + Math.round(a.meters) + ' m';
    else if (a.meters) {
        t += ' · ' + fmtKm(a.meters) + ' km';
        if (a.kind === 'course')
            t += ' · ' + paceStr(a.secs, a.meters, 1000) + '/km';
        else if (a.kind === 'velo')
            t += ' · ' + (a.meters / a.secs * 3.6).toFixed(1).replace('.', ',') + ' km/h';
    }
    return t;
}
function Today({ workouts, program, profile, todayStr, sel, setSel, templates, onOpenMuscu, icuConn, icu, onRefreshIcu, onToggle, onSettings, steps, onSaveSteps, onEdit, onEditWorkout, matches }) {
    const today = parse(todayStr);
    const [off, setOff] = useState(0);
    const touch = useRef(null);
    const [openAct, setOpenAct] = useState(null);
    const [stepsOpen, setStepsOpen] = useState(false);
    const stepsData = useMemo(() => stepsMap(icu, steps), [icu, steps]);
    const stepsToday = stepsData[todayStr] || 0;
    const stepsWeek = Array.from({ length: 7 }, (_, i) => stepsData[fmt(addDays(parse(todayStr), -(6 - i)))] || null);
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
    const done = week ? week.sessions.filter(s => s.done || matches[s.id]).length : 0;
    const cur = days.find(d => d.iso === sel) || days.find(d => d.iso === todayStr) || days[0];
    const isToday = cur.iso === todayStr;
    const matchedIds = new Set(Object.keys(matches).map(k => matches[k].id));
    const icuDay = icuConn ? icu.activities.filter(a => a.date === cur.iso && !matchedIds.has(a.id)) : [];
    const goWeek = (delta) => {
        const n = Math.max(-52, Math.min(52, off + delta));
        if (n === off)
            return;
        setOff(n);
        setSel(n === 0 ? todayStr : fmt(addDays(addDays(startOfWeek(today), n * 7), cur.i)));
    };
    const backToToday = () => { setOff(0); setSel(todayStr); };
    const onTouchStart = (e) => { const t = e.touches[0]; touch.current = { x: t.clientX, y: t.clientY }; };
    const onTouchEnd = (e) => {
        const s0 = touch.current;
        touch.current = null;
        if (!s0)
            return;
        const t = e.changedTouches[0], dx = t.clientX - s0.x, dy = t.clientY - s0.y;
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5)
            goWeek(dx < 0 ? 1 : -1);
    };
    let sub = longDate(today);
    return (React.createElement("div", null,
        React.createElement(Header, { title: "Aujourd'hui", sub: sub, onSettings: onSettings }),
        React.createElement(IcuBlock, { conn: icuConn, icu: icu, onRefresh: onRefreshIcu, onConnect: onSettings, weekFrom: fmt(weekStart), weekTo: fmt(addDays(weekStart, 6)) }),
        React.createElement("div", { className: "swipe", onTouchStart: onTouchStart, onTouchEnd: onTouchEnd },
            React.createElement("div", { className: "weekbar" },
                React.createElement("div", null,
                    React.createElement("b", null, week ? 'Semaine ' + (wIdx + 1) : 'Hors programme'),
                    React.createElement("span", null,
                        shortDate(weekStart),
                        " \u2013 ",
                        shortDate(addDays(weekStart, 6)),
                        week ? ' · ' + done + ' sur ' + total + ' faites' : '')),
                React.createElement("div", { className: "wnav" },
                    off !== 0 && React.createElement("button", { className: "wtoday", onClick: backToToday }, "Aujourd'hui"),
                    React.createElement("button", { "aria-label": "Semaine pr\u00E9c\u00E9dente", onClick: () => goWeek(-1) },
                        React.createElement(Icon, { name: "back", size: 20 })),
                    React.createElement("button", { "aria-label": "Semaine suivante", onClick: () => goWeek(1) },
                        React.createElement(Icon, { name: "next", size: 20 })))),
            React.createElement("div", { className: "strip" }, days.map(d => (React.createElement("button", { key: d.iso, className: "day" + (d.iso === cur.iso ? " sel" : "") + (d.iso === todayStr ? " today" : ""), "aria-pressed": d.iso === cur.iso, "aria-label": longDate(d.date), onClick: () => setSel(d.iso) },
                React.createElement("span", { className: "l" }, DAYS_LETTER[d.i]),
                React.createElement("span", { className: "n" }, d.date.getDate()),
                React.createElement("span", { className: "dots" },
                    d.planned.map(s => React.createElement("i", { key: s.id, className: "dot" + (s.done || matches[s.id] ? " on" : ""), style: { '--c': DISC[s.discipline].color } })),
                    d.free.map(w => React.createElement("i", { key: w.id, className: "dot on", style: { '--c': (DISC[w.discipline] || DISC.course).color } }))))))),
            !isToday && React.createElement("h2", { className: "daytitle" }, longDate(cur.date)),
            React.createElement("ul", null,
                cur.planned.map(s => matches[s.id] ? (React.createElement("li", { key: s.id, className: "item done act", style: { '--c': DISC[s.discipline].color }, role: "button", tabIndex: 0, "aria-label": 'Séance réalisée : ' + (matches[s.id].name || DISC[s.discipline].short), onClick: () => setOpenAct(matches[s.id]), onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setOpenAct(matches[s.id]);
                    } } },
                    React.createElement("div", { className: "item-text", style: { opacity: 1 } },
                        React.createElement("h3", null, matches[s.id].name || DISC[s.discipline].short),
                        React.createElement("p", { className: "desc" }, actSummary(matches[s.id])),
                        React.createElement("p", { className: "tag" },
                            "Pr\u00E9vu : ",
                            s.desc,
                            s.target ? ' · ' + s.target : ''),
                        React.createElement("p", { className: "tag" },
                            matches[s.id].time ? matches[s.id].time + ' · ' : '',
                            "Valid\u00E9e automatiquement \u00B7 Intervals.icu")),
                    React.createElement("div", { className: "check" },
                        React.createElement("span", { className: "c" },
                            React.createElement(Icon, { name: "check", size: 18, sw: 2.6 }))))) : (React.createElement("li", { key: s.id, className: "item" + (s.done ? " done" : ""), style: { '--c': DISC[s.discipline].color } },
                    React.createElement("div", { className: "item-text" },
                        React.createElement("h3", null, (s.templateId && (templates.find(t => t.id === s.templateId) || {}).name) || DISC[s.discipline].short),
                        React.createElement("p", { className: "desc" }, s.desc),
                        s.target && React.createElement("p", { className: "tgt" }, s.target),
                        resultOf(workouts, s.id) && (resultOf(workouts, s.id).duration || resultOf(workouts, s.id).avgHR || resultOf(workouts, s.id).maxHR) ? React.createElement("p", { className: "tag realised" },
                            "R\u00E9alis\u00E9e : ",
                            resultSummary(resultOf(workouts, s.id))) : null,
                        React.createElement("button", { className: "openlink", onClick: () => onEdit(wIdx, s.id) }, "Modifier la s\u00E9ance")),
                    React.createElement("button", { className: "check", "aria-label": s.done ? 'Marquer comme non faite' : 'Marquer comme faite', "aria-pressed": s.done, onClick: () => onToggle(wIdx, s.id) },
                        React.createElement("span", { className: "c" },
                            React.createElement(Icon, { name: "check", size: 18, sw: 2.6 })))))),
                cur.free.map(w => {
                    const dsc = DISC[w.discipline] || DISC.course;
                    return (React.createElement("li", { key: w.id, className: "item done", style: { '--c': dsc.color } },
                        React.createElement("div", { className: "item-text", style: { opacity: 1 } },
                            React.createElement("h3", null, w.title || dsc.short),
                            React.createElement("p", { className: "desc" },
                                resultSummary(w),
                                w.distance ? ' · ' + w.distance + ' km' : ''),
                            React.createElement("p", { className: "tag" }, "Hors plan"),
                            React.createElement("button", { className: "openlink", onClick: () => onEditWorkout(w.id) }, "Modifier la s\u00E9ance")),
                        React.createElement("div", { className: "check" },
                            React.createElement("span", { className: "c" },
                                React.createElement(Icon, { name: "check", size: 18, sw: 2.6 })))));
                }),
                icuDay.map(a => {
                    const dsc = DISC[a.kind] || DISC.autre;
                    return (React.createElement("li", { key: a.id, className: "item act", style: { '--c': dsc.color }, role: "button", tabIndex: 0, "aria-label": 'Détails : ' + (a.name || dsc.short), onClick: () => setOpenAct(a), onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setOpenAct(a);
                        } } },
                        React.createElement("div", { className: "item-text" },
                            React.createElement("h3", null, a.name || dsc.short),
                            React.createElement("p", { className: "desc" },
                                fmtMin(Math.round(a.secs / 60)),
                                a.meters ? ' · ' + fmtKm(a.meters) + ' km' : ''),
                            React.createElement("p", { className: "tag" },
                                a.time ? a.time + ' · ' : '',
                                "Intervals.icu")),
                        React.createElement("span", { className: "acthint" },
                            React.createElement(Icon, { name: "chevron" }))));
                })),
            cur.planned.length === 0 && cur.free.length === 0 && icuDay.length === 0 && (React.createElement("p", { className: "rest" }, week ? 'Repos.' : 'Rien de prévu.'))),
        icuConn && icu.fetchedAt && React.createElement(Dash, { icu: icu, todayStr: todayStr }),
        React.createElement("div", { className: "wgrid", style: { marginTop: icuConn && icu.fetchedAt ? 12 : 26 } },
            React.createElement(Card, { title: "Pas", sub: stepsToday ? "Aujourd'hui" : "Touche pour saisir tes pas", wide: true, onClick: () => setStepsOpen(true) },
                React.createElement("p", { className: "num" }, stepsToday ? nFr(stepsToday) : '–'),
                React.createElement(Spark, { values: stepsWeek, bars: true, min0: 10000 }))),
        stepsOpen && React.createElement(StepsSheet, { data: stepsData, manual: steps, todayStr: todayStr, onSave: onSaveSteps, onClose: () => setStepsOpen(false) }),
        openAct && icuConn && React.createElement(ActivityModal, { act: openAct, conn: icuConn, onClose: () => setOpenAct(null) })));
}
function chipLabel(s, templates) {
    if (s.discipline === 'muscu') {
        const t = s.templateId && templates.find(x => x.id === s.templateId);
        if (t)
            return t.name.replace(/ force$/i, '').replace(/^Rappel haut du corps/i, 'Haut');
    }
    return s.discipline === 'nage' ? 'Nage' : s.discipline === 'muscu' ? 'Muscu.' : DISC[s.discipline].short;
}
function Calendar({ program, profile, todayStr, templates, matches, workouts, onToggle, onEdit, onAdd, onMove, onOpenMuscu, onSettings }) {
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
    useEffect(() => {
        const cellAt = (x, y) => { const el = document.elementFromPoint(x, y), c = el && el.closest ? el.closest('[data-iso]') : null; return c ? c.getAttribute('data-iso') : null; };
        const stop = () => { clearTimeout(timer.current); drag.current = null; setGhost(null); setOver(null); };
        const activate = (st) => { st.active = true; setGhost({ x: st.x, y: st.y, label: st.label, color: st.color }); setOver(st.from); try {
            navigator.vibrate && navigator.vibrate(12);
        }
        catch (e) { } };
        const move = (e) => {
            const st = drag.current;
            if (!st || e.pointerId !== st.pid)
                return;
            st.x = e.clientX;
            st.y = e.clientY;
            if (!st.active) {
                if (Math.hypot(e.clientX - st.sx, e.clientY - st.sy) > 8) {
                    if (st.mouse) {
                        clearTimeout(timer.current);
                        activate(st);
                    }
                    else {
                        clearTimeout(timer.current);
                        drag.current = null;
                    }
                }
                return;
            }
            setGhost(g => g && { ...g, x: e.clientX, y: e.clientY });
            setOver(cellAt(e.clientX, e.clientY));
        };
        const up = (e) => {
            const st = drag.current;
            if (!st || e.pointerId !== st.pid)
                return;
            const was = st.active, iso = was ? cellAt(e.clientX, e.clientY) : null;
            stop();
            if (was && iso && iso !== st.from)
                latest.current.onMove(st.w, st.sid, iso);
        };
        const blockScroll = (e) => { if (drag.current && drag.current.active && e.cancelable)
            e.preventDefault(); };
        document.addEventListener('pointermove', move);
        document.addEventListener('pointerup', up);
        document.addEventListener('pointercancel', stop);
        document.addEventListener('touchmove', blockScroll, { passive: false });
        return () => {
            document.removeEventListener('pointermove', move);
            document.removeEventListener('pointerup', up);
            document.removeEventListener('pointercancel', stop);
            document.removeEventListener('touchmove', blockScroll);
            clearTimeout(timer.current);
        };
    }, []);
    const onChipDown = (e, w, x, iso) => {
        if (e.pointerType === 'mouse' && e.button !== 0)
            return;
        const st = { pid: e.pointerId, sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY, w, sid: x.id, from: iso, mouse: e.pointerType === 'mouse', active: false,
            label: chipLabel(x, templates), color: DISC[x.discipline].color };
        drag.current = st;
        clearTimeout(timer.current);
        if (!st.mouse)
            timer.current = setTimeout(() => { if (drag.current === st) {
                const act = st;
                act.active = true;
                setGhost({ x: act.x, y: act.y, label: act.label, color: act.color });
                setOver(act.from);
                try {
                    navigator.vibrate && navigator.vibrate(12);
                }
                catch (er) { }
            } }, 350);
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
    return (React.createElement("div", null,
        React.createElement(Header, { title: "Calendrier", sub: "Maintiens une s\u00E9ance pour la d\u00E9placer", onSettings: onSettings }),
        React.createElement("div", { className: "cal-nav" },
            React.createElement("b", null, monthTitle),
            React.createElement("div", { className: "wnav" },
                !onCurrentMonth && React.createElement("button", { className: "wtoday", onClick: goToday }, "Aujourd'hui"),
                React.createElement("button", { "aria-label": "Mois pr\u00E9c\u00E9dent", onClick: () => shiftMonth(-1) },
                    React.createElement(Icon, { name: "back", size: 20 })),
                React.createElement("button", { "aria-label": "Mois suivant", onClick: () => shiftMonth(1) },
                    React.createElement(Icon, { name: "next", size: 20 })))),
        React.createElement("div", { className: "cal-head" }, DAYS_LETTER.map((l, i) => React.createElement("span", { key: i }, l))),
        React.createElement("div", { className: "cal-grid" }, cells.map(d => {
            const iso = fmt(d), list = byDate[iso] || [];
            return (React.createElement("div", { key: iso, "data-iso": iso, "aria-label": longDate(d), className: "cal-cell" + (d.getMonth() === month.getMonth() ? '' : ' out') + (iso === todayStr ? ' today' : '') + (iso === selDay ? ' sel' : '') + (over === iso ? ' over' : ''), onClick: () => setSelDay(iso) },
                React.createElement("span", { className: "cn" }, d.getDate()),
                list.slice(0, 3).map(({ s: x, w }) => (React.createElement("div", { key: x.id, className: "cchip" + (x.done || matches[x.id] ? ' done' : '') + (ghost && drag.current && drag.current.sid === x.id ? ' lift' : ''), style: { '--c': DISC[x.discipline].color }, onPointerDown: (e) => onChipDown(e, w, x, iso), onContextMenu: (e) => e.preventDefault() }, chipLabel(x, templates)))),
                list.length > 3 && React.createElement("span", { className: "more" },
                    "+",
                    list.length - 3)));
        })),
        React.createElement("h2", { className: "daytitle", style: { marginTop: 22 } }, longDate(parse(selDay))),
        dayList.length === 0 && React.createElement("p", { className: "rest", style: { marginBottom: 10 } }, "Rien de pr\u00E9vu."),
        dayList.map(({ s: x, w }) => (React.createElement("div", { key: x.id, className: "srow" + (x.done || matches[x.id] ? ' done' : ''), style: { '--c': DISC[x.discipline].color } },
            React.createElement("div", { className: "m" },
                React.createElement("button", { className: "t", onClick: () => onEdit(w, x.id), "aria-label": 'Modifier : ' + x.desc },
                    React.createElement("b", null, chipLabel(x, templates)),
                    React.createElement("span", null, x.desc),
                    x.target && React.createElement("em", null, x.target),
                    matches[x.id] && React.createElement("em", { className: "realised" },
                        "R\u00E9alis\u00E9e : ",
                        actSummary(matches[x.id])),
                    !matches[x.id] && resultOf(workouts, x.id) && (resultOf(workouts, x.id).avgHR || resultOf(workouts, x.id).maxHR) ? React.createElement("em", { className: "realised" },
                        "R\u00E9alis\u00E9e : ",
                        resultSummary(resultOf(workouts, x.id))) : null)),
            React.createElement("button", { className: "mini", "aria-label": matches[x.id] ? 'Validée automatiquement par Intervals.icu' : x.done ? 'Marquer comme non faite' : 'Marquer comme faite', "aria-pressed": !!(x.done || matches[x.id]), disabled: !!matches[x.id], onClick: () => onToggle(w, x.id) },
                React.createElement("span", { className: "c" },
                    React.createElement(Icon, { name: "check", size: 15, sw: 3 })))))),
        React.createElement("div", { className: "fabwrap" },
            React.createElement("div", { className: "fabin" },
                React.createElement("button", { className: "fab", onClick: () => onAdd(selDay) },
                    React.createElement(Icon, { name: "plus", size: 20, sw: 2.4 }),
                    " S\u00E9ance"))),
        ghost && React.createElement("div", { className: "cghost", style: { left: ghost.x, top: ghost.y, '--c': ghost.color } }, ghost.label)));
}
function History({ workouts, onDelete, onSettings, onBack }) {
    const [open, setOpen] = useState(null);
    const sorted = useMemo(() => [...workouts].sort((a, b) => b.date.localeCompare(a.date)), [workouts]);
    const groups = [];
    sorted.forEach(w => {
        const key = w.date.slice(0, 7);
        let g = groups[groups.length - 1];
        if (!g || g.key !== key) {
            g = { key, items: [] };
            groups.push(g);
        }
        g.items.push(w);
    });
    return (React.createElement("div", null,
        React.createElement("button", { className: "back", onClick: onBack },
            React.createElement(Icon, { name: "back", size: 20 }),
            " Retour"),
        React.createElement(Header, { title: "Historique", sub: workouts.length ? workouts.length + (workouts.length > 1 ? ' séances' : ' séance') : null, onSettings: onSettings }),
        workouts.length === 0 && React.createElement("p", { className: "empty" }, "Aucune s\u00E9ance pour le moment. Coche une s\u00E9ance du plan ou ajoute-en une avec le bouton +."),
        groups.map(g => {
            const [y, m] = g.key.split('-').map(Number);
            return (React.createElement("div", { key: g.key },
                React.createElement("p", { className: "month" },
                    MONTHS_LONG[m - 1],
                    " ",
                    y),
                g.items.map(w => {
                    const dsc = DISC[w.discipline] || DISC.course;
                    const isOpen = open === w.id;
                    const hasMore = w.avgHR || w.maxHR || w.strain || w.rpe || w.notes || (w.exercises && w.exercises.length);
                    return (React.createElement("div", { className: "hrow", key: w.id, style: { '--c': dsc.color } },
                        React.createElement("button", { className: "hmain", "aria-expanded": isOpen, onClick: () => setOpen(isOpen ? null : w.id) },
                            React.createElement("span", { className: "hdate" }, shortDate(parse(w.date))),
                            React.createElement("span", { className: "hwhat" },
                                React.createElement("b", null, w.title || dsc.short),
                                React.createElement("span", null,
                                    fmtMin(w.duration),
                                    w.distance ? ' · ' + w.distance + ' km' : ''))),
                        isOpen && (React.createElement("div", { className: "hmore" },
                            w.avgHR ? React.createElement("p", null,
                                React.createElement("b", null, w.avgHR),
                                " bpm en moyenne",
                                w.maxHR ? React.createElement("span", null,
                                    ", ",
                                    React.createElement("b", null, w.maxHR),
                                    " bpm au maximum") : null) : (w.maxHR ? React.createElement("p", null,
                                React.createElement("b", null, w.maxHR),
                                " bpm au maximum") : null),
                            w.strain ? React.createElement("p", null,
                                "Strain Whoop ",
                                React.createElement("b", null, String(w.strain).replace('.', ','))) : null,
                            w.rpe ? React.createElement("p", null,
                                "Effort ressenti ",
                                React.createElement("b", null,
                                    w.rpe,
                                    "/10")) : null,
                            w.notes ? React.createElement("p", null, w.notes) : null,
                            w.exercises && w.exercises.map((e, k) => (React.createElement("p", { key: k },
                                React.createElement("b", null, e.name),
                                React.createElement("br", null),
                                fmtSets(e.sets)))),
                            !hasMore && React.createElement("p", null, "Pas de d\u00E9tail."),
                            React.createElement("div", { className: "actions", style: { marginTop: 14 } },
                                React.createElement("button", { className: "link", style: { padding: '8px 0' }, onClick: () => { if (confirm('Supprimer cette séance ?'))
                                        onDelete(w); } }, "Supprimer"))))));
                })));
        })));
}
function LogSheet({ date, onSave, onClose }) {
    const [f, setF] = useState({ date, discipline: 'course', duration: '', distance: '', avgHR: '', maxHR: '', strain: '', rpe: '', notes: '' });
    const [more, setMore] = useState(false);
    const [err, setErr] = useState('');
    const set = (k, v) => setF(prev => ({ ...prev, [k]: v }));
    const save = () => {
        if (!(Number(f.duration) > 0)) {
            setErr('Indique la durée en minutes.');
            return;
        }
        onSave({ ...f, duration: Number(f.duration) });
    };
    return (React.createElement(Sheet, { title: "S\u00E9ance faite", onClose: onClose },
        React.createElement("label", { className: "f" }, "Discipline"),
        React.createElement(DiscChips, { value: f.discipline, onChange: (v) => set('discipline', v) }),
        React.createElement("label", { className: "f", htmlFor: "log-dur" }, "Dur\u00E9e (minutes)"),
        React.createElement("input", { id: "log-dur", className: "big", type: "number", inputMode: "numeric", min: "1", placeholder: "45", value: f.duration, onChange: (e) => { set('duration', e.target.value); setErr(''); }, autoFocus: true }),
        React.createElement("label", { className: "f", htmlFor: "log-date" }, "Date"),
        React.createElement("input", { id: "log-date", type: "date", value: f.date, onChange: (e) => set('date', e.target.value) }),
        !more && React.createElement("button", { className: "more-toggle", onClick: () => setMore(true) }, "Ajouter des d\u00E9tails"),
        more && (React.createElement("div", null,
            React.createElement("div", { className: "grid2" },
                React.createElement("div", null,
                    React.createElement("label", { className: "f", htmlFor: "log-km" }, "Distance (km)"),
                    React.createElement("input", { id: "log-km", type: "number", inputMode: "decimal", step: "0.1", value: f.distance, onChange: (e) => set('distance', e.target.value) })),
                React.createElement("div", null,
                    React.createElement("label", { className: "f", htmlFor: "log-hr" }, "FC moyenne"),
                    React.createElement("input", { id: "log-hr", type: "number", inputMode: "numeric", value: f.avgHR, onChange: (e) => set('avgHR', e.target.value) }))),
            React.createElement("div", { className: "grid2" },
                React.createElement("div", null,
                    React.createElement("label", { className: "f", htmlFor: "log-hrmax" }, "FC max"),
                    React.createElement("input", { id: "log-hrmax", type: "number", inputMode: "numeric", value: f.maxHR, onChange: (e) => set('maxHR', e.target.value) })),
                React.createElement("div", null,
                    React.createElement("label", { className: "f", htmlFor: "log-strain" }, "Strain Whoop"),
                    React.createElement("input", { id: "log-strain", type: "number", inputMode: "decimal", step: "0.1", min: "0", max: "21", value: f.strain, onChange: (e) => set('strain', e.target.value) }))),
            React.createElement("label", { className: "f", htmlFor: "log-rpe" }, "Effort ressenti (1 \u00E0 10)"),
            React.createElement("input", { id: "log-rpe", type: "number", inputMode: "numeric", min: "1", max: "10", value: f.rpe, onChange: (e) => set('rpe', e.target.value) }),
            React.createElement("label", { className: "f", htmlFor: "log-notes" }, "Notes"),
            React.createElement("textarea", { id: "log-notes", value: f.notes, onChange: (e) => set('notes', e.target.value) }))),
        err && React.createElement("p", { className: "err", role: "alert" }, err),
        React.createElement("div", { className: "actions" },
            React.createElement("button", { className: "btn", onClick: save }, "Enregistrer"))));
}
function WorkoutSheet({ w, onSave, onDelete, onClose }) {
    const dsc = DISC[w.discipline] || DISC.course;
    const [f, setF] = useState({ date: w.date, duration: w.duration || '', distance: w.distance || '', avgHR: w.avgHR || '', maxHR: w.maxHR || '', strain: w.strain || '' });
    const [err, setErr] = useState('');
    const set = (k, v) => { setF(prev => ({ ...prev, [k]: v })); setErr(''); };
    const save = () => {
        const bad = (v, lo, hi) => v !== '' && !(Number(String(v).replace(',', '.')) >= lo && Number(String(v).replace(',', '.')) <= hi);
        if (!f.date) {
            setErr('Choisis une date.');
            return;
        }
        if (!(Number(f.duration) > 0)) {
            setErr('Indique la durée en minutes.');
            return;
        }
        if (bad(f.avgHR, 30, 230) || bad(f.maxHR, 30, 230)) {
            setErr('La fréquence cardiaque doit être comprise entre 30 et 230 bpm.');
            return;
        }
        if (f.avgHR !== '' && f.maxHR !== '' && Number(f.avgHR) > Number(f.maxHR)) {
            setErr('La FC moyenne ne peut pas dépasser la FC max.');
            return;
        }
        if (bad(f.strain, 0, 21)) {
            setErr('Le strain Whoop va de 0 à 21.');
            return;
        }
        onSave({ date: f.date, duration: Number(f.duration), distance: f.distance === '' ? '' : Number(String(f.distance).replace(',', '.')), avgHR: f.avgHR === '' ? '' : Number(f.avgHR), maxHR: f.maxHR === '' ? '' : Number(f.maxHR), strain: f.strain === '' ? '' : Number(String(f.strain).replace(',', '.')) });
    };
    return (React.createElement(Sheet, { title: "Modifier la s\u00E9ance", onClose: onClose },
        React.createElement("p", { className: "sub", style: { marginTop: 4 } },
            w.title || dsc.label,
            " \u00B7 hors plan"),
        React.createElement("label", { className: "f", htmlFor: "w-date" }, "Date"),
        React.createElement("input", { id: "w-date", type: "date", value: f.date, onChange: (e) => set('date', e.target.value) }),
        React.createElement("label", { className: "f", htmlFor: "w-dur" }, "Dur\u00E9e (minutes)"),
        React.createElement("input", { id: "w-dur", type: "number", inputMode: "numeric", min: "1", value: f.duration, onChange: (e) => set('duration', e.target.value) }),
        w.discipline !== 'muscu' && React.createElement("div", null,
            React.createElement("label", { className: "f", htmlFor: "w-km" }, "Distance (km)"),
            React.createElement("input", { id: "w-km", type: "number", inputMode: "decimal", step: "0.1", value: f.distance, onChange: (e) => set('distance', e.target.value) })),
        React.createElement("div", { className: "grid2" },
            React.createElement("div", null,
                React.createElement("label", { className: "f", htmlFor: "w-hr" }, "FC moyenne"),
                React.createElement("input", { id: "w-hr", type: "number", inputMode: "numeric", placeholder: "bpm", value: f.avgHR, onChange: (e) => set('avgHR', e.target.value) })),
            React.createElement("div", null,
                React.createElement("label", { className: "f", htmlFor: "w-hrmax" }, "FC max"),
                React.createElement("input", { id: "w-hrmax", type: "number", inputMode: "numeric", placeholder: "bpm", value: f.maxHR, onChange: (e) => set('maxHR', e.target.value) }))),
        React.createElement("label", { className: "f", htmlFor: "w-strain" }, "Strain Whoop (0 \u00E0 21)"),
        React.createElement("input", { id: "w-strain", type: "number", inputMode: "decimal", step: "0.1", min: "0", max: "21", placeholder: "12,5", value: f.strain, onChange: (e) => set('strain', e.target.value) }),
        w.exercises && w.exercises.length > 0 && (React.createElement("div", null,
            React.createElement("p", { className: "note", style: { marginTop: 18 } },
                "Exercices enregistr\u00E9s (",
                w.exercises.length,
                ")"),
            React.createElement("ul", { className: "exlist" }, w.exercises.map((e, i) => React.createElement("li", { key: i },
                React.createElement("b", null, e.name),
                React.createElement("span", null, fmtSets(e.sets || []))))))),
        err && React.createElement("p", { className: "err", role: "alert" }, err),
        React.createElement("div", { className: "actions" },
            React.createElement("button", { className: "btn", onClick: save }, "Enregistrer"),
            React.createElement("button", { className: "btn warn", onClick: () => { if (confirm('Supprimer cette séance ? Ses charges disparaîtront aussi du journal de musculation.'))
                    onDelete(); } }, "Supprimer"))));
}
function SessionSheet({ initial, isNew, templates, result, onSave, onDelete, onOpenExercises, onClose }) {
    const [f, setF] = useState(initial);
    const [r, setR] = useState({ duration: (result && result.duration) || '', avgHR: (result && result.avgHR) || '', maxHR: (result && result.maxHR) || '', strain: (result && result.strain) || '' });
    const setRes = (k, v) => { setR(prev => ({ ...prev, [k]: v })); setErr(''); };
    const [err, setErr] = useState('');
    const [adj, setAdj] = useState({ dur: 0, pace: 0 });
    const [later, setLater] = useState(false);
    const set = (k, v) => setF(prev => ({ ...prev, [k]: v }));
    const cardio = ['course', 'velo', 'nage'].includes(f.discipline);
    const minutes = parseTargetMinutes(f.target);
    const paceStep = f.discipline === 'nage' ? 2 : 5;
    const bumpDur = (n) => { const m = minutes || 0, nm = Math.max(5, m + n); setF(prev => ({ ...prev, target: setLeadingDuration(prev.target, nm) })); setAdj(a => ({ ...a, dur: a.dur + (nm - m) })); };
    const bumpPace = (n) => { setF(prev => ({ ...prev, desc: shiftPaces(prev.desc, n) })); setAdj(a => ({ ...a, pace: a.pace + n })); };
    const save = () => {
        if (!f.desc.trim()) {
            setErr('Ajoute une description.');
            return;
        }
        if (!f.date) {
            setErr('Choisis une date.');
            return;
        }
        let res = null;
        if (!isNew) {
            const bad = (v, lo, hi) => v !== '' && !(Number(String(v).replace(',', '.')) >= lo && Number(String(v).replace(',', '.')) <= hi);
            if (r.duration !== '' && !(Number(r.duration) > 0)) {
                setErr('La durée doit être un nombre de minutes.');
                return;
            }
            if (bad(r.avgHR, 30, 230) || bad(r.maxHR, 30, 230)) {
                setErr('La fréquence cardiaque doit être comprise entre 30 et 230 bpm.');
                return;
            }
            if (r.avgHR !== '' && r.maxHR !== '' && Number(r.avgHR) > Number(r.maxHR)) {
                setErr('La FC moyenne ne peut pas dépasser la FC max.');
                return;
            }
            if (bad(r.strain, 0, 21)) {
                setErr('Le strain Whoop va de 0 à 21.');
                return;
            }
            if (r.duration !== '' || r.avgHR !== '' || r.maxHR !== '' || r.strain !== '') {
                res = { duration: r.duration !== '' ? Number(r.duration) : (parseTargetMinutes(f.target) || 60), avgHR: r.avgHR === '' ? '' : Number(r.avgHR), maxHR: r.maxHR === '' ? '' : Number(r.maxHR), strain: r.strain === '' ? '' : Number(String(r.strain).replace(',', '.')) };
            }
        }
        onSave({ ...f, desc: f.desc.trim(), target: f.target.trim(), applyLater: later && (adj.dur || adj.pace) ? { ...adj } : null, result: res });
    };
    return (React.createElement(Sheet, { title: isNew ? 'Nouvelle séance' : 'Modifier la séance', onClose: onClose },
        React.createElement("label", { className: "f" }, "Discipline"),
        React.createElement(DiscChips, { value: f.discipline, onChange: (v) => setF(prev => ({ ...prev, discipline: v, templateId: v === 'muscu' ? prev.templateId : '' })) }),
        f.discipline === 'muscu' && templates.length > 0 && (React.createElement("div", null,
            React.createElement("label", { className: "f" }, "S\u00E9ance type"),
            React.createElement("div", { className: "chips", role: "radiogroup", "aria-label": "S\u00E9ance type" },
                React.createElement("button", { role: "radio", "aria-checked": !f.templateId, className: "chip" + (!f.templateId ? " on" : ""), onClick: () => set('templateId', '') }, "Aucune"),
                templates.map(t => (React.createElement("button", { key: t.id, role: "radio", "aria-checked": f.templateId === t.id, className: "chip" + (f.templateId === t.id ? " on" : ""), onClick: () => setF(prev => ({ ...prev, templateId: t.id, desc: prev.desc.trim() ? prev.desc : t.name })) }, t.name)))))),
        !isNew && f.discipline === 'muscu' && f.templateId && templates.some(t => t.id === f.templateId) && (React.createElement("button", { className: "openlink", onClick: () => onOpenExercises(f.templateId) }, "Voir les exercices")),
        React.createElement("label", { className: "f", htmlFor: "s-date" }, "Date"),
        React.createElement("input", { id: "s-date", type: "date", value: f.date, onChange: (e) => { set('date', e.target.value); setErr(''); } }),
        cardio && (React.createElement("div", { className: "adjust" },
            React.createElement("label", { className: "f" }, "Ajuster"),
            React.createElement("div", { className: "stepper" },
                React.createElement("span", null, "Dur\u00E9e"),
                React.createElement("button", { onClick: () => bumpDur(-5), "aria-label": "Retirer 5 minutes" }, "\u22125 min"),
                React.createElement("b", null, minutes ? dur(minutes) : '–'),
                React.createElement("button", { onClick: () => bumpDur(5), "aria-label": "Ajouter 5 minutes" }, "+5 min")),
            hasPace(f.desc) && React.createElement("div", { className: "stepper" },
                React.createElement("span", null, "Allure"),
                React.createElement("button", { onClick: () => bumpPace(-paceStep), "aria-label": 'Plus rapide de ' + paceStep + ' secondes' },
                    "\u2212",
                    paceStep,
                    " s"),
                React.createElement("b", null, f.discipline === 'nage' ? 'par 100 m' : 'par km'),
                React.createElement("button", { onClick: () => bumpPace(paceStep), "aria-label": 'Plus lent de ' + paceStep + ' secondes' },
                    "+",
                    paceStep,
                    " s")),
            !isNew && (adj.dur || adj.pace) ? React.createElement("label", { className: "checkrow" },
                React.createElement("input", { type: "checkbox", checked: later, onChange: (e) => setLater(e.target.checked) }),
                " Appliquer aussi aux prochaines s\u00E9ances du m\u00EAme type ce jour-l\u00E0") : null)),
        React.createElement("label", { className: "f", htmlFor: "s-desc" }, "Description"),
        React.createElement("input", { id: "s-desc", value: f.desc, placeholder: "Sortie longue Z2", onChange: (e) => { set('desc', e.target.value); setErr(''); } }),
        React.createElement("label", { className: "f", htmlFor: "s-tgt" }, "Objectif"),
        React.createElement("input", { id: "s-tgt", value: f.target, placeholder: "1h30, Z2", onChange: (e) => set('target', e.target.value) }),
        !isNew && (React.createElement("div", null,
            React.createElement("p", { className: "note", style: { marginTop: 18 } }, "S\u00E9ance r\u00E9alis\u00E9e (facultatif). Remplir un champ marque la s\u00E9ance comme faite."),
            React.createElement("label", { className: "f", htmlFor: "r-dur" }, "Dur\u00E9e r\u00E9alis\u00E9e (minutes)"),
            React.createElement("input", { id: "r-dur", type: "number", inputMode: "numeric", min: "1", placeholder: parseTargetMinutes(f.target) ? String(parseTargetMinutes(f.target)) : 'min', value: r.duration, onChange: (e) => setRes('duration', e.target.value) }),
            React.createElement("div", { className: "grid2" },
                React.createElement("div", null,
                    React.createElement("label", { className: "f", htmlFor: "r-hr" }, "FC moyenne"),
                    React.createElement("input", { id: "r-hr", type: "number", inputMode: "numeric", placeholder: "bpm", value: r.avgHR, onChange: (e) => setRes('avgHR', e.target.value) })),
                React.createElement("div", null,
                    React.createElement("label", { className: "f", htmlFor: "r-hrmax" }, "FC max"),
                    React.createElement("input", { id: "r-hrmax", type: "number", inputMode: "numeric", placeholder: "bpm", value: r.maxHR, onChange: (e) => setRes('maxHR', e.target.value) }))),
            React.createElement("label", { className: "f", htmlFor: "r-strain" }, "Strain Whoop (0 \u00E0 21)"),
            React.createElement("input", { id: "r-strain", type: "number", inputMode: "decimal", step: "0.1", min: "0", max: "21", placeholder: "12,5", value: r.strain, onChange: (e) => setRes('strain', e.target.value) }))),
        err && React.createElement("p", { className: "err", role: "alert" }, err),
        React.createElement("div", { className: "actions" },
            React.createElement("button", { className: "btn", onClick: save }, "Enregistrer"),
            !isNew && React.createElement("button", { className: "btn warn", onClick: () => { if (confirm('Supprimer cette séance du plan ?'))
                    onDelete(); } }, "Supprimer"))));
}
const num = (v) => Number(String(v).replace(',', '.')) || 0;
const countEx = (t) => t.blocks.reduce((n, b) => n + b.exercises.length, 0);
const countSets = (t) => t.blocks.reduce((n, b) => n + b.exercises.reduce((m, e) => m + e.sets.length, 0), 0);
const fmtSets = (sets) => sets.map(s => s.kg ? s.reps + ' × ' + s.kg + ' kg' : String(s.reps)).join(' · ');
const fmtKg = (v) => String(Math.round(v * 10) / 10).replace('.', ',') + ' kg';
function buildJournal(workouts) {
    const map = {};
    workouts.filter(w => w.exercises && w.exercises.length).forEach(w => {
        w.exercises.forEach(e => {
            const sets = (e.sets || []).filter(s => s.reps > 0 || s.kg > 0);
            if (!sets.length)
                return;
            const top = sets.reduce((b, s) => (s.kg > b.kg || (s.kg === b.kg && s.reps > b.reps)) ? s : b, sets[0]);
            (map[e.name] = map[e.name] || []).push({ date: w.date, sets, top, e1rm: Math.max(...sets.map(s => s.kg * (1 + s.reps / 30))), volume: sets.reduce((n, s) => n + s.kg * s.reps, 0) });
        });
    });
    return Object.keys(map).map(name => {
        const h = map[name].sort((a, b) => a.date.localeCompare(b.date));
        const weighted = h.some(x => x.top.kg > 0);
        const metric = (x) => weighted ? x.top.kg : x.top.reps;
        let best = -1, prs = 0;
        h.forEach((x, i) => { const v = metric(x); x.pr = i > 0 && v > best; if (x.pr)
            prs++; if (v > best)
            best = v; });
        const prSession = h.filter(x => metric(x) === best).pop();
        return { name, h, weighted, metric, best, prs, prSession, last: h[h.length - 1], e1rm: weighted ? Math.max(...h.map(x => x.e1rm)) : 0 };
    }).sort((a, b) => b.last.date.localeCompare(a.last.date));
}
const topStr = (ex, x) => ex.weighted ? fmtKg(x.top.kg) + ' × ' + x.top.reps : x.top.reps + ' reps';
function ExerciseSheet({ ex, onClose }) {
    const pts = ex.h.map(x => ({ label: longDate(parse(x.date)) + ' · ' + topStr(ex, x), short: shortDate(parse(x.date)), v: ex.metric(x) }));
    const fmtV = (v) => ex.weighted ? fmtKg(v) : v + ' reps';
    return (React.createElement(Sheet, { title: ex.name, onClose: onClose },
        React.createElement(TrendChart, { pts: pts, fmtV: fmtV }),
        React.createElement("div", { className: "hist-stats" },
            React.createElement("div", null,
                React.createElement("b", null, fmtV(ex.best)),
                React.createElement("span", null,
                    "Record",
                    ex.weighted ? ' (' + ex.prSession.top.reps + ' reps)' : '')),
            ex.weighted && React.createElement("div", null,
                React.createElement("b", null, fmtKg(ex.e1rm)),
                React.createElement("span", null, "1RM estim\u00E9")),
            React.createElement("div", null,
                React.createElement("b", null, ex.h.length),
                React.createElement("span", null, ex.h.length > 1 ? 'séances' : 'séance'))),
        React.createElement("div", { className: "hist-rows" }, [...ex.h].reverse().map((x, i) => (React.createElement("div", { className: "r col", key: i },
            React.createElement("span", null,
                React.createElement("b", null, shortDate(parse(x.date))),
                x.pr && React.createElement("em", { className: "prtag" }, "Record")),
            React.createElement("span", { className: "sets" }, fmtSets(x.sets))))))));
}
function MuscuJournal({ workouts }) {
    const [q, setQ] = useState('');
    const [open, setOpen] = useState(null);
    const all = useMemo(() => buildJournal(workouts), [workouts]);
    const list = all.filter(e => e.name.toLowerCase().includes(q.trim().toLowerCase()));
    if (all.length === 0)
        return React.createElement("p", { className: "empty" }, "Le journal se remplit quand tu termines une s\u00E9ance de musculation depuis l'onglet S\u00E9ances : chaque exercice y garde l'historique de ses charges et tes records.");
    return (React.createElement("div", null,
        React.createElement("input", { type: "search", placeholder: "Rechercher un exercice", "aria-label": "Rechercher un exercice", value: q, onChange: (e) => setQ(e.target.value), style: { marginBottom: 12 } }),
        list.length === 0 && React.createElement("p", { className: "empty" }, "Aucun exercice ne correspond."),
        list.map(ex => (React.createElement("button", { key: ex.name, className: "tcard jr", onClick: () => setOpen(ex) },
            React.createElement("div", null,
                React.createElement("h3", null, ex.name),
                React.createElement("p", null,
                    "Derni\u00E8re : ",
                    topStr(ex, ex.last),
                    " \u00B7 ",
                    shortDate(parse(ex.last.date))),
                React.createElement("p", null,
                    "Record : ",
                    React.createElement("b", null, ex.weighted ? fmtKg(ex.best) : ex.best + ' reps'),
                    ex.weighted ? ' × ' + ex.prSession.top.reps : '',
                    " \u00B7 ",
                    ex.h.length,
                    " ",
                    ex.h.length > 1 ? 'séances' : 'séance')),
            React.createElement("span", { className: "go" },
                React.createElement(Icon, { name: "chevron" }))))),
        open && React.createElement(ExerciseSheet, { ex: open, onClose: () => setOpen(null) })));
}
const EXO_RAW = `
Développé couché – Barre | Barbell bench press | Pectoraux | Pectoraux | Triceps, Épaules (avant) | Barre | Allongé, omoplates serrées et pieds ancrés, descends la barre au milieu de la poitrine puis pousse sans décoller les fesses.
Développé couché à la Smith machine | Smith machine bench press | Pectoraux | Pectoraux | Triceps, Épaules (avant) | Smith machine | La barre est guidée : descends-la vers le bas des pectoraux et pousse en gardant les omoplates serrées.
Développé couché – Haltères | Dumbbell bench press | Pectoraux | Pectoraux | Triceps, Épaules (avant) | Haltères | Descends les haltères de chaque côté de la poitrine, coudes à environ 45° du buste, puis pousse en les rapprochant en haut.
Développé couché – Position inclinée | Incline dumbbell press | Pectoraux | Pectoraux (haut), Épaules (avant) | Triceps | Haltères | Banc incliné autour de 30° : pousse les haltères au-dessus du haut de la poitrine sans cambrer le dos.
Développé incliné – Barre | Incline barbell bench press | Pectoraux | Pectoraux (haut), Épaules (avant) | Triceps | Barre | Banc incliné : descends la barre vers le haut de la poitrine puis pousse en ligne droite.
Développé décliné – Barre | Decline barbell bench press | Pectoraux | Pectoraux (bas) | Triceps | Barre | Banc décliné, pieds bien calés : descends la barre vers le bas de la poitrine et pousse en contrôle.
Écarté – Haltères | Dumbbell fly | Pectoraux | Pectoraux | Épaules (avant) | Haltères | Bras légèrement fléchis, ouvre en arc de cercle jusqu'à sentir l'étirement des pectoraux, puis referme comme pour enlacer un arbre.
Écarté incliné – Haltères | Incline dumbbell fly | Pectoraux | Pectoraux (haut) | Épaules (avant) | Haltères | Même geste que l'écarté, sur banc incliné, pour cibler le haut des pectoraux.
Écarté à la poulie vis-à-vis | Cable crossover | Pectoraux | Pectoraux | Épaules (avant) | Poulie | Debout entre deux poulies, ramène les mains devant toi, coudes légèrement fléchis. Poulies hautes : bas des pectoraux ; poulies basses : haut.
Pec deck – Machine | Pec deck machine fly | Pectoraux | Pectoraux | Épaules (avant) | Machine | Assis dos calé, rapproche les poignées devant toi en serrant les pectoraux, puis reviens lentement.
Développé assis – Machine | Chest press machine | Pectoraux | Pectoraux | Triceps, Épaules (avant) | Machine | Règle le siège pour que les poignées soient à hauteur de poitrine, pousse sans verrouiller les coudes.
Pompes | Push-up | Pectoraux | Pectoraux | Triceps, Épaules (avant), Abdominaux | Poids du corps | Corps gainé comme une planche, descends la poitrine près du sol, coudes à environ 45°, puis repousse.
Pompes pieds surélevés | Decline push-up | Pectoraux | Pectoraux (haut), Épaules (avant) | Triceps | Poids du corps | Pieds posés sur un banc : même geste que les pompes, avec plus de travail sur le haut des pectoraux.
Dips – Pectoraux | Chest dips | Pectoraux | Pectoraux (bas) | Triceps, Épaules (avant) | Poids du corps | Sur barres parallèles, buste penché en avant, descends jusqu'à sentir l'étirement de la poitrine puis pousse.
Pull-over – Haltère | Dumbbell pullover | Pectoraux | Pectoraux | Dos (grand dorsal), Triceps | Haltères | Allongé, haltère tenu à deux mains au-dessus de la poitrine : descends-le derrière la tête, bras presque tendus, puis ramène-le.

Traction | Pull-up | Dos | Dos (grand dorsal) | Biceps, Avant-bras | Poids du corps | Suspendu, prise pronation un peu plus large que les épaules : tire le menton au-dessus de la barre en serrant les omoplates.
Traction – Supination | Chin-up | Dos | Dos (grand dorsal), Biceps | Avant-bras | Poids du corps | Paumes vers toi, même mouvement que la traction avec plus d'implication des biceps.
Traction – Prise neutre | Neutral-grip pull-up | Dos | Dos (grand dorsal) | Biceps | Poids du corps | Poignées parallèles, paumes face à face : tire la poitrine vers les mains, coudes vers le bas.
Tirage poitrine – Avant | Lat pulldown | Dos | Dos (grand dorsal) | Biceps | Poulie | Assis, cuisses calées : tire la barre vers le haut de la poitrine en abaissant les coudes, sans te balancer.
Tirage poitrine – Prise serrée | Close-grip lat pulldown | Dos | Dos (grand dorsal) | Biceps | Poulie | Avec une poignée serrée, tire vers la poitrine en gardant les coudes près du corps.
Tirage vertical – Prise neutre | Neutral-grip pulldown | Dos | Dos (grand dorsal) | Biceps | Poulie | Poignées parallèles : tire vers le haut de la poitrine, buste légèrement incliné vers l'arrière.
Rameur buste penché – Barre | Bent-over barbell row | Dos | Dos (grand dorsal, trapèzes, rhomboïdes) | Biceps, Lombaires | Barre | Buste incliné à environ 45°, dos plat : tire la barre vers le bas du ventre en serrant les omoplates.
Rameur – Un bras – Haltère | One-arm dumbbell row | Dos | Dos (grand dorsal) | Biceps | Haltères | Une main et un genou sur le banc, tire l'haltère vers la hanche, coude près du corps ; fais les deux côtés. | Rameur – Un bras – G – Haltère; Rameur – Un bras – D – Haltère
Rowing T-bar | T-bar row | Dos | Dos (grand dorsal, trapèzes) | Biceps, Lombaires | Barre | Buste incliné, dos plat : tire la charge vers la poitrine puis redescends sous contrôle.
Rowing assis – Poulie basse | Seated cable row | Dos | Dos (grand dorsal, rhomboïdes) | Biceps | Poulie | Assis, dos droit : tire la poignée vers le ventre en serrant les omoplates, sans balancer le buste.
Rowing assis – Machine | Seated row machine | Dos | Dos (grand dorsal, rhomboïdes) | Biceps | Machine | Poitrine contre le support, tire les poignées vers toi en ramenant les coudes en arrière.
Rowing Pendlay – Barre | Pendlay row | Dos | Dos (grand dorsal, trapèzes) | Biceps, Lombaires | Barre | Barre reposée au sol à chaque répétition, buste parallèle au sol : tire-la vite vers le bas de la poitrine.
Rowing inversé | Inverted row | Dos | Dos (grand dorsal, rhomboïdes) | Biceps, Abdominaux | Poids du corps | Sous une barre basse, corps gainé : tire la poitrine vers la barre.
Pull-over à la poulie | Straight-arm pulldown | Dos | Dos (grand dorsal) | Triceps (longue portion) | Poulie | Bras presque tendus, ramène la barre vers les cuisses en gardant le buste légèrement penché.
Soulevé de terre – Barre | Conventional deadlift | Dos | Lombaires, Fessiers, Ischio-jambiers | Trapèzes, Quadriceps, Avant-bras | Barre | Barre contre les tibias, dos plat : pousse le sol avec les jambes et verrouille les hanches en haut ; redescends en contrôle.
Shrugs – Haltères | Dumbbell shrug | Dos | Trapèzes | Avant-bras | Haltères | Debout, hausse les épaules droit vers les oreilles sans rouler, marque une pause en haut.
Shrugs – Barre | Barbell shrug | Dos | Trapèzes | Avant-bras | Barre | Même geste avec une barre devant les cuisses, bras tendus.
Hyperextension | Back extension | Dos | Lombaires | Fessiers, Ischio-jambiers | Machine | Hanches calées sur le banc, descends le buste puis remonte jusqu'à l'alignement, sans cambrer en haut.

Développé militaire – Barre | Overhead barbell press | Épaules | Épaules (deltoïdes) | Triceps, Pectoraux (haut), Abdominaux | Barre | Debout, abdos gainés : pousse la barre au-dessus de la tête en passant le visage, sans cambrer.
Développé militaire – Position assise | Seated dumbbell shoulder press | Épaules | Épaules (deltoïdes) | Triceps | Haltères | Assis dos calé, pousse les haltères au-dessus de la tête puis redescends à hauteur des oreilles.
Développé Arnold | Arnold press | Épaules | Épaules (deltoïdes) | Triceps | Haltères | Pars paumes vers toi devant la poitrine et tourne-les vers l'avant pendant la poussée.
Développé épaules – Machine | Shoulder press machine | Épaules | Épaules (deltoïdes) | Triceps | Machine | Règle le siège pour que les poignées soient à hauteur d'épaules et pousse sans verrouiller les coudes.
Développé derrière la nuque – Barre | Behind-the-neck press | Épaules | Épaules (deltoïdes), Trapèzes | Triceps | Barre | Réservé aux épaules très mobiles : charge légère, descends la barre juste derrière la tête, sans forcer.
Push press – Barre | Push press | Épaules | Épaules (deltoïdes) | Triceps, Quadriceps | Barre | Fléchis légèrement les jambes puis étends-les d'un coup pour projeter la barre au-dessus de la tête.
Élévation latérale des épaules | Dumbbell lateral raise | Épaules | Épaules (côté) | Trapèzes | Haltères | Bras légèrement fléchis, monte les haltères sur les côtés jusqu'à hauteur d'épaules, sans élan.
Élévation latérale – Câble | Cable lateral raise | Épaules | Épaules (côté) | Trapèzes | Poulie | Poulie basse, main opposée : monte le bras sur le côté jusqu'à l'épaule, tension constante. | Élévation latérale – Câble – D; Élévation latérale – Câble – G
Élévation latérale – Machine | Lateral raise machine | Épaules | Épaules (côté) | Trapèzes | Machine | Coudes contre les coussins, écarte les bras jusqu'à l'horizontale puis reviens lentement.
Élévation frontale – Haltères | Dumbbell front raise | Épaules | Épaules (avant) | Pectoraux (haut) | Haltères | Monte l'haltère devant toi jusqu'à hauteur d'épaule, sans balancer.
Élévation frontale – Barre | Barbell front raise | Épaules | Épaules (avant) | Pectoraux (haut) | Barre | Prise pronation, monte la barre devant toi à hauteur d'épaules avec une charge légère.
Oiseau – Haltères | Bent-over rear delt fly | Épaules | Épaules (arrière) | Dos (rhomboïdes), Trapèzes | Haltères | Buste penché, dos plat : écarte les bras sur les côtés en serrant les omoplates.
Oiseau – Machine | Reverse pec deck | Épaules | Épaules (arrière) | Dos (rhomboïdes) | Machine | Face au dossier, écarte les poignées vers l'arrière, bras presque tendus.
Tirage vers le visage avec câble | Face pull | Épaules | Épaules (arrière), Coiffe des rotateurs | Dos (trapèzes, rhomboïdes) | Poulie | Poulie à hauteur du visage : tire la corde vers le front en écartant les coudes.
Tirage menton – Barre | Upright row | Épaules | Épaules (côté), Trapèzes | Biceps | Barre | Prise un peu plus large que les épaules, monte la barre le long du corps jusqu'à la poitrine, coudes au-dessus des mains.

Flexion des biceps – Haltère | Dumbbell curl | Biceps | Biceps | Avant-bras | Haltères | Debout, coudes collés au buste, paumes vers le haut : monte l'haltère vers l'épaule puis redescends lentement.
Flexion des biceps – Barre | Barbell curl | Biceps | Biceps | Avant-bras | Barre | Coudes fixes le long du corps, monte la barre vers les épaules sans balancer le buste.
Flexion des biceps – Barre EZ | EZ-bar curl | Biceps | Biceps | Avant-bras | Barre EZ | La barre coudée soulage les poignets : même mouvement, coudes fixes.
Curl marteau – Haltères | Hammer curl | Biceps | Biceps (brachial), Avant-bras | | Haltères | Paumes face à face tout au long du mouvement : cible le muscle sous le biceps et l'avant-bras.
Curl concentré – Haltère | Concentration curl | Biceps | Biceps | Avant-bras | Haltères | Assis, coude calé contre l'intérieur de la cuisse : monte l'haltère vers l'épaule puis redescends lentement.
Curl pupitre – Barre EZ | Preacher curl | Biceps | Biceps | Avant-bras | Barre EZ | Bras posés sur le pupitre : monte la barre sans décoller les coudes, redescends sans verrouiller.
Curl incliné – Haltères | Incline dumbbell curl | Biceps | Biceps (longue portion) | Avant-bras | Haltères | Allongé sur un banc incliné, bras pendants : monte les haltères en gardant les coudes en arrière du buste.
Curl à la poulie basse | Cable curl | Biceps | Biceps | Avant-bras | Poulie | Face à la poulie basse, monte la poignée vers les épaules : tension constante sur tout le mouvement.
Curl araignée – Haltères | Spider curl | Biceps | Biceps | Avant-bras | Haltères | Poitrine sur un banc incliné, bras pendants à la verticale : monte les haltères sans élan.

Extension des triceps | Overhead dumbbell triceps extension | Triceps | Triceps | | Haltères | Un haltère tenu à deux mains au-dessus de la tête : plie les coudes pour le descendre derrière la tête puis étends les bras.
Extension triceps à la poulie – Corde | Rope triceps pushdown | Triceps | Triceps | | Poulie | Coudes collés au corps, pousse la corde vers le bas en écartant les mains en bas du mouvement.
Extension triceps à la poulie – Barre | Cable triceps pushdown | Triceps | Triceps | | Poulie | Coudes collés au corps, pousse la barre vers le bas jusqu'à l'extension complète.
Extension triceps au-dessus de la tête – Poulie | Overhead cable triceps extension | Triceps | Triceps (longue portion) | | Poulie | Dos à la poulie, corde derrière la tête : étends les bras vers l'avant et le haut.
Barre au front – Barre EZ | Skull crusher | Triceps | Triceps | Épaules (avant) | Barre EZ | Allongé, descends la barre vers le front en ne bougeant que les avant-bras, puis étends les bras.
Kickback triceps – Haltère | Triceps kickback | Triceps | Triceps | | Haltères | Buste penché, bras collé au corps : étends le coude vers l'arrière sans balancer l'haltère.
Dips – Triceps | Triceps dips | Triceps | Triceps | Pectoraux, Épaules (avant) | Poids du corps | Corps vertical sur barres parallèles ou banc : descends jusqu'à environ 90° aux coudes puis pousse.
Développé couché – Prise serrée | Close-grip bench press | Triceps | Triceps | Pectoraux, Épaules (avant) | Barre | Mains un peu plus rapprochées que les épaules, coudes près du corps : descends la barre vers le bas de la poitrine.
Pompes diamant | Diamond push-up | Triceps | Triceps | Pectoraux, Épaules (avant) | Poids du corps | Mains rapprochées sous la poitrine, pouces et index en losange : pompe en gardant les coudes près du corps.

Curl poignets – Barre | Wrist curl | Avant-bras | Avant-bras (fléchisseurs) | | Barre | Avant-bras posés sur un banc, paumes vers le haut : fléchis les poignets pour monter la barre.
Curl inversé – Barre EZ | Reverse curl | Avant-bras | Avant-bras, Biceps (brachial) | | Barre EZ | Prise pronation : monte la barre vers les épaules, coudes fixes.
Marche du fermier | Farmer's walk | Avant-bras | Avant-bras, Trapèzes | Abdominaux, Fessiers | Haltères | Deux charges lourdes en main, marche droit, épaules basses et buste gainé.

Squat arrière – Barre | Back squat | Quadriceps | Quadriceps, Fessiers | Ischio-jambiers, Lombaires, Abdominaux | Barre | Barre sur les trapèzes, descends hanches en arrière et genoux vers l'extérieur jusqu'à la profondeur voulue, puis remonte en poussant le sol.
Squat avant – Barre | Front squat | Quadriceps | Quadriceps | Fessiers, Abdominaux | Barre | Barre sur l'avant des épaules, coudes hauts : descends en gardant le buste très droit.
Squat à la Smith machine | Smith machine squat | Quadriceps | Quadriceps, Fessiers | Ischio-jambiers | Smith machine | Pieds légèrement devant la barre, descends en contrôle puis remonte sans verrouiller brutalement les genoux.
Squat gobelet – Haltère | Goblet squat | Quadriceps | Quadriceps, Fessiers | Abdominaux | Haltères | Haltère tenu contre la poitrine : descends buste droit, coudes entre les genoux, puis remonte.
Presse à cuisses | Leg press | Quadriceps | Quadriceps, Fessiers | Ischio-jambiers | Machine | Dos plaqué, pieds à largeur d'épaules : descends jusqu'à environ 90° aux genoux et pousse sans les verrouiller.
Hack squat – Machine | Hack squat | Quadriceps | Quadriceps | Fessiers | Machine | Dos contre le dossier : descends en contrôle et pousse en gardant les talons au sol.
Fente bulgare – Haltères | Bulgarian split squat | Quadriceps | Quadriceps, Fessiers | Ischio-jambiers | Haltères | Pied arrière posé sur un banc : descends à la verticale sur la jambe avant, buste droit.
Fente marchée – Haltères | Walking lunge | Quadriceps | Quadriceps, Fessiers | Ischio-jambiers | Haltères | Avance d'un grand pas, descends le genou arrière près du sol, puis enchaîne avec l'autre jambe.
Fente – En alternance – Haltère | Alternating lunge | Quadriceps | Quadriceps, Fessiers | Ischio-jambiers | Haltères | Sur place, alterne une fente à gauche et à droite en gardant le buste droit.
Fente arrière – Haltères | Reverse lunge | Quadriceps | Quadriceps, Fessiers | Ischio-jambiers | Haltères | Recule un pied, descends le genou arrière près du sol puis reviens : plus doux pour les genoux que la fente avant.
Montée sur banc – Haltères | Step-up | Quadriceps | Quadriceps, Fessiers | Ischio-jambiers | Haltères | Monte sur un banc en poussant avec la jambe avant, sans t'aider de la jambe arrière, puis redescends en contrôle.
Extension des jambes | Leg extension | Quadriceps | Quadriceps | | Machine | Assis, étends les jambes jusqu'à presque verrouiller les genoux, puis redescends lentement.
Sissy squat | Sissy squat | Quadriceps | Quadriceps | | Poids du corps | Penche le buste en arrière en avançant les genoux, talons relevés : exercice avancé, à faire avec précaution.

Soulevé de terre roumain – Barre | Romanian deadlift | Ischio-jambiers | Ischio-jambiers, Fessiers | Lombaires | Barre | Jambes presque tendues, recule les hanches en gardant la barre contre les cuisses jusqu'à l'étirement des ischios, puis reviens.
Soulevé de terre jambes tendues – Haltères | Stiff-leg deadlift | Ischio-jambiers | Ischio-jambiers | Fessiers, Lombaires | Haltères | Descends les haltères le long des jambes, dos plat, jusqu'à sentir l'étirement à l'arrière des cuisses.
Flexion des jambes couché | Lying leg curl | Ischio-jambiers | Ischio-jambiers | Mollets | Machine | Allongé sur le ventre, ramène les talons vers les fesses sans décoller les hanches.
Flexion des jambes assis | Seated leg curl | Ischio-jambiers | Ischio-jambiers | Mollets | Machine | Assis, plie les genoux pour ramener les talons sous toi, puis reviens lentement.
Nordic curl | Nordic hamstring curl | Ischio-jambiers | Ischio-jambiers | Fessiers | Poids du corps | Genoux au sol, pieds bloqués : descends le buste vers l'avant le plus lentement possible, puis remonte avec l'aide des bras.
Good morning – Barre | Good morning | Ischio-jambiers | Ischio-jambiers, Lombaires | Fessiers | Barre | Barre sur les trapèzes, penche le buste en reculant les hanches, dos plat, puis redresse-toi.
Soulevé de terre sumo – Barre | Sumo deadlift | Fessiers | Fessiers, Quadriceps (intérieur) | Ischio-jambiers, Lombaires | Barre | Pieds très écartés, prise étroite entre les jambes : pousse le sol et verrouille les hanches en haut.

Hip thrust – Barre | Barbell hip thrust | Fessiers | Fessiers | Ischio-jambiers | Barre | Haut du dos sur un banc, barre sur les hanches : pousse les hanches vers le haut en serrant les fessiers, menton rentré.
Pont fessier | Glute bridge | Fessiers | Fessiers | Ischio-jambiers | Poids du corps | Allongé, pieds près des fesses : monte le bassin en serrant les fessiers, pause en haut.
Abduction hanche – Machine | Hip abduction machine | Fessiers | Fessiers (moyen) | | Machine | Assis, écarte les jambes contre la résistance puis reviens sans à-coup.
Kickback fessier – Poulie | Cable glute kickback | Fessiers | Fessiers | Ischio-jambiers | Poulie | Sangle à la cheville, envoie la jambe vers l'arrière sans cambrer le bas du dos.
Squat sumo – Haltère | Sumo squat | Fessiers | Fessiers, Quadriceps | Adducteurs | Haltères | Pieds écartés, pointes vers l'extérieur, haltère entre les jambes : descends en gardant le buste droit.

Élévation de mollets – Debout | Standing calf raise | Mollets | Mollets (gastrocnémiens) | | Machine | Monte sur la pointe des pieds au maximum, pause en haut, puis redescends en étirant bien les mollets.
Élévation de mollets – Assis | Seated calf raise | Mollets | Mollets (soléaire) | | Machine | Genoux fléchis à 90° : monte sur la pointe des pieds puis redescends lentement.
Élévation de mollets – Presse à cuisses | Leg press calf raise | Mollets | Mollets | | Machine | Sur la presse, pointes de pieds en bas du plateau : pousse sur les avant-pieds sans verrouiller les genoux.
Élévation de mollets – Une jambe | Single-leg calf raise | Mollets | Mollets | | Poids du corps | Sur une marche, une jambe à la fois : monte haut puis descends sous le niveau de la marche.

Crunch | Crunch | Abdominaux | Abdominaux (grand droit) | | Poids du corps | Allongé, genoux fléchis : enroule le haut du dos vers le bassin sans tirer sur la nuque.
Crunch à la poulie | Cable crunch | Abdominaux | Abdominaux (grand droit) | | Poulie | À genoux face à la poulie, enroule le buste vers le bas en arrondissant le dos, hanches fixes.
Crunch inversé | Reverse crunch | Abdominaux | Abdominaux (bas) | | Poids du corps | Allongé, ramène les genoux vers la poitrine en décollant le bassin, puis redescends lentement.
Relevé de jambes suspendu | Hanging leg raise | Abdominaux | Abdominaux (bas), Fléchisseurs de hanche | Avant-bras | Poids du corps | Suspendu à une barre, monte les jambes tendues sans balancer, puis redescends en contrôle.
Relevé de genoux suspendu | Hanging knee raise | Abdominaux | Abdominaux (bas) | Fléchisseurs de hanche | Poids du corps | Suspendu, monte les genoux vers la poitrine en enroulant le bassin.
Planche | Plank | Abdominaux | Abdominaux (transverse) | Épaules, Fessiers | Poids du corps | Sur les avant-bras, corps aligné de la tête aux talons : serre les abdos et les fessiers, respire normalement.
Planche latérale | Side plank | Abdominaux | Obliques | Épaules, Fessiers | Poids du corps | Sur un avant-bras, corps aligné : tiens la position sans laisser tomber les hanches.
Roue abdominale | Ab wheel rollout | Abdominaux | Abdominaux | Épaules, Dos (grand dorsal) | Poids du corps | À genoux, fais rouler la roue vers l'avant en gardant le dos plat, puis reviens en contractant les abdos.
Russian twist | Russian twist | Abdominaux | Obliques | Abdominaux | Poids du corps | Assis, buste incliné en arrière, tourne le buste d'un côté puis de l'autre, avec ou sans charge.
Mountain climbers | Mountain climbers | Abdominaux | Abdominaux | Épaules, Quadriceps | Poids du corps | En position de pompe, ramène les genoux vers la poitrine en alternance, à rythme soutenu.
Bûcheron à la poulie | Cable woodchop | Abdominaux | Obliques | Épaules, Fessiers | Poulie | Tire la poignée en diagonale, de haut en bas ou l'inverse, en pivotant le buste et les hanches.
Dead bug | Dead bug | Abdominaux | Abdominaux (transverse) | | Poids du corps | Allongé, bras et genoux en l'air : étends bras et jambe opposés en gardant le bas du dos plaqué au sol.
Bird dog | Bird dog | Abdominaux | Lombaires, Abdominaux | Fessiers, Épaules | Poids du corps | À quatre pattes, étends un bras et la jambe opposée sans bouger le bassin.
Pallof press | Pallof press | Abdominaux | Abdominaux (anti-rotation) | Épaules | Poulie | De profil à la poulie, pousse les mains devant toi sans que le buste tourne.

Kettlebell swing | Kettlebell swing | Corps entier | Fessiers, Ischio-jambiers | Lombaires, Épaules, Abdominaux | Kettlebell | Pousse les hanches vers l'avant pour projeter le kettlebell à hauteur de poitrine, bras relâchés.
Thruster – Haltères | Dumbbell thruster | Corps entier | Quadriceps, Épaules | Fessiers, Triceps | Haltères | Squat avec les haltères sur les épaules, puis pousse-les au-dessus de la tête en te relevant.
Burpees | Burpee | Corps entier | Pectoraux, Quadriceps | Épaules, Abdominaux | Poids du corps | Descends en pompe au sol, remonte en saut, bras au-dessus de la tête.
Turkish get-up | Turkish get-up | Corps entier | Épaules, Abdominaux | Fessiers, Quadriceps | Kettlebell | Allongé avec une charge au bras tendu, relève-toi en plusieurs étapes jusqu'à la station debout, puis redescends.
Soulevé de terre – Barre hexagonale | Trap bar deadlift | Corps entier | Quadriceps, Fessiers, Ischio-jambiers | Trapèzes, Lombaires | Barre | Debout dans la barre hexagonale, dos plat : pousse le sol avec les jambes et redresse-toi.
Saut sur box | Box jump | Corps entier | Quadriceps, Fessiers | Mollets | Poids du corps | Saute à pieds joints sur la box, réceptionne-toi en douceur et redescends en marchant.
`;
const EXO_GROUPS = ['Pectoraux', 'Dos', 'Épaules', 'Biceps', 'Triceps', 'Avant-bras', 'Quadriceps', 'Ischio-jambiers', 'Fessiers', 'Mollets', 'Abdominaux', 'Corps entier'];
const normEx = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const EXERCISES = EXO_RAW.split('\n').filter(l => l.trim()).map((l, i) => {
    const c = l.split('|').map(x => x.trim());
    return { id: 'ex' + i, nom: c[0], en: c[1], grp: c[2], prim: c[3] ? c[3].split(',').map(x => x.trim()) : [], sec: c[4] ? c[4].split(',').map(x => x.trim()) : [], mat: c[5], how: c[6], alias: c[7] ? c[7].split(';').map(x => x.trim()) : [] };
});
EXERCISES.forEach(e => { e.nomN = normEx(e.nom); e.primN = normEx(e.prim.join(' ')); e.keys = [e.nom, ...e.alias].map(normEx); e.hay = normEx([e.nom, e.en, e.grp, e.prim.join(' '), e.sec.join(' '), e.mat].join(' ')); });
const EXO_MATS = [...new Set(EXERCISES.map(e => e.mat))].sort((a, b) => a.localeCompare(b, 'fr'));
const findExercise = (name) => { const k = normEx(name); return EXERCISES.find(e => e.keys.includes(k)) || null; };
function ExerciseInfoSheet({ ex, workouts, templates, onAddExercise, onClose }) {
    const [added, setAdded] = useState('');
    const hist = useMemo(() => buildJournal(workouts).find(j => ex.keys.includes(normEx(j.name))), [workouts, ex]);
    return (React.createElement(Sheet, { title: ex.nom, onClose: onClose },
        React.createElement("p", { className: "exen" },
            ex.en,
            " \u00B7 ",
            ex.grp,
            " \u00B7 ",
            ex.mat),
        React.createElement("div", { className: "exmus" },
            React.createElement("p", null,
                React.createElement("b", null, "Muscles principaux"),
                ex.prim.join(', ')),
            ex.sec.length > 0 && React.createElement("p", null,
                React.createElement("b", null, "Muscles secondaires"),
                ex.sec.join(', '))),
        React.createElement("h3", { className: "subh" }, "Ex\u00E9cution"),
        React.createElement("p", { className: "exhow" }, ex.how),
        hist && (React.createElement("div", { className: "hist-stats", style: { marginTop: 16 } },
            React.createElement("div", null,
                React.createElement("b", null, topStr(hist, hist.last)),
                React.createElement("span", null, "Derni\u00E8re s\u00E9ance")),
            React.createElement("div", null,
                React.createElement("b", null, hist.weighted ? fmtKg(hist.best) : hist.best + ' reps'),
                React.createElement("span", null, "Record")),
            React.createElement("div", null,
                React.createElement("b", null, hist.h.length),
                React.createElement("span", null, hist.h.length > 1 ? 'séances' : 'séance')))),
        React.createElement("h3", { className: "subh" }, "Ajouter \u00E0 une s\u00E9ance"),
        React.createElement("div", { className: "exadd" }, templates.map(t => React.createElement("button", { key: t.id, className: "fchip", onClick: () => { onAddExercise(t.id, ex); setAdded(t.name); } }, t.name))),
        added && React.createElement("p", { className: "note", role: "status", style: { marginTop: 10 } },
            "Ajout\u00E9 \u00E0 \u00AB ",
            added,
            " \u00BB avec 3 s\u00E9ries de 10. Ouvre la s\u00E9ance pour r\u00E9gler les charges.")));
}
function ExerciseLibrary({ workouts, templates, onPick, onAddExercise }) {
    const [q, setQ] = useState('');
    const [grp, setGrp] = useState('');
    const [mat, setMat] = useState('');
    const [open, setOpen] = useState(null);
    const k = normEx(q);
    const ws = k ? k.split(' ') : [];
    const score = (e) => ws.every(w => e.nomN.includes(w)) ? 0 : ws.every(w => e.primN.includes(w)) ? 1 : 2;
    const list = EXERCISES.filter(e => (!grp || e.grp === grp) && (!mat || e.mat === mat) && (!k || ws.every(w => e.hay.includes(w)))).map((e, i) => ({ e, i, sc: k ? score(e) : 0 })).sort((a, b) => a.sc - b.sc || a.i - b.i).map(x => x.e);
    return (React.createElement("div", null,
        React.createElement("input", { type: "search", placeholder: "Rechercher un exercice, un muscle\u2026", "aria-label": "Rechercher un exercice", value: q, onChange: (e) => setQ(e.target.value) }),
        React.createElement("div", { className: "chiprow", role: "tablist", "aria-label": "Groupe musculaire" }, ['', ...EXO_GROUPS].map(g => React.createElement("button", { key: g || 'all', role: "tab", "aria-selected": grp === g, className: 'fchip' + (grp === g ? ' on' : ''), onClick: () => setGrp(g) }, g || 'Tous'))),
        React.createElement("label", { className: "f", htmlFor: "exo-mat" }, "Mat\u00E9riel"),
        React.createElement("select", { id: "exo-mat", value: mat, onChange: (e) => setMat(e.target.value) },
            React.createElement("option", { value: "" }, "Tout le mat\u00E9riel"),
            EXO_MATS.map(m => React.createElement("option", { key: m, value: m }, m))),
        React.createElement("p", { className: "note", style: { margin: '12px 0 8px' } },
            list.length,
            " exercice",
            list.length > 1 ? 's' : ''),
        list.length === 0 && React.createElement("p", { className: "empty" }, "Aucun exercice ne correspond."),
        list.map(e => (React.createElement("button", { key: e.id, className: "tcard jr exrow", onClick: () => onPick ? onPick(e) : setOpen(e) },
            React.createElement("div", null,
                React.createElement("h3", null, e.nom),
                React.createElement("p", null, e.prim.join(' · '))),
            React.createElement("span", { className: "exmat" }, e.mat)))),
        open && React.createElement(ExerciseInfoSheet, { ex: open, workouts: workouts, templates: templates, onAddExercise: onAddExercise, onClose: () => setOpen(null) })));
}
function MuscuHome({ templates, workouts, onOpen, onNew, onSettings, onAddExercise }) {
    const [tab, setTab] = useState('seances');
    return (React.createElement("div", null,
        React.createElement(Header, { title: "Musculation", sub: templates.length + (templates.length > 1 ? ' séances' : ' séance'), onSettings: onSettings }),
        React.createElement("div", { className: "seg three", role: "tablist", "aria-label": "Musculation", style: { marginBottom: 14 } }, [['seances', 'Séances'], ['journal', 'Journal'], ['exos', 'Exercices']].map(([v, l]) => React.createElement("button", { key: v, role: "tab", "aria-selected": tab === v, className: tab === v ? 'on' : '', onClick: () => setTab(v) }, l))),
        tab === 'seances' && React.createElement(MuscuList, { templates: templates, onOpen: onOpen, onNew: onNew }),
        tab === 'journal' && React.createElement(MuscuJournal, { workouts: workouts }),
        tab === 'exos' && React.createElement(ExerciseLibrary, { workouts: workouts, templates: templates, onAddExercise: onAddExercise })));
}
function MuscuList({ templates, onOpen, onNew }) {
    return (React.createElement("div", null,
        templates.map(t => (React.createElement("button", { key: t.id, className: "tcard", onClick: () => onOpen(t.id) },
            React.createElement("div", null,
                React.createElement("h3", null, t.name),
                React.createElement("p", null,
                    countEx(t),
                    " exercices \u00B7 ",
                    countSets(t),
                    " s\u00E9ries")),
            React.createElement("span", { className: "go" },
                React.createElement(Icon, { name: "chevron" }))))),
        React.createElement("button", { className: "btn ghost full", style: { marginTop: 6 }, onClick: onNew }, "+ Nouvelle s\u00E9ance")));
}
function MuscuDetail({ template, startEdit, onUpdate, onDelete, onBack, onFinish }) {
    const [edit, setEdit] = useState(!!startEdit);
    const upd = (fn) => onUpdate({ ...template, blocks: fn(template.blocks) });
    const mapEx = (exId, fn) => upd(bl => bl.map(b => ({ ...b, exercises: b.exercises.map(e => e.id === exId ? fn(e) : e) })));
    const setVal = (exId, setId, k, v) => mapEx(exId, e => ({ ...e, sets: e.sets.map(x => x.id === setId ? { ...x, [k]: v } : x) }));
    const addSet = (exId) => mapEx(exId, e => { const last = e.sets[e.sets.length - 1]; return { ...e, sets: [...e.sets, { id: uid(), reps: last ? last.reps : 10, kg: last ? last.kg : 0 }] }; });
    const delSet = (exId, setId) => mapEx(exId, e => ({ ...e, sets: e.sets.filter(x => x.id !== setId) }));
    const rename = (exId, name) => mapEx(exId, e => ({ ...e, name }));
    const delEx = (exId) => upd(bl => bl.map(b => ({ ...b, exercises: b.exercises.filter(e => e.id !== exId) })).filter(b => b.exercises.length));
    const [picker, setPicker] = useState(false);
    const addEx = (name) => { upd(bl => [...bl, mkBlock(mkEx(name || 'Nouvel exercice', times(3, 10, 0), name === 'Traction' ? NOTE_PULLUP : ''))]); setPicker(false); };
    const renderEx = (e) => (React.createElement("div", { className: "ex", key: e.id },
        edit
            ? React.createElement("input", { className: "exname", "aria-label": "Nom de l'exercice", value: e.name, onChange: (ev) => rename(e.id, ev.target.value) })
            : React.createElement("h3", null, e.name),
        e.note && React.createElement("p", { className: "exnote" }, e.note),
        React.createElement("div", { className: "sets" },
            React.createElement("div", { className: "seth" },
                React.createElement("span", null),
                React.createElement("span", null, "R\u00E9p\u00E9titions"),
                React.createElement("span", null, e.kgLabel || 'Poids (kg)'),
                React.createElement("span", null)),
            e.sets.map((x, i) => (React.createElement("div", { className: "set", key: x.id },
                React.createElement("span", { className: "n" }, i + 1),
                React.createElement("input", { type: "text", inputMode: "numeric", "aria-label": 'Répétitions, série ' + (i + 1), value: x.reps, onChange: (ev) => setVal(e.id, x.id, 'reps', ev.target.value) }),
                React.createElement("input", { type: "text", inputMode: "decimal", "aria-label": 'Poids, série ' + (i + 1), value: x.kg, onChange: (ev) => setVal(e.id, x.id, 'kg', ev.target.value) }),
                React.createElement("button", { className: "x", "aria-label": 'Retirer la série ' + (i + 1), onClick: () => delSet(e.id, x.id) },
                    React.createElement(Icon, { name: "close", size: 18 })))))),
        React.createElement("div", { className: "exfoot" },
            React.createElement("button", { className: "link", onClick: () => addSet(e.id) }, "+ S\u00E9rie"),
            edit && React.createElement("button", { className: "link", onClick: () => { if (confirm('Supprimer cet exercice ?'))
                    delEx(e.id); } }, "Supprimer l'exercice"))));
    return (React.createElement("div", null,
        React.createElement("button", { className: "back", onClick: onBack },
            React.createElement(Icon, { name: "back", size: 20 }),
            " Retour"),
        React.createElement("div", { className: "head" },
            React.createElement("div", { style: { flex: 1, minWidth: 0 } },
                edit
                    ? React.createElement("input", { className: "titleinput", "aria-label": "Nom de la s\u00E9ance", value: template.name, onChange: (ev) => onUpdate({ ...template, name: ev.target.value }) })
                    : React.createElement("h1", null, template.name),
                React.createElement("p", { className: "sub" },
                    countEx(template),
                    " exercices \u00B7 ",
                    countSets(template),
                    " s\u00E9ries")),
            React.createElement("button", { className: "textbtn", onClick: () => setEdit(!edit) }, edit ? 'OK' : 'Modifier')),
        React.createElement("div", { style: { height: 18 } }),
        template.blocks.map(b => b.exercises.length > 1 ? (React.createElement("div", { className: "superset", key: b.id },
            React.createElement("p", { className: "sstag" }, "Super-s\u00E9rie"),
            b.exercises.map(renderEx))) : renderEx(b.exercises[0])),
        edit && (React.createElement("div", null,
            React.createElement("button", { className: "btn ghost full", onClick: () => setPicker(true) }, "+ Exercice"),
            React.createElement("div", { className: "actions" },
                React.createElement("button", { className: "btn warn", onClick: () => { if (confirm('Supprimer cette séance de musculation ?'))
                        onDelete(); } }, "Supprimer la s\u00E9ance")))),
        React.createElement("div", { style: { height: 96 } }),
        React.createElement("div", { className: "dock" },
            React.createElement("div", { className: "dockin" },
                React.createElement("button", { className: "btn full", onClick: onFinish }, "Terminer la s\u00E9ance"))),
        picker && (React.createElement(Sheet, { title: "Choisir un exercice", onClose: () => setPicker(false) },
            React.createElement("button", { className: "btn ghost full", style: { marginBottom: 14 }, onClick: () => addEx('') }, "Cr\u00E9er un exercice libre"),
            React.createElement(ExerciseLibrary, { workouts: [], templates: [], onPick: (e) => addEx(e.nom) })))));
}
function FinishSheet({ title, date, onSave, onClose }) {
    const [duration, setDuration] = useState('60');
    const [d, setD] = useState(date);
    const [hr, setHr] = useState({ avgHR: '', maxHR: '', strain: '' });
    const [err, setErr] = useState('');
    const setH = (k, v) => { setHr(prev => ({ ...prev, [k]: v })); setErr(''); };
    const save = () => {
        if (!(Number(duration) > 0)) {
            setErr('Indique la durée en minutes.');
            return;
        }
        const bad = (v, lo, hi) => v !== '' && !(Number(v) >= lo && Number(v) <= hi);
        if (bad(hr.avgHR, 30, 230) || bad(hr.maxHR, 30, 230)) {
            setErr('La fréquence cardiaque doit être comprise entre 30 et 230 bpm.');
            return;
        }
        if (hr.avgHR !== '' && hr.maxHR !== '' && Number(hr.avgHR) > Number(hr.maxHR)) {
            setErr('La FC moyenne ne peut pas dépasser la FC max.');
            return;
        }
        if (bad(hr.strain, 0, 21)) {
            setErr('Le strain Whoop va de 0 à 21.');
            return;
        }
        onSave(Number(duration), d, { avgHR: hr.avgHR === '' ? '' : Number(hr.avgHR), maxHR: hr.maxHR === '' ? '' : Number(hr.maxHR), strain: hr.strain === '' ? '' : Number(String(hr.strain).replace(',', '.')) });
    };
    return (React.createElement(Sheet, { title: "Terminer la s\u00E9ance", onClose: onClose },
        React.createElement("p", { className: "sub", style: { marginTop: 4 } }, title),
        React.createElement("label", { className: "f", htmlFor: "fin-dur" }, "Dur\u00E9e (minutes)"),
        React.createElement("input", { id: "fin-dur", className: "big", type: "number", inputMode: "numeric", min: "1", value: duration, onChange: (e) => { setDuration(e.target.value); setErr(''); }, autoFocus: true }),
        React.createElement("label", { className: "f", htmlFor: "fin-date" }, "Date"),
        React.createElement("input", { id: "fin-date", type: "date", value: d, onChange: (e) => setD(e.target.value) }),
        React.createElement("p", { className: "note", style: { marginTop: 18 } }, "R\u00E9sum\u00E9 de ta s\u00E9ance dans l'app Whoop (facultatif) :"),
        React.createElement("div", { className: "grid2" },
            React.createElement("div", null,
                React.createElement("label", { className: "f", htmlFor: "fin-hr" }, "FC moyenne"),
                React.createElement("input", { id: "fin-hr", type: "number", inputMode: "numeric", placeholder: "bpm", value: hr.avgHR, onChange: (e) => setH('avgHR', e.target.value) })),
            React.createElement("div", null,
                React.createElement("label", { className: "f", htmlFor: "fin-hrmax" }, "FC max"),
                React.createElement("input", { id: "fin-hrmax", type: "number", inputMode: "numeric", placeholder: "bpm", value: hr.maxHR, onChange: (e) => setH('maxHR', e.target.value) }))),
        React.createElement("label", { className: "f", htmlFor: "fin-strain" }, "Strain Whoop (0 \u00E0 21)"),
        React.createElement("input", { id: "fin-strain", type: "number", inputMode: "decimal", step: "0.1", min: "0", max: "21", placeholder: "12,5", value: hr.strain, onChange: (e) => setH('strain', e.target.value) }),
        err && React.createElement("p", { className: "err", role: "alert" }, err),
        React.createElement("div", { className: "actions" },
            React.createElement("button", { className: "btn", onClick: save }, "Enregistrer la s\u00E9ance"))));
}
function Settings({ profile, setProfile, onBack, onOpenHistory, onReset, onLoadPlan, onShiftPlan, getData, onImport, icuConn, icu, onConnectIcu, onDisconnectIcu, onRefreshIcu }) {
    const [f, setF] = useState(profile);
    const [saved, setSaved] = useState(false);
    const [adjMsg, setAdjMsg] = useState('');
    const fileRef = useRef(null);
    const set = (k, v) => { setF(prev => ({ ...prev, [k]: v })); setSaved(false); };
    const num = (k) => ({ type: 'number', inputMode: 'numeric', value: f[k], onChange: (e) => set(k, e.target.value) });
    const zonesNum = () => f.zones.map(z => z.map(v => v === '' ? 0 : Number(v)));
    const setZone = (i, j, v) => { setF(prev => ({ ...prev, zones: prev.zones.map((z, k) => k !== i ? z : z.map((x, m) => m === j ? v : x)) })); setSaved(false); };
    const save = () => {
        setProfile({ ...f, maxHR: f.maxHR === '' ? '' : Number(f.maxHR), zones: zonesNum() });
        setSaved(true);
    };
    const exportData = () => {
        const blob = new Blob([JSON.stringify(getData(), null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'allure-' + fmt(new Date()) + '.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    const importFile = (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file)
            return;
        const r = new FileReader();
        r.onload = () => {
            try {
                const d = JSON.parse(r.result);
                if (!d || typeof d !== 'object' || !Array.isArray(d.workouts))
                    throw new Error('format');
                if (confirm('Remplacer les données actuelles par celles du fichier ?')) {
                    onImport(d);
                    setF({ ...DEFAULT_PROFILE, ...(d.profile || {}) });
                }
            }
            catch (err) {
                alert("Fichier invalide : ce n'est pas un export Allure.");
            }
            e.target.value = '';
        };
        r.readAsText(file);
    };
    return (React.createElement("div", null,
        React.createElement("button", { className: "back", onClick: onBack },
            React.createElement(Icon, { name: "back", size: 20 }),
            " Retour"),
        React.createElement(Header, { title: "R\u00E9glages" }),
        React.createElement(IcuSettings, { conn: icuConn, icu: icu, onConnect: onConnectIcu, onDisconnect: onDisconnectIcu, onRefresh: onRefreshIcu }),
        React.createElement("div", { className: "card" },
            React.createElement("h3", null, "Historique des s\u00E9ances"),
            React.createElement("p", { className: "note" }, "Retrouve toutes les s\u00E9ances que tu as enregistr\u00E9es : dur\u00E9e, FC, strain Whoop, exercices."),
            React.createElement("div", { className: "actions" },
                React.createElement("button", { className: "btn ghost", onClick: onOpenHistory }, "Ouvrir l'historique"))),
        React.createElement("div", { className: "card" },
            React.createElement("h3", null, "Plan"),
            React.createElement("label", { className: "f", htmlFor: "r-start" }, "D\u00E9but du plan (semaine 1)"),
            React.createElement("input", { id: "r-start", type: "date", value: f.programStart, onChange: (e) => set('programStart', e.target.value) }),
            React.createElement("p", { className: "note", style: { marginTop: 14 } }, "Remplace le calendrier par le programme type de 12 semaines (course, v\u00E9lo, natation et tes 4 s\u00E9ances de musculation), avec les zones de fr\u00E9quence cardiaque ci-dessous. Les s\u00E9ances d\u00E9j\u00E0 enregistr\u00E9es restent dans l'historique."),
            React.createElement("div", { className: "actions" },
                React.createElement("button", { className: "btn ghost", onClick: () => { const st = onLoadPlan(zonesNum()); if (st)
                        set('programStart', st); } }, "Recharger le programme type"))),
        React.createElement("div", { className: "card" },
            React.createElement("h3", null, "Ajuster le programme"),
            React.createElement("p", { className: "note" }, "Modifie toutes les s\u00E9ances de cardio \u00E0 venir en une fois. Pour une seule s\u00E9ance, ouvre-la depuis l'accueil ou le calendrier."),
            React.createElement("label", { className: "f" }, "Allures de course"),
            React.createElement("div", { className: "actions", style: { marginTop: 6 } }, [-10, -5, 5, 10].map(n => React.createElement("button", { key: n, className: "btn ghost", style: { height: 42, padding: '0 14px' }, onClick: () => { if (confirm('Décaler toutes les allures de course à venir de ' + (n > 0 ? '+' : '−') + Math.abs(n) + ' s/km ?')) {
                    onShiftPlan({ pace: n });
                    setAdjMsg('Allures de course décalées de ' + (n > 0 ? '+' : '−') + Math.abs(n) + ' s/km.');
                } } },
                n > 0 ? '+' : '−',
                Math.abs(n),
                " s/km"))),
            React.createElement("label", { className: "f" }, "Dur\u00E9es du cardio"),
            React.createElement("div", { className: "actions", style: { marginTop: 6 } }, [-10, 10].map(n => React.createElement("button", { key: n, className: "btn ghost", style: { height: 42, padding: '0 14px' }, onClick: () => { if (confirm('Modifier de ' + (n > 0 ? '+' : '−') + '10 % la durée de toutes les séances de cardio à venir ?')) {
                    onShiftPlan({ durPct: n });
                    setAdjMsg('Durées modifiées de ' + (n > 0 ? '+' : '−') + '10 %.');
                } } },
                n > 0 ? '+' : '−',
                "10 %"))),
            adjMsg && React.createElement("p", { className: "note", role: "status", style: { marginTop: 12 } }, adjMsg)),
        React.createElement("div", { className: "card" },
            React.createElement("h3", null, "Fr\u00E9quence cardiaque"),
            React.createElement("label", { className: "f", htmlFor: "r-max" }, "FC max"),
            React.createElement("input", { id: "r-max", ...num('maxHR') }),
            f.zones.map((z, i) => (React.createElement("div", { key: i },
                React.createElement("label", { className: "f" },
                    "Zone ",
                    i + 1),
                React.createElement("div", { className: "grid2" },
                    React.createElement("input", { type: "number", inputMode: "numeric", "aria-label": 'Zone ' + (i + 1) + ' : bas', value: z[0], onChange: (e) => setZone(i, 0, e.target.value) }),
                    React.createElement("input", { type: "number", inputMode: "numeric", "aria-label": 'Zone ' + (i + 1) + ' : haut', value: z[1], onChange: (e) => setZone(i, 1, e.target.value) })))))),
        React.createElement("div", { className: "actions", style: { marginTop: 18 } },
            React.createElement("button", { className: "btn", onClick: save }, saved ? 'Enregistré ✓' : 'Enregistrer')),
        React.createElement("div", { className: "card" },
            React.createElement("h3", null, "Sauvegarde"),
            React.createElement("p", { className: "note" }, "Tes donn\u00E9es restent dans ce navigateur. Un fichier d'export permet de les sauvegarder ou de les passer sur un autre appareil."),
            React.createElement("div", { className: "actions" },
                React.createElement("button", { className: "btn ghost", onClick: exportData }, "Exporter"),
                React.createElement("button", { className: "btn ghost", onClick: () => fileRef.current && fileRef.current.click() }, "Importer"),
                React.createElement("input", { ref: fileRef, type: "file", accept: "application/json,.json", style: { display: 'none' }, onChange: importFile }))),
        React.createElement("div", { className: "card" },
            React.createElement("h3", null, "R\u00E9initialiser"),
            React.createElement("p", { className: "note" }, "Efface les s\u00E9ances, le plan, les r\u00E9glages et la connexion Intervals.icu."),
            React.createElement("div", { className: "actions" },
                React.createElement("button", { className: "btn warn", onClick: () => { if (confirm('Effacer toutes les données (séances, plan, réglages) ? Cette action est irréversible.'))
                        onReset(); } }, "Tout effacer")))));
}
function App() {
    const initRef = useRef(null);
    if (initRef.current === null)
        initRef.current = bootState();
    const init = initRef.current;
    const [page, setPage] = useState('today');
    const [prevPage, setPrevPage] = useState('today');
    const [workouts, setWorkouts] = useState(init.workouts || []);
    const [program, setProgram] = useState(init.program);
    const [profile, setProfile] = useState({ ...DEFAULT_PROFILE, ...(init.profile || {}) });
    const [templates, setTemplates] = useState(init.templates);
    const [muscuView, setMuscuView] = useState(null);
    const [steps, setSteps] = useState(init.steps || {});
    const saveSteps = (date, n) => setSteps(prev => { const next = { ...prev }; if (n > 0)
        next[date] = n;
    else
        delete next[date]; return next; });
    const [icuConn, setIcuConn] = useState(() => loadIcuConn() || (window.ALLURE_DEMO ? { apiKey: 'demo' } : null));
    const emptyIcu = { status: 'idle', activities: [], wellness: [], stubs: 0, fetchedAt: null, from: '' };
    const [icu, setIcu] = useState(() => { const c = loadIcuCache(); return c && c.from === rangeFrom(fmt(new Date())) ? { ...c, status: 'idle' } : emptyIcu; });
    const matches = useMemo(() => matchActivities(program, profile.programStart, icuConn ? icu.activities : []), [program, profile.programStart, icu, icuConn]);
    const [todayStr, setTodayStr] = useState(fmt(new Date()));
    const [sel, setSel] = useState(fmt(new Date()));
    const [sheet, setSheet] = useState(null);
    useEffect(() => { saveState({ workouts, program, profile, templates, steps, planVersion: PLAN_VERSION }); }, [workouts, program, profile, templates, steps]);
    useEffect(() => { try {
        navigator.storage && navigator.storage.persist && navigator.storage.persist();
    }
    catch (e) { } }, []);
    useEffect(() => {
        const onVis = () => { if (document.visibilityState === 'visible') {
            const t = fmt(new Date());
            setTodayStr(prev => { if (prev !== t)
                setSel(t); return t; });
        } };
        document.addEventListener('visibilitychange', onVis);
        return () => document.removeEventListener('visibilitychange', onVis);
    }, []);
    const go = (p) => { setPage(p); window.scrollTo(0, 0); };
    const openSettings = () => { setPrevPage(page === 'settings' ? prevPage : page); go('settings'); };
    const weekStartFor = (idx) => addDays(startOfWeek(parse(profile.programStart)), idx * 7);
    const rangeStart = rangeFrom(todayStr);
    const refreshIcu = async (connOverride) => {
        const conn = connOverride || icuConn;
        if (!conn)
            return { ok: false, code: 'none' };
        setIcu(p => ({ ...p, status: 'loading' }));
        try {
            const data = await fetchIcuAll(conn.apiKey, rangeStart, todayStr);
            const all = data.activities.map(normIcu);
            const next = { status: 'ok', activities: all.filter(a => !a.stub), stubs: all.filter(a => a.stub).length, wellness: data.wellness.map(normWell), fetchedAt: Date.now(), from: rangeStart };
            setIcu(next);
            saveIcuCache(next);
            return { ok: true };
        }
        catch (e) {
            const code = e && e.code === 'auth' ? 'auth' : 'net';
            setIcu(p => ({ ...p, status: code === 'auth' ? 'auth' : 'offline' }));
            return { ok: false, code };
        }
    };
    const icuRef = useRef(null);
    icuRef.current = { refreshIcu, icu, icuConn };
    useEffect(() => {
        if (icuConn && icu.from !== rangeStart)
            setIcu({ ...emptyIcu });
        if (icuConn)
            icuRef.current.refreshIcu();
    }, [icuConn, todayStr]);
    useEffect(() => {
        const onVis = () => {
            const r = icuRef.current;
            if (document.visibilityState === 'visible' && r.icuConn && (!r.icu.fetchedAt || Date.now() - r.icu.fetchedAt > 3 * 60 * 1000))
                r.refreshIcu();
        };
        document.addEventListener('visibilitychange', onVis);
        return () => document.removeEventListener('visibilitychange', onVis);
    }, []);
    const connectIcu = async (key) => {
        const conn = { apiKey: String(key || '').trim() };
        if (!conn.apiKey)
            return { ok: false, code: 'empty' };
        const r = await refreshIcu(conn);
        if (r.ok) {
            saveIcuConn(conn);
            setIcuConn(conn);
        }
        else
            setIcu({ ...emptyIcu });
        return r;
    };
    const disconnectIcu = () => { clearIcu(); setIcuConn(null); setIcu({ ...emptyIcu }); };
    const openMuscu = (templateId, from, edit) => { setMuscuView({ templateId, from: from || null, edit: !!edit }); setPage('muscu'); window.scrollTo(0, 0); };
    const updateTemplate = (t) => setTemplates(templates.map(x => x.id === t.id ? t : x));
    const addExerciseToTemplate = (tid, ex) => setTemplates(ts => ts.map(t => t.id !== tid ? t : { ...t, blocks: [...t.blocks, mkBlock(mkEx(ex.nom, times(3, 10, 0), ex.nom === 'Traction' ? NOTE_PULLUP : ''))] }));
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
    const finishMuscu = (template, from, duration, date, extra) => {
        const exercises = template.blocks.flatMap(b => b.exercises).map(e => ({ name: e.name, sets: e.sets.map(x => ({ reps: num(x.reps), kg: num(x.kg) })) }));
        const entry = { id: uid(), discipline: 'muscu', title: template.name, templateId: template.id, duration, date, distance: '', avgHR: (extra && extra.avgHR) || '', maxHR: (extra && extra.maxHR) || '', strain: (extra && extra.strain) || '', rpe: '', notes: '', exercises };
        let next = workouts;
        if (from) {
            next = workouts.filter(w => w.sessionId !== from.sid);
            entry.sessionId = from.sid;
            setProgram(program.map((w, i) => i !== from.wIdx ? w : { ...w, sessions: w.sessions.map(s => s.id === from.sid ? { ...s, done: true } : s) }));
        }
        setWorkouts([...next, entry]);
        setSheet(null);
        setMuscuView(null);
        go(from ? 'today' : 'muscu');
    };
    const toggleSession = (wIdx, sid) => {
        const s = program[wIdx] && program[wIdx].sessions.find(x => x.id === sid);
        if (!s)
            return;
        const done = !s.done;
        setProgram(program.map((w, i) => i !== wIdx ? w : { ...w, sessions: w.sessions.map(x => x.id === sid ? { ...x, done } : x) }));
        if (done) {
            setWorkouts([...workouts, { id: uid(), sessionId: sid, date: fmt(addDays(weekStartFor(wIdx), s.day)), discipline: s.discipline, duration: parseTargetMinutes(s.target) || '', distance: '', avgHR: '', rpe: '', notes: '' }]);
        }
        else {
            setWorkouts(workouts.filter(w => w.sessionId !== sid));
        }
    };
    const logWorkout = (data) => { setWorkouts([...workouts, { ...data, id: uid() }]); setSheet(null); };
    const deleteWorkout = (w) => {
        setWorkouts(workouts.filter(x => x.id !== w.id));
        if (w.sessionId)
            setProgram(program.map(wk => ({ ...wk, sessions: wk.sessions.map(s => s.id === w.sessionId ? { ...s, done: false } : s) })));
    };
    const placeSession = (wIdx, sid, iso, fields, post) => {
        const loc = locateWeek(program, profile.programStart, iso);
        const fw = wIdx + loc.shift;
        const old = loc.program[fw] && loc.program[fw].sessions.find(x => x.id === sid);
        if (!old)
            return;
        const moved = { ...old, ...(fields || {}), day: loc.day };
        const prog = loc.program.map((w, i) => {
            let ss = w.sessions;
            if (i === fw)
                ss = ss.filter(x => x.id !== sid);
            if (i === loc.wIdx)
                ss = [...ss, moved];
            return ss === w.sessions ? w : { ...w, sessions: ss };
        });
        setProgram(post ? post(prog, loc.programStart) : prog);
        if (loc.programStart !== profile.programStart)
            setProfile(p => ({ ...p, programStart: loc.programStart }));
        setWorkouts(ws => ws.map(w => w.sessionId === sid ? { ...w, date: iso, ...(fields && fields.discipline ? { discipline: fields.discipline } : {}) } : w));
    };
    const saveSession = (wIdx, sid, data) => {
        const { date, applyLater, result, ...fields } = data;
        if (sid) {
            const later = !applyLater ? null : (prog, start) => {
                const base = startOfWeek(parse(start)), day = (parse(date).getDay() + 6) % 7;
                return prog.map((w, i) => ({ ...w, sessions: w.sessions.map(x => (x.id === sid || x.done || x.discipline !== fields.discipline || x.day !== day || fmt(addDays(base, i * 7 + x.day)) <= date) ? x : applyDelta(x, applyLater)) }));
            };
            placeSession(wIdx, sid, date, fields, later);
            if (result) {
                setProgram(prog => prog.map(w => ({ ...w, sessions: w.sessions.map(x => x.id === sid ? { ...x, done: true } : x) })));
                const tpl = fields.templateId && templates.find(t => t.id === fields.templateId);
                setWorkouts(ws => ws.some(w => w.sessionId === sid)
                    ? ws.map(w => w.sessionId === sid ? { ...w, ...result } : w)
                    : [...ws, { id: uid(), sessionId: sid, date, discipline: fields.discipline, ...(tpl ? { title: tpl.name, templateId: tpl.id } : {}), distance: '', rpe: '', notes: '', ...result }]);
            }
        }
        else {
            const loc = locateWeek(program, profile.programStart, date);
            setProgram(loc.program.map((w, i) => i !== loc.wIdx ? w : { ...w, sessions: [...w.sessions, { ...fields, id: uid(), day: loc.day, done: false }] }));
            if (loc.programStart !== profile.programStart)
                setProfile(p => ({ ...p, programStart: loc.programStart }));
        }
        setSheet(null);
    };
    const deleteSession = (wIdx, sid) => {
        setProgram(program.map((w, i) => i !== wIdx ? w : { ...w, sessions: w.sessions.filter(s => s.id !== sid) }));
        setWorkouts(workouts.filter(w => w.sessionId !== sid));
        setSheet(null);
    };
    const coachApply = (act) => {
        let wIdx = -1, s = null;
        program.forEach((w, i) => w.sessions.forEach(x => { if (x.id === act.sid) {
            wIdx = i;
            s = x;
        } }));
        if (!s || s.done || matches[s.id])
            return { ok: false, msg: 'cette séance a changé ou est déjà faite.' };
        const date = fmt(addDays(weekStartFor(wIdx), s.day));
        if (act.type === 'delete') {
            setProgram(program.map((w, i) => i !== wIdx ? w : { ...w, sessions: w.sessions.filter(x => x.id !== s.id) }));
            setWorkouts(workouts.filter(w => w.sessionId !== s.id));
            return { ok: true };
        }
        if (act.type === 'move') {
            placeSession(wIdx, s.id, act.newDate, {});
            return { ok: true };
        }
        let desc = s.desc, target = s.target;
        if (act.paceDelta)
            desc = shiftPaces(desc, act.paceDelta);
        if (act.durMin)
            target = setLeadingDuration(target, act.durMin);
        placeSession(wIdx, s.id, date, { desc, target });
        return { ok: true };
    };
    const reset = () => {
        try {
            localStorage.removeItem(KEY);
        }
        catch (e) { }
        const tpls = defaultTemplates();
        setSteps({});
        setWorkouts([]);
        setProgram(buildProgram(tpls, DEFAULT_PROFILE.zones));
        setProfile({ ...DEFAULT_PROFILE, programStart: planStart() });
        setTemplates(tpls);
        setMuscuView(null);
        clearIcu();
        setIcuConn(null);
        setIcu({ ...emptyIcu });
        go('today');
    };
    const importData = (d) => {
        const tpls = d.templates || defaultTemplates();
        setSteps(d.steps || {});
        setWorkouts(d.workouts || []);
        setProgram(d.program || buildProgram(tpls, ((d.profile || {}).zones)));
        setProfile({ ...DEFAULT_PROFILE, ...(d.profile || {}) });
        setTemplates(tpls);
    };
    const shiftPlan = (o) => {
        setProgram(program.map((w, i) => ({ ...w, sessions: w.sessions.map(x => {
                if (x.done || fmt(addDays(weekStartFor(i), x.day)) < todayStr || !['course', 'velo', 'nage'].includes(x.discipline))
                    return x;
                let y = x;
                if (o.pace && x.discipline === 'course')
                    y = { ...y, desc: shiftPaces(y.desc, o.pace) };
                if (o.durPct) {
                    const m = parseTargetMinutes(y.target);
                    if (m)
                        y = { ...y, target: setLeadingDuration(y.target, Math.max(5, Math.round(m * (1 + o.durPct / 100) / 5) * 5)) };
                }
                return y;
            }) })));
    };
    const loadPlan = (zones) => {
        if (!confirm("Remplacer le calendrier par le programme type ? Les séances déjà enregistrées restent dans l'historique."))
            return null;
        const st = planStart();
        setProgram(buildProgram(templates, zones || profile.zones));
        setProfile(p => ({ ...p, programStart: st, ...(zones ? { zones } : {}) }));
        setWorkouts(ws => ws.map(({ sessionId, ...w }) => w));
        setSel(todayStr);
        return st;
    };
    const tabs = [
        { id: 'today', label: "Aujourd'hui", icon: 'today' },
        { id: 'plan', label: 'Calendrier', icon: 'plan' },
        { id: 'muscu', label: 'Musculation', icon: 'muscu' },
        { id: 'map', label: 'Carte', icon: 'map' },
        { id: 'coach', label: 'Coach', icon: 'coach' },
    ];
    const onSettingsPage = page === 'settings';
    const inMuscuDetail = page === 'muscu' && !!muscuView;
    return (React.createElement("div", null,
        React.createElement("main", { className: "shell" },
            page === 'today' && React.createElement(Today, { workouts: workouts, program: program, profile: profile, todayStr: todayStr, sel: sel, setSel: setSel, templates: templates, onOpenMuscu: (id, from) => openMuscu(id, from), icuConn: icuConn, icu: icu, onRefreshIcu: () => refreshIcu(), onToggle: toggleSession, onSettings: openSettings, steps: steps, onSaveSteps: saveSteps, matches: matches, onEdit: (wIdx, sid) => setSheet({ type: 'session', wIdx, sid }), onEditWorkout: (id) => setSheet({ type: 'workout', id }) }),
            page === 'plan' && React.createElement(Calendar, { program: program, profile: profile, todayStr: todayStr, templates: templates, matches: matches, workouts: workouts, onToggle: toggleSession, onEdit: (wIdx, sid) => setSheet({ type: 'session', wIdx, sid }), onAdd: (date) => setSheet({ type: 'session', wIdx: null, sid: null, date }), onMove: (wIdx, sid, iso) => placeSession(wIdx, sid, iso), onOpenMuscu: (id, from) => openMuscu(id, from), onSettings: openSettings }),
            page === 'muscu' && !muscuView && React.createElement(MuscuHome, { templates: templates, workouts: workouts, onOpen: (id) => openMuscu(id, null), onNew: newTemplate, onSettings: openSettings, onAddExercise: addExerciseToTemplate }),
            page === 'muscu' && muscuView && (() => {
                const t = templates.find(x => x.id === muscuView.templateId);
                if (!t)
                    return null;
                return React.createElement(MuscuDetail, { key: t.id, template: t, startEdit: muscuView.edit, onUpdate: updateTemplate, onDelete: () => deleteTemplate(t.id), onBack: () => { const from = muscuView.from; setMuscuView(null); if (from)
                        go('today');
                    else
                        window.scrollTo(0, 0); }, onFinish: () => setSheet({ type: 'finish', templateId: t.id, from: muscuView.from }) });
            })(),
            page === 'map' && React.createElement(MapPage, { icu: icu, conn: icuConn, todayStr: todayStr, onSettings: openSettings }),
            page === 'coach' && React.createElement(CoachPage, { program: program, profile: profile, workouts: workouts, icu: icu, icuConn: icuConn, steps: steps, templates: templates, matches: matches, todayStr: todayStr, onApply: coachApply, onSettings: openSettings }),
            page === 'history' && React.createElement(History, { workouts: workouts, onDelete: deleteWorkout, onSettings: openSettings, onBack: () => go('settings') }),
            page === 'settings' && React.createElement(Settings, { profile: profile, setProfile: setProfile, onBack: () => go(prevPage), onOpenHistory: () => go('history'), onReset: reset, onLoadPlan: loadPlan, onShiftPlan: shiftPlan, getData: () => ({ workouts, program, profile, templates, steps }), onImport: importData, icuConn: icuConn, icu: icu, onConnectIcu: connectIcu, onDisconnectIcu: disconnectIcu, onRefreshIcu: () => refreshIcu() })),
        !onSettingsPage && (page === 'today' || page === 'history') && (React.createElement("div", { className: "fabwrap" },
            React.createElement("div", { className: "fabin" },
                React.createElement("button", { className: "fab", onClick: () => setSheet({ type: 'log' }) },
                    React.createElement(Icon, { name: "plus", size: 20, sw: 2.4 }),
                    " S\u00E9ance")))),
        !onSettingsPage && !inMuscuDetail && (React.createElement("nav", { className: "tabs", "aria-label": "Navigation" },
            React.createElement("div", { className: "tabsin" }, tabs.map(t => (React.createElement("button", { key: t.id, className: "tab" + (page === t.id ? " on" : ""), "aria-current": page === t.id ? 'page' : undefined, onClick: () => go(t.id) },
                React.createElement(Icon, { name: t.icon, size: 23 }),
                t.label)))))),
        sheet && sheet.type === 'log' && React.createElement(LogSheet, { date: page === 'today' ? sel : todayStr, onSave: logWorkout, onClose: () => setSheet(null) }),
        sheet && sheet.type === 'finish' && (() => {
            const t = templates.find(x => x.id === sheet.templateId);
            if (!t)
                return null;
            return React.createElement(FinishSheet, { title: t.name, date: sheet.from ? sessionDate(sheet.from) : todayStr, onSave: (dur, d, extra) => finishMuscu(t, sheet.from, dur, d, extra), onClose: () => setSheet(null) });
        })(),
        sheet && sheet.type === 'workout' && (() => {
            const w = workouts.find(x => x.id === sheet.id);
            if (!w)
                return null;
            return React.createElement(WorkoutSheet, { key: w.id, w: w, onSave: (d) => { setWorkouts(workouts.map(x => x.id === w.id ? { ...x, ...d } : x)); setSheet(null); }, onDelete: () => { deleteWorkout(w); setSheet(null); }, onClose: () => setSheet(null) });
        })(),
        sheet && sheet.type === 'session' && (() => {
            const s = sheet.sid ? program[sheet.wIdx].sessions.find(x => x.id === sheet.sid) : null;
            const initial = s ? { discipline: s.discipline, date: fmt(addDays(weekStartFor(sheet.wIdx), s.day)), desc: s.desc, target: s.target, templateId: s.templateId || '' } : { discipline: 'course', date: sheet.date || todayStr, desc: '', target: '', templateId: '' };
            return React.createElement(SessionSheet, { key: sheet.sid || 'new', isNew: !s, initial: initial, templates: templates, result: s ? resultOf(workouts, s.id) : null, onOpenExercises: (tid) => { setSheet(null); openMuscu(tid, { wIdx: sheet.wIdx, sid: s.id }); }, onSave: (d) => saveSession(sheet.wIdx, sheet.sid, d), onDelete: () => deleteSession(sheet.wIdx, sheet.sid), onClose: () => setSheet(null) });
        })()));
}
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App, null));
