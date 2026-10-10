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
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-200">Safety & Sandboxing Guardrails</h4>
            <p className="text-xs text-slate-400">
              Only HTTP/HTTPS authorized targets supported. Destructive ops and real payment flows are strictly blocked.
            </p>
          </div>
        </div>

        {/* Localhost dev mode toggle */}
        <div className="flex items-center gap-3 self-end sm:self-auto bg-slate-950/60 px-3.5 py-2 rounded-lg border border-slate-800">
          <label htmlFor="dev-toggle" className="text-xs font-medium text-slate-300 cursor-pointer select-none">
            Allow Localhost / Dev URLs
          </label>
          <button
            id="dev-toggle"
            role="switch"
            aria-checked={allowLocalhost}
            onClick={onToggleLocalhost}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
              allowLocalhost ? 'bg-amber-500' : 'bg-slate-700'
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                allowLocalhost ? 'translate-x-4.5' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Dynamic warnings / blocked indicators */}
      {(!safetyResult.isValid && safetyResult.blockedReason) && (
        <div className="mt-3 flex items-start gap-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2.5">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{safetyResult.blockedReason}</span>
        </div>
      )}

      {safetyResult.isValid && safetyResult.warnings.length > 0 && (
        <div className="mt-3 flex items-start gap-2 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{safetyResult.warnings.join(' ')}</span>
        </div>
      )}

      {safetyResult.isValid && safetyResult.warnings.length === 0 && (
        <div className="mt-3 flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Target URL verified and authorized for intent test dispatch.</span>
        </div>
      )}
    </div>
  );
};
