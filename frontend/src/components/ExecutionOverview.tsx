import React from 'react';
import { CheckCircle2, XCircle, Wrench, Clock, ShieldCheck, Activity } from 'lucide-react';
import type { TestRun } from '../types';

interface ExecutionOverviewProps {
  currentRun: TestRun | null;
  isRunning: boolean;
}

export const ExecutionOverview: React.FC<ExecutionOverviewProps> = ({ currentRun, isRunning }) => {
  if (!currentRun) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 mb-8 text-center">
        <Activity className="h-8 w-8 text-slate-600 mx-auto mb-2" />
        <h3 className="text-sm font-semibold text-slate-300">Ready for Execution</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          Specify a target URL and natural-language workflow above, or select a run from the history.
        </p>
      </div>
    );
  }

  const { status, summary, executionTimeMs, steps } = currentRun;

  // Verdict badge config
  const getVerdictBadge = () => {
    if (isRunning) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/40 animate-pulse">
          <span className="h-2 w-2 rounded-full bg-blue-400 animate-ping" />
          Running
        </span>
      );
    }
    switch (status) {
      case 'HEALED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-lg shadow-amber-500/10">
            <Wrench className="h-3.5 w-3.5" />
            Outcome: HEALED
          </span>
        );
      case 'PASSED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-lg shadow-emerald-500/10">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Outcome: PASSED
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-lg shadow-rose-500/10">
            <XCircle className="h-3.5 w-3.5" />
            Outcome: FAILED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700">
            {status}
          </span>
        );
    }
  };

  const completedCount = steps.filter((s) => s.status === 'passed' || s.status === 'healed').length;
  const progressPercent = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl mb-8">
      {/* Top Bar with Verdict & Target */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-base font-bold text-white">Execution Telemetry</h3>
            {getVerdictBadge()}
          </div>
          <p className="text-xs font-mono text-slate-400 mt-1 truncate max-w-xl">
            Target: <span className="text-blue-400">{currentRun.intent.targetUrl}</span>
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 font-mono">
            <Clock className="h-3.5 w-3.5 text-blue-400" />
            {(executionTimeMs / 1000).toFixed(2)}s runtime
          </span>
          <span className="flex items-center gap-1 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            Safety: Guarded
          </span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 my-6">
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4">
          <div className="text-xs text-slate-400 font-medium">Total Steps</div>
          <div className="text-2xl font-bold text-white mt-1">{summary.totalSteps}</div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4">
          <div className="text-xs text-emerald-400 font-medium flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Passed
          </div>
          <div className="text-2xl font-bold text-emerald-300 mt-1">{summary.passedSteps}</div>
        </div>

        <div className="bg-amber-950/20 border border-amber-900/40 rounded-xl p-4">
          <div className="text-xs text-amber-400 font-semibold flex items-center gap-1">
            <Wrench className="h-3.5 w-3.5" />
            Self-Healed
          </div>
          <div className="text-2xl font-bold text-amber-300 mt-1">{summary.healedSteps}</div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4">
          <div className="text-xs text-rose-400 font-medium flex items-center gap-1">
            <XCircle className="h-3.5 w-3.5" />
            Failed
          </div>
          <div className="text-2xl font-bold text-rose-300 mt-1">{summary.failedSteps}</div>
        </div>
      </div>

      {/* Step Progress Bar */}
      <div>
        <div className="flex justify-between text-xs text-slate-400 mb-2 font-medium">
          <span>Workflow Execution Progress</span>
          <span>
            {completedCount} of {steps.length} steps ({progressPercent}%)
          </span>
        </div>
        <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
          {steps.map((step, idx) => {
            let color = 'bg-slate-700';
            if (step.status === 'passed') color = 'bg-emerald-500';
            if (step.status === 'healed') color = 'bg-amber-500';
            if (step.status === 'failed') color = 'bg-rose-500';
            if (step.status === 'running') color = 'bg-blue-500 animate-pulse';

            return (
              <div
                key={idx}
                style={{ width: `${100 / (steps.length || 1)}%` }}
                className={`${color} border-r border-slate-900 last:border-r-0 transition-all`}
                title={`Step ${step.order}: ${step.description} (${step.status})`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
