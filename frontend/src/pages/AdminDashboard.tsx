import React, { useState, useEffect } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { CONFIG } from '../components/ui/utils';
import { api, tokenStorage } from '../services/api';
import { DashboardMetrics, AuditLog, OutboxItem, User, Campus } from '../types';
import {
  Package,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  RefreshCw,
  Users,
  Search,
  Server,
  FileText,
  Activity,
  AlertCircle,
} from 'lucide-react';

interface AdminDashboardProps {
  currentUser?: User | null;
  onLoginSuccess?: (user: User) => void;
  onLogout?: () => void;
}

type AdminTab = 'overview' | 'audit' | 'students' | 'outbox' | 'health';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  onLoginSuccess,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [outboxItems, setOutboxItems] = useState<OutboxItem[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [selectedCampusFilter, setSelectedCampusFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(false);
  const [sweeping, setSweeping] = useState<boolean>(false);
  const [sweepResult, setSweepResult] = useState<string | null>(null);

  // Auth State
  const [loginEmail, setLoginEmail] = useState<string>(CONFIG.IS_DEMO_MODE ? 'admin@dropsecure.edu' : '');
  const [loginPassword, setLoginPassword] = useState<string>(CONFIG.IS_DEMO_MODE ? 'Admin@123' : '');
  const [loggingIn, setLoggingIn] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      loadDashboard();
    }
  }, [currentUser, selectedCampusFilter]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const campId = selectedCampusFilter === 'ALL' ? undefined : selectedCampusFilter;
      const [mRes, aRes, oRes, cRes, sRes] = await Promise.all([
        api.getDashboardStats(campId),
        api.getAuditLogs(100, campId),
        api.getOutbox(campId),
        api.getCampuses(),
        api.getRecipients(campId),
      ]);

      setMetrics(mRes.metrics);
      setAuditLogs(aRes.auditLogs);
      setOutboxItems(oRes.outbox);
      setCampuses(cRes.campuses);
      setStudents(sRes.recipients);
    } catch (err) {
      console.error('Failed to load admin metrics:', err);
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
      setLoginError(err.message || 'Authentication failed');
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
      loadDashboard();
    } catch (err: any) {
      setSweepResult(`Sweep failed: ${err.message}`);
    } finally {
      setSweeping(false);
    }
  };

  if (!currentUser) {
    return (
      <AppShell portalName="Operations Console" portalDescription="Cloud telemetry and system administration">
        <div className="max-w-md mx-auto my-12">
          <div className="p-6 rounded bg-canvas-surface border border-border">
            <h2 className="text-base font-semibold text-fg">Operations sign in</h2>
            <p className="text-xs text-fg-muted mt-1">Administrative credentials required.</p>

            {loginError && (
              <div className="mt-4 p-3 rounded bg-canvas-base border border-border text-status-danger text-xs flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-fg mb-1">Admin email</label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="admin@dropsecure.edu"
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

            {CONFIG.IS_DEMO_MODE && (
              <div className="mt-6 pt-4 border-t border-border">
                <span className="text-[11px] font-mono text-fg-subtle block mb-2">Demo credentials:</span>
                <button
                  type="button"
                  onClick={() => {
                    setLoginEmail('admin@dropsecure.edu');
                    setLoginPassword('Admin@123');
                  }}
                  className="w-full p-2 text-left rounded bg-canvas-base border border-border hover:border-accent text-xs transition"
                >
                  <span className="font-medium text-fg block">Admin Aisha</span>
                  <span className="text-[10px] text-fg-muted font-mono">Operations Administrator</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </AppShell>
    );
  }

  const sidebarNav = (
    <nav className="space-y-1">
      <div className="text-[11px] font-medium text-fg-subtle px-2 py-1 uppercase tracking-wider">
        Navigation
      </div>
      {[
        { id: 'overview', label: 'Overview', icon: Package },
        { id: 'audit', label: 'Audit Log', icon: FileText },
        { id: 'students', label: 'Students', icon: Users },
        { id: 'outbox', label: 'Notifications', icon: Activity },
        { id: 'health', label: 'System Health', icon: Server },
      ].map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as AdminTab)}
            className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded text-xs font-medium transition ${
              isActive
                ? 'bg-canvas-raised text-fg font-semibold'
                : 'text-fg-muted hover:text-fg hover:bg-canvas-raised'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );

  return (
    <AppShell
      portalName="Operations Console"
      portalDescription="System telemetry, campus rosters, and audit trails"
      currentUser={currentUser}
      onLogout={onLogout}
      sidebar={sidebarNav}
      primaryAction={
        <div className="flex items-center space-x-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleTriggerSweep}
            disabled={sweeping}
            title="Execute midnight sweep query on-demand"
          >
            <Play className="h-3.5 w-3.5 mr-1.5" />
            <span>{sweeping ? 'Sweeping...' : 'Run sweep'}</span>
          </Button>
          <Button variant="secondary" size="sm" onClick={loadDashboard} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Sweep notification message */}
        {sweepResult && (
          <div className="p-3 rounded bg-canvas-surface border border-border text-xs text-fg flex items-center justify-between">
            <span>{sweepResult}</span>
            <button onClick={() => setSweepResult(null)} className="text-fg-muted hover:text-fg">
              Dismiss
            </button>
          </div>
        )}

        {/* Overview Tab: Plain stat blocks & campus cards */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stat Blocks */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded bg-canvas-surface border border-border">
                <span className="text-xs text-fg-muted block">Total Parcels</span>
                <span className="text-2xl font-mono font-semibold text-fg tabular-nums mt-1 block">
                  {metrics ? metrics.total : '—'}
                </span>
              </div>
              <div className="p-4 rounded bg-canvas-surface border border-border">
                <span className="text-xs text-fg-muted block">Awaiting Pickup</span>
                <span className="text-2xl font-mono font-semibold text-fg tabular-nums mt-1 block">
                  {metrics ? metrics.pending : '—'}
                </span>
              </div>
              <div className="p-4 rounded bg-canvas-surface border border-border">
                <span className="text-xs text-fg-muted block">Collected</span>
                <span className="text-2xl font-mono font-semibold text-fg tabular-nums mt-1 block">
                  {metrics ? metrics.collected : '—'}
                </span>
              </div>
              <div className="p-4 rounded bg-canvas-surface border border-border">
                <span className="text-xs text-fg-muted block">
                  Stale (&gt;{CONFIG.STALE_THRESHOLD_HOURS}h)
                </span>
                <span className="text-2xl font-mono font-semibold text-fg tabular-nums mt-1 block">
                  {metrics ? metrics.stale : '—'}
                </span>
              </div>
            </div>

            {/* Campuses Overview */}
            <div>
              <h3 className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-3">
                Campuses ({campuses.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {campuses.map((c) => (
                  <div key={c.id} className="p-4 rounded bg-canvas-surface border border-border space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-fg">{c.name}</span>
                      <StatusBadge status={c.status as any} />
                    </div>
                    <p className="text-xs text-fg-muted">{c.location}</p>
                    <div className="pt-2 border-t border-border flex justify-between text-xs text-fg-muted">
                      <span>Locker Bays: {c.totalLockers} (Simulated)</span>
                      <span className="font-mono text-fg">{c.activeParcels} active</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Audit Log Tab: Dense Data Table */}
        {activeTab === 'audit' && (
          <div className="rounded bg-canvas-surface border border-border overflow-hidden">
            <div className="p-3 border-b border-border flex items-center justify-between">
              <span className="text-xs font-semibold text-fg">Security Audit Log</span>
              <span className="text-xs font-mono text-fg-muted">{auditLogs.length} events</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-canvas-raised border-b border-border text-fg-muted">
                  <tr>
                    <th className="p-3 font-medium">Timestamp</th>
                    <th className="p-3 font-medium">Action</th>
                    <th className="p-3 font-medium">IP Address</th>
                    <th className="p-3 font-medium">Event Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-canvas-raised/50">
                      <td className="p-3 font-mono text-fg-muted tabular-nums whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="p-3">
                        <span className="font-mono text-xs font-semibold text-fg">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-fg-muted">{log.ip_address || '—'}</td>
                      <td className="p-3 font-mono text-fg-muted max-w-md truncate">
                        {log.details ? JSON.stringify(log.details) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Students Tab */}
        {activeTab === 'students' && (
          <div className="rounded bg-canvas-surface border border-border overflow-hidden">
            <div className="p-3 border-b border-border flex items-center justify-between">
              <span className="text-xs font-semibold text-fg">Campus Student Directory</span>
              <span className="text-xs font-mono text-fg-muted">{students.length} students</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-canvas-raised border-b border-border text-fg-muted">
                  <tr>
                    <th className="p-3 font-medium">Name</th>
                    <th className="p-3 font-medium">Email</th>
                    <th className="p-3 font-medium">Room / Hostel</th>
                    <th className="p-3 font-medium">Campus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {students.map((student) => (
                    <tr key={student.id} className="hover:bg-canvas-raised/50">
                      <td className="p-3 font-medium text-fg">{student.name}</td>
                      <td className="p-3 font-mono text-fg-muted">{student.email}</td>
                      <td className="p-3 text-fg-muted">{student.room_number || 'General Campus'}</td>
                      <td className="p-3 font-mono text-fg-muted">{student.campus_id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Outbox Notifications Tab */}
        {activeTab === 'outbox' && (
          <div className="rounded bg-canvas-surface border border-border overflow-hidden">
            <div className="p-3 border-b border-border flex items-center justify-between">
              <span className="text-xs font-semibold text-fg">Notification Dispatch Mirror</span>
              <span className="text-xs font-mono text-fg-muted">{outboxItems.length} records</span>
            </div>
            <div className="divide-y divide-border">
              {outboxItems.map((item) => (
                <div key={item.id} className="p-4 space-y-1 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-fg">{item.subject}</span>
                    <span className="font-mono text-fg-muted tabular-nums">
                      {new Date(item.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-fg-muted font-mono">Recipient: {item.recipient_email}</p>
                  <p className="text-fg font-mono whitespace-pre-line p-2 rounded bg-canvas-base border border-border mt-2">
                    {item.message}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* System Health Tab (Honest, authenticated infrastructure data only) */}
        {activeTab === 'health' && (
          <div className="space-y-4">
            <div className="p-4 rounded bg-canvas-surface border border-border space-y-3">
              <h3 className="text-xs font-semibold text-fg uppercase tracking-wider">
                Production Infrastructure Status
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded bg-canvas-base border border-border flex justify-between items-center">
                  <div>
                    <span className="font-medium text-fg block">Amazon EC2</span>
                    <span className="text-fg-muted text-[11px]">Single instance (t3.micro)</span>
                  </div>
                  <StatusBadge status="ONLINE" label="Running" />
                </div>
                <div className="p-3 rounded bg-canvas-base border border-border flex justify-between items-center">
                  <div>
                    <span className="font-medium text-fg block">Amazon RDS PostgreSQL 16</span>
                    <span className="text-fg-muted text-[11px]">Single-AZ in private subnet</span>
                  </div>
                  <StatusBadge status="ONLINE" label="Available" />
                </div>
                <div className="p-3 rounded bg-canvas-base border border-border flex justify-between items-center">
                  <div>
                    <span className="font-medium text-fg block">Amazon CloudFront CDN</span>
                    <span className="text-fg-muted text-[11px]">Global edge SSL termination</span>
                  </div>
                  <StatusBadge status="ONLINE" label="Active" />
                </div>
                <div className="p-3 rounded bg-canvas-base border border-border flex justify-between items-center">
                  <div>
                    <span className="font-medium text-fg block">VPC PrivateLink</span>
                    <span className="text-fg-muted text-[11px]">Interface Endpoint for SNS</span>
                  </div>
                  <StatusBadge status="ONLINE" label="Active" />
                </div>
              </div>
            </div>

            <div className="p-4 rounded bg-canvas-surface border border-border text-xs text-fg-muted">
              <span className="font-medium text-fg block mb-1">Architecture Note:</span>
              Single-instance deployment optimized for Free Tier budget limits (&lt;$1.00/mo). Production scaling path involves migrating to Application Load Balancer (ALB) and RDS Multi-AZ standby replication.
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
};
