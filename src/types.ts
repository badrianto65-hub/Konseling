export type UserRole = 'server_guru' | 'client_siswa';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  kelas?: string;
  absen?: string;
  nisn?: string;
  googleAccount: boolean;
}

export interface Counselor {
  id: string;
  name: string;
  email: string;
  nip?: string;
  specialization: string;
  photo?: string;
  isOnline: boolean;
  isWhitelisted: boolean;
}

export interface Student {
  id: string;
  nisn: string;
  name: string;
  kelas: string;
  absen: string;
  email: string;
  notes?: string;
  totalConsultations?: number;
}

export interface SchoolData {
  schoolName: string;
  npsn: string;
  address: string;
  academicYear: string;
  visionMission: string;
  googleSheetUrl?: string;
  autoSyncGoogleSheet: boolean;
  counselors: Counselor[];
  students: Student[];
}

export interface MoodEntry {
  id: string;
  studentEmail: string;
  studentName: string;
  kelas: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  moodScore: 1 | 2 | 3 | 4 | 5; // 1: Cemas/Marah, 2: Sedih, 3: Biasa, 4: Baik, 5: Sangat Baik
  moodLabel: string;
  notes?: string;
}

export type ProblemCategory = 'Pribadi' | 'Sosial' | 'Belajar' | 'Karir';
export type ConsultationStatus = 'Menunggu Tanggapan' | 'Sedang Konseling' | 'Selesai' | 'Diarsipkan';

export interface ChatMessage {
  id: string;
  senderEmail: string;
  senderName: string;
  senderRole: UserRole;
  content: string;
  timestamp: string;
  isRead: boolean;
}

export interface ConsultationRequest {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  kelas: string;
  absen: string;
  counselorId: string;
  counselorName: string;
  counselorEmail: string;
  category: ProblemCategory;
  title: string;
  problemDescription: string;
  moodToday?: string;
  status: ConsultationStatus;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  counselorNotes?: string;
  solutionSummary?: string;
  followUpAction?: string;
}

export interface GoogleSheetsConfig {
  spreadsheetUrl: string;
  appsScriptWebhookUrl: string;
  autoSyncEnabled: boolean;
  lastSyncTimestamp?: string;
}
