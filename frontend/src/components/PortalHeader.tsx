import React from 'react';
import { ShieldCheck, ArrowLeft, LogOut, Truck, CheckCircle2, Package, LayoutDashboard } from 'lucide-react';
import { User } from '../types';
import { navigate } from '../router';

interface PortalHeaderProps {
  portal: 'courier' | 'kiosk' | 'student' | 'admin';
  currentUser?: User | null;
  onLogout?: () => void;
}

export const PortalHeader: React.FC<PortalHeaderProps> = ({
  portal,
  currentUser,
  onLogout,
}) => {
  const getPortalDetails = () => {
    switch (portal) {
      case 'courier':
        return {
          title: 'Courier Drop-Off',
          subtitle: 'Driver Fast Drop-Off Station • Direct Access',
          badge: 'Delivery Partner',
          badgeColor: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
          icon: <Truck className="h-5 w-5 text-amber-400" />,
        };
      case 'kiosk':
        return {
          title: 'Collection Kiosk',
          subtitle: 'Main Gate Automated Pickup Terminal',
          badge: 'Self-Service Station',
          badgeColor: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
          icon: <CheckCircle2 className="h-5 w-5 text-emerald-400" />,
        };
      case 'student':
        return {
          title: 'Student Portal',
          subtitle: 'Campus Resident Package Tracking & Pickup Status',
          badge: 'Student Services',
          badgeColor: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
          icon: <Package className="h-5 w-5 text-blue-400" />,
        };
      case 'admin':
        return {
          title: 'Admin Console',
          subtitle: 'Cloud Operations, Telemetry & Audit Logs',
          badge: 'Operations',
          badgeColor: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
          icon: <LayoutDashboard className="h-5 w-5 text-purple-400" />,
        };
    }
  };

  const details = getPortalDetails();

  return (
    <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Portal Identity */}
          <div className="flex items-center space-x-3.5">
            <div
              onClick={() => navigate('/')}
              className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-brand-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 cursor-pointer"
              title="Return to Campus Portal Gateway"
            >
              <ShieldCheck className="h-6 w-6 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span
                  onClick={() => navigate('/')}
                  className="text-lg font-bold tracking-tight text-white cursor-pointer"
                >
                  Drop<span className="text-brand-400">Secure</span>
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${details.badgeColor}`}>
                  {details.badge}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">{details.subtitle}</p>
            </div>
          </div>

          {/* Right Action: User profile / Logout or Return to Gateway */}
          <div className="flex items-center space-x-3">
            {currentUser && (portal === 'student' || portal === 'admin') ? (
              <div className="flex items-center space-x-2 pl-3 border-l border-slate-800">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-semibold text-slate-200">{currentUser.name}</div>
                  <div className="text-[10px] text-slate-400">
                    {currentUser.roomNumber ? `Room ${currentUser.roomNumber}` : currentUser.role}
                  </div>
                </div>
                {onLogout && (
                  <button
                    onClick={onLogout}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition border border-transparent hover:border-rose-500/20"
                    title="Sign Out"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                )}
              </div>
            ) : null}

            {/* Subtle Gateway Switcher button */}
            <button
              onClick={() => navigate('/')}
              className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white bg-slate-900/80 hover:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-800 transition shadow-sm"
              title="Switch to another portal"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Campus Portals</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
