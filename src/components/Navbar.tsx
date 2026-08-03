import React from 'react';
import { User, UserRole } from '../types';
import { Shield, GraduationCap, LogOut, RefreshCw, FileSpreadsheet, Sparkles, UserCheck } from 'lucide-react';

interface NavbarProps {
  currentUser: User;
  activeRole: UserRole;
  onSwitchRole: (newRole: UserRole) => void;
  onLogout: () => void;
  onSyncGoogleSheets: () => void;
  isSyncingSheets?: boolean;
  unreadCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  activeRole,
  onSwitchRole,
  onLogout,
  onSyncGoogleSheets,
  isSyncingSheets = false,
  unreadCount = 0,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-indigo-950 border-b-4 border-slate-900 text-white shadow-[0_4px_0_0_rgba(15,23,42,1)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500 border-2 border-slate-900 flex items-center justify-center text-white font-black text-xl shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]">
              BK
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xl tracking-tight text-white uppercase">BK Next G</span>
                <span className="text-[10px] uppercase font-black tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-400 text-slate-950 border border-slate-900 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]">
                  Bento Console
                </span>
              </div>
              <p className="text-[11px] text-indigo-200 hidden sm:block font-medium">
                Sistem Bimbingan Konseling Digital Terpadu
              </p>
            </div>
          </div>

          {/* Current Role Indicator & Action Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden md:flex items-center gap-2 bg-indigo-900/90 px-3.5 py-2 rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
              {activeRole === 'server_guru' ? (
                <div className="flex items-center gap-2 text-xs font-black uppercase text-amber-300">
                  <Shield className="w-4 h-4 text-amber-400" />
                  <span>Aplikasi Server (Guru BK)</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs font-black uppercase text-emerald-300">
                  <GraduationCap className="w-4 h-4 text-emerald-400" />
                  <span>Aplikasi Client (Siswa)</span>
                </div>
              )}
            </div>

            {/* Google Sheets Sync Button */}
            <button
              type="button"
              onClick={onSyncGoogleSheets}
              disabled={isSyncingSheets}
              title="Sinkronkan data ke Google Sheets"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:translate-y-[1px] transition cursor-pointer"
            >
              <FileSpreadsheet className={`w-4 h-4 text-slate-950 ${isSyncingSheets ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline uppercase">Sheets Sync</span>
            </button>

            {/* Role Switcher */}
            <button
              type="button"
              onClick={() => onSwitchRole(activeRole === 'server_guru' ? 'client_siswa' : 'server_guru')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:translate-y-[1px] transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline uppercase">Mode: {activeRole === 'server_guru' ? 'Client' : 'Server'}</span>
            </button>

            {/* User Profile */}
            <div className="flex items-center gap-2 pl-2 border-l-2 border-indigo-800">
              <div className="text-right hidden lg:block">
                <div className="text-xs font-black text-white flex items-center justify-end gap-1">
                  {currentUser.name}
                  {currentUser.googleAccount && (
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400" title="Terverifikasi Google" />
                  )}
                </div>
                <div className="text-[10px] font-mono text-indigo-300">{currentUser.email}</div>
              </div>

              <div className="w-10 h-10 rounded-xl bg-amber-400 border-2 border-slate-900 flex items-center justify-center font-black text-xs text-slate-950 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                {currentUser.name ? currentUser.name.substring(0, 2).toUpperCase() : 'BK'}
              </div>

              <button
                type="button"
                onClick={onLogout}
                title="Keluar / Ganti Akun Google"
                className="p-2 text-indigo-200 hover:text-white hover:bg-indigo-900 rounded-xl border-2 border-transparent hover:border-slate-900 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
