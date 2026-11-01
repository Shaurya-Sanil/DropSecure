import React, { useState, useEffect } from 'react';
import { PortalHeader } from './components/PortalHeader';
import { DeliveryDropoff } from './pages/DeliveryDropoff';
import { CollectionKiosk } from './pages/CollectionKiosk';
import { RecipientPortal } from './pages/RecipientPortal';
import { AdminDashboard } from './pages/AdminDashboard';
import { CampusGateway } from './pages/CampusGateway';
import { api, tokenStorage } from './services/api';
import { User } from './types';
import { useCurrentPath } from './router';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loadingInitial, setLoadingInitial] = useState<boolean>(true);
  const [path, navigate] = useCurrentPath();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = tokenStorage.get();
    if (!token) {
      setLoadingInitial(false);
      return;
    }

    try {
      const res = await api.getCurrentUser();
      setCurrentUser(res.user);
    } catch (err) {
      console.warn('Session expired or invalid token:', err);
      tokenStorage.clear();
      setCurrentUser(null);
    } finally {
      setLoadingInitial(false);
    }
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    tokenStorage.clear();
    setCurrentUser(null);
  };

  if (loadingInitial) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 space-y-3">
        <div className="h-10 w-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono">Initializing DropSecure Campus Portal...</span>
      </div>
    );
  }

  // 1. Delivery Driver / Courier App: completely separate, zero student or kiosk clutter
  if (path.startsWith('/courier') || path.startsWith('/dropoff')) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-brand-500 selection:text-slate-950">
        <PortalHeader portal="courier" />
        <main className="flex-1 pb-16">
          <DeliveryDropoff />
        </main>
        <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>DropSecure • Delivery Partner Drop Station</span>
            <span className="text-[11px] font-mono text-amber-400">Public Driver Access</span>
          </div>
        </footer>
      </div>
    );
  }

  // 2. Collection Kiosk: walk-up automated touch terminal, completely separate
  if (path.startsWith('/kiosk') || path.startsWith('/station') || path.startsWith('/verify')) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-brand-500 selection:text-slate-950">
        <PortalHeader portal="kiosk" />
        <main className="flex-1 pb-16">
          <CollectionKiosk />
        </main>
        <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>DropSecure • Self-Service Collection Kiosk</span>
            <span className="text-[11px] font-mono text-emerald-400">Terminal #1 • Main Gate</span>
          </div>
        </footer>
      </div>
    );
  }

  // 3. Student Portal: dedicated student tracking & OTP retrieval, completely separate
  if (path.startsWith('/student') || path.startsWith('/packages')) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-brand-500 selection:text-slate-950">
        <PortalHeader
          portal="student"
          currentUser={currentUser?.role === 'RECIPIENT' ? currentUser : null}
          onLogout={handleLogout}
        />
        <main className="flex-1 pb-16">
          <RecipientPortal
            currentUser={currentUser?.role === 'RECIPIENT' ? currentUser : null}
            onLoginSuccess={handleLoginSuccess}
            onLogout={handleLogout}
            onNavigateToKiosk={(code, otpToken) => {
              navigate(`/kiosk?code=${encodeURIComponent(code)}${otpToken ? `&otp=${encodeURIComponent(otpToken)}&auto=true` : ''}`);
            }}
          />
        </main>
        <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>DropSecure • Student Package Portal</span>
            <span className="text-[11px] font-mono text-blue-400">Zero-Trust OTP Security</span>
          </div>
        </footer>
      </div>
    );
  }

  // 4. Admin Operations Console: dedicated telemetry & dev outbox, completely separate
  if (path.startsWith('/admin') || path.startsWith('/dashboard')) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-brand-500 selection:text-slate-950">
        <PortalHeader
          portal="admin"
          currentUser={currentUser?.role === 'ADMIN' ? currentUser : null}
          onLogout={handleLogout}
        />
        <main className="flex-1 pb-16">
          <AdminDashboard
            currentUser={currentUser?.role === 'ADMIN' ? currentUser : null}
            onLoginSuccess={handleLoginSuccess}
            onLogout={handleLogout}
          />
        </main>
        <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>DropSecure • Cloud Administration Console</span>
            <span className="text-[11px] font-mono text-purple-400">AWS Cloud</span>
          </div>
        </footer>
      </div>
    );
  }

  // Root or Default: Clean Campus Gateway Hub
  return <CampusGateway />;
};
