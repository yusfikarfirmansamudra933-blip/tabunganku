# Tabunganku

Aplikasi mobile pelacak tabungan — skor disiplin, alokasi target, rekomendasi AI, dan lencana pencapaian. Dibangun sebagai proyek full-stack: frontend statis (Vite + Tailwind, di-*compile* saat build, bukan lewat CDN) dan backend REST API (Node.js + Express) sehingga data tersimpan di server, bukan cuma di satu perangkat.

> Catatan: versi sebelumnya (Claude Artifact) memakai Tailwind lewat CDN yang menyuntik `<style>` saat runtime. Itu diblokir oleh kebijakan keamanan (CSP) di beberapa WebView, termasuk aplikasi mobile Claude — makanya tampilannya berantakan dan ikon muncul sebagai teks. Proyek ini memperbaikinya dengan meng-compile Tailwind menjadi CSS statis saat build, jadi tidak bergantung pada eksekusi script pihak ketiga saat halaman dibuka.

## Struktur proyek

```
tabunganku/
├── frontend/   # Vite + Tailwind (CSS di-compile saat build, bukan CDN runtime)
└── backend/    # Node.js + Express, REST API, penyimpanan data di file JSON
```

## Menjalankan secara lokal

Butuh Node.js 18+ terpasang.

```bash
npm install
npm run dev
```

Perintah di atas menjalankan backend di `http://localhost:3001` dan frontend (Vite dev server) di `http://localhost:5173` sekaligus, dengan proxy otomatis `/api` dari frontend ke backend. Buka `http://localhost:5173` di browser.

## Build untuk produksi

```bash
npm run build      # meng-compile frontend ke frontend/dist
npm start           # backend menyajikan API + file statis frontend/dist dari satu proses
```

Setelah `npm run build`, backend (`npm start`) otomatis ikut menyajikan file frontend hasil build — jadi cukup **satu proses/satu server** untuk deploy, tidak perlu dua layanan terpisah.

## Server apa yang cocok?

Untuk skala aplikasi ini (pelacak tabungan pribadi, satu pengguna), rekomendasinya:

- **Runtime**: Node.js + Express — ringan, ekosistem besar, mudah di-deploy di hampir semua platform.
- **Penyimpanan data**: saat ini pakai file JSON sederhana (`backend/data/db.json`) — nol konfigurasi, cukup untuk penggunaan pribadi. Kalau nanti butuh multi-pengguna atau skala lebih besar, tinggal ganti ke database sungguhan:
  - **SQLite** (`better-sqlite3` atau `node:sqlite`) — masih file-based, tidak perlu server DB terpisah, cocok untuk single-user/self-host.
  - **PostgreSQL terkelola** (Neon, Supabase, atau addon Postgres di Railway) — kalau butuh multi-user, backup otomatis, dan akses concurrent yang lebih aman.
- **Hosting yang cocok**:
  - **Railway** (rekomendasi utama) — deploy langsung dari GitHub, mendukung *persistent volume* sehingga file `db.json`/SQLite tidak hilang saat redeploy, tier gratis/murah cukup untuk proyek pribadi.
  - **Render** — alternatif serupa (Web Service Node.js), tapi *persistent disk* hanya tersedia di paket berbayar; kalau pakai tier gratis Render, sebaiknya migrasi penyimpanan ke Postgres (Render juga menyediakan Postgres gratis) supaya data tidak hilang saat instance di-restart.
  - **Fly.io** — cocok kalau ingin kontrol lebih (volume + region custom).

Ringkasnya: mulai dengan Node.js + Express + file JSON (sudah disiapkan di repo ini), deploy ke Railway. Kalau aplikasi berkembang jadi multi-pengguna, tinggal ganti lapisan penyimpanan (`backend/src/store.js`) ke Postgres tanpa mengubah frontend maupun endpoint API.

## Endpoint API

| Method | Path | Keterangan |
| --- | --- | --- |
| GET | `/api/state` | Ambil semua target & transaksi |
| POST | `/api/targets` | Buat target baru `{ name, category, target, current, deadline }` |
| DELETE | `/api/targets/:id` | Hapus target beserta riwayat transaksinya |
| POST | `/api/transactions` | Catat setoran/tarik `{ targetId, type: "setor"|"tarik", amount }` |
| POST | `/api/recommendation/apply` | Terapkan rekomendasi AI `{ targetId, amount }` |
