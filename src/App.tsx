import React, { useState, useEffect } from 'react';
import { User, UserRole } from './types';
import { getCurrentUser, setCurrentUser, isWhitelistedCounselorEmail, getSchoolData, subscribeToRealtimeChanges } from './services/storage';
import { syncToGoogleSheetsWebhook } from './services/googleSheets';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { ServerDashboard } from './components/server/ServerDashboard';
import { ClientDashboard } from './components/client/ClientDashboard';

export default function App() {
  const [currentUser, setCurrentUserObj] = useState<User | null>(getCurrentUser());
  const [activeRole, setActiveRole] = useState<UserRole>(
    currentUser ? currentUser.role : 'client_siswa'
  );
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(!currentUser);
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);
  const [globalNotification, setGlobalNotification] = useState<string | null>(null);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setCurrentUserObj(user);
      setActiveRole(user.role);
    } else {
      setIsAuthModalOpen(true);
    }

    const unsubscribe = subscribeToRealtimeChanges(() => {
      const updated = getCurrentUser();
      if (updated) {
        setCurrentUserObj(updated);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setCurrentUserObj(user);
    setActiveRole(user.role);
    setIsAuthModalOpen(false);
    showToast(`Selamat datang, ${user.name}! Anda masuk sebagai ${user.role === 'server_guru' ? 'Guru BK (Server)' : 'Siswa (Client)'}.`);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentUserObj(null);
    setIsAuthModalOpen(true);
  };

  const handleSwitchRole = (newRole: UserRole) => {
    if (newRole === 'server_guru') {
      if (currentUser && !isWhitelistedCounselorEmail(currentUser.email)) {
        alert(`Alamat email ${currentUser.email} belum terdaftar di Whitelist Guru BK. Harap login dengan akun Email Konselor yang telah didaftarkan.`);
        setIsAuthModalOpen(true);
        return;
      }
    }
    setActiveRole(newRole);
    showToast(`Beralih ke Aplikasi ${newRole === 'server_guru' ? 'Server (Guru BK)' : 'Client (Siswa)'}`);
  };

  const handleSyncGoogleSheets = async () => {
    const school = getSchoolData();
    setIsSyncingSheets(true);
    const res = await syncToGoogleSheetsWebhook(school.googleSheetUrl || '');
    setIsSyncingSheets(false);
    showToast(res.message);
  };

  const showToast = (msg: string) => {
    setGlobalNotification(msg);
    setTimeout(() => {
      setGlobalNotification(null);
    }, 4000);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex flex-col antialiased">
      {/* Toast Notification Banner */}
      {globalNotification && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 text-xs font-medium flex items-center justify-between gap-3 animate-bounce">
          <span>{globalNotification}</span>
          <button
            type="button"
            onClick={() => setGlobalNotification(null)}
            className="text-slate-400 hover:text-white font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onLogin={handleLogin}
      />

      {currentUser && (
        <>
          <Navbar
            currentUser={currentUser}
            activeRole={activeRole}
            onSwitchRole={handleSwitchRole}
            onLogout={handleLogout}
            onSyncGoogleSheets={handleSyncGoogleSheets}
            isSyncingSheets={isSyncingSheets}
          />

          <main className="flex-1 pb-16">
            {activeRole === 'server_guru' ? (
              <ServerDashboard currentUser={currentUser} />
            ) : (
              <ClientDashboard currentUser={currentUser} />
            )}
          </main>

          {/* Footer */}
          <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 text-xs py-6 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
              <div>
                <strong className="text-white">BK Next G</strong> — Sistem Informasi & Layanan Bimbingan Konseling Digital
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                Terhubung ke Google Sheets & Google Auth • Multi Portal Server/Client
              </div>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}
