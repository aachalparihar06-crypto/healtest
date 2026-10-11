import React, { useState } from 'react';
import { 
  Settings, 
  Server, 
  ShieldCheck, 
  Trash2, 
  RefreshCw, 
  Check, 
  Save, 
  RotateCcw
} from 'lucide-react';
import { getApiBaseUrl, setApiBaseUrl, type BackendHealthResponse } from '../services/api';

interface SettingsPageProps {
  backendHealth: BackendHealthResponse;
  onRefreshHealth: () => Promise<void>;
  allowLocalhost: boolean;
  onToggleLocalhost: () => void;
  onClearHistory: () => Promise<void>;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  backendHealth,
  onRefreshHealth,
  allowLocalhost,
  onToggleLocalhost,
  onClearHistory,
}) => {
  const [apiUrl, setApiUrl] = useState(getApiBaseUrl());
  const [isSaved, setIsSaved] = useState(false);
  const [isPinging, setIsPinging] = useState(false);

  const handleSaveApiUrl = () => {
    setApiBaseUrl(apiUrl);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
    onRefreshHealth();
  };

  const handlePing = async () => {
    setIsPinging(true);
    await onRefreshHealth();
    setIsPinging(false);
  };

  const handleResetApiUrl = () => {
    setApiUrl('http://localhost:3001/api');
    setApiBaseUrl('http://localhost:3001/api');
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
    onRefreshHealth();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs transition-colors">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800/60">
            <Settings className="h-5 w-5" />
          </span>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Platform Settings & Configuration
          </h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage backend endpoints, Playwright execution engine parameters, and safety guard policies.
        </p>
      </div>

      {/* Backend API Connection Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-6 transition-colors">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <Server className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Backend Express API Configuration</h2>
          </div>
          <button
            onClick={handlePing}
            disabled={isPinging}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium transition border border-slate-200 dark:border-slate-700 shadow-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isPinging ? 'animate-spin text-teal-600 dark:text-teal-400' : 'text-slate-400'}`} />
            <span>Test Connection</span>
          </button>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            API Base URL
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="http://localhost:3001/api"
              className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
            />
            <button
              onClick={handleSaveApiUrl}
              className="px-4 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
            >
              {isSaved ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
              <span>{isSaved ? 'Saved' : 'Save'}</span>
            </button>
            <button
              onClick={handleResetApiUrl}
              title="Reset to default (http://localhost:3001/api)"
              className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition border border-slate-200 dark:border-slate-700"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Live Diagnostics Box */}
        <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800/80 space-y-3">
          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
            <span>Connection Diagnostics</span>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-mono font-semibold ${
              backendHealth.online
                ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60'
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${backendHealth.online ? 'bg-teal-600 dark:bg-teal-400' : 'bg-rose-500'}`} />
              {backendHealth.online ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block font-sans">Status Message:</span>
              <span className="text-slate-800 dark:text-slate-200">{backendHealth.message}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block font-sans">Stage / Version:</span>
              <span className="text-slate-800 dark:text-slate-200">{backendHealth.stage} (v{backendHealth.version})</span>
            </div>
            {backendHealth.artifactsDir && (
              <div className="sm:col-span-2">
                <span className="text-slate-500 dark:text-slate-400 block font-sans">Artifacts Storage:</span>
                <span className="text-slate-600 dark:text-slate-400 text-xs break-all">{backendHealth.artifactsDir}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Safety Guardrails Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4 transition-colors">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-200 dark:border-slate-800">
          <ShieldCheck className="h-5 w-5 text-teal-600 dark:text-teal-400" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Safety & Isolation Guardrails</h2>
        </div>

        <div className="space-y-4 text-xs">
          <div className="flex items-center justify-between p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div>
              <div className="font-semibold text-slate-900 dark:text-slate-200">Local Dev Mode (Localhost / RFC-1918 Access)</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Allows testing targets hosted on localhost (e.g. port 3000, 4000, 8080) and private LAN addresses.
              </div>
            </div>
            <button
              onClick={onToggleLocalhost}
              className={`px-3 py-1.5 rounded-lg font-mono font-bold text-xs transition ${
                allowLocalhost
                  ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {allowLocalhost ? 'ENABLED' : 'DISABLED'}
            </button>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
            <div className="font-semibold text-slate-900 dark:text-slate-200">Protocol Enforcement</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              HealTest enforces safe HTTP/HTTPS protocols and automatically rejects dangerous URL schemes (file://, javascript:, data:).
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone: Data Management */}
      <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/40 rounded-xl p-6 shadow-xs space-y-4 transition-colors">
        <div className="flex items-center gap-2.5 pb-4 border-b border-rose-100 dark:border-rose-900/30">
          <Trash2 className="h-5 w-5 text-rose-600 dark:text-rose-400" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Data & History Management</h2>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30">
          <div>
            <div className="text-xs font-semibold text-rose-800 dark:text-rose-300">Clear Real Test Run History</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Permanently purges all recorded test telemetry and step records from the backend API.
            </div>
          </div>
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to clear all test runs history?')) {
                onClearHistory();
              }
            }}
            className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition self-start sm:self-auto shrink-0"
          >
            Clear History
          </button>
        </div>
      </div>
    </div>
  );
};
