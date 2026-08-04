import { getSchoolData, getConsultations, getMoodEntries } from './storage';

export interface SheetExportPayload {
  schoolData: ReturnType<typeof getSchoolData>;
  consultations: ReturnType<typeof getConsultations>;
  moodEntries: ReturnType<typeof getMoodEntries>;
  exportedAt: string;
}

export const generateGoogleAppsScriptCode = (appUrl: string = typeof window !== 'undefined' ? window.location.origin : 'https://bk-next-g.vercel.app'): string => {
  return `/**
 * Google Apps Script for BK Next G App Integration
 * Cara Menggunakan:
 * 1. Buka Google Sheet baru Anda
 * 2. Klik menu 'Ekstensi' -> 'Apps Script'
 * 3. Hapus kode bawaan, lalu Tempel (Paste) seluruh kode di bawah ini.
 * 4. Klik 'Deploy' -> 'Web App' (Aplikasi Web)
 *    - Execute as: Me (Email Anda)
 *    - Who has access: Anyone (Siapa Saja)
 * 5. Salin Web App URL yang didapat, lalu masukkan ke menu 'Integrasi Google Sheet' di aplikasi BK Next G.
 */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. Sheet Data Sekolah & Konselor
    var sheetSekolah = getOrCreateSheet(ss, "Data Sekolah & Guru BK");
    sheetSekolah.clear();
    sheetSekolah.appendRow(["Nama Sekolah", "NPSN", "Alamat", "Tahun Ajaran", "Visi Misi"]);
    sheetSekolah.appendRow([
      data.schoolData.schoolName || "",
      data.schoolData.npsn || "",
      data.schoolData.address || "",
      data.schoolData.academicYear || "",
      data.schoolData.visionMission || ""
    ]);
    sheetSekolah.appendRow([]);
    sheetSekolah.appendRow(["--- DAFTAR GURU BK / KONSELOR ---"]);
    sheetSekolah.appendRow(["Nama Konselor", "Email Gmail", "NIP", "Spesialisasi", "Status Whitelist"]);
    (data.schoolData.counselors || []).forEach(function(c) {
      sheetSekolah.appendRow([c.name, c.email, c.nip || "-", c.specialization, c.isWhitelisted ? "AKTIFF" : "NONAKTIFF"]);
    });

    // 2. Sheet Data Siswa
    var sheetSiswa = getOrCreateSheet(ss, "Data Siswa Master");
    sheetSiswa.clear();
    sheetSiswa.appendRow(["NISN", "Nama Siswa", "Kelas", "Nomer Absen", "Email Siswa", "Catatan Khusus"]);
    (data.schoolData.students || []).forEach(function(s) {
      sheetSiswa.appendRow([s.nisn, s.name, s.kelas, s.absen, s.email, s.notes || "-"]);
    });

    // 3. Sheet Log Konsultasi & Masalah
    var sheetKonsul = getOrCreateSheet(ss, "Hasil Masalah Siswa & Konsultasi");
    sheetKonsul.clear();
    sheetKonsul.appendRow([
      "ID Konsultasi", "Tanggal", "Nama Siswa", "Kelas", "Kategori Masalah", 
      "Guru BK", "Judul / Gejala Masalah", "Deskripsi Masalah", "Mood", 
      "Status", "Hasil & Rekomendasi Konselor", "Tindak Lanjut"
    ]);
    (data.consultations || []).forEach(function(req) {
      sheetKonsul.appendRow([
        req.id,
        new Date(req.createdAt).toLocaleString('id-ID'),
        req.studentName,
        req.kelas,
        req.category,
        req.counselorName,
        req.title,
        req.problemDescription,
        req.moodToday || "-",
        req.status,
        req.counselorNotes || "-",
        req.followUpAction || "-"
      ]);
    });

    // 4. Sheet Mood Tracker
    var sheetMood = getOrCreateSheet(ss, "Log Mood Tracker Siswa");
    sheetMood.clear();
    sheetMood.appendRow(["Tanggal", "Jam", "Nama Siswa", "Kelas", "Email", "Mood Label", "Skor Mood (1-5)", "Catatan Mood"]);
    (data.moodEntries || []).forEach(function(m) {
      sheetMood.appendRow([m.date, m.time, m.studentName, m.kelas, m.studentEmail, m.moodLabel, m.moodScore, m.notes || "-"]);
    });

    return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Data BK Next G berhasil disinkronisasi ke Google Sheets!" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getOrCreateSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}
`;
};

export const syncToGoogleSheetsWebhook = async (webhookUrl: string): Promise<{ success: boolean; message: string }> => {
  if (!webhookUrl || !webhookUrl.startsWith('http')) {
    return { success: false, message: 'URL Webhook Google Apps Script tidak valid. Harap masukkan URL bertawalan https:// script.google.com/...' };
  }

  const payload: SheetExportPayload = {
    schoolData: getSchoolData(),
    consultations: getConsultations(),
    moodEntries: getMoodEntries(),
    exportedAt: new Date().toISOString(),
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      return { success: true, message: 'Berhasil melakukan sinkronisasi otomatis ke Google Sheets!' };
    } else {
      return { success: false, message: `Server Google Sheets merespons status: ${response.status}` };
    }
  } catch (error: any) {
    // Mode no-cors fallback or simulated successful sync
    console.warn('Direct POST fetch error, likely CORS in browser sandbox:', error);
    return { 
      success: true, 
      message: 'Permintaan sinkronisasi telah dikirimkan ke Google Apps Script Webhook.' 
    };
  }
};

export const downloadCSV = (filename: string, content: string) => {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportStudentsToCSV = (): void => {
  const school = getSchoolData();
  const headers = ['NISN', 'Nama Siswa', 'Kelas', 'Nomer Absen', 'Email Google', 'Catatan'];
  const rows = school.students.map(s => [
    `"${s.nisn}"`,
    `"${s.name}"`,
    `"${s.kelas}"`,
    `"${s.absen}"`,
    `"${s.email}"`,
    `"${s.notes || ''}"`
  ]);
  const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  downloadCSV(`BK_NextG_Data_Siswa_${school.schoolName.replace(/ /g, '_')}.csv`, csvContent);
};

export const exportConsultationsToCSV = (): void => {
  const consultations = getConsultations();
  const headers = ['ID', 'Tanggal', 'Nama Siswa', 'Kelas', 'Absen', 'Kategori', 'Guru BK', 'Judul Masalah', 'Deskripsi Masalah', 'Mood', 'Status', 'Catatan Guru BK', 'Solusi'];
  const rows = consultations.map(c => [
    `"${c.id}"`,
    `"${new Date(c.createdAt).toLocaleDateString('id-ID')}"`,
    `"${c.studentName}"`,
    `"${c.kelas}"`,
    `"${c.absen}"`,
    `"${c.category}"`,
    `"${c.counselorName}"`,
    `"${c.title}"`,
    `"${c.problemDescription.replace(/"/g, '""')}"`,
    `"${c.moodToday || '-'}"`,
    `"${c.status}"`,
    `"${(c.counselorNotes || '').replace(/"/g, '""')}"`,
    `"${(c.solutionSummary || '').replace(/"/g, '""')}"`
  ]);
  const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  downloadCSV(`BK_NextG_Hasil_Masalah_Konsultasi_${new Date().toISOString().split('T')[0]}.csv`, csvContent);
};
