import React, { useState } from 'react';
import { 
  Play, 
  Globe, 
  Terminal, 
  Sparkles, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Wrench, 
  ArrowRight,
  Settings,
  ChevronDown,
  ChevronUp,
  Search,
  RefreshCw,
  Columns,
  Eye,
  X,
  Monitor,
  MousePointer
} from 'lucide-react';
import type { TestIntent, TestRun, SafetyValidationResult, DomInspectionResult } from '../types';
import type { NavigationPage } from '../components/Navbar';
import { validateTestInstruction } from '../utils/safetyValidator';
import { LiveWebsitePreview } from '../components/LiveWebsitePreview';
import { LiveInspectionPanel } from '../components/LiveInspectionPanel';
import { apiService } from '../services/api';

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
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'preview' | 'inspect' | 'split'>('preview');
  const [inspectionData, setInspectionData] = useState<DomInspectionResult | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);
  const [inspectError, setInspectError] = useState<string | null>(null);

  const instructionSafety = validateTestInstruction(intent.naturalLanguageInstruction);

  const handleInspect = async () => {
    const url = intent.targetUrl.trim();
    if (!url) return;
    setIsInspecting(true);
    setInspectError(null);
    setIsPreviewOpen(true);
    setActiveWorkspaceTab('inspect');
    try {
      const result = await apiService.inspectUrl(url, intent.allowLocalhost, intent.timeoutMs);
      setInspectionData(result);
    } catch (err: any) {
      setInspectError(err.message || 'Live inspection failed.');
    } finally {
      setIsInspecting(false);
    }
  };

  const handleAddActionToInstruction = (actionText: string) => {
    const current = intent.naturalLanguageInstruction.trim();
    if (!current) {
      onChangeIntent({ naturalLanguageInstruction: `Navigate to target, ${actionText}` });
    } else {
      onChangeIntent({ naturalLanguageInstruction: `${current}, then ${actionText}` });
    }
  };

  const decomposedActions = intent.naturalLanguageInstruction
    .split(/(?:,|\.|\band then\b|\bthen\b|\band\b)/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 3);

  const canRun = safetyResult.isValid && instructionSafety.isSafe && !isRunning && intent.targetUrl.trim() !== '';

  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-sm transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-teal-50 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400">
                <Play className="h-4 w-4 fill-current" />
              </span>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                New Test Execution
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Enter any target website URL and your natural-language test instruction. HealTest inspects the real DOM and executes autonomous headless Playwright automation.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-xs font-mono px-2.5 py-1 rounded-lg border ${
              intent.allowLocalhost 
                ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30' 
                : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
            }`}>
              Local Dev Mode: {intent.allowLocalhost ? 'ENABLED' : 'BLOCKED'}
            </span>
          </div>
        </div>
      </div>

      {/* Target URL & Instruction Form */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-sm space-y-6 transition-colors">
        {/* Target URL */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
              Target Website URL
            </span>
            <span className="text-xs font-normal text-slate-500">
              Must include protocol (http:// or https://)
            </span>
          </label>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <input
                type="url"
                placeholder="https://your-website.com or http://localhost:3000"
                value={intent.targetUrl}
                onChange={(e) => {
                  onClearRunError();
                  onChangeIntent({ targetUrl: e.target.value });
                }}
                className={`w-full bg-white dark:bg-slate-950 border rounded-lg px-4 py-2.5 text-xs font-mono text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition ${
                  !safetyResult.isValid && intent.targetUrl
                    ? 'border-rose-400 focus:border-rose-500'
                    : 'border-slate-300 dark:border-slate-800 focus:border-teal-600 dark:focus:border-teal-500'
                }`}
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={!safetyResult.isValid || !intent.targetUrl.trim()}
                onClick={() => {
                  setIsPreviewOpen(true);
                  setActiveWorkspaceTab('preview');
                }}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold transition shadow-xs shrink-0 cursor-pointer ${
                  safetyResult.isValid && intent.targetUrl.trim()
                    ? 'bg-teal-600 hover:bg-teal-700 text-white active:scale-95'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700/50'
                }`}
                title="Open live website inside embedded browser preview"
              >
                <Globe className="h-4 w-4" />
                <span>Open Website</span>
              </button>

              <button
                type="button"
                disabled={!safetyResult.isValid || !intent.targetUrl.trim() || isInspecting}
                onClick={handleInspect}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold transition border shrink-0 cursor-pointer ${
                  safetyResult.isValid && intent.targetUrl.trim() && !isInspecting
                    ? 'bg-teal-50 dark:bg-slate-800 hover:bg-teal-100 dark:hover:bg-slate-750 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-500/30 active:scale-95'
                    : 'bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800 cursor-not-allowed'
                }`}
                title="Extract real live buttons with Playwright (accessible name, role, selector, and state)"
              >
                {isInspecting ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Extracting...</span>
                  </>
                ) : (
                  <>
                    <MousePointer className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                    <span>Extract Buttons</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Safety validation feedback */}
          {!safetyResult.isValid && intent.targetUrl && (
            <div className="mt-2 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{safetyResult.blockedReason}</span>
            </div>
          )}

          {safetyResult.warnings.length > 0 && (
            <div className="mt-2 space-y-1">
              {safetyResult.warnings.map((w, idx) => (
                <div key={idx} className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Website Preview & Inspection Workspace */}
        {(isPreviewOpen || inspectionData || isInspecting || inspectError) && (
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50 dark:bg-slate-950/70 space-y-4 animate-fadeIn transition-colors">
            {/* Workspace Navigation Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded bg-teal-50 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400">
                  <Monitor className="h-3.5 w-3.5" />
                </span>
                <span className="text-xs font-bold text-slate-900 dark:text-white tracking-tight">
                  Target Inspection Workspace
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 truncate max-w-xs">
                  {intent.targetUrl}
                </span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                {/* View switcher tabs */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-0.5 flex text-xs font-medium shadow-xs">
                  <button
                    type="button"
                    onClick={() => setActiveWorkspaceTab('preview')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition cursor-pointer ${
                      activeWorkspaceTab === 'preview'
                        ? 'bg-teal-600 text-white font-semibold shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Live Preview</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveWorkspaceTab('inspect')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition cursor-pointer ${
                      activeWorkspaceTab === 'inspect'
                        ? 'bg-teal-600 text-white font-semibold shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <Search className="h-3.5 w-3.5" />
                    <span>DOM Inspector {inspectionData ? `(${inspectionData.elements.length})` : ''}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveWorkspaceTab('split')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition cursor-pointer ${
                      activeWorkspaceTab === 'split'
                        ? 'bg-slate-800 text-white font-semibold shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <Columns className="h-3.5 w-3.5" />
                    <span>Split View</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(false)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
                  title="Close Workspace"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Active Workspace View */}
            {activeWorkspaceTab === 'preview' && (
              <LiveWebsitePreview
                targetUrl={intent.targetUrl}
                isOpen={true}
                onOpenPreview={() => setIsPreviewOpen(true)}
                onInspect={handleInspect}
                isInspecting={isInspecting}
              />
            )}

            {activeWorkspaceTab === 'inspect' && (
              <LiveInspectionPanel
                inspection={inspectionData}
                isInspecting={isInspecting}
                inspectError={inspectError}
                onInspect={handleInspect}
                onAddActionToInstruction={handleAddActionToInstruction}
                targetUrl={intent.targetUrl}
              />
            )}

            {activeWorkspaceTab === 'split' && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <LiveWebsitePreview
                  targetUrl={intent.targetUrl}
                  isOpen={true}
                  onOpenPreview={() => setIsPreviewOpen(true)}
                  onInspect={handleInspect}
                  isInspecting={isInspecting}
                />
                <LiveInspectionPanel
                  inspection={inspectionData}
                  isInspecting={isInspecting}
                  inspectError={inspectError}
                  onInspect={handleInspect}
                  onAddActionToInstruction={handleAddActionToInstruction}
                  targetUrl={intent.targetUrl}
                />
              </div>
            )}
          </div>
        )}

        {/* Natural Language Instruction */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Terminal className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
              Natural-Language Test Instruction
            </span>
            <span className="text-xs font-normal text-slate-500">
              {decomposedActions.length} inferred atomic steps
            </span>
          </label>

          <textarea
            rows={3}
            placeholder="e.g. Navigate to website, enter 'john@example.com' into 'Email', click 'Submit', verify 'Welcome' is visible"
            value={intent.naturalLanguageInstruction}
            onChange={(e) => {
              onClearRunError();
              onChangeIntent({ naturalLanguageInstruction: e.target.value });
            }}
            className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-4 py-2.5 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-teal-600 dark:focus:border-teal-500 transition leading-relaxed"
          />

          {!instructionSafety.isSafe && (
            <div className="mt-2 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{instructionSafety.blockedReason}</span>
            </div>
          )}
        </div>

        {/* Inferred Action Decomposition Preview */}
        {decomposedActions.length > 0 && (
          <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 text-xs">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-teal-600 dark:text-teal-400" />
              Intent Decomposer Action Sequence:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {decomposedActions.map((action, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-mono text-xs flex items-center gap-1.5 shadow-2xs"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                  Step {idx + 1}: {action}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Advanced Options Toggle */}
        <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium transition cursor-pointer"
          >
            <Settings className="h-3.5 w-3.5 text-slate-400" />
            <span>Advanced Configurations</span>
            {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          {showAdvanced && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                  Step Timeout (ms)
                </label>
                <input
                  type="number"
                  min={2000}
                  max={60000}
                  step={1000}
                  value={intent.timeoutMs}
                  onChange={(e) => onChangeIntent({ timeoutMs: Number(e.target.value) })}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                  Self-Healing Max Retries
                </label>
                <input
                  type="number"
                  min={0}
                  max={5}
                  value={intent.maxRetries}
                  onChange={(e) => onChangeIntent({ maxRetries: Number(e.target.value) })}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                  Custom Ground Truth Assertion (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Expected text confirmation on the final page"
                  value={intent.customSuccessCriteria || ''}
                  onChange={(e) => onChangeIntent({ customSuccessCriteria: e.target.value })}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-md px-3 py-2 text-slate-900 dark:text-white text-xs"
                />
              </div>

              <div className="sm:col-span-2 flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-300">Allow Localhost & Private Networks</div>
                  <div className="text-xs text-slate-500">Enable only when testing local development servers</div>
                </div>
                <input
                  type="checkbox"
                  checked={intent.allowLocalhost}
                  onChange={(e) => onChangeIntent({ allowLocalhost: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* Error Display */}
        {runError && (
          <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-300 text-xs flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-rose-600 dark:text-rose-400 block mb-0.5">Execution Error:</span>
                <span>{runError}</span>
              </div>
            </div>
            <button
              onClick={onClearRunError}
              className="text-rose-700 dark:text-rose-400 hover:underline text-xs font-mono px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950/60 shrink-0 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Run Action */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            <span>HealTest operates independently from target application</span>
          </div>

          <button
            type="button"
            disabled={!canRun}
            onClick={onRunTest}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition shadow-sm cursor-pointer ${
              canRun
                ? 'bg-teal-600 hover:bg-teal-700 text-white active:scale-95'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700/50'
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
        <div className="bg-white dark:bg-slate-900 border border-teal-500/40 rounded-xl p-5 sm:p-6 shadow-sm space-y-4 animate-pulse transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-teal-500"></span>
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Headless Chromium Automation In Progress
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Executing live Playwright run against target website
                </p>
              </div>
            </div>
            <span className="font-mono text-xs text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-500/10 px-3 py-1 rounded-full border border-teal-200 dark:border-teal-500/30 font-semibold">
              Active Session
            </span>
          </div>

          <div className="text-xs space-y-1.5 font-mono text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
            <div className="text-slate-500 dark:text-slate-400">
              Target URL: <span className="text-teal-700 dark:text-teal-400 font-semibold">{intent.targetUrl}</span>
            </div>
            <div className="text-slate-500 dark:text-slate-400 truncate">
              Instruction: <span className="text-slate-900 dark:text-slate-200">{intent.naturalLanguageInstruction}</span>
            </div>
            <div className="text-slate-400 dark:text-slate-500 text-xs">
              Engine: Chromium • Timeout: {intent.timeoutMs}ms • Max Retries: {intent.maxRetries}
            </div>
          </div>

          <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-teal-500 animate-ping" />
            <span>
              Navigating to target, waiting for DOM content loaded, extracting live accessibility locators, executing actions, and capturing real step screenshots...
            </span>
          </div>
        </div>
      )}

      {/* Immediate Execution Result Card if a test just completed */}
      {lastExecutedRun && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-sm space-y-4 animate-fadeIn transition-colors">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              {lastExecutedRun.status === 'HEALED' && (
                <span className="p-1.5 rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
                  <Wrench className="h-4 w-4" />
                </span>
              )}
              {lastExecutedRun.status === 'PASSED' && (
                <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
              )}
              {lastExecutedRun.status === 'FAILED' && (
                <span className="p-1.5 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400">
                  <AlertCircle className="h-4 w-4" />
                </span>
              )}
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Execution Completed: Outcome [{lastExecutedRun.status}]
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  Run ID: {lastExecutedRun.id} • {(lastExecutedRun.executionTimeMs / 1000).toFixed(2)}s runtime
                </span>
              </div>
            </div>

            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase font-mono ${
              lastExecutedRun.status === 'HEALED'
                ? 'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40'
                : lastExecutedRun.status === 'PASSED'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40'
                : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40'
            }`}>
              {lastExecutedRun.status}
            </span>
          </div>

          {/* Error classification summary if present */}
          {lastExecutedRun.errorClassification && (
            <div className={`p-3.5 rounded-lg border text-xs ${
              lastExecutedRun.errorClassification.category === 'NONE'
                ? 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                : lastExecutedRun.errorClassification.category === 'UI_HEALED'
                ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-900 dark:text-amber-200'
                : 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-900 dark:text-rose-200'
            }`}>
              <div className="font-semibold mb-1">
                Classification: {lastExecutedRun.errorClassification.label}
              </div>
              <p className="text-xs opacity-90 leading-relaxed">
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
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
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
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 dark:bg-amber-600/30 dark:hover:bg-amber-600/50 dark:text-amber-200 dark:border-amber-500/40 text-xs font-semibold transition cursor-pointer"
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
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium transition cursor-pointer"
            >
              <span>Logs & Screenshots</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
