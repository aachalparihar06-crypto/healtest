import React, { useState } from 'react';
import { History, CheckCircle, XCircle, Wrench, Clock, Trash2, RotateCcw, Filter } from 'lucide-react';
import type { TestRun } from '../types';

interface TestHistorySidebarProps {
  runs: TestRun[];
  selectedRunId: string | null;
  onSelectRun: (runId: string) => void;
  onResetSamples: () => void;
  onClearHistory: () => void;
}

export const TestHistorySidebar: React.FC<TestHistorySidebarProps> = ({
  runs,
  selectedRunId,
  onSelectRun,
  onResetSamples,
  onClearHistory,
}) => {
  const [filter, setFilter] = useState<'all' | 'HEALED' | 'PASSED' | 'FAILED'>('all');

  const filteredRuns = runs.filter((r) => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  const getStatusIcon = (status: TestRun['status']) => {
    switch (status) {
      case 'HEALED':
        return <Wrench className="h-4 w-4 text-amber-400 shrink-0" />;
      case 'PASSED':
        return <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />;
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-rose-400 shrink-0" />;
      default:
        return <Clock className="h-4 w-4 text-slate-400 shrink-0" />;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-blue-400" />
          <h3 className="text-base font-bold text-white">Execution History</h3>
        </div>
        <span className="text-xs font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800">
          {runs.length} runs
        </span>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs mb-4">
        <Filter className="h-3 w-3 text-slate-500 ml-1.5 mr-1" />
        {(['all', 'HEALED', 'PASSED', 'FAILED'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`flex-1 py-1 rounded-lg text-[11px] font-semibold transition ${
              filter === tab
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Run Items List */}
      <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[500px] pr-1">
        {filteredRuns.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">
            No test runs recorded for this filter.
          </div>
        ) : (
          filteredRuns.map((run) => {
            const isSelected = run.id === selectedRunId;
            return (
              <div
                key={run.id}
                onClick={() => onSelectRun(run.id)}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-500/10 shadow-md shadow-blue-500/10'
                    : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-950'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    {getStatusIcon(run.status)}
                    <span className="font-semibold text-xs text-slate-200 truncate font-mono">
                      {run.intent.targetUrl.replace(/^https?:\/\//, '')}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase font-mono ${
                      run.status === 'HEALED'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : run.status === 'PASSED'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {run.status}
                  </span>
                </div>

                <p className="text-xs text-slate-400 line-clamp-1 mb-2 font-sans">
                  {run.intent.naturalLanguageInstruction}
                </p>

                <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>{new Date(run.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <div className="flex items-center gap-2">
                    {run.healingRecords.length > 0 && (
                      <span className="text-amber-400 font-bold flex items-center gap-0.5">
                        <Wrench className="h-3 w-3" />
                        {run.healingRecords.length}
                      </span>
                    )}
                    <span>{(run.executionTimeMs / 1000).toFixed(1)}s</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Actions */}
      <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <button
          onClick={onResetSamples}
          className="flex items-center gap-1 hover:text-slate-200 transition"
          title="Restore reference sample test runs"
        >
          <RotateCcw className="h-3.5 w-3.5 text-blue-400" />
          <span>Reset Demos</span>
        </button>
        <button
          onClick={onClearHistory}
          className="flex items-center gap-1 hover:text-rose-400 transition"
          title="Clear all stored test history"
        >
          <Trash2 className="h-3.5 w-3.5 text-slate-500 hover:text-rose-400" />
          <span>Clear</span>
        </button>
      </div>
    </div>
  );
};
