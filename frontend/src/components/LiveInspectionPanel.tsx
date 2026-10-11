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
  ChevronRight,
  Check,
  Copy,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import type { DomInspectionResult } from '../types';

interface LiveInspectionPanelProps {
  inspection: DomInspectionResult | null;
  isInspecting: boolean;
  inspectError: string | null;
  onInspect: () => void;
  onAddActionToInstruction: (action: string) => void;
  targetUrl: string;
  defaultTab?: ElementFilterTab;
}

export type ElementFilterTab = 'buttons' | 'all' | 'inputs' | 'links' | 'text';

export const LiveInspectionPanel: React.FC<LiveInspectionPanelProps> = ({
  inspection,
  isInspecting,
  inspectError,
  onInspect,
  onAddActionToInstruction,
  targetUrl,
  defaultTab = 'buttons',
}) => {
  const [activeTab, setActiveTab] = useState<ElementFilterTab>(defaultTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedHtmlIdx, setExpandedHtmlIdx] = useState<number | null>(null);
  const [copiedSelectorIdx, setCopiedSelectorIdx] = useState<number | null>(null);

  const cleanTargetUrl = targetUrl.trim();

  const handleCopySelector = (selectorText: string, idx: number) => {
    navigator.clipboard.writeText(selectorText);
    setCopiedSelectorIdx(idx);
    setTimeout(() => {
      setCopiedSelectorIdx(null);
    }, 2000);
  };

  // If inspection is not yet run
  if (!inspection && !isInspecting && !inspectError) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs text-center transition-colors">
        <div className="max-w-md mx-auto py-6">
          <div className="h-12 w-12 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 text-teal-600 dark:text-teal-400 mx-auto flex items-center justify-center mb-4 shadow-xs">
            <MousePointer className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1.5">
            Live Button & DOM Inspection
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-5">
            Inspect the live website using Playwright to extract real interactive buttons, accessible names, roles, selectors, and enabled/disabled states.
          </p>
          <button
            type="button"
            disabled={!cleanTargetUrl}
            onClick={onInspect}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
              cleanTargetUrl
                ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-sm cursor-pointer active:scale-95'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700'
            }`}
          >
            <Search className="h-4 w-4" />
            <span>Extract Live Buttons with Playwright</span>
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
          Playwright Live Button Extraction in Progress...
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
          Inspecting live target: {cleanTargetUrl}
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
          Waiting for page readiness, resolving frames, extracting interactive buttons, accessible names, and live DOM states...
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
              Live DOM & Button Extraction Failed
            </h3>
            <p className="text-xs text-rose-700 dark:text-rose-400/90 font-mono mb-3 whitespace-pre-wrap">
              {inspectError}
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onInspect}
                className="px-3.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-semibold border border-rose-200 dark:border-rose-800 transition"
              >
                Retry Extraction
              </button>
              <span className="text-xs text-slate-400 font-mono">Target: {cleanTargetUrl}</span>
            </div>
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
      const isButtonRole = el.role === 'button';
      const isButtonTag = el.tagName === 'button';
      const isButtonInput = el.tagName === 'input' && (el.type === 'submit' || el.type === 'button' || el.type === 'reset' || el.type === 'image');
      if (!isButtonRole && !isButtonTag && !isButtonInput) return false;
    } else if (activeTab === 'inputs') {
      if ((el.tagName === 'input' && (el.type === 'submit' || el.type === 'button' || el.type === 'reset' || el.type === 'image')) ||
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
      (el.accessibleName && el.accessibleName.toLowerCase().includes(q)) ||
      (el.innerText && el.innerText.toLowerCase().includes(q)) ||
      (el.label && el.label.toLowerCase().includes(q)) ||
      (el.ariaLabel && el.ariaLabel.toLowerCase().includes(q)) ||
      (el.placeholder && el.placeholder.toLowerCase().includes(q)) ||
      (el.id && el.id.toLowerCase().includes(q)) ||
      (el.name && el.name.toLowerCase().includes(q)) ||
      (el.selector && el.selector.toLowerCase().includes(q)) ||
      (el.playwrightSelector && el.playwrightSelector.toLowerCase().includes(q)) ||
      el.tagName.toLowerCase().includes(q) ||
      (el.role && el.role.toLowerCase().includes(q)) ||
      (el.type && el.type.toLowerCase().includes(q))
    );
  });

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden transition-colors animate-fadeIn">
      {/* Inspection Header */}
      <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800/50">
                <MousePointer className="h-4 w-4" />
              </span>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white tracking-tight">
                Live DOM & Button Extraction Results
              </h2>
              {inspection.httpStatus && (
                <span className={`text-xs font-mono px-2 py-0.5 rounded-full border ${
                  inspection.httpStatus < 400
                    ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800/50'
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium transition border border-slate-200 dark:border-slate-700 shadow-xs"
              title="Re-extract live buttons with Playwright"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Re-extract</span>
            </button>
          </div>
        </div>

        {/* Element Summary Metric Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mt-4 pt-3.5 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('buttons')}
            className={`p-3 rounded-lg border text-left transition ${
              activeTab === 'buttons'
                ? 'bg-teal-50 dark:bg-teal-950/30 border-teal-300 dark:border-teal-700 shadow-xs'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-teal-300'
            }`}
          >
            <div className="text-xs uppercase font-bold text-teal-600 dark:text-teal-400 flex items-center gap-1">
              <MousePointer className="h-3 w-3" />
              <span>Buttons</span>
            </div>
            <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5 font-mono">{inspection.summary.buttonsCount}</div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`p-3 rounded-lg border text-left transition ${
              activeTab === 'all'
                ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 shadow-xs'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            <div className="text-xs uppercase font-medium text-slate-500 dark:text-slate-400">Total Elements</div>
            <div className="text-base font-semibold text-slate-900 dark:text-white mt-0.5 font-mono">{inspection.summary.totalElements}</div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('inputs')}
            className={`p-3 rounded-lg border text-left transition ${
              activeTab === 'inputs'
                ? 'bg-teal-50 dark:bg-teal-950/30 border-teal-300 dark:border-teal-700 shadow-xs'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-teal-300'
            }`}
          >
            <div className="text-xs uppercase font-medium text-teal-700 dark:text-teal-300 flex items-center gap-1">
              <FormInput className="h-3 w-3" />
              <span>Inputs</span>
            </div>
            <div className="text-base font-semibold text-slate-900 dark:text-white mt-0.5 font-mono">{inspection.summary.inputsCount}</div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('links')}
            className={`p-3 rounded-lg border text-left transition ${
              activeTab === 'links'
                ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 shadow-xs'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            <div className="text-xs uppercase font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1">
              <Link className="h-3 w-3" />
              <span>Links</span>
            </div>
            <div className="text-base font-semibold text-slate-900 dark:text-white mt-0.5 font-mono">{inspection.summary.linksCount}</div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('text')}
            className={`p-3 rounded-lg border text-left transition ${
              activeTab === 'text'
                ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 shadow-xs'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            <div className="text-xs uppercase font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1">
              <Heading className="h-3 w-3" />
              <span>Headings</span>
            </div>
            <div className="text-base font-semibold text-slate-900 dark:text-white mt-0.5 font-mono">{inspection.summary.textElementsCount}</div>
          </button>
        </div>
      </div>

      {/* Target Console Errors (if any) */}
      {inspection.errors.length > 0 && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border-b border-rose-200 dark:border-rose-900/40 text-xs text-rose-800 dark:text-rose-300">
          <div className="font-semibold text-rose-700 dark:text-rose-400 mb-1 flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>Target Page Browser / Console Warnings ({inspection.errors.length}):</span>
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
            onClick={() => setActiveTab('buttons')}
            className={`px-3 py-1.5 rounded-md font-medium transition shrink-0 ${
              activeTab === 'buttons'
                ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Buttons ({inspection.summary.buttonsCount})
          </button>
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
            placeholder="Search name, text, selector..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-teal-500 transition font-mono"
          />
        </div>
      </div>

      {/* Elements Table / Cards */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800/80 max-h-[480px] overflow-y-auto">
        {filteredElements.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500 dark:text-slate-400">
            <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-2 text-slate-400">
              <MousePointer className="h-5 w-5" />
            </div>
            <p className="font-semibold text-slate-700 dark:text-slate-300">
              {activeTab === 'buttons' ? '0 interactive buttons extracted from live page' : 'No elements found matching filter'}
            </p>
            <p className="mt-1 text-slate-400 dark:text-slate-500 font-mono text-xs">
              Playwright inspected the live DOM; no mock or fake elements are shown.
            </p>
          </div>
        ) : (
          filteredElements.map((el, idx) => {
            const isExpanded = expandedHtmlIdx === idx;
            const accessibleName = el.accessibleName || el.ariaLabel || el.innerText || el.label || el.name || el.id || el.tagName;
            const isButton = el.role === 'button' || el.tagName === 'button' || (el.tagName === 'input' && (el.type === 'submit' || el.type === 'button' || el.type === 'reset' || el.type === 'image'));
            const effectiveSelector = el.selector || el.cssSelector || (el.id ? `#${el.id}` : el.tagName);

            return (
              <div
                key={idx}
                className="p-3.5 sm:p-4 hover:bg-slate-50/80 dark:hover:bg-slate-850/50 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0 flex-1">
                  {/* Badges Bar: Accessible Name, Role, Selector, State */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                    {/* Role badge */}
                    <span className="px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/50 text-teal-700 dark:text-teal-400 font-mono text-xs font-semibold">
                      role="{el.role || (isButton ? 'button' : el.tagName)}"
                    </span>

                    {/* Tag badge */}
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-mono text-xs">
                      &lt;{el.tagName}{el.type ? ` type="${el.type}"` : ''}&gt;
                    </span>

                    {/* Enabled / Disabled state badge */}
                    {el.isEnabled ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-xs font-mono border border-emerald-200 dark:border-emerald-800/50 font-bold">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>ENABLED</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 text-xs font-mono border border-rose-200 dark:border-rose-900/40 font-bold">
                        <XCircle className="h-3 w-3" />
                        <span>DISABLED</span>
                      </span>
                    )}

                    {/* Selector badge */}
                    {effectiveSelector && (
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-mono text-xs truncate max-w-xs">
                        {effectiveSelector}
                      </span>
                    )}

                    {/* Frame badge */}
                    {el.frameUrl && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 text-amber-700 dark:text-amber-400 font-mono text-xs">
                        iframe
                      </span>
                    )}
                  </div>

                  {/* Accessible Name & Visible Text */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-slate-900 dark:text-slate-200">
                    <div className="font-semibold text-sm truncate flex items-center gap-1.5">
                      <span className="text-slate-400 dark:text-slate-500 font-normal text-xs uppercase font-mono">Accessible Name:</span>
                      <span className="text-teal-800 dark:text-teal-300 font-bold">"{accessibleName}"</span>
                    </div>

                    {el.innerText && el.innerText !== accessibleName && (
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">
                        <span>text: "{el.innerText}"</span>
                      </div>
                    )}
                  </div>

                  {/* Playwright locator expression */}
                  {el.playwrightSelector && (
                    <div className="mt-1 flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400">
                      <span className="text-slate-400">Locator:</span>
                      <code className="bg-slate-100 dark:bg-slate-950 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                        {el.playwrightSelector}
                      </code>
                    </div>
                  )}

                  {/* Expandable Outer HTML */}
                  <div className="mt-1.5 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setExpandedHtmlIdx(isExpanded ? null : idx)}
                      className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1 transition"
                    >
                      {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                      <span className="font-mono">outerHTML</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopySelector(effectiveSelector, idx)}
                      className="text-xs text-slate-500 hover:text-teal-600 dark:text-slate-400 dark:hover:text-teal-400 flex items-center gap-1 transition font-mono"
                      title="Copy selector to clipboard"
                    >
                      {copiedSelectorIdx === idx ? <Check className="h-3 w-3 text-teal-600" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedSelectorIdx === idx ? 'Copied!' : 'Copy Selector'}</span>
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="mt-1.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-700 dark:text-slate-300 break-all max-h-32 overflow-y-auto">
                      {el.outerHtml}
                    </div>
                  )}
                </div>

                {/* Verification & Test Building Actions */}
                <div className="flex sm:flex-col items-center gap-1.5 shrink-0 mt-2 sm:mt-0">
                  {/* Action 1: Click in Test */}
                  <button
                    type="button"
                    onClick={() => onAddActionToInstruction(`click "${accessibleName}"`)}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition active:scale-95 shadow-xs cursor-pointer"
                    title={`Append 'click "${accessibleName}"' to test instruction`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Click in Test</span>
                  </button>

                  {/* Action 2: Verify in Test */}
                  <button
                    type="button"
                    onClick={() => onAddActionToInstruction(`verify "${accessibleName}" is visible`)}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-medium transition active:scale-95 cursor-pointer"
                    title={`Append 'verify "${accessibleName}" is visible' to test instruction`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-teal-600" />
                    <span>Verify in Test</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
