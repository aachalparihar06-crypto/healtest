import React, { useState } from 'react';
import { 
  Search, 
  RefreshCw, 
  AlertCircle, 
  MousePointer, 
  FormInput, 
  Link, 
  Heading, 
  Plus, 
  Clock, 
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import type { DomInspectionResult } from '../types';

interface LiveInspectionPanelProps {
  inspection: DomInspectionResult | null;
  isInspecting: boolean;
  inspectError: string | null;
  onInspect: () => void;
  onAddActionToInstruction: (action: string) => void;
  targetUrl: string;
}

type ElementFilterTab = 'all' | 'buttons' | 'inputs' | 'links' | 'text';

export const LiveInspectionPanel: React.FC<LiveInspectionPanelProps> = ({
  inspection,
  isInspecting,
  inspectError,
  onInspect,
  onAddActionToInstruction,
  targetUrl,
}) => {
  const [activeTab, setActiveTab] = useState<ElementFilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedHtmlIdx, setExpandedHtmlIdx] = useState<number | null>(null);

  const cleanTargetUrl = targetUrl.trim();

  // If inspection is not yet run
  if (!inspection && !isInspecting && !inspectError) {
    return (
      <div className="card-gradient-border bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm text-center transition-colors">
        <div className="max-w-md mx-auto py-6">
          <div className="h-12 w-12 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 text-[#4C1A57] dark:text-[#BAB0D4] mx-auto flex items-center justify-center mb-4 shadow-sm">
            <Search className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1.5">
            Live Page & DOM Inspection
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-5">
            Inspect the live website using Playwright to extract page title, accessible roles, aria labels, interactive buttons, form inputs, links, and DOM elements.
          </p>
          <button
            type="button"
            disabled={!cleanTargetUrl}
            onClick={onInspect}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
              cleanTargetUrl
                ? 'btn-primary-gradient text-white shadow-md cursor-pointer active:scale-95'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700'
            }`}
          >
            <Search className="h-4 w-4" />
            <span>Inspect Live DOM with Playwright</span>
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (isInspecting) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 shadow-xs text-center transition-colors">
        <div className="h-9 w-9 rounded-full border-2 border-teal-200 dark:border-teal-800/40 border-t-teal-600 dark:border-t-teal-400 animate-spin mx-auto mb-4" />
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
          Playwright Live Inspection in Progress...
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
          Opening target URL: {cleanTargetUrl}
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
          Inspecting accessible roles, buttons, textboxes, links, and console errors...
        </p>
      </div>
    );
  }

  // Error state
  if (inspectError && !inspection) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 rounded-xl p-6 shadow-xs transition-colors">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-rose-900 dark:text-rose-300 mb-1">
              Live Inspection Failed
            </h3>
            <p className="text-xs text-rose-700 dark:text-rose-400/90 font-mono mb-3">
              {inspectError}
            </p>
            <button
              type="button"
              onClick={onInspect}
              className="px-3.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-semibold border border-rose-200 dark:border-rose-800 transition"
            >
              Retry Inspection
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!inspection) return null;

  // Filter elements by active tab and search query
  const filteredElements = inspection.elements.filter((el) => {
    // Tab filter
    if (activeTab === 'buttons') {
      if (el.role !== 'button' && el.tagName !== 'button' && !(el.tagName === 'input' && (el.type === 'submit' || el.type === 'button'))) return false;
    } else if (activeTab === 'inputs') {
      if ((el.tagName === 'input' && (el.type === 'submit' || el.type === 'button' || el.type === 'reset')) ||
          (el.tagName !== 'input' && el.tagName !== 'textarea' && el.tagName !== 'select' && el.role !== 'textbox' && el.role !== 'combobox')) return false;
    } else if (activeTab === 'links') {
      if (el.role !== 'link' && el.tagName !== 'a') return false;
    } else if (activeTab === 'text') {
      if (el.role !== 'heading' && el.role !== 'status' && !/^h[1-6]$/.test(el.tagName)) return false;
    }

    // Search query filter
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (el.innerText && el.innerText.toLowerCase().includes(q)) ||
      (el.label && el.label.toLowerCase().includes(q)) ||
      (el.ariaLabel && el.ariaLabel.toLowerCase().includes(q)) ||
      (el.placeholder && el.placeholder.toLowerCase().includes(q)) ||
      (el.id && el.id.toLowerCase().includes(q)) ||
      (el.name && el.name.toLowerCase().includes(q)) ||
      el.tagName.toLowerCase().includes(q) ||
      (el.role && el.role.toLowerCase().includes(q)) ||
      (el.type && el.type.toLowerCase().includes(q))
    );
  });

  return (
    <div className="card-gradient-border bg-white dark:bg-slate-900 rounded-xl shadow-sm overflow-hidden transition-colors animate-fadeIn">
      {/* Inspection Header */}
      <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-[#4C1A57] dark:text-[#BAB0D4] border border-purple-200 dark:border-purple-800/50">
                <Search className="h-4 w-4" />
              </span>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white tracking-tight">
                Live DOM & Accessibility Inspection Results
              </h2>
              {inspection.httpStatus && (
                <span className={`text-xs font-mono px-2 py-0.5 rounded-full border ${
                  inspection.httpStatus < 400
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/50'
                }`}>
                  HTTP {inspection.httpStatus}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-mono">
              <span>Title: <strong className="text-slate-800 dark:text-slate-200 font-sans">{inspection.pageTitle || '(No Title)'}</strong></span>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <span className="truncate max-w-sm">Resolved: <strong className="text-slate-700 dark:text-slate-300">{inspection.finalUrl}</strong></span>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                <Clock className="h-3 w-3" />
                <span>{inspection.durationMs}ms</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onInspect}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium transition border border-slate-200 dark:border-slate-700 shadow-xs cursor-pointer"
              title="Re-run live DOM inspection"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Re-inspect</span>
            </button>
          </div>
        </div>

        {/* Element Summary Metric Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mt-4 pt-3.5 border-t border-slate-200 dark:border-slate-800">
          <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="text-xs uppercase font-medium text-slate-500 dark:text-slate-400">Total Elements</div>
            <div className="text-base font-semibold text-slate-900 dark:text-white mt-0.5 font-mono">{inspection.summary.totalElements}</div>
          </div>
          <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="text-xs uppercase font-medium text-[#76518A] dark:text-[#BAB0D4] flex items-center gap-1">
              <MousePointer className="h-3 w-3" />
              <span>Buttons</span>
            </div>
            <div className="text-base font-semibold text-slate-900 dark:text-white mt-0.5 font-mono">{inspection.summary.buttonsCount}</div>
          </div>
          <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="text-xs uppercase font-medium text-[#4C1A57] dark:text-[#BAB0D4] flex items-center gap-1">
              <FormInput className="h-3 w-3" />
              <span>Inputs</span>
            </div>
            <div className="text-base font-semibold text-slate-900 dark:text-white mt-0.5 font-mono">{inspection.summary.inputsCount}</div>
          </div>
          <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="text-xs uppercase font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1">
              <Link className="h-3 w-3" />
              <span>Links</span>
            </div>
            <div className="text-base font-semibold text-slate-900 dark:text-white mt-0.5 font-mono">{inspection.summary.linksCount}</div>
          </div>
          <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="text-xs uppercase font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1">
              <Heading className="h-3 w-3" />
              <span>Semantic Text</span>
            </div>
            <div className="text-base font-semibold text-slate-900 dark:text-white mt-0.5 font-mono">{inspection.summary.textElementsCount}</div>
          </div>
        </div>
      </div>

      {/* Target Console Errors (if any) */}
      {inspection.errors.length > 0 && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border-b border-rose-200 dark:border-rose-900/40 text-xs text-rose-800 dark:text-rose-300">
          <div className="font-semibold text-rose-700 dark:text-rose-400 mb-1 flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>Target Page Browser / Console Errors ({inspection.errors.length}):</span>
          </div>
          <div className="space-y-1 font-mono text-xs max-h-24 overflow-y-auto">
            {inspection.errors.map((err, idx) => (
              <div key={idx} className="bg-white/80 dark:bg-rose-950/40 p-2 rounded border border-rose-200 dark:border-rose-900/50">
                {err}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Tabs and Search Bar */}
      <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Category Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-1 text-xs w-full sm:w-auto overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-md font-medium transition shrink-0 ${
              activeTab === 'all'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            All ({inspection.elements.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('buttons')}
            className={`px-3 py-1.5 rounded-md font-medium transition shrink-0 ${
              activeTab === 'buttons'
                ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Buttons ({inspection.summary.buttonsCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('inputs')}
            className={`px-3 py-1.5 rounded-md font-medium transition shrink-0 ${
              activeTab === 'inputs'
                ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Inputs ({inspection.summary.inputsCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('links')}
            className={`px-3 py-1.5 rounded-md font-medium transition shrink-0 ${
              activeTab === 'links'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Links ({inspection.summary.linksCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('text')}
            className={`px-3 py-1.5 rounded-md font-medium transition shrink-0 ${
              activeTab === 'text'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Headings ({inspection.summary.textElementsCount})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter elements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-teal-500 transition font-mono"
          />
        </div>
      </div>

      {/* Elements Table / Cards */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800/80 max-h-[460px] overflow-y-auto">
        {filteredElements.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
            No interactive elements matching filter criteria.
          </div>
        ) : (
          filteredElements.map((el, idx) => {
            const isExpanded = expandedHtmlIdx === idx;
            const elementLabel = el.label || el.ariaLabel || el.innerText || el.placeholder || el.name || el.id || el.tagName;

            return (
              <div
                key={idx}
                className="p-3.5 sm:p-4 hover:bg-slate-50 dark:hover:bg-slate-850/50 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    {/* Tag badge */}
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-mono text-xs font-semibold">
                      &lt;{el.tagName}&gt;
                    </span>

                    {/* Role badge */}
                    {el.role && (
                      <span className="px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/50 text-teal-700 dark:text-teal-400 font-mono text-xs">
                        role="{el.role}"
                      </span>
                    )}

                    {/* Type badge */}
                    {el.type && (
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-mono text-xs">
                        type="{el.type}"
                      </span>
                    )}

                    {/* Frame badge */}
                    {el.frameUrl && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 text-amber-700 dark:text-amber-400 font-mono text-xs">
                        iframe
                      </span>
                    )}

                    {/* ID badge */}
                    {el.id && (
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-mono text-xs">
                        #{el.id}
                      </span>
                    )}

                    {/* Status badge */}
                    {!el.isEnabled && (
                      <span className="px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-xs font-mono border border-rose-200 dark:border-rose-900/40">
                        disabled
                      </span>
                    )}
                  </div>

                  {/* Primary text / label */}
                  <div className="text-slate-900 dark:text-slate-200 font-medium truncate flex items-center gap-2">
                    <span>"{elementLabel}"</span>
                    {el.placeholder && el.placeholder !== elementLabel && (
                      <span className="text-xs text-slate-400 dark:text-slate-500 font-normal font-mono truncate">
                        (placeholder: "{el.placeholder}")
                      </span>
                    )}
                    {el.label && el.label !== elementLabel && (
                      <span className="text-xs text-teal-600 dark:text-teal-400 font-normal font-mono truncate">
                        (label: "{el.label}")
                      </span>
                    )}
                  </div>

                  {/* Expandable Outer HTML */}
                  <div className="mt-1.5">
                    <button
                      type="button"
                      onClick={() => setExpandedHtmlIdx(isExpanded ? null : idx)}
                      className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1 transition"
                    >
                      {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                      <span className="font-mono">outerHTML</span>
                    </button>
                    {isExpanded && (
                      <div className="mt-1.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-700 dark:text-slate-300 break-all max-h-32 overflow-y-auto">
                        {el.outerHtml}
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Action: Insert into Test Instruction */}
                {el.suggestedAction && (
                  <button
                    type="button"
                    onClick={() => onAddActionToInstruction(el.suggestedAction!)}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/40 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800/60 text-xs font-medium transition active:scale-95 shadow-xs"
                    title={`Append '${el.suggestedAction}' to test instruction`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Use in Test</span>
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
