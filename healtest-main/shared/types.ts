// Shared Data Contracts & Types for HealTest Platform

export type TestStatus = 'IDLE' | 'PENDING' | 'RUNNING' | 'PASSED' | 'FAILED' | 'HEALED' | 'ERROR';

export type ActionType = 'navigate' | 'click' | 'fill' | 'select' | 'hover' | 'press' | 'assert_text' | 'assert_visible' | 'assert_enabled' | 'assert_disabled' | 'wait';

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
  status: 'pending' | 'running' | 'passed' | 'failed' | 'healed' | 'blocked' | 'skipped' | 'error';
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
    blockedSteps?: number;
    skippedSteps?: number;
    outcomeVerdict: 'PASSED' | 'FAILED' | 'HEALED' | 'ERROR' | 'NOT_RUN';
    safetyCheckPassed: boolean;
  };
  errorClassification?: ErrorClassification;
  testPlan?: TestPlan;
  healingTimeline?: EightStageTimelineRecord[];
  sourceCodeDiff?: SourceCodeDiffResult;
  developerReport?: DeveloperReport;
  suggestedTestPatch?: TestCodePatch;
}

// 8 Evidence-Based Root Cause Classification Categories (Prompt Requirement #9)
export type RootCauseCategory =
  | 'LOCATOR_MISMATCH'
  | 'ACCESSIBLE_NAME_OR_ATTRIBUTE_CHANGE'
  | 'MISSING_OR_UNEXPECTED_ELEMENT'
  | 'TIMING_OR_SYNCHRONIZATION_ISSUE'
  | 'NAVIGATION_OR_NETWORK_FAILURE'
  | 'APPLICATION_LOGIC_OR_ASSERTION_FAILURE'
  | 'TEST_SETUP_OR_INFRASTRUCTURE_FAILURE'
  | 'UNKNOWN_OR_INSUFFICIENT_EVIDENCE'
  | 'NONE';

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
  rootCauseCategory?: RootCauseCategory;
  label: string;
  details?: string;
  source: 'ui' | 'system' | 'application' | 'none';
  evidence?: string[];
  confidence?: number;
}

// Natural-Language Test Plan Contracts (Prompt Requirement #2)
export interface TestPlanStep {
  id: string;
  order: number;
  action: ActionType;
  description: string;
  targetDescription: string;
  selector: ActionSelector;
  value?: string;
  expectedOutcome: string;
  assertionCriteria?: string;
}

export interface TestPlan {
  id: string;
  name: string;
  originalIntent: string;
  targetUrl: string;
  preconditions: string[];
  steps: TestPlanStep[];
  generatedBy: 'llm' | 'deterministic' | 'hybrid';
  createdAt: string;
  version: string;
}

// Complete 8-Stage Healing Timeline (Prompt Requirement #5)
export interface EightStageTimelineRecord {
  stepId: string;
  stepOrder: number;
  timestamp: string;

  // Stage 1 — Original Execution
  stage1_originalExecution: {
    testStep: string;
    intendedAction: ActionType;
    originalLocator: ActionSelector;
    originalPlaywrightCode: string;
    expectedResult: string;
    actualResult: string;
  };

  // Stage 2 — Failure Detection
  stage2_failureDetection: {
    errorMessage: string;
    failureCategory: RootCauseCategory;
    timestamp: string;
    durationMs: number;
    stackTraceSnippet?: string;
    screenshotUrl?: string;
  };

  // Stage 3 — Diagnosis
  stage3_diagnosis: {
    llmLikelyCause: string;
    supportingEvidence: string[];
    alternativeExplanations: string[];
    confidence: number;
    isVerifiedFact: boolean;
    uncertaintyNotes?: string;
    provider: string;
  };

  // Stage 4 — DOM Inspection
  stage4_domInspection: {
    inspectedHtmlSnippet: string;
    accessibleRole?: string;
    accessibleName?: string;
    relevantAttributes: Record<string, string>;
    candidateElementsCount: number;
    candidatesInspected: Array<{
      selector: ActionSelector;
      outerHtml: string;
      role?: string;
      name?: string;
      isVisible: boolean;
      isEnabled: boolean;
      isUnique: boolean;
    }>;
  };

  // Stage 5 — Healing Decision
  stage5_healingDecision: {
    strategiesAttempted: HealingStrategy[];
    candidateLocatorsConsidered: CandidateAlternative[];
    selectedReplacementLocator: ActionSelector;
    evidenceSupportingSelection: string;
    rejectionReasons: Array<{ candidate: string; reason: string }>;
  };

  // Stage 6 — Retry
  stage6_retry: {
    originalAction: string;
    replacementAction: string;
    playwrightCommandExecuted: string;
    retryCount: number;
    durationMs: number;
    result: 'success' | 'failed';
  };

  // Stage 7 — Verification
  stage7_verification: {
    expectedAssertion: string;
    actualObservedState: string;
    verificationResult: 'passed' | 'failed';
    supportingLogs: string[];
    screenshotUrl?: string;
  };

  // Stage 8 — Final Result
  stage8_finalResult: {
    verdict: 'PASS' | 'HEALED' | 'FAIL' | 'INCONCLUSIVE';
    rootCauseSummary: string;
    recoverySummary: string;
    applicationSourceCodeModified: boolean;
    recommendedNextAction: string;
  };
}

// Source-Code Diff & Change Impact Analysis (Prompt Requirement #6)
export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: Array<{
    type: 'add' | 'delete' | 'context';
    content: string;
    oldLineNumber?: number;
    newLineNumber?: number;
  }>;
}

export interface ChangedFileDiff {
  filePath: string;
  oldPath?: string;
  newPath?: string;
  hunks: DiffHunk[];
  addedLinesCount: number;
  removedLinesCount: number;
  detectedAttributeChanges: Array<{
    element: string;
    oldAttribute: string;
    oldValue: string;
    newAttribute: string;
    newValue: string;
    impactExplanation: string;
  }>;
  correlationScore: number; // 0.0 - 1.0
  correlationLabel: 'confirmed' | 'likely' | 'possible' | 'undetermined';
  correlationReasoning: string;
}

export interface SourceCodeDiffResult {
  versionAId: string;
  versionBId: string;
  isAvailable: boolean;
  unavailableNotice?: string;
  filesChanged: ChangedFileDiff[];
  summary: {
    totalFiles: number;
    totalAdditions: number;
    totalDeletions: number;
    primaryImpactComponent?: string;
  };
  explanation: string;
}

// Before-and-After Test-Code Patch (Prompt Requirement #7)
export interface TestCodePatch {
  id: string;
  testId?: string;
  runId?: string;
  originalPlaywrightCode: string;
  suggestedReplacementCode: string;
  patchStatus: 
    | 'runtime_recovery_only' 
    | 'suggested_permanent_patch' 
    | 'approved_and_applied' 
    | 'application_source_unchanged';
  patchDiff: string;
  createdAt: string;
  appliedAt?: string;
  authorNote: string;
}

// Developer Report (Prompt Requirement #10)
export interface DeveloperReport {
  runId: string;
  timestamp: string;
  whatFailed: string;
  whyItProbablyFailed: string;
  evidenceInspected: string[];
  recoveryAttempted: string;
  whySelectedStrategyWasAppropriate: string;
  whetherRecoverySucceeded: boolean;
  whatWasVerified: string;
  whetherAppSourceCodeChanged: boolean;
  whetherTestCodeChanged: boolean;
  recommendedPermanentFix: string;
  approvalStatus: 'pending_review' | 'approved' | 'rejected' | 'applied';
}

// Historical Healing Memory & Analytics (Prompt Requirement #11)
export interface ComponentHealingMetric {
  componentName: string;
  healCount: number;
  failCount: number;
  lastHealedAt: string;
  topStrategies: HealingStrategy[];
}

export interface HealingAnalyticsSummary {
  totalRunsExecuted: number;
  cleanPassCount: number;
  healedCount: number;
  failedCount: number;
  inconclusiveCount: number;
  overallHealingSuccessRatePercent: number;
  repeatedLocatorFailures: Array<{ locator: string; occurrences: number; lastFailedAt: string }>;
  frequentlyHealedComponents: ComponentHealingMetric[];
  recurringRootCauses: Array<{ category: RootCauseCategory; count: number; percentage: number }>;
  suggestedMaintenanceTests: Array<{ testId: string; reason: string; priority: 'high' | 'medium' | 'low' }>;
}

export interface InspectedElement {
  tagName: string;
  role: string | null;
  innerText: string;
  ariaLabel: string | null;
  placeholder: string | null;
  id: string | null;
  name: string | null;
  type: string | null;
  classes: string;
  outerHtml: string;
  isVisible: boolean;
  isEnabled: boolean;
  label?: string | null;
  attributes?: Record<string, string>;
  frameUrl?: string | null;
  suggestedAction?: string;
}

export interface DomInspectionResult {
  targetUrl: string;
  finalUrl: string;
  pageTitle: string;
  httpStatus: number | null;
  inspectedAt: string;
  durationMs: number;
  elements: InspectedElement[];
  summary: {
    totalElements: number;
    buttonsCount: number;
    inputsCount: number;
    linksCount: number;
    textElementsCount: number;
  };
  errors: string[];
  screenshotUrl?: string;
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
      rootCauseCategory: 'NONE',
      label: 'Clean Pass (No Errors)',
      source: 'none',
      confidence: 1.0,
      evidence: ['All steps executed and verified successfully without mutations or faults.'],
      details: 'All steps executed and verified successfully without UI mutations or system faults.'
    };
  }

  if (run.status === 'HEALED') {
    const healCount = run.healingRecords.length || run.summary.healedSteps;
    const topRecord = run.healingRecords[0];
    const rootCat: RootCauseCategory = topRecord?.detectedDomChanges?.changeType === 'attribute_changed' || topRecord?.detectedDomChanges?.changeType === 'text_renamed'
      ? 'ACCESSIBLE_NAME_OR_ATTRIBUTE_CHANGE'
      : 'LOCATOR_MISMATCH';

    return {
      category: 'UI_HEALED',
      rootCauseCategory: rootCat,
      label: 'UI Mutation Autonomously Healed',
      source: 'ui',
      confidence: topRecord?.confidenceScore || 0.9,
      evidence: [
        `Detected ${healCount} UI mutation(s).`,
        `Repaired selector: ${JSON.stringify(topRecord?.chosenAlternative?.selector || {})}`,
        `Strategy: ${topRecord?.chosenAlternative?.strategy || 'accessible heuristic'}`
      ],
      details: `Discovered and autonomously recovered ${healCount} UI mutation(s) using accessible heuristics and verified ground truth outcome.`
    };
  }

  if (run.status === 'FAILED' || run.status === 'ERROR') {
    const failedStep = run.steps.find((s) => s.status === 'failed' || s.status === 'error');
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
        rootCauseCategory: 'NAVIGATION_OR_NETWORK_FAILURE',
        label: 'Navigation / Network Failure',
        source: 'application',
        confidence: 0.95,
        evidence: [errMsg, `Target URL: ${run.intent.targetUrl}`],
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
        rootCauseCategory: 'TEST_SETUP_OR_INFRASTRUCTURE_FAILURE',
        label: 'System Safety Guard Block',
        source: 'system',
        confidence: 1.0,
        evidence: [errMsg],
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
        rootCauseCategory: 'APPLICATION_LOGIC_OR_ASSERTION_FAILURE',
        label: 'Application Logic / Assertion Failure',
        source: 'ui',
        confidence: 0.92,
        evidence: [errMsg, `Step: ${failedStep?.description || 'Assertion step'}`],
        details: errMsg || 'Page loaded and actions were taken, but verifiable business outcome was not satisfied.'
      };
    }

    if (
      lower.includes('timeout') && (lower.includes('waiting for') || lower.includes('navigation') || lower.includes('load'))
    ) {
      return {
        category: 'UI_ELEMENT_MISSING',
        rootCauseCategory: 'TIMING_OR_SYNCHRONIZATION_ISSUE',
        label: 'Timing / Synchronization Issue',
        source: 'ui',
        confidence: 0.85,
        evidence: [errMsg, 'Exceeded default timeout threshold during element wait or network idle'],
        details: errMsg || 'Action timed out waiting for DOM element or page state synchronization.'
      };
    }

    if (
      lower.includes('attribute') ||
      lower.includes('data-testid') ||
      lower.includes('aria-label')
    ) {
      return {
        category: 'UI_ELEMENT_MISSING',
        rootCauseCategory: 'ACCESSIBLE_NAME_OR_ATTRIBUTE_CHANGE',
        label: 'Accessible Name / Attribute Change',
        source: 'ui',
        confidence: 0.88,
        evidence: [errMsg],
        details: errMsg || 'Element identifier or attribute changed from previous expected specification.'
      };
    }

    if (
      lower.includes('waiting for locator') ||
      lower.includes('element') ||
      lower.includes('not found') ||
      lower.includes('could not find') ||
      lower.includes('recovery rejected')
    ) {
      return {
        category: 'UI_ELEMENT_MISSING',
        rootCauseCategory: 'LOCATOR_MISMATCH',
        label: 'Locator / Selector Mismatch',
        source: 'ui',
        confidence: 0.89,
        evidence: [errMsg, `Original locator: ${JSON.stringify(failedStep?.selector || {})}`],
        details: errMsg || 'Element was missing from the live DOM and no candidate passed confidence threshold.'
      };
    }

    if (lower.includes('chromium') || lower.includes('browser') || lower.includes('fatal error') || lower.includes('runtime') || run.status === 'ERROR') {
      return {
        category: 'SYSTEM_ERROR',
        rootCauseCategory: 'TEST_SETUP_OR_INFRASTRUCTURE_FAILURE',
        label: 'Test Setup / Infrastructure Failure',
        source: 'system',
        confidence: 0.95,
        evidence: [errMsg],
        details: errMsg || 'Playwright engine runtime encountered an unexpected runner/infrastructure error.'
      };
    }

    return {
      category: 'UNKNOWN_ERROR',
      rootCauseCategory: 'UNKNOWN_OR_INSUFFICIENT_EVIDENCE',
      label: 'Unknown / Insufficient Evidence',
      source: 'system',
      confidence: 0.40,
      evidence: [errMsg || 'No specific error details captured'],
      details: errMsg || 'Test failed without sufficient evidence to classify root cause.'
    };
  }

  return {
    category: 'NONE',
    rootCauseCategory: 'NONE',
    label: 'Not Executed',
    source: 'none',
    confidence: 1.0,
    details: 'Test has not been executed.'
  };
}
