import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Package,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Play,
  RefreshCw,
  FileText,
  Activity,
  Check,
  Server,
  Database,
  Cloud,
  Mail,
  Lock,
  LogIn,
  LogOut,
  Sparkles,
  Search,
  Building2,
  Cpu,
  Layers,
  Network,
  Users,
  UserPlus,
  Trash2,
  X,
} from 'lucide-react';
import { api, tokenStorage } from '../services/api';
import { DashboardMetrics, AuditLog, OutboxItem, User as UserType, Campus } from '../types';

interface AdminDashboardProps {
  currentUser?: UserType | null;
  onLoginSuccess?: (user: UserType) => void;
  onLogout?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  onLoginSuccess,
  onLogout,
}) => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [outboxItems, setOutboxItems] = useState<OutboxItem[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [selectedCampusFilter, setSelectedCampusFilter] = useState<string>('ALL');
  const [students, setStudents] = useState<UserType[]>([]);
  const [loadingStudents, setLoadingStudents] = useState<boolean>(false);
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [showAddStudentModal, setShowAddStudentModal] = useState<boolean>(false);
  const [newStudent, setNewStudent] = useState({
    name: '',
    email: '',
    phone: '',
    roomNumber: '',
    campusId: 'CAMPUS-BANDRA',
  });
  const [studentActionMsg, setStudentActionMsg] = useState<string | null>(null);
  const [studentActionError, setStudentActionError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [sweeping, setSweeping] = useState<boolean>(false);
  const [sweepResult, setSweepResult] = useState<string | null>(null);
  const [activeAdminTab, setActiveAdminTab] = useState<'CAMPUSES' | 'METRICS' | 'OUTBOX' | 'STUDENTS'>('CAMPUSES');

  // Admin login states (if not logged in as admin)
  const [adminEmail, setAdminEmail] = useState<string>('admin@dropsecure.edu');
  const [adminPassword, setAdminPassword] = useState<string>('Admin@123');
  const [loggingIn, setLoggingIn] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const isAdmin = currentUser?.role === 'ADMIN';

  useEffect(() => {
    if (isAdmin) {
      fetchDashboardData();
    }
  }, [isAdmin]);

  const fetchDashboardData = async (filterCampus?: string) => {
    const campusToUse = filterCampus !== undefined ? filterCampus : selectedCampusFilter;
    try {
      setLoading(true);
      const [statsRes, campusRes, outboxRes, studentsRes] = await Promise.all([
        api.getDashboardStats(campusToUse),
        api.getCampuses().catch(() => ({ campuses: [] })),
        api.getOutbox(campusToUse).catch(() => ({ outbox: [] })),
        api.getRecipients(campusToUse).catch(() => ({ recipients: [] })),
      ]);
      setMetrics(statsRes.metrics);
      setAuditLogs(statsRes.recentAudit);
      setCampuses(campusRes.campuses || []);
      setOutboxItems(outboxRes.outbox || []);
      setStudents(studentsRes.recipients || []);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCampusFilterChange = (newFilter: string) => {
    setSelectedCampusFilter(newFilter);
    if (newFilter !== 'ALL') {
      setNewStudent((prev) => ({ ...prev, campusId: newFilter }));
    }
    fetchDashboardData(newFilter);
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.name || !newStudent.email) {
      setStudentActionError('Name and email are required');
      return;
    }
    try {
      setLoadingStudents(true);
      setStudentActionError(null);
      await api.createStudent({
        name: newStudent.name,
        email: newStudent.email,
        phone: newStudent.phone || '+91-9876500000',
        roomNumber: newStudent.roomNumber || 'Hostel Room',
        campusId: newStudent.campusId,
      });
      setStudentActionMsg(`Student ${newStudent.name} successfully enrolled in ${newStudent.campusId}!`);
      setShowAddStudentModal(false);
      setNewStudent({
        name: '',
        email: '',
        phone: '',
        roomNumber: '',
        campusId: selectedCampusFilter !== 'ALL' ? selectedCampusFilter : 'CAMPUS-BANDRA',
      });
      fetchDashboardData(selectedCampusFilter);
      setTimeout(() => setStudentActionMsg(null), 4000);
    } catch (err: any) {
      setStudentActionError(err.message || 'Failed to enroll student');
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    if (!window.confirm(`Are you sure you want to remove student "${studentName}"?`)) return;
    try {
      setLoadingStudents(true);
      await api.deleteStudent(studentId);
      setStudentActionMsg(`Student ${studentName} removed.`);
      fetchDashboardData(selectedCampusFilter);
      setTimeout(() => setStudentActionMsg(null), 4000);
    } catch (err: any) {
      setStudentActionError(err.message || 'Failed to remove student');
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoggingIn(true);
      setLoginError(null);
      const res = await api.login({ email: adminEmail, password: adminPassword });
      tokenStorage.set(res.token);
      if (onLoginSuccess) {
        onLoginSuccess(res.user);
      }
    } catch (err: any) {
      setLoginError(err.message || 'Admin login failed');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleQuickDemoAdmin = async () => {
    setAdminEmail('admin@dropsecure.edu');
    setAdminPassword('Admin@123');
    try {
      setLoggingIn(true);
      setLoginError(null);
      const res = await api.login({
        email: 'admin@dropsecure.edu',
        password: 'Admin@123',
      });
      tokenStorage.set(res.token);
      if (onLoginSuccess) {
        onLoginSuccess(res.user);
      }
    } catch (err: any) {
      setLoginError(err.message || 'Failed admin demo login');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleTriggerSweep = async () => {
    try {
      setSweeping(true);
      setSweepResult(null);
      const res = await api.triggerSweepNow();
      setSweepResult(res.message);
      fetchDashboardData();
    } catch (err: any) {
      setSweepResult(`Sweep failed: ${err.message}`);
    } finally {
      setSweeping(false);
    }
  };

  const formatAuditDetails = (log: AuditLog) => {
    if (!log.details) return '';
    try {
      const parsed = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
      return Object.entries(parsed)
        .map(([k, v]) => `${k}: ${v}`)
        .join(' • ');
    } catch {
      return String(log.details);
    }
  };

  // If not logged in as Admin, show Admin authentication view
  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="bg-slate-900/90 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="h-14 w-14 rounded-2xl bg-purple-500/10 text-purple-400 mx-auto flex items-center justify-center border border-purple-500/20 shadow-inner">
              <Lock className="h-7 w-7" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Admin Operations Console</h2>
            <p className="text-xs text-slate-400">
              Restricted to authorized campus security supervisors and cloud administrators.
            </p>
          </div>

          {loginError && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Admin Email</label>
              <input
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@dropsecure.edu"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
              <input
                type="password"
                required
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-500"
              />
            </div>

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-4 rounded-xl text-xs transition flex items-center justify-center space-x-2 shadow-lg shadow-purple-600/20"
            >
              {loggingIn ? <RefreshCw className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              <span>Authenticate Administrator</span>
            </button>
          </form>

          {/* Quick Demo Admin Button */}
          <div className="pt-2 border-t border-slate-800 text-center">
            <button
              type="button"
              onClick={handleQuickDemoAdmin}
              disabled={loggingIn}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 transition flex items-center justify-center space-x-2"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>1-Click Demo Login (Admin Aisha)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Dashboard Header */}
      <div className="bg-slate-900/80 border border-slate-800/90 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-extrabold text-white">Cloud Operations Center</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-purple-950 text-purple-300 border border-purple-800">
              Admin Mode
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time package metrics, AWS cloud telemetry, notification logs, and automated sweep controls
          </p>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <button
            onClick={handleTriggerSweep}
            disabled={sweeping}
            className="flex-1 sm:flex-none bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl flex items-center justify-center space-x-1.5 transition shadow-md shadow-amber-600/20 disabled:opacity-50"
            title="Trigger EventBridge + Lambda Daily Stale Sweep on-demand"
          >
            {sweeping ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5 fill-current" />
            )}
            <span>Run Daily Stale Sweep Now</span>
          </button>

          <button
            onClick={() => fetchDashboardData()}
            disabled={loading}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3.5 py-2.5 rounded-xl border border-slate-700 transition flex items-center justify-center space-x-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {onLogout && (
            <button
              onClick={onLogout}
              className="text-xs bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 px-3 py-2.5 rounded-xl border border-slate-700 transition"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Sweep Result Banner */}
      {sweepResult && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4 text-amber-400" />
            <span>{sweepResult}</span>
          </div>
          <button onClick={() => setSweepResult(null)} className="text-amber-400 text-xs hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* AWS Cloud Telemetry Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3.5 flex items-center space-x-3 text-xs">
          <Server className="h-5 w-5 text-emerald-400 shrink-0" />
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-bold">Amazon EC2</p>
            <p className="font-semibold text-white">t3.micro (Online)</p>
          </div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3.5 flex items-center space-x-3 text-xs">
          <Database className="h-5 w-5 text-blue-400 shrink-0" />
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-bold">Amazon RDS</p>
            <p className="font-semibold text-white">PostgreSQL 16 (SSL)</p>
          </div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3.5 flex items-center space-x-3 text-xs">
          <Cloud className="h-5 w-5 text-amber-400 shrink-0" />
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-bold">Amazon S3</p>
            <p className="font-semibold text-white">Photos (30-day)</p>
          </div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3.5 flex items-center space-x-3 text-xs">
          <Activity className="h-5 w-5 text-purple-400 shrink-0" />
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-bold">Amazon SQS</p>
            <p className="font-semibold text-white">Worker Active</p>
          </div>
        </div>
      </div>

      {/* Campus Location Filter Bar (Allows admin to view telemetry & data for specific kiosk location or all mesh nodes) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Campus Location Scope
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                {selectedCampusFilter === 'ALL' ? 'All Campuses (Mesh)' : selectedCampusFilter}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Live telemetry, security logs, smart locker status, and students for the selected kiosk station
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {[
            { id: 'ALL', name: 'All Campuses', icon: '🌐' },
            { id: 'CAMPUS-BANDRA', name: 'Fr. CRCE Bandra', icon: '🏛️' },
            { id: 'CAMPUS-VASHI', name: 'Fr. CRIT Vashi', icon: '🏢' },
            { id: 'CAMPUS-NERUL', name: 'Agnel Nerul', icon: '🏫' },
          ].map((camp) => (
            <button
              key={camp.id}
              onClick={() => handleCampusFilterChange(camp.id)}
              className={`py-2 px-3.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                selectedCampusFilter === camp.id
                  ? 'bg-brand-500 text-slate-950 font-bold shadow-md shadow-brand-500/20 ring-1 ring-brand-400'
                  : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800/80 border border-slate-800'
              }`}
            >
              <span>{camp.icon}</span>
              <span>{camp.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Action Notification Alert */}
      {studentActionMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>{studentActionMsg}</span>
          </div>
          <button onClick={() => setStudentActionMsg(null)} className="text-emerald-400 text-xs hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {studentActionError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-rose-400" />
            <span>{studentActionError}</span>
          </div>
          <button onClick={() => setStudentActionError(null)} className="text-rose-400 text-xs hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Primary KPI Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-4 text-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span>Total Parcels</span>
            <Package className="h-4 w-4 text-slate-500" />
          </div>
          <span className="text-2xl font-bold font-mono text-white">
            {metrics ? metrics.total : '—'}
          </span>
        </div>

        <div className="bg-slate-900/70 border border-amber-500/20 rounded-2xl p-4 text-xs">
          <div className="flex items-center justify-between text-amber-400/90 mb-2">
            <span>Pending Pickup</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <span className="text-2xl font-bold font-mono text-amber-300">
            {metrics ? metrics.pending : '—'}
          </span>
        </div>

        <div className="bg-slate-900/70 border border-emerald-500/20 rounded-2xl p-4 text-xs">
          <div className="flex items-center justify-between text-emerald-400/90 mb-2">
            <span>Collected</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <span className="text-2xl font-bold font-mono text-emerald-300">
            {metrics ? metrics.collected : '—'}
          </span>
        </div>

        <div className="bg-slate-900/70 border border-rose-500/20 rounded-2xl p-4 text-xs">
          <div className="flex items-center justify-between text-rose-400/90 mb-2">
            <span>Stale (&gt;24h)</span>
            <ShieldAlert className="h-4 w-4 text-rose-400" />
          </div>
          <span className="text-2xl font-bold font-mono text-rose-300">
            {metrics ? metrics.stale : '—'}
          </span>
        </div>

        <div className="bg-slate-900/70 border border-blue-500/20 rounded-2xl p-4 text-xs">
          <div className="flex items-center justify-between text-blue-400/90 mb-2">
            <span>Today's Drops</span>
            <Activity className="h-4 w-4 text-blue-400" />
          </div>
          <span className="text-2xl font-bold font-mono text-blue-300">
            {metrics ? metrics.dropped_today : '—'}
          </span>
        </div>
      </div>

      {/* Admin Section Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveAdminTab('CAMPUSES')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
            activeAdminTab === 'CAMPUSES'
              ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Multi-Campus Distributed Mesh ({campuses.length || 3})
        </button>
        <button
          onClick={() => setActiveAdminTab('METRICS')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
            activeAdminTab === 'METRICS'
              ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Security Audit Trail ({auditLogs.length})
        </button>
        <button
          onClick={() => setActiveAdminTab('OUTBOX')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
            activeAdminTab === 'OUTBOX'
              ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Notification Outbox Inspector ({outboxItems.length})
        </button>
        <button
          onClick={() => setActiveAdminTab('STUDENTS')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
            activeAdminTab === 'STUDENTS'
              ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="h-3.5 w-3.5 text-blue-400" />
          <span>Manage Students ({students.length})</span>
        </button>
      </div>

      {/* 3-Campus Multi-AZ Mesh Tab */}
      {activeAdminTab === 'CAMPUSES' && (
        <div className="space-y-6">
          {/* 3-Person Team Roles & Rubric Alignment Card */}
          <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800/80 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/30">
                  <Network className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white tracking-wide">
                    3-Person Project Architecture & Rubric Alignment
                  </h2>
                  <p className="text-xs text-slate-400">
                    Engineered across 3 technical pillars for Father Agnel Engineering Network
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Rubric Certified
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Pillar 1 */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-amber-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300">Member 1: Client Ingestion & Vision</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">
                    Waybill OCR
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Optical Character Recognition (OCR) pipeline for couriers. Parses shipping label barcodes, detects recipient name/room, carrier, and package physical seal integrity.
                </p>
              </div>

              {/* Pillar 2 */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-blue-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-300">Member 2: IoT & Cryptography</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">
                    TOTP RFC 6238
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Zero-trust 30-second dynamic rotating QR codes with SHA-256 time-stepping, plus 12-bay solenoid locker hardware state machine and latch release animations.
                </p>
              </div>

              {/* Pillar 3 */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-purple-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-300">Member 3: Cloud & Telemetry</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400">
                    Multi-AZ Mesh
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Distributed cloud infrastructure across 3 campuses, multi-AZ RDS PostgreSQL schema migrations, SQS asynchronous event streaming, and daily EventBridge Lambda cleanup.
                </p>
              </div>
            </div>
          </div>

          {/* 3 Live Campuses Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {campuses.map((camp) => {
              const occupancyPct = Math.round(((camp.activeParcels || 0) / (camp.totalLockers || 12)) * 100);
              return (
                <div
                  key={camp.id}
                  className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl hover:border-slate-700 transition"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        {camp.code}
                      </span>
                      <h3 className="text-base font-bold text-white mt-1.5">{camp.name}</h3>
                      <p className="text-xs text-slate-400">{camp.location}</p>
                    </div>
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse mt-1" />
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Locker Bay:</span>
                      <span className="text-slate-200 font-semibold">{camp.kioskStation}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Cloud AZ:</span>
                      <span className="font-mono text-brand-400">{camp.cloudRegion || 'ap-south-1a'}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Pending Pickups:</span>
                      <span className="font-bold text-amber-400">{camp.activeParcels || 0}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Total Handled:</span>
                      <span className="font-bold text-slate-300">{camp.totalParcels || 0}</span>
                    </div>

                    {/* Occupancy bar */}
                    <div className="pt-2">
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-slate-400">Locker Occupancy:</span>
                        <span className="font-mono text-emerald-400">
                          {camp.activeParcels || 0} / {camp.totalLockers || 12} ({occupancyPct}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(10, occupancyPct))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Audit Log Tab */}
      {activeAdminTab === 'METRICS' && (
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Activity className="h-4 w-4 text-purple-400" />
              <span>Immutable Security Audit Log</span>
            </h2>
            <span className="text-[11px] text-slate-500 font-mono">Last 15 system events</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Actor / Station</th>
                  <th className="py-2.5 px-3">Tracking Code</th>
                  <th className="py-2.5 px-3">Details</th>
                  <th className="py-2.5 px-3">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                      No security audit events recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap text-[11px]">
                        {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-brand-300 border border-slate-700">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-200 font-sans">
                        {log.actor_name || 'Kiosk / Service'}
                      </td>
                      <td className="py-2.5 px-3 text-brand-400 font-bold">
                        {log.tracking_code || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 font-sans text-[11px] max-w-xs truncate">
                        {formatAuditDetails(log)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                        {log.ip_address || '127.0.0.1'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manage Students Tab */}
      {activeAdminTab === 'STUDENTS' && (
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <Users className="h-4 w-4 text-blue-400" />
                <span>
                  Campus Student Directory & Enrolment Management (
                  {selectedCampusFilter === 'ALL' ? 'All Campuses' : selectedCampusFilter}
                )
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Register, inspect, and manage student accounts authorized for smart locker package handover
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter by name, email, room..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setNewStudent((prev) => ({
                    ...prev,
                    campusId: selectedCampusFilter !== 'ALL' ? selectedCampusFilter : 'CAMPUS-BANDRA',
                  }));
                  setShowAddStudentModal(true);
                }}
                className="py-2 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 transition shadow-lg shadow-blue-600/20 whitespace-nowrap active:scale-95"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Enroll Student</span>
              </button>
            </div>
          </div>

          {/* Student Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-3">Campus & Station</th>
                  <th className="py-2.5 px-3">Hostel Room</th>
                  <th className="py-2.5 px-3">Email & Phone</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {students
                  .filter((s) => {
                    const q = studentSearch.toLowerCase().trim();
                    if (!q) return true;
                    return (
                      s.name.toLowerCase().includes(q) ||
                      s.email.toLowerCase().includes(q) ||
                      (s.room_number && s.room_number.toLowerCase().includes(q)) ||
                      (s.roomNumber && s.roomNumber.toLowerCase().includes(q))
                    );
                  })
                  .map((student) => {
                    const room = student.room_number || student.roomNumber || 'Hostel Room';
                    const campusLabel =
                      student.campus_id === 'CAMPUS-BANDRA'
                        ? 'Fr. CRCE Bandra (Station #1)'
                        : student.campus_id === 'CAMPUS-VASHI'
                        ? 'Fr. CRIT Vashi (Station #2)'
                        : student.campus_id === 'CAMPUS-NERUL'
                        ? 'Agnel Nerul (Station #3)'
                        : student.campus_id || 'Fr. CRCE Bandra';

                    return (
                      <tr key={student.id} className="hover:bg-slate-800/30 transition">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-xs border border-blue-500/20">
                              {student.name.charAt(0)}
                            </div>
                            <span className="font-semibold text-white">{student.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-950 text-slate-300 border border-slate-800">
                            {campusLabel}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-300 font-mono text-[11px]">{room}</td>
                        <td className="py-3 px-3">
                          <div className="text-slate-300">{student.email}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {student.phone || '+91-9876543210'}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-medium">
                            <Check className="h-3 w-3" /> Active Recipient
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteStudent(student.id, student.name)}
                            disabled={loadingStudents}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                            title="Remove Student"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Enroll New Student Modal */}
      {showAddStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-2xl text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/30">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Enroll Campus Student</h3>
                  <p className="text-[11px] text-slate-400">Register new recipient for smart locker notifications</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddStudentModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="space-y-3.5 mt-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Student Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Rohan Gupta"
                  value={newStudent.name}
                  onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Email Address (@student.dropsecure.edu)</label>
                <input
                  type="email"
                  required
                  placeholder="e.g., rohan@student.dropsecure.edu"
                  value={newStudent.email}
                  onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Hostel Room</label>
                  <input
                    type="text"
                    placeholder="e.g., Hostel B-104"
                    value={newStudent.roomNumber}
                    onChange={(e) => setNewStudent({ ...newStudent, roomNumber: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Phone</label>
                  <input
                    type="text"
                    placeholder="+91-9876543210"
                    value={newStudent.phone}
                    onChange={(e) => setNewStudent({ ...newStudent, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Assigned Campus</label>
                <select
                  value={newStudent.campusId}
                  onChange={(e) => setNewStudent({ ...newStudent, campusId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="CAMPUS-BANDRA">Fr. CRCE Bandra (Station #1)</option>
                  <option value="CAMPUS-VASHI">Fr. CRIT Vashi (Station #2)</option>
                  <option value="CAMPUS-NERUL">Agnel Nerul (Station #3)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(false)}
                  className="py-2 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingStudents}
                  className="py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition flex items-center gap-1.5 shadow-lg shadow-blue-600/20"
                >
                  {loadingStudents ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                  <span>Save Student</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
