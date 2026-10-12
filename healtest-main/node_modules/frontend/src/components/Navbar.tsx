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
  ShieldCheck,
  Sun,
  Moon,
  BarChart2
} from 'lucide-react';
import type { BackendHealthResponse } from '../services/api';

export type NavigationPage = 
  | 'dashboard' 
  | 'new-test' 
  | 'history' 
  | 'healing' 
  | 'logs-screenshots' 
  | 'analytics'
  | 'settings';

interface NavbarProps {
  currentPage: NavigationPage;
  onNavigate: (page: NavigationPage) => void;
  backendHealth: BackendHealthResponse;
  onRefreshHealth: () => void;
  allowLocalhost: boolean;
  totalRunsCount: number;
  healedRunsCount: number;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPage,
  onNavigate,
  backendHealth,
  onRefreshHealth,
  allowLocalhost,
  totalRunsCount,
  healedRunsCount,
  theme,
  onToggleTheme,
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
      badgeColor: 'bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300 font-bold',
    },
    {
      id: 'logs-screenshots' as NavigationPage,
      label: 'Logs & Screenshots',
      icon: Terminal,
    },
    {
      id: 'analytics' as NavigationPage,
      label: 'Analytics',
      icon: BarChart2,
    },
    {
      id: 'settings' as NavigationPage,
      label: 'Settings',
      icon: Settings,
    },
  ];

  return (
    <header className="navbar-animated-gradient border-b border-white/20 sticky top-0 z-40 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand */}
          <div 
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-3 cursor-pointer group shrink-0 select-none"
          >
            <div className="h-9 w-9 rounded-lg bg-white/20 text-white flex items-center justify-center shadow-xs border border-white/30 backdrop-blur-xs group-hover:bg-white/30 transition">
              <Zap className="h-5 w-5 fill-current text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-bold tracking-tight text-white drop-shadow-xs">
                  HealTest
                </span>
                <span className="px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wider rounded bg-white/20 text-white border border-white/30 backdrop-blur-xs">
                  E2E
                </span>
              </div>
              <p className="text-xs text-white/85 -mt-0.5 hidden sm:block font-medium">
                Intent-Based Self-Healing Engine
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white/25 text-white font-semibold shadow-xs border border-white/35 backdrop-blur-xs'
                      : 'text-white/85 hover:text-white hover:bg-white/15'
                  }`}
                >
                  <Icon className="h-4 w-4 text-white" />
                  <span className="text-white">{item.label}</span>
                  {item.badge !== undefined && (
                    <span className={`text-xs px-1.5 py-0.2 rounded-full font-mono ${
                      item.badgeColor 
                        ? 'bg-amber-400 text-slate-950 font-bold shadow-xs' 
                        : (isActive ? 'bg-white/35 text-white border border-white/40' : 'bg-white/20 text-white border border-white/20')
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Info, Status Badges & Theme Toggle */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Dev Mode Badge */}
            <div
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono backdrop-blur-xs shadow-xs text-white ${
                allowLocalhost
                  ? 'bg-white/20 border-white/35'
                  : 'bg-white/10 border-white/20 text-white/70'
              }`}
              title={allowLocalhost ? 'Localhost execution authorized' : 'Localhost blocked'}
            >
              <ShieldCheck className="h-3.5 w-3.5 text-white" />
              <span>DevMode: {allowLocalhost ? 'ON' : 'OFF'}</span>
            </div>

            {/* Backend Health Status Button */}
            <button
              onClick={onRefreshHealth}
              title="Click to check backend server health"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/25 bg-white/15 hover:bg-white/25 text-white text-xs font-medium transition backdrop-blur-xs shadow-xs cursor-pointer"
            >
              <span className={`h-2 w-2 rounded-full ${backendHealth.online ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]' : 'bg-rose-400 animate-pulse'}`} />
              <span className="font-mono text-white">{backendHealth.online ? 'API Online' : 'API Offline'}</span>
              <RefreshCw className="h-3 w-3 text-white/80 ml-0.5" />
            </button>

            {/* Light / Dark Mode Toggle Button */}
            <button
              type="button"
              onClick={onToggleTheme}
              title={theme === 'light' ? 'Switch to Dark theme' : 'Switch to Light theme'}
              className="flex items-center justify-center p-2 rounded-lg border border-white/25 bg-white/15 hover:bg-white/25 text-white transition cursor-pointer shadow-xs backdrop-blur-xs"
              aria-label="Toggle color theme"
            >
              {theme === 'light' ? (
                <Sun className="h-4 w-4 text-amber-300" />
              ) : (
                <Moon className="h-4 w-4 text-[#BAB0D4]" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="flex md:hidden items-center gap-1.5 overflow-x-auto pb-2.5 pt-1 border-t border-white/15">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs whitespace-nowrap transition cursor-pointer ${
                  isActive
                    ? 'bg-white/25 text-white font-semibold border border-white/35 backdrop-blur-xs'
                    : 'text-white/85 hover:text-white hover:bg-white/15'
                }`}
              >
                <Icon className="h-3.5 w-3.5 text-white" />
                <span className="text-white">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
