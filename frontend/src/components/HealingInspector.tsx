import React from 'react';
import { Wrench, ArrowRight, CheckCircle2, AlertTriangle, GitCompare, Sparkles, ShieldCheck } from 'lucide-react';
import type { HealingRecord } from '../types';

interface HealingInspectorProps {
  healingRecords: HealingRecord[];
}

export const HealingInspector: React.FC<HealingInspectorProps> = ({ healingRecords }) => {
  if (healingRecords.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl text-center">
        <ShieldCheck className="h-10 w-10 text-emerald-400 mx-auto mb-2 opacity-80" />
        <h3 className="text-base font-bold text-white">No Self-Healing Interventions Required</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
          All generated actions matched the live accessible DOM perfectly on initial attempt without requiring dynamic recovery.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-amber-500/5 blur-3xl pointer-events-none rounded-full" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Wrench className="h-5 w-5" />
            </span>
            <h3 className="text-base font-bold text-white">
              Autonomous Self-Healing Deep Dive ({healingRecords.length} Event{healingRecords.length > 1 ? 's' : ''})
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time DOM analysis, candidate synthesis, confidence ranking, and action mutation report.
          </p>
        </div>

        <span className="self-start sm:self-auto px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
          Autonomous Recovery Verified
        </span>
      </div>

      <div className="space-y-6">
        {healingRecords.map((record) => (
          <div
            key={record.id}
            className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 space-y-5"
          >
            {/* Failure Breakdown & Explanation */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-rose-400 flex items-center gap-1.5 mb-1.5">
                  <AlertTriangle className="h-4 w-4" />
                  Failed Initial Action (Step #{record.stepIndex + 1})
                </div>
                <div className="text-xs text-rose-200 font-mono mb-2">
                  Action: <span className="font-bold">{record.originalAction.type}</span> | Selector: {JSON.stringify(record.originalAction.selector)}
                </div>
                <div className="text-xs text-rose-300">
                  <span className="font-semibold">Reason:</span> {record.failureReason}
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 mb-1.5">
                  <Sparkles className="h-4 w-4" />
                  Healing Strategy Explanation
                </div>
                <p className="text-xs text-amber-200 leading-relaxed">
                  {record.explanation}
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs text-amber-300 font-mono">
                  <span>Confidence Score:</span>
                  <span className="font-bold text-amber-400">{Math.round(record.confidenceScore * 100)}%</span>
                  <div className="w-24 h-2 bg-slate-900 rounded-full overflow-hidden ml-1 border border-amber-500/30">
                    <div
                      className="h-full bg-amber-400 rounded-full"
                      style={{ width: `${record.confidenceScore * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Detected UI Changes: Old vs New DOM Diff */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-3 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <GitCompare className="h-4 w-4 text-blue-400" />
                  Detected Live UI / DOM Mutation
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-amber-500/20">
                  Change Type: {record.detectedDomChanges.changeType}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                <div>
                  <div className="text-[11px] text-rose-400 font-bold mb-1 flex items-center gap-1">
                    <span>— Expected Original Element:</span>
                  </div>
                  <pre className="bg-slate-950 p-3 rounded-lg border border-rose-500/30 text-rose-300 overflow-x-auto whitespace-pre-wrap">
                    {record.detectedDomChanges.previousExpected}
                  </pre>
                </div>

                <div>
                  <div className="text-[11px] text-emerald-400 font-bold mb-1 flex items-center gap-1">
                    <span>+ Actual Inspected Live Element:</span>
                  </div>
                  <pre className="bg-slate-950 p-3 rounded-lg border border-emerald-500/30 text-emerald-300 overflow-x-auto whitespace-pre-wrap">
                    {record.detectedDomChanges.actualDetected}
                  </pre>
                </div>
              </div>
            </div>

            {/* Action Mutation Side-by-Side */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-1.5">
                <ArrowRight className="h-4 w-4 text-emerald-400" />
                Action Selector Mutation
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1">
                    Original Broken Target
                  </span>
                  <div className="font-mono text-xs text-rose-300">
                    {record.originalAction.selector.name ? (
                      <div>getByRole('{record.originalAction.selector.role || 'element'}', &#123; name: '{record.originalAction.selector.name}' &#125;)</div>
                    ) : (
                      <div>{JSON.stringify(record.originalAction.selector)}</div>
                    )}
                  </div>
                </div>

                <div className="bg-emerald-950/20 p-3 rounded-lg border border-emerald-500/30">
                  <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block mb-1">
                    Autonomous Repaired Target (Active)
                  </span>
                  <div className="font-mono text-xs text-emerald-300">
                    {record.chosenAlternative.selector.name ? (
                      <div>getByRole('{record.chosenAlternative.selector.role || 'element'}', &#123; name: '{record.chosenAlternative.selector.name}' &#125;)</div>
                    ) : (
                      <div>{JSON.stringify(record.chosenAlternative.selector)}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Candidates Evaluated Matrix */}
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                <span>Evaluation Matrix ({record.candidatesEvaluated.length} Candidate Elements Evaluated)</span>
                <span className="text-[11px] text-slate-500">Unambiguous Match Filter Applied</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-800 rounded-lg overflow-hidden">
                  <thead className="bg-slate-950 text-slate-400 font-mono text-[11px]">
                    <tr>
                      <th className="p-2.5">Candidate Strategy</th>
                      <th className="p-2.5">Selector Synthesized</th>
                      <th className="p-2.5">Confidence</th>
                      <th className="p-2.5">Decision</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 bg-slate-900/50">
                    {record.candidatesEvaluated.map((cand, cIdx) => {
                      const isChosen = cand.confidenceScore === record.chosenAlternative.confidenceScore;
                      return (
                        <tr
                          key={cIdx}
                          className={isChosen ? 'bg-amber-500/10 font-medium' : 'text-slate-400'}
                        >
                          <td className="p-2.5 font-mono text-slate-300">
                            {cand.strategy}
                          </td>
                          <td className="p-2.5 font-mono text-slate-300 truncate max-w-xs">
                            {cand.selector.name || cand.selector.cssFallback || cand.selector.text}
                          </td>
                          <td className="p-2.5">
                            <span
                              className={`font-mono font-bold ${
                                cand.confidenceScore > 0.8
                                  ? 'text-emerald-400'
                                  : cand.confidenceScore > 0.5
                                  ? 'text-amber-400'
                                  : 'text-slate-500'
                              }`}
                            >
                              {Math.round(cand.confidenceScore * 100)}%
                            </span>
                          </td>
                          <td className="p-2.5">
                            {isChosen ? (
                              <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px] font-bold">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Selected & Dispatched
                              </span>
                            ) : (
                              <span className="text-slate-500 text-[11px]">Discarded</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
