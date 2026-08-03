import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Healthcheck API
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", app: "BK Next G Server" });
  });

  // AI Counselor Strategy Assistant API Endpoint
  app.post("/api/ai-counselor-suggest", async (req, res) => {
    try {
      const { category, title, problemDescription, studentName, kelas, moodToday } = req.body;

      if (!problemDescription) {
        return res.status(400).json({ error: "Deskripsi masalah siswa wajib diisi." });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ 
          error: "GEMINI_API_KEY belum dikonfigurasi di lingkungan server." 
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

      return res.json({
        success: true,
        suggestion: response.text,
      });
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      return res.status(500).json({
        error: "Gagal memproses saran AI Konselor.",
        details: error.message || String(error),
      });
    }
  });

  // Vite middleware for development vs Production static serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`BK Next G Application server running on http://localhost:${PORT}`);
  });
}

startServer();
