/* ZENITH · personal control room. Plain JS, no build step. */
"use strict";
const $ = id => document.getElementById(id);
const safe = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const TZ = "Asia/Kolkata";
const GH_USER = "inventornext";
const DAY = 86400000;

/* ---------- storage (never throws) ---------- */
const store = {
  get(k, fallback) { try { const v = localStorage.getItem(k); return v == null ? fallback : JSON.parse(v); } catch { return fallback; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  raw(k) { try { return localStorage.getItem(k); } catch { return null; } },
  setRaw(k, v) { try { localStorage.setItem(k, v); } catch {} }
};
const DATA_KEY = "zenith-data-v1", NOTES_KEY = "nexus-notes-v1"; // notes key kept so existing notes survive the redesign
const DEFAULT_DATA = { research: [], projects: [], countdowns: [], habits: ["Writing", "Coding", "Interview prep"], habitLog: {}, trains: [], pomo: {} };
let DATA = Object.assign(structuredClone(DEFAULT_DATA), store.get(DATA_KEY, {}));
const save = () => store.set(DATA_KEY, DATA);
const uid = () => Math.random().toString(36).slice(2, 9);

/* ---------- IST time helpers ---------- */
const fmt = (opts, d = new Date()) => new Intl.DateTimeFormat("en-IN", { timeZone: TZ, ...opts }).format(d);
const istKey = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d); // YYYY-MM-DD
const keyShift = (key, n) => new Date(Date.parse(key + "T00:00:00Z") + n * DAY).toISOString().slice(0, 10);
const daysUntil = key => Math.round((Date.parse(key + "T00:00:00Z") - Date.parse(istKey() + "T00:00:00Z")) / DAY);
const istHour = () => Number(fmt({ hour: "2-digit", hour12: false })) % 24;
const timeIST = d => fmt({ hour: "numeric", minute: "2-digit", hour12: true }, d);
const dayOfYear = () => { const k = istKey(); return Math.floor((Date.parse(k) - Date.parse(k.slice(0, 4) + "-01-01")) / DAY); };
const ago = iso => { const s = (Date.now() - new Date(iso)) / 1000; return s < 3600 ? Math.max(1, Math.round(s / 60)) + "m ago" : s < 86400 ? Math.round(s / 3600) + "h ago" : Math.round(s / 86400) + "d ago"; };

/* ---------- toast + status LEDs ---------- */
let toastTimer;
function toast(msg) { const t = $("toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 2600); }
function led(feed, state) { const el = document.querySelector(`.led[data-feed="${feed}"]`); if (el) el.className = "led " + state; }

/* ---------- clock, greeting, time-of-day phase ---------- */
function tick() {
  const hm = fmt({ hour: "2-digit", minute: "2-digit", hour12: false }), s = fmt({ second: "2-digit" }).padStart(2, "0");
  $("clock").innerHTML = `${hm}<span>:${s}</span>`;
  $("top-clock").textContent = hm + " IST";
  const h = istHour();
  $("greeting").textContent = h < 5 ? "Burning the midnight oil" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  const phase = h >= 5 && h < 8 ? "dawn" : h >= 8 && h < 17 ? "day" : h >= 17 && h < 19 ? "dusk" : "night";
  if (document.body.dataset.phase !== phase) { document.body.dataset.phase = phase; }
  $("phase-label").textContent = phase.toUpperCase() + " SHIFT · IST";
  $("today-label").textContent = fmt({ weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

/* ---------- oscilloscope: 3-phase 50 Hz trace (decorative) ---------- */
function startScope() {
  const cv = $("scope"), ctx = cv.getContext("2d");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let w, h, t0 = performance.now();
  const resize = () => { const r = cv.getBoundingClientRect(), dpr = devicePixelRatio || 1; w = r.width; h = r.height; cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
  new ResizeObserver(resize).observe(cv); resize();
  const draw = now => {
    const acc = getComputedStyle(document.body).getPropertyValue("--acc").trim() || "#3cff9a";
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(120,160,180,.07)"; ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    const mid = h * 0.36, amp = h * 0.2, cycles = 3.2, shift = reduce ? 0 : (now - t0) / 1400;
    const phases = [["rgba(255,90,95,", 0], ["rgba(255,209,102,", 2.094], ["rgba(86,168,255,", 4.189]];
    for (const [col, ph] of phases) trace(col + "0)", col + ".35)", ph, 1.2, mid, amp, cycles, shift);
    trace(hexA(acc, 0), acc, 0, 2.2, mid, amp, cycles, shift, true);
    if (!reduce) requestAnimationFrame(draw);
  };
  function trace(c0, c1, ph, lw, mid, amp, cycles, shift, glow) {
    const g = ctx.createLinearGradient(w * 0.25, 0, w, 0); g.addColorStop(0, c0); g.addColorStop(1, c1);
    ctx.strokeStyle = g; ctx.lineWidth = lw; ctx.shadowBlur = glow ? 12 : 0; ctx.shadowColor = c1;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 3) { const y = mid - amp * Math.sin((x / w) * cycles * 2 * Math.PI - shift * 2 * Math.PI + ph); x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke(); ctx.shadowBlur = 0;
  }
  const hexA = (hex, a) => { const m = hex.replace("#", "").match(/../g); return m ? `rgba(${m.map(x => parseInt(x, 16)).join(",")},${a})` : "rgba(60,255,154,0)"; };
  requestAnimationFrame(draw);
}

/* ---------- Panchang ---------- */
const CITIES = {
  ranchi: { name: "Ranchi", state: "JHARKHAND", lat: 23.3441, lon: 85.3096 },
  kharagpur: { name: "Kharagpur", state: "WEST BENGAL", lat: 22.3460, lon: 87.2320 },
  varanasi: { name: "Varanasi", state: "UTTAR PRADESH", lat: 25.3176, lon: 82.9739 }
};
$("panchang-city").value = store.get("zenith-panchang-city", "kharagpur");
$("panchang-city").addEventListener("change", e => { store.set("zenith-panchang-city", e.target.value); renderPanchang(); });
function renderPanchang() {
  const c = CITIES[$("panchang-city").value] || CITIES.kharagpur, now = new Date();
  const p = Panchang.panchang(now, c.lat, c.lon), m = Panchang.lunarMonth(now);
  const tn = p.tithiNow, ts = p.tithiAtSunrise;
  $("hindu-date").textContent = `${m.adhik ? "Adhik " : ""}${m.name} ${tn.paksha} ${tn.name} · ${p.nakshatraNow.name} nakshatra`;
  $("pc-tithi").textContent = `${tn.paksha} ${tn.name}`;
  $("pc-tithi-end").textContent = `until ${timeIST(p.tithiEnds)}${fmt({ day: "numeric" }, p.tithiEnds) !== fmt({ day: "numeric" }) ? " tomorrow" : ""}` + (ts.index !== tn.index ? ` · sunrise: ${ts.name}` : "");
  $("pc-nak").textContent = p.nakshatraNow.name;
  $("pc-rise").textContent = timeIST(p.sunrise);
  $("pc-set").textContent = timeIST(p.sunset);
  $("pc-rahu").textContent = `${timeIST(p.rahu.start)} – ${timeIST(p.rahu.end)}`;
  const active = now >= p.rahu.start && now < p.rahu.end, past = now >= p.rahu.end;
  $("pc-rahu-box").classList.toggle("active", active);
  $("pc-rahu-state").textContent = active ? "● ACTIVE NOW" : past ? "PASSED" : "in " + Math.round((p.rahu.start - now) / 60000 / 6) / 10 + " h";
  const nexts = {}; for (const x of Panchang.upcomingLunarDays(now, c.lat, c.lon, 32)) { const k = x.label.includes("Ekadashi") ? "Ekadashi" : x.label; if (!nexts[k] && daysUntil(istKey(x.date)) >= 0) nexts[k] = x; }
  $("pc-lunar").innerHTML = ["Purnima", "Amavasya", "Ekadashi"].filter(k => nexts[k]).map(k => { const d = daysUntil(istKey(nexts[k].date)); return `<span>${k} <b>${d === 0 ? "today" : fmt({ day: "numeric", month: "short" }, nexts[k].date)}</b></span>`; }).join("");
}

/* ---------- generic editor dialog ---------- */
let editorSave = null, editorDelete = null;
function openEditor(title, fields, values = {}, onSave, onDelete) {
  $("editor-title").textContent = title;
  $("editor-fields").innerHTML = fields.map(f => {
    const v = safe(values[f.k] ?? f.def ?? "");
    const input = f.type === "select"
      ? `<select class="select" name="${f.k}">${f.options.map(o => `<option${String(values[f.k] ?? f.def) === String(o) ? " selected" : ""}>${safe(o)}</option>`).join("")}</select>`
      : `<input class="input" name="${f.k}" type="${f.type || "text"}" value="${v}"${f.req ? " required" : ""}${f.ph ? ` placeholder="${safe(f.ph)}"` : ""}${f.type === "number" ? ' min="0" max="100"' : ""}>`;
    return `<label>${safe(f.label)}${input}</label>`;
  }).join("");
  editorSave = onSave; editorDelete = onDelete;
  $("editor-delete").style.visibility = onDelete ? "visible" : "hidden";
  $("editor").showModal();
  $("editor-fields").querySelector("input,select")?.focus();
}
$("editor-form").addEventListener("submit", e => {
  e.preventDefault();
  const out = {}; for (const el of $("editor-fields").querySelectorAll("[name]")) out[el.name] = el.value.trim();
  $("editor").close(); editorSave?.(out);
});
$("editor-cancel").addEventListener("click", () => $("editor").close());
$("editor-delete").addEventListener("click", () => { if (confirm("Delete this item?")) { $("editor").close(); editorDelete?.(); } });

/* ---------- festivals (named, 2026–27) ---------- */
// Dates per published 2026/2027 calendars, cross-checked against the tithi engine. Extend for 2028.
const FESTIVALS = [
  ["2026-11-15", "Chhath Puja", "Sandhya arghya"], ["2026-11-20", "Devutthana Ekadashi", "Prabodhini Ekadashi"],
  ["2026-11-21", "Tulsi Vivah", ""], ["2026-11-24", "Kartik Purnima", "Dev Deepawali in Varanasi"],
  ["2026-12-14", "Vivah Panchami", "Sita-Rama wedding"], ["2026-12-20", "Gita Jayanti", "Mokshada Ekadashi"],
  ["2026-12-23", "Dattatreya Jayanti", ""], ["2027-01-13", "Lohri", ""], ["2027-01-14", "Makar Sankranti", "Til-gud, kite day"],
  ["2027-02-11", "Vasant Panchami", "Saraswati Puja"], ["2027-03-06", "Maha Shivratri", ""], ["2027-03-21", "Holika Dahan", ""],
  ["2027-03-22", "Holi", "Rangwali Holi"], ["2027-04-07", "Chaitra Navratri begins", "Hindu New Year, Ugadi"],
  ["2027-04-15", "Ram Navami", ""], ["2027-04-20", "Hanuman Jayanti", ""], ["2027-05-09", "Akshaya Tritiya", ""],
  ["2027-07-05", "Rath Yatra", "Puri"], ["2027-07-18", "Guru Purnima", ""], ["2027-08-17", "Raksha Bandhan", ""],
  ["2027-08-25", "Janmashtami", ""], ["2027-09-04", "Ganesh Chaturthi", ""], ["2027-09-17", "Vishwakarma Puja", ""],
  ["2027-10-01", "Sharad Navratri begins", "Durga Puja season"], ["2027-10-09", "Vijaya Dashami", "Dussehra"],
  ["2027-10-27", "Dhanteras", ""], ["2027-10-29", "Diwali", "Lakshmi Puja"], ["2027-10-31", "Bhai Dooj", ""],
  ["2027-11-04", "Chhath Puja", "Sandhya arghya"], ["2027-12-09", "Gita Jayanti", ""]
];
const upcomingFestivals = n => FESTIVALS.filter(f => daysUntil(f[0]) >= 0).slice(0, n);
function renderFestivals() {
  const up = upcomingFestivals(5);
  $("festival-content").innerHTML = up.map(f => {
    const d = new Date(f[0] + "T12:00:00+05:30"), diff = daysUntil(f[0]);
    return `<div class="festival-item"><div class="festival-date"><b>${fmt({ day: "2-digit" }, d)}</b><small>${fmt({ month: "short" }, d)}</small></div><div class="festival-copy"><strong>${safe(f[1])}</strong><small>${safe(f[2])}</small></div><span class="festival-count">${diff === 0 ? "TODAY" : diff + "d"}</span></div>`;
  }).join("") || `<div class="empty">The built-in list has run out. Add next year's dates to FESTIVALS in app.js.</div>`;
}

/* ---------- countdowns ---------- */
function renderCountdowns() {
  const items = DATA.countdowns.map(c => ({ ...c, days: daysUntil(c.date) })).sort((a, b) => a.days - b.days);
  const fest = upcomingFestivals(1)[0];
  let html = items.map(c => {
    const cls = c.days < 0 ? "" : c.days <= 7 ? "red" : c.days <= 30 ? "amber" : "";
    const label = c.days < 0 ? `<b>${-c.days}</b><small>DAYS AGO</small>` : c.days === 0 ? `<b>0</b><small>TODAY</small>` : `<b>${c.days}</b><small>DAYS</small>`;
    return `<div class="cd ${cls}"><div class="cd-days">${label}</div><div><div class="cd-title">${safe(c.title)}</div><div class="cd-date">${fmt({ weekday: "short", day: "numeric", month: "short", year: "numeric" }, new Date(c.date + "T12:00:00+05:30"))}</div></div><button class="icon-btn" data-edit-cd="${c.id}" aria-label="Edit">✎</button></div>`;
  }).join("");
  if (!items.length) html += `<div class="empty">No countdowns yet. Add deadlines: job applications, paper revisions, exams.</div>`;
  if (fest) { const d = daysUntil(fest[0]); html += `<div class="cd auto"><div class="cd-days"><b>${d}</b><small>${d === 0 ? "TODAY" : "DAYS"}</small></div><div><div class="cd-title">${safe(fest[1])}</div><div class="cd-date">Next festival · automatic</div></div><span></span></div>`; }
  $("countdown-list").innerHTML = html;
}
const CD_FIELDS = [{ k: "title", label: "What", req: true, ph: "e.g. Job application deadline" }, { k: "date", label: "Date", type: "date", req: true }];
$("add-countdown").addEventListener("click", () => openEditor("New countdown", CD_FIELDS, {}, v => { DATA.countdowns.push({ id: uid(), ...v }); save(); renderCountdowns(); toast("Countdown added"); }));
$("countdown-list").addEventListener("click", e => {
  const id = e.target.closest("[data-edit-cd]")?.dataset.editCd; if (!id) return;
  const c = DATA.countdowns.find(x => x.id === id);
  openEditor("Edit countdown", CD_FIELDS, c, v => { Object.assign(c, v); save(); renderCountdowns(); }, () => { DATA.countdowns = DATA.countdowns.filter(x => x.id !== id); save(); renderCountdowns(); });
});

/* ---------- Pomodoro ---------- */
const POMO = { focus: 25, short: 5, long: 15 }, CIRC = 2 * Math.PI * 52;
let pomo = { mode: "focus", remaining: POMO.focus * 60000, running: false, endAt: 0, done: 0 };
function pomoRender() {
  const ms = pomo.running ? Math.max(0, pomo.endAt - Date.now()) : pomo.remaining;
  const m = Math.floor(ms / 60000), s = Math.floor(ms / 1000) % 60, txt = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  $("pomo-time").textContent = txt;
  $("pomo-mode").textContent = pomo.mode === "focus" ? "FOCUS" : pomo.mode === "short" ? "SHORT BREAK" : "LONG BREAK";
  $("pomo-ring").style.strokeDashoffset = CIRC * (1 - ms / (POMO[pomo.mode] * 60000));
  $("pomo-start").textContent = pomo.running ? "❚❚ Pause" : "▶ Start";
  const n = DATA.pomo[istKey()] || 0; $("pomo-count").textContent = `${n} SESSION${n === 1 ? "" : "S"} TODAY`;
  document.title = pomo.running ? `${txt} · ${pomo.mode === "focus" ? "Focus" : "Break"} · ZENITH` : "ZENITH · Personal Control Room";
  if (pomo.running && ms === 0) pomoFinish();
}
function pomoSet(mode) { pomo = { ...pomo, mode, remaining: POMO[mode] * 60000, running: false }; document.querySelectorAll(".pomo-modes .chip").forEach(c => c.classList.toggle("active", c.dataset.mode === mode)); pomoRender(); }
function pomoFinish() {
  pomo.running = false; beep();
  if (pomo.mode === "focus") { const k = istKey(); DATA.pomo = { [k]: (DATA.pomo[k] || 0) + 1 }; save(); pomo.done++; toast("Focus session done. Take a break."); pomoSet(pomo.done % 4 === 0 ? "long" : "short"); }
  else { toast("Break over. Back to work."); pomoSet("focus"); }
}
function beep() { try { const a = new (window.AudioContext || window.webkitAudioContext)(); [0, .35, .7].forEach(t => { const o = a.createOscillator(), g = a.createGain(); o.frequency.value = 880; o.connect(g); g.connect(a.destination); g.gain.setValueAtTime(.0001, a.currentTime + t); g.gain.exponentialRampToValueAtTime(.3, a.currentTime + t + .02); g.gain.exponentialRampToValueAtTime(.0001, a.currentTime + t + .25); o.start(a.currentTime + t); o.stop(a.currentTime + t + .3); }); } catch {} }
$("pomo-start").addEventListener("click", () => { if (pomo.running) { pomo.remaining = Math.max(0, pomo.endAt - Date.now()); pomo.running = false; } else { pomo.endAt = Date.now() + pomo.remaining; pomo.running = true; } pomoRender(); });
$("pomo-reset").addEventListener("click", () => pomoSet(pomo.mode));
document.querySelector(".pomo-modes").addEventListener("click", e => { const m = e.target.closest("[data-mode]")?.dataset.mode; if (m) pomoSet(m); });
$("pomo-ring").style.strokeDasharray = CIRC;

/* ---------- habits ---------- */
function streakFor(h) {
  const log = DATA.habitLog; let k = istKey(), n = 0;
  if (!log[k]?.[h]) k = keyShift(k, -1);
  while (log[k]?.[h]) { n++; k = keyShift(k, -1); }
  return n;
}
function renderHabits() {
  const today = istKey(), keys = [...Array(7)].map((_, i) => keyShift(today, i - 6));
  $("habit-days").innerHTML = `<span></span>` + keys.map(k => `<span>${new Date(k + "T12:00:00Z").toLocaleDateString("en-IN", { weekday: "narrow" })}</span>`).join("") + `<span>STREAK</span>`;
  $("habit-list").innerHTML = DATA.habits.map((h, i) => `<div class="habit"><div class="habit-name"><span title="${safe(h)}">${safe(h)}</span><button class="icon-btn" data-del-habit="${i}" aria-label="Remove habit">×</button></div>${keys.map(k => `<button class="dot${DATA.habitLog[k]?.[h] ? " on" : ""}${k === today ? " today" : ""}" data-h="${i}" data-k="${k}" aria-label="${safe(h)} on ${k}"></button>`).join("")}<div class="streak">${streakFor(h)}<small>d</small></div></div>`).join("") || `<div class="empty">Add a habit to start a streak.</div>`;
}
$("habit-list").addEventListener("click", e => {
  const dot = e.target.closest(".dot");
  if (dot) { const h = DATA.habits[dot.dataset.h], k = dot.dataset.k; DATA.habitLog[k] = DATA.habitLog[k] || {}; DATA.habitLog[k][h] = !DATA.habitLog[k][h]; save(); renderHabits(); return; }
  const del = e.target.closest("[data-del-habit]");
  if (del && confirm(`Remove "${DATA.habits[del.dataset.delHabit]}"?`)) { DATA.habits.splice(del.dataset.delHabit, 1); save(); renderHabits(); }
});
$("add-habit").addEventListener("click", () => openEditor("New habit", [{ k: "name", label: "Habit", req: true, ph: "e.g. Read 10 pages" }], {}, v => { if (!DATA.habits.includes(v.name)) DATA.habits.push(v.name); save(); renderHabits(); }));

/* ---------- research tracker ---------- */
const STATUS = { "Planning": "grey", "Drafting": "grey", "Submitted": "cyan", "Under review": "cyan", "Revision": "amber", "Revision submitted": "cyan", "Decision in process": "violet", "Accepted": "green", "Published": "green", "Rejected": "red", "Retargeting": "amber" };
const PAPER_FIELDS = [
  { k: "title", label: "Paper", req: true }, { k: "journal", label: "Journal" },
  { k: "status", label: "Status", type: "select", options: Object.keys(STATUS), def: "Under review" },
  { k: "since", label: "Current status since", type: "date" }, { k: "note", label: "Note" }
];
function renderResearch() {
  const order = ["Accepted", "Decision in process", "Revision", "Revision submitted", "Under review", "Submitted", "Retargeting", "Drafting", "Planning", "Published", "Rejected"];
  const rank = st => { const i = order.indexOf(st); return i < 0 ? 99 : i; };
  const rows = [...DATA.research].sort((a, b) => rank(a.status) - rank(b.status));
  $("research-table").querySelector("tbody").innerHTML = rows.map(p => {
    const d = p.since ? -daysUntil(p.since) : null;
    return `<tr><td><span class="title">${safe(p.title)}</span>${p.note ? `<span class="note">${safe(p.note)}</span>` : ""}</td><td class="journal">${safe(p.journal || "—")}</td><td><span class="pill ${STATUS[p.status] || "grey"}">${safe(p.status)}</span></td><td class="num">${d == null || ["Published"].includes(p.status) ? "—" : d}</td><td><button class="icon-btn" data-edit-paper="${p.id}" aria-label="Edit">✎</button></td></tr>`;
  }).join("") || `<tr><td colspan="5"><div class="empty">No papers yet. Add one, or use Import in the footer.</div></td></tr>`;
}
$("add-paper").addEventListener("click", () => openEditor("New paper", PAPER_FIELDS, { since: istKey() }, v => { DATA.research.push({ id: uid(), ...v }); save(); renderResearch(); }));
$("research-table").addEventListener("click", e => {
  const id = e.target.closest("[data-edit-paper]")?.dataset.editPaper; if (!id) return;
  const p = DATA.research.find(x => x.id === id), prev = p.status;
  openEditor("Edit paper", PAPER_FIELDS, p, v => { if (v.status !== prev && v.since === p.since) v.since = istKey(); Object.assign(p, v); save(); renderResearch(); }, () => { DATA.research = DATA.research.filter(x => x.id !== id); save(); renderResearch(); });
});

/* ---------- projects board ---------- */
const STAGES = ["Idea", "Building", "Polishing", "Live"];
const PROJ_FIELDS = [
  { k: "name", label: "Name", req: true }, { k: "kind", label: "Type", type: "select", options: ["App", "Game", "Book", "Site"], def: "App" },
  { k: "stage", label: "Stage", type: "select", options: STAGES, def: "Building" }, { k: "note", label: "Next step / note" }, { k: "link", label: "Link (optional)", type: "url" }
];
let projKind = "all";
function renderProjects() {
  const list = DATA.projects.filter(p => projKind === "all" || p.kind === projKind).sort((a, b) => STAGES.indexOf(b.stage) - STAGES.indexOf(a.stage));
  $("project-list").innerHTML = list.map(p => {
    const s = STAGES.indexOf(p.stage);
    const name = p.link && /^https?:\/\//.test(p.link) ? `<a href="${safe(p.link)}" target="_blank" rel="noopener noreferrer">${safe(p.name)} ↗</a>` : safe(p.name);
    return `<div class="proj"><div class="proj-top"><span class="proj-name">${name}</span><span class="kind">${safe(p.kind).toUpperCase()}</span><button class="icon-btn" data-edit-proj="${p.id}" aria-label="Edit">✎</button></div><div class="stages">${STAGES.map((_, i) => `<i class="${i <= s ? "on" : ""}"></i>`).join("")}</div><div class="stage-labels">${STAGES.map((l, i) => `<span class="${i === s ? "on" : ""}">${l.toUpperCase()}</span>`).join("")}</div>${p.note ? `<div class="proj-note">${safe(p.note)}</div>` : ""}</div>`;
  }).join("") || `<div class="empty">No projects here yet.</div>`;
}
$("project-tabs").addEventListener("click", e => { const k = e.target.closest("[data-kind]")?.dataset.kind; if (!k) return; projKind = k; document.querySelectorAll("#project-tabs .tab").forEach(t => t.classList.toggle("active", t.dataset.kind === k)); renderProjects(); });
$("add-project").addEventListener("click", () => openEditor("New project", PROJ_FIELDS, {}, v => { DATA.projects.push({ id: uid(), ...v }); save(); renderProjects(); }));
$("project-list").addEventListener("click", e => {
  const id = e.target.closest("[data-edit-proj]")?.dataset.editProj; if (!id) return;
  const p = DATA.projects.find(x => x.id === id);
  openEditor("Edit project", PROJ_FIELDS, p, v => { Object.assign(p, v); save(); renderProjects(); }, () => { DATA.projects = DATA.projects.filter(x => x.id !== id); save(); renderProjects(); });
});

/* ---------- GitHub ---------- */
async function ghFetch(path) { const r = await fetch("https://api.github.com" + path, { headers: { Accept: "application/vnd.github+json" } }); if (!r.ok) throw Error(r.status); return r.json(); }
async function loadGitHub(force) {
  led("gh", "busy");
  let c = store.get("zenith-gh-cache", null);
  try {
    if (force || !c || Date.now() - c.t > 15 * 60000) {
      const [user, repos] = await Promise.all([ghFetch(`/users/${GH_USER}`), ghFetch(`/users/${GH_USER}/repos?sort=pushed&per_page=6`)]);
      let events = [];
      for (let page = 1; page <= 3; page++) { const ev = await ghFetch(`/users/${GH_USER}/events/public?per_page=100&page=${page}`); events = events.concat(ev.map(e => ({ type: e.type, at: e.created_at, n: e.type === "PushEvent" ? (e.payload?.size ?? e.payload?.distinct_size ?? 1) : 1 }))); if (ev.length < 100) break; }
      c = { t: Date.now(), user: { repos: user.public_repos, followers: user.followers }, repos: repos.map(r => ({ name: r.name, url: r.html_url, lang: r.language, pushed: r.pushed_at, stars: r.stargazers_count, desc: r.description })), events };
      store.set("zenith-gh-cache", c);
    }
    renderGitHub(c); led("gh", "ok");
  } catch {
    if (c) { renderGitHub(c); led("gh", "warn"); $("gh-updated").textContent = "CACHED · API LIMIT"; }
    else { led("gh", "err"); $("gh-repos").textContent = "GitHub API unavailable right now (60 requests/hour limit). Try again later."; }
  }
}
function renderGitHub(c) {
  const today = istKey(), counts = {};
  let commits = 0;
  for (const e of c.events) { const k = istKey(new Date(e.at)); counts[k] = (counts[k] || 0) + e.n; if (e.type === "PushEvent") commits += e.n; }
  const dow = new Date(today + "T12:00:00Z").getUTCDay(), start = keyShift(today, -(7 * 11 + dow));
  let cells = "", active = 0;
  for (let i = 0; i < 84; i++) {
    const k = keyShift(start, i), n = counts[k] || 0, future = k > today;
    if (n && !future) active++;
    const l = n === 0 ? 0 : n <= 2 ? 1 : n <= 5 ? 2 : n <= 9 ? 3 : 4;
    cells += `<i data-l="${l}" title="${k}: ${n} event${n === 1 ? "" : "s"}"${future ? ' style="visibility:hidden"' : ""}></i>`;
  }
  $("gh-heatmap").innerHTML = cells;
  $("gh-stats").innerHTML = [["REPOS", c.user.repos], ["FOLLOWERS", c.user.followers], ["COMMITS · 12W", commits], ["ACTIVE DAYS", active]].map(([l, v]) => `<div><b>${v ?? "—"}</b><span>${l}</span></div>`).join("");
  $("gh-repos").innerHTML = c.repos.map(r => `<div class="repo"><div><a href="${safe(r.url)}" target="_blank" rel="noopener noreferrer">${safe(r.name)}</a>${r.lang ? ` <small class="lang">${safe(r.lang)}</small>` : ""}</div><small>${r.stars ? "★" + r.stars + " · " : ""}${ago(r.pushed)}</small></div>`).join("") || "No public repositories.";
  $("gh-updated").textContent = "UPDATED " + new Date(c.t).toLocaleTimeString("en-IN", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
}

/* ---------- RSS (two routes, so one outage doesn't blank the panel) ---------- */
async function fetchRSS(url) {
  try {
    const r = await fetch("https://api.rss2json.com/v1/api.json?rss_url=" + encodeURIComponent(url));
    const d = await r.json();
    if (d.status === "ok" && d.items?.length) return d.items.map(i => ({ title: i.title, link: i.link, date: i.pubDate, source: i.author }));
    throw Error();
  } catch {
    const r = await fetch("https://api.allorigins.win/raw?url=" + encodeURIComponent(url));
    if (!r.ok) throw Error("rss");
    const xml = new DOMParser().parseFromString(await r.text(), "text/xml");
    const items = [...xml.querySelectorAll("item")].map(i => ({ title: i.querySelector("title")?.textContent, link: i.querySelector("link")?.textContent, date: i.querySelector("pubDate")?.textContent, source: i.querySelector("source")?.textContent }));
    if (!items.length) throw Error("empty");
    return items;
  }
}
const gnews = q => "https://news.google.com/rss/search?q=" + encodeURIComponent(q) + "&hl=en-IN&gl=IN&ceid=IN:en";
function splitSource(it) { let t = it.title || "", s = it.source; const i = t.lastIndexOf(" - "); if (i > 20) { s = s || t.slice(i + 3); t = t.slice(0, i); } return { ...it, title: t, source: s || "Google News" }; }

/* ---------- news ---------- */
const FEEDS = {
  india: "India news when:1d", ranchi: "Ranchi Jharkhand when:2d", kharagpur: "Kharagpur OR \"IIT Kharagpur\" when:3d",
  varanasi: "Varanasi when:2d", world: "World news when:1d", technology: "technology artificial intelligence when:1d",
  energy: "India power sector electricity grid renewable when:2d"
};
let newsFeed = "india";
async function loadNews(feed = newsFeed) {
  newsFeed = feed;
  document.querySelectorAll("#news-tabs .tab").forEach(b => b.classList.toggle("active", b.dataset.feed === feed));
  const cacheKey = "zenith-news-" + feed, cached = store.get(cacheKey, null);
  if (cached) renderNews(cached.items, cached.t, true); else $("news-list").textContent = "Fetching headlines…";
  led("news", "busy");
  try {
    const items = (await fetchRSS(gnews(FEEDS[feed]))).slice(0, 10).map(splitSource);
    store.set(cacheKey, { t: Date.now(), items }); if (feed === newsFeed) renderNews(items, Date.now(), false); led("news", "ok");
  } catch {
    led("news", cached ? "warn" : "err");
    if (!cached) $("news-list").innerHTML = 'Headlines are unavailable right now. <a href="https://news.google.com/" target="_blank" rel="noopener noreferrer">Open Google News ↗</a>';
  }
}
function renderNews(items, t, stale) {
  $("news-list").innerHTML = items.map((it, i) => { const d = it.date ? new Date(it.date) : null, when = d && !isNaN(d) ? d.toLocaleString("en-IN", { timeZone: TZ, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""; return `<div class="news-item"><span class="news-index">${String(i + 1).padStart(2, "0")}</span><div><a href="${safe(it.link)}" target="_blank" rel="noopener noreferrer">${safe(it.title)}</a><div class="news-meta">${safe(it.source)}${when ? " · " + when : ""}</div></div></div>`; }).join("");
  $("news-updated").textContent = (stale ? "CACHED " : "UPDATED ") + new Date(t).toLocaleTimeString("en-IN", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
}
$("news-tabs").addEventListener("click", e => { const b = e.target.closest("[data-feed]"); if (b) loadNews(b.dataset.feed); });

/* ---------- cricket ---------- */
async function loadCricket() {
  led("cric", "busy");
  try {
    const items = (await fetchRSS("https://static.cricinfo.com/rss/livescores.xml")).slice(0, 6);
    $("cric-list").innerHTML = items.map(i => `<div class="feed-item"><a href="${safe(i.link)}" target="_blank" rel="noopener noreferrer">${safe(i.title)}</a></div>`).join("");
    $("cric-source").textContent = "ESPNCRICINFO · LIVE"; led("cric", "ok");
  } catch {
    try {
      const items = (await fetchRSS(gnews("cricket score when:1d"))).slice(0, 5).map(splitSource);
      $("cric-list").innerHTML = items.map(i => `<div class="feed-item"><a href="${safe(i.link)}" target="_blank" rel="noopener noreferrer">${safe(i.title)}</a></div>`).join("");
      $("cric-source").textContent = "HEADLINES"; led("cric", "warn");
    } catch { $("cric-list").textContent = "Scores unavailable right now."; led("cric", "err"); }
  }
}

/* ---------- trains ---------- */
const trainUrl = n => `https://www.railyatri.in/live-train-status/${encodeURIComponent(n)}`;
function renderTrains() {
  $("train-list").innerHTML = DATA.trains.map((t, i) => `<div class="train"><b>${safe(t.no)}</b><span>${safe(t.name || "")}</span><a href="${trainUrl(t.no)}" target="_blank" rel="noopener noreferrer">LIVE ↗</a><button class="icon-btn" data-del-train="${i}" aria-label="Remove">×</button></div>`).join("") || `<div class="muted-small">Save the trains you take often. Enter a number and press Live status.</div>`;
}
$("train-form").addEventListener("submit", e => {
  e.preventDefault(); const no = $("train-no").value.trim(); if (!/^\d{5}$/.test(no)) { toast("Enter a 5-digit train number"); return; }
  window.open(trainUrl(no), "_blank", "noopener");
  if (!DATA.trains.some(t => t.no === no)) { const name = prompt("Save this train? Give it a name (optional), or Cancel to skip.", ""); if (name !== null) { DATA.trains.push({ no, name }); save(); renderTrains(); } }
  $("train-no").value = "";
});
$("train-list").addEventListener("click", e => { const b = e.target.closest("[data-del-train]"); if (b) { DATA.trains.splice(b.dataset.delTrain, 1); save(); renderTrains(); } });

/* ---------- weather ---------- */
const WX = {}, CODES = { 0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast", 45: "Fog", 48: "Rime fog", 51: "Light drizzle", 53: "Drizzle", 55: "Dense drizzle", 56: "Freezing drizzle", 57: "Freezing drizzle", 61: "Light rain", 63: "Rain", 65: "Heavy rain", 66: "Freezing rain", 67: "Freezing rain", 71: "Light snow", 73: "Snow", 75: "Heavy snow", 77: "Snow grains", 80: "Rain showers", 81: "Rain showers", 82: "Heavy showers", 85: "Snow showers", 86: "Snow showers", 95: "Thunderstorm", 96: "Thunderstorm, hail", 99: "Severe thunderstorm" };
const wxIcon = (c, day = 1) => c <= 1 ? (day ? "☀" : "☾") : c <= 3 ? "☁" : c === 45 || c === 48 ? "≋" : c >= 95 ? "ϟ" : [71, 73, 75, 77, 85, 86].includes(c) ? "❄" : "☂";
const compass = d => d == null ? "—" : ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(d / 45) % 8];
const aqiClass = a => a <= 50 ? "good" : a <= 100 ? "mod" : a <= 150 ? "usg" : "bad";
let wxCity = "ranchi";
function buildWeatherCards() {
  $("weather-cards").innerHTML = Object.entries(CITIES).map(([k, c]) => `<article class="panel wx-card" id="wx-${k}"><div class="wx-top"><div><div class="eyebrow">${c.state}</div><h2>${c.name}</h2></div><span class="wx-sym" data-f="icon">◌</span></div><div class="wx-main"><span class="wx-temp" data-f="temp">--°</span><div><div class="wx-desc" data-f="desc">Loading…</div><div class="wx-feels" data-f="feels"></div></div></div><div class="wx-stats" data-f="stats"></div><div class="wx-details" data-f="details"></div><div class="wx-foot"><button class="text-button" data-toggle="${k}">Details ▾</button><span class="aqi" data-f="aqi">AQI --</span></div></article>`).join("");
  $("weather-cards").addEventListener("click", e => { const k = e.target.closest("[data-toggle]")?.dataset.toggle; if (k) { const card = $("wx-" + k); card.classList.toggle("open"); e.target.textContent = card.classList.contains("open") ? "Less ▴" : "Details ▾"; } });
}
async function fetchWeather(k, c) {
  const q = new URLSearchParams({ latitude: c.lat, longitude: c.lon, timezone: TZ, forecast_days: "7", forecast_hours: "24",
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index,visibility,is_day",
    hourly: "temperature_2m,precipitation_probability,weather_code,is_day", daily: "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max,wind_speed_10m_max" });
  const r = await fetch("https://api.open-meteo.com/v1/forecast?" + q); if (!r.ok) throw Error("wx");
  const d = await r.json(); WX[k] = d;
  const x = d.current, card = $("wx-" + k), f = n => card.querySelector(`[data-f="${n}"]`);
  f("icon").textContent = wxIcon(x.weather_code, x.is_day ?? 1); f("temp").textContent = Math.round(x.temperature_2m) + "°";
  f("desc").textContent = CODES[x.weather_code] || "—";
  f("feels").textContent = `Feels ${Math.round(x.apparent_temperature)}° · ${Math.round(d.daily.temperature_2m_max[0])}° / ${Math.round(d.daily.temperature_2m_min[0])}°`;
  const box = arr => arr.map(([l, v]) => `<div><span>${l}</span><b>${v}</b></div>`).join("");
  f("stats").innerHTML = box([["HUMIDITY", x.relative_humidity_2m + "%"], ["WIND", Math.round(x.wind_speed_10m) + " km/h"], ["RAIN", (x.precipitation ?? 0) + " mm"], ["UV", Number(x.uv_index).toFixed(1)]]);
  const t = s => new Date(s).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  f("details").innerHTML = box([["PRESSURE", Math.round(x.pressure_msl) + " hPa"], ["VISIBILITY", (x.visibility / 1000).toFixed(1) + " km"], ["CLOUD", x.cloud_cover + "%"], ["GUSTS", Math.round(x.wind_gusts_10m) + " km/h"], ["DIRECTION", compass(x.wind_direction_10m)], ["SUNRISE", t(d.daily.sunrise[0])], ["SUNSET", t(d.daily.sunset[0])], ["RAIN CHANCE", (d.daily.precipitation_probability_max[0] ?? 0) + "%"]]);
  try {
    const a = await (await fetch("https://air-quality-api.open-meteo.com/v1/air-quality?" + new URLSearchParams({ latitude: c.lat, longitude: c.lon, current: "us_aqi", timezone: TZ }))).json();
    const v = a.current?.us_aqi; f("aqi").textContent = v == null ? "AQI —" : "AQI " + Math.round(v); f("aqi").className = "aqi " + (v == null ? "" : aqiClass(v));
  } catch { f("aqi").textContent = "AQI —"; }
}
async function loadWeather() {
  led("wx", "busy");
  const res = await Promise.allSettled(Object.entries(CITIES).map(([k, c]) => fetchWeather(k, c).catch(err => { $("wx-" + k).querySelector('[data-f="desc"]').textContent = "Weather unavailable"; throw err; })));
  const fails = res.filter(r => r.status === "rejected").length;
  led("wx", fails === 0 ? "ok" : fails === 3 ? "err" : "warn");
  $("wx-updated").textContent = "UPDATED " + fmt({ hour: "2-digit", minute: "2-digit" });
  renderForecast();
}
function renderForecast() {
  const d = WX[wxCity]; if (!d) return;
  const now = Date.now(); let s = d.hourly.time.findIndex(t => new Date(t + ":00+05:30").getTime() >= now - 3600000); if (s < 0) s = 0;
  $("wx-hourly").innerHTML = d.hourly.time.slice(s, s + 12).map((t, j) => { const i = s + j; return `<div class="hour-cell"><span>${j === 0 ? "NOW" : new Date(t + ":00+05:30").toLocaleTimeString("en-IN", { timeZone: TZ, hour: "numeric", hour12: true }).toUpperCase()}</span><i>${wxIcon(d.hourly.weather_code[i], d.hourly.is_day?.[i] ?? 1)}</i><b>${Math.round(d.hourly.temperature_2m[i])}°</b><small>${d.hourly.precipitation_probability[i] ?? 0}%</small></div>`; }).join("");
  $("wx-daily").innerHTML = d.daily.time.map((t, i) => { const dt = new Date(t + "T12:00:00+05:30"); return `<div class="forecast-day"><span>${i === 0 ? "TODAY" : dt.toLocaleDateString("en-IN", { timeZone: TZ, weekday: "short" }).toUpperCase()}</span><b>${wxIcon(d.daily.weather_code[i])}</b><strong>${Math.round(d.daily.temperature_2m_max[i])}° <em>${Math.round(d.daily.temperature_2m_min[i])}°</em></strong><div class="temp-bar"></div><small>${d.daily.precipitation_probability_max[i] ?? 0}% rain</small><small>${Math.round(d.daily.wind_speed_10m_max[i])} km/h</small></div>`; }).join("");
}
$("wx-tabs").addEventListener("click", e => { const k = e.target.closest("[data-city]")?.dataset.city; if (!k) return; wxCity = k; document.querySelectorAll("#wx-tabs .tab").forEach(t => t.classList.toggle("active", t.dataset.city === k)); renderForecast(); });

/* ---------- notepad ---------- */
const notes = $("notes"); notes.value = store.raw(NOTES_KEY) || "";
let notesSavedAt = null;
function updateNotes() { const v = notes.value, w = v.trim() ? v.trim().split(/\s+/).length : 0; $("notes-count").textContent = `${w} words · ${v.length} chars`; }
function notesStatus() { if (!notesSavedAt) return; const s = (Date.now() - notesSavedAt) / 1000; $("notes-status").textContent = s < 10 ? "Saved just now" : s < 60 ? "Saved " + Math.round(s) + "s ago" : "Saved " + Math.round(s / 60) + " min ago"; }
notes.addEventListener("input", () => { store.setRaw(NOTES_KEY, notes.value); notesSavedAt = Date.now(); notesStatus(); updateNotes(); });
$("notepad-clear").addEventListener("click", () => { if (confirm("Clear all text in your notepad?")) { notes.value = ""; store.setRaw(NOTES_KEY, ""); updateNotes(); toast("Notepad cleared"); } });
$("notepad-download").addEventListener("click", () => { const a = document.createElement("a"), u = URL.createObjectURL(new Blob([notes.value], { type: "text/plain;charset=utf-8" })); a.href = u; a.download = `notes-${istKey()}.txt`; a.click(); setTimeout(() => URL.revokeObjectURL(u), 1000); toast("Notes downloaded"); });

/* ---------- daily intelligence ---------- */
async function loadHistory() {
  const [y, m, d] = istKey().split("-"), month = new Date(`${y}-${m}-15T12:00:00Z`).toLocaleString("en-US", { month: "long" });
  $("history-link").href = `https://en.wikipedia.org/wiki/${month}_${Number(d)}`; // unpadded day, e.g. November_5
  try {
    const r = await fetch(`https://en.wikipedia.org/api/rest_v1/feed/onthisday/events/${m}/${d}`); if (!r.ok) throw Error();
    const data = await r.json();
    $("history-content").innerHTML = (data.events || []).slice(0, 5).map(x => `<div class="history-event"><b>${x.year}</b><span>${safe(x.text)}</span></div>`).join("") || "No events returned.";
    return true;
  } catch { $("history-content").textContent = "History feed unavailable right now."; return false; }
}
const QUOTES = [
  ["If I have seen further it is by standing on the shoulders of giants.", "Isaac Newton"],
  ["Arise, awake, and stop not till the goal is reached.", "Swami Vivekananda"],
  ["Nothing in life is to be feared; it is only to be understood.", "Marie Curie"],
  ["The best way to predict the future is to invent it.", "Alan Kay"],
  ["Simplicity is prerequisite for reliability.", "Edsger W. Dijkstra"],
  ["Great things are done by a series of small things brought together.", "Vincent van Gogh"],
  ["Any sufficiently advanced technology is indistinguishable from magic.", "Arthur C. Clarke"],
  ["Talk is cheap. Show me the code.", "Linus Torvalds"],
  ["The important thing is to never stop questioning.", "Albert Einstein"],
  ["Well done is better than well said.", "Benjamin Franklin"],
  ["Premature optimization is the root of all evil.", "Donald Knuth"],
  ["You have a right to your actions, but never to the fruits of your actions.", "Bhagavad Gita 2.47"],
  ["It always seems impossible until it's done.", "Nelson Mandela"],
  ["Imagination is more important than knowledge.", "Albert Einstein"],
  ["Learning never exhausts the mind.", "Leonardo da Vinci"],
  ["The future depends on what you do today.", "Mahatma Gandhi"],
  ["Genius is one percent inspiration and ninety-nine percent perspiration.", "Thomas Edison"],
  ["Dream is not that which you see while sleeping; it is something that does not let you sleep.", "A. P. J. Abdul Kalam"]
];
let quoteIdx = dayOfYear() % QUOTES.length;
function showQuote() { const q = QUOTES[quoteIdx % QUOTES.length]; $("quote-text").textContent = "“" + q[0] + "”"; $("quote-author").textContent = "— " + q[1]; }
$("new-quote").addEventListener("click", () => { quoteIdx++; showQuote(); });
async function loadDiscovery(force) {
  const today = istKey(), c = store.get("zenith-topic", null);
  const show = t => { $("discovery-title").textContent = t.title; $("discovery-summary").textContent = (t.extract || "").slice(0, 380); $("discovery-link").href = t.url; };
  if (!force && c && c.day === today) { show(c); return true; }
  try {
    const r = await fetch("https://en.wikipedia.org/api/rest_v1/page/random/summary"); if (!r.ok) throw Error();
    const d = await r.json(), t = { day: today, title: d.title, extract: d.extract, url: d.content_urls?.desktop?.page || "https://en.wikipedia.org/wiki/Special:Random" };
    store.set("zenith-topic", t); show(t); return true;
  } catch { if (c) show(c); else { $("discovery-title").textContent = "Unavailable"; $("discovery-summary").textContent = "Try again later."; } return false; }
}
$("new-discovery").addEventListener("click", () => loadDiscovery(true));
async function loadWiki() { led("wiki", "busy"); const [a, b] = await Promise.all([loadHistory(), loadDiscovery()]); led("wiki", a && b ? "ok" : a || b ? "warn" : "err"); }

/* ---------- export / import ---------- */
$("export-data").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify({ ...DATA, notes: notes.value, exported: new Date().toISOString() }, null, 2)], { type: "application/json" });
  const a = document.createElement("a"), u = URL.createObjectURL(blob); a.href = u; a.download = `zenith-backup-${istKey()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(u), 1000); toast("Backup downloaded");
});
$("import-file").addEventListener("change", async e => {
  const file = e.target.files[0]; if (!file) return;
  try {
    const d = JSON.parse(await file.text());
    if (typeof d !== "object" || Array.isArray(d)) throw Error();
    for (const k of Object.keys(DEFAULT_DATA)) if (d[k] !== undefined) DATA[k] = d[k];
    for (const k of ["research", "projects", "countdowns"]) DATA[k] = (DATA[k] || []).map(x => ({ id: x.id || uid(), ...x }));
    if (typeof d.notes === "string" && (!notes.value || confirm("Replace your current notepad text with the imported notes?"))) { notes.value = d.notes; store.setRaw(NOTES_KEY, d.notes); updateNotes(); }
    save(); renderAllLocal(); toast("Data imported");
  } catch { toast("That file isn't a valid ZENITH data file"); }
  e.target.value = "";
});

/* ---------- boot ---------- */
function renderAllLocal() { renderCountdowns(); renderHabits(); renderResearch(); renderProjects(); renderTrains(); renderFestivals(); pomoRender(); }
async function refresh(force) {
  const b = $("refresh-all"); b.disabled = true; b.textContent = "Refreshing…";
  await Promise.allSettled([loadWeather(), loadNews(), loadWiki(), loadGitHub(force), loadCricket()]);
  b.disabled = false; b.textContent = "↻ Refresh";
}
$("refresh-all").addEventListener("click", () => refresh(true));
$("daily-date").textContent = fmt({ weekday: "long", day: "numeric", month: "long" }).toUpperCase();

tick(); setInterval(tick, 1000);
startScope();
renderPanchang(); setInterval(renderPanchang, 60000);
buildWeatherCards(); updateNotes(); showQuote(); renderAllLocal();
setInterval(pomoRender, 500);
setInterval(notesStatus, 15000);
let lastDay = istKey(); setInterval(() => { if (istKey() !== lastDay) { lastDay = istKey(); renderAllLocal(); quoteIdx = dayOfYear() % QUOTES.length; showQuote(); loadWiki(); } }, 60000);
refresh(false);
setInterval(loadWeather, 15 * 60000);
setInterval(() => loadNews(), 30 * 60000);
setInterval(loadCricket, 5 * 60000);
