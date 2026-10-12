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
  ChevronUp,
  Search,
  RefreshCw,
  Columns,
  Eye,
  X,
  Monitor
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
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 animate-fadeIn">
      {/* Header (Requirement 4: Ultra-Thin Gradient Border) */}
      <div className="card-gradient-border p-5 sm:p-6 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-purple-50 text-[#4C1A57] dark:bg-purple-950/40 dark:text-[#BAB0D4]">
                <Play className="h-4 w-4 fill-current" />
              </span>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                New Test Execution
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Enter any target URL and test instructions in natural language. HealTest runs real headless Playwright automation.
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

        {/* Quick Presets Bar */}
        <div className="mt-5">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-[#76518A] dark:text-[#BAB0D4]" />
            <span>Quick Start Presets:</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {PRESETS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => applyPreset(p)}
                className="text-left p-3 rounded-lg bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800 hover:border-[#76518A]/50 transition group cursor-pointer"
              >
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-[#4C1A57] dark:group-hover:text-[#BAB0D4] transition">
                  {p.title}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1 font-mono">
                  {p.url}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Target URL & Instruction Form (Requirement 5: Autonomous Testing Animated Background) */}
      <div className="card-gradient-border p-5 sm:p-6 transition-colors relative overflow-hidden backdrop-blur-md">
        {/* Autonomous Testing Animated Background (Requirement 5: Project-related moving background elements) */}
        <div className="test-engine-bg-surface" aria-hidden="true">
          <svg
            className="w-full h-full object-cover"
            viewBox="0 0 1200 800"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="purpleGradLight" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4C1A57" stopOpacity="0.08" />
                <stop offset="50%" stopColor="#76518A" stopOpacity="0.06" />
                <stop offset="100%" stopColor="#BAB0D4" stopOpacity="0.09" />
              </linearGradient>
              <linearGradient id="lavenderGrad" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#BAB0D4" stopOpacity="0.10" />
                <stop offset="60%" stopColor="#76518A" stopOpacity="0.06" />
                <stop offset="100%" stopColor="#4C1A57" stopOpacity="0.08" />
              </linearGradient>
              <filter id="softGlowPurp" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="30" result="blur" />
              </filter>
            </defs>

            {/* Ambient soft glow patches */}
            <ellipse cx="220" cy="180" rx="320" ry="220" fill="url(#purpleGradLight)" filter="url(#softGlowPurp)" />
            <ellipse cx="1000" cy="620" rx="380" ry="260" fill="url(#lavenderGrad)" filter="url(#softGlowPurp)" />

            {/* 1. Abstract Browser Window Wireframe (Top-Right Margins) */}
            <g className="test-anim-float" transform="translate(860, 40)">
              {/* Window frame */}
              <rect x="0" y="0" width="300" height="190" rx="10" fill="none" stroke="#BAB0D4" strokeWidth="1.5" strokeOpacity="0.16" />
              <line x1="0" y1="32" x2="300" y2="32" stroke="#BAB0D4" strokeWidth="1" strokeOpacity="0.12" />
              {/* Window control dots */}
              <circle cx="16" cy="16" r="3.5" fill="#4C1A57" fillOpacity="0.25" />
              <circle cx="28" cy="16" r="3.5" fill="#76518A" fillOpacity="0.25" />
              <circle cx="40" cy="16" r="3.5" fill="#BAB0D4" fillOpacity="0.35" />
              {/* Address / URL Bar */}
              <rect x="60" y="9" width="180" height="14" rx="4" fill="#BAB0D4" fillOpacity="0.08" />
              {/* Viewport wireframe lines */}
              <rect x="18" y="48" width="80" height="12" rx="3" fill="#76518A" fillOpacity="0.12" />
              <rect x="18" y="70" width="160" height="8" rx="2" fill="#BAB0D4" fillOpacity="0.09" />
              <rect x="18" y="86" width="130" height="8" rx="2" fill="#BAB0D4" fillOpacity="0.07" />
              <rect x="18" y="110" width="70" height="22" rx="5" fill="#4C1A57" fillOpacity="0.14" />
              <rect x="100" y="110" width="70" height="22" rx="5" fill="#BAB0D4" fillOpacity="0.10" />
            </g>

            {/* 2. DOM Node Tree Hierarchy Graph (Left Margins) */}
            <g className="test-anim-pulse" transform="translate(40, 110)">
              {/* Root node */}
              <rect x="0" y="0" width="56" height="20" rx="4" fill="none" stroke="#4C1A57" strokeWidth="1.2" strokeOpacity="0.22" />
              <text x="28" y="13" textAnchor="middle" fontSize="9" fontFamily="monospace" fill="#4C1A57" fillOpacity="0.35">&lt;html&gt;</text>
              {/* Connector lines to children */}
              <path d="M 28 20 L 28 46 M 28 46 L -10 60 M 28 46 L 68 60" fill="none" stroke="#76518A" strokeWidth="1" strokeOpacity="0.18" className="test-anim-flow" />
              {/* Child 1: <head> */}
              <rect x="-35" y="60" width="52" height="18" rx="4" fill="none" stroke="#76518A" strokeWidth="1" strokeOpacity="0.18" />
              <text x="-9" y="72" textAnchor="middle" fontSize="8" fontFamily="monospace" fill="#76518A" fillOpacity="0.30">&lt;head&gt;</text>
              {/* Child 2: <body> */}
              <rect x="42" y="60" width="52" height="18" rx="4" fill="none" stroke="#76518A" strokeWidth="1" strokeOpacity="0.22" />
              <text x="68" y="72" textAnchor="middle" fontSize="8" fontFamily="monospace" fill="#76518A" fillOpacity="0.35">&lt;body&gt;</text>
              {/* Sub-children from body */}
              <path d="M 68 78 L 68 100 M 68 100 L 32 112 M 68 100 L 104 112" fill="none" stroke="#BAB0D4" strokeWidth="1" strokeOpacity="0.16" className="test-anim-flow" />
              <circle cx="32" cy="116" r="5" fill="#4C1A57" fillOpacity="0.18" />
              <circle cx="104" cy="116" r="5" fill="#BAB0D4" fillOpacity="0.25" />
            </g>

            {/* 3. Locator-Target Indicator & Crosshairs (Bottom-Right Margins) */}
            <g className="test-anim-crosshair" transform="translate(1010, 520)">
              {/* Bounding box brackets */}
              <path d="M -30 -15 L -30 -30 L -15 -30" fill="none" stroke="#76518A" strokeWidth="1.8" strokeOpacity="0.30" />
              <path d="M 30 -15 L 30 -30 L 15 -30" fill="none" stroke="#76518A" strokeWidth="1.8" strokeOpacity="0.30" />
              <path d="M -30 15 L -30 30 L -15 30" fill="none" stroke="#76518A" strokeWidth="1.8" strokeOpacity="0.30" />
              <path d="M 30 15 L 30 30 L 15 30" fill="none" stroke="#76518A" strokeWidth="1.8" strokeOpacity="0.30" />
              {/* Central target circle & crosshair */}
              <circle cx="0" cy="0" r="14" fill="none" stroke="#4C1A57" strokeWidth="1" strokeOpacity="0.22" strokeDasharray="3 3" />
              <line x1="-20" y1="0" x2="20" y2="0" stroke="#76518A" strokeWidth="1" strokeOpacity="0.25" />
              <line x1="0" y1="-20" x2="0" y2="20" stroke="#76518A" strokeWidth="1" strokeOpacity="0.25" />
              {/* Locator tag label */}
              <rect x="-42" y="38" width="84" height="14" rx="3" fill="#4C1A57" fillOpacity="0.10" />
              <text x="0" y="48" textAnchor="middle" fontSize="7.5" fontFamily="monospace" fill="#4C1A57" fillOpacity="0.35">getByRole('button')</text>
            </g>

            {/* 4. Abstract Test Flow Path with Checkmarks (Bottom-Left Margins) */}
            <g transform="translate(60, 580)">
              {/* Flow Line with animated dash */}
              <path d="M 0 30 C 80 0, 160 60, 240 30" fill="none" stroke="#BAB0D4" strokeWidth="1.5" strokeOpacity="0.25" className="test-anim-flow" />
              {/* Step 1 Node (Passed) */}
              <g transform="translate(0, 30)">
                <circle cx="0" cy="0" r="12" fill="#ffffff" stroke="#76518A" strokeWidth="1.5" strokeOpacity="0.30" />
                <path d="M -4 0 L -1 3 L 4 -3" fill="none" stroke="#4C1A57" strokeWidth="1.5" strokeOpacity="0.45" strokeLinecap="round" strokeLinejoin="round" />
              </g>
              {/* Step 2 Node (Passed) */}
              <g transform="translate(120, 30)">
                <circle cx="0" cy="0" r="12" fill="#ffffff" stroke="#76518A" strokeWidth="1.5" strokeOpacity="0.30" />
                <path d="M -4 0 L -1 3 L 4 -3" fill="none" stroke="#4C1A57" strokeWidth="1.5" strokeOpacity="0.45" strokeLinecap="round" strokeLinejoin="round" />
              </g>
              {/* Step 3 Node (Active/Healed) */}
              <g transform="translate(240, 30)" className="test-anim-pulse">
                <circle cx="0" cy="0" r="14" fill="none" stroke="#BAB0D4" strokeWidth="1" strokeOpacity="0.40" strokeDasharray="2 2" />
                <circle cx="0" cy="0" r="10" fill="#4C1A57" fillOpacity="0.18" />
                <circle cx="0" cy="0" r="4" fill="#76518A" fillOpacity="0.45" />
              </g>
            </g>

            {/* 5. Tiny Floating Automated Execution Particles */}
            <g className="test-anim-particle-1">
              <circle cx="210" cy="380" r="3" fill="#BAB0D4" fillOpacity="0.25" />
              <circle cx="940" cy="340" r="2.5" fill="#76518A" fillOpacity="0.22" />
              <circle cx="820" cy="620" r="3.5" fill="#4C1A57" fillOpacity="0.18" />
            </g>
            <g className="test-anim-particle-2">
              <circle cx="380" cy="140" r="2.5" fill="#76518A" fillOpacity="0.20" />
              <circle cx="750" cy="220" r="3" fill="#BAB0D4" fillOpacity="0.28" />
              <circle cx="1100" cy="280" r="2" fill="#4C1A57" fillOpacity="0.22" />
            </g>
          </svg>
        </div>

        {/* Crisp Interactive Form Surface */}
        <div className="relative z-10 space-y-6">
          {/* Target URL */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-[#76518A] dark:text-[#BAB0D4]" />
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
                  placeholder="https://example.com or http://localhost:3001/fixture"
                  value={intent.targetUrl}
                  onChange={(e) => {
                    onClearRunError();
                    onChangeIntent({ targetUrl: e.target.value });
                  }}
                  className={`w-full bg-white dark:bg-slate-950 border rounded-lg px-4 py-2.5 text-xs font-mono text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition ${
                    !safetyResult.isValid && intent.targetUrl
                      ? 'border-rose-400 focus:border-rose-500'
                      : 'border-slate-300 dark:border-slate-800 focus:border-[#76518A] focus:ring-1 focus:ring-[#76518A]'
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
                      ? 'btn-primary-gradient text-white active:scale-95'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700/50'
                  }`}
                  title="Open live website inside embedded browser preview"
                >
                  <Globe className="h-4 w-4 text-white" />
                  <span>Open Website</span>
                </button>

                <button
                  type="button"
                  disabled={!safetyResult.isValid || !intent.targetUrl.trim() || isInspecting}
                  onClick={handleInspect}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold transition border shrink-0 cursor-pointer ${
                    safetyResult.isValid && intent.targetUrl.trim() && !isInspecting
                      ? 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-[#4C1A57] dark:text-[#BAB0D4] border-slate-200 dark:border-slate-700 hover:border-[#76518A]/50 active:scale-95'
                      : 'bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800 cursor-not-allowed'
                  }`}
                  title="Inspect page with Playwright (extract accessible roles, buttons, inputs, labels)"
                >
                {isInspecting ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Inspecting...</span>
                  </>
                ) : (
                  <>
                    <Search className="h-3.5 w-3.5" />
                    <span>Inspect DOM</span>
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
                <span className="p-1 rounded bg-purple-50 text-[#4C1A57] dark:bg-purple-950/40 dark:text-[#BAB0D4]">
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
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-lg p-0.5 flex text-xs font-medium shadow-xs">
                  <button
                    type="button"
                    onClick={() => setActiveWorkspaceTab('preview')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition cursor-pointer ${
                      activeWorkspaceTab === 'preview'
                        ? 'btn-primary-gradient text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <Eye className="h-3.5 w-3.5 text-current" />
                    <span>Live Preview</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveWorkspaceTab('inspect')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition cursor-pointer ${
                      activeWorkspaceTab === 'inspect'
                        ? 'btn-primary-gradient text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <Search className="h-3.5 w-3.5 text-current" />
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
              <Terminal className="h-3.5 w-3.5 text-[#76518A] dark:text-[#BAB0D4]" />
              Natural-Language Test Instruction
            </span>
            <span className="text-xs font-normal text-slate-500">
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
            className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-4 py-2.5 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#76518A] focus:ring-1 focus:ring-[#76518A] transition leading-relaxed"
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
          <div className="bg-slate-50/90 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 rounded-lg p-3.5 text-xs">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-[#76518A] dark:text-[#BAB0D4]" />
              Intent Decomposer Action Sequence:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {decomposedActions.map((action, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-mono text-xs flex items-center gap-1.5 shadow-2xs"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-[#BAB0D4]" />
                  Step {idx + 1}: {action}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Advanced Options Toggle */}
        <div className="border-t border-slate-200/80 dark:border-slate-800 pt-4">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 p-4 rounded-lg bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 text-xs">
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

              <div className="sm:col-span-2 flex items-center justify-between pt-2 border-t border-slate-200/80 dark:border-slate-800">
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-300">Allow Localhost & Private Networks</div>
                  <div className="text-xs text-slate-500">Enable only when testing local development servers</div>
                </div>
                <input
                  type="checkbox"
                  checked={intent.allowLocalhost}
                  onChange={(e) => onChangeIntent({ allowLocalhost: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-[#4C1A57] focus:ring-[#76518A] cursor-pointer"
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

        {/* Run Action (Requirement 6: Primary Gradient Button with White Text) */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-[#76518A] dark:text-[#BAB0D4]" />
            <span>HealTest operates independently from target application</span>
          </div>

          <button
            type="button"
            disabled={!canRun}
            onClick={onRunTest}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition shadow-xs cursor-pointer ${
              canRun
                ? 'btn-primary-gradient text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700/50'
            }`}
          >
            {isRunning ? (
              <>
                <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                <span className="text-white">Running Playwright...</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-current text-white" />
                <span className="text-white">Run Playwright Test</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>

      {/* Active Running Progress Card (Requirement 4: Ultra-Thin Gradient Border) */}
      {isRunning && (
        <div className="card-gradient-border p-5 sm:p-6 space-y-4 animate-pulse transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#BAB0D4] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#4C1A57]"></span>
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
            <span className="font-mono text-xs text-[#4C1A57] dark:text-[#BAB0D4] bg-purple-50 dark:bg-purple-950/40 px-3 py-1 rounded-full border border-purple-200 dark:border-purple-800/40 font-semibold">
              Active Session
            </span>
          </div>

          <div className="text-xs space-y-1.5 font-mono text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200/80 dark:border-slate-800">
            <div className="text-slate-500 dark:text-slate-400">
              Target URL: <span className="text-[#4C1A57] dark:text-[#BAB0D4] font-semibold">{intent.targetUrl}</span>
            </div>
            <div className="text-slate-500 dark:text-slate-400 truncate">
              Instruction: <span className="text-slate-900 dark:text-slate-200">{intent.naturalLanguageInstruction}</span>
            </div>
            <div className="text-slate-400 dark:text-slate-500 text-xs">
              Engine: Chromium • Timeout: {intent.timeoutMs}ms • Max Retries: {intent.maxRetries}
            </div>
          </div>

          <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#BAB0D4] animate-ping" />
            <span>
              Navigating to target, waiting for DOM content loaded, extracting live accessibility locators, executing actions, and capturing real step screenshots...
            </span>
          </div>
        </div>
      )}

      {/* Immediate Execution Result Card (Requirement 4: Ultra-Thin Gradient Border) */}
      {lastExecutedRun && (
        <div className="card-gradient-border p-5 sm:p-6 space-y-4 animate-fadeIn transition-colors">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800">
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
                ? 'bg-slate-50 dark:bg-slate-950 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300'
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
              className="btn-primary-gradient flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-xs font-semibold shadow-xs transition cursor-pointer"
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
