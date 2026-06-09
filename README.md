# Jadwal Mingguan · Perkantas Jawa Barat

Platform jadwal mingguan online untuk 10 staf Perkantas Jabar.
Real-time sync via Supabase, hosting di Vercel.

---

## 🚀 Cara Deploy (ikuti urutan ini)

### Langkah 1 — Setup Supabase

1. Buka [supabase.com](https://supabase.com) dan login
2. Klik **New project** → isi nama: `perkantas-jadwal` → pilih region terdekat (Singapore) → klik **Create**
3. Tunggu project selesai dibuat (~1 menit)
4. Pergi ke **SQL Editor** (menu kiri)
5. Copy semua isi file `supabase-schema.sql` → paste → klik **Run**
6. Pergi ke **Database → Replication** → aktifkan toggle untuk tabel `jadwal`
7. Pergi ke **Project Settings → API**
8. Catat dua nilai ini:
   - **Project URL** → bentuknya `https://xxxxxxxx.supabase.co`
   - **anon public key** → string panjang dimulai dengan `eyJ...`

### Langkah 2 — Upload ke GitHub

1. Buka [github.com](https://github.com) dan login
2. Klik **New repository** → nama: `perkantas-jadwal` → **Public** → klik **Create**
3. Upload semua file project ini:
   - Klik **uploading an existing file**
   - Drag & drop semua file dan folder (`app/`, `lib/`, `package.json`, `next.config.js`, `.gitignore`)
   - Klik **Commit changes**

### Langkah 3 — Deploy ke Vercel

1. Buka [vercel.com](https://vercel.com) dan login dengan akun GitHub
2. Klik **Add New → Project**
3. Pilih repository `perkantas-jadwal`
4. Sebelum klik Deploy, buka bagian **Environment Variables** dan tambahkan:
   ```
   NEXT_PUBLIC_SUPABASE_URL     = (Project URL dari Langkah 1)
   NEXT_PUBLIC_SUPABASE_ANON_KEY = (anon key dari Langkah 1)
   ```
5. Klik **Deploy**
6. Tunggu ~2 menit → Vercel akan kasih link seperti `https://perkantas-jadwal.vercel.app`

### Langkah 4 — Bagikan ke Staf

Bagikan link Vercel ke semua 10 staf.
Masing-masing buka di browser → pilih nama → langsung bisa isi jadwal!

---

## ✅ Fitur

- 10 staf terdaftar, masing-masing pilih nama sendiri
- Jadwal pribadi: hanya terlihat oleh yang bersangkutan
- Jadwal bersama: semua staf bisa lihat dan isi
- Tampilan "Semua Staf" untuk lihat jadwal semua orang sekaligus
- **Real-time**: perubahan langsung muncul tanpa refresh
- Navigasi per minggu
- Dark mode otomatis
- Responsif di HP

---

## 🔧 Ganti Nama Staf

Edit file `app/ScheduleApp.js`, baris paling atas ada:

```js
const STAFF = [
  'Adinda Putri', 'Benny Kurniawan', ...
]
```

Ganti sesuai nama staf yang sebenarnya, lalu push ke GitHub → Vercel otomatis deploy ulang.
