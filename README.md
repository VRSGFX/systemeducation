<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/2fe93737-d74a-47ec-9e08-fc8bbb13124c

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

---

## Backend: Firebase (Auth) + Supabase (Database)

Aplikasi ini sekarang memakai:
- **Firebase Authentication** — login/register siswa & guru (NISN/NIP dipetakan ke email sintetis `<nisn>@edutrack.local` secara internal).
- **Supabase (Postgres)** — semua data: profil pengguna, absensi, pengumuman, nilai, dan kalender sekolah.

### Setup

1. **Firebase**
   - Buka [Firebase Console](https://console.firebase.google.com) → project kamu → Authentication → Sign-in method → aktifkan **Email/Password**.
   - Kredensial project sudah diisi di `.env.local`.

2. **Supabase**
   - Buka Supabase Dashboard → project kamu → **SQL Editor**.
   - Jalankan isi file [`supabase-schema.sql`](./supabase-schema.sql) untuk membuat tabel `profiles`, `attendance_records`, `announcements`, `grades`, `events` beserta RLS policy-nya.
   - Kredensial project sudah diisi di `.env.local`.

3. Install dependencies & jalankan:
   ```bash
   npm install
   npm run dev
   ```

### Catatan penting

- **Akun admin pertama**: form registrasi hanya membuat akun `student` atau `teacher`. Untuk membuat akun admin, daftar dulu sebagai guru lewat portal Guru/Admin, lalu di Supabase Table Editor ubah kolom `role` pada baris tersebut di tabel `profiles` menjadi `admin`.
- **Keamanan RLS**: karena login memakai Firebase Auth (bukan Supabase Auth), Supabase tidak bisa membaca `auth.uid()` milik Firebase. Policy RLS di `supabase-schema.sql` dibuat terbuka (read/write via anon key) supaya app tetap berfungsi penuh dari client. Untuk produksi yang lebih ketat, pertimbangkan menambahkan Supabase Edge Function yang memverifikasi Firebase ID token sebelum melakukan write sensitif (mis. ubah `credit_score` atau `role`).
- **Data lama**: versi sebelumnya menyimpan data di `localStorage` (mock). Setelah update ini, semua data baru tersimpan permanen di Supabase — data mock lama tidak otomatis dipindahkan.
