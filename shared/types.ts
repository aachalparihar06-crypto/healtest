// Shared Data Contracts & Types for HealTest Platform

export type TestStatus = 'IDLE' | 'PENDING' | 'RUNNING' | 'PASSED' | 'FAILED' | 'HEALED';

export type ActionType = 'navigate' | 'click' | 'fill' | 'select' | 'hover' | 'press' | 'assert_text' | 'assert_visible' | 'wait';

export type HealingStrategy = 
  | 'role_and_name_match'
  | 'text_content_fuzzy'
  | 'aria_label_fallback'
  | 'parent_traversal'
  | 'semantic_attribute_heuristic'
  | 'placeholder_match'
  | 'surrounding_text_anchor';

export interface ActionSelector {
  role?: string;
  name?: string;
  text?: string;
  placeholder?: string;
  ariaLabel?: string;
  testId?: string;
  cssFallback?: string;
}

export interface CandidateAlternative {
  selector: ActionSelector;
  strategy: HealingStrategy;
  confidenceScore: number; // 0.0 - 1.0
  domSnippet: string;
  matchReason: string;
}

export interface HealingRecord {
  id: string;
  stepId: string;
  stepIndex: number;
  originalAction: {
    type: ActionType;
    selector: ActionSelector;
    value?: string;
  };
  failureReason: string;
  detectedDomChanges: {
    previousExpected: string;
    actualDetected: string;
    changeType: 'element_removed' | 'text_renamed' | 'attribute_changed' | 'hierarchy_shifted' | 'tag_changed';
  };
  candidatesEvaluated: CandidateAlternative[];
  chosenAlternative: CandidateAlternative;
  explanation: string;
  confidenceScore: number;
  healedAt: string;
}

export interface TestStep {
  id: string;
  order: number;
  type: ActionType;
  description: string;
  selector: ActionSelector;
  value?: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'healed';
  durationMs: number;
  error?: string;
  healingRecord?: HealingRecord;
  screenshotBeforeUrl?: string;
  screenshotAfterUrl?: string;
  domSnapshotExcerpt?: string;
}

export interface ExecutionLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'heal' | 'debug';
  message: string;
  stepId?: string;
}

export interface TestIntent {
  targetUrl: string;
  naturalLanguageInstruction: string;
  allowLocalhost: boolean;
  timeoutMs: number;
  maxRetries: number;
  customSuccessCriteria?: string;
}

export interface TestRun {
  id: string;
  createdAt: string;
  completedAt?: string;
  intent: TestIntent;
  status: TestStatus;
  steps: TestStep[];
  healingRecords: HealingRecord[];
  logs: ExecutionLog[];
  screenshots: string[];
  executionTimeMs: number;
  summary: {
    totalSteps: number;
    passedSteps: number;
    failedSteps: number;
    healedSteps: number;
    outcomeVerdict: 'PASSED' | 'FAILED' | 'HEALED' | 'NOT_RUN';
    safetyCheckPassed: boolean;
  };
  errorClassification?: ErrorClassification;
}

export type ErrorCategory = 
  | 'NONE'
  | 'UI_HEALED'
  | 'UI_ELEMENT_MISSING'
  | 'UI_ASSERTION_FAILED'
  | 'APP_NETWORK_ERROR'
  | 'SYSTEM_SAFETY_BLOCK'
  | 'SYSTEM_ERROR'
  | 'UNKNOWN_ERROR';

export interface ErrorClassification {
  category: ErrorCategory;
  label: string;
  details?: string;
  source: 'ui' | 'system' | 'application' | 'none';
}

export interface SafetyValidationResult {
  isValid: boolean;
  isLocal: boolean;
  sanitizedUrl?: string;
  blockedReason?: string;
  warnings: string[];
}

export function classifyTestRun(run: TestRun): ErrorClassification {
  if (run.status === 'PASSED') {
    return {
      category: 'NONE',
      label: 'Clean Pass (No Errors)',
      source: 'none',
      details: 'All steps executed and verified successfully without UI mutations or system faults.'
    };
  }

  if (run.status === 'HEALED') {
    const healCount = run.healingRecords.length || run.summary.healedSteps;
    return {
      category: 'UI_HEALED',
      label: 'UI Mutation Autonomously Healed',
      source: 'ui',
      details: `Discovered and autonomously recovered ${healCount} UI mutation(s) using accessible heuristics and verified ground truth outcome.`
    };
  }

  if (run.status === 'FAILED') {
    const failedStep = run.steps.find((s) => s.status === 'failed');
    const errMsg = failedStep?.error || run.logs.find((l) => l.level === 'error')?.message || '';
    const lower = errMsg.toLowerCase();

    if (
      lower.includes('net::err') ||
      lower.includes('connection refused') ||
      lower.includes('enotfound') ||
      lower.includes('name not resolved') ||
      lower.includes('status 5') ||
      lower.includes('status 404') ||
      lower.includes('failed to load url')
    ) {
      return {
        category: 'APP_NETWORK_ERROR',
        label: 'Target Application Network / Server Error',
        source: 'application',
        details: errMsg || 'Target server was unreachable, connection refused, or returned server error.'
      };
    }

    if (
      lower.includes('safety') ||
      lower.includes('blocked') ||
      lower.includes('localhost') ||
      lower.includes('forbidden') ||
      lower.includes('private network')
    ) {
      return {
        category: 'SYSTEM_SAFETY_BLOCK',
        label: 'System Safety Guard Block',
        source: 'system',
        details: errMsg || 'Target URL was blocked by HealTest safety guardrails.'
      };
    }

    if (
      lower.includes('assertion failed') ||
      lower.includes('not visible in dom') ||
      lower.includes('expected text') ||
      lower.includes('target is not visible')
    ) {
      return {
        category: 'UI_ASSERTION_FAILED',
        label: 'UI Ground Truth Assertion Failure',
        source: 'ui',
        details: errMsg || 'Page loaded but expected UI outcome was not satisfied.'
      };
    }

    if (
      lower.includes('waiting for locator') ||
      lower.includes('element') ||
      lower.includes('not found') ||
      lower.includes('could not find') ||
      lower.includes('timeout') ||
      lower.includes('recovery rejected')
    ) {
      return {
        category: 'UI_ELEMENT_MISSING',
        label: 'UI Element Missing / Selector Broken',
        source: 'ui',
        details: errMsg || 'Element was missing from the live DOM and no safe alternative passed confidence/ambiguity filters.'
      };
    }

    if (lower.includes('chromium') || lower.includes('browser') || lower.includes('fatal error') || lower.includes('runtime')) {
      return {
        category: 'SYSTEM_ERROR',
        label: 'Execution Engine / System Runtime Error',
        source: 'system',
        details: errMsg || 'Playwright engine runtime encountered an unexpected system error.'
      };
    }

    return {
      category: 'UNKNOWN_ERROR',
      label: 'Unclassified Test Failure',
      source: 'system',
      details: errMsg || 'Test failed without specific classified error.'
    };
  }

  return {
    category: 'NONE',
    label: 'Not Executed',
    source: 'none',
    details: 'Test has not been executed.'
  };
}
