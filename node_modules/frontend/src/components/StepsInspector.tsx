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
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
            <Wrench className="h-3 w-3" />
            HEALED
          </span>
        );
      case 'passed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            <CheckCircle className="h-3 w-3" />
            PASS
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40">
            <XCircle className="h-3 w-3" />
            FAIL
          </span>
        );
      case 'running':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/40 animate-pulse">
            RUNNING
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-400">
            PENDING
          </span>
        );
    }
  };

  const getActionTypePill = (type: TestStep['type']) => {
    const map: Record<string, string> = {
      navigate: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      click: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      fill: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      assert_text: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      assert_visible: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wide border ${map[type] || 'bg-slate-800 text-slate-400'}`}>
        {type}
      </span>
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Compass className="h-5 w-5 text-blue-400" />
            Generated Atomic Steps & Execution Trace
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Decoupled actions executed via accessible roles and text—never site-specific rigid selectors.
          </p>
        </div>
        <span className="text-xs text-slate-400 font-mono">
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
                  ? 'border-amber-500/40 bg-amber-500/5'
                  : step.status === 'failed'
                  ? 'border-rose-500/40 bg-rose-500/5'
                  : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
              }`}
            >
              {/* Step Summary Bar */}
              <button
                type="button"
                onClick={() => toggleExpand(step.id)}
                className="w-full text-left px-4 py-3 flex items-center justify-between gap-3 focus:outline-none"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-slate-500 hover:text-slate-300">
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </span>
                  <span className="h-6 w-6 rounded-full bg-slate-800 text-slate-300 text-xs font-mono font-bold flex items-center justify-center shrink-0">
                    {step.order}
                  </span>
                  {getActionTypePill(step.type)}
                  <span className="text-sm font-medium text-slate-200 truncate">
                    {step.description}
                  </span>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-mono text-slate-400">
                    {step.durationMs}ms
                  </span>
                  {getStatusBadge(step.status)}
                </div>
              </button>

              {/* Expanded Details Drawer */}
              {isExpanded && (
                <div className="px-5 pb-4 pt-1 border-t border-slate-800/80 bg-slate-950/80 space-y-3">
                  {/* Accessibility Locator Breakdown */}
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                      <Code className="h-3.5 w-3.5 text-blue-400" />
                      Semantic Locator Synthesized
                    </div>
                    <div className="font-mono text-xs text-slate-300 bg-slate-950 p-2.5 rounded border border-slate-800 overflow-x-auto">
                      {step.selector.role && (
                        <div>
                          <span className="text-purple-400">role:</span> <span className="text-emerald-300">"{step.selector.role}"</span>
                        </div>
                      )}
                      {step.selector.name && (
                        <div>
                          <span className="text-purple-400">name / label:</span> <span className="text-emerald-300">"{step.selector.name}"</span>
                        </div>
                      )}
                      {step.selector.text && (
                        <div>
                          <span className="text-purple-400">text:</span> <span className="text-emerald-300">"{step.selector.text}"</span>
                        </div>
                      )}
                      {step.value && (
                        <div>
                          <span className="text-purple-400">dispatched value:</span> <span className="text-amber-300">"{step.value}"</span>
                        </div>
                      )}
                      {step.selector.cssFallback && (
                        <div>
                          <span className="text-purple-400">css fallback:</span> <span className="text-slate-400">"{step.selector.cssFallback}"</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Failure Message & Recovery Trigger */}
                  {step.error && (
                    <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 text-xs text-rose-300">
                      <div className="font-semibold mb-1 flex items-center gap-1.5 text-rose-400">
                        <XCircle className="h-4 w-4" />
                        Target Action Exception
                      </div>
                      <div className="font-mono text-[11px]">{step.error}</div>
                    </div>
                  )}

                  {/* Healed step banner */}
                  {step.status === 'healed' && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Wrench className="h-4 w-4 text-amber-400 shrink-0" />
                        <span>
                          Action failed on initial attempt but was autonomously healed by inspecting live DOM changes.
                        </span>
                      </div>
                      {onSelectHealingStep && (
                        <button
                          onClick={() => onSelectHealingStep(step.id)}
                          className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded text-amber-300 text-xs font-semibold shrink-0 cursor-pointer"
                        >
                          View Healing Diff →
                        </button>
                      )}
                    </div>
                  )}

                  {/* DOM snapshot excerpt */}
                  {step.domSnapshotExcerpt && (
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
                        <Eye className="h-3.5 w-3.5 text-blue-400" />
                        Inspected Element DOM Snapshot
                      </div>
                      <pre className="text-xs font-mono bg-slate-900 border border-slate-800 p-2.5 rounded text-slate-300 overflow-x-auto">
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
