import "./style.css";

const API = "/api";

const CATS = {
  gadget: { label: "Gadget", icon: "devices", varc: "--c-primary" },
  darurat: { label: "Dana Darurat", icon: "health_and_safety", varc: "--c-tertiary" },
  traveling: { label: "Traveling", icon: "flight_takeoff", varc: "--c-secondary-container" },
  pendidikan: { label: "Pendidikan", icon: "school", varc: "--c-tertiary-fixed-dim" },
  rumah: { label: "Rumah", icon: "home", varc: "--c-secondary" },
  lainnya: { label: "Lainnya", icon: "savings", varc: "--c-outline" }
};

let state = { targets: [], transactions: [], appliedRecommendation: false };

async function apiGet(path) {
  const res = await fetch(API + path);
  if (!res.ok) throw new Error("Gagal memuat data");
  return res.json();
}
async function apiSend(method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Terjadi kesalahan");
  return data;
}

async function refresh() {
  state = await apiGet("/state");
}

function fmtRupiah(n) {
  n = Math.round(n || 0);
  return "Rp " + n.toLocaleString("id-ID");
}
function fmtRupiahShort(n) {
  if (n >= 1000000) return (n / 1000000).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + " Jt";
  if (n >= 1000) return (n / 1000).toLocaleString("id-ID", { maximumFractionDigits: 0 }) + " Rb";
  return String(n);
}
function fmtDateShort(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}
function daysBetween(a, b) {
  const A = new Date(a + "T00:00:00"), B = new Date(b + "T00:00:00");
  return Math.round((B - A) / 86400000);
}
function toLocalIso(d) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function daysAhead(n) { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + n); return toLocalIso(d); }
function todayIso() { return toLocalIso(new Date()); }
function parseDigits(str) { return parseInt(String(str || "0").replace(/[^0-9]/g, ""), 10) || 0; }

function bindCurrencyInput(el) {
  el.addEventListener("input", () => {
    const v = parseDigits(el.value);
    el.value = v ? v.toLocaleString("id-ID") : "";
  });
}

function total() {
  return state.targets.reduce((s, t) => s + t.current, 0);
}
function monthDelta() {
  const now = new Date(), ym = now.getFullYear() + "-" + now.getMonth();
  return state.transactions.reduce((s, tx) => {
    const d = new Date(tx.date + "T00:00:00");
    if (d.getFullYear() + "-" + d.getMonth() === ym) return s + (tx.type === "setor" ? tx.amount : -tx.amount);
    return s;
  }, 0);
}
function allocation() {
  const byCat = {};
  state.targets.forEach((t) => { byCat[t.category] = (byCat[t.category] || 0) + t.current; });
  const t = total() || 1;
  return Object.keys(byCat)
    .filter((k) => byCat[k] > 0)
    .map((k) => ({ key: k, label: CATS[k] ? CATS[k].label : k, amount: byCat[k], pct: (byCat[k] / t) * 100, varc: CATS[k] ? CATS[k].varc : "--c-outline" }))
    .sort((a, b) => b.amount - a.amount);
}
function discipline() {
  const score = Math.min(100, 70 + Math.min(25, state.transactions.length * 3));
  const label = score >= 90 ? "Sangat Disiplin" : score >= 75 ? "Disiplin" : score >= 60 ? "Cukup Baik" : "Perlu Ditingkatkan";
  return { score, label };
}
function recommendation() {
  const eligible = state.targets
    .filter((t) => t.current < t.target)
    .sort((a, b) => daysBetween(todayIso(), a.deadline) - daysBetween(todayIso(), b.deadline));
  if (!eligible.length) return null;
  const t = eligible[0];
  const age = Math.max(1, daysBetween(t.createdAt, todayIso()));
  const dailyRate = t.current / age;
  if (dailyRate <= 0) return null;
  const remaining = t.target - t.current;
  const daysLeft = Math.ceil(remaining / dailyRate);
  const bonus = 500000;
  const remainingAfter = Math.max(0, remaining - bonus);
  const daysLeftAfter = Math.ceil(remainingAfter / dailyRate);
  const saved = Math.max(1, daysLeft - daysLeftAfter);
  return { target: t, bonus, saved };
}

// ---------- rendering ----------
function renderHome() {
  const g = document.getElementById("home-greeting");
  const h = new Date().getHours();
  g.textContent = h < 11 ? "Selamat pagi," : h < 15 ? "Selamat siang," : h < 19 ? "Selamat sore," : "Selamat malam,";

  document.getElementById("home-total").textContent = fmtRupiah(total());
  const delta = monthDelta();
  const deltaEl = document.getElementById("home-delta");
  deltaEl.innerHTML =
    '<span class="material-symbols-outlined text-[14px]">' + (delta >= 0 ? "trending_up" : "trending_down") + "</span>" +
    (delta >= 0 ? "+" : "") + fmtRupiah(delta) + " bulan ini";

  const tot = total();
  const milestone = tot === 0 ? 5000000 : (Math.floor(tot / 5000000) + 1) * 5000000;
  const pct = Math.min(100, (tot / milestone) * 100);
  document.getElementById("home-milestone-bar").style.width = pct + "%";
  document.getElementById("home-milestone-label").textContent = "Menuju " + fmtRupiah(milestone) + " (" + Math.round(pct) + "%)";

  const hasTargets = state.targets.length > 0;
  document.querySelectorAll(".quick-action[data-action='setor'], .quick-action[data-action='tarik']").forEach((b) => {
    b.classList.toggle("opacity-40", !hasTargets);
  });

  const sorted = state.targets.slice().sort((a, b) => daysBetween(todayIso(), a.deadline) - daysBetween(todayIso(), b.deadline)).slice(0, 3);
  document.getElementById("home-targets").innerHTML =
    sorted.map((t) => targetCardHtml(t)).join("") || '<p class="font-body-sm text-body-sm text-on-surface-variant py-space-sm">Belum ada target aktif.</p>';

  const recentTx = state.transactions.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  document.getElementById("home-transactions").innerHTML =
    recentTx.map((tx) => {
      const t = state.targets.find((tg) => tg.id === tx.targetId);
      const cat = t && CATS[t.category] ? CATS[t.category] : CATS.lainnya;
      const neg = tx.type === "tarik";
      return (
        '<div class="group flex items-center gap-space-sm p-space-md">' +
        '<div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style="background:rgb(var(' + cat.varc + ')/0.15);color:rgb(var(' + cat.varc + '))">' +
        '<span class="material-symbols-outlined text-[20px]">' + cat.icon + "</span></div>" +
        '<div class="flex-1 min-w-0"><p class="font-body-md text-body-md text-on-surface truncate">' + (t ? t.name : "Target dihapus") + "</p>" +
        '<p class="font-body-sm text-body-sm text-on-surface-variant">' + fmtDateShort(tx.date) + "</p></div>" +
        '<span class="font-label-lg text-label-lg font-bold ' + (neg ? "text-error" : "text-primary") + '">' + (neg ? "-" : "+") + fmtRupiah(tx.amount) + "</span>" +
        '<button class="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant/50 hover:text-error hover:bg-error-container/40" data-delete-tx="' + tx.id + '" type="button" aria-label="Hapus transaksi"><span class="material-symbols-outlined text-[18px]">close</span></button>' +
        "</div>"
      );
    }).join("") || '<p class="font-body-sm text-body-sm text-on-surface-variant p-space-md">Belum ada transaksi.</p>';
}

function targetCardHtml(t, opts) {
  opts = opts || {};
  const cat = CATS[t.category] || CATS.lainnya;
  const pct = Math.min(100, Math.round((t.current / t.target) * 100));
  const dleft = daysBetween(todayIso(), t.deadline);
  const deadlineLabel = dleft < 0 ? "Lewat tenggat" : dleft === 0 ? "Hari ini" : dleft + " hari lagi";
  const footerActions = opts.manageActions
    ? '<div class="mt-2 flex justify-end gap-space-md">' +
      '<button class="text-on-surface-variant/70 hover:text-primary font-label-sm text-label-sm flex items-center gap-1" data-edit-target="' + t.id + '" type="button"><span class="material-symbols-outlined text-[16px]">edit</span>Edit</button>' +
      '<button class="text-on-surface-variant/70 hover:text-error font-label-sm text-label-sm flex items-center gap-1" data-delete-target="' + t.id + '" type="button"><span class="material-symbols-outlined text-[16px]">delete</span>Hapus</button>' +
      "</div>"
    : "";
  return (
    '<div class="bg-surface-container-lowest rounded-2xl p-space-md shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)]" data-target-card="' + t.id + '">' +
    '<div class="flex items-center gap-space-sm">' +
    '<div class="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style="background:rgb(var(' + cat.varc + ')/0.15);color:rgb(var(' + cat.varc + '))">' +
    '<span class="material-symbols-outlined text-[22px]">' + cat.icon + "</span></div>" +
    '<div class="flex-1 min-w-0"><p class="font-label-lg text-label-lg font-bold text-on-surface truncate">' + t.name + "</p>" +
    '<p class="font-body-sm text-body-sm text-on-surface-variant">' + cat.label + " &middot; " + deadlineLabel + "</p></div>" +
    '<button class="shrink-0 px-3 py-1.5 rounded-full bg-primary/10 text-primary font-label-sm text-label-sm font-bold" data-quick-setor="' + t.id + '" type="button">Setor</button>' +
    "</div>" +
    '<div class="mt-3 space-y-1">' +
    '<div class="h-2 w-full bg-surface-container rounded-full overflow-hidden"><div class="h-full rounded-full" style="width:' + pct + '%;background:rgb(var(' + cat.varc + '))"></div></div>' +
    '<div class="flex justify-between font-body-sm text-body-sm"><span class="text-on-surface font-semibold">' + fmtRupiah(t.current) + '</span><span class="text-on-surface-variant">dari ' + fmtRupiah(t.target) + "</span></div>" +
    "</div>" + footerActions + "</div>"
  );
}

function renderTarget() {
  document.getElementById("target-summary").textContent = state.targets.length + " target aktif";
  const list = document.getElementById("target-list");
  const empty = document.getElementById("target-empty");
  if (!state.targets.length) {
    list.innerHTML = "";
    empty.classList.remove("hidden");
    empty.classList.add("flex");
    return;
  }
  empty.classList.add("hidden");
  empty.classList.remove("flex");
  list.innerHTML = state.targets.map((t) => targetCardHtml(t, { manageActions: true })).join("");
}

function renderCreateCategories() {
  const wrap = document.getElementById("create-categories");
  wrap.innerHTML = Object.keys(CATS).map((k, i) => {
    const c = CATS[k];
    return (
      '<button class="cat-chip flex flex-col items-center gap-1 rounded-xl py-space-sm" aria-pressed="' + (i === 0 ? "true" : "false") + '" data-cat="' + k + '" type="button">' +
      '<span class="material-symbols-outlined text-[20px]">' + c.icon + "</span>" +
      '<span class="font-label-sm text-label-sm">' + c.label + "</span></button>"
    );
  }).join("");
}

function renderAnalisis() {
  const d = discipline();
  document.getElementById("score-value").textContent = d.score;
  document.getElementById("score-label").textContent = d.label;
  document.getElementById("score-bar").style.width = d.score + "%";
  document.getElementById("score-delta").textContent = "+" + Math.min(15, state.transactions.length) + "% bln lalu";
  document.getElementById("analisis-banner").innerHTML =
    'Tren keuanganmu <span class="font-semibold text-primary">' + d.label.toLowerCase() + "</span> minggu ini!";

  const rec = recommendation();
  const applied = state.appliedRecommendation;
  if (rec) {
    document.getElementById("ai-text").innerHTML =
      'Kamu bisa mempercepat target <span class="font-semibold text-primary">' + rec.target.name +
      '</span> <span class="font-bold">' + rec.saved + " hari lebih awal</span> jika menyisihkan " + fmtRupiah(rec.bonus) + " ekstra minggu ini.";
    document.getElementById("ai-card").style.display = "";
    document.getElementById("ai-apply-label").textContent = applied ? "Sudah Diterapkan" : "Terapkan Sekarang";
    document.getElementById("ai-apply").disabled = applied;
    document.getElementById("ai-apply").style.opacity = applied ? "0.5" : "1";
  } else {
    document.getElementById("ai-card").style.display = "none";
  }

  const tot = total();
  document.getElementById("trend-total").textContent = fmtRupiah(tot);
  const ratios = [0.12, 0.25, 0.46, 0.72, 1];
  const values = ratios.map((r) => Math.round(tot * r));
  const now = new Date();
  const months = [];
  for (let i = 4; i >= 0; i--) {
    const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(m.toLocaleDateString("id-ID", { month: "short" }));
  }
  document.getElementById("trend-range").textContent = months[0] + " - " + months[4] + " " + now.getFullYear();

  const xs = [10, 85, 160, 235, 310];
  const vmax = Math.max(...values, 1);
  const ys = values.map((v) => 120 - (v / vmax) * 100);
  const pts = xs.map((x, i) => [x, ys[i]]);
  function smoothPath(p) {
    let s = "M " + p[0][0] + " " + p[0][1];
    for (let i = 0; i < p.length - 1; i++) {
      const mx = (p[i][0] + p[i + 1][0]) / 2;
      s += " C " + mx + " " + p[i][1] + ", " + mx + " " + p[i + 1][1] + ", " + p[i + 1][0] + " " + p[i + 1][1];
    }
    return s;
  }
  const line = smoothPath(pts);
  document.getElementById("trend-line").setAttribute("d", line);
  document.getElementById("trend-area").setAttribute("d", line + " L 310 130 L 10 130 Z");
  document.getElementById("trend-guides").innerHTML =
    '<line x1="0" x2="320" y1="30" y2="30" stroke="rgb(var(--c-outline-variant))" stroke-dasharray="3 3"></line>' +
    '<line x1="0" x2="320" y1="75" y2="75" stroke="rgb(var(--c-outline-variant))" stroke-dasharray="3 3"></line>' +
    '<line x1="0" x2="320" y1="120" y2="120" stroke="rgb(var(--c-outline-variant))"></line>';
  document.getElementById("trend-nodes").innerHTML = pts.map((p, i) => {
    if (i === pts.length - 1) {
      return (
        '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="8" stroke="rgb(var(--c-primary))" stroke-opacity="0.3" stroke-width="2" fill="none"></circle>' +
        '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="5" fill="rgb(var(--c-primary))"></circle>'
      );
    }
    return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="3.5" fill="rgb(var(--c-surface-container-lowest))" stroke="rgb(var(--c-primary))" stroke-width="2.5"></circle>';
  }).join("");
  document.getElementById("trend-labels").innerHTML = months.map((m, i) => {
    const last = i === months.length - 1;
    return (
      '<div class="flex flex-col items-center"><span class="' + (last ? "text-primary font-bold" : "") + '">' + m + "</span>" +
      '<span class="font-semibold ' + (last ? "text-primary" : "text-on-surface") + '">' + fmtRupiahShort(values[i]) + "</span></div>"
    );
  }).join("");

  const alloc = allocation();
  document.getElementById("donut-count").textContent = alloc.length;
  const circ = 238.76;
  let offset = 0;
  document.getElementById("donut-arcs").innerHTML = alloc.map((a) => {
    const len = (a.pct / 100) * circ;
    const html =
      '<circle cx="50" cy="50" fill="transparent" r="38" stroke="rgb(var(' + a.varc + '))" stroke-width="12" stroke-linecap="round" stroke-dasharray="' + len + " " + (circ - len) + '" stroke-dashoffset="' + -offset + '"></circle>';
    offset += len;
    return html;
  }).join("");
  document.getElementById("donut-legend").innerHTML =
    alloc.map((a) => (
      '<div class="flex items-center justify-between"><div class="flex items-center gap-2 min-w-0">' +
      '<span class="w-3 h-3 rounded-full shrink-0" style="background:rgb(var(' + a.varc + '))"></span>' +
      '<span class="font-body-md text-body-md text-on-surface truncate">' + a.label + "</span></div>" +
      '<span class="font-label-lg text-label-lg font-bold text-on-surface">' + Math.round(a.pct) + "%</span></div>"
    )).join("") || '<p class="font-body-sm text-body-sm text-on-surface-variant">Belum ada alokasi.</p>';

  const streakCount = state.transactions.filter((tx) => tx.type === "setor").length;
  const recentActive = state.transactions.some((tx) => daysBetween(tx.date, todayIso()) <= 30);
  const milestoneReached = tot >= 25000000;
  const noWithdrawStreak = !state.transactions.some((tx) => tx.type === "tarik" && daysBetween(tx.date, todayIso()) <= 30);
  const badges = [
    {
      active: recentActive, glow: true, icon: "local_fire_department",
      title: "Penabung Rutin", sub: streakCount + " setoran tercatat &middot; tetap konsisten",
      status: recentActive ? "Aktif" : "Belum Aktif"
    },
    {
      active: milestoneReached, icon: "workspace_premium",
      title: "Milestone Rp 25 Juta Pertama",
      sub: milestoneReached ? "Fondasi kekayaan awal telah berhasil dibangun" : fmtRupiah(tot) + " dari Rp 25.000.000",
      status: milestoneReached ? "Tercapai" : "Progres"
    },
    {
      active: noWithdrawStreak, icon: "verified_user",
      title: "Juara Anti-Boncos",
      sub: noWithdrawStreak ? "Tidak ada penarikan dalam 30 hari terakhir" : "Ada penarikan dalam 30 hari terakhir",
      status: noWithdrawStreak ? "Sukses" : "Terlewat"
    }
  ];
  document.getElementById("badge-count").textContent = badges.filter((b) => b.active).length + " Dibuka";
  document.getElementById("badge-list").innerHTML = badges.map((b) => {
    const iconWrap = b.active
      ? '<div class="relative w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-on-primary shadow-md shrink-0">' +
        '<span class="material-symbols-outlined text-[26px]" style="font-variation-settings:\'FILL\' 1;">' + b.icon + "</span>" +
        (b.glow ? '<span class="absolute -top-1 -right-1 flex h-3 w-3"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span><span class="relative inline-flex rounded-full h-3 w-3 bg-secondary"></span></span>' : "") +
        "</div>"
      : '<div class="w-12 h-12 rounded-2xl bg-surface-container-high flex items-center justify-center text-on-surface-variant shrink-0">' +
        '<span class="material-symbols-outlined text-[26px]">' + b.icon + "</span></div>";
    return (
      '<div class="bg-surface-container-lowest rounded-2xl p-space-md shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)]">' +
      '<div class="flex items-center gap-space-md">' + iconWrap +
      '<div class="flex-1 min-w-0"><div class="flex items-center gap-1.5 flex-wrap">' +
      '<h3 class="font-label-lg text-label-lg font-bold text-on-surface truncate">' + b.title + "</h3>" +
      '<span class="font-label-sm text-label-sm ' + (b.active ? "bg-secondary-container text-on-secondary-container" : "bg-surface-container text-on-surface-variant") + ' px-2 py-0.5 rounded-full font-bold">' + b.status + "</span></div>" +
      '<p class="font-body-sm text-body-sm text-on-surface-variant truncate">' + b.sub + "</p></div>" +
      (b.active ? '<span class="material-symbols-outlined text-primary text-[20px] shrink-0" style="font-variation-settings:\'FILL\' 1;">check_circle</span>' : "") +
      "</div></div>"
    );
  }).join("");
}

function renderAll() {
  renderHome();
  renderTarget();
  renderAnalisis();
  renderNotifAndProfile();
}

// ---------- navigation ----------
function switchScreen(name) {
  document.querySelectorAll("[data-screen]").forEach((s) => { s.hidden = s.dataset.screen !== name; });
  document.querySelectorAll(".nav-link").forEach((b) => {
    const active = b.dataset.nav === name;
    b.setAttribute("aria-current", active ? "page" : "false");
    b.classList.toggle("text-on-surface-variant", !active);
  });
  document.querySelector(".screen-main").scrollTop = 0;
  if (name === "buat-target") resetCreateForm();
}

document.querySelectorAll("[data-nav]").forEach((el) => {
  el.addEventListener("click", () => switchScreen(el.dataset.nav));
});

// ---------- create target form ----------
let selectedCat = Object.keys(CATS)[0];
renderCreateCategories();
document.getElementById("create-categories").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-cat]");
  if (!btn) return;
  selectedCat = btn.dataset.cat;
  document.querySelectorAll("#create-categories [data-cat]").forEach((b) => {
    b.setAttribute("aria-pressed", b.dataset.cat === selectedCat ? "true" : "false");
  });
});
bindCurrencyInput(document.getElementById("f-nominal"));
bindCurrencyInput(document.getElementById("f-awal"));

function resetCreateForm() {
  document.getElementById("f-nama").value = "";
  document.getElementById("f-nominal").value = "";
  document.getElementById("f-awal").value = "";
  document.getElementById("f-tanggal").value = "";
  document.getElementById("f-tanggal").min = daysAhead(1);
  selectedCat = Object.keys(CATS)[0];
  document.querySelectorAll("#create-categories [data-cat]").forEach((b, i) => b.setAttribute("aria-pressed", i === 0 ? "true" : "false"));
  ["err-nama", "err-nominal", "err-tanggal"].forEach((id) => document.getElementById(id).classList.add("hidden"));
}

document.getElementById("create-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const nama = document.getElementById("f-nama").value.trim();
  const nominal = parseDigits(document.getElementById("f-nominal").value);
  const awal = parseDigits(document.getElementById("f-awal").value);
  const tanggal = document.getElementById("f-tanggal").value;
  let ok = true;
  document.getElementById("err-nama").classList.toggle("hidden", !!nama);
  if (!nama) ok = false;
  document.getElementById("err-nominal").classList.toggle("hidden", nominal > 0);
  if (!(nominal > 0)) ok = false;
  const validDate = !!tanggal && tanggal > todayIso();
  document.getElementById("err-tanggal").classList.toggle("hidden", validDate);
  if (!validDate) ok = false;
  if (!ok) return;

  try {
    const res = await apiSend("POST", "/targets", { name: nama, category: selectedCat, target: nominal, current: awal, deadline: tanggal });
    state = res.state;
    renderAll();
    toast('Target "' + nama + '" berhasil dibuat');
    switchScreen("target");
  } catch (err) {
    toast(err.message);
  }
});

// ---------- target list actions ----------
document.getElementById("target-list").addEventListener("click", handleTargetListClick);
document.getElementById("home-targets").addEventListener("click", handleTargetListClick);
function handleTargetListClick(e) {
  const setorBtn = e.target.closest("[data-quick-setor]");
  if (setorBtn) { openTxnSheet(setorBtn.dataset.quickSetor, "setor"); return; }
  const editBtn = e.target.closest("[data-edit-target]");
  if (editBtn) { openEditSheet(editBtn.dataset.editTarget); return; }
  const delBtn = e.target.closest("[data-delete-target]");
  if (delBtn) {
    const id = delBtn.dataset.deleteTarget;
    const t = state.targets.find((tg) => tg.id === id);
    if (t && window.confirm('Hapus target "' + t.name + '"? Riwayat transaksinya juga akan dihapus.')) {
      apiSend("DELETE", "/targets/" + id).then((res) => {
        state = res.state;
        renderAll();
        toast("Target dihapus");
      }).catch((err) => toast(err.message));
    }
  }
}

// ---------- home transaction delete ----------
document.getElementById("home-transactions").addEventListener("click", (e) => {
  const delBtn = e.target.closest("[data-delete-tx]");
  if (!delBtn) return;
  const id = delBtn.dataset.deleteTx;
  if (!window.confirm("Hapus transaksi ini? Saldo target akan disesuaikan kembali.")) return;
  apiSend("DELETE", "/transactions/" + id).then((res) => {
    state = res.state;
    renderAll();
    toast("Transaksi dihapus");
  }).catch((err) => toast(err.message));
});

// ---------- edit target sheet ----------
const editSheet = document.getElementById("edit-sheet");
let editingTargetId = null;
let editSelectedCat = Object.keys(CATS)[0];
(function renderEditCategories() {
  const wrap = document.getElementById("edit-categories");
  wrap.innerHTML = Object.keys(CATS).map((k) => {
    const c = CATS[k];
    return (
      '<button class="cat-chip flex flex-col items-center gap-1 rounded-xl py-space-sm" aria-pressed="false" data-cat="' + k + '" type="button">' +
      '<span class="material-symbols-outlined text-[20px]">' + c.icon + "</span>" +
      '<span class="font-label-sm text-label-sm">' + c.label + "</span></button>"
    );
  }).join("");
})();
document.getElementById("edit-categories").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-cat]");
  if (!btn) return;
  editSelectedCat = btn.dataset.cat;
  document.querySelectorAll("#edit-categories [data-cat]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.cat === editSelectedCat ? "true" : "false"));
});
bindCurrencyInput(document.getElementById("e-nominal"));

function openEditSheet(targetId) {
  const t = state.targets.find((tg) => tg.id === targetId);
  if (!t) return;
  editingTargetId = targetId;
  editSelectedCat = t.category;
  document.getElementById("e-nama").value = t.name;
  document.getElementById("e-nominal").value = t.target.toLocaleString("id-ID");
  document.getElementById("e-tanggal").value = t.deadline;
  document.getElementById("e-tanggal").min = daysAhead(1);
  document.querySelectorAll("#edit-categories [data-cat]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.cat === editSelectedCat ? "true" : "false"));
  ["edit-err-nama", "edit-err-nominal", "edit-err-tanggal"].forEach((id) => document.getElementById(id).classList.add("hidden"));
  backdrop.hidden = false;
  editSheet.hidden = false;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    backdrop.classList.add("is-open");
    editSheet.classList.add("is-open");
  }));
}
function closeEditSheet() {
  backdrop.classList.remove("is-open");
  editSheet.classList.remove("is-open");
  setTimeout(() => { if (!sheet.classList.contains("is-open")) backdrop.hidden = true; editSheet.hidden = true; }, 300);
}
document.getElementById("edit-sheet-close").addEventListener("click", closeEditSheet);

document.getElementById("edit-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const nama = document.getElementById("e-nama").value.trim();
  const nominal = parseDigits(document.getElementById("e-nominal").value);
  const tanggal = document.getElementById("e-tanggal").value;
  let ok = true;
  document.getElementById("edit-err-nama").classList.toggle("hidden", !!nama);
  if (!nama) ok = false;
  document.getElementById("edit-err-nominal").classList.toggle("hidden", nominal > 0);
  if (!(nominal > 0)) ok = false;
  const validDate = !!tanggal;
  document.getElementById("edit-err-tanggal").classList.toggle("hidden", validDate);
  if (!validDate) ok = false;
  if (!ok) return;
  try {
    const res = await apiSend("PATCH", "/targets/" + editingTargetId, { name: nama, category: editSelectedCat, target: nominal, deadline: tanggal });
    state = res.state;
    renderAll();
    closeEditSheet();
    toast("Perubahan target disimpan");
  } catch (err) {
    toast(err.message);
  }
});

// ---------- transaction sheet ----------
const sheet = document.getElementById("txn-sheet");
const backdrop = document.getElementById("sheet-backdrop");
let txType = "setor";
bindCurrencyInput(document.getElementById("tx-nominal"));

function openTxnSheet(targetId, type) {
  txType = type || "setor";
  document.querySelectorAll("#txn-form .seg-btn").forEach((b) => b.setAttribute("aria-pressed", b.dataset.type === txType ? "true" : "false"));
  document.getElementById("sheet-title").textContent = txType === "setor" ? "Setor Dana" : "Tarik Dana";
  document.getElementById("tx-submit").textContent = txType === "setor" ? "Simpan Setoran" : "Simpan Penarikan";
  const sel = document.getElementById("tx-target");
  sel.innerHTML = state.targets.map((t) => '<option value="' + t.id + '">' + t.name + "</option>").join("");
  if (targetId) sel.value = targetId;
  document.getElementById("tx-nominal").value = "";
  document.getElementById("tx-err").classList.add("hidden");
  backdrop.hidden = false;
  sheet.hidden = false;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      backdrop.classList.add("is-open");
      sheet.classList.add("is-open");
    });
  });
}
function closeTxnSheet() {
  backdrop.classList.remove("is-open");
  sheet.classList.remove("is-open");
  setTimeout(() => { if (!editSheet.classList.contains("is-open")) backdrop.hidden = true; sheet.hidden = true; }, 300);
}

document.querySelectorAll("#txn-form .seg-btn").forEach((b) => {
  b.addEventListener("click", () => {
    txType = b.dataset.type;
    document.querySelectorAll("#txn-form .seg-btn").forEach((x) => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
    document.getElementById("sheet-title").textContent = txType === "setor" ? "Setor Dana" : "Tarik Dana";
    document.getElementById("tx-submit").textContent = txType === "setor" ? "Simpan Setoran" : "Simpan Penarikan";
  });
});
document.getElementById("sheet-close").addEventListener("click", closeTxnSheet);
backdrop.addEventListener("click", closeTxnSheet);

document.getElementById("txn-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const targetId = document.getElementById("tx-target").value;
  const nominal = parseDigits(document.getElementById("tx-nominal").value);
  const errEl = document.getElementById("tx-err");
  if (!(nominal > 0)) { errEl.textContent = "Nominal harus lebih dari Rp 0."; errEl.classList.remove("hidden"); return; }
  try {
    const res = await apiSend("POST", "/transactions", { targetId, type: txType, amount: nominal });
    state = res.state;
    renderAll();
    closeTxnSheet();
    toast((txType === "setor" ? "Setoran " : "Penarikan ") + fmtRupiah(nominal) + " berhasil disimpan");
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove("hidden");
  }
});

document.querySelectorAll(".quick-action").forEach((b) => {
  b.addEventListener("click", () => {
    const action = b.dataset.action;
    if (action === "buat-target") { switchScreen("buat-target"); return; }
    if (!state.targets.length) { toast("Buat target dulu sebelum " + (action === "setor" ? "menyetor" : "menarik") + " dana"); return; }
    openTxnSheet(null, action);
  });
});

// ---------- AI recommendation ----------
document.getElementById("ai-apply").addEventListener("click", async () => {
  if (state.appliedRecommendation) return;
  const rec = recommendation();
  if (!rec) return;
  try {
    const res = await apiSend("POST", "/recommendation/apply", { targetId: rec.target.id, amount: rec.bonus });
    state = res.state;
    renderAll();
    toast(fmtRupiah(rec.bonus) + " ditambahkan ke " + rec.target.name);
  } catch (err) {
    toast(err.message);
  }
});

// ---------- period filter (visual only, drives banner copy) ----------
document.querySelectorAll("#period-filter-group .period-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#period-filter-group .period-btn").forEach((b) => b.setAttribute("aria-selected", b === btn ? "true" : "false"));
    const label = btn.dataset.period === "bulan-ini" ? "minggu ini" : btn.dataset.period === "3-bulan" ? "3 bulan terakhir" : "tahun ini";
    const d = discipline();
    document.getElementById("analisis-banner").innerHTML = 'Tren keuanganmu <span class="font-semibold text-primary">' + d.label.toLowerCase() + "</span> " + label + "!";
  });
});

// ---------- notifications & profile ----------
const notifPanel = document.getElementById("notif-panel");
const profilePanel = document.getElementById("profile-panel");

function renderNotifAndProfile() {
  const items = [];
  const lastTx = state.transactions.slice().sort((a, b) => b.date.localeCompare(a.date))[0];
  if (lastTx) {
    const t = state.targets.find((tg) => tg.id === lastTx.targetId);
    items.push({
      icon: lastTx.type === "setor" ? "task_alt" : "payments",
      text: (lastTx.type === "setor" ? "Setoran " : "Penarikan ") + fmtRupiah(lastTx.amount) + (t ? " untuk " + t.name : "") + " tercatat pada " + fmtDateShort(lastTx.date) + "."
    });
  }
  const rec = recommendation();
  if (rec && !state.appliedRecommendation) {
    items.push({ icon: "auto_awesome", text: "Rekomendasi AI: percepat target " + rec.target.name + " " + rec.saved + " hari lebih awal." });
  }
  const tot = total();
  const nextMilestone = tot === 0 ? 5000000 : (Math.floor(tot / 5000000) + 1) * 5000000;
  items.push({ icon: "workspace_premium", text: "Rp " + (nextMilestone - tot).toLocaleString("id-ID") + " lagi menuju milestone " + fmtRupiah(nextMilestone) + "." });
  document.getElementById("notif-list").innerHTML = items.map((n) =>
    '<div class="flex items-start gap-space-sm p-space-sm rounded-xl hover:bg-surface-container-high/40">' +
    '<span class="material-symbols-outlined text-primary text-[18px] mt-0.5">' + n.icon + "</span>" +
    '<p class="font-body-sm text-body-sm text-on-surface">' + n.text + "</p></div>"
  ).join("") || '<p class="font-body-sm text-body-sm text-on-surface-variant p-space-sm">Belum ada notifikasi.</p>';

  document.getElementById("profile-total").textContent = fmtRupiah(tot);
  document.getElementById("profile-target-count").textContent = state.targets.length;
  document.getElementById("profile-score").textContent = discipline().score;
  const earliest = state.targets.map((t) => t.createdAt).sort()[0];
  document.getElementById("profile-since").textContent = earliest
    ? "Menabung sejak " + new Date(earliest + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
    : "Belum ada target";
}

document.getElementById("btn-notif").addEventListener("click", (e) => {
  e.stopPropagation();
  profilePanel.classList.remove("is-open");
  notifPanel.classList.toggle("is-open");
});
document.getElementById("btn-profile").addEventListener("click", (e) => {
  e.stopPropagation();
  notifPanel.classList.remove("is-open");
  profilePanel.classList.toggle("is-open");
});
document.addEventListener("click", (e) => {
  if (!notifPanel.contains(e.target) && e.target.id !== "btn-notif") notifPanel.classList.remove("is-open");
  if (!profilePanel.contains(e.target) && e.target.id !== "btn-profile") profilePanel.classList.remove("is-open");
});

// ---------- toast ----------
function toast(msg) {
  const wrap = document.getElementById("toast-wrap");
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  wrap.appendChild(el);
  requestAnimationFrame(() => el.classList.add("is-open"));
  setTimeout(() => {
    el.classList.remove("is-open");
    setTimeout(() => el.remove(), 250);
  }, 2400);
}

// ---------- boot ----------
(async function init() {
  try {
    await refresh();
    renderAll();
  } catch (err) {
    toast("Tidak bisa terhubung ke server. Pastikan backend berjalan.");
  }
  switchScreen("beranda");
})();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(function () {});
}
