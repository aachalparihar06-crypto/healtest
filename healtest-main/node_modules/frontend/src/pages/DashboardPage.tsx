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
  const avgDurationMs = totalRuns > 0 
    ? Math.round(runs.reduce((acc, r) => acc + (r.executionTimeMs || 0), 0) / totalRuns) 
    : 0;

  // Aggregate step-level metrics (All / Passed / Failed / Healed steps across ALL runs)
  const totalSteps = runs.reduce((acc, r) => acc + (r.summary?.totalSteps || 0), 0);
  const passedSteps = runs.reduce((acc, r) => acc + (r.summary?.passedSteps || 0), 0);
  const failedSteps = runs.reduce((acc, r) => acc + (r.summary?.failedSteps || 0), 0);
  const healedSteps = runs.reduce((acc, r) => acc + (r.summary?.healedSteps || 0), 0);
  const successRate = totalSteps > 0 ? Math.round(((passedSteps + healedSteps) / totalSteps) * 100) : 0;

  const recentRuns = runs.slice(0, 5);

  const getStatusBadge = (run: TestRun) => {
    switch (run.status) {
      case 'HEALED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30">
            <Wrench className="h-3.5 w-3.5" />
            HEALED
          </span>
        );
      case 'PASSED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30">
            <CheckCircle2 className="h-3.5 w-3.5" />
            PASSED
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30">
            <XCircle className="h-3.5 w-3.5" />
            FAILED
          </span>
        );
      case 'ERROR':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-orange-50 text-orange-800 border border-orange-200 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-500/30">
            <XCircle className="h-3.5 w-3.5" />
            ERROR
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
            {run.status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn">
      {/* Top Banner & Quick Action (Requirement 4: Ultra-Thin Gradient Border) */}
      <div className="card-gradient-border p-6 transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-purple-50 text-[#4C1A57] dark:bg-purple-950/40 dark:text-[#BAB0D4]">
                <Sparkles className="h-4 w-4" />
              </span>
              <span className="text-xs font-semibold text-[#76518A] dark:text-[#BAB0D4] uppercase tracking-wider">
                Autonomous Testing Platform
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-1.5">
              System Dashboard
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-xl">
              HealTest replaces brittle selectors with accessible intent locators, live DOM mutation analysis, and automated failure repair.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => onNavigate('new-test')}
              className="btn-primary-gradient flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-xs font-semibold cursor-pointer"
            >
              <Play className="h-4 w-4 fill-current text-white" />
              <span>New Test Run</span>
            </button>
          </div>
        </div>
      </div>

      {/* Real Step-Level Metrics Grid — All / Passed / Failed / Healed */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
        <div className="card-gradient-border p-4 sm:p-5 transition-colors">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">All Steps</div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1.5 font-mono">{totalSteps}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{totalRuns} run{totalRuns !== 1 ? 's' : ''} executed</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-500/20 rounded-xl p-4 sm:p-5 shadow-xs transition-colors">
          <div className="text-xs font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Passed
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-300 mt-1.5 font-mono">{passedSteps}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{passedRuns} clean run{passedRuns !== 1 ? 's' : ''}</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4 sm:p-5 shadow-xs transition-colors">
          <div className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
            <Wrench className="h-3.5 w-3.5" />
            Healed
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-amber-600 dark:text-amber-300 mt-1.5 font-mono">{healedSteps}</div>
          <div className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-1">{healedRuns} healed run{healedRuns !== 1 ? 's' : ''}</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-500/20 rounded-xl p-4 sm:p-5 shadow-xs transition-colors">
          <div className="text-xs font-medium text-rose-700 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1">
            <XCircle className="h-3.5 w-3.5" />
            Failed
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-rose-600 dark:text-rose-300 mt-1.5 font-mono">{failedSteps}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{failedRuns} failed run{failedRuns !== 1 ? 's' : ''}</div>
        </div>

        <div className="card-gradient-border p-4 sm:p-5 col-span-2 md:col-span-1 transition-colors">
          <div className="text-xs font-semibold text-[#4C1A57] dark:text-[#BAB0D4] uppercase tracking-wider flex items-center gap-1">
            <Activity className="h-3.5 w-3.5 text-[#76518A]" />
            Success Rate
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[#4C1A57] dark:text-[#BAB0D4] mt-1.5 font-mono">
            {totalSteps > 0 ? `${successRate}%` : '—'}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Avg {(avgDurationMs / 1000).toFixed(1)}s / run</div>
        </div>
      </div>

      {/* System Health & Presets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 card-gradient-border p-5 sm:p-6 transition-colors">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <Server className="h-5 w-5 text-[#76518A] dark:text-[#BAB0D4]" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Execution Engine & Backend Status</h2>
            </div>
            <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-mono font-medium ${
              backendHealth.online 
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30' 
                : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30'
            }`}>
              <span className={`h-2 w-2 rounded-full ${backendHealth.online ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]' : 'bg-rose-500'}`} />
              {backendHealth.online ? 'Backend Connected' : 'Backend Disconnected'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-5 text-xs">
            <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-lg border border-slate-200/80 dark:border-slate-800 space-y-1">
              <div className="text-slate-500 dark:text-slate-400 font-medium">API Endpoint</div>
              <div className="font-mono text-slate-900 dark:text-slate-200 font-semibold">http://localhost:3001/api</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Express REST & Static Screenshots</div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-lg border border-slate-200/80 dark:border-slate-800 space-y-1">
              <div className="text-slate-500 dark:text-slate-400 font-medium">Playwright Runner</div>
              <div className="font-mono text-emerald-700 dark:text-emerald-300 font-semibold">Headless Chromium</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Accessible Locator Engine</div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-lg border border-slate-200/80 dark:border-slate-800 space-y-1">
              <div className="text-slate-500 dark:text-slate-400 font-medium">Self-Healing Strategist</div>
              <div className="font-mono text-amber-700 dark:text-amber-300 font-semibold">Live DOM Mutation Evaluator</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Multi-heuristic candidate scoring</div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-lg border border-slate-200/80 dark:border-slate-800 space-y-1">
              <div className="text-slate-500 dark:text-slate-400 font-medium">Safety Guardrails</div>
              <div className="font-mono text-[#4C1A57] dark:text-[#BAB0D4] font-semibold">Active (SSRF & Private Network Guard)</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Target isolation enforced</div>
            </div>
          </div>
        </div>

        {/* Quick Presets Column */}
        <div className="card-gradient-border p-5 sm:p-6 flex flex-col justify-between transition-colors">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
              <Layers className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              Verified Scenarios
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
              Launch pre-configured verification tests against the local test fixture:
            </p>

            <div className="space-y-2.5 mt-4">
              <button
                onClick={() => onQuickRunPreset({
                  url: 'http://localhost:3001/demo/shopease/version-a',
                  instruction: 'Navigate to ShopEase, click "Add to Cart", verify cart count increases',
                  criteria: '1',
                })}
                className="w-full text-left p-2.5 rounded-lg bg-purple-50/60 dark:bg-slate-950 hover:bg-purple-100/60 dark:hover:bg-slate-800/80 border border-purple-200 dark:border-purple-800/40 transition group cursor-pointer"
              >
                <div className="flex items-center justify-between text-xs font-semibold text-purple-900 dark:text-purple-300">
                  <span>🛍️ ShopEase v1 — Baseline</span>
                  <ArrowRight className="h-3 w-3 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition" />
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Add-to-cart → cart count verified</div>
              </button>

              <button
                onClick={() => onQuickRunPreset({
                  url: 'http://localhost:3001/demo/shopease/version-b',
                  instruction: 'Navigate to ShopEase, click "Add to Cart", verify cart count increases',
                  criteria: '1',
                })}
                className="w-full text-left p-2.5 rounded-lg bg-amber-50/60 dark:bg-slate-950 hover:bg-amber-100/60 dark:hover:bg-slate-800/80 border border-amber-200 dark:border-amber-500/30 transition group cursor-pointer"
              >
                <div className="flex items-center justify-between text-xs font-semibold text-amber-900 dark:text-amber-300">
                  <span>⚡ ShopEase v2 — Self-Healing</span>
                  <ArrowRight className="h-3 w-3 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition" />
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">add-to-cart→add-to-basket heals autonomously</div>
              </button>

              <button
                onClick={() => onQuickRunPreset({
                  url: 'http://localhost:3001/demo/shopease/broken',
                  instruction: 'Navigate to ShopEase, click "Add to Cart", verify cart count increases',
                  criteria: '1',
                })}
                className="w-full text-left p-2.5 rounded-lg bg-rose-50/60 dark:bg-slate-950 hover:bg-rose-100/60 dark:hover:bg-slate-800/80 border border-rose-200 dark:border-rose-500/30 transition group cursor-pointer"
              >
                <div className="flex items-center justify-between text-xs font-semibold text-rose-900 dark:text-rose-300">
                  <span>❌ ShopEase Broken — Strict Fail</span>
                  <ArrowRight className="h-3 w-3 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition" />
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Cart disabled — confirms real FAIL verdict</div>
              </button>

              <button
                onClick={() => onQuickRunPreset({
                  url: 'http://localhost:3001/fixture?mutated=true',
                  instruction: 'Navigate to fixture, enter "Testing Mutation" into "Feedback Input", click "Submit Feedback", verify "Feedback Submitted Successfully" is visible',
                  criteria: 'Feedback Submitted Successfully',
                })}
                className="w-full text-left p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 transition group cursor-pointer"
              >
                <div className="flex items-center justify-between text-xs font-semibold text-amber-800 dark:text-amber-300">
                  <span>⚙️ Fixture Mutation (Submit→Send)</span>
                  <ArrowRight className="h-3 w-3 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition" />
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">DOM healing on feedback fixture</div>
              </button>

              <button
                onClick={() => onQuickRunPreset({
                  url: 'http://localhost:3001/fixture',
                  instruction: 'Navigate to fixture, enter "Baseline Demo" into "Feedback Input", click "Submit Feedback", verify "Feedback Submitted Successfully" is visible',
                  criteria: 'Feedback Submitted Successfully',
                })}
                className="w-full text-left p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 transition group cursor-pointer"
              >
                <div className="flex items-center justify-between text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                  <span>✅ Baseline Fixture Pass</span>
                  <ArrowRight className="h-3 w-3 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition" />
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Clean end-to-end execution</div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Test Runs Section */}
      <div className="card-gradient-border p-5 sm:p-6 transition-colors">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 dark:border-slate-800 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#76518A] dark:text-[#BAB0D4]" />
              Recent Execution History
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Live Playwright executions recorded from this testing session
            </p>
          </div>
          {totalRuns > 0 && (
            <button
              onClick={() => onNavigate('history')}
              className="text-xs text-[#76518A] hover:text-[#4C1A57] dark:text-[#BAB0D4] dark:hover:text-white font-semibold flex items-center gap-1 transition cursor-pointer"
            >
              <span>View All ({totalRuns})</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {recentRuns.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
            <Activity className="h-8 w-8 text-slate-400 dark:text-slate-600 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-300">No Tests Executed Yet</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Execute your first natural-language test or run one of the verified fixture presets above.
            </p>
            <button
              onClick={() => onNavigate('new-test')}
              className="mt-4 px-4 py-2 rounded-lg btn-primary-gradient text-white text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              Create New Test
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-mono text-xs">
                  <th className="pb-3 font-semibold">STATUS</th>
                  <th className="pb-3 font-semibold">TARGET URL</th>
                  <th className="pb-3 font-semibold">ERROR CLASSIFICATION</th>
                  <th className="pb-3 font-semibold">STEPS</th>
                  <th className="pb-3 font-semibold">DURATION</th>
                  <th className="pb-3 font-semibold">EXECUTED</th>
                  <th className="pb-3 font-semibold text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {recentRuns.map((run) => (
                  <tr key={run.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition group">
                    <td className="py-3.5 pr-3">{getStatusBadge(run)}</td>
                    <td className="py-3.5 pr-3 max-w-[220px]">
                      <div className="font-mono text-slate-900 dark:text-slate-200 truncate font-semibold text-xs">
                        {run.intent.targetUrl}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs mt-0.5">
                        {run.intent.naturalLanguageInstruction}
                      </div>
                    </td>
                    <td className="py-3.5 pr-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono ${
                        run.errorClassification?.category === 'NONE'
                          ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                          : run.errorClassification?.category === 'UI_HEALED'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20'
                          : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/20'
                      }`}>
                        {run.errorClassification?.label || 'Clean Pass'}
                      </span>
                    </td>
                    <td className="py-3.5 pr-3 font-mono text-slate-700 dark:text-slate-300 text-xs">
                      {run.summary.passedSteps + run.summary.healedSteps} / {run.summary.totalSteps}
                    </td>
                    <td className="py-3.5 pr-3 font-mono text-slate-600 dark:text-slate-400 text-xs">
                      {(run.executionTimeMs / 1000).toFixed(2)}s
                    </td>
                    <td className="py-3.5 pr-3 font-mono text-slate-500 text-xs">
                      {new Date(run.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3.5 text-right">
                      <button
                        onClick={() => {
                          onSelectRun(run.id);
                          onNavigate('history');
                        }}
                        className="text-xs text-[#76518A] dark:text-[#BAB0D4] hover:text-[#4C1A57] dark:hover:text-white font-medium px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition cursor-pointer"
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
