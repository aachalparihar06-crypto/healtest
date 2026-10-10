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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-blue-500/20 text-blue-400">
                <Terminal className="h-4 w-4" />
              </span>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Logs & Visual Screenshots
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Detailed browser execution logs, accessibility tree traces, and HTTP-served Playwright screenshots.
            </p>
          </div>

          {/* Sub-tab Pill Switcher */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setSubTab('logs')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                subTab === 'logs'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal className="h-3.5 w-3.5" />
              <span>Console Logs</span>
              {activeRun && (
                <span className="text-[10px] bg-slate-950/80 px-1.5 py-0.5 rounded-full font-mono">
                  {activeRun.logs.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setSubTab('screenshots')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                subTab === 'screenshots'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Camera className="h-3.5 w-3.5" />
              <span>Screenshots</span>
              {activeRun && (
                <span className="text-[10px] bg-slate-950/80 px-1.5 py-0.5 rounded-full font-mono">
                  {activeRun.screenshots.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Run Selector Bar */}
        {runs.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400 font-semibold mr-1">Select Execution Run:</span>
            {runs.map((r) => {
              const isSelected = activeRun?.id === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => onSelectRun(r.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-mono transition ${
                    isSelected
                      ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-bold shadow-md shadow-blue-500/10'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <span>{r.id.split('-').slice(0, 2).join('-')}</span>
                  <span className={`text-[10px] uppercase font-bold ml-1 ${
                    r.status === 'HEALED' ? 'text-amber-400' : r.status === 'PASSED' ? 'text-emerald-400' : 'text-rose-400'
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
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center shadow-xl space-y-3">
          <Terminal className="h-10 w-10 text-slate-600 mx-auto" />
          <h2 className="text-base font-bold text-white">No Execution Telemetry Available</h2>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Execute a test on the New Test page to inspect real Playwright runtime logs and visual page captures.
          </p>
          <button
            onClick={() => onNavigate('new-test')}
            className="mt-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition"
          >
            Create New Test
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Active Run Context Bar */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
            <div className="text-slate-400 truncate">
              Target: <span className="text-blue-400">{activeRun.intent.targetUrl}</span>
            </div>
            <div className="flex items-center gap-3 text-slate-500">
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
