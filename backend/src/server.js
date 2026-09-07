import express from "express";
import cors from "cors";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";
import {
  getState,
  createTarget,
  deleteTarget,
  updateTarget,
  createTransaction,
  deleteTransaction,
  setAppliedRecommendation
} from "./store.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;

const app = express();
app.use(cors());
app.use(express.json());

const api = express.Router();

api.get("/state", (req, res) => {
  res.json(getState());
});

api.post("/targets", (req, res) => {
  const { name, category, target, current, deadline } = req.body || {};
  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "Nama target wajib diisi." });
  }
  if (!(Number(target) > 0)) {
    return res.status(400).json({ error: "Nominal target harus lebih dari Rp 0." });
  }
  if (!deadline || typeof deadline !== "string") {
    return res.status(400).json({ error: "Tanggal target wajib diisi." });
  }
  const t = createTarget({
    name: name.trim(),
    category: category || "lainnya",
    target: Number(target),
    current: Number(current) || 0,
    deadline
  });
  res.status(201).json({ target: t, state: getState() });
});

api.delete("/targets/:id", (req, res) => {
  deleteTarget(req.params.id);
  res.json({ state: getState() });
});

api.patch("/targets/:id", (req, res) => {
  const { name, category, target, deadline } = req.body || {};
  if (name !== undefined && !name.trim()) {
    return res.status(400).json({ error: "Nama target wajib diisi." });
  }
  if (target !== undefined && !(Number(target) > 0)) {
    return res.status(400).json({ error: "Nominal target harus lebih dari Rp 0." });
  }
  try {
    updateTarget(req.params.id, {
      name: name !== undefined ? name.trim() : undefined,
      category,
      target: target !== undefined ? Number(target) : undefined,
      deadline
    });
    res.json({ state: getState() });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

api.post("/transactions", (req, res) => {
  const { targetId, type, amount, note } = req.body || {};
  if (!targetId) return res.status(400).json({ error: "Target wajib dipilih." });
  if (type !== "setor" && type !== "tarik") return res.status(400).json({ error: "Jenis transaksi tidak valid." });
  if (!(Number(amount) > 0)) return res.status(400).json({ error: "Nominal harus lebih dari Rp 0." });
  try {
    const tx = createTransaction({ targetId, type, amount: Number(amount), note });
    res.status(201).json({ transaction: tx, state: getState() });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

api.delete("/transactions/:id", (req, res) => {
  try {
    deleteTransaction(req.params.id);
    res.json({ state: getState() });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

api.post("/recommendation/apply", (req, res) => {
  const { targetId, amount } = req.body || {};
  if (!targetId || !(Number(amount) > 0)) return res.status(400).json({ error: "Data rekomendasi tidak valid." });
  try {
    const tx = createTransaction({ targetId, type: "setor", amount: Number(amount), note: "Rekomendasi AI" });
    setAppliedRecommendation(true);
    res.status(201).json({ transaction: tx, state: getState() });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.use("/api", api);

// Serve the built frontend (production) if present, so the whole app
// can run as a single deployable service.
const frontendDist = join(__dirname, "..", "..", "frontend", "dist");
if (existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(join(frontendDist, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`Tabunganku API berjalan di http://localhost:${PORT}`);
});
