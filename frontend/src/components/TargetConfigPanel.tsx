import React, { useState } from 'react';
import { Globe, Terminal, Play, Sparkles, CheckCircle2, AlertCircle, Layers } from 'lucide-react';
import type { TestIntent, SafetyValidationResult } from '../types';
import { validateTestInstruction } from '../utils/safetyValidator';

interface TargetConfigPanelProps {
  intent: TestIntent;
  onChangeIntent: (updated: Partial<TestIntent>) => void;
  safetyResult: SafetyValidationResult;
  onRunTest: () => void;
  isRunning: boolean;
}

export const TargetConfigPanel: React.FC<TargetConfigPanelProps> = ({
  intent,
  onChangeIntent,
  safetyResult,
  onRunTest,
  isRunning,
}) => {
  const [showDecompositionPreview, setShowDecompositionPreview] = useState(false);
  const instructionSafety = validateTestInstruction(intent.naturalLanguageInstruction);

  const decomposedActions = intent.naturalLanguageInstruction
    .split(/(?:,|\.|\band then\b|\bthen\b|\band\b)/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 3);

  const canRun = safetyResult.isValid && instructionSafety.isSafe && !isRunning && intent.targetUrl.trim() !== '';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl mb-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-800/80">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-400" />
            Intent & Target Specification
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Specify any target website URL and describe the test workflow in natural language.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5">
        {/* URL Input */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Globe className="h-4 w-4 text-blue-400" />
              Target Website URL
            </span>
            <span className="text-[11px] font-normal text-slate-400">
              {safetyResult.isLocal ? '🔒 Local / Private Network Target' : '🌐 Remote Target'}
            </span>
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="e.g. https://your-website.com or http://localhost:3000"
              value={intent.targetUrl}
              onChange={(e) => onChangeIntent({ targetUrl: e.target.value })}
              className={`w-full bg-slate-950 border px-4 py-3 rounded-xl text-sm font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 transition ${
                !safetyResult.isValid && intent.targetUrl
                  ? 'border-rose-500/50 focus:ring-rose-500/20'
                  : 'border-slate-800 focus:border-blue-500/50 focus:ring-blue-500/20'
              }`}
            />
          </div>
        </div>

        {/* Natural Language Instruction Input */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Terminal className="h-4 w-4 text-emerald-400" />
              Natural-Language Test Instruction (Intent)
            </label>
            <button
              type="button"
              onClick={() => setShowDecompositionPreview(!showDecompositionPreview)}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
            >
              <Layers className="h-3.5 w-3.5" />
              {showDecompositionPreview ? 'Hide Action Breakdown' : 'Preview Generated Steps'}
            </button>
          </div>
          <textarea
            rows={3}
            placeholder="e.g. Open the home page, search for 'mechanical keyboard', click the first result, verify pricing is displayed."
            value={intent.naturalLanguageInstruction}
            onChange={(e) => onChangeIntent({ naturalLanguageInstruction: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 px-4 py-3 rounded-xl text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition resize-none font-sans"
          />

          {!instructionSafety.isSafe && (
            <div className="mt-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2.5 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{instructionSafety.blockedReason}</span>
            </div>
          )}
        </div>

        {/* Intent Decomposition Preview Drawer */}
        {showDecompositionPreview && (
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-blue-400" />
                Atomic Test Intent Planner Preview ({decomposedActions.length + 1} steps)
              </span>
              <span className="text-[11px] text-slate-500">Autonomous Role-Based Locator Synthesis</span>
            </div>
            <div className="space-y-1.5">
              <div className="text-xs font-mono bg-slate-900 border border-slate-800/80 rounded px-2.5 py-1.5 text-slate-400 flex items-center gap-2">
                <span className="text-blue-400 font-bold">1.</span>
                <span>navigate → {intent.targetUrl || '<target-url>'}</span>
              </div>
              {decomposedActions.map((action, i) => (
                <div
                  key={i}
                  className="text-xs font-mono bg-slate-900 border border-slate-800/80 rounded px-2.5 py-1.5 text-slate-300 flex items-center gap-2"
                >
                  <span className="text-blue-400 font-bold">{i + 2}.</span>
                  <span>{action}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Verifiable Success Criteria */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-amber-400" />
              Verifiable Outcome / Success Criteria (Ground Truth)
            </span>
            <span className="text-[11px] text-slate-400">Enforces No-Fabrication Verification</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Heading with text 'Search Results' or badge showing active status"
            value={intent.customSuccessCriteria || ''}
            onChange={(e) => onChangeIntent({ customSuccessCriteria: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-xl text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition"
          />
        </div>

        {/* Action Button & Runtime Parameters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3">
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <div>
              <span className="font-medium text-slate-300">Timeout:</span> {intent.timeoutMs / 1000}s
            </div>
            <div>
              <span className="font-medium text-slate-300">Max Healing Retries:</span> {intent.maxRetries}
            </div>
          </div>

          <button
            onClick={onRunTest}
            disabled={!canRun}
            className={`w-full sm:w-auto px-6 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
              canRun
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/25 cursor-pointer active:scale-95'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none border border-slate-700/40'
            }`}
          >
            {isRunning ? (
              <>
                <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>Executing Test Engine...</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-current" />
                <span>Run HealTest Engine</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
