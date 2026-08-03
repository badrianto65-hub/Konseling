import { GoogleGenAI } from "@google/genai";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { category, title, problemDescription, studentName, kelas, moodToday } = req.body || {};

    if (!problemDescription) {
      return res.status(400).json({ error: "Deskripsi masalah siswa wajib diisi." });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ 
        error: "GEMINI_API_KEY belum dikonfigurasi di environment Vercel." 
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `Anda adalah seorang Pakar Psikologi Pendidikan dan Supervisor Senior Bimbingan Konseling (BK) di Indonesia.
Seorang Guru BK memerlukan panduan strategi konseling profesional untuk menangani siswa berikut:

[DATA SISWA]
Nama Siswa: ${studentName || "Siswa"}
Kelas: ${kelas || "SMP/SMA"}
Kategori Masalah: ${category || "Pribadi"}
Judul/Keluhan: ${title || "Masalah Siswa"}
Mood Hari Ini: ${moodToday || "Tidak terdefinisi"}
Deskripsi Masalah:
"${problemDescription}"

Berikan saran penanganan konseling yang berorientasi pada empati, solusi humanis, serta kode etik konselor.
Susun jawaban secara rapi dengan struktur Markdown sebagai berikut:

### 1. Analisis Ringkas Permasalahan
(Identifikasi faktor penyebab internal/eksternal dan dampak emosional pada siswa)

### 2. Pendekatan Konseling yang Direkomendasikan
(Pilih pendekatan yang paling cocok, misal: Solution-Focused Brief Therapy / SFBT, Person-Centered, Cognitive Behavioral, dll)

### 3. Draf Kalimat Pembuka & Pertanyaan Reflektif Guru BK
(Contoh kalimat empati awal untuk menyapa siswa dan 3 pertanyaan terbuka untuk mengeksplorasi perasaan siswa)

### 4. Rencana Tindak Lanjut & Solusi (Action Plan)
(Langkah konkret yang bisa diambil siswa dan kolaborasi dengan orang tua/guru mata pelajaran jika diperlukan)`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return res.status(200).json({
      success: true,
      suggestion: response.text,
    });
  } catch (error: any) {
    console.error("Gemini API Error on Vercel:", error);
    return res.status(500).json({
      error: "Gagal memproses saran AI Konselor.",
      details: error.message || String(error),
    });
  }
}
