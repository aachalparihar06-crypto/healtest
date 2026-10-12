import React, { useState } from 'react';
import { 
  History, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Wrench, 
  Clock, 
  Trash2, 
  ArrowRight, 
  AlertTriangle
} from 'lucide-react';
import type { TestRun } from '../types';
import type { NavigationPage } from '../components/Navbar';
import { StepsInspector } from '../components/StepsInspector';

interface HistoryPageProps {
  runs: TestRun[];
  selectedRunId: string | null;
  onSelectRun: (id: string) => void;
  onClearHistory: () => Promise<void>;
  onNavigate: (page: NavigationPage) => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({
  runs,
  selectedRunId,
  onSelectRun,
  onClearHistory,
  onNavigate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'HEALED' | 'PASSED' | 'FAILED'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const selectedRun = runs.find((r) => r.id === selectedRunId) || (runs.length > 0 ? runs[0] : null);

  const filteredRuns = runs.filter((run) => {
    if (statusFilter !== 'ALL' && run.status !== statusFilter) return false;
    if (categoryFilter !== 'ALL' && run.errorClassification?.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchUrl = run.intent.targetUrl.toLowerCase().includes(q);
      const matchInst = run.intent.naturalLanguageInstruction.toLowerCase().includes(q);
      const matchId = run.id.toLowerCase().includes(q);
      if (!matchUrl && !matchInst && !matchId) return false;
    }
    return true;
  });

  const getStatusBadge = (status: TestRun['status']) => {
    switch (status) {
      case 'HEALED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
            <Wrench className="h-3 w-3" />
            HEALED
          </span>
        );
      case 'PASSED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
            <CheckCircle2 className="h-3 w-3" />
            PASSED
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60">
            <XCircle className="h-3 w-3" />
            FAILED
          </span>
        );
      case 'ERROR':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800/60">
            <XCircle className="h-3 w-3" />
            ERROR
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header (Requirement 4: Ultra-Thin Gradient Border) */}
      <div className="card-gradient-border p-6 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-[#4C1A57] dark:text-[#BAB0D4] border border-purple-200/60 dark:border-purple-800/60">
                <History className="h-5 w-5" />
              </span>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Execution History & Telemetry
              </h1>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Review detailed execution traces, step performance, and error classifications from real test runs.
            </p>
          </div>

          {runs.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to clear all test run history?')) {
                  onClearHistory();
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-white bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900/40 transition shrink-0 self-start sm:self-auto cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear History</span>
            </button>
          )}
        </div>
      </div>

      {runs.length === 0 ? (
        <div className="card-gradient-border p-12 text-center transition-colors">
          <History className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">No Test Runs in History</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Execute a test on the New Test page to see real execution telemetry, step breakdowns, and self-healing reports here.
          </p>
          <button
            onClick={() => onNavigate('new-test')}
            className="mt-5 px-5 py-2.5 rounded-lg btn-primary-gradient text-white text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            Create New Test
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Filter & Runs List (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Filter & Search Card (Requirement 4: Ultra-Thin Gradient Border) */}
            <div className="card-gradient-border p-4 space-y-3 transition-colors">
              {/* Search */}
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter by URL or instruction..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 pl-8 pr-3 py-1.5 rounded-lg text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#76518A] font-mono"
                />
              </div>

              {/* Status Pills */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium">
                {(['ALL', 'HEALED', 'PASSED', 'FAILED'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setStatusFilter(tab)}
                    className={`flex-1 py-1 rounded-md transition ${
                      statusFilter === tab
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Error Category Dropdown */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Classification:</span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md px-2 py-1 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-[#76518A]"
                >
                  <option value="ALL">All Categories</option>
                  <option value="NONE">Clean Pass (No Errors)</option>
                  <option value="UI_HEALED">UI Healed (Recovered)</option>
                  <option value="UI_ELEMENT_MISSING">UI Element Missing</option>
                  <option value="UI_ASSERTION_FAILED">UI Assertion Mismatch</option>
                  <option value="APP_NETWORK_ERROR">Application Network Error</option>
                  <option value="SYSTEM_SAFETY_BLOCK">System Safety Block</option>
                  <option value="SYSTEM_ERROR">System / Engine Error</option>
                </select>
              </div>
            </div>

            {/* Run Items List */}
            <div className="space-y-2.5 max-h-[650px] overflow-y-auto pr-1">
              {filteredRuns.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center text-xs text-slate-500 dark:text-slate-400 shadow-xs">
                  No runs matched your filter criteria.
                </div>
              ) : (
                filteredRuns.map((run) => {
                  const isSelected = selectedRun?.id === run.id;
                  return (
                    <div
                      key={run.id}
                      onClick={() => onSelectRun(run.id)}
                      className={`p-4 rounded-xl cursor-pointer transition-all ${
                        isSelected
                          ? 'border border-[#76518A] bg-purple-50/40 dark:bg-purple-950/20 ring-1 ring-[#76518A]/40 shadow-xs'
                          : 'card-gradient-border hover:shadow-xs'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {run.intent.targetUrl}
                        </span>
                        {getStatusBadge(run.status)}
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mb-3 leading-relaxed">
                        {run.intent.naturalLanguageInstruction}
                      </p>

                      {/* Error Classification Pill */}
                      {run.errorClassification && (
                        <div className="mb-2.5">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono ${
                            run.errorClassification.category === 'NONE'
                              ? 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                              : run.errorClassification.category === 'UI_HEALED'
                              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50'
                              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50'
                          }`}>
                            {run.errorClassification.label}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-mono pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-slate-400" />
                          {(run.executionTimeMs / 1000).toFixed(2)}s
                        </span>
                        <div className="flex items-center gap-3">
                          {run.healingRecords.length > 0 && (
                            <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                              <Wrench className="h-3 w-3" />
                              {run.healingRecords.length} Healed
                            </span>
                          )}
                          <span>
                            {new Date(run.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Selected Run Details (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {selectedRun ? (
              <>
                {/* Run Header Card (Requirement 4: Ultra-Thin Gradient Border) */}
                <div className="card-gradient-border p-6 space-y-4 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80 dark:border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(selectedRun.status)}
                        <h2 className="text-base font-bold text-slate-900 dark:text-white font-mono">
                          {selectedRun.id}
                        </h2>
                      </div>
                      <div className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-1 truncate max-w-lg">
                        Target: <span className="text-[#4C1A57] dark:text-[#BAB0D4] font-semibold">{selectedRun.intent.targetUrl}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {selectedRun.healingRecords.length > 0 && (
                        <button
                          onClick={() => {
                            onSelectRun(selectedRun.id);
                            onNavigate('healing');
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 text-xs font-medium transition"
                        >
                          <Wrench className="h-3.5 w-3.5" />
                          <span>Self-Healing Inspector</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          onSelectRun(selectedRun.id);
                          onNavigate('logs-screenshots');
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium transition border border-slate-200 dark:border-slate-700"
                      >
                        <span>Logs & Screenshots</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Error classification banner */}
                  {selectedRun.errorClassification && (
                    <div className={`p-4 rounded-lg border text-xs ${
                      selectedRun.errorClassification.category === 'NONE'
                        ? 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                        : selectedRun.errorClassification.category === 'UI_HEALED'
                        ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/50 text-amber-900 dark:text-amber-200'
                        : 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/50 text-rose-900 dark:text-rose-200'
                    }`}>
                      <div className="font-semibold mb-1 flex items-center gap-1.5">
                        {selectedRun.errorClassification.category === 'UI_HEALED' ? (
                          <Wrench className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                        ) : selectedRun.errorClassification.category === 'NONE' ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <AlertTriangle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                        )}
                        <span>Evidence Classification: {selectedRun.errorClassification.label}</span>
                      </div>
                      <p className="text-xs opacity-90 leading-relaxed font-sans">
                        {selectedRun.errorClassification.details}
                      </p>
                    </div>
                  )}

                  {/* Intent instruction text */}
                  <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                      Natural-Language Instruction:
                    </span>
                    <p className="text-slate-800 dark:text-slate-300 leading-relaxed font-sans">
                      {selectedRun.intent.naturalLanguageInstruction}
                    </p>
                  </div>
                </div>

                {/* Steps Breakdown */}
                <StepsInspector steps={selectedRun.steps} />
              </>
            ) : (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center text-slate-500 dark:text-slate-400 text-xs shadow-xs">
                Select a run from the list to view its step-by-step breakdown.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
