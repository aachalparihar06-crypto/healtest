import React, { useState } from 'react';
import { 
  Terminal, 
  Camera
} from 'lucide-react';
import type { TestRun } from '../types';
import type { NavigationPage } from '../components/Navbar';
import { LogsViewer } from '../components/LogsViewer';
import { ScreenshotGallery } from '../components/ScreenshotGallery';

interface LogsScreenshotsPageProps {
  runs: TestRun[];
  selectedRunId: string | null;
  onSelectRun: (id: string) => void;
  onNavigate: (page: NavigationPage) => void;
}

export const LogsScreenshotsPage: React.FC<LogsScreenshotsPageProps> = ({
  runs,
  selectedRunId,
  onSelectRun,
  onNavigate,
}) => {
  const [subTab, setSubTab] = useState<'logs' | 'screenshots'>('logs');

  const activeRun = runs.find((r) => r.id === selectedRunId) || (runs.length > 0 ? runs[0] : null);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800/60">
                <Terminal className="h-5 w-5" />
              </span>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Logs & Visual Screenshots
              </h1>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Detailed browser execution logs, accessibility tree traces, and HTTP-served Playwright screenshots.
            </p>
          </div>

          {/* Sub-tab Pill Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setSubTab('logs')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                subTab === 'logs'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Terminal className="h-3.5 w-3.5" />
              <span>Console Logs</span>
              {activeRun && (
                <span className="text-xs bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded-full font-mono text-slate-700 dark:text-slate-300">
                  {activeRun.logs.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setSubTab('screenshots')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                subTab === 'screenshots'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Camera className="h-3.5 w-3.5" />
              <span>Screenshots</span>
              {activeRun && (
                <span className="text-xs bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded-full font-mono text-slate-700 dark:text-slate-300">
                  {activeRun.screenshots.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Run Selector Bar */}
        {runs.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-semibold mr-1">Select Execution Run:</span>
            {runs.map((r) => {
              const isSelected = activeRun?.id === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => onSelectRun(r.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono transition ${
                    isSelected
                      ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-500 text-teal-800 dark:text-teal-300 font-semibold shadow-xs ring-1 ring-teal-500/20'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span>{r.id.split('-').slice(0, 2).join('-')}</span>
                  <span className={`text-xs uppercase font-bold ml-1 ${
                    r.status === 'HEALED' ? 'text-amber-600 dark:text-amber-400' : r.status === 'PASSED' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    [{r.status}]
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {!activeRun ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center shadow-xs space-y-3 transition-colors">
          <Terminal className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">No Execution Telemetry Available</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Execute a test on the New Test page to inspect real Playwright runtime logs and visual page captures.
          </p>
          <button
            onClick={() => onNavigate('new-test')}
            className="mt-2 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition"
          >
            Create New Test
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Active Run Context Bar */}
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono shadow-xs">
            <div className="text-slate-600 dark:text-slate-400 truncate">
              Target: <span className="text-teal-700 dark:text-teal-400 font-semibold">{activeRun.intent.targetUrl}</span>
            </div>
            <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
              <span>Duration: {(activeRun.executionTimeMs / 1000).toFixed(2)}s</span>
              <span>•</span>
              <span>Executed: {new Date(activeRun.createdAt).toLocaleTimeString()}</span>
            </div>
          </div>

          {/* SubTab Body */}
          {subTab === 'logs' ? (
            <LogsViewer logs={activeRun.logs} />
          ) : (
            <ScreenshotGallery screenshots={activeRun.screenshots} steps={activeRun.steps} />
          )}
        </div>
      )}
    </div>
  );
};
