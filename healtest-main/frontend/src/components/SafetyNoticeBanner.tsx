import React from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { SafetyValidationResult } from '../types';

interface SafetyNoticeBannerProps {
  safetyResult: SafetyValidationResult;
  allowLocalhost: boolean;
  onToggleLocalhost: () => void;
}

export const SafetyNoticeBanner: React.FC<SafetyNoticeBannerProps> = ({
  safetyResult,
  allowLocalhost,
  onToggleLocalhost,
}) => {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-4 mb-6 shadow-xs transition-colors">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800/60">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-200">Safety & Sandboxing Guardrails</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Only HTTP/HTTPS authorized targets supported. Destructive ops and real payment flows are strictly blocked.
            </p>
          </div>
        </div>

        {/* Localhost dev mode toggle */}
        <div className="flex items-center gap-3 self-end sm:self-auto bg-slate-50 dark:bg-slate-950/60 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800">
          <label htmlFor="dev-toggle" className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none">
            Allow Localhost / Dev URLs
          </label>
          <button
            id="dev-toggle"
            role="switch"
            aria-checked={allowLocalhost}
            onClick={onToggleLocalhost}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500/40 ${
              allowLocalhost ? 'bg-teal-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs transition-transform ${
                allowLocalhost ? 'translate-x-4.5' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Dynamic warnings / blocked indicators */}
      {(!safetyResult.isValid && safetyResult.blockedReason) && (
        <div className="mt-3 flex items-start gap-2 text-xs text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-lg p-2.5">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{safetyResult.blockedReason}</span>
        </div>
      )}

      {safetyResult.isValid && safetyResult.warnings.length > 0 && (
        <div className="mt-3 flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-lg p-2.5">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{safetyResult.warnings.join(' ')}</span>
        </div>
      )}

      {safetyResult.isValid && safetyResult.warnings.length === 0 && (
        <div className="mt-3 flex items-center gap-2 text-xs text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900/50 rounded-lg p-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" />
          <span>Target URL verified and authorized for intent test dispatch.</span>
        </div>
      )}
    </div>
  );
};
