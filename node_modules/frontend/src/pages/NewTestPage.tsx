import React, { useState } from 'react';
import { 
  Play, 
  Globe, 
  Terminal, 
  Sparkles, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Layers, 
  Wrench, 
  ArrowRight,
  Settings,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import type { TestIntent, TestRun, SafetyValidationResult } from '../types';
import type { NavigationPage } from '../components/Navbar';
import { validateTestInstruction } from '../utils/safetyValidator';

interface NewTestPageProps {
  intent: TestIntent;
  onChangeIntent: (updated: Partial<TestIntent>) => void;
  safetyResult: SafetyValidationResult;
  onRunTest: () => Promise<TestRun | null>;
  isRunning: boolean;
  runError: string | null;
  onClearRunError: () => void;
  lastExecutedRun: TestRun | null;
  onNavigate: (page: NavigationPage) => void;
  onSelectRun: (runId: string) => void;
}

const PRESETS = [
  {
    title: '⚡ Live Self-Healing (Submit → Send)',
    url: 'http://localhost:3001/fixture?mutated=true',
    instruction: 'Navigate to fixture, enter "HealTest User" into "Feedback Input", click "Submit Feedback", verify "Feedback Submitted Successfully" is visible',
    criteria: 'Feedback Submitted Successfully',
    description: 'Button text was mutated from Submit to Send. Verifies autonomous healing.',
  },
  {
    title: '✅ Baseline E2E Pass',
    url: 'http://localhost:3001/fixture',
    instruction: 'Navigate to fixture, enter "Shivansh Patel" into "Feedback Input", click "Submit Feedback", verify "Feedback Submitted Successfully" is visible',
    criteria: 'Feedback Submitted Successfully',
    description: 'Direct accessible execution against the standard fixture.',
  },
  {
    title: '❌ Strict Failure (No Fake Recovery)',
    url: 'http://localhost:3001/fixture?broken=true',
    instruction: 'Navigate to fixture, enter "Test Fail" into "Feedback Input", click "Submit Feedback", verify "Feedback Submitted Successfully" is visible',
    criteria: 'Feedback Submitted Successfully',
    description: 'Button is absent. Confirms engine strictly fails without fake results.',
  },
  {
    title: '🌐 Live Remote (example.com)',
    url: 'https://example.com',
    instruction: 'Navigate to example page, verify "documentation examples" is visible',
    criteria: 'documentation examples',
    description: 'Tests a real live external public website over HTTPS.',
  },
];

export const NewTestPage: React.FC<NewTestPageProps> = ({
  intent,
  onChangeIntent,
  safetyResult,
  onRunTest,
  isRunning,
  runError,
  onClearRunError,
  lastExecutedRun,
  onNavigate,
  onSelectRun,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const instructionSafety = validateTestInstruction(intent.naturalLanguageInstruction);

  const applyPreset = (preset: typeof PRESETS[0]) => {
    onClearRunError();
    onChangeIntent({
      targetUrl: preset.url,
      naturalLanguageInstruction: preset.instruction,
      customSuccessCriteria: preset.criteria,
    });
  };

  const decomposedActions = intent.naturalLanguageInstruction
    .split(/(?:,|\.|\band then\b|\bthen\b|\band\b)/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 3);

  const canRun = safetyResult.isValid && instructionSafety.isSafe && !isRunning && intent.targetUrl.trim() !== '';

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-blue-500/20 text-blue-400">
                <Play className="h-4 w-4 fill-current" />
              </span>
              <h1 className="text-xl font-bold text-white tracking-tight">
                New Test Execution
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Enter any target URL and test instructions in natural language. HealTest runs real headless Playwright automation.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-mono px-2.5 py-1 rounded-lg border ${
              intent.allowLocalhost 
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30' 
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}>
              Local Dev Mode: {intent.allowLocalhost ? 'ENABLED' : 'BLOCKED'}
            </span>
          </div>
        </div>

        {/* Quick Presets Bar */}
        <div className="mt-5">
          <div className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-blue-400" />
            <span>Quick Start Presets:</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {PRESETS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => applyPreset(p)}
                className="text-left p-3 rounded-xl bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-blue-500/40 transition group"
              >
                <div className="text-xs font-semibold text-slate-200 group-hover:text-blue-300 transition">
                  {p.title}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1 font-mono">
                  {p.url}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Target URL & Instruction Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        {/* Target URL */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-blue-400" />
              Target Website URL
            </span>
            <span className="text-[11px] font-normal text-slate-500">
              Must include protocol (http:// or https://)
            </span>
          </label>

          <div className="relative">
            <input
              type="url"
              placeholder="https://example.com or http://localhost:3001/fixture"
              value={intent.targetUrl}
              onChange={(e) => {
                onClearRunError();
                onChangeIntent({ targetUrl: e.target.value });
              }}
              className={`w-full bg-slate-950 border rounded-xl px-4 py-3 text-xs font-mono text-white placeholder-slate-600 focus:outline-none transition ${
                !safetyResult.isValid && intent.targetUrl
                  ? 'border-rose-500 focus:border-rose-400'
                  : 'border-slate-800 focus:border-blue-500'
              }`}
            />
          </div>

          {/* Safety validation feedback */}
          {!safetyResult.isValid && intent.targetUrl && (
            <div className="mt-2 text-xs text-rose-400 flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{safetyResult.blockedReason}</span>
            </div>
          )}

          {safetyResult.warnings.length > 0 && (
            <div className="mt-2 space-y-1">
              {safetyResult.warnings.map((w, idx) => (
                <div key={idx} className="text-[11px] text-amber-400/90 flex items-center gap-1.5">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Natural Language Instruction */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Terminal className="h-3.5 w-3.5 text-emerald-400" />
              Natural-Language Test Instruction
            </span>
            <span className="text-[11px] font-normal text-slate-500">
              {decomposedActions.length} inferred atomic steps
            </span>
          </label>

          <textarea
            rows={3}
            placeholder="e.g. Navigate to fixture, enter 'Hello' in Feedback Input, click Submit Feedback, verify Feedback Submitted Successfully is visible"
            value={intent.naturalLanguageInstruction}
            onChange={(e) => {
              onClearRunError();
              onChangeIntent({ naturalLanguageInstruction: e.target.value });
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition leading-relaxed"
          />

          {!instructionSafety.isSafe && (
            <div className="mt-2 text-xs text-rose-400 flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{instructionSafety.blockedReason}</span>
            </div>
          )}
        </div>

        {/* Inferred Action Decomposition Preview */}
        {decomposedActions.length > 0 && (
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 text-xs">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-blue-400" />
              Intent Decomposer Action Sequence:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {decomposedActions.map((action, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 font-mono text-[11px] flex items-center gap-1.5"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                  Step {idx + 1}: {action}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Advanced Options Toggle */}
        <div className="border-t border-slate-800/80 pt-4">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 font-medium transition"
          >
            <Settings className="h-3.5 w-3.5 text-slate-500" />
            <span>Advanced Configurations</span>
            {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          {showAdvanced && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Step Timeout (ms)
                </label>
                <input
                  type="number"
                  min={2000}
                  max={60000}
                  step={1000}
                  value={intent.timeoutMs}
                  onChange={(e) => onChangeIntent({ timeoutMs: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Self-Healing Max Retries
                </label>
                <input
                  type="number"
                  min={0}
                  max={5}
                  value={intent.maxRetries}
                  onChange={(e) => onChangeIntent({ maxRetries: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-400 font-medium mb-1">
                  Custom Ground Truth Assertion (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Expected text confirmation on the final page"
                  value={intent.customSuccessCriteria || ''}
                  onChange={(e) => onChangeIntent({ customSuccessCriteria: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white text-xs"
                />
              </div>

              <div className="sm:col-span-2 flex items-center justify-between pt-2 border-t border-slate-800">
                <div>
                  <div className="font-semibold text-slate-300">Allow Localhost & Private Networks</div>
                  <div className="text-[11px] text-slate-500">Enable only when testing local development servers</div>
                </div>
                <input
                  type="checkbox"
                  checked={intent.allowLocalhost}
                  onChange={(e) => onChangeIntent({ allowLocalhost: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0 cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* Error Display */}
        {runError && (
          <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-rose-400 block mb-0.5">Execution Error:</span>
                <span>{runError}</span>
              </div>
            </div>
            <button
              onClick={onClearRunError}
              className="text-rose-400 hover:text-white text-xs font-mono px-2 py-0.5 rounded bg-rose-950/60 shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Run Action */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>HealTest operates independently from target application</span>
          </div>

          <button
            type="button"
            disabled={!canRun}
            onClick={onRunTest}
            className={`flex items-center gap-2.5 px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition shadow-lg ${
              canRun
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30 cursor-pointer active:scale-95'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
            }`}
          >
            {isRunning ? (
              <>
                <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                <span>Running Playwright...</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Run Playwright Test</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Active Running Progress Card */}
      {isRunning && (
        <div className="bg-slate-900 border border-blue-500/50 rounded-2xl p-6 shadow-2xl space-y-4 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-blue-500"></span>
              </span>
              <div>
                <h3 className="text-sm font-bold text-white">
                  Headless Chromium Automation In Progress
                </h3>
                <p className="text-[11px] text-slate-400">
                  Executing live Playwright run against target website
                </p>
              </div>
            </div>
            <span className="font-mono text-xs text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/30">
              Active Session
            </span>
          </div>

          <div className="text-xs space-y-1.5 font-mono text-slate-300 bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="text-slate-400">
              Target URL: <span className="text-blue-400 font-semibold">{intent.targetUrl}</span>
            </div>
            <div className="text-slate-400 truncate">
              Instruction: <span className="text-slate-200">{intent.naturalLanguageInstruction}</span>
            </div>
            <div className="text-slate-500 text-[11px]">
              Engine: Chromium • Timeout: {intent.timeoutMs}ms • Max Retries: {intent.maxRetries}
            </div>
          </div>

          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-400 animate-ping" />
            <span>
              Navigating to target, waiting for DOM content loaded, extracting live accessibility locators, executing actions, and capturing real step screenshots...
            </span>
          </div>
        </div>
      )}

      {/* Immediate Execution Result Card if a test just completed */}
      {lastExecutedRun && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              {lastExecutedRun.status === 'HEALED' && (
                <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                  <Wrench className="h-4 w-4" />
                </span>
              )}
              {lastExecutedRun.status === 'PASSED' && (
                <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
              )}
              {lastExecutedRun.status === 'FAILED' && (
                <span className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400">
                  <AlertCircle className="h-4 w-4" />
                </span>
              )}
              <div>
                <h3 className="text-sm font-bold text-white">
                  Execution Completed: Outcome [{lastExecutedRun.status}]
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">
                  Run ID: {lastExecutedRun.id} • {(lastExecutedRun.executionTimeMs / 1000).toFixed(2)}s runtime
                </span>
              </div>
            </div>

            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase font-mono ${
              lastExecutedRun.status === 'HEALED'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : lastExecutedRun.status === 'PASSED'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
            }`}>
              {lastExecutedRun.status}
            </span>
          </div>

          {/* Error classification summary if present */}
          {lastExecutedRun.errorClassification && (
            <div className={`p-3.5 rounded-xl border text-xs ${
              lastExecutedRun.errorClassification.category === 'NONE'
                ? 'bg-slate-950 border-slate-800 text-slate-300'
                : lastExecutedRun.errorClassification.category === 'UI_HEALED'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
            }`}>
              <div className="font-semibold mb-1">
                Classification: {lastExecutedRun.errorClassification.label}
              </div>
              <p className="text-[11px] opacity-90 leading-relaxed">
                {lastExecutedRun.errorClassification.details}
              </p>
            </div>
          )}

          {/* Quick links to inspect */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => {
                onSelectRun(lastExecutedRun.id);
                onNavigate('history');
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition"
            >
              <span>View Step Breakdown</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>

            {lastExecutedRun.healingRecords.length > 0 && (
              <button
                onClick={() => {
                  onSelectRun(lastExecutedRun.id);
                  onNavigate('healing');
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-500/40 text-xs font-semibold transition"
              >
                <Wrench className="h-3.5 w-3.5" />
                <span>Inspect Self-Healing ({lastExecutedRun.healingRecords.length})</span>
              </button>
            )}

            <button
              onClick={() => {
                onSelectRun(lastExecutedRun.id);
                onNavigate('logs-screenshots');
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
            >
              <span>Logs & Screenshots</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
