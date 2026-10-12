import React, { useEffect, useState, useCallback } from 'react';
import {
  BarChart2,
  Wrench,
  AlertTriangle,
  RefreshCw,
  Code2,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  GitCompare,
  Brain,
  Layers,
} from 'lucide-react';
import type { TestRun } from '../types';
import { apiService } from '../services/api';

interface AnalyticsPageProps {
  runs: TestRun[];
}

interface RootCauseEntry {
  category: string;
  count: number;
  percentage: number;
}

interface ComponentHealMetric {
  componentName: string;
  healCount: number;
  failCount: number;
  lastHealedAt: string;
  topStrategies: string[];
}

interface LocatorFailure {
  locator: string;
  occurrences: number;
  lastFailedAt: string;
}

interface HealingAnalytics {
  totalRunsExecuted: number;
  cleanPassCount: number;
  healedCount: number;
  failedCount: number;
  inconclusiveCount: number;
  overallHealingSuccessRatePercent: number;
  repeatedLocatorFailures: LocatorFailure[];
  frequentlyHealedComponents: ComponentHealMetric[];
  recurringRootCauses: RootCauseEntry[];
  suggestedMaintenanceTests: Array<{
    testId: string;
    reason: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

interface DiffLine {
  type: 'add' | 'delete' | 'context';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

interface SourceDiff {
  versionAId: string;
  versionBId: string;
  isAvailable: boolean;
  unavailableNotice?: string;
  filesChanged: Array<{
    filePath: string;
    addedLinesCount: number;
    removedLinesCount: number;
    detectedAttributeChanges: Array<{
      element: string;
      attribute: string;
      oldValue: string;
      newValue: string;
      changeType: string;
    }>;
    lines: DiffLine[];
    correlationReasoning: string;
  }>;
  summary: {
    totalFiles: number;
    totalAdditions: number;
    totalDeletions: number;
    primaryImpactComponent?: string;
  };
  explanation?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  LOCATOR_MISMATCH: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60',
  ACCESSIBLE_NAME_OR_ATTRIBUTE_CHANGE: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/60',
  MISSING_OR_UNEXPECTED_ELEMENT: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60',
  TIMING_OR_SYNCHRONIZATION_ISSUE: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800/60',
  NAVIGATION_OR_NETWORK_FAILURE: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800/60',
  APPLICATION_LOGIC_OR_ASSERTION_FAILURE: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800/60',
  TEST_SETUP_OR_INFRASTRUCTURE_FAILURE: 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800/60',
  UNKNOWN_OR_INSUFFICIENT_EVIDENCE: 'text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/40 border-gray-200 dark:border-gray-800/60',
  NONE: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60',
};

const CATEGORY_LABELS: Record<string, string> = {
  LOCATOR_MISMATCH: 'Locator Mismatch',
  ACCESSIBLE_NAME_OR_ATTRIBUTE_CHANGE: 'Attribute Change',
  MISSING_OR_UNEXPECTED_ELEMENT: 'Missing Element',
  TIMING_OR_SYNCHRONIZATION_ISSUE: 'Timing Issue',
  NAVIGATION_OR_NETWORK_FAILURE: 'Network Failure',
  APPLICATION_LOGIC_OR_ASSERTION_FAILURE: 'App Logic Failure',
  TEST_SETUP_OR_INFRASTRUCTURE_FAILURE: 'Infrastructure Error',
  UNKNOWN_OR_INSUFFICIENT_EVIDENCE: 'Unknown',
  NONE: 'Clean Pass',
};

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ runs }) => {
  const [analytics, setAnalytics] = useState<HealingAnalytics | null>(null);
  const [diff, setDiff] = useState<SourceDiff | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [loadingDiff, setLoadingDiff] = useState(false);
  const [expandedDiffFile, setExpandedDiffFile] = useState<string | null>(null);
  const [diffError, setDiffError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setLoadingAnalytics(true);
    try {
      const data = await apiService.getAnalytics();
      setAnalytics(data);
    } catch (err: any) {
      console.warn('Analytics load failed:', err.message);
    } finally {
      setLoadingAnalytics(false);
    }
  }, []);

  const fetchDiff = useCallback(async () => {
    setLoadingDiff(true);
    setDiffError(null);
    try {
      const data = await apiService.getSourceDiff('v1.0.0 (Baseline)', 'v2.0.0 (Mutated UI)');
      setDiff(data);
    } catch (err: any) {
      setDiffError(err.message);
    } finally {
      setLoadingDiff(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
    fetchDiff();
  }, [fetchAnalytics, fetchDiff, runs.length]);

  const overallRate = analytics?.overallHealingSuccessRatePercent ?? (runs.length > 0
    ? Math.round(((runs.filter(r => r.status === 'PASSED').length + runs.filter(r => r.status === 'HEALED').length) / runs.length) * 100)
    : 100);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="card-gradient-border bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-[#4C1A57] dark:text-[#BAB0D4] border border-purple-200 dark:border-purple-800/60">
                <BarChart2 className="h-4 w-4" />
              </span>
              <span className="text-xs font-semibold text-[#76518A] dark:text-[#BAB0D4] uppercase tracking-wider">
                Healing Memory & Analytics
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mt-1.5">
              AI Diagnostic Intelligence Dashboard
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              Historical analysis of self-healing patterns, root cause classifications, and source code change impact across all executed test runs.
            </p>
          </div>
          <button
            onClick={() => { fetchAnalytics(); fetchDiff(); }}
            disabled={loadingAnalytics}
            className="btn-primary-gradient flex items-center gap-2 px-4 py-2.5 rounded-lg disabled:opacity-50 text-white text-xs font-semibold shadow-md transition cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingAnalytics ? 'animate-spin' : ''}`} />
            Refresh Analytics
          </button>
        </div>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total Runs', value: analytics?.totalRunsExecuted ?? runs.length, color: 'text-slate-900 dark:text-white' },
          { label: 'Clean Pass', value: analytics?.cleanPassCount ?? runs.filter(r => r.status === 'PASSED').length, color: 'text-emerald-600 dark:text-emerald-300' },
          { label: 'Healed', value: analytics?.healedCount ?? runs.filter(r => r.status === 'HEALED').length, color: 'text-amber-600 dark:text-amber-300' },
          { label: 'Failed', value: analytics?.failedCount ?? runs.filter(r => r.status === 'FAILED' || r.status === 'ERROR').length, color: 'text-rose-600 dark:text-rose-300' },
          { label: 'Success Rate', value: `${overallRate}%`, color: 'text-[#4C1A57] dark:text-[#BAB0D4]' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card-gradient-border bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">{label}</div>
            <div className={`text-2xl font-bold font-mono mt-1.5 ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Root Cause Classifications */}
        <div className="card-gradient-border bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
            <Brain className="h-4 w-4 text-[#76518A] dark:text-[#BAB0D4]" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Root Cause Classification</h2>
          </div>
          {loadingAnalytics ? (
            <div className="text-xs text-slate-400 dark:text-slate-500 text-center py-8">Loading analytics...</div>
          ) : (analytics?.recurringRootCauses ?? []).length === 0 ? (
            <div className="text-xs text-slate-400 dark:text-slate-500 text-center py-8">
              No failure data yet. Run tests to populate root cause analysis.
            </div>
          ) : (
            <div className="space-y-2">
              {(analytics?.recurringRootCauses ?? []).map((entry) => (
                <div key={entry.category} className="flex items-center gap-3">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono border ${CATEGORY_COLORS[entry.category] || CATEGORY_COLORS.NONE}`}>
                    {CATEGORY_LABELS[entry.category] || entry.category}
                  </span>
                  <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-purple-500 dark:bg-purple-400 h-1.5 rounded-full transition-all"
                      style={{ width: `${entry.percentage}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-slate-600 dark:text-slate-400 w-8 text-right">{entry.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Frequently Healed Components */}
        <div className="card-gradient-border bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
            <Wrench className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Frequently Healed Components</h2>
          </div>
          {loadingAnalytics ? (
            <div className="text-xs text-slate-400 dark:text-slate-500 text-center py-8">Loading...</div>
          ) : (analytics?.frequentlyHealedComponents ?? []).length === 0 ? (
            <div className="text-xs text-slate-400 dark:text-slate-500 text-center py-8">
              No healed components yet. Run self-healing tests to see patterns.
            </div>
          ) : (
            <div className="space-y-2.5">
              {(analytics?.frequentlyHealedComponents ?? []).map((comp) => (
                <div key={comp.componentName} className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-amber-900 dark:text-amber-300 truncate max-w-[180px]">{comp.componentName}</span>
                    <span className="text-xs bg-amber-200 dark:bg-amber-400/20 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded font-bold">
                      {comp.healCount}× healed
                    </span>
                  </div>
                  <div className="text-xs text-amber-700/70 dark:text-amber-400/70 mt-1 font-mono">
                    {comp.topStrategies.join(', ')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Repeated Locator Failures */}
      {(analytics?.repeatedLocatorFailures ?? []).length > 0 && (
        <div className="card-gradient-border bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
            <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Repeated Locator Failures</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-500 dark:text-slate-400 font-mono border-b border-slate-100 dark:border-slate-800">
                  <th className="pb-2 font-semibold">LOCATOR</th>
                  <th className="pb-2 font-semibold">OCCURRENCES</th>
                  <th className="pb-2 font-semibold">LAST FAILED</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {(analytics?.repeatedLocatorFailures ?? []).map((f) => (
                  <tr key={f.locator} className="hover:bg-rose-50/40 dark:hover:bg-rose-950/20 transition">
                    <td className="py-2.5 pr-4 font-mono text-slate-900 dark:text-slate-200 max-w-xs truncate">{f.locator}</td>
                    <td className="py-2.5 pr-4">
                      <span className="bg-rose-100 dark:bg-rose-400/20 text-rose-800 dark:text-rose-300 px-2 py-0.5 rounded font-bold">{f.occurrences}</span>
                    </td>
                    <td className="py-2.5 text-slate-500 dark:text-slate-400 font-mono">
                      {f.lastFailedAt ? new Date(f.lastFailedAt).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Maintenance Suggestions */}
      {(analytics?.suggestedMaintenanceTests ?? []).length > 0 && (
        <div className="card-gradient-border bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
            <Layers className="h-4 w-4 text-[#76518A] dark:text-[#BAB0D4]" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">AI Maintenance Recommendations</h2>
          </div>
          <div className="space-y-3">
            {(analytics?.suggestedMaintenanceTests ?? []).map((s, idx) => (
              <div key={idx} className={`border rounded-lg p-3 text-xs ${
                s.priority === 'high' ? 'border-rose-200 dark:border-rose-800/40 bg-rose-50/40 dark:bg-rose-950/20' :
                s.priority === 'medium' ? 'border-amber-200 dark:border-amber-800/40 bg-amber-50/40 dark:bg-amber-950/20' :
                'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  {s.priority === 'high' ? <XCircle className="h-3.5 w-3.5 text-rose-500" /> : <CheckCircle2 className="h-3.5 w-3.5 text-amber-500" />}
                  <span className={`font-bold uppercase text-xs ${s.priority === 'high' ? 'text-rose-700 dark:text-rose-300' : 'text-amber-700 dark:text-amber-300'}`}>
                    {s.priority} priority
                  </span>
                </div>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{s.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Source Code Diff Panel */}
      <div className="card-gradient-border bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <GitCompare className="h-4 w-4 text-[#76518A] dark:text-[#BAB0D4]" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Source Code Diff — Change Impact Analysis</h2>
          </div>
          <button
            onClick={fetchDiff}
            disabled={loadingDiff}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#4C1A57]/10 dark:bg-[#4C1A57]/30 text-[#4C1A57] dark:text-[#BAB0D4] border border-[#BAB0D4]/30 hover:bg-[#4C1A57]/20 transition font-semibold cursor-pointer"
          >
            <RefreshCw className={`h-3 w-3 ${loadingDiff ? 'animate-spin' : ''}`} />
            Reload Diff
          </button>
        </div>

        {loadingDiff ? (
          <div className="text-center py-10 text-xs text-slate-400">Loading source diff...</div>
        ) : diffError ? (
          <div className="text-center py-10 text-xs text-rose-500">{diffError}</div>
        ) : !diff ? (
          <div className="text-center py-10 text-xs text-slate-400">No diff data available.</div>
        ) : !diff.isAvailable ? (
          <div className="rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 text-xs text-slate-500 dark:text-slate-400">
            <p className="font-semibold mb-1">Source Diff Unavailable</p>
            <p>{diff.unavailableNotice || 'No source snapshots provided for this target URL.'}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary banner */}
            <div className="flex flex-wrap gap-3 text-xs">
              <span className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2.5 py-1 font-mono">
                {diff.versionAId} → {diff.versionBId}
              </span>
              <span className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded px-2.5 py-1 text-emerald-700 dark:text-emerald-300 font-mono">
                +{diff.summary.totalAdditions} additions
              </span>
              <span className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded px-2.5 py-1 text-rose-700 dark:text-rose-300 font-mono">
                -{diff.summary.totalDeletions} deletions
              </span>
              {diff.summary.primaryImpactComponent && (
                <span className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded px-2.5 py-1 text-amber-700 dark:text-amber-300">
                  Component: {diff.summary.primaryImpactComponent}
                </span>
              )}
            </div>

            {diff.explanation && (
              <div className="bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/40 rounded-lg p-3 text-xs text-[#4C1A57] dark:text-[#BAB0D4] leading-relaxed">
                <span className="font-bold">Change Impact Analysis:</span> {diff.explanation}
              </div>
            )}

            {/* File diffs */}
            {diff.filesChanged.map((file) => (
              <div key={file.filePath} className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedDiffFile(expandedDiffFile === file.filePath ? null : file.filePath)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <Code2 className="h-3.5 w-3.5 text-[#76518A] dark:text-[#BAB0D4]" />
                    <span className="text-slate-900 dark:text-white font-semibold">{file.filePath}</span>
                    <span className="text-emerald-600 dark:text-emerald-400">+{file.addedLinesCount}</span>
                    <span className="text-rose-600 dark:text-rose-400">-{file.removedLinesCount}</span>
                  </div>
                  {expandedDiffFile === file.filePath
                    ? <ChevronDown className="h-4 w-4 text-slate-400" />
                    : <ChevronRight className="h-4 w-4 text-slate-400" />}
                </button>

                {expandedDiffFile === file.filePath && (
                  <div>
                    {/* Attribute changes */}
                    {file.detectedAttributeChanges.length > 0 && (
                      <div className="px-4 py-3 bg-amber-50 dark:bg-amber-950/20 border-b border-amber-200 dark:border-amber-800/40">
                        <p className="text-xs font-bold text-amber-800 dark:text-amber-300 mb-2">Detected Attribute Changes:</p>
                        {file.detectedAttributeChanges.map((attr, i) => (
                          <div key={i} className="text-xs font-mono text-amber-900 dark:text-amber-200 mb-1">
                            <span className="text-amber-600 dark:text-amber-400">{attr.element}</span>
                            {' '}{attr.attribute}:{' '}
                            <span className="bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 px-1 rounded">{attr.oldValue}</span>
                            {' → '}
                            <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-1 rounded">{attr.newValue}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Diff lines */}
                    <div className="font-mono text-xs overflow-x-auto max-h-80">
                      {file.lines.slice(0, 200).map((line, idx) => (
                        <div
                          key={idx}
                          className={`flex px-4 py-0.5 ${
                            line.type === 'add' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300' :
                            line.type === 'delete' ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300' :
                            'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <span className="w-8 text-slate-400 dark:text-slate-600 text-right mr-4 select-none shrink-0">
                            {line.oldLineNumber ?? line.newLineNumber ?? ''}
                          </span>
                          <span className="mr-2 select-none shrink-0">
                            {line.type === 'add' ? '+' : line.type === 'delete' ? '-' : ' '}
                          </span>
                          <span className="whitespace-pre">{line.content}</span>
                        </div>
                      ))}
                    </div>

                    {file.correlationReasoning && (
                      <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-600 dark:text-slate-400">
                        <span className="font-semibold">Correlation: </span>{file.correlationReasoning}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
