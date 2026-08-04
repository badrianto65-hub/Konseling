import React, { useState, useEffect, useRef } from 'react';
import { User, SchoolData, ConsultationRequest, MoodEntry, ProblemCategory, ChatMessage } from '../../types';
import { getSchoolData, getConsultations, saveConsultation, getMoodEntries, saveMoodEntry, subscribeToRealtimeChanges, addChatMessage } from '../../services/storage';
import { Smile, Frown, Meh, HeartPulse, Send, MessageSquare, PlusCircle, CheckCircle2, Clock, Sparkles, BookOpen, AlertCircle, UserCheck, GraduationCap } from 'lucide-react';
import counselorLogo from '../../assets/images/regenerated_image_1785801760360.png';

interface ClientDashboardProps {
  currentUser: User;
}

export const ClientDashboard: React.FC<ClientDashboardProps> = ({ currentUser }) => {
  const [schoolData, setSchoolData] = useState<SchoolData>(getSchoolData());
  const [consultations, setConsultations] = useState<ConsultationRequest[]>(getConsultations());
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>(getMoodEntries());

  // Student Input State
  const [studentName, setStudentName] = useState(currentUser.name || '');
  const [kelas, setKelas] = useState(currentUser.kelas || '8A');
  const [absen, setAbsen] = useState(currentUser.absen || '01');

  // Mood Tracker State
  const [selectedMoodScore, setSelectedMoodScore] = useState<1 | 2 | 3 | 4 | 5>(4);
  const [moodNotes, setMoodNotes] = useState('');
  const [moodSubmittedToday, setMoodSubmittedToday] = useState(false);

  // New Consultation Form State
  const [selectedCounselorId, setSelectedCounselorId] = useState<string>('');
  const [category, setCategory] = useState<ProblemCategory>('Pribadi');
  const [title, setTitle] = useState('');
  const [problemDescription, setProblemDescription] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Active Chat State
  const [activeConsultationId, setActiveConsultationId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Active Tab: 'buat_konsultasi' | 'chat_room' | 'riwayat' | 'mood_log'
  const [activeTab, setActiveTab] = useState<'buat_konsultasi' | 'chat_room' | 'riwayat' | 'mood_log'>('buat_konsultasi');

  // Sync Data Effect
  const refreshData = () => {
    setSchoolData(getSchoolData());
    setConsultations(getConsultations());
    setMoodEntries(getMoodEntries());
  };

  useEffect(() => {
    refreshData();
    const unsubscribe = subscribeToRealtimeChanges(() => {
      refreshData();
    });
    return () => unsubscribe();
  }, []);

  // Pre-select first counselor
  useEffect(() => {
    if (schoolData.counselors.length > 0 && !selectedCounselorId) {
      setSelectedCounselorId(schoolData.counselors[0].id);
    }
  }, [schoolData.counselors]);

  // Check if student already submitted mood today
  const todayStr = new Date().toISOString().split('T')[0];
  const myMoodEntries = moodEntries.filter(m => m.studentEmail.toLowerCase() === currentUser.email.toLowerCase());
  const todayMood = myMoodEntries.find(m => m.date === todayStr);

  const moodOptions = [
    { score: 5 as const, emoji: '😃', label: 'Sangat Baik', bg: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
    { score: 4 as const, emoji: '🙂', label: 'Baik', bg: 'bg-blue-50 border-blue-200 text-blue-800' },
    { score: 3 as const, emoji: '😐', label: 'Biasa Aja', bg: 'bg-slate-50 border-slate-200 text-slate-800' },
    { score: 2 as const, emoji: '😔', label: 'Sedih', bg: 'bg-amber-50 border-amber-200 text-amber-800' },
    { score: 1 as const, emoji: '😡', label: 'Cemas/Marah', bg: 'bg-rose-50 border-rose-200 text-rose-800' },
  ];

  const handleSaveMood = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedObj = moodOptions.find(m => m.score === selectedMoodScore);
    const newEntry: MoodEntry = {
      id: `m-${Date.now()}`,
      studentEmail: currentUser.email,
      studentName: studentName || currentUser.name,
      kelas: kelas,
      date: todayStr,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      moodScore: selectedMoodScore,
      moodLabel: selectedObj ? selectedObj.label : 'Baik',
      notes: moodNotes,
    };
    saveMoodEntry(newEntry);
    setMoodSubmittedToday(true);
    setMoodNotes('');
    refreshData();
  };

  const handleCreateConsultation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !problemDescription.trim()) {
      alert('Harap isi judul dan deskripsi masalah konsultasi Anda.');
      return;
    }

    const counselorObj = schoolData.counselors.find(c => c.id === selectedCounselorId) || schoolData.counselors[0];

    const newRequest: ConsultationRequest = {
      id: `req-${Date.now().toString().slice(-6)}`,
      studentId: currentUser.id,
      studentName: studentName || currentUser.name,
      studentEmail: currentUser.email,
      kelas: kelas,
      absen: absen,
      counselorId: counselorObj.id,
      counselorName: counselorObj.name,
      counselorEmail: counselorObj.email,
      category: category,
      title: title.trim(),
      problemDescription: problemDescription.trim(),
      moodToday: todayMood ? `${todayMood.moodLabel} (Skor ${todayMood.moodScore})` : 'Belum diisi',
      status: 'Menunggu Tanggapan',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [
        {
          id: `msg-${Date.now()}`,
          senderEmail: currentUser.email,
          senderName: studentName || currentUser.name,
          senderRole: 'client_siswa',
          content: problemDescription.trim(),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isRead: false,
        }
      ]
    };

    saveConsultation(newRequest);
    setTitle('');
    setProblemDescription('');
    setShowSuccessModal(true);
    setActiveConsultationId(newRequest.id);
    setActiveTab('chat_room');
    refreshData();
  };

  // Filter my student consultations
  const myConsultations = consultations.filter(c => c.studentEmail.toLowerCase() === currentUser.email.toLowerCase());
  const activeConsultation = myConsultations.find(c => c.id === activeConsultationId) || myConsultations[0];

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeConsultation?.messages]);

  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeConsultation) return;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderEmail: currentUser.email,
      senderName: studentName || currentUser.name,
      senderRole: 'client_siswa',
      content: chatInput.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isRead: false,
    };

    addChatMessage(activeConsultation.id, newMsg);
    setChatInput('');
    refreshData();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner & Student Profile Card */}
      <div className="bg-indigo-900 rounded-[2rem] border-4 border-slate-900 p-6 md:p-8 text-white shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] relative overflow-hidden">
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-3">
              <img
                src={counselorLogo}
                alt="Logo Konselor BK"
                className="w-12 h-12 rounded-2xl border-2 border-slate-900 object-cover shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]"
                referrerPolicy="no-referrer"
              />
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-400 border-2 border-slate-900 text-slate-950 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                <GraduationCap className="w-4 h-4 text-slate-950" />
                <span>Aplikasi Client Siswa - BK Next G</span>
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight uppercase">
              Selamat Datang, {currentUser.name}!
            </h1>
            <p className="text-indigo-100 text-xs md:text-sm max-w-xl font-medium leading-relaxed">
              Layanan Bimbingan Konseling Sekolah kini hadir secara digital. Kamu bisa mencatat mood harian, memilih Guru BK favoritmu, dan berkonsultasi kapan saja secara aman dan rahasia.
            </p>
          </div>

          {/* Quick Editable Student Identity */}
          <div className="bg-indigo-950/80 border-3 border-slate-900 p-4 rounded-2xl text-xs space-y-3 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
            <div className="font-black text-amber-300 uppercase border-b-2 border-indigo-800 pb-2 flex items-center justify-between">
              <span>Identitas Siswa</span>
              <UserCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-indigo-200 block text-[10px] uppercase font-black">Kelas</label>
                <input
                  type="text"
                  value={kelas}
                  onChange={(e) => setKelas(e.target.value)}
                  className="w-full bg-indigo-900 border-2 border-slate-900 rounded-xl px-3 py-1 text-white text-xs font-bold focus:outline-none focus:border-emerald-400"
                />
              </div>
              <div>
                <label className="text-indigo-200 block text-[10px] uppercase font-black">No. Absen</label>
                <input
                  type="text"
                  value={absen}
                  onChange={(e) => setAbsen(e.target.value)}
                  className="w-full bg-indigo-900 border-2 border-slate-900 rounded-xl px-3 py-1 text-white text-xs font-bold focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>
            <div>
              <label className="text-indigo-200 block text-[10px] uppercase font-black">Email Google</label>
              <div className="text-white font-mono font-bold truncate">{currentUser.email}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Mood Tracker Section ("Mood Checker Hari Ini") */}
      <div className="bg-amber-50 rounded-[2rem] p-6 border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] space-y-4">
        <div className="flex items-center justify-between border-b-2 border-slate-900/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-400 text-slate-950 rounded-2xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
              <HeartPulse className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight text-slate-950">Mood Checker Hari Ini</h2>
              <p className="text-xs font-bold text-slate-600">Bagaimana perasaanmu hari ini sebelum berkonsultasi?</p>
            </div>
          </div>
          {todayMood && (
            <div className="px-3.5 py-1.5 bg-emerald-400 text-slate-950 border-2 border-slate-900 text-xs font-black uppercase rounded-xl flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
              <CheckCircle2 className="w-4 h-4 text-slate-950" />
              <span>Sudah Diisi: {todayMood.moodLabel}</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSaveMood} className="space-y-4">
          <div>
            <label className="block text-xs font-black text-slate-900 uppercase tracking-widest mb-3">
              Pilih Mood Kamu Hari Ini:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {moodOptions.map((m) => (
                <button
                  key={m.score}
                  type="button"
                  onClick={() => setSelectedMoodScore(m.score)}
                  className={`p-4 rounded-2xl border-3 border-slate-900 text-center transition-all flex flex-col items-center gap-1 cursor-pointer ${
                    selectedMoodScore === m.score
                      ? `${m.bg} shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] scale-105 font-black`
                      : 'bg-white hover:bg-slate-100 text-slate-700 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]'
                  }`}
                >
                  <span className="text-3xl">{m.emoji}</span>
                  <span className="text-xs uppercase font-extrabold mt-1">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div className="md:col-span-3">
              <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                Catatan Singkat Mood (Opsional)
              </label>
              <input
                type="text"
                value={moodNotes}
                onChange={(e) => setMoodNotes(e.target.value)}
                placeholder="misal: Merasa senang karena nilai tugas IPA bagus, atau cemas mau ulangan..."
                className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-900 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-wider rounded-xl text-xs border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] flex items-center justify-center gap-1.5 cursor-pointer active:translate-y-[1px]"
            >
              <Sparkles className="w-4 h-4" />
              <span>Simpan Mood</span>
            </button>
          </div>
        </form>
      </div>

      {/* Main Feature Navigation Tabs */}
      <div className="bg-white p-2.5 rounded-2xl border-3 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('buat_konsultasi')}
          className={`py-3 px-5 rounded-xl text-xs sm:text-sm font-black uppercase transition whitespace-nowrap flex items-center gap-2 cursor-pointer border-2 ${
            activeTab === 'buat_konsultasi'
              ? 'bg-indigo-600 text-white border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]'
              : 'border-transparent text-slate-700 hover:bg-slate-100'
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          <span>Ajukan Konsultasi Baru</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('chat_room')}
          className={`py-3 px-5 rounded-xl text-xs sm:text-sm font-black uppercase transition whitespace-nowrap flex items-center gap-2 cursor-pointer border-2 ${
            activeTab === 'chat_room'
              ? 'bg-indigo-600 text-white border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]'
              : 'border-transparent text-slate-700 hover:bg-slate-100'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Ruang Chat Bimbingan</span>
          {myConsultations.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black border border-slate-900">
              {myConsultations.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('riwayat')}
          className={`py-3 px-5 rounded-xl text-xs sm:text-sm font-black uppercase transition whitespace-nowrap flex items-center gap-2 cursor-pointer border-2 ${
            activeTab === 'riwayat'
              ? 'bg-indigo-600 text-white border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]'
              : 'border-transparent text-slate-700 hover:bg-slate-100'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Catatan & Hasil Bimbingan Saya</span>
        </button>
      </div>

      {/* TAB 1: FORM AJUKAN KONSULTASI */}
      {activeTab === 'buat_konsultasi' && (
        <div className="bg-white rounded-[2rem] p-6 md:p-8 border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] space-y-6">
          <div className="border-b-2 border-slate-200 pb-4">
            <h2 className="text-2xl font-black uppercase tracking-tight text-slate-950">Form Bimbingan Konseling Siswa</h2>
            <p className="text-xs font-bold text-slate-600 mt-1">
              Silakan tuliskan masalah atau hal yang ingin kamu diskusikan dengan Guru BK secara terbuka. Kerahasianmu dijamin sepenuhnya.
            </p>
          </div>

          <form onSubmit={handleCreateConsultation} className="space-y-6">
            {/* Step 1: Choose Counselor */}
            <div>
              <label className="block text-xs font-black text-slate-900 uppercase tracking-widest mb-3">
                1. Pilih Guru BK / Konselor yang Diinginkan <span className="text-rose-600">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {schoolData.counselors.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCounselorId(c.id)}
                    className={`p-4 rounded-2xl border-3 border-slate-900 text-left transition-all flex items-start gap-3 cursor-pointer ${
                      selectedCounselorId === c.id
                        ? 'bg-indigo-50 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] font-bold'
                        : 'bg-slate-50 hover:bg-slate-100 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]'
                    }`}
                  >
                    <img
                      src={c.photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                      alt={c.name}
                      className="w-12 h-12 rounded-xl object-cover border-2 border-slate-900 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-black text-xs text-slate-950 truncate">{c.name}</div>
                      <div className="text-[11px] text-indigo-700 font-bold">{c.specialization}</div>
                      <div className="flex items-center gap-1 mt-1 text-[10px] font-bold text-slate-600">
                        <span className={`w-2.5 h-2.5 rounded-full border border-slate-900 ${c.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-300'}`} />
                        <span>{c.isOnline ? 'Aktif Melayani' : 'Offline'}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Problem Category */}
            <div>
              <label className="block text-xs font-black text-slate-900 uppercase tracking-widest mb-3">
                2. Pilih Kategori Masalah <span className="text-rose-600">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(['Pribadi', 'Sosial', 'Belajar', 'Karir'] as ProblemCategory[]).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`py-3 px-4 rounded-xl border-2 border-slate-900 font-black text-xs uppercase transition cursor-pointer ${
                      category === cat
                        ? 'bg-indigo-600 text-white shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]'
                        : 'bg-slate-50 text-slate-800 hover:bg-slate-100 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]'
                    }`}
                  >
                    {cat === 'Pribadi' && '👤 Pribadi'}
                    {cat === 'Sosial' && '👥 Sosial & Teman'}
                    {cat === 'Belajar' && '📚 Masalah Belajar'}
                    {cat === 'Karir' && '🎯 Karir / Studi Lanjut'}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3: Title & Problem Text */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-900 uppercase tracking-widest mb-1">
                  3. Judul Singkat Masalah <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="contoh: Bingung memilih jurusan SMK/SMA, atau Merasa cemas saat tampil di depan kelas"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-900 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-900 uppercase tracking-widest mb-1">
                  4. Tulis Masalah untuk Konsultasi (Deskripsi Lengkap) <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={5}
                  value={problemDescription}
                  onChange={(e) => setProblemDescription(e.target.value)}
                  placeholder="Ceritakan dengan jelas apa yang kamu alami, perasaannmu saat ini, dan bantuan seperti apa yang kamu harapkan dari Guru BK..."
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-900 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-wider rounded-2xl border-3 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] active:translate-y-[2px] transition flex items-center justify-center gap-2 text-sm cursor-pointer"
            >
              <Send className="w-5 h-5" />
              <span>Kirimkan Konsultasi ke Guru BK</span>
            </button>
          </form>
        </div>
      )}

      {/* TAB 2: RUANG CHAT BIMBINGAN */}
      {activeTab === 'chat_room' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Consultation List Sidebar */}
          <div className="bg-white rounded-[2rem] p-5 border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] space-y-3">
            <h3 className="font-black text-sm text-slate-950 uppercase border-b-2 border-slate-200 pb-3">
              Daftar Bimbingan Saya ({myConsultations.length})
            </h3>

            {myConsultations.length === 0 ? (
              <div className="text-center py-8 text-slate-400 font-bold text-xs">
                Belum ada konsultasi aktif. Silakan buat konsultasi baru.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {myConsultations.map((req) => (
                  <button
                    key={req.id}
                    type="button"
                    onClick={() => setActiveConsultationId(req.id)}
                    className={`w-full text-left p-3.5 rounded-2xl border-2 border-slate-900 transition cursor-pointer ${
                      activeConsultation?.id === req.id
                        ? 'bg-indigo-50 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] font-bold'
                        : 'bg-slate-50 hover:bg-slate-100 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-md bg-indigo-200 text-slate-950 border border-slate-900">
                        {req.category}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        {new Date(req.createdAt).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                    <div className="font-black text-xs text-slate-950 line-clamp-1">{req.title}</div>
                    <div className="text-[11px] text-indigo-800 font-bold mt-1 flex items-center gap-1">
                      <span>Konselor: {req.counselorName}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[10px]">
                      <span className={`px-2 py-0.5 rounded-full font-black border border-slate-900 ${
                        req.status === 'Selesai' 
                          ? 'bg-emerald-400 text-slate-950' 
                          : 'bg-amber-300 text-slate-950'
                      }`}>
                        {req.status}
                      </span>
                      <span className="text-slate-500 font-mono font-bold">{req.messages.length} pesan</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Chat Window Panel */}
          <div className="lg:col-span-2 bg-white rounded-[2rem] border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] flex flex-col h-[600px] overflow-hidden">
            {activeConsultation ? (
              <>
                {/* Chat Room Header */}
                <div className="p-4 bg-indigo-950 text-white flex items-center justify-between border-b-4 border-slate-900">
                  <div>
                    <div className="text-xs text-amber-300 font-black uppercase tracking-wider">
                      Konselor: {activeConsultation.counselorName}
                    </div>
                    <h3 className="font-black text-sm text-white line-clamp-1 uppercase">{activeConsultation.title}</h3>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-emerald-400 text-slate-950 text-xs font-black uppercase border border-slate-900 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]">
                    Status: {activeConsultation.status}
                  </div>
                </div>

                {/* Messages Body */}
                <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-100/60">
                  {/* Problem Banner */}
                  <div className="p-4 bg-amber-100 border-2 border-slate-900 rounded-2xl text-xs space-y-1 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]">
                    <div className="font-black text-slate-950 uppercase">Awal Keluhan Masalah Siswa:</div>
                    <p className="text-slate-900 font-medium italic">"{activeConsultation.problemDescription}"</p>
                  </div>

                  {activeConsultation.messages.map((msg) => {
                    const isMe = msg.senderRole === 'client_siswa';
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div className="text-[10px] text-slate-500 mb-1 font-bold">
                          {msg.senderName} ({msg.timestamp})
                        </div>
                        <div
                          className={`max-w-[85%] p-3.5 rounded-2xl text-xs font-medium leading-relaxed border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] ${
                            isMe
                              ? 'bg-indigo-600 text-white font-bold'
                              : 'bg-white text-slate-950'
                          }`}
                        >
                          {msg.content}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatBottomRef} />
                </div>

                {/* Chat Input Form */}
                <form onSubmit={handleSendChatMessage} className="p-3 bg-white border-t-3 border-slate-900 flex items-center gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ketik pesan balasan untuk Guru BK..."
                    className="flex-1 px-4 py-2.5 rounded-xl border-2 border-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase rounded-xl text-xs border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] flex items-center gap-1.5 cursor-pointer active:translate-y-[1px]"
                  >
                    <Send className="w-4 h-4" />
                    <span>Kirim</span>
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 space-y-3">
                <MessageSquare className="w-12 h-12 text-slate-400" />
                <p className="text-xs font-bold">Pilih konsultasi dari daftar di sebelah kiri untuk memulai obrolan chat dengan Guru BK.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: CATATAN & HASIL BIMBINGAN SAYA */}
      {activeTab === 'riwayat' && (
        <div className="bg-white rounded-[2rem] p-6 md:p-8 border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] space-y-6">
          <div className="border-b-2 border-slate-200 pb-4">
            <h2 className="text-2xl font-black uppercase tracking-tight text-slate-950">Catatan & Hasil Bimbingan Saya</h2>
            <p className="text-xs font-bold text-slate-600 mt-1">
              Daftar rekapitulasi hasil bimbingan, catatan konselor, dan saran tindak lanjut yang diberikan oleh Guru BK untukmu.
            </p>
          </div>

          <div className="space-y-4">
            {myConsultations.map((req) => (
              <div key={req.id} className="p-5 rounded-2xl border-3 border-slate-900 bg-slate-50 space-y-3 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-slate-200 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-200 text-slate-950 border border-slate-900 font-black text-xs uppercase">
                      {req.category}
                    </span>
                    <h3 className="font-black text-sm text-slate-950">{req.title}</h3>
                  </div>
                  <span className="text-xs text-slate-600 font-mono font-bold">
                    {new Date(req.createdAt).toLocaleDateString('id-ID')}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 bg-white rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                    <span className="font-black text-slate-950 block mb-1 uppercase">Catatan & Rekomendasi Guru BK:</span>
                    <p className="text-slate-800 font-medium">{req.counselorNotes || 'Belum ada catatan tertulis.'}</p>
                  </div>
                  <div className="p-4 bg-white rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                    <span className="font-black text-slate-950 block mb-1 uppercase">Rencana Solusi / Tindak Lanjut:</span>
                    <p className="text-slate-800 font-medium">{req.followUpAction || 'Akan dibahas pada sesi bimbingan berikutnya.'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
