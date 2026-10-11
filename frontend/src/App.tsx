import React, { useState, useEffect } from 'react';
import type { TestRun, TestIntent, SafetyValidationResult } from './types';
import { apiService, type BackendHealthResponse } from './services/api';
import { validateTargetUrl } from './utils/safetyValidator';
import { Navbar, type NavigationPage } from './components/Navbar';
import { DashboardPage } from './pages/DashboardPage';
import { NewTestPage } from './pages/NewTestPage';
import { HistoryPage } from './pages/HistoryPage';
import { HealingInspectorPage } from './pages/HealingInspectorPage';
import { LogsScreenshotsPage } from './pages/LogsScreenshotsPage';
import { SettingsPage } from './pages/SettingsPage';

export const App: React.FC = () => {
  // Navigation State with URL Hash Sync
  const getInitialPage = (): NavigationPage => {
    const hash = window.location.hash.replace('#', '') as NavigationPage;
    const validPages: NavigationPage[] = [
      'dashboard',
      'new-test',
      'history',
      'healing',
      'logs-screenshots',
      'settings',
    ];
    return validPages.includes(hash) ? hash : 'dashboard';
  };

  const [currentPage, setCurrentPage] = useState<NavigationPage>(getInitialPage());

  // Light / Dark Theme State (White theme default)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('healtest_theme');
    return saved === 'dark' ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
    localStorage.setItem('healtest_theme', theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Listen to hash changes for browser forward/back buttons
  useEffect(() => {
    const handleHashChange = () => {
      const page = getInitialPage();
      setCurrentPage(page);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleNavigate = (page: NavigationPage) => {
    setCurrentPage(page);
    window.location.hash = page;
  };

  // Real Test Runs State (Never fake data)
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [lastExecutedRun, setLastExecutedRun] = useState<TestRun | null>(null);

  // Test Intent State for New Test Page
  const [intent, setIntent] = useState<TestIntent>({
    targetUrl: '',
    naturalLanguageInstruction: '',
    allowLocalhost: true,
    timeoutMs: 15000,
    maxRetries: 2,
    customSuccessCriteria: '',
  });

  // Backend Health State
  const [backendHealth, setBackendHealth] = useState<BackendHealthResponse>({
    online: false,
    stage: 'Checking...',
    version: '1.2.0',
    message: 'Connecting to backend API on http://localhost:3001/api...',
  });

  // URL Safety Validation Result
  const safetyResult: SafetyValidationResult = validateTargetUrl(
    intent.targetUrl,
    intent.allowLocalhost
  );

  // Initialize data on mount
  useEffect(() => {
    refreshBackendHealth();
    loadRunsFromBackend();
  }, []);

  const refreshBackendHealth = async () => {
    const health = await apiService.checkHealth();
    setBackendHealth(health);
  };

  const loadRunsFromBackend = async () => {
    const backendRuns = await apiService.getAllRuns();
    setRuns(backendRuns);
    if (backendRuns.length > 0 && !selectedRunId) {
      setSelectedRunId(backendRuns[0].id);
    }
  };

  const handleUpdateIntent = (updates: Partial<TestIntent>) => {
    setIntent((prev) => ({ ...prev, ...updates }));
  };

  const handleToggleLocalhost = () => {
    setIntent((prev) => ({ ...prev, allowLocalhost: !prev.allowLocalhost }));
  };

  const handleSelectRun = (id: string) => {
    setSelectedRunId(id);
    const chosen = runs.find((r) => r.id === id);
    if (chosen) {
      setIntent(chosen.intent);
    }
  };

  // Run Test Trigger (Real Playwright execution via API)
  const handleRunTest = async (): Promise<TestRun | null> => {
    if (!safetyResult.isValid) return null;

    setRunError(null);
    setIsRunning(true);
    try {
      const realRun = await apiService.createRun(intent);
      // Prepend to runs list
      setRuns((prev) => [realRun, ...prev.filter((r) => r.id !== realRun.id)]);
      setSelectedRunId(realRun.id);
      setLastExecutedRun(realRun);
      return realRun;
    } catch (err: any) {
      console.error('[HealTest] Execution error:', err);
      setRunError(err.message || 'Execution failed: unable to communicate with backend engine.');
      return null;
    } finally {
      setIsRunning(false);
      refreshBackendHealth();
    }
  };

  // Clear real history
  const handleClearHistory = async () => {
    await apiService.clearHistory();
    setRuns([]);
    setSelectedRunId(null);
    setLastExecutedRun(null);
  };

  const healedRunsCount = runs.filter((r) => r.healingRecords && r.healingRecords.length > 0).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Navigation Bar with Page Switcher */}
      <Navbar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        backendHealth={backendHealth}
        onRefreshHealth={refreshBackendHealth}
        allowLocalhost={intent.allowLocalhost}
        totalRunsCount={runs.length}
        healedRunsCount={healedRunsCount}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main Page Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {currentPage === 'dashboard' && (
          <DashboardPage
            runs={runs}
            backendHealth={backendHealth}
            onNavigate={handleNavigate}
            onSelectRun={handleSelectRun}
          />
        )}

        {currentPage === 'new-test' && (
          <NewTestPage
            intent={intent}
            onChangeIntent={handleUpdateIntent}
            safetyResult={safetyResult}
            onRunTest={handleRunTest}
            isRunning={isRunning}
            runError={runError}
            onClearRunError={() => setRunError(null)}
            lastExecutedRun={lastExecutedRun}
            onNavigate={handleNavigate}
            onSelectRun={handleSelectRun}
          />
        )}

        {currentPage === 'history' && (
          <HistoryPage
            runs={runs}
            selectedRunId={selectedRunId}
            onSelectRun={handleSelectRun}
            onClearHistory={handleClearHistory}
            onNavigate={handleNavigate}
          />
        )}

        {currentPage === 'healing' && (
          <HealingInspectorPage
            runs={runs}
            selectedRunId={selectedRunId}
            onSelectRun={handleSelectRun}
            onNavigate={handleNavigate}
          />
        )}

        {currentPage === 'logs-screenshots' && (
          <LogsScreenshotsPage
            runs={runs}
            selectedRunId={selectedRunId}
            onSelectRun={handleSelectRun}
            onNavigate={handleNavigate}
          />
        )}

        {currentPage === 'settings' && (
          <SettingsPage
            backendHealth={backendHealth}
            onRefreshHealth={refreshBackendHealth}
            allowLocalhost={intent.allowLocalhost}
            onToggleLocalhost={handleToggleLocalhost}
            onClearHistory={handleClearHistory}
          />
        )}
      </main>

      {/* Clean Minimal Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 py-4 text-center text-xs text-slate-500 font-mono transition-colors">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>HealTest Platform • Autonomous Intent-Based E2E Testing</span>
          <span className="text-slate-600">Headless Chromium • Playwright • Express REST API</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
