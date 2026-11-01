import React from 'react';
import { ShieldCheck, Truck, CheckCircle2, Package, LayoutDashboard, ArrowRight, Shield, Zap, Lock } from 'lucide-react';
import { navigate } from '../router';

export const CampusGateway: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-brand-500 selection:text-slate-950">
      {/* Top Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-brand-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <ShieldCheck className="h-6 w-6 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-white">
                Drop<span className="text-brand-400">Secure</span>
              </span>
              <p className="text-[11px] text-slate-400">Cloud-Managed Campus Handover & OTP System</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>AWS ap-south-1 Node Active</span>
          </div>
        </div>
      </header>

      {/* Main Hero & Portal Selector */}
      <main className="max-w-6xl mx-auto px-4 py-12 w-full flex-1 flex flex-col justify-center">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-medium">
            <Shield className="h-3.5 w-3.5 text-brand-400" />
            <span>Zero-Trust Campus Logistics Hub</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">
            Select Your Dedicated Portal
          </h1>
          <p className="text-slate-400 text-sm sm:text-base">
            Each role operates within its own dedicated application across our 3-Campus Father Agnel Network.
          </p>
        </div>

        {/* 3-Campus Interconnected Network Bar */}
        <div className="mb-8 p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Multi-Campus Distributed Network Status
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2.5 py-0.5 rounded-full border border-slate-800">
              AWS ap-south-1 Multi-AZ Mesh
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Campus 1: Bandra */}
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-emerald-500/40 transition">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-white">1. Fr. CRCE Bandra</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  ONLINE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Main Engineering Campus</p>
              <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>Station #1 • 12 Lockers</span>
                <span className="text-emerald-400">AZ: ap-south-1a</span>
              </div>
            </div>

            {/* Campus 2: Vashi */}
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-emerald-500/40 transition">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-white">2. Fr. CRIT Vashi</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  ONLINE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Agnel Technical Complex</p>
              <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>Station #2 • 12 Lockers</span>
                <span className="text-blue-400">AZ: ap-south-1b</span>
              </div>
            </div>

            {/* Campus 3: Nerul */}
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-emerald-500/40 transition">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-white">3. Agnel Nerul</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  ONLINE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Polytechnic & Research Hub</p>
              <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>Station #3 • 12 Lockers</span>
                <span className="text-emerald-400">AZ: ap-south-1a</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Dedicated Portals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          {/* 1. Courier Drop-Off App */}
          <div
            onClick={() => navigate('/courier')}
            className="group relative bg-slate-900/70 hover:bg-slate-900 border border-slate-800/80 hover:border-amber-500/50 rounded-3xl p-6 sm:p-8 transition-all duration-300 cursor-pointer shadow-xl hover:shadow-2xl hover:shadow-amber-500/10 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-14 w-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-105 transition">
                  <Truck className="h-7 w-7" />
                </div>
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  No Login Required
                </span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white group-hover:text-amber-300 transition">
                  Delivery Partner App
                </h2>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  For couriers (Amazon, BlueDart, Delhivery, Swiggy, Flipkart, DTDC, etc.) to quickly select a student recipient, take photo proof, and deposit packages.
                </p>
              </div>
            </div>

            <div className="pt-6 flex items-center text-xs font-bold text-amber-400 group-hover:text-amber-300 space-x-1.5">
              <span>Launch Driver App</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition" />
            </div>
          </div>

          {/* 2. Collection Kiosk Terminal */}
          <div
            onClick={() => navigate('/kiosk')}
            className="group relative bg-slate-900/70 hover:bg-slate-900 border border-slate-800/80 hover:border-emerald-500/50 rounded-3xl p-6 sm:p-8 transition-all duration-300 cursor-pointer shadow-xl hover:shadow-2xl hover:shadow-emerald-500/10 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  Touch Station
                </span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white group-hover:text-emerald-300 transition">
                  Collection Kiosk Terminal
                </h2>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Automated walk-up touch kiosk at the campus collection center. Enter your Tracking ID and 6-digit OTP to claim parcels immediately.
                </p>
              </div>
            </div>

            <div className="pt-6 flex items-center text-xs font-bold text-emerald-400 group-hover:text-emerald-300 space-x-1.5">
              <span>Open Collection Kiosk</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition" />
            </div>
          </div>

          {/* 3. Student Portal */}
          <div
            onClick={() => navigate('/student')}
            className="group relative bg-slate-900/70 hover:bg-slate-900 border border-slate-800/80 hover:border-blue-500/50 rounded-3xl p-6 sm:p-8 transition-all duration-300 cursor-pointer shadow-xl hover:shadow-2xl hover:shadow-blue-500/10 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-14 w-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center group-hover:scale-105 transition">
                  <Package className="h-7 w-7" />
                </div>
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
                  Student Login
                </span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white group-hover:text-blue-300 transition">
                  Student Package Portal
                </h2>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Dedicated portal for students to track incoming packages, view photo proof, monitor 48h expiration countdowns, and view pickup status.
                </p>
              </div>
            </div>

            <div className="pt-6 flex items-center text-xs font-bold text-blue-400 group-hover:text-blue-300 space-x-1.5">
              <span>Enter Student Portal</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition" />
            </div>
          </div>

          {/* 4. Admin Operations Console */}
          <div
            onClick={() => navigate('/admin')}
            className="group relative bg-slate-900/70 hover:bg-slate-900 border border-slate-800/80 hover:border-purple-500/50 rounded-3xl p-6 sm:p-8 transition-all duration-300 cursor-pointer shadow-xl hover:shadow-2xl hover:shadow-purple-500/10 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-14 w-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center group-hover:scale-105 transition">
                  <LayoutDashboard className="h-7 w-7" />
                </div>
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
                  Admin Sign-In
                </span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white group-hover:text-purple-300 transition">
                  Administration Console
                </h2>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Operations dashboard with CloudWatch metrics, SNS dev outbox, system audit logs, and on-demand stale package sweep trigger.
                </p>
              </div>
            </div>

            <div className="pt-6 flex items-center text-xs font-bold text-purple-400 group-hover:text-purple-300 space-x-1.5">
              <span>Open Admin Console</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition" />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>DropSecure • Cloud-Managed Campus Package Delivery System</span>
          <div className="flex items-center space-x-3 text-[11px] font-mono">
            <span>AWS Region: ap-south-1</span>
            <span>•</span>
            <span className="text-brand-400">Zero-Trust OTP Verification</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
