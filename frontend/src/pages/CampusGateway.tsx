import React from 'react';
import { Package, Truck, CheckCircle2, LayoutDashboard, ArrowRight } from 'lucide-react';
import { navigate } from '../router';
import { CONFIG } from '../components/ui/utils';

export const CampusGateway: React.FC = () => {
  const portals = [
    {
      id: 'courier',
      title: 'Courier Drop-off',
      description: 'Deposit parcels, capture photo proof, and log waybills.',
      roleNote: 'No login required',
      path: '/courier',
      icon: Truck,
    },
    {
      id: 'kiosk',
      title: 'Collection Kiosk',
      description: 'Automated walk-up terminal. Enter OTP to release simulated locker door.',
      roleNote: 'Touch terminal',
      path: '/kiosk',
      icon: CheckCircle2,
    },
    {
      id: 'student',
      title: 'Student Portal',
      description: 'Track incoming packages, monitor 48h expiration window, and access OTP.',
      roleNote: 'Student authentication',
      path: '/student',
      icon: Package,
    },
    {
      id: 'admin',
      title: 'Operations Console',
      description: 'System health, student directories, audit logs, and on-demand sweep.',
      roleNote: 'Admin authentication',
      path: '/admin',
      icon: LayoutDashboard,
    },
  ];

  return (
    <div className="min-h-screen bg-canvas-base text-fg flex flex-col justify-between font-sans">
      {/* Top Application Bar */}
      <header className="h-14 border-b border-border bg-canvas-surface px-6 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="h-6 w-6 rounded bg-accent flex items-center justify-center font-bold text-xs text-white">
            D
          </div>
          <span className="font-semibold text-sm tracking-tight">DropSecure</span>
          <span className="text-border">/</span>
          <span className="text-xs text-fg-muted">Campus Logistics System</span>
        </div>
        <div className="flex items-center space-x-2 text-xs text-fg-muted font-mono">
          <span>{CONFIG.APP_VERSION}</span>
        </div>
      </header>

      {/* Main Portal Chooser */}
      <main className="max-w-4xl mx-auto px-6 py-12 w-full flex-1 flex flex-col justify-center">
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-fg tracking-tight">Select Application Portal</h1>
          <p className="text-xs text-fg-muted mt-1">
            Choose your assigned role to access the corresponding interface.
          </p>
        </div>

        {/* Dense, Clean Portal Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {portals.map((portal) => {
            const Icon = portal.icon;
            return (
              <button
                key={portal.id}
                onClick={() => navigate(portal.path)}
                className="text-left p-5 rounded bg-canvas-surface border border-border hover:border-accent hover:bg-canvas-raised transition-colors group flex flex-col justify-between h-44 focus-visible:outline-2 focus-visible:outline-accent"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 rounded bg-canvas-raised border border-border text-fg group-hover:text-accent transition-colors">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-[11px] font-mono text-fg-muted px-2 py-0.5 rounded bg-canvas-base border border-border">
                      {portal.roleNote}
                    </span>
                  </div>
                  <h2 className="text-sm font-semibold text-fg group-hover:text-accent transition-colors">
                    {portal.title}
                  </h2>
                  <p className="text-xs text-fg-muted mt-1 leading-relaxed">
                    {portal.description}
                  </p>
                </div>

                <div className="flex items-center text-xs text-accent font-medium space-x-1 pt-2">
                  <span>Enter portal</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </button>
            );
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-canvas-surface px-6 py-4 text-xs text-fg-subtle flex flex-col sm:flex-row items-center justify-between gap-2">
        <div>DropSecure • Campus parcel handover and verification platform</div>
        <div className="flex items-center space-x-3 text-[11px]">
          <span>Build {CONFIG.BUILD_SHA}</span>
          <span>•</span>
          <a
            href="https://github.com/Shaurya-Sanil/DropSecure"
            target="_blank"
            rel="noreferrer"
            className="text-fg-muted hover:text-fg"
          >
            Source Code
          </a>
        </div>
      </footer>
    </div>
  );
};
