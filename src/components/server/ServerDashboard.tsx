import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { User, SchoolData, Counselor, Student, ConsultationRequest, MoodEntry, ProblemCategory, ConsultationStatus, ChatMessage } from '../../types';
import { getSchoolData, saveSchoolData, getConsultations, saveConsultation, deleteConsultation, clearAllConsultations, getMoodEntries, subscribeToRealtimeChanges, addChatMessage, isWhitelistedCounselorEmail } from '../../services/storage';
import { exportStudentsToCSV, exportConsultationsToCSV, generateGoogleAppsScriptCode, syncToGoogleSheetsWebhook } from '../../services/googleSheets';
import { Shield, Users, School, MessageSquare, FileSpreadsheet, Sparkles, Send, Plus, Search, CheckCircle2, AlertCircle, FileText, Download, Copy, Trash2, Edit, Check, RefreshCw, Layers, UserPlus, Wand2, FilePlus, UserX, Trash, Upload, FileType, Table } from 'lucide-react';

interface ServerDashboardProps {
  currentUser: User;
}

export const ServerDashboard: React.FC<ServerDashboardProps> = ({ currentUser }) => {
  const [schoolData, setSchoolData] = useState<SchoolData>(getSchoolData());
  const [consultations, setConsultations] = useState<ConsultationRequest[]>(getConsultations());
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>(getMoodEntries());

  // Active Main Subtab: 'live_chat' | 'data_sekolah' | 'hasil_masalah' | 'google_sheets'
  const [activeTab, setActiveTab] = useState<'live_chat' | 'data_sekolah' | 'hasil_masalah' | 'google_sheets'>('live_chat');

  // Filter States
  const [statusFilter, setStatusFilter] = useState<string>('Semua');
  const [activeConsultationId, setActiveConsultationId] = useState<string | null>(null);

  // Chat Input State
  const [chatInput, setChatInput] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Hasil Input Masalah Form State
  const [counselorNotesInput, setCounselorNotesInput] = useState('');
  const [solutionSummaryInput, setSolutionSummaryInput] = useState('');
  const [followUpActionInput, setFollowUpActionInput] = useState('');

  // School Data Form State
  const [schoolName, setSchoolName] = useState(schoolData.schoolName);
  const [npsn, setNpsn] = useState(schoolData.npsn);
  const [address, setAddress] = useState(schoolData.address);
  const [academicYear, setAcademicYear] = useState(schoolData.academicYear);
  const [visionMission, setVisionMission] = useState(schoolData.visionMission);

  // Counselor Whitelist Modal/Input
  const [newCounselorName, setNewCounselorName] = useState('');
  const [newCounselorEmail, setNewCounselorEmail] = useState('');
  const [newCounselorSpec, setNewCounselorSpec] = useState('Bimbingan Konseling Umum');

  // Student Master Data State
  const [searchStudent, setSearchStudent] = useState('');
  const [filterClassStudent, setFilterClassStudent] = useState('Semua');
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [addStudentTab, setAddStudentTab] = useState<'excel' | 'batch_text' | 'batch_auto' | 'single'>('excel');
  
  // Excel / CSV Upload State
  const [excelFileName, setExcelFileName] = useState('');
  const [excelParsedStudents, setExcelParsedStudents] = useState<Student[]>([]);
  const [excelDefaultClass, setExcelDefaultClass] = useState('8A');
  const [excelErrorMsg, setExcelErrorMsg] = useState<string | null>(null);

  // Single Student State
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentNisn, setNewStudentNisn] = useState('');
  const [newStudentClass, setNewStudentClass] = useState('7A');
  const [newStudentAbsen, setNewStudentAbsen] = useState('01');
  const [newStudentEmail, setNewStudentEmail] = useState('');

  // Batch Students State
  const [batchTextNames, setBatchTextNames] = useState('');
  const [batchTextClass, setBatchTextClass] = useState('8A');
  const [autoGenClass, setAutoGenClass] = useState('8A');
  const [autoGenCount, setAutoGenCount] = useState<number>(10);
  const [autoGenNaming, setAutoGenNaming] = useState<'random_names' | 'numbered'>('random_names');

  // Google Sheets Config State
  const [webhookUrl, setWebhookUrl] = useState(schoolData.googleSheetUrl || '');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);

  // Realtime Sync Subscription
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

  const pendingRequests = consultations.filter(c => c.status === 'Menunggu Tanggapan');
  const activeConsultations = consultations.filter(c => c.status === 'Sedang Konseling');
  const completedConsultations = consultations.filter(c => c.status === 'Selesai');

  const filteredConsultations = consultations.filter(c => {
    if (statusFilter === 'Semua') return true;
    return c.status === statusFilter;
  });

  const selectedConsultation = consultations.find(c => c.id === activeConsultationId) || filteredConsultations[0];

  useEffect(() => {
    if (selectedConsultation) {
      setCounselorNotesInput(selectedConsultation.counselorNotes || '');
      setSolutionSummaryInput(selectedConsultation.solutionSummary || '');
      setFollowUpActionInput(selectedConsultation.followUpAction || '');
    }
  }, [selectedConsultation?.id]);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedConsultation?.messages]);

  // Handle Sending Chat Response
  const handleSendResponse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !selectedConsultation) return;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderEmail: currentUser.email,
      senderName: currentUser.name,
      senderRole: 'server_guru',
      content: chatInput.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isRead: true,
    };

    addChatMessage(selectedConsultation.id, newMsg);
    setChatInput('');
    refreshData();
  };

  // Handle Save "Hasil Input Masalah Siswa"
  const handleSaveHasilMasalah = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConsultation) return;

    const updated: ConsultationRequest = {
      ...selectedConsultation,
      counselorNotes: counselorNotesInput,
      solutionSummary: solutionSummaryInput,
      followUpAction: followUpActionInput,
      status: 'Selesai',
      updatedAt: new Date().toISOString(),
    };

    saveConsultation(updated);
    alert('Hasil input masalah siswa berhasil disimpan dan dicatat ke Rekap Konseling.');
    refreshData();
  };

  // Handle Save School Info
  const handleSaveSchoolInfo = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      ...schoolData,
      schoolName,
      npsn,
      address,
      academicYear,
      visionMission,
    };
    saveSchoolData(updated);
    alert('Informasi data sekolah berhasil diperbarui.');
    refreshData();
  };

  // Add Whitelisted Counselor
  const handleAddCounselor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCounselorEmail.trim() || !newCounselorName.trim()) return;

    const newCounselor: Counselor = {
      id: `c-${Date.now()}`,
      name: newCounselorName.trim(),
      email: newCounselorEmail.trim().toLowerCase(),
      specialization: newCounselorSpec,
      isOnline: true,
      isWhitelisted: true,
      photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80',
    };

    const updated = {
      ...schoolData,
      counselors: [...schoolData.counselors, newCounselor],
    };

    saveSchoolData(updated);
    setNewCounselorName('');
    setNewCounselorEmail('');
    alert(`Email Guru BK ${newCounselorEmail} berhasil didaftarkan ke Whitelist Server.`);
    refreshData();
  };

  // Clear All Consultations
  const handleClearAllConsultations = () => {
    if (window.confirm('Apakah Anda yakin ingin MENGHAPUS SELURUH data contoh konseling siswa?')) {
      clearAllConsultations();
      setActiveConsultationId(null);
      refreshData();
      alert('Seluruh data contoh konseling siswa telah dihapus.');
    }
  };

  // Delete Single Student
  const handleDeleteStudent = (studentId: string, studentName: string) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus siswa "${studentName}"?`)) {
      const updatedStudents = schoolData.students.filter(s => s.id !== studentId);
      const updated = { ...schoolData, students: updatedStudents };
      saveSchoolData(updated);
      refreshData();
    }
  };

  // Delete All Students
  const handleDeleteAllStudents = () => {
    if (window.confirm('Apakah Anda yakin ingin MENGHAPUS SELURUH Master Data Siswa?')) {
      const updated = { ...schoolData, students: [] };
      saveSchoolData(updated);
      refreshData();
      alert('Seluruh master data siswa berhasil dikosongkan.');
    }
  };

  // Add Master Student
  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim() || !newStudentEmail.trim()) return;

    const newStudent: Student = {
      id: `s-${Date.now()}`,
      nisn: newStudentNisn.trim() || `008${Math.floor(1000000 + Math.random() * 9000000)}`,
      name: newStudentName.trim(),
      kelas: newStudentClass,
      absen: newStudentAbsen,
      email: newStudentEmail.trim().toLowerCase(),
      notes: 'Siswa baru ditambahkan oleh Guru BK',
    };

    const updated = {
      ...schoolData,
      students: [newStudent, ...schoolData.students],
    };

    saveSchoolData(updated);
    setShowAddStudentModal(false);
    setNewStudentName('');
    setNewStudentEmail('');
    alert('Data siswa baru berhasil disimpan ke Master Data Sekolah.');
    refreshData();
  };

  // Add Batch Students from Multi-Line Text / Paste List
  const handleAddBatchTextStudents = (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchTextNames.trim()) return;

    const lines = batchTextNames.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return;

    const newStudentsList: Student[] = [];
    let startAbsen = 1;

    const existingInClass = schoolData.students.filter(s => s.kelas === batchTextClass);
    if (existingInClass.length > 0) {
      const maxAbsen = Math.max(...existingInClass.map(s => parseInt(s.absen) || 0));
      if (maxAbsen > 0) startAbsen = maxAbsen + 1;
    }

    lines.forEach((line, idx) => {
      const parts = line.split(',').map(p => p.trim());
      let name = line;
      let sClass = batchTextClass;
      let sAbsen = String(startAbsen + idx).padStart(2, '0');
      let sEmail = '';
      let sNisn = '';

      if (parts.length >= 2 && (parts[1].match(/^[789][A-Za-z]$/) || parts[1].length <= 3)) {
        name = parts[0];
        sClass = parts[1];
        if (parts[2]) sAbsen = parts[2].padStart(2, '0');
        if (parts[3]) sEmail = parts[3];
        if (parts[4]) sNisn = parts[4];
      }

      if (!sEmail) {
        const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.');
        sEmail = `${cleanName}@siswa.belajar.id`;
      }

      if (!sNisn) {
        sNisn = `008${Math.floor(1000000 + Math.random() * 9000000)}`;
      }

      newStudentsList.push({
        id: `s-${Date.now()}-${idx}`,
        nisn: sNisn,
        name: name,
        kelas: sClass,
        absen: sAbsen,
        email: sEmail.toLowerCase(),
        notes: 'Siswa ditambahkan via Tambah Banyak Massal',
      });
    });

    const updated = {
      ...schoolData,
      students: [...newStudentsList, ...schoolData.students],
    };

    saveSchoolData(updated);
    setShowAddStudentModal(false);
    setBatchTextNames('');
    alert(`Berhasil menambahkan ${newStudentsList.length} siswa baru ke Master Data Sekolah!`);
    refreshData();
  };

  // Auto Generate Students
  const handleAutoGenerateStudents = (e: React.FormEvent) => {
    e.preventDefault();
    const count = Math.min(Math.max(autoGenCount, 1), 100);

    const FIRST_NAMES = [
      'Aditia', 'Anisa', 'Bayu', 'Cantika', 'Denis', 'Fajar', 'Gita', 'Hafiz', 'Intan',
      'Joko', 'Kartika', 'Laras', 'Muhammad', 'Nabila', 'Okta', 'Putri', 'Rizky', 'Salsabila',
      'Taufik', 'Utami', 'Vina', 'Wahyu', 'Yulia', 'Zaki', 'Aris', 'Bunga', 'Dedi', 'Eka'
    ];
    const LAST_NAMES = [
      'Pratama', 'Nugraha', 'Putra', 'Putri', 'Sari', 'Wibowo', 'Santoso', 'Saputra',
      'Hidayat', 'Kurniawan', 'Ramadhan', 'Wijaya', 'Permana', 'Setiawan', 'Riyadi'
    ];

    const newStudentsList: Student[] = [];
    const existingInClass = schoolData.students.filter(s => s.kelas === autoGenClass);
    let startAbsen = existingInClass.length + 1;

    for (let i = 0; i < count; i++) {
      let name = '';
      if (autoGenNaming === 'numbered') {
        name = `Siswa ${autoGenClass} ${String(startAbsen + i).padStart(2, '0')}`;
      } else {
        const fName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
        const lName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
        name = `${fName} ${lName}`;
      }

      const sAbsen = String(startAbsen + i).padStart(2, '0');
      const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.');
      const sEmail = `${cleanName}.${autoGenClass.toLowerCase()}@siswa.belajar.id`;
      const sNisn = `008${Math.floor(1000000 + Math.random() * 9000000)}`;

      newStudentsList.push({
        id: `s-${Date.now()}-${i}`,
        nisn: sNisn,
        name: name,
        kelas: autoGenClass,
        absen: sAbsen,
        email: sEmail,
        notes: 'Siswa buatan otomatis (Auto Generated Batch)',
      });
    }

    const updated = {
      ...schoolData,
      students: [...newStudentsList, ...schoolData.students],
    };

    saveSchoolData(updated);
    setShowAddStudentModal(false);
    alert(`Berhasil meng-generate ${count} siswa otomatis untuk Kelas ${autoGenClass}!`);
    refreshData();
  };

  // Process uploaded Excel / CSV File
  const processExcelFile = async (file: File) => {
    setExcelFileName(file.name);
    setExcelErrorMsg(null);
    setExcelParsedStudents([]);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        setExcelErrorMsg('File Excel/CSV tidak memiliki lembar kerja (sheet).');
        return;
      }

      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      const rawJson: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (!rawJson || rawJson.length === 0) {
        setExcelErrorMsg('File Excel/CSV kosong atau tidak berisi data.');
        return;
      }

      const parsedList: Student[] = [];

      rawJson.forEach((row, idx) => {
        const keys = Object.keys(row);
        const findVal = (possibleHeaders: string[]) => {
          for (const header of possibleHeaders) {
            const key = keys.find(k => k.trim().toLowerCase() === header.toLowerCase());
            if (key && row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
              return String(row[key]).trim();
            }
          }
          return '';
        };

        const name = findVal(['nama', 'nama siswa', 'nama_lengkap', 'name', 'student name', 'siswa']) || 
                     (keys[0] ? String(row[keys[0]]).trim() : '');
        
        // Skip header-like rows or empty names
        if (!name || name.toLowerCase() === 'nama' || name.toLowerCase() === 'nama siswa' || name.toLowerCase() === 'name') {
          return;
        }

        const sClass = findVal(['kelas', 'class', 'kel', 'tingkat']) || excelDefaultClass;
        const sAbsen = findVal(['absen', 'no absen', 'no_absen', 'nomor absen', 'no', 'nr']) || String(idx + 1).padStart(2, '0');
        let sEmail = findVal(['email', 'email google', 'email siswa', 'gmail', 'mail']);
        let sNisn = findVal(['nisn', 'nis', 'no nisn']);

        if (!sEmail) {
          const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.');
          sEmail = `${cleanName}.${sClass.toLowerCase()}@siswa.belajar.id`;
        }

        if (!sNisn) {
          sNisn = `008${Math.floor(1000000 + Math.random() * 9000000)}`;
        }

        parsedList.push({
          id: `s-excel-${Date.now()}-${idx}`,
          nisn: sNisn,
          name: name,
          kelas: sClass,
          absen: String(sAbsen).padStart(2, '0'),
          email: sEmail.toLowerCase(),
          notes: `Imported via Excel (${file.name})`,
        });
      });

      if (parsedList.length === 0) {
        setExcelErrorMsg('Tidak ada baris siswa yang valid ditemukan dalam file Excel/CSV.');
      } else {
        setExcelParsedStudents(parsedList);
      }
    } catch (err: any) {
      console.error('Excel Import Error:', err);
      setExcelErrorMsg(`Gagal membaca file Excel/CSV: ${err.message || 'Format file tidak didukung.'}`);
    }
  };

  const handleExcelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processExcelFile(file);
    }
  };

  const handleImportExcelStudents = () => {
    if (excelParsedStudents.length === 0) return;

    const updated = {
      ...schoolData,
      students: [...excelParsedStudents, ...schoolData.students],
    };

    saveSchoolData(updated);
    setShowAddStudentModal(false);
    alert(`Berhasil mengimpor ${excelParsedStudents.length} data siswa dari file ${excelFileName}!`);
    setExcelParsedStudents([]);
    setExcelFileName('');
    refreshData();
  };

  const downloadSampleExcelTemplate = () => {
    const csvContent = "Nama,Kelas,Absen,Email,NISN\n" +
      "Ahmad Rizky Pratama,8A,01,ahmad.rizky.8a@siswa.belajar.id,0081234567\n" +
      "Anisa Fitriani,8A,02,anisa.fitriani.8a@siswa.belajar.id,0081234568\n" +
      "Budi Santoso,8A,03,budi.santoso.8a@siswa.belajar.id,0081234569\n" +
      "Citra Dewi,8B,01,citra.dewi.8b@siswa.belajar.id,0081234570\n";
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Template_Master_Siswa_BK.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Google Sheets Webhook Sync
  const handleSyncSheets = async () => {
    setIsSyncing(true);
    setSyncStatusMsg(null);
    const res = await syncToGoogleSheetsWebhook(webhookUrl);
    setIsSyncing(false);
    setSyncStatusMsg(res.message);

    // Save webhook URL in school config
    const updated = {
      ...schoolData,
      googleSheetUrl: webhookUrl,
    };
    saveSchoolData(updated);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Stat Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-indigo-900 border-3 border-slate-900 text-white shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] space-y-1">
          <div className="flex items-center justify-between text-indigo-200">
            <span className="text-xs font-black uppercase tracking-wider">Menunggu Tanggapan</span>
            <AlertCircle className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-amber-300">{pendingRequests.length}</div>
          <p className="text-[11px] text-indigo-200 font-bold">Siswa butuh balasan konselor</p>
        </div>

        <div className="p-5 rounded-2xl bg-amber-50 border-3 border-slate-900 text-slate-950 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] space-y-1">
          <div className="flex items-center justify-between text-slate-700">
            <span className="text-xs font-black uppercase tracking-wider">Sedang Konseling</span>
            <MessageSquare className="w-5 h-5 text-indigo-700" />
          </div>
          <div className="text-3xl font-black text-slate-950">{activeConsultations.length}</div>
          <p className="text-[11px] text-slate-700 font-bold">Sesi bimbingan aktif</p>
        </div>

        <div className="p-5 rounded-2xl bg-emerald-50 border-3 border-slate-900 text-slate-950 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] space-y-1">
          <div className="flex items-center justify-between text-slate-700">
            <span className="text-xs font-black uppercase tracking-wider">Konseling Selesai</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-700" />
          </div>
          <div className="text-3xl font-black text-slate-950">{completedConsultations.length}</div>
          <p className="text-[11px] text-slate-700 font-bold">Tercatat di rekap masalah</p>
        </div>

        <div className="p-5 rounded-2xl bg-sky-50 border-3 border-slate-900 text-slate-950 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] space-y-1">
          <div className="flex items-center justify-between text-slate-700">
            <span className="text-xs font-black uppercase tracking-wider">Master Data Siswa</span>
            <Users className="w-5 h-5 text-blue-700" />
          </div>
          <div className="text-3xl font-black text-slate-950">{schoolData.students.length}</div>
          <p className="text-[11px] text-slate-700 font-bold">Terdaftar di {schoolData.schoolName}</p>
        </div>
      </div>

      {/* Main Server Navigation Tabs */}
      <div className="bg-white p-2.5 rounded-2xl border-3 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('live_chat')}
          className={`py-3 px-5 rounded-xl text-xs sm:text-sm font-black uppercase transition whitespace-nowrap flex items-center gap-2 cursor-pointer border-2 ${
            activeTab === 'live_chat'
              ? 'bg-indigo-600 text-white border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]'
              : 'border-transparent text-slate-700 hover:bg-slate-100'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Konsultasi Siswa & Live Chat</span>
          {pendingRequests.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black border border-slate-900 animate-pulse">
              {pendingRequests.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('data_sekolah')}
          className={`py-3 px-5 rounded-xl text-xs sm:text-sm font-black uppercase transition whitespace-nowrap flex items-center gap-2 cursor-pointer border-2 ${
            activeTab === 'data_sekolah'
              ? 'bg-indigo-600 text-white border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]'
              : 'border-transparent text-slate-700 hover:bg-slate-100'
          }`}
        >
          <School className="w-4 h-4" />
          <span>Input Data Sekolah & Master Siswa</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('hasil_masalah')}
          className={`py-3 px-5 rounded-xl text-xs sm:text-sm font-black uppercase transition whitespace-nowrap flex items-center gap-2 cursor-pointer border-2 ${
            activeTab === 'hasil_masalah'
              ? 'bg-indigo-600 text-white border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]'
              : 'border-transparent text-slate-700 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Hasil Input Masalah Siswa (Rekap)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('google_sheets')}
          className={`py-3 px-5 rounded-xl text-xs sm:text-sm font-black uppercase transition whitespace-nowrap flex items-center gap-2 cursor-pointer border-2 ${
            activeTab === 'google_sheets'
              ? 'bg-emerald-500 text-slate-950 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]'
              : 'border-transparent text-slate-700 hover:bg-slate-100'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-slate-950" />
          <span>Integrasi Google Sheet</span>
        </button>
      </div>

      {/* SUBTAB 1: KONSULTASI SISWA & LIVE CHAT */}
      {activeTab === 'live_chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Consultation Requests Sidebar (4 cols) */}
          <div className="lg:col-span-4 bg-white rounded-[2rem] p-5 border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] space-y-4">
            <div className="flex items-center justify-between border-b-2 border-slate-200 pb-3">
              <h3 className="font-black text-sm text-slate-950 uppercase">Masuk Konsultasi Siswa</h3>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs bg-slate-100 border-2 border-slate-900 rounded-xl px-2 py-1 font-bold focus:outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
              >
                <option value="Semua">Semua Status</option>
                <option value="Menunggu Tanggapan">Menunggu</option>
                <option value="Sedang Konseling">Proses</option>
                <option value="Selesai">Selesai</option>
              </select>
            </div>

            <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
              {filteredConsultations.length === 0 ? (
                <div className="text-center py-12 text-slate-400 font-bold text-xs space-y-2">
                  <div>Belum ada permintaan konsultasi siswa.</div>
                </div>
              ) : (
                filteredConsultations.map((req) => (
                  <button
                    key={req.id}
                    type="button"
                    onClick={() => setActiveConsultationId(req.id)}
                    className={`w-full text-left p-3.5 rounded-2xl border-2 border-slate-900 transition cursor-pointer ${
                      selectedConsultation?.id === req.id
                        ? 'bg-indigo-50 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] font-bold'
                        : 'bg-slate-50 hover:bg-slate-100 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-black text-xs text-indigo-900">
                        {req.studentName} ({req.kelas})
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono font-bold">
                        {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="font-black text-xs text-slate-950 line-clamp-1">{req.title}</div>
                    <div className="text-[11px] text-slate-600 line-clamp-2 mt-0.5 font-medium">{req.problemDescription}</div>

                    <div className="mt-2.5 flex items-center justify-between text-[10px]">
                      <span className="px-2 py-0.5 rounded font-black bg-slate-200 text-slate-950 border border-slate-900 uppercase">
                        {req.category}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full font-black border border-slate-900 ${
                        req.status === 'Menunggu Tanggapan'
                          ? 'bg-amber-300 text-slate-950 animate-pulse'
                          : req.status === 'Sedang Konseling'
                          ? 'bg-sky-300 text-slate-950'
                          : 'bg-emerald-400 text-slate-950'
                      }`}>
                        {req.status}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>

            {consultations.length > 0 && (
              <div className="pt-2 border-t-2 border-slate-200">
                <button
                  type="button"
                  onClick={handleClearAllConsultations}
                  className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-black text-xs uppercase rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Semua Contoh Konseling</span>
                </button>
              </div>
            )}
          </div>

          {/* Active Live Chat Window & Otomatisasi Input Masalah (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {selectedConsultation ? (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Live Chat Column (7 cols) */}
                <div className="md:col-span-7 bg-white rounded-[2rem] border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] flex flex-col h-[650px] overflow-hidden">
                  <div className="p-4 bg-indigo-950 text-white flex items-center justify-between border-b-4 border-slate-900">
                    <div>
                      <div className="font-black text-sm text-white uppercase">
                        {selectedConsultation.studentName} — Kelas {selectedConsultation.kelas} (Absen {selectedConsultation.absen})
                      </div>
                      <div className="text-[11px] text-amber-300 font-bold">
                        Ditujukan ke Guru BK: {selectedConsultation.counselorName}
                      </div>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-400 text-slate-950 font-black uppercase border border-slate-900">
                      {selectedConsultation.category}
                    </span>
                  </div>

                  <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-100/60">
                    <div className="p-3.5 bg-amber-100 border-2 border-slate-900 rounded-2xl text-xs space-y-1 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]">
                      <div className="font-black text-slate-950 uppercase">Keluhan & Mood Hari Ini:</div>
                      <div className="text-xs font-black text-indigo-800">
                        Mood: {selectedConsultation.moodToday || 'Biasa Aja'}
                      </div>
                      <p className="text-slate-900 font-medium mt-1">"{selectedConsultation.problemDescription}"</p>
                    </div>

                    {selectedConsultation.messages.map((msg) => {
                      const isGuru = msg.senderRole === 'server_guru';
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isGuru ? 'items-end' : 'items-start'}`}
                        >
                          <div className="text-[10px] text-slate-500 mb-1 font-bold">
                            {msg.senderName} ({msg.timestamp})
                          </div>
                          <div
                            className={`max-w-[85%] p-3.5 rounded-2xl text-xs font-medium leading-relaxed border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] ${
                              isGuru
                                ? 'bg-indigo-900 text-white font-bold'
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

                  <form onSubmit={handleSendResponse} className="p-3 bg-white border-t-3 border-slate-900 flex items-center gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Ketik tanggapan / bimbingan untuk siswa..."
                      className="flex-1 px-4 py-2.5 rounded-xl border-2 border-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase rounded-xl text-xs border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] flex items-center gap-1.5 cursor-pointer active:translate-y-[1px]"
                    >
                      <Send className="w-4 h-4" />
                      <span>Balas</span>
                    </button>
                  </form>
                </div>

                {/* Form Input Hasil Masalah Siswa (5 cols) */}
                <div className="md:col-span-5 bg-white rounded-[2rem] p-5 border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] space-y-4">
                  <div className="border-b-2 border-slate-200 pb-3">
                    <h4 className="font-black text-sm text-slate-950 uppercase flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-700" />
                      <span>Hasil Input Masalah Siswa</span>
                    </h4>
                    <p className="text-[11px] font-bold text-slate-600 mt-0.5">
                      Otomatis dicatat ke Rekapitulasi & disinkron ke Google Sheets
                    </p>
                  </div>

                  <form onSubmit={handleSaveHasilMasalah} className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-black text-slate-900 uppercase tracking-wider mb-1">
                        Catatan & Analisis Guru BK
                      </label>
                      <textarea
                        rows={4}
                        value={counselorNotesInput}
                        onChange={(e) => setCounselorNotesInput(e.target.value)}
                        placeholder="Tuliskan gejala masalah, faktor pemicu, dan catatan pengamatan psikologis siswa..."
                        className="w-full px-3 py-2 rounded-xl border-2 border-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-black text-slate-900 uppercase tracking-wider mb-1">
                        Ringkasan Solusi / Konseling
                      </label>
                      <textarea
                        rows={3}
                        value={solutionSummaryInput}
                        onChange={(e) => setSolutionSummaryInput(e.target.value)}
                        placeholder="Hasil diskusi dan kesepakatan solusi dengan siswa..."
                        className="w-full px-3 py-2 rounded-xl border-2 border-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-black text-slate-900 uppercase tracking-wider mb-1">
                        Rencana Tindak Lanjut
                      </label>
                      <input
                        type="text"
                        value={followUpActionInput}
                        onChange={(e) => setFollowUpActionInput(e.target.value)}
                        placeholder="misal: Pemanggilan orang tua / Sesi lanjutan minggu depan"
                        className="w-full px-3 py-2 rounded-xl border-2 border-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black uppercase tracking-wider rounded-xl text-xs border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] flex items-center justify-center gap-1.5 cursor-pointer active:translate-y-[1px]"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Simpan Hasil Konseling Siswa</span>
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-[2rem] p-12 border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] text-center font-bold text-slate-500">
                Pilih konsultasi dari daftar sebelah kiri untuk membalas chatting dan menginput hasil masalah siswa.
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 2: INPUT DATA SEKOLAH & MASTER SISWA */}
      {activeTab === 'data_sekolah' && (
        <div className="space-y-8">
          {/* Section 1: School Profile Form */}
          <div className="bg-white rounded-[2rem] p-6 md:p-8 border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] space-y-6">
            <div className="border-b-2 border-slate-200 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tight text-slate-950">Profil Data Sekolah</h2>
                <p className="text-xs font-bold text-slate-600 mt-0.5">Identitas resmi sekolah dan layanan Bimbingan Konseling</p>
              </div>
              <School className="w-8 h-8 text-indigo-700" />
            </div>

            <form onSubmit={handleSaveSchoolInfo} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-900 uppercase mb-1">Nama Sekolah</label>
                <input
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-900 text-xs font-bold focus:outline-none focus:border-indigo-600 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-900 uppercase mb-1">NPSN Sekolah</label>
                <input
                  type="text"
                  value={npsn}
                  onChange={(e) => setNpsn(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-900 text-xs font-bold focus:outline-none focus:border-indigo-600 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-900 uppercase mb-1">Tahun Ajaran</label>
                <input
                  type="text"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-900 text-xs font-bold focus:outline-none focus:border-indigo-600 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-900 uppercase mb-1">Alamat Sekolah</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-900 text-xs font-bold focus:outline-none focus:border-indigo-600 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-black text-slate-900 uppercase mb-1">Visi & Misi BK</label>
                <textarea
                  rows={2}
                  value={visionMission}
                  onChange={(e) => setVisionMission(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-900 text-xs font-medium focus:outline-none focus:border-indigo-600 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
                />
              </div>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase rounded-xl text-xs border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] transition cursor-pointer active:translate-y-[1px]"
                >
                  Simpan Perubahan Data Sekolah
                </button>
              </div>
            </form>
          </div>

          {/* Section 2: Counselor Whitelist Management */}
          <div className="bg-white rounded-[2rem] p-6 md:p-8 border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] space-y-6">
            <div className="border-b-2 border-slate-200 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tight text-slate-950">Whitelist Gmail Konselor (Guru BK)</h2>
                <p className="text-xs font-bold text-slate-600 mt-0.5">
                  Hanya akun Gmail yang ada di daftar ini yang diizinkan untuk login dan mengelola Aplikasi Server Guru BK.
                </p>
              </div>
              <Shield className="w-8 h-8 text-indigo-700" />
            </div>

            <form onSubmit={handleAddCounselor} className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-amber-50 p-4 rounded-2xl border-3 border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]">
              <div>
                <label className="block text-[11px] font-black text-slate-950 uppercase mb-1">Nama Guru BK</label>
                <input
                  type="text"
                  value={newCounselorName}
                  onChange={(e) => setNewCounselorName(e.target.value)}
                  placeholder="misal: Dr. H. Bambang, M.Pd."
                  className="w-full px-3 py-2 bg-white rounded-xl border-2 border-slate-900 text-xs font-bold focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-black text-slate-950 uppercase mb-1">Email Gmail Konselor</label>
                <input
                  type="email"
                  value={newCounselorEmail}
                  onChange={(e) => setNewCounselorEmail(e.target.value)}
                  placeholder="nama@guru.smp.belajar.id atau gmail"
                  className="w-full px-3 py-2 bg-white rounded-xl border-2 border-slate-900 text-xs font-bold focus:outline-none"
                  required
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-wider rounded-xl text-xs border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Daftarkan Whitelist</span>
                </button>
              </div>
            </form>

            <div className="overflow-x-auto rounded-2xl border-3 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-indigo-950 text-white font-black uppercase border-b-3 border-slate-900">
                    <th className="p-3">Nama Konselor</th>
                    <th className="p-3">Email Whitelisted</th>
                    <th className="p-3">Spesialisasi</th>
                    <th className="p-3">Status Otentikasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-slate-200 bg-white">
                  {schoolData.counselors.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="p-3 font-black text-slate-950">{c.name}</td>
                      <td className="p-3 font-mono font-bold text-slate-700">{c.email}</td>
                      <td className="p-3 font-bold text-indigo-700">{c.specialization}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-400 text-slate-950 border border-slate-900 font-black text-[10px]">
                          Whitelisted Server
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Master Student Data */}
          <div className="bg-white rounded-[2rem] p-6 md:p-8 border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] space-y-6">
            <div className="border-b-2 border-slate-200 pb-3 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tight text-slate-950">Data Master Seluruh Siswa ({schoolData.students.length})</h2>
                <p className="text-xs font-bold text-slate-600 mt-0.5">Daftar seluruh siswa terdaftar untuk layanan Bimbingan Konseling</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {schoolData.students.length > 0 && (
                  <button
                    type="button"
                    onClick={handleDeleteAllStudents}
                    className="px-3 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-black uppercase rounded-xl text-xs border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Hapus Semua Siswa</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={exportStudentsToCSV}
                  className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-950 font-black uppercase rounded-xl text-xs border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Export CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(true)}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase rounded-xl text-xs border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4 text-emerald-300" />
                  <span>+ Tambah Siswa (Banyak/Otomatis)</span>
                </button>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-amber-50 p-3.5 rounded-2xl border-3 border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]">
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-700" />
                <input
                  type="text"
                  value={searchStudent}
                  onChange={(e) => setSearchStudent(e.target.value)}
                  placeholder="Cari nama siswa / NISN / email..."
                  className="w-full bg-transparent text-xs font-bold focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-950 font-black uppercase">Kelas:</span>
                <select
                  value={filterClassStudent}
                  onChange={(e) => setFilterClassStudent(e.target.value)}
                  className="text-xs bg-white border-2 border-slate-900 rounded-lg px-2.5 py-1 font-bold"
                >
                  <option value="Semua">Semua Kelas</option>
                  <option value="7A">7A</option>
                  <option value="7B">7B</option>
                  <option value="8A">8A</option>
                  <option value="8B">8B</option>
                  <option value="9A">9A</option>
                  <option value="9B">9B</option>
                  <option value="9C">9C</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border-3 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-indigo-950 text-white font-black uppercase border-b-3 border-slate-900">
                    <th className="p-3">NISN</th>
                    <th className="p-3">Nama Siswa</th>
                    <th className="p-3">Kelas</th>
                    <th className="p-3">Absen</th>
                    <th className="p-3">Email Google</th>
                    <th className="p-3">Catatan Khusus</th>
                    <th className="p-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-slate-200 bg-white">
                  {schoolData.students
                    .filter(s => {
                      if (filterClassStudent !== 'Semua' && s.kelas !== filterClassStudent) return false;
                      if (searchStudent) {
                        const q = searchStudent.toLowerCase();
                        return s.name.toLowerCase().includes(q) || s.nisn.includes(q) || s.email.toLowerCase().includes(q);
                      }
                      return true;
                    })
                    .map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="p-3 font-mono font-bold text-slate-600">{s.nisn}</td>
                        <td className="p-3 font-black text-slate-950">{s.name}</td>
                        <td className="p-3 font-black text-indigo-700">{s.kelas}</td>
                        <td className="p-3 font-bold text-slate-700">{s.absen}</td>
                        <td className="p-3 font-mono text-slate-600 font-medium">{s.email}</td>
                        <td className="p-3 text-slate-600 font-medium">{s.notes || '-'}</td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteStudent(s.id, s.name)}
                            className="p-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-lg border border-slate-900 transition cursor-pointer"
                            title="Hapus Siswa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: HASIL INPUT MASALAH SISWA (REKAPITULASI LOG) */}
      {activeTab === 'hasil_masalah' && (
        <div className="bg-white rounded-[2rem] p-6 md:p-8 border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] space-y-6">
          <div className="border-b-2 border-slate-200 pb-3 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tight text-slate-950">Hasil Input Masalah Siswa ({consultations.length})</h2>
              <p className="text-xs font-bold text-slate-600 mt-0.5">
                Rekapitulasi lengkap hasil penanganan masalah siswa oleh Guru BK
              </p>
            </div>
            <div className="flex items-center gap-2">
              {consultations.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllConsultations}
                  className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-black uppercase rounded-xl text-xs border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Kosongkan/Hapus Data Konseling</span>
                </button>
              )}
              <button
                type="button"
                onClick={exportConsultationsToCSV}
                className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black uppercase rounded-xl text-xs border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] transition flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Export Hasil Input Masalah (CSV/Excel)</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border-3 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-indigo-950 text-white font-black uppercase border-b-3 border-slate-900">
                  <th className="p-3">Tanggal</th>
                  <th className="p-3">Nama Siswa</th>
                  <th className="p-3">Kelas</th>
                  <th className="p-3">Kategori</th>
                  <th className="p-3">Konselor</th>
                  <th className="p-3">Gejala & Judul Masalah</th>
                  <th className="p-3">Hasil / Solusi Guru BK</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-slate-200 bg-white">
                {consultations.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono text-slate-600 font-bold whitespace-nowrap">
                      {new Date(c.createdAt).toLocaleDateString('id-ID')}
                    </td>
                    <td className="p-3 font-black text-slate-950">{c.studentName}</td>
                    <td className="p-3 font-black text-indigo-700">{c.kelas}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded font-black bg-indigo-100 text-slate-950 border border-slate-900 uppercase">
                        {c.category}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-slate-800">{c.counselorName}</td>
                    <td className="p-3 max-w-xs">
                      <div className="font-black text-slate-950 line-clamp-1">{c.title}</div>
                      <div className="text-[11px] text-slate-600 line-clamp-2">{c.problemDescription}</div>
                    </td>
                    <td className="p-3 max-w-xs">
                      <div className="text-slate-900 font-medium line-clamp-2">{c.counselorNotes || 'Belum ada catatan'}</div>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full font-black text-[10px] border border-slate-900 ${
                        c.status === 'Selesai' ? 'bg-emerald-400 text-slate-950' : 'bg-amber-300 text-slate-950'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 4: INTEGRASI GOOGLE SHEET */}
      {activeTab === 'google_sheets' && (
        <div className="space-y-8">
          <div className="bg-white rounded-[2rem] p-6 md:p-8 border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] space-y-6">
            <div className="border-b-2 border-slate-200 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tight text-slate-950 flex items-center gap-2">
                  <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
                  <span>Integrasi Google Sheets Terhubung</span>
                </h2>
                <p className="text-xs font-bold text-slate-600 mt-0.5">
                  Hubungkan seluruh data sekolah, data siswa, mood tracker, dan hasil input masalah ke Google Sheet Anda secara otomatis.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-900 uppercase mb-1">
                  URL Web App Google Apps Script Anda:
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
                    className="flex-1 px-4 py-2.5 rounded-xl border-2 border-slate-900 text-xs font-mono font-bold focus:outline-none focus:border-emerald-600 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
                  />
                  <button
                    type="button"
                    onClick={handleSyncSheets}
                    disabled={isSyncing}
                    className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black uppercase rounded-xl text-xs border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] transition flex items-center gap-2 cursor-pointer"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
                  </button>
                </div>
              </div>

              {syncStatusMsg && (
                <div className="p-3.5 bg-emerald-100 border-2 border-slate-900 rounded-xl text-xs text-slate-950 font-black shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                  {syncStatusMsg}
                </div>
              )}
            </div>
          </div>

          {/* Tutorial & Script Generator */}
          <div className="bg-indigo-950 text-white rounded-[2rem] p-6 md:p-8 border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] space-y-4">
            <div className="flex items-center justify-between border-b-2 border-indigo-800 pb-3">
              <div>
                <h3 className="text-xl font-black uppercase text-amber-300">Langkah Mudah Menghubungkan Google Sheet</h3>
                <p className="text-xs text-indigo-200 font-medium mt-0.5">
                  Salin kode Google Apps Script di bawah ini lalu tempel di Google Sheet Anda
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(generateGoogleAppsScriptCode(window.location.origin));
                  setCopiedScript(true);
                  setTimeout(() => setCopiedScript(false), 3000);
                }}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase rounded-xl text-xs border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition flex items-center gap-1.5 cursor-pointer"
              >
                {copiedScript ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{copiedScript ? 'Tersalin!' : 'Salin Kode Script'}</span>
              </button>
            </div>

            <ol className="text-xs text-indigo-100 font-medium space-y-2 list-decimal list-inside">
              <li>Buka <strong className="text-white">Google Sheet</strong> baru di akun Google Anda.</li>
              <li>Klik menu <strong className="text-white">Ekstensi</strong> -&gt; <strong className="text-white">Apps Script</strong>.</li>
              <li>Hapus semua kode bawaan, lalu <strong className="text-white">Tempel (Paste)</strong> kode yang Anda salin.</li>
              <li>Klik tombol <strong className="text-white">Deploy</strong> -&gt; <strong className="text-white">New Deployment (Aplikasi Web)</strong>:
                <ul className="list-disc list-inside ml-4 text-indigo-200">
                  <li>Execute as: <strong>Me (Email Anda)</strong></li>
                  <li>Who has access: <strong>Anyone (Siapa Saja)</strong></li>
                </ul>
              </li>
              <li>Salin URL Web App yang didapat, lalu masukkan ke kotak URL di atas dan klik <strong>Sinkronkan Sekarang</strong>.</li>
            </ol>

            <div className="p-4 bg-slate-950 rounded-2xl border-2 border-slate-900 font-mono text-[11px] text-emerald-400 max-h-48 overflow-y-auto">
              <pre>{generateGoogleAppsScriptCode(window.location.origin)}</pre>
            </div>
          </div>
        </div>
      )}      {/* Modal Add Student (Excel, Batch Text Paste, Batch Auto Generate, or Single) */}
      {showAddStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 overflow-y-auto">
          <div className="bg-white rounded-[2rem] max-w-xl w-full p-6 space-y-4 shadow-[12px_12px_0px_0px_rgba(15,23,42,1)] border-4 border-slate-900 my-8">
            <div className="flex items-center justify-between border-b-2 border-slate-200 pb-3">
              <h3 className="font-black text-lg uppercase text-slate-950 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-600" />
                <span>Tambah Siswa Baru</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddStudentModal(false)}
                className="font-black text-slate-500 hover:text-slate-900 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 bg-slate-100 p-1 rounded-xl border-2 border-slate-900 font-black text-xs">
              <button
                type="button"
                onClick={() => setAddStudentTab('excel')}
                className={`py-2 px-1 rounded-lg transition flex items-center justify-center gap-1 cursor-pointer ${
                  addStudentTab === 'excel'
                    ? 'bg-emerald-500 text-slate-950 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]'
                    : 'text-slate-700 hover:bg-slate-200'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>File Excel/CSV</span>
              </button>
              <button
                type="button"
                onClick={() => setAddStudentTab('batch_text')}
                className={`py-2 px-1 rounded-lg transition flex items-center justify-center gap-1 cursor-pointer ${
                  addStudentTab === 'batch_text'
                    ? 'bg-indigo-600 text-white shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]'
                    : 'text-slate-700 hover:bg-slate-200'
                }`}
              >
                <FilePlus className="w-3.5 h-3.5" />
                <span>Tempel Teks</span>
              </button>
              <button
                type="button"
                onClick={() => setAddStudentTab('batch_auto')}
                className={`py-2 px-1 rounded-lg transition flex items-center justify-center gap-1 cursor-pointer ${
                  addStudentTab === 'batch_auto'
                    ? 'bg-indigo-600 text-white shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]'
                    : 'text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Wand2 className="w-3.5 h-3.5 text-amber-300" />
                <span>Auto Generate</span>
              </button>
              <button
                type="button"
                onClick={() => setAddStudentTab('single')}
                className={`py-2 px-1 rounded-lg transition flex items-center justify-center gap-1 cursor-pointer ${
                  addStudentTab === 'single'
                    ? 'bg-indigo-600 text-white shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]'
                    : 'text-slate-700 hover:bg-slate-200'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Input 1 Siswa</span>
              </button>
            </div>

            {/* TAB 0: UPLOAD EXCEL / CSV */}
            {addStudentTab === 'excel' && (
              <div className="space-y-4 text-xs">
                <div className="bg-emerald-50 p-3 rounded-xl border-2 border-slate-900 space-y-1.5">
                  <div className="font-black text-emerald-950 uppercase flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                      <span>Import File Excel (.xlsx / .xls) atau CSV</span>
                    </span>
                    <button
                      type="button"
                      onClick={downloadSampleExcelTemplate}
                      className="text-[10px] font-black bg-white hover:bg-emerald-100 text-emerald-900 px-2.5 py-1 rounded-lg border border-slate-900 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3 h-3 text-emerald-700" />
                      <span>Template CSV</span>
                    </button>
                  </div>
                  <p className="text-[11px] font-bold text-slate-700 leading-relaxed">
                    Upload file spreadsheet dengan kolom header: <strong>Nama</strong>, <strong>Kelas</strong>, <strong>Absen</strong>, <strong>Email</strong>, <strong>NISN</strong>.
                  </p>
                </div>

                <div>
                  <label className="block font-black uppercase text-slate-900 mb-1">Pilih Kelas Default (Jika tidak ada kolom kelas)</label>
                  <select
                    value={excelDefaultClass}
                    onChange={(e) => setExcelDefaultClass(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-slate-900 rounded-xl font-bold bg-white"
                  >
                    <option value="7A">Kelas 7A</option>
                    <option value="7B">Kelas 7B</option>
                    <option value="8A">Kelas 8A</option>
                    <option value="8B">Kelas 8B</option>
                    <option value="9A">Kelas 9A</option>
                    <option value="9B">Kelas 9B</option>
                    <option value="9C">Kelas 9C</option>
                  </select>
                </div>

                {/* File Input Zone */}
                <div className="border-3 border-dashed border-slate-400 hover:border-indigo-600 rounded-2xl p-6 text-center bg-slate-50 hover:bg-indigo-50/40 transition cursor-pointer relative group">
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleExcelFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="space-y-2 pointer-events-none">
                    <Upload className="w-8 h-8 text-indigo-600 mx-auto group-hover:scale-110 transition-transform" />
                    <div>
                      <span className="font-black text-slate-900 text-sm">Klik atau Seret File Excel / CSV di Sini</span>
                      <p className="text-[11px] text-slate-500 font-bold mt-0.5">Mendukung file .xlsx, .xls, dan .csv</p>
                    </div>
                    {excelFileName && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-100 text-indigo-900 border border-indigo-400 rounded-lg text-xs font-black">
                        <FileType className="w-3.5 h-3.5 text-indigo-700" />
                        <span>File Terpilih: {excelFileName}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Error message */}
                {excelErrorMsg && (
                  <div className="p-3 bg-rose-50 border-2 border-rose-400 text-rose-950 font-bold rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{excelErrorMsg}</span>
                  </div>
                )}

                {/* Parsed Preview Table */}
                {excelParsedStudents.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between font-black text-slate-950 uppercase text-xs">
                      <span>Pratinjau Hasil Pembacaan ({excelParsedStudents.length} Siswa)</span>
                      <span className="text-[10px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-400 font-black">✓ Siap Diimpor</span>
                    </div>
                    <div className="max-h-48 overflow-y-auto border-2 border-slate-900 rounded-xl bg-white text-[11px]">
                      <table className="w-full text-left">
                        <thead className="bg-slate-100 border-b-2 border-slate-900 font-black uppercase text-[10px] sticky top-0">
                          <tr>
                            <th className="p-2 border-r border-slate-300">Absen</th>
                            <th className="p-2 border-r border-slate-300">Nama Siswa</th>
                            <th className="p-2 border-r border-slate-300">Kelas</th>
                            <th className="p-2 border-r border-slate-300">NISN</th>
                            <th className="p-2">Email</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-medium">
                          {excelParsedStudents.slice(0, 15).map((s, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="p-2 border-r border-slate-200 font-mono font-bold text-center">{s.absen}</td>
                              <td className="p-2 border-r border-slate-200 font-bold text-slate-950">{s.name}</td>
                              <td className="p-2 border-r border-slate-200 font-bold">{s.kelas}</td>
                              <td className="p-2 border-r border-slate-200 font-mono text-slate-600">{s.nisn}</td>
                              <td className="p-2 font-mono text-slate-600 truncate max-w-[120px]">{s.email}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {excelParsedStudents.length > 15 && (
                        <div className="p-2 text-center text-slate-500 font-bold text-[10px] bg-slate-50 border-t border-slate-200">
                          ... dan {excelParsedStudents.length - 15} siswa lainnya.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowAddStudentModal(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-950 border-2 border-slate-900 rounded-xl font-black uppercase cursor-pointer text-xs"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleImportExcelStudents}
                    disabled={excelParsedStudents.length === 0}
                    className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] rounded-xl font-black uppercase flex items-center gap-1.5 cursor-pointer disabled:opacity-50 text-xs"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-slate-950" />
                    <span>Import {excelParsedStudents.length} Siswa ke Master Data</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 1: BATCH TEXT PASTE */}
            {addStudentTab === 'batch_text' && (
              <form onSubmit={handleAddBatchTextStudents} className="space-y-3 text-xs">
                <div className="bg-amber-50 p-3 rounded-xl border-2 border-slate-900 space-y-1">
                  <div className="font-black text-amber-900 uppercase">💡 Cara Tambah Banyak Siswa Sekaligus:</div>
                  <p className="text-[11px] font-bold text-slate-700 leading-snug">
                    Tempel daftar nama siswa (1 nama per baris). Sistem otomatis membuat NISN, No Absen berurutan, dan Email Google <code className="bg-amber-100 px-1 rounded">@siswa.belajar.id</code>!
                  </p>
                </div>

                <div>
                  <label className="block font-black uppercase text-slate-900 mb-1">Pilih Kelas Default</label>
                  <select
                    value={batchTextClass}
                    onChange={(e) => setBatchTextClass(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-slate-900 rounded-xl font-bold bg-white"
                  >
                    <option value="7A">Kelas 7A</option>
                    <option value="7B">Kelas 7B</option>
                    <option value="8A">Kelas 8A</option>
                    <option value="8B">Kelas 8B</option>
                    <option value="9A">Kelas 9A</option>
                    <option value="9B">Kelas 9B</option>
                    <option value="9C">Kelas 9C</option>
                  </select>
                </div>

                <div>
                  <label className="block font-black uppercase text-slate-900 mb-1">Daftar Nama Siswa (1 Nama per Baris)</label>
                  <textarea
                    rows={5}
                    value={batchTextNames}
                    onChange={(e) => setBatchTextNames(e.target.value)}
                    placeholder={`Contoh:\nAhmad Rizky Pratama\nBudi Santoso\nCitra Dewi Lestari\nDeni Kurniawan\nEka Putri Rahmawati`}
                    className="w-full p-3 border-2 border-slate-900 rounded-xl font-mono text-xs font-bold leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddStudentModal(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-950 border-2 border-slate-900 rounded-xl font-black uppercase cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] rounded-xl font-black uppercase flex items-center gap-1.5 cursor-pointer"
                  >
                    <FilePlus className="w-4 h-4" />
                    <span>Tambah Semua Siswa Massal</span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: BATCH AUTO GENERATE */}
            {addStudentTab === 'batch_auto' && (
              <form onSubmit={handleAutoGenerateStudents} className="space-y-3 text-xs">
                <div className="bg-indigo-50 p-3 rounded-xl border-2 border-slate-900 space-y-1">
                  <div className="font-black text-indigo-950 uppercase flex items-center gap-1">
                    <Wand2 className="w-4 h-4 text-indigo-600" />
                    <span>Generator Siswa Otomatis:</span>
                  </div>
                  <p className="text-[11px] font-bold text-slate-700 leading-snug">
                    Buat puluhan data siswa simulasi lengkap dengan NISN, nama realistis Indonesia / penomoran, dan akun Google secara instant!
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-black uppercase text-slate-900 mb-1">Target Kelas</label>
                    <select
                      value={autoGenClass}
                      onChange={(e) => setAutoGenClass(e.target.value)}
                      className="w-full px-3 py-2 border-2 border-slate-900 rounded-xl font-bold bg-white"
                    >
                      <option value="7A">Kelas 7A</option>
                      <option value="7B">Kelas 7B</option>
                      <option value="8A">Kelas 8A</option>
                      <option value="8B">Kelas 8B</option>
                      <option value="9A">Kelas 9A</option>
                      <option value="9B">Kelas 9B</option>
                      <option value="9C">Kelas 9C</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-black uppercase text-slate-900 mb-1">Jumlah Siswa</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={autoGenCount}
                      onChange={(e) => setAutoGenCount(parseInt(e.target.value) || 10)}
                      className="w-full px-3 py-2 border-2 border-slate-900 rounded-xl font-bold"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-black uppercase text-slate-900 mb-1">Format Nama Siswa</label>
                  <select
                    value={autoGenNaming}
                    onChange={(e) => setAutoGenNaming(e.target.value as 'random_names' | 'numbered')}
                    className="w-full px-3 py-2 border-2 border-slate-900 rounded-xl font-bold bg-white"
                  >
                    <option value="random_names">Nama Indonesia Acak (Contoh: Aditia Pratama, Anisa Sari)</option>
                    <option value="numbered">Format Penomoran (Contoh: Siswa 8B 01, Siswa 8B 02)</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddStudentModal(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-950 border-2 border-slate-900 rounded-xl font-black uppercase cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] rounded-xl font-black uppercase flex items-center gap-1.5 cursor-pointer"
                  >
                    <Wand2 className="w-4 h-4 text-amber-300" />
                    <span>Generate {autoGenCount} Siswa Otomatis</span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB 3: SINGLE STUDENT MANUAL */}
            {addStudentTab === 'single' && (
              <form onSubmit={handleAddStudent} className="space-y-3 text-xs">
                <div>
                  <label className="block font-black uppercase text-slate-900 mb-1">Nama Lengkap Siswa</label>
                  <input
                    type="text"
                    value={newStudentName}
                    onChange={(e) => setNewStudentName(e.target.value)}
                    placeholder="Contoh: Muhammad Rizky"
                    className="w-full px-3 py-2 border-2 border-slate-900 rounded-xl font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block font-black uppercase text-slate-900 mb-1">Email Google / Gmail Siswa</label>
                  <input
                    type="email"
                    value={newStudentEmail}
                    onChange={(e) => setNewStudentEmail(e.target.value)}
                    placeholder="contoh@siswa.belajar.id"
                    className="w-full px-3 py-2 border-2 border-slate-900 rounded-xl font-bold"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-black uppercase text-slate-900 mb-1">Kelas</label>
                    <select
                      value={newStudentClass}
                      onChange={(e) => setNewStudentClass(e.target.value)}
                      className="w-full px-3 py-2 border-2 border-slate-900 rounded-xl font-bold bg-white"
                    >
                      <option value="7A">7A</option>
                      <option value="7B">7B</option>
                      <option value="8A">8A</option>
                      <option value="8B">8B</option>
                      <option value="9A">9A</option>
                      <option value="9B">9B</option>
                      <option value="9C">9C</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-black uppercase text-slate-900 mb-1">No. Absen</label>
                    <input
                      type="text"
                      value={newStudentAbsen}
                      onChange={(e) => setNewStudentAbsen(e.target.value)}
                      className="w-full px-3 py-2 border-2 border-slate-900 rounded-xl font-bold"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-black uppercase text-slate-900 mb-1">NISN</label>
                  <input
                    type="text"
                    value={newStudentNisn}
                    onChange={(e) => setNewStudentNisn(e.target.value)}
                    placeholder="Otomatis jika dikosongkan"
                    className="w-full px-3 py-2 border-2 border-slate-900 rounded-xl font-bold"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddStudentModal(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-950 border-2 border-slate-900 rounded-xl font-black uppercase cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] rounded-xl font-black uppercase cursor-pointer"
                  >
                    Simpan Siswa
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
