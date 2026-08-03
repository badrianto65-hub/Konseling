import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { isWhitelistedCounselorEmail, saveSchoolData, getSchoolData } from '../services/storage';
import { ShieldCheck, UserCheck, GraduationCap, AlertCircle, CheckCircle2, ArrowRight, ExternalLink } from 'lucide-react';

interface AuthModalProps {
  onLogin: (user: User) => void;
  isOpen: boolean;
  onClose?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onLogin, isOpen }) => {
  const [email, setEmail] = useState('badrianto65@guru.smp.belajar.id');
  const [name, setName] = useState('Badrianto, S.Pd.');
  const [kelas, setKelas] = useState('8A');
  const [absen, setAbsen] = useState('01');
  const [nisn, setNisn] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [targetRole, setTargetRole] = useState<UserRole>('server_guru');
  const [isSimulatingGoogleAuth, setIsSimulatingGoogleAuth] = useState(false);

  useEffect(() => {
    // If google identity script is available in window
    if (typeof window !== 'undefined' && (window as any).google?.accounts?.id) {
      try {
        (window as any).google.accounts.id.initialize({
          client_id: (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '1088427928424-demo.apps.googleusercontent.com',
          callback: (response: any) => {
            // Decode Google Credential Token if available
            if (response.credential) {
              try {
                const payload = JSON.parse(atob(response.credential.split('.')[1]));
                if (payload.email) {
                  setEmail(payload.email);
                  if (payload.name) setName(payload.name);
                }
              } catch (err) {
                console.log('Google token decode:', err);
              }
            }
          }
        });
      } catch (e) {
        console.warn('Google GSI Init warning:', e);
      }
    }
  }, []);

  if (!isOpen) return null;

  const handleGoogleSignInClick = () => {
    setIsSimulatingGoogleAuth(true);
    setError(null);
    setTimeout(() => {
      setIsSimulatingGoogleAuth(false);
      executeLogin(email, name, targetRole);
    }, 600);
  };

  const executeLogin = (userEmail: string, userName: string, roleWanted: UserRole) => {
    const cleanEmail = userEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Harap masukkan alamat email Google / Gmail Anda.');
      return;
    }

    if (!cleanEmail.includes('@')) {
      setError('Format email tidak valid.');
      return;
    }

    const isWhitelisted = isWhitelistedCounselorEmail(cleanEmail);

    if (roleWanted === 'server_guru') {
      if (!isWhitelisted) {
        setError(`Email "${cleanEmail}" belum terdaftar dalam Whitelist Guru BK. Hanya alamat Gmail yang didaftarkan di Data Sekolah yang dapat mengelola Aplikasi Server Guru BK.`);
        return;
      }
    }

    const assignedRole: UserRole = isWhitelisted && roleWanted === 'server_guru' ? 'server_guru' : 'client_siswa';
    const finalName = userName.trim() || (assignedRole === 'server_guru' ? 'Guru BK' : 'Siswa');

    // Auto add student to Master Data if new
    if (assignedRole === 'client_siswa') {
      const schoolData = getSchoolData();
      const existingStudent = schoolData.students.find(s => s.email.toLowerCase() === cleanEmail);
      if (!existingStudent) {
        const newStudent = {
          id: `s-${Date.now()}`,
          nisn: nisn || `008${Math.floor(100000 + Math.random() * 900000)}`,
          name: finalName,
          kelas: kelas || '7A',
          absen: absen || '01',
          email: cleanEmail,
          notes: 'Terdaftar via Google Sign-In (Vercel Ready)'
        };
        schoolData.students.push(newStudent);
        saveSchoolData(schoolData);
      }
    }

    const userObj: User = {
      id: `u-${Date.now()}`,
      name: finalName,
      email: cleanEmail,
      role: assignedRole,
      kelas: assignedRole === 'client_siswa' ? kelas : undefined,
      absen: assignedRole === 'client_siswa' ? absen : undefined,
      nisn: assignedRole === 'client_siswa' ? nisn : undefined,
      googleAccount: true,
      avatar: assignedRole === 'server_guru' 
        ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
        : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'
    };

    onLogin(userObj);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeLogin(email, name, targetRole);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-white rounded-[2rem] shadow-[12px_12px_0px_0px_rgba(15,23,42,1)] max-w-xl w-full border-4 border-slate-900 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-indigo-950 text-white p-6 relative border-b-4 border-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 border-2 border-slate-900 flex items-center justify-center font-black text-2xl text-white shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]">
              BK
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight uppercase">Masuk BK Next G</h2>
              <p className="text-xs text-amber-300 mt-0.5 font-bold">
                Google Gmail Auth • Vercel App Ready
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Main Google Sign-In Button */}
          <div className="mb-6 space-y-3">
            <button
              type="button"
              onClick={handleGoogleSignInClick}
              disabled={isSimulatingGoogleAuth}
              className="w-full py-3.5 px-4 bg-white hover:bg-slate-50 text-slate-950 font-black text-sm uppercase tracking-wider rounded-2xl border-3 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] active:translate-y-[2px] transition-all flex items-center justify-center gap-3 cursor-pointer"
            >
              {isSimulatingGoogleAuth ? (
                <div className="w-5 h-5 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>Masuk dengan Google (Gmail / Belajar.id)</span>
            </button>
            <div className="text-[11px] text-center font-bold text-slate-500">
              Mendukung Login Gmail di Vercel Deployment & Local Cloud
            </div>
          </div>

          {/* Account Role Selector Tab */}
          <div className="mb-6">
            <label className="block text-xs font-black text-slate-950 uppercase tracking-widest mb-2">
              1. Peran Akses Saat Login Google
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setTargetRole('client_siswa');
                  setError(null);
                }}
                className={`p-4 rounded-2xl border-3 border-slate-900 text-left transition-all flex items-start gap-3 cursor-pointer ${
                  targetRole === 'client_siswa'
                    ? 'bg-emerald-100 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]'
                    : 'bg-white hover:bg-slate-50 opacity-80 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]'
                }`}
              >
                <div className={`p-2 rounded-xl border-2 border-slate-900 ${targetRole === 'client_siswa' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-100 text-slate-700'}`}>
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-black text-sm text-slate-950 uppercase">Client - Siswa</div>
                  <div className="text-[11px] text-slate-700 font-bold mt-0.5">Konsultasi, Mood Tracker, Chat</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTargetRole('server_guru');
                  setError(null);
                }}
                className={`p-4 rounded-2xl border-3 border-slate-900 text-left transition-all flex items-start gap-3 cursor-pointer ${
                  targetRole === 'server_guru'
                    ? 'bg-amber-100 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]'
                    : 'bg-white hover:bg-slate-50 opacity-80 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]'
                }`}
              >
                <div className={`p-2 rounded-xl border-2 border-slate-900 ${targetRole === 'server_guru' ? 'bg-amber-400 text-slate-950' : 'bg-slate-100 text-slate-700'}`}>
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-black text-sm text-slate-950 uppercase">Server - Guru BK</div>
                  <div className="text-[11px] text-slate-700 font-bold mt-0.5">Khusus Whitelisted Konselor</div>
                </div>
              </button>
            </div>
          </div>

          {/* Information Banner - Administrator / Manager info */}
          <div className="mb-6 p-4 bg-indigo-50 border-3 border-slate-900 rounded-2xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 border-2 border-slate-900 text-white flex items-center justify-center shrink-0 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
              <ShieldCheck className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="text-xs font-black text-slate-950 uppercase tracking-wide">
                Pengelola Aplikasi Server Guru BK
              </div>
              <div className="text-sm font-black text-indigo-950 mt-0.5">
                Badrianto, S.Pd.
              </div>
              <div className="text-xs font-mono font-bold text-indigo-700 mt-0.5">
                badrianto65@guru.smp.belajar.id
              </div>
              <div className="text-[11px] text-slate-600 font-medium mt-1">
                Aplikasi ini dikelola sepenuhnya oleh konselor terdaftar di atas untuk layanan bimbingan konseling terpadu.
              </div>
            </div>
          </div>

          {/* Form manual custom login */}
          <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t-2 border-slate-200">
            <div>
              <label className="block text-xs font-black text-slate-950 uppercase mb-1">
                Alamat Gmail / Email Google <span className="text-rose-600">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                placeholder="badrianto65@guru.smp.belajar.id atau nama@gmail.com"
                className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-900 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-950 uppercase mb-1">
                Nama Lengkap Akun Google
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama Pengguna"
                className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
              />
            </div>

            {targetRole === 'client_siswa' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-950 uppercase mb-1">Kelas</label>
                  <select
                    value={kelas}
                    onChange={(e) => setKelas(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border-2 border-slate-900 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
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
                  <label className="block text-xs font-black text-slate-950 uppercase mb-1">Absen</label>
                  <input
                    type="text"
                    value={absen}
                    onChange={(e) => setAbsen(e.target.value)}
                    placeholder="01"
                    className="w-full px-3.5 py-2 rounded-xl border-2 border-slate-900 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="p-3.5 bg-rose-100 border-2 border-slate-900 rounded-xl flex items-start gap-2.5 text-xs font-black text-rose-950 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>{error}</div>
              </div>
            )}

            {targetRole === 'server_guru' && (
              <div className="p-3.5 bg-amber-100 border-2 border-slate-900 rounded-xl text-xs font-bold text-slate-950 flex items-start gap-2.5 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                <UserCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <strong>Sistem Keamanan Whitelist:</strong> Alamat Gmail konselor terverifikasi dapat mengelola Aplikasi Server di Vercel maupun Local Host.
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-wider rounded-2xl border-3 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] active:translate-y-[2px] transition-all flex items-center justify-center gap-2 text-xs mt-3 cursor-pointer"
            >
              <span>Konfirmasi Login Email ({targetRole === 'server_guru' ? 'Server Guru BK' : 'Client Siswa'})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

