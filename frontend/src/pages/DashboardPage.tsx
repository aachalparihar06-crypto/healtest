import React from 'react';
import { 
  Play, 
  CheckCircle2, 
  XCircle, 
  Wrench, 
  Activity, 
  Clock, 
  ArrowRight, 
  Server, 
  Sparkles,
  Layers
} from 'lucide-react';
import type { TestRun } from '../types';
import type { BackendHealthResponse } from '../services/api';
import type { NavigationPage } from '../components/Navbar';

interface DashboardPageProps {
  runs: TestRun[];
  backendHealth: BackendHealthResponse;
  onNavigate: (page: NavigationPage) => void;
  onSelectRun: (runId: string) => void;
  onQuickRunPreset: (preset: { url: string; instruction: string; criteria: string }) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  runs,
  backendHealth,
  onNavigate,
  onSelectRun,
  onQuickRunPreset,
}) => {
  // Real metrics calculated directly from actual backend runs
  const totalRuns = runs.length;
  const passedRuns = runs.filter((r) => r.status === 'PASSED').length;
  const healedRuns = runs.filter((r) => r.status === 'HEALED').length;
  const failedRuns = runs.filter((r) => r.status === 'FAILED').length;
  const successRate = totalRuns > 0 ? Math.round(((passedRuns + healedRuns) / totalRuns) * 100) : 0;
  const avgDurationMs = totalRuns > 0 
    ? Math.round(runs.reduce((acc, r) => acc + (r.executionTimeMs || 0), 0) / totalRuns) 
    : 0;

  const recentRuns = runs.slice(0, 5);

  const getStatusBadge = (run: TestRun) => {
    switch (run.status) {
      case 'HEALED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <Wrench className="h-3 w-3" />
            HEALED
          </span>
        );
      case 'PASSED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="h-3 w-3" />
            PASSED
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-rose-500/15 text-rose-300 border border-rose-500/30">
            <XCircle className="h-3 w-3" />
            FAILED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700">
            {run.status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner & Quick Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900/90 to-blue-950/40 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-blue-500/20 text-blue-400">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
              Autonomous Intent Testing Platform
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-1">
            System Dashboard
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            HealTest replaces brittle selectors with accessible intent locators, live DOM mutation analysis, and automated failure repair.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('new-test')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/25 transition"
          >
            <Play className="h-4 w-4 fill-current" />
            <span>New Test Run</span>
          </button>
        </div>
      </div>

      {/* Real Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Total Runs</div>
          <div className="text-2xl font-bold text-white mt-1.5">{totalRuns}</div>
          <div className="text-[11px] text-slate-500 mt-1">Real executions</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Passed
          </div>
          <div className="text-2xl font-bold text-emerald-300 mt-1.5">{passedRuns}</div>
          <div className="text-[11px] text-slate-500 mt-1">Clean workflows</div>
        </div>

        <div className="bg-slate-900/80 border border-amber-500/20 rounded-xl p-4 shadow-sm">
          <div className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1">
            <Wrench className="h-3 w-3" />
            Self-Healed
          </div>
          <div className="text-2xl font-bold text-amber-300 mt-1.5">{healedRuns}</div>
          <div className="text-[11px] text-amber-400/70 mt-1">Mutations repaired</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="text-[11px] font-medium text-rose-400 uppercase tracking-wider flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Failed
          </div>
          <div className="text-2xl font-bold text-rose-300 mt-1.5">{failedRuns}</div>
          <div className="text-[11px] text-slate-500 mt-1">Unrecoverable / strictly verified</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm col-span-2 md:col-span-1">
          <div className="text-[11px] font-medium text-blue-400 uppercase tracking-wider flex items-center gap-1">
            <Activity className="h-3 w-3" />
            Success Rate
          </div>
          <div className="text-2xl font-bold text-blue-300 mt-1.5">
            {totalRuns > 0 ? `${successRate}%` : '—'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Avg {(avgDurationMs / 1000).toFixed(1)}s runtime</div>
        </div>
      </div>

      {/* System Health & Engine Architecture Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <Server className="h-5 w-5 text-blue-400" />
              <h2 className="text-sm font-bold text-white">Execution Engine & Backend Status</h2>
            </div>
            <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-mono font-medium ${
              backendHealth.online 
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' 
                : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
            }`}>
              <span className={`h-2 w-2 rounded-full ${backendHealth.online ? 'bg-emerald-400' : 'bg-rose-400'}`} />
              {backendHealth.online ? 'Backend Connected' : 'Backend Disconnected'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5 text-xs">
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
              <div className="text-slate-400 font-medium">API Endpoint</div>
              <div className="font-mono text-slate-200">http://localhost:3001/api</div>
              <div className="text-[11px] text-slate-500">Express REST & Static Screenshots</div>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
              <div className="text-slate-400 font-medium">Playwright Runner</div>
              <div className="font-mono text-emerald-300">Headless Chromium</div>
              <div className="text-[11px] text-slate-500">Accessible Locator Engine</div>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
              <div className="text-slate-400 font-medium">Self-Healing Strategist</div>
              <div className="font-mono text-amber-300">Live DOM Mutation Evaluator</div>
              <div className="text-[11px] text-slate-500">Multi-heuristic candidate scoring</div>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
              <div className="text-slate-400 font-medium">Safety Guardrails</div>
              <div className="font-mono text-blue-300">Active (SSRF & Private Network Guard)</div>
              <div className="text-[11px] text-slate-500">Target isolation enforced</div>
            </div>
          </div>
        </div>

        {/* Quick Presets Column */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
              <Layers className="h-4 w-4 text-amber-400" />
              Verified Scenarios
            </h2>
            <p className="text-xs text-slate-400 mt-2">
              Launch pre-configured verification tests against the local test fixture:
            </p>

            <div className="space-y-2.5 mt-4">
              <button
                onClick={() => onQuickRunPreset({
                  url: 'http://localhost:3001/fixture?mutated=true',
                  instruction: 'Navigate to fixture, enter "Testing Mutation" into "Feedback Input", click "Submit Feedback", verify "Feedback Submitted Successfully" is visible',
                  criteria: 'Feedback Submitted Successfully',
                })}
                className="w-full text-left p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-amber-500/30 hover:border-amber-500/60 transition group"
              >
                <div className="flex items-center justify-between text-xs font-semibold text-amber-300 group-hover:text-amber-200">
                  <span>⚡ Live Mutation (Submit → Send)</span>
                  <ArrowRight className="h-3 w-3 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition" />
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Triggers DOM healing & recovery</div>
              </button>

              <button
                onClick={() => onQuickRunPreset({
                  url: 'http://localhost:3001/fixture',
                  instruction: 'Navigate to fixture, enter "Baseline Demo" into "Feedback Input", click "Submit Feedback", verify "Feedback Submitted Successfully" is visible',
                  criteria: 'Feedback Submitted Successfully',
                })}
                className="w-full text-left p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 transition group"
              >
                <div className="flex items-center justify-between text-xs font-semibold text-emerald-300 group-hover:text-emerald-200">
                  <span>✅ Baseline Fixture Pass</span>
                  <ArrowRight className="h-3 w-3 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition" />
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Clean end-to-end execution</div>
              </button>

              <button
                onClick={() => onQuickRunPreset({
                  url: 'http://localhost:3001/fixture?broken=true',
                  instruction: 'Navigate to fixture, enter "Fail Test" into "Feedback Input", click "Submit Feedback", verify "Feedback Submitted Successfully" is visible',
                  criteria: 'Feedback Submitted Successfully',
                })}
                className="w-full text-left p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 transition group"
              >
                <div className="flex items-center justify-between text-xs font-semibold text-rose-300 group-hover:text-rose-200">
                  <span>❌ Strict Failure (No Fake Pass)</span>
                  <ArrowRight className="h-3 w-3 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition" />
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Missing target rejects fake repair</div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Test Runs Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-400" />
              Recent Execution History
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Live Playwright executions recorded from this testing session
            </p>
          </div>
          {totalRuns > 0 && (
            <button
              onClick={() => onNavigate('history')}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 transition"
            >
              <span>View All ({totalRuns})</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>

        {recentRuns.length === 0 ? (
          <div className="text-center py-12 bg-slate-950/40 rounded-xl border border-dashed border-slate-800/80">
            <Activity className="h-8 w-8 text-slate-600 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-300">No Tests Executed Yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Execute your first natural-language test or run one of the verified fixture presets above.
            </p>
            <button
              onClick={() => onNavigate('new-test')}
              className="mt-4 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition"
            >
              Create New Test
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                  <th className="pb-3 font-semibold">STATUS</th>
                  <th className="pb-3 font-semibold">TARGET URL</th>
                  <th className="pb-3 font-semibold">ERROR CLASSIFICATION</th>
                  <th className="pb-3 font-semibold">STEPS</th>
                  <th className="pb-3 font-semibold">DURATION</th>
                  <th className="pb-3 font-semibold">EXECUTED</th>
                  <th className="pb-3 font-semibold text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentRuns.map((run) => (
                  <tr key={run.id} className="hover:bg-slate-800/30 transition group">
                    <td className="py-3.5 pr-3">{getStatusBadge(run)}</td>
                    <td className="py-3.5 pr-3 max-w-[200px]">
                      <div className="font-mono text-slate-200 truncate font-semibold">
                        {run.intent.targetUrl}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">
                        {run.intent.naturalLanguageInstruction}
                      </div>
                    </td>
                    <td className="py-3.5 pr-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono ${
                        run.errorClassification?.category === 'NONE'
                          ? 'bg-slate-800 text-slate-400'
                          : run.errorClassification?.category === 'UI_HEALED'
                          ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                      }`}>
                        {run.errorClassification?.label || 'Clean Pass'}
                      </span>
                    </td>
                    <td className="py-3.5 pr-3 font-mono text-slate-300">
                      {run.summary.passedSteps + run.summary.healedSteps} / {run.summary.totalSteps}
                    </td>
                    <td className="py-3.5 pr-3 font-mono text-slate-400">
                      {(run.executionTimeMs / 1000).toFixed(2)}s
                    </td>
                    <td className="py-3.5 pr-3 font-mono text-slate-500 text-[11px]">
                      {new Date(run.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3.5 text-right">
                      <button
                        onClick={() => {
                          onSelectRun(run.id);
                          onNavigate('history');
                        }}
                        className="text-xs text-blue-400 hover:text-white font-medium px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 transition"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
