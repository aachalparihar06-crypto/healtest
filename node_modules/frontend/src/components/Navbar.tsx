import React from 'react';
import { 
  Zap, 
  RefreshCw, 
  LayoutDashboard, 
  Play, 
  History, 
  Wrench, 
  Terminal, 
  Settings, 
  ShieldCheck
} from 'lucide-react';
import type { BackendHealthResponse } from '../services/api';

export type NavigationPage = 
  | 'dashboard' 
  | 'new-test' 
  | 'history' 
  | 'healing' 
  | 'logs-screenshots' 
  | 'settings';

interface NavbarProps {
  currentPage: NavigationPage;
  onNavigate: (page: NavigationPage) => void;
  backendHealth: BackendHealthResponse;
  onRefreshHealth: () => void;
  allowLocalhost: boolean;
  totalRunsCount: number;
  healedRunsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPage,
  onNavigate,
  backendHealth,
  onRefreshHealth,
  allowLocalhost,
  totalRunsCount,
  healedRunsCount,
}) => {
  const navItems = [
    {
      id: 'dashboard' as NavigationPage,
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'new-test' as NavigationPage,
      label: 'New Test',
      icon: Play,
    },
    {
      id: 'history' as NavigationPage,
      label: 'Test Runs',
      icon: History,
      badge: totalRunsCount > 0 ? totalRunsCount : undefined,
    },
    {
      id: 'healing' as NavigationPage,
      label: 'Self-Healing',
      icon: Wrench,
      badge: healedRunsCount > 0 ? `${healedRunsCount}` : undefined,
      badgeColor: 'bg-amber-400 text-slate-950 font-bold',
    },
    {
      id: 'logs-screenshots' as NavigationPage,
      label: 'Logs & Screenshots',
      icon: Terminal,
    },
    {
      id: 'settings' as NavigationPage,
      label: 'Settings',
      icon: Settings,
    },
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand */}
          <div 
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-3 cursor-pointer group shrink-0"
          >
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-amber-500 p-0.5 flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition">
              <div className="h-full w-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Zap className="h-4.5 w-4.5 text-blue-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  HealTest
                </span>
                <span className="px-1.5 py-0.2 text-[10px] font-semibold uppercase tracking-wider rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  E2E
                </span>
              </div>
              <p className="text-[10px] text-slate-400 -mt-0.5 hidden sm:block">Intent Self-Healing Platform</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      item.badgeColor || (isActive ? 'bg-blue-700 text-white' : 'bg-slate-800 text-slate-300')
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Info & Status Badges */}
          <div className="flex items-center gap-2.5">
            {/* Dev Mode Badge */}
            <div
              className={`hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-mono ${
                allowLocalhost
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
              title={allowLocalhost ? 'Localhost & RFC1918 private targets authorized' : 'Localhost blocked by strict safety policy'}
            >
              <ShieldCheck className="h-3 w-3" />
              <span>DevMode: {allowLocalhost ? 'ON' : 'OFF'}</span>
            </div>

            {/* Backend Health Status Button */}
            <button
              onClick={onRefreshHealth}
              title="Click to re-ping backend server"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition ${
                backendHealth.online
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300 hover:bg-rose-500/20'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${backendHealth.online ? 'bg-emerald-400' : 'bg-rose-400 animate-pulse'}`} />
              <span className="font-mono">{backendHealth.online ? 'API Online' : 'API Offline'}</span>
              <RefreshCw className="h-3 w-3 text-slate-400 hover:text-slate-200 ml-0.5" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="flex md:hidden items-center gap-1 overflow-x-auto pb-2.5 pt-1 border-t border-slate-900">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] whitespace-nowrap transition ${
                  isActive
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Icon className="h-3 w-3" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
