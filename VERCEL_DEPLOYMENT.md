# Panduan Deploy Aplikasi BK Next G ke Vercel & Login Gmail / Google Auth

Aplikasi **BK Next Generation** ini sudah dirancang **100% kompatibel dan Vercel Ready**, sehingga dapat di-deploy ke Vercel (maupun platform Cloud Run / Node hosting lainnya) dengan aman dan lancar.

---

## 🚀 Langkah Deploy ke Vercel (Langkah Demi Langkah)

### 1. Push Kode ke Repository GitHub
Pastikan seluruh file aplikasi ini telah di-commit dan di-push ke akun GitHub Anda.

### 2. Hubungkan ke Vercel
1. Buka [https://vercel.com](https://vercel.com) dan login menggunakan akun Vercel/GitHub Anda.
2. Klik tombol **"Add New..."** -> **"Project"**.
3. Pilih repository GitHub aplikasi BK Next G ini.

### 3. Pengaturan Build & Environment Variable di Vercel
Pada halaman **Configure Project** Vercel:
- **Framework Preset**: Pilih `Vite` (Vercel akan mendeteksi otomatis).
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variables**:
  Tambahkan variabel lingkungan berikut:
  - `GEMINI_API_KEY`: Masukkan API Key Google Gemini Anda (dari Google AI Studio) agar fitur **AI Konselor Assistant** berfungsi penuh pada serverless Vercel.
  - *(Opsional)* `VITE_GOOGLE_CLIENT_ID`: Jika ingin menggunakan Google OAuth Client ID resmi dari Google Cloud Console.

### 4. Klik "Deploy"
Vercel akan memproses pengerjaan build secara otomatis dan memberikan URL live domain Vercel Anda (misal: `https://bk-nextg-app.vercel.app`).

---

## 🔐 Keamanan & Login Gmail / Google Auth di Vercel

1. **Dukungan Alamat Gmail / Belajar.id**:
   - Pengguna (Guru BK maupun Siswa) dapat masuk menggunakan alamat email Gmail pribadi (`@gmail.com`) atau email resmi Sekolah (`@guru.smp.belajar.id` / `@siswa.belajar.id`).
   - Tombol **"Masuk dengan Google (Gmail / Belajar.id)"** di modal login akan memverifikasi peran dan hak akses secara instan.

2. **Sistem Whitelist Guru BK (Server Protection)**:
   - Untuk keamanan Aplikasi Server Guru BK, hanya alamat email Gmail yang terdaftar di **Whitelist Data Sekolah** yang diizinkan mengelola dashboard server.
   - Email default server yang terdaftar (Whitelisted):
     - `badrianto65@guru.smp.belajar.id` (Badrianto, S.Pd.)
   - Guru BK dapat menambah atau mendaftarkan alamat email Gmail Guru BK baru langsung melalui Tab **"Data Sekolah"** -> **"Whitelist Gmail Konselor"** di Dashboard Server.

3. **Integrasi Google Sheets di Vercel**:
   - Semua rekapitulasi data masalah siswa dan mood tracker tetap dapat disinkronkan ke **Google Sheets API / Webhook** meskipun aplikasi di-deploy di Vercel.

---

## 📄 File Konfigurasi Otomatis Vercel
Aplikasi ini sudah dilengkapi dengan file pendukung berikut:
- `vercel.json`: Pengaturan rewrite SPA (Single Page Application) dan routing API Vercel.
- `/api/ai-counselor-suggest.ts`: Vercel Serverless Function untuk layanan rekomendasi strategi konseling AI.
