"use strict";
const $ = (id) => document.getElementById(id);
const rs = (n) => "Rs " + Number(n).toLocaleString("en-IN");
const store = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v === null ? d : v; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

/* ================= DEMO DATA (not live prices) ================= */
const MANDIS = {
  Paddy:  [["Warangal","Warangal",2250],["Nizamabad","Nizamabad",2310],["Karimnagar","Karimnagar",2280],["Hyderabad (Bowenpally)","Hyderabad",2200]],
  Cotton: [["Adilabad","Adilabad",7050],["Warangal","Warangal",7120],["Khammam","Khammam",6980],["Hyderabad (Bowenpally)","Hyderabad",6900]],
  Maize:  [["Nizamabad","Nizamabad",2150],["Karimnagar","Karimnagar",2120],["Warangal","Warangal",2090],["Hyderabad (Bowenpally)","Hyderabad",2050]],
  Tomato: [["Hyderabad (Bowenpally)","Hyderabad",1800],["Warangal","Warangal",1650],["Karimnagar","Karimnagar",1700],["Khammam","Khammam",1600]],
  Chilli: [["Khammam","Khammam",15200],["Warangal","Warangal",14800],["Hyderabad (Bowenpally)","Hyderabad",14500],["Guntur (AP)","Guntur",15600]],
  Onion:  [["Hyderabad (Bowenpally)","Hyderabad",2100],["Kurnool (AP)","Kurnool",2250],["Warangal","Warangal",1950],["Nizamabad","Nizamabad",1900]],
};
const VEH = { tractor: 1, truck: 1.3, lorry: 1.6 };

function calc(crop, qty, district, veh = "tractor", maxKm = 999) {
  const rows = [];
  for (const [mandi, d, price] of MANDIS[crop]) {
    const km = d.toLowerCase() === (district || "").trim().toLowerCase() ? 20 : 90;
    if (km > maxKm) continue;
    const transport = Math.round((km * 6 + qty * km * 0.15) * (VEH[veh] || 1));
    const gross = Math.round(price * qty);
    rows.push({ mandi, price, distance_km: km, gross, transport, net: gross - transport });
  }
  return rows.sort((a, b) => b.net - a.net);
}
function rng(seed) {                       // seeded random: same chart every visit
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) { h = Math.imul(h ^ seed.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = h >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const bestPrice = (crop) => Math.max(...MANDIS[crop].map((m) => m[2]));
function candles(crop, n) {
  const r = rng(crop), u = (a, b) => a + (b - a) * r();
  let p = bestPrice(crop) * 0.92; const out = [];
  for (let i = 0; i < 90; i++) {
    const o = p, c = o * (1 + u(-0.035, 0.04) + 0.002);
    out.push([o, Math.max(o, c) * (1 + u(0, 0.015)), Math.min(o, c) * (1 - u(0, 0.015)), c]); p = c;
  }
  const k = bestPrice(crop) / out[89][3];
  return out.slice(-n).map((row) => row.map((x) => Math.round(x * k)));
}
function marketItems() {
  return Object.keys(MANDIS).map((crop) => {
    const c = candles(crop, 90);
    return { crop, price: c[89][3], chg: (c[89][3] / c[88][3] - 1) * 100, spark: c.slice(-20).map((x) => x[3]) };
  });
}
function assistantReply(q, user) {
  q = q.toLowerCase();
  for (const crop of Object.keys(MANDIS)) if (q.includes(crop.toLowerCase())) {
    const b = calc(crop, 10, user.district)[0];
    return `For 10 quintals of ${crop}, ${b.mandi} gives the best take-home: about ${rs(b.net)} after transport (price ${rs(b.price)}/quintal). Use the comparison tool for your exact quantity. Prices are demo data.`;
  }
  if (/\b(hello|hi|namaste)\b/.test(q)) return `Namaste ${user.name}! Ask me which mandi is best for paddy, cotton, maize, tomato, chilli or onion.`;
  if (q.includes("transport")) return "Transport is estimated from distance, quantity and vehicle. Same-district mandis count as 20 km, others as 90 km.";
  if (q.includes("weather") || q.includes("rain")) return "Weather is not connected yet. Check the IMD Mausam app before harvest or transport.";
  return "I can compare mandi prices for paddy, cotton, maize, tomato, chilli and onion. Try: 'best mandi for cotton'.";
}

/* ================= ACCOUNTS (browser storage, demo only) ================= */
async function hash(s) {
  if (!(window.crypto && crypto.subtle)) return btoa(s);
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
const users = () => store.get("sm_users", []);
const currentUser = () => users().find((u) => u.phone === store.get("sm_session", null)) || null;
function flash(msg, type = "error") {
  const box = $("flash"); if (!box) return;
  box.innerHTML = ""; const d = document.createElement("div");
  d.className = "flash " + type; d.textContent = msg; box.appendChild(d);
}
function renderNav() {
  const u = currentUser();
  $("nav").innerHTML = u
    ? `<a href="dashboard.html">Dashboard</a><a class="pill" href="#" id="logout">Log out</a>`
    : `<a href="login.html">Log in</a><a class="btn small" href="register.html">Register</a>`;
  if (u) $("logout").addEventListener("click", (e) => { e.preventDefault(); store.set("sm_session", null); location.href = "index.html"; });
}
async function demoLogin() {
  const list = users();
  if (!list.find((u) => u.phone === "9999999999"))
    list.push({ name: "Demo Farmer", phone: "9999999999", village: "Demo Village", district: "Warangal", pw: await hash("demo123") });
  store.set("sm_users", list); store.set("sm_session", "9999999999"); location.href = "dashboard.html";
}
function initRegister() {
  $("regForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = $("name").value.trim(), phone = $("phone").value.trim(), pw = $("password").value;
    if (!name || !/^\d{10}$/.test(phone) || pw.length < 6) return flash("Enter a name, a 10-digit phone number and a password of 6+ characters.");
    const list = users();
    if (list.find((u) => u.phone === phone)) return flash("That phone number is already registered.");
    list.push({ name, phone, village: $("village").value.trim(), district: $("district").value.trim(), pw: await hash(pw) });
    store.set("sm_users", list); store.set("sm_session", phone); location.href = "dashboard.html";
  });
}
function initLogin() {
  $("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const u = users().find((x) => x.phone === $("phone").value.trim());
    if (u && u.pw === (await hash($("password").value))) { store.set("sm_session", u.phone); location.href = "dashboard.html"; }
    else flash("Phone number or password is wrong.");
  });
}

/* ================= DASHBOARD ================= */
function smooth(p) {
  let d = `M${p[0][0]},${p[0][1]}`;
  for (let i = 1; i < p.length - 1; i++) d += ` Q${p[i][0]},${p[i][1]} ${(p[i][0] + p[i + 1][0]) / 2},${(p[i][1] + p[i + 1][1]) / 2}`;
  return d + ` L${p[p.length - 1][0]},${p[p.length - 1][1]}`;
}
function spark(v, up) {
  const w = 120, h = 40, lo = Math.min(...v), hi = Math.max(...v);
  const p = v.map((x, i) => [(i / (v.length - 1)) * w, h - 4 - ((x - lo) / (hi - lo || 1)) * (h - 8)]);
  return `<svg viewBox="0 0 ${w} ${h}" class="spark"><path d="${smooth(p)}" fill="none" stroke="${up ? "#35d49a" : "#ff5c7a"}" stroke-width="2"/></svg>`;
}
function initDashboard() {
  const user = currentUser();
  if (!user) { location.href = "login.html"; return; }
  const st = { crop: "Paddy", range: 14, veh: "tractor", candles: [], market: [], price: 0, summary: "" };
  const histKey = "sm_hist_" + user.phone;

  $("avatar").textContent = user.name[0].toUpperCase();
  $("hiName").textContent = "Hi, " + user.name.split(" ")[0];
  $("loc").textContent = user.district || "Set district";

  function renderHistory() {
    const h = store.get(histKey, []);
    $("historyList").innerHTML = h.length
      ? `<ul class="history">` + h.map((x) => `<li><strong>${x.crop}</strong> · ${Math.round(x.qty)} qtl<span>${x.best_mandi}: ${rs(x.best_net)}</span></li>`).join("") + `</ul>`
      : `<p class="muted">No searches yet. Press "Find best mandi" to start.</p>`;
  }
  function renderMarket() {
    $("marketList").innerHTML = st.market.map((m) => `
      <button class="mk ${m.crop === st.crop ? "on" : ""}" data-crop="${m.crop}">
        <div class="mk-top"><span class="dot">${m.crop[0]}</span><span>${m.crop}/qtl</span>
        <span class="badge ${m.chg >= 0 ? "up" : "dn"}">${m.chg >= 0 ? "+" : ""}${m.chg.toFixed(2)}%</span></div>
        <div class="mk-price">${rs(m.price)}</div>${spark(m.spark, m.chg >= 0)}
      </button>`).join("");
  }
  function updateHead() {
    const c = st.candles, last = c[c.length - 1][3], chg = (last / c[c.length - 2][3] - 1) * 100;
    st.price = last;
    $("cropName").textContent = st.crop + " / quintal";
    $("bigPrice").textContent = rs(last);
    const b = $("bigBadge"); b.textContent = (chg >= 0 ? "+" : "") + chg.toFixed(2) + "%"; b.className = "badge " + (chg >= 0 ? "up" : "dn");
    const cl = c.map((k) => k[3]).slice(-10), avg = cl.reduce((a, x) => a + x, 0) / cl.length;
    $("advice").textContent = last >= avg
      ? "Price is above its recent average. Selling now looks reasonable."
      : "Price is below its recent average. If you can store the crop safely, waiting a few days may help.";
  }
  function drawChart() {
    const W = 360, H = 260, pad = 10, c = st.candles;
    const lo = Math.min(...c.map((k) => k[2])), hi = Math.max(...c.map((k) => k[1]));
    const y = (v) => pad + ((hi - v) / (hi - lo || 1)) * (H - 2 * pad);
    const step = (W - 2 * pad) / c.length, bw = Math.max(3, step * 0.55);
    let s = "";
    for (let g = 1; g < 5; g++) { const gy = pad + (g * (H - 2 * pad)) / 5; s += `<line x1="0" x2="${W}" y1="${gy}" y2="${gy}" class="grid"/>`; }
    c.forEach((k, i) => {
      const x = pad + i * step + step / 2, col = k[3] >= k[0] ? "#ffd166" : "#ff5c9d";
      s += `<line x1="${x}" x2="${x}" y1="${y(k[1])}" y2="${y(k[2])}" stroke="${col}" stroke-width="1.5"/>` +
           `<rect x="${x - bw / 2}" y="${Math.min(y(k[0]), y(k[3]))}" width="${bw}" height="${Math.max(2, Math.abs(y(k[0]) - y(k[3])))}" rx="2" fill="${col}"/>`;
    });
    $("chart").innerHTML = s;
  }
  function loadCandles() { st.candles = candles(st.crop, st.range); drawChart(); updateHead(); }
  function loadMarket() { st.market = marketItems(); renderMarket(); }

  $("marketList").addEventListener("click", (e) => {
    const b = e.target.closest(".mk"); if (!b) return;
    st.crop = b.dataset.crop; renderMarket(); loadCandles();
  });
  $("refresh").addEventListener("click", () => { loadMarket(); loadCandles(); });
  $("chart").addEventListener("pointermove", (e) => {
    const r = $("chart").getBoundingClientRect(), c = st.candles;
    const i = Math.min(c.length - 1, Math.max(0, Math.floor(((e.clientX - r.left) / r.width) * c.length)));
    const d = new Date(); d.setDate(d.getDate() - (c.length - 1 - i));
    const t = $("tip"); t.hidden = false;
    t.innerHTML = `${d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}<b>${rs(c[i][3])}</b>`;
    t.style.left = ((i + 0.5) / c.length) * 100 + "%";
  });
  $("chart").addEventListener("pointerleave", () => { $("tip").hidden = true; });
  $("ranges").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    document.querySelectorAll("#ranges .pill").forEach((x) => x.classList.toggle("on", x === b));
    st.range = +b.dataset.range; loadCandles();
  });

  $("modeToggle").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    document.querySelectorAll("#modeToggle button").forEach((x) => x.classList.toggle("on", x === b));
    $("sellBox").hidden = b.dataset.mode !== "sell"; $("holdBox").hidden = b.dataset.mode !== "hold";
  });
  document.querySelector('[data-for="qty"]').addEventListener("click", (e) => { if (e.target.dataset.v) $("qty").value = e.target.dataset.v; });
  $("veh").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    document.querySelectorAll("#veh button").forEach((x) => x.classList.toggle("on", x === b));
    st.veh = b.dataset.veh; $("vehNote").textContent = { tractor: "Cheapest", truck: "Faster", lorry: "Big loads" }[st.veh];
  });
  $("km").addEventListener("input", () => { $("kmVal").textContent = $("km").value + " km"; });
  $("minChips").addEventListener("click", (e) => {
    const f = e.target.dataset.f; if (f === undefined) return;
    $("minPrice").value = f === "0" ? 0 : Math.round(st.price * +f);
  });

  $("compareForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const err = $("compareError"); err.hidden = true;
    const qty = parseFloat($("qty").value);
    if (!(qty > 0)) { err.textContent = "Enter a quantity above 0."; err.hidden = false; return; }
    const rows = calc(st.crop, qty, user.district, st.veh, +$("km").value);
    if (!rows.length) { err.textContent = "No mandi within that distance. Increase the distance slider."; err.hidden = false; return; }
    const minP = +$("minPrice").value || 0;
    const body = $("results").querySelector("tbody"); body.innerHTML = "";
    rows.forEach((r, i) => {
      const tr = document.createElement("tr"), low = r.price < minP;
      tr.className = low ? "low" : i === 0 ? "best" : "";
      [r.mandi + (i === 0 ? " (best)" : "") + (low ? " (below min)" : ""), rs(r.price), r.distance_km + " km", rs(r.transport), rs(r.net)]
        .forEach((t) => { const td = document.createElement("td"); td.textContent = t; tr.appendChild(td); });
      body.appendChild(tr);
    });
    const b = rows[0];
    st.summary = `Smart Mandi: ${qty} quintals of ${st.crop}. Best mandi: ${b.mandi}, Rs ${b.price}/quintal, take-home about ${rs(b.net)} after transport. (Demo prices)`;
    $("waBtn").href = "https://wa.me/?text=" + encodeURIComponent(st.summary);
    $("resultsCard").hidden = false; $("resultsCard").scrollIntoView({ behavior: "smooth", block: "nearest" });
    const h = store.get(histKey, []); h.unshift({ crop: st.crop, qty, best_mandi: b.mandi, best_net: b.net });
    store.set(histKey, h.slice(0, 8)); renderHistory();
  });
  $("copyBtn").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(st.summary); $("copyBtn").textContent = "Copied"; setTimeout(() => ($("copyBtn").textContent = "Copy summary"), 1500); } catch {}
  });

  function addMsg(t, who) { const d = document.createElement("div"); d.className = "msg " + who; d.textContent = t; $("chat").appendChild(d); $("chat").scrollTop = $("chat").scrollHeight; }
  function ask(m) { if (!m) return; addMsg(m, "me"); addMsg(assistantReply(m, user), "bot"); }
  $("chatForm").addEventListener("submit", (e) => { e.preventDefault(); const m = $("chatInput").value.trim(); $("chatInput").value = ""; ask(m); });
  $("quick").addEventListener("click", (e) => { if (e.target.dataset.q) ask(e.target.dataset.q); });
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition, mic = $("micBtn");
  if (!SR) { mic.disabled = true; mic.title = "Voice input is not supported in this browser"; }
  else {
    const rec = new SR(); rec.lang = "en-IN";
    rec.onresult = (ev) => { $("chatInput").value = ev.results[0][0].transcript; $("chatForm").requestSubmit(); };
    mic.addEventListener("click", () => { try { rec.start(); } catch {} });
  }

  loadMarket(); loadCandles(); renderHistory();
}

/* ================= START ================= */
const page = document.body.dataset.page;
renderNav();
if ($("demoBtn")) $("demoBtn").addEventListener("click", demoLogin);
if (page === "register") initRegister();
if (page === "login") initLogin();
if (page === "dashboard") initDashboard();
