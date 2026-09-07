import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || join(__dirname, "..", "data");
const DATA_FILE = join(DATA_DIR, "db.json");

function toLocalIso(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function daysAgo(n) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return toLocalIso(d);
}
function daysAhead(n) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return toLocalIso(d);
}

function seedData() {
  const targets = [
    { id: "t1", name: "MacBook Pro M3", category: "gadget", target: 30000000, current: 0, deadline: daysAhead(150), createdAt: daysAgo(140) },
    { id: "t2", name: "Dana Darurat", category: "darurat", target: 20000000, current: 0, deadline: daysAhead(300), createdAt: daysAgo(130) },
    { id: "t3", name: "Liburan ke Bali", category: "traveling", target: 8000000, current: 0, deadline: daysAhead(60), createdAt: daysAgo(110) }
  ];
  const transactions = [
    { id: "x1", targetId: "t1", type: "setor", amount: 5000000, date: daysAgo(120), note: "" },
    { id: "x2", targetId: "t2", type: "setor", amount: 4000000, date: daysAgo(112), note: "" },
    { id: "x3", targetId: "t3", type: "setor", amount: 4000000, date: daysAgo(95), note: "" },
    { id: "x4", targetId: "t1", type: "setor", amount: 4000000, date: daysAgo(80), note: "" },
    { id: "x5", targetId: "t2", type: "setor", amount: 3500000, date: daysAgo(60), note: "" },
    { id: "x6", targetId: "t1", type: "setor", amount: 3255000, date: daysAgo(40), note: "" },
    { id: "x7", targetId: "t3", type: "setor", amount: 2270000, date: daysAgo(18), note: "" },
    { id: "x8", targetId: "t2", type: "setor", amount: 2475000, date: daysAgo(3), note: "" }
  ];
  for (const tx of transactions) {
    const t = targets.find((tg) => tg.id === tx.targetId);
    if (t) t.current += tx.amount;
  }
  return { targets, transactions, appliedRecommendation: false };
}

function load() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(DATA_FILE)) {
    const data = seedData();
    writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    return data;
  }
  try {
    return JSON.parse(readFileSync(DATA_FILE, "utf-8"));
  } catch {
    const data = seedData();
    writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    return data;
  }
}

let state = load();

function persist() {
  writeFileSync(DATA_FILE, JSON.stringify(state, null, 2));
}

export function getState() {
  return state;
}

export function createTarget({ name, category, target, current, deadline }) {
  const now = new Date();
  const t = {
    id: randomUUID(),
    name,
    category,
    target,
    current: 0,
    deadline,
    createdAt: toLocalIso(now)
  };
  state.targets.push(t);
  if (current > 0) {
    const tx = { id: randomUUID(), targetId: t.id, type: "setor", amount: Math.min(current, target), date: t.createdAt, note: "Setoran awal" };
    state.transactions.push(tx);
    t.current += tx.amount;
  }
  persist();
  return t;
}

export function deleteTarget(id) {
  state.targets = state.targets.filter((t) => t.id !== id);
  state.transactions = state.transactions.filter((tx) => tx.targetId !== id);
  persist();
}

export function updateTarget(id, { name, category, target, deadline }) {
  const t = state.targets.find((tg) => tg.id === id);
  if (!t) throw new Error("Target tidak ditemukan");
  if (name !== undefined) t.name = name;
  if (category !== undefined) t.category = category;
  if (target !== undefined) t.target = target;
  if (deadline !== undefined) t.deadline = deadline;
  persist();
  return t;
}

export function createTransaction({ targetId, type, amount, note }) {
  const t = state.targets.find((tg) => tg.id === targetId);
  if (!t) throw new Error("Target tidak ditemukan");
  if (type === "tarik" && amount > t.current) throw new Error("Saldo target tidak cukup untuk ditarik");
  t.current += type === "setor" ? amount : -amount;
  const tx = { id: randomUUID(), targetId, type, amount, date: toLocalIso(new Date()), note: note || "" };
  state.transactions.push(tx);
  persist();
  return tx;
}

export function deleteTransaction(id) {
  const tx = state.transactions.find((t) => t.id === id);
  if (!tx) throw new Error("Transaksi tidak ditemukan");
  const t = state.targets.find((tg) => tg.id === tx.targetId);
  if (t) {
    const reversed = tx.type === "setor" ? t.current - tx.amount : t.current + tx.amount;
    if (reversed < 0) throw new Error("Tidak bisa menghapus transaksi ini karena akan membuat saldo negatif.");
    t.current = reversed;
  }
  state.transactions = state.transactions.filter((t2) => t2.id !== id);
  persist();
}

export function setAppliedRecommendation(value) {
  state.appliedRecommendation = value;
  persist();
}
