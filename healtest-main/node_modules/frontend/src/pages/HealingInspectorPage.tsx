import React, { useState } from 'react';
import { 
  Wrench, 
  ShieldCheck, 
  Play,
  FileCode2,
  CheckCircle2,
  ClipboardList,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import type { TestRun } from '../types';
import type { NavigationPage } from '../components/Navbar';
import { HealingInspector } from '../components/HealingInspector';
import { apiService } from '../services/api';

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

  const [patchApproved, setPatchApproved] = useState(false);
  const [approvingPatch, setApprovingPatch] = useState(false);
  const [patchApprovalError, setPatchApprovalError] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [showPatch, setShowPatch] = useState(false);

  const handleApprovePatch = async (runId: string) => {
    setApprovingPatch(true);
    setPatchApprovalError(null);
    try {
      await apiService.approvePatch(runId);
      setPatchApproved(true);
    } catch (err: any) {
      setPatchApprovalError(err.message);
    } finally {
      setApprovingPatch(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header (Requirement 4: Ultra-Thin Gradient Border) */}
      <div className="card-gradient-border p-6 relative overflow-hidden transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[#4C1A57]/10 dark:bg-[#4C1A57]/30 text-[#4C1A57] dark:text-[#BAB0D4] border border-[#BAB0D4]/30">
                <Wrench className="h-4 w-4" />
              </span>
              <span className="text-xs font-semibold text-[#76518A] dark:text-[#BAB0D4] uppercase tracking-wider">
                Autonomous Recovery Engine
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mt-1.5">
              Self-Healing Deep Dive Inspector
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
              When UI mutations break an interaction, HealTest inspects the live browser DOM, extracts accessible candidates, scores similarity, verifies ambiguity, and repairs the selector before retrying.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
              {healedRuns.length} Healed Run{healedRuns.length !== 1 ? 's' : ''} in Session
            </span>
          </div>
        </div>

        {/* Run Selector Bar */}
        {runs.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-semibold mr-1">Select Execution Run:</span>
            {runs.map((r) => {
              const isSelected = activeRun?.id === r.id;
              const hasHeals = r.healingRecords && r.healingRecords.length > 0;
              return (
                <button
                  key={r.id}
                  onClick={() => onSelectRun(r.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono transition cursor-pointer ${
                    isSelected
                      ? 'bg-[#4C1A57]/10 dark:bg-[#4C1A57]/20 border-[#76518A] text-[#4C1A57] dark:text-[#BAB0D4] font-semibold shadow-xs ring-1 ring-[#BAB0D4]/30'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-300'
                  }`}
                >
                  {hasHeals && <Wrench className="h-3 w-3 text-amber-500" />}
                  <span>{r.id.split('-').slice(0, 2).join('-')}</span>
                  {hasHeals && (
                    <span className="text-xs bg-amber-100 dark:bg-amber-400/20 text-amber-800 dark:text-amber-300 px-1 rounded font-bold">
                      {r.healingRecords.length}
                    </span>
                  )}
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

      {/* Main Inspection View */}
      {!activeRun ? (
        <div className="card-gradient-border p-12 text-center space-y-4 transition-colors">
          <Wrench className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">No Test Runs Available</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Execute a test on the New Test page or click the button below to test self-healing against the mutated test fixture.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => onQuickRunPreset({
                url: 'http://localhost:3001/fixture?mutated=true',
                instruction: 'Navigate to fixture, enter "Testing Mutation" into "Feedback Input", click "Submit Feedback", verify "Feedback Submitted Successfully" is visible',
                criteria: 'Feedback Submitted Successfully',
              })}
              className="px-5 py-2.5 rounded-lg btn-primary-gradient text-white text-xs font-semibold shadow-xs transition flex items-center gap-2 cursor-pointer"
            >
              <Play className="h-3.5 w-3.5 fill-current text-white" />
              <span>Launch Live Self-Healing Test</span>
            </button>
            <button
              onClick={() => onNavigate('new-test')}
              className="px-4 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition border border-slate-200 dark:border-slate-700 cursor-pointer"
            >
              Custom Test
            </button>
          </div>
        </div>
      ) : activeRun.healingRecords && activeRun.healingRecords.length > 0 ? (
        <div className="space-y-6">
          {/* Active run summary pill */}
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-2 font-mono">
              <span className="text-slate-400 dark:text-slate-500">Run:</span>
              <span className="text-slate-900 dark:text-white font-bold">{activeRun.id}</span>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <span className="text-[#76518A] dark:text-[#BAB0D4] truncate max-w-sm">{activeRun.intent.targetUrl}</span>
            </div>
            <span className="font-mono text-amber-700 dark:text-amber-300 font-bold">
              {activeRun.healingRecords.length} Autonomous Repair Event{activeRun.healingRecords.length > 1 ? 's' : ''} Verified
            </span>
          </div>

          {/* Deep dive component */}
          <HealingInspector healingRecords={activeRun.healingRecords} />

          {/* Developer Report Panel */}
          {activeRun.developerReport && (
            <div className="bg-white dark:bg-slate-900 border border-[#BAB0D4]/30 dark:border-[#76518A]/40 rounded-xl shadow-xs overflow-hidden transition-colors">
              <button
                onClick={() => setShowReport(!showReport)}
                className="w-full flex items-center justify-between px-5 py-4 bg-[#4C1A57]/5 dark:bg-[#4C1A57]/20 hover:bg-[#4C1A57]/10 dark:hover:bg-[#4C1A57]/30 transition text-left cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <ClipboardList className="h-4 w-4 text-[#76518A] dark:text-[#BAB0D4]" />
                  <span className="text-sm font-bold text-slate-900 dark:text-white">AI Developer Report</span>
                  <span className="text-xs bg-[#4C1A57]/10 dark:bg-[#4C1A57]/30 text-[#4C1A57] dark:text-[#BAB0D4] px-2 py-0.5 rounded font-mono">
                    {activeRun.developerReport.whetherRecoverySucceeded ? 'Recovery Succeeded' : 'Recovery Failed'}
                  </span>
                </div>
                {showReport ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
              </button>

              {showReport && (
                <div className="p-5 space-y-4 text-xs">
                  {[
                    { label: 'What Failed', value: activeRun.developerReport.whatFailed },
                    { label: 'Root Cause Analysis', value: activeRun.developerReport.whyItProbablyFailed },
                    { label: 'Recovery Strategy', value: activeRun.developerReport.recoveryAttempted },
                    { label: 'Why Strategy Was Appropriate', value: activeRun.developerReport.whySelectedStrategyWasAppropriate },
                    { label: 'What Was Verified', value: activeRun.developerReport.whatWasVerified },
                    { label: 'Recommended Permanent Fix', value: activeRun.developerReport.recommendedPermanentFix },
                  ].filter(item => item.value).map(({ label, value }) => (
                    <div key={label} className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
                      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{label}</div>
                      <p className="text-slate-800 dark:text-slate-200 leading-relaxed">{value}</p>
                    </div>
                  ))}

                  {activeRun.developerReport.evidenceInspected && activeRun.developerReport.evidenceInspected.length > 0 && (
                    <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
                      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Evidence Inspected</div>
                      <ul className="space-y-1">
                        {activeRun.developerReport.evidenceInspected.map((ev, i) => (
                          <li key={i} className="text-slate-700 dark:text-slate-300 font-mono text-xs">{ev}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex gap-3 text-xs">
                    <span className={`px-2.5 py-1 rounded border font-mono ${activeRun.developerReport.whetherAppSourceCodeChanged ? 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/20 dark:border-amber-800/40 dark:text-amber-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-800/40 dark:text-emerald-300'}`}>
                      App Source: {activeRun.developerReport.whetherAppSourceCodeChanged ? 'Modified' : 'Unchanged ✓'}
                    </span>
                    <span className={`px-2.5 py-1 rounded border font-mono ${activeRun.developerReport.whetherTestCodeChanged ? 'bg-purple-50 border-purple-200 text-purple-800 dark:bg-purple-950/20 dark:border-purple-800/40 dark:text-purple-300' : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400'}`}>
                      Test Code: {activeRun.developerReport.whetherTestCodeChanged ? 'Patch Available' : 'No change'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Test Code Patch Panel (Requirement 4: Ultra-Thin Gradient Border) */}
          {activeRun.suggestedTestPatch && (
            <div className="card-gradient-border shadow-xs overflow-hidden transition-colors">
              <button
                onClick={() => setShowPatch(!showPatch)}
                className="w-full flex items-center justify-between px-5 py-4 bg-[#4C1A57]/5 dark:bg-[#4C1A57]/20 hover:bg-[#4C1A57]/10 dark:hover:bg-[#4C1A57]/30 transition text-left cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <FileCode2 className="h-4 w-4 text-[#76518A] dark:text-[#BAB0D4]" />
                  <span className="text-sm font-bold text-slate-900 dark:text-white">Before / After Test Code Patch</span>
                  <span className={`text-xs px-2 py-0.5 rounded font-mono border ${activeRun.suggestedTestPatch.patchStatus === 'approved_and_applied' || patchApproved ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-800/40 dark:text-emerald-300' : 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/20 dark:border-amber-800/40 dark:text-amber-300'}`}>
                    {(activeRun.suggestedTestPatch.patchStatus === 'approved_and_applied' || patchApproved) ? 'Approved' : 'Pending Review'}
                  </span>
                </div>
                {showPatch ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
              </button>

              {showPatch && (
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <div className="text-xs font-semibold text-rose-600 dark:text-rose-400 mb-2 uppercase tracking-wider">Before (Broken)</div>
                      <pre className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40 rounded-lg p-3 font-mono text-rose-800 dark:text-rose-200 overflow-x-auto whitespace-pre-wrap text-xs leading-relaxed">
                        {activeRun.suggestedTestPatch.originalPlaywrightCode}
                      </pre>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-2 uppercase tracking-wider">After (Healed Replacement)</div>
                      <pre className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-lg p-3 font-mono text-emerald-800 dark:text-emerald-200 overflow-x-auto whitespace-pre-wrap text-xs leading-relaxed">
                        {activeRun.suggestedTestPatch.suggestedReplacementCode}
                      </pre>
                    </div>
                  </div>

                  {activeRun.suggestedTestPatch.patchDiff && (
                    <div>
                      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Unified Diff</div>
                      <pre className="bg-slate-900 dark:bg-slate-950 text-slate-200 rounded-lg p-3 font-mono text-xs overflow-x-auto leading-relaxed border border-slate-700">
                        {activeRun.suggestedTestPatch.patchDiff}
                      </pre>
                    </div>
                  )}

                  {activeRun.suggestedTestPatch.authorNote && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 italic">{activeRun.suggestedTestPatch.authorNote}</p>
                  )}

                  {patchApprovalError && (
                    <p className="text-xs text-rose-600 dark:text-rose-400">{patchApprovalError}</p>
                  )}

                  {!patchApproved && activeRun.suggestedTestPatch.patchStatus !== 'approved_and_applied' && (
                    <button
                      onClick={() => handleApprovePatch(activeRun.id)}
                      disabled={approvingPatch}
                      className="btn-primary-gradient flex items-center gap-2 px-4 py-2 rounded-lg text-white text-xs font-semibold cursor-pointer"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                      <span>{approvingPatch ? 'Approving...' : 'Approve Permanent Patch'}</span>
                    </button>
                  )}

                  {(patchApproved || activeRun.suggestedTestPatch.patchStatus === 'approved_and_applied') && (
                    <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
                      <CheckCircle2 className="h-4 w-4" />
                      Patch approved. No application source code was modified — only test specification updated.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="card-gradient-border p-10 text-center space-y-4 transition-colors">
          <ShieldCheck className="h-10 w-10 text-emerald-600 dark:text-emerald-400 mx-auto opacity-80" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            No Self-Healing Required for Run [{activeRun.id}]
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            All steps matched their initial accessible locators directly or failed without viable alternatives. Self-healing activates automatically when live DOM mutations are detected.
          </p>

          <div className="pt-2">
            <button
              onClick={() => onQuickRunPreset({
                url: 'http://localhost:3001/fixture?mutated=true',
                instruction: 'Navigate to fixture, enter "HealTest Recovery" into "Feedback Input", click "Submit Feedback", verify "Feedback Submitted Successfully" is visible',
                criteria: 'Feedback Submitted Successfully',
              })}
              className="px-5 py-2.5 rounded-lg btn-primary-gradient text-white text-xs font-semibold shadow-xs transition inline-flex items-center gap-2 cursor-pointer"
            >
              <Play className="h-3.5 w-3.5 fill-current text-white" />
              <span>Run Live Self-Healing Demo (Submit → Send)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
