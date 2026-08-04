import { SchoolData, Counselor, Student, ConsultationRequest, MoodEntry, ChatMessage, User } from '../types';

const STORAGE_KEYS = {
  CURRENT_USER: 'bk_nextg_current_user',
  SCHOOL_DATA: 'bk_nextg_school_data',
  CONSULTATIONS: 'bk_nextg_consultations',
  MOOD_ENTRIES: 'bk_nextg_mood_entries',
  SHEETS_CONFIG: 'bk_nextg_sheets_config',
};

// Default seed data
const DEFAULT_SCHOOL: SchoolData = {
  schoolName: 'SMP Negeri 1 BK Next Generation',
  npsn: '20261024',
  address: 'Jl. Pendidikan No. 45, Kota Edukasi',
  academicYear: '2025/2026',
  visionMission: 'Terwujudnya peserta didik yang berkarakter, mandiri, tangguh secara emosional dan berprestasi unggul melalui Layanan Bimbingan Konseling Digital yang Humanis.',
  autoSyncGoogleSheet: true,
  counselors: [
    {
      id: 'c-1',
      name: 'Badrianto, S.Pd.',
      email: 'badrianto65@guru.smp.belajar.id',
      nip: '198503122010011005',
      specialization: 'Bimbingan & Konseling Sekolah',
      isOnline: true,
      isWhitelisted: true,
      photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    }
  ],
  students: [
    { id: 's-101', nisn: '0081234501', name: 'Ahmad Rizky Pratama', kelas: '8A', absen: '02', email: 'ahmad.rizky@siswa.belajar.id', notes: 'Perlunya bimbingan fokus belajar' },
    { id: 's-102', nisn: '0081234502', name: 'Anisa Maharani', kelas: '8A', absen: '05', email: 'anisa.m@siswa.belajar.id', notes: 'Aktif di organisasi OSIS' },
    { id: 's-103', nisn: '0081234503', name: 'Bagas Surya Utama', kelas: '7B', absen: '08', email: 'bagas.surya@siswa.belajar.id', notes: 'Siswa pindahan' },
    { id: 's-104', nisn: '0081234504', name: 'Dina Nurhaliza', kelas: '9C', absen: '12', email: 'dina.nur@siswa.belajar.id', notes: 'Membutuhkan saran kelanjutan sekolah SMA/SMK' },
    { id: 's-105', nisn: '0081234505', name: 'Fikri Haikal', kelas: '8A', absen: '15', email: 'fikri.haikal@siswa.belajar.id', notes: 'Konsultasi minat bakat olahraga' }
  ]
};

const DEFAULT_CONSULTATIONS: ConsultationRequest[] = [];

const DEFAULT_MOODS: MoodEntry[] = [];

// Broadcast channel for multi-tab updates
let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel('bk_nextg_realtime_channel');
  } catch (e) {
    console.warn('BroadcastChannel not supported', e);
  }
}

export const notifyDataChanged = (type: string) => {
  if (broadcastChannel) {
    broadcastChannel.postMessage({ type, timestamp: Date.now() });
  }
};

export const subscribeToRealtimeChanges = (callback: (type: string) => void) => {
  if (broadcastChannel) {
    const handler = (event: MessageEvent) => {
      if (event.data && event.data.type) {
        callback(event.data.type);
      }
    };
    broadcastChannel.addEventListener('message', handler);
    return () => broadcastChannel?.removeEventListener('message', handler);
  }
  return () => {};
};

// Storage Utilities
export const getSchoolData = (): SchoolData => {
  const data = localStorage.getItem(STORAGE_KEYS.SCHOOL_DATA);
  if (!data) {
    saveSchoolData(DEFAULT_SCHOOL);
    return DEFAULT_SCHOOL;
  }
  try {
    return JSON.parse(data);
  } catch {
    return DEFAULT_SCHOOL;
  }
};

export const saveSchoolData = (schoolData: SchoolData): void => {
  localStorage.setItem(STORAGE_KEYS.SCHOOL_DATA, JSON.stringify(schoolData));
  notifyDataChanged('school_data');
};

export const getConsultations = (): ConsultationRequest[] => {
  const data = localStorage.getItem(STORAGE_KEYS.CONSULTATIONS);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.CONSULTATIONS, JSON.stringify(DEFAULT_CONSULTATIONS));
    return DEFAULT_CONSULTATIONS;
  }
  try {
    return JSON.parse(data);
  } catch {
    return DEFAULT_CONSULTATIONS;
  }
};

export const saveConsultation = (request: ConsultationRequest): void => {
  const list = getConsultations();
  const index = list.findIndex(r => r.id === request.id);
  if (index >= 0) {
    list[index] = request;
  } else {
    list.unshift(request);
  }
  localStorage.setItem(STORAGE_KEYS.CONSULTATIONS, JSON.stringify(list));
  notifyDataChanged('consultations');
};

export const deleteConsultation = (id: string): void => {
  const list = getConsultations().filter(r => r.id !== id);
  localStorage.setItem(STORAGE_KEYS.CONSULTATIONS, JSON.stringify(list));
  notifyDataChanged('consultations');
};

export const clearAllConsultations = (): void => {
  localStorage.setItem(STORAGE_KEYS.CONSULTATIONS, JSON.stringify([]));
  notifyDataChanged('consultations');
};

export const addChatMessage = (consultationId: string, message: ChatMessage): ConsultationRequest | null => {
  const list = getConsultations();
  const req = list.find(r => r.id === consultationId);
  if (req) {
    req.messages.push(message);
    req.updatedAt = new Date().toISOString();
    if (req.status === 'Menunggu Tanggapan' && message.senderRole === 'server_guru') {
      req.status = 'Sedang Konseling';
    }
    saveConsultation(req);
    return req;
  }
  return null;
};

export const getMoodEntries = (): MoodEntry[] => {
  const data = localStorage.getItem(STORAGE_KEYS.MOOD_ENTRIES);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.MOOD_ENTRIES, JSON.stringify(DEFAULT_MOODS));
    return DEFAULT_MOODS;
  }
  try {
    return JSON.parse(data);
  } catch {
    return DEFAULT_MOODS;
  }
};

export const saveMoodEntry = (entry: MoodEntry): void => {
  const list = getMoodEntries();
  list.unshift(entry);
  localStorage.setItem(STORAGE_KEYS.MOOD_ENTRIES, JSON.stringify(list));
  notifyDataChanged('mood_entries');
};

export const getCurrentUser = (): User | null => {
  const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
};

export const setCurrentUser = (user: User | null): void => {
  if (user) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  }
  notifyDataChanged('current_user');
};

export const isWhitelistedCounselorEmail = (email: string): boolean => {
  const school = getSchoolData();
  const cleanEmail = email.toLowerCase().trim();
  return school.counselors.some(c => c.email.toLowerCase().trim() === cleanEmail && c.isWhitelisted !== false);
};
