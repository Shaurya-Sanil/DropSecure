import React from 'react';
import { cn } from '../ui/utils';
import { CONFIG } from '../ui/utils';
import { ArrowLeft, User as UserIcon, LogOut } from 'lucide-react';
import { User } from '../../types';
import { navigate } from '../../router';

interface AppShellProps {
  children: React.ReactNode;
  portalName: string;
  portalDescription?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  currentUser?: User | null;
  onLogout?: () => void;
  primaryAction?: React.ReactNode;
  sidebar?: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  portalName,
  portalDescription,
  breadcrumbs = [],
  currentUser,
  onLogout,
  primaryAction,
  sidebar,
}) => {
  return (
    <div className="min-h-screen bg-canvas-base text-fg flex flex-col font-sans">
      {/* Top Application Bar */}
      <header className="h-14 border-b border-border bg-canvas-surface px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center space-x-2 text-fg hover:text-white transition focus-visible:outline-2 focus-visible:outline-accent rounded"
            title="Return to Portal Chooser"
          >
            <div className="h-6 w-6 rounded bg-accent flex items-center justify-center font-bold text-xs text-white">
              D
            </div>
            <span className="font-semibold text-sm tracking-tight">DropSecure</span>
          </button>

          <span className="text-border">/</span>

          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-xs">
            <span className="text-fg-muted font-medium">{portalName}</span>
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                <span className="text-border">/</span>
                {crumb.href ? (
                  <button
                    onClick={() => navigate(crumb.href!)}
                    className="text-fg-muted hover:text-fg transition"
                  >
                    {crumb.label}
                  </button>
                ) : (
                  <span className="text-fg font-medium">{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        </div>

        {/* Right Header Navigation */}
        <div className="flex items-center space-x-3 text-xs">
          {currentUser ? (
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 text-fg-muted">
                <UserIcon className="h-3.5 w-3.5" />
                <span className="text-fg font-medium">{currentUser.name}</span>
                <span className="text-border">•</span>
                <span className="font-mono text-[11px]">{currentUser.role}</span>
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="p-1.5 rounded hover:bg-canvas-raised text-fg-muted hover:text-fg transition"
                  title="Sign out"
                  aria-label="Sign out"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => navigate('/')}
              className="text-xs text-fg-muted hover:text-fg flex items-center space-x-1.5 py-1 px-2 rounded hover:bg-canvas-raised transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>All Portals</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Layout Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Optional Sidebar */}
        {sidebar && (
          <aside className="w-60 border-r border-border bg-canvas-surface p-3 shrink-0 hidden md:block">
            {sidebar}
          </aside>
        )}

        {/* Main Content Viewport */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* Consistent Page Header */}
          <div className="border-b border-border bg-canvas-surface/60 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-semibold text-fg tracking-tight">{portalName}</h1>
              {portalDescription && (
                <p className="text-xs text-fg-muted mt-0.5">{portalDescription}</p>
              )}
            </div>
            {primaryAction && <div className="shrink-0">{primaryAction}</div>}
          </div>

          {/* Page Body */}
          <main className="flex-1 p-6">
            <div className="max-w-6xl mx-auto">{children}</div>
          </main>

          {/* Quiet, Professional Engineering Footer */}
          <footer className="border-t border-border bg-canvas-surface px-6 py-3 text-xs text-fg-subtle flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
            <div className="flex items-center space-x-2">
              <span>DropSecure Campus Logistics</span>
              <span>•</span>
              <span className="font-mono text-[11px]">Build {CONFIG.BUILD_SHA}</span>
            </div>
            <div className="flex items-center space-x-3 text-[11px]">
              <span>Retention: {CONFIG.EXPIRY_WINDOW_HOURS}h</span>
              <span>•</span>
              <a
                href="https://github.com/Shaurya-Sanil/DropSecure"
                target="_blank"
                rel="noreferrer"
                className="text-fg-muted hover:text-fg transition"
              >
                GitHub Repository
              </a>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
};
