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
  Moon
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
      id: 'settings' as NavigationPage,
      label: 'Settings',
      icon: Settings,
    },
  ];

  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md sticky top-0 z-40 transition-colors duration-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand */}
          <div 
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-3 cursor-pointer group shrink-0 select-none"
          >
            <div className="h-9 w-9 rounded-lg bg-teal-600 dark:bg-teal-500 text-white flex items-center justify-center shadow-sm group-hover:bg-teal-700 transition">
              <Zap className="h-5 w-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                  HealTest
                </span>
                <span className="px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wider rounded bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300 border border-teal-200 dark:border-teal-500/30">
                  E2E
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 -mt-0.5 hidden sm:block">
                Intent-Based Self-Healing Engine
              </p>
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
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-teal-600 text-white font-semibold shadow-xs dark:bg-teal-500'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span className={`text-xs px-1.5 py-0.2 rounded-full font-mono ${
                      item.badgeColor || (isActive ? 'bg-teal-700 text-white dark:bg-teal-600' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300')
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
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono ${
                allowLocalhost
                  ? 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-300'
                  : 'bg-slate-100 border-slate-200 text-slate-500 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400'
              }`}
              title={allowLocalhost ? 'Localhost execution authorized' : 'Localhost blocked'}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>DevMode: {allowLocalhost ? 'ON' : 'OFF'}</span>
            </div>

            {/* Backend Health Status Button */}
            <button
              onClick={onRefreshHealth}
              title="Click to check backend server health"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition ${
                backendHealth.online
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-500/20'
                  : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-500/20'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${backendHealth.online ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`} />
              <span className="font-mono">{backendHealth.online ? 'API Online' : 'API Offline'}</span>
              <RefreshCw className="h-3 w-3 text-slate-400 dark:text-slate-400 ml-0.5" />
            </button>

            {/* Light / Dark Mode Toggle Button */}
            <button
              type="button"
              onClick={onToggleTheme}
              title={theme === 'light' ? 'Switch to Dark theme' : 'Switch to Light theme'}
              className="flex items-center justify-center p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-teal-600 dark:hover:text-teal-400 transition cursor-pointer shadow-xs"
              aria-label="Toggle color theme"
            >
              {theme === 'light' ? (
                <Sun className="h-4 w-4 text-amber-500" />
              ) : (
                <Moon className="h-4 w-4 text-teal-400" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="flex md:hidden items-center gap-1 overflow-x-auto pb-2.5 pt-1 border-t border-slate-100 dark:border-slate-900">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs whitespace-nowrap transition ${
                  isActive
                    ? 'bg-teal-600 text-white font-semibold dark:bg-teal-500'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
