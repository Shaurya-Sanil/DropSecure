import React, { useState, useEffect } from 'react';
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
      <div className="min-h-screen bg-canvas-base flex flex-col items-center justify-center text-fg-muted space-y-3 font-sans">
        <div className="h-6 w-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono">Loading application session...</span>
      </div>
    );
  }

  // 1. Courier Portal
  if (path.startsWith('/courier') || path.startsWith('/dropoff')) {
    return <DeliveryDropoff />;
  }

  // 2. Collection Kiosk
  if (path.startsWith('/kiosk') || path.startsWith('/station') || path.startsWith('/verify')) {
    return <CollectionKiosk />;
  }

  // 3. Student Portal
  if (path.startsWith('/student') || path.startsWith('/packages')) {
    return (
      <RecipientPortal
        currentUser={currentUser?.role === 'RECIPIENT' ? currentUser : null}
        onLoginSuccess={handleLoginSuccess}
        onLogout={handleLogout}
        onNavigateToKiosk={(code, otpToken) => {
          navigate(
            `/kiosk?code=${encodeURIComponent(code)}${
              otpToken ? `&otp=${encodeURIComponent(otpToken)}` : ''
            }`
          );
        }}
      />
    );
  }

  // 4. Operations Console
  if (path.startsWith('/admin') || path.startsWith('/dashboard')) {
    return (
      <AdminDashboard
        currentUser={currentUser?.role === 'ADMIN' ? currentUser : null}
        onLoginSuccess={handleLoginSuccess}
        onLogout={handleLogout}
      />
    );
  }

  // Root: Campus Gateway Chooser
  return <CampusGateway />;
};
