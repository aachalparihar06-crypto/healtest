import React, { useState } from 'react';
import { CheckCircle, XCircle, Wrench, ChevronDown, ChevronRight, Eye, Code, Compass } from 'lucide-react';
import type { TestStep } from '../types';

interface StepsInspectorProps {
  steps: TestStep[];
  onSelectHealingStep?: (stepId: string) => void;
}

export const StepsInspector: React.FC<StepsInspectorProps> = ({
  steps,
  onSelectHealingStep,
}) => {
  const [expandedStepId, setExpandedStepId] = useState<string | null>(
    steps.find((s) => s.status === 'healed')?.id || steps[0]?.id || null
  );

  const toggleExpand = (id: string) => {
    setExpandedStepId(expandedStepId === id ? null : id);
  };

  const getStatusBadge = (status: TestStep['status']) => {
    switch (status) {
      case 'healed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
            <Wrench className="h-3 w-3" />
            HEALED
          </span>
        );
      case 'passed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
            <CheckCircle className="h-3 w-3" />
            PASS
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60">
            <XCircle className="h-3 w-3" />
            FAIL
          </span>
        );
      case 'running':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60 animate-pulse">
            RUNNING
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800/60">
            <XCircle className="h-3 w-3" />
            ERROR
          </span>
        );
      case 'blocked':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
            BLOCKED
          </span>
        );
      case 'skipped':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            SKIPPED
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            PENDING
          </span>
        );
    }
  };

  const getActionTypePill = (type: TestStep['type']) => {
    const map: Record<string, string> = {
      navigate: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/50',
      click: 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800/50',
      fill: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50',
      assert_text: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/50',
      assert_visible: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/50',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-mono uppercase tracking-wide border ${map[type] || 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'}`}>
        {type}
      </span>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs transition-colors">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Compass className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            Generated Atomic Steps & Execution Trace
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Decoupled actions executed via accessible roles and text—never site-specific rigid selectors.
          </p>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
          {steps.length} {steps.length === 1 ? 'Action' : 'Actions'}
        </span>
      </div>

      <div className="space-y-3">
        {steps.map((step) => {
          const isExpanded = expandedStepId === step.id;
          return (
            <div
              key={step.id}
              className={`border rounded-xl transition-all overflow-hidden ${
                step.status === 'healed'
                  ? 'border-amber-300 dark:border-amber-500/40 bg-amber-50/30 dark:bg-amber-500/5'
                  : step.status === 'failed'
                  ? 'border-rose-300 dark:border-rose-500/40 bg-rose-50/30 dark:bg-rose-500/5'
                  : step.status === 'error'
                  ? 'border-orange-300 dark:border-orange-500/40 bg-orange-50/30 dark:bg-orange-500/5'
                  : step.status === 'blocked'
                  ? 'border-slate-300 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/50 opacity-80'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {/* Step Summary Bar */}
              <button
                type="button"
                onClick={() => toggleExpand(step.id)}
                className="w-full text-left px-4 py-3 flex items-center justify-between gap-3 focus:outline-none"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300">
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </span>
                  <span className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-mono font-bold flex items-center justify-center shrink-0">
                    {step.order}
                  </span>
                  {getActionTypePill(step.type)}
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                    {step.description}
                  </span>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    {step.durationMs}ms
                  </span>
                  {getStatusBadge(step.status)}
                </div>
              </button>

              {/* Expanded Details Drawer */}
              {isExpanded && (
                <div className="px-5 pb-4 pt-2 border-t border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-950/80 space-y-3">
                  {/* Accessibility Locator Breakdown */}
                  <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                      <Code className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                      Semantic Locator Synthesized
                    </div>
                    <div className="font-mono text-xs text-slate-800 dark:text-slate-300 bg-white dark:bg-slate-950 p-2.5 rounded border border-slate-200 dark:border-slate-800 overflow-x-auto space-y-0.5">
                      {step.selector.role && (
                        <div>
                          <span className="text-teal-700 dark:text-teal-400 font-semibold">role:</span> <span className="text-emerald-700 dark:text-emerald-300">"{step.selector.role}"</span>
                        </div>
                      )}
                      {step.selector.name && (
                        <div>
                          <span className="text-teal-700 dark:text-teal-400 font-semibold">name / label:</span> <span className="text-emerald-700 dark:text-emerald-300">"{step.selector.name}"</span>
                        </div>
                      )}
                      {step.selector.text && (
                        <div>
                          <span className="text-teal-700 dark:text-teal-400 font-semibold">text:</span> <span className="text-emerald-700 dark:text-emerald-300">"{step.selector.text}"</span>
                        </div>
                      )}
                      {step.value && (
                        <div>
                          <span className="text-teal-700 dark:text-teal-400 font-semibold">dispatched value:</span> <span className="text-amber-700 dark:text-amber-300 font-semibold">"{step.value}"</span>
                        </div>
                      )}
                      {step.selector.cssFallback && (
                        <div>
                          <span className="text-teal-700 dark:text-teal-400 font-semibold">css fallback:</span> <span className="text-slate-600 dark:text-slate-400">"{step.selector.cssFallback}"</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Failure Message & Recovery Trigger */}
                  {step.error && (
                    <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-lg p-3 text-xs text-rose-800 dark:text-rose-300">
                      <div className="font-semibold mb-1 flex items-center gap-1.5 text-rose-700 dark:text-rose-400">
                        <XCircle className="h-4 w-4" />
                        Target Action Exception
                      </div>
                      <div className="font-mono text-xs">{step.error}</div>
                    </div>
                  )}

                  {/* Healed step banner */}
                  {step.status === 'healed' && (
                    <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg p-3 text-xs text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Wrench className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>
                          Action failed on initial attempt but was autonomously healed by inspecting live DOM changes.
                        </span>
                      </div>
                      {onSelectHealingStep && (
                        <button
                          onClick={() => onSelectHealingStep(step.id)}
                          className="px-3 py-1 bg-amber-100 hover:bg-amber-200 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 border border-amber-300 dark:border-amber-500/40 rounded text-amber-800 dark:text-amber-300 text-xs font-semibold shrink-0 cursor-pointer self-start sm:self-auto"
                        >
                          View Healing Diff →
                        </button>
                      )}
                    </div>
                  )}

                  {/* DOM snapshot excerpt */}
                  {step.domSnapshotExcerpt && (
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1.5">
                        <Eye className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                        Inspected Element DOM Snapshot
                      </div>
                      <pre className="text-xs font-mono bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded text-slate-800 dark:text-slate-300 overflow-x-auto">
                        {step.domSnapshotExcerpt}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
