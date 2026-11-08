import React, { useState, useEffect } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { CONFIG } from '../components/ui/utils';
import { api, tokenStorage } from '../services/api';
import { Parcel, User } from '../types';
import { Clock, QrCode, RefreshCw, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';
import { DynamicQrCode } from '../components/DynamicQrCode';

interface RecipientPortalProps {
  currentUser: User | null;
  onLoginSuccess?: (user: User) => void;
  onLogout?: () => void;
  onNavigateToKiosk?: (code: string, otpToken?: string) => void;
}

export const RecipientPortal: React.FC<RecipientPortalProps> = ({
  currentUser,
  onLoginSuccess,
  onLogout,
  onNavigateToKiosk,
}) => {
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedParcelForQr, setSelectedParcelForQr] = useState<Parcel | null>(null);

  // Authentication State
  const [loginEmail, setLoginEmail] = useState<string>(CONFIG.IS_DEMO_MODE ? 'alice@student.dropsecure.edu' : '');
  const [loginPassword, setLoginPassword] = useState<string>(CONFIG.IS_DEMO_MODE ? 'Student@123' : '');
  const [loggingIn, setLoggingIn] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      loadParcels();
    }
  }, [currentUser]);

  const loadParcels = async () => {
    try {
      setLoading(true);
      const res = await api.getParcels();
      setParcels(res.parcels);
    } catch (err: any) {
      console.error('Failed to load parcels:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoggingIn(true);
      setLoginError(null);
      const res = await api.login({ email: loginEmail, password: loginPassword });
      tokenStorage.set(res.token);
      if (onLoginSuccess) onLoginSuccess(res.user);
    } catch (err: any) {
      setLoginError(err.message || 'Invalid credentials');
    } finally {
      setLoggingIn(false);
    }
  };

  // If student is not logged in: Clean enterprise authentication form
  if (!currentUser) {
    return (
      <AppShell portalName="Student Portal" portalDescription="Resident package tracking and pickup authorization">
        <div className="max-w-md mx-auto my-12">
          <div className="p-6 rounded bg-canvas-surface border border-border">
            <h2 className="text-base font-semibold text-fg">Student sign in</h2>
            <p className="text-xs text-fg-muted mt-1">
              Authenticate with your campus credentials to view incoming packages.
            </p>

            {loginError && (
              <div className="mt-4 p-3 rounded bg-canvas-base border border-border text-status-danger text-xs flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-fg mb-1">Campus email</label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="student@dropsecure.edu"
                  className="w-full h-9 bg-canvas-base border border-border rounded px-3 text-xs text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-fg mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-9 bg-canvas-base border border-border rounded px-3 text-xs text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none"
                />
              </div>

              <Button type="submit" disabled={loggingIn} className="w-full">
                {loggingIn ? 'Authenticating...' : 'Sign in'}
              </Button>
            </form>

            {/* Clearly marked Demo Accounts section (visible only when DEMO_MODE=true) */}
            {CONFIG.IS_DEMO_MODE && (
              <div className="mt-6 pt-4 border-t border-border">
                <span className="text-[11px] font-mono text-fg-subtle block mb-2">Demo accounts:</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginEmail('alice@student.dropsecure.edu');
                      setLoginPassword('Student@123');
                    }}
                    className="p-2 text-left rounded bg-canvas-base border border-border hover:border-accent text-xs transition"
                  >
                    <span className="font-medium text-fg block">Alice Student</span>
                    <span className="text-[10px] text-fg-muted font-mono">Bandra Campus</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginEmail('bob@student.dropsecure.edu');
                      setLoginPassword('Student@123');
                    }}
                    className="p-2 text-left rounded bg-canvas-base border border-border hover:border-accent text-xs transition"
                  >
                    <span className="font-medium text-fg block">Bob Scholar</span>
                    <span className="text-[10px] text-fg-muted font-mono">Vashi Campus</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </AppShell>
    );
  }

  const pendingParcels = parcels.filter((p) => p.status === 'PENDING');
  const collectedParcels = parcels.filter((p) => p.status === 'COLLECTED');

  return (
    <AppShell
      portalName="Student Portal"
      portalDescription="Manage and authorize parcel pickups"
      currentUser={currentUser}
      onLogout={onLogout}
      primaryAction={
        <Button variant="secondary" size="sm" onClick={loadParcels} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </Button>
      }
    >
      {/* Dynamic QR Code Modal */}
      {selectedParcelForQr && (
        <DynamicQrCode
          parcel={selectedParcelForQr}
          onClose={() => setSelectedParcelForQr(null)}
          onSimulateScan={(code, token) => {
            setSelectedParcelForQr(null);
            if (onNavigateToKiosk) {
              onNavigateToKiosk(code, token);
            }
          }}
        />
      )}

      <div className="space-y-6">
        {/* Active Pickups Banner */}
        {pendingParcels.length > 0 && (
          <div className="p-4 rounded bg-canvas-surface border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-fg">
                {pendingParcels.length} package(s) ready for collection
              </h2>
              <p className="text-xs text-fg-muted mt-0.5">
                Visit the campus collection kiosk and enter your pickup code to release the locker door.
              </p>
            </div>
            {onNavigateToKiosk && (
              <Button
                variant="primary"
                onClick={() => onNavigateToKiosk(pendingParcels[0].tracking_code)}
              >
                Go to kiosk
              </Button>
            )}
          </div>
        )}

        {/* Parcels Table / Card List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h3 className="text-xs font-semibold text-fg-muted uppercase tracking-wider">
              Your parcels ({parcels.length})
            </h3>
            <span className="text-xs text-fg-subtle">
              Pickup window: {CONFIG.EXPIRY_WINDOW_HOURS} hours from delivery
            </span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-20 rounded bg-canvas-surface border border-border skeleton-loading" />
              ))}
            </div>
          ) : parcels.length === 0 ? (
            <div className="p-12 text-center rounded bg-canvas-surface border border-border text-fg-muted text-xs">
              No packages registered for your account.
            </div>
          ) : (
            <div className="space-y-3">
              {parcels.map((parcel) => {
                const createdAt = new Date(parcel.created_at).getTime();
                const expiryTime = parcel.otp_expires_at
                  ? new Date(parcel.otp_expires_at).getTime()
                  : createdAt + CONFIG.EXPIRY_WINDOW_HOURS * 3600 * 1000;
                const remainingMs = Math.max(0, expiryTime - Date.now());
                const hoursLeft = Math.floor(remainingMs / (1000 * 60 * 60));
                const minsLeft = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

                return (
                  <div
                    key={parcel.id}
                    className="p-4 rounded bg-canvas-surface border border-border flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-sm font-semibold text-fg">
                          {parcel.tracking_code}
                        </span>
                        <StatusBadge status={parcel.status as any} />
                        <span className="text-xs text-fg-muted font-medium">
                          • {parcel.carrier || 'Courier'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3 text-xs text-fg-muted">
                        <span>Locker {parcel.locker_number || 'L-01'} (Simulated)</span>
                        <span>•</span>
                        <span>Deposited {new Date(parcel.created_at).toLocaleDateString()}</span>
                        {parcel.status === 'PENDING' && (
                          <>
                            <span>•</span>
                            <span className="text-fg flex items-center space-x-1">
                              <Clock className="h-3 w-3 text-fg-muted" />
                              <span className="tabular-nums font-mono font-medium">
                                {hoursLeft}h {minsLeft}m remaining
                              </span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {parcel.status === 'PENDING' && (
                      <div className="flex items-center space-x-2 shrink-0">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setSelectedParcelForQr(parcel)}
                          title="Generate single-use dynamic QR"
                        >
                          <QrCode className="h-3.5 w-3.5 mr-1.5" />
                          <span>Show QR</span>
                        </Button>
                        {onNavigateToKiosk && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => onNavigateToKiosk(parcel.tracking_code)}
                          >
                            <span>Collect</span>
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
};
