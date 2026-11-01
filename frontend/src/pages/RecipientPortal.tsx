import React, { useState, useEffect } from 'react';
import { Package, Mail, CheckCircle2, AlertTriangle, ShieldCheck, RefreshCw, KeyRound, Clock, User, LogIn, LogOut, Building, Sparkles, QrCode } from 'lucide-react';
import { api, tokenStorage } from '../services/api';
import { Parcel, User as UserType } from '../types';
import { ParcelCard } from '../components/ParcelCard';
import { DynamicQrCode } from '../components/DynamicQrCode';

interface RecipientPortalProps {
  currentUser: UserType | null;
  onLoginSuccess?: (user: UserType) => void;
  onLogout?: () => void;
  onNavigateToKiosk?: (trackingCode: string, otpToken?: string) => void;
}

export const RecipientPortal: React.FC<RecipientPortalProps> = ({
  currentUser,
  onLoginSuccess,
  onLogout,
  onNavigateToKiosk,
}) => {
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<'PENDING' | 'COLLECTED' | 'ALL'>('PENDING');
  const [selectedParcelForQr, setSelectedParcelForQr] = useState<Parcel | null>(null);

  // Login form state (if not logged in)
  const [loginEmail, setLoginEmail] = useState<string>('alice@student.dropsecure.edu');
  const [loginPassword, setLoginPassword] = useState<string>('Student@123');
  const [loggingIn, setLoggingIn] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      fetchMyParcels();
    }
  }, [currentUser]);

  const fetchMyParcels = async () => {
    try {
      setLoading(true);
      const res = await api.getParcels();
      setParcels(res.parcels);
    } catch (err) {
      console.error('Error fetching recipient parcels:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoggingIn(true);
      setLoginError(null);
      const res = await api.login({ email: loginEmail, password: loginPassword });
      tokenStorage.set(res.token);
      if (onLoginSuccess) {
        onLoginSuccess(res.user);
      }
    } catch (err: any) {
      setLoginError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleQuickDemoStudent = async (email: string) => {
    setLoginEmail(email);
    setLoginPassword('Student@123');
    try {
      setLoggingIn(true);
      setLoginError(null);
      const res = await api.login({
        email,
        password: 'Student@123',
      });
      tokenStorage.set(res.token);
      if (onLoginSuccess) {
        onLoginSuccess(res.user);
      }
    } catch (err: any) {
      setLoginError(err.message || 'Failed demo student login');
    } finally {
      setLoggingIn(false);
    }
  };

  // If user is not logged in as student, show student login interface
  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="bg-slate-900/90 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="h-14 w-14 rounded-2xl bg-brand-500/10 text-brand-400 mx-auto flex items-center justify-center border border-brand-500/20 shadow-inner">
              <User className="h-7 w-7" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Student Package Portal</h2>
            <p className="text-xs text-slate-400">
              Sign in with your student credentials to track arrivals and view collection OTP status.
            </p>
          </div>

          {loginError && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleStudentLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Student Email</label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="alice@student.dropsecure.edu"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
              />
            </div>

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold py-3 px-4 rounded-xl text-xs transition flex items-center justify-center space-x-2 shadow-lg shadow-brand-500/20"
            >
              {loggingIn ? <RefreshCw className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              <span>Sign In to Student Portal</span>
            </button>
          </form>

          {/* Quick Demo Student Switcher */}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <span className="text-[11px] font-semibold text-slate-400 block text-center uppercase tracking-wider">
              1-Click Demo Login by Campus:
            </span>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemoStudent('alice@student.dropsecure.edu')}
                disabled={loggingIn}
                className="w-full py-2 px-3 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 transition flex items-center justify-between"
              >
                <span>Alice Johnson</span>
                <span className="text-[10px] font-mono text-emerald-400">Fr. CRCE Bandra</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoStudent('bob@student.dropsecure.edu')}
                disabled={loggingIn}
                className="w-full py-2 px-3 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 transition flex items-center justify-between"
              >
                <span>Bob Smith</span>
                <span className="text-[10px] font-mono text-blue-400">Fr. CRIT Vashi</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoStudent('charlie@student.dropsecure.edu')}
                disabled={loggingIn}
                className="w-full py-2 px-3 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 transition flex items-center justify-between"
              >
                <span>Charlie Brown</span>
                <span className="text-[10px] font-mono text-purple-400">Agnel Nerul</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Logged-in Student View
  const pendingParcels = parcels.filter((p) => p.status === 'PENDING');
  const collectedParcels = parcels.filter((p) => p.status === 'COLLECTED');

  const displayedParcels = parcels.filter((p) => {
    if (activeFilter === 'PENDING') return p.status === 'PENDING';
    if (activeFilter === 'COLLECTED') return p.status === 'COLLECTED';
    return true;
  });

  const studentCampus = currentUser.campus_id || 'CAMPUS-BANDRA';
  const studentCampusName =
    studentCampus === 'CAMPUS-VASHI'
      ? 'Fr. CRIT Vashi (Agnel Tech)'
      : studentCampus === 'CAMPUS-NERUL'
      ? 'Agnel Nerul (Research Campus)'
      : 'Fr. CRCE Bandra (Main Campus)';

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Dynamic QR Code Modal */}
      {selectedParcelForQr && (
        <DynamicQrCode
          parcel={selectedParcelForQr}
          onClose={() => setSelectedParcelForQr(null)}
          onSimulateScan={(code, token) => {
            setSelectedParcelForQr(null);
            if (onNavigateToKiosk) {
              onNavigateToKiosk(code, token);
            } else {
              window.location.href = `/kiosk?code=${encodeURIComponent(code)}&otp=${encodeURIComponent(token)}&auto=true`;
            }
          }}
        />
      )}

      {/* Student Profile Header */}
      <div className="bg-slate-900/80 border border-slate-800/90 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center space-x-3.5">
          <div className="h-12 w-12 rounded-2xl bg-brand-500/15 border border-brand-500/30 text-brand-300 flex items-center justify-center text-lg font-bold">
            {currentUser.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-white">{currentUser.name}</h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                Student
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                {studentCampusName}
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center space-x-1.5 mt-0.5">
              <Building className="h-3.5 w-3.5 text-slate-500" />
              <span>{currentUser.roomNumber || 'Hostel Unit'}</span>
              <span>•</span>
              <span>{currentUser.email}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <button
            onClick={fetchMyParcels}
            disabled={loading}
            className="flex-1 sm:flex-none text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3.5 py-2 rounded-xl border border-slate-700 transition flex items-center justify-center space-x-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          {onLogout && (
            <button
              onClick={onLogout}
              className="text-xs bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 px-3.5 py-2 rounded-xl border border-slate-700 transition flex items-center space-x-1.5"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </div>

      {/* Action Required: Pending Packages Awaiting Collection Banner */}
      {pendingParcels.length > 0 ? (
        <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/40 border border-amber-500/30 rounded-3xl p-5 sm:p-6 space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <span className="flex h-3 w-3 rounded-full bg-amber-400 animate-ping" />
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <span>{pendingParcels.length} Package(s) Ready for Collection!</span>
              </h2>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
              Pickup Station Open
            </span>
          </div>
          <p className="text-xs text-slate-300">
            Please walk to <span className="font-semibold text-white">{studentCampusName}</span>.
            Enter your OTP or scan your dynamic rotating QR at the automated kiosk to release your smart locker door.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {pendingParcels.map((p) => (
              <div
                key={p.id}
                className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-brand-400 text-sm">{p.tracking_code}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 border border-slate-700 text-slate-300">
                      {p.carrier || 'Courier'}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-400 font-mono mt-1">
                    Locker: {p.locker_number || 'L-04'} ({p.locker_size || 'MEDIUM'})
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setSelectedParcelForQr(p)}
                    className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 font-semibold px-2.5 py-1.5 rounded-xl text-xs transition"
                  >
                    <QrCode className="h-3.5 w-3.5" />
                  </button>
                  {onNavigateToKiosk && (
                    <button
                      onClick={() => onNavigateToKiosk(p.tracking_code)}
                      className="bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold px-3 py-1.5 rounded-xl text-xs transition shadow-sm"
                    >
                      Collect
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-5 text-center text-xs text-slate-400">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 mx-auto mb-1.5" />
          <span>You have no pending packages waiting for pickup. All caught up!</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveFilter('PENDING')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
            activeFilter === 'PENDING'
              ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Waiting for Pickup ({pendingParcels.length})
        </button>
        <button
          onClick={() => setActiveFilter('COLLECTED')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
            activeFilter === 'COLLECTED'
              ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Collected History ({collectedParcels.length})
        </button>
        <button
          onClick={() => setActiveFilter('ALL')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
            activeFilter === 'ALL'
              ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          All ({parcels.length})
        </button>
      </div>

      {/* Parcels List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-44 bg-slate-900/50 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : displayedParcels.length === 0 ? (
        <div className="bg-slate-900/30 border border-slate-800/60 rounded-3xl p-12 text-center">
          <Package className="h-10 w-10 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-300">No parcels in this category</p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedParcels.map((parcel) => (
            <ParcelCard
              key={parcel.id}
              parcel={parcel}
              userRole="RECIPIENT"
              onShowDynamicQr={(p) => setSelectedParcelForQr(p)}
              onVerifyClick={(p) => {
                if (onNavigateToKiosk) {
                  onNavigateToKiosk(p.tracking_code);
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
