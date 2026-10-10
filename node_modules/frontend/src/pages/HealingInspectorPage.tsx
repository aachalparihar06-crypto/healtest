import React from 'react';
import { 
  Wrench, 
  ShieldCheck, 
  Play
} from 'lucide-react';
import type { TestRun } from '../types';
import type { NavigationPage } from '../components/Navbar';
import { HealingInspector } from '../components/HealingInspector';

interface HealingInspectorPageProps {
  runs: TestRun[];
  selectedRunId: string | null;
  onSelectRun: (id: string) => void;
  onNavigate: (page: NavigationPage) => void;
  onQuickRunPreset: (preset: { url: string; instruction: string; criteria: string }) => void;
}

export const HealingInspectorPage: React.FC<HealingInspectorPageProps> = ({
  runs,
  selectedRunId,
  onSelectRun,
  onNavigate,
  onQuickRunPreset,
}) => {
  // Find all runs that had healing events
  const healedRuns = runs.filter((r) => r.healingRecords && r.healingRecords.length > 0);
  
  // Choose default selected run: preferred healed run, or selectedRunId, or first run
  const activeRun = runs.find((r) => r.id === selectedRunId) || (healedRuns.length > 0 ? healedRuns[0] : runs[0] || null);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 blur-3xl pointer-events-none rounded-full" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-amber-500/20 text-amber-400">
                <Wrench className="h-4 w-4" />
              </span>
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                Autonomous Recovery Engine
              </span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight mt-1">
              Self-Healing Deep Dive Inspector
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              When UI mutations break an interaction, HealTest inspects the live browser DOM, extracts accessible candidates, scores similarity, verifies ambiguity, and repairs the selector before retrying.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              {healedRuns.length} Healed Run{healedRuns.length !== 1 ? 's' : ''} in Session
            </span>
          </div>
        </div>

        {/* Run Selector Bar */}
        {runs.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400 font-semibold mr-1">Select Execution Run:</span>
            {runs.map((r) => {
              const isSelected = activeRun?.id === r.id;
              const hasHeals = r.healingRecords && r.healingRecords.length > 0;
              return (
                <button
                  key={r.id}
                  onClick={() => onSelectRun(r.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-mono transition ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold shadow-md shadow-amber-500/10'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  {hasHeals && <Wrench className="h-3 w-3 text-amber-400" />}
                  <span>{r.id.split('-').slice(0, 2).join('-')}</span>
                  {hasHeals && (
                    <span className="text-[10px] bg-amber-400/20 text-amber-300 px-1 rounded font-bold">
                      {r.healingRecords.length}
                    </span>
                  )}
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

      {/* Main Inspection View */}
      {!activeRun ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center shadow-xl space-y-4">
          <Wrench className="h-10 w-10 text-slate-600 mx-auto" />
          <h2 className="text-base font-bold text-white">No Test Runs Available</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Execute a test on the New Test page or click the button below to test self-healing against the mutated test fixture.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => onQuickRunPreset({
                url: 'http://localhost:3001/fixture?mutated=true',
                instruction: 'Navigate to fixture, enter "Testing Mutation" into "Feedback Input", click "Submit Feedback", verify "Feedback Submitted Successfully" is visible',
                criteria: 'Feedback Submitted Successfully',
              })}
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-lg shadow-amber-600/20 transition flex items-center gap-2"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Launch Live Self-Healing Test</span>
            </button>
            <button
              onClick={() => onNavigate('new-test')}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              Custom Test
            </button>
          </div>
        </div>
      ) : activeRun.healingRecords && activeRun.healingRecords.length > 0 ? (
        <div className="space-y-6">
          {/* Active run summary pill */}
          <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-950 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 font-mono">
              <span className="text-slate-500">Run:</span>
              <span className="text-white font-bold">{activeRun.id}</span>
              <span className="text-slate-600">•</span>
              <span className="text-blue-400 truncate max-w-sm">{activeRun.intent.targetUrl}</span>
            </div>
            <span className="font-mono text-amber-300 font-bold">
              {activeRun.healingRecords.length} Autonomous Repair Event{activeRun.healingRecords.length > 1 ? 's' : ''} Verified
            </span>
          </div>

          {/* Deep dive component */}
          <HealingInspector healingRecords={activeRun.healingRecords} />
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center shadow-xl space-y-4">
          <ShieldCheck className="h-10 w-10 text-emerald-400 mx-auto opacity-80" />
          <h2 className="text-base font-bold text-white">
            No Self-Healing Required for Run [{activeRun.id}]
          </h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            All steps matched their initial accessible locators directly or failed without viable alternatives. Self-healing activates automatically when live DOM mutations are detected.
          </p>

          <div className="pt-2">
            <button
              onClick={() => onQuickRunPreset({
                url: 'http://localhost:3001/fixture?mutated=true',
                instruction: 'Navigate to fixture, enter "HealTest Recovery" into "Feedback Input", click "Submit Feedback", verify "Feedback Submitted Successfully" is visible',
                criteria: 'Feedback Submitted Successfully',
              })}
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-lg shadow-amber-600/20 transition inline-flex items-center gap-2"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Run Live Self-Healing Demo (Submit → Send)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
