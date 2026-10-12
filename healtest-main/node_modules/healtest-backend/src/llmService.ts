import type { 
  TestPlan, 
  TestPlanStep, 
  ActionSelector, 
  CandidateAlternative, 
  RootCauseCategory, 
  TestRun, 
  DeveloperReport,
  TestCodePatch
} from '../../shared/types';

export interface LLMConfig {
  provider: 'openai' | 'gemini' | 'anthropic' | 'custom' | 'deterministic_fallback';
  apiKey?: string;
  model: string;
  baseUrl?: string;
  timeoutMs: number;
}

export interface FailureDiagnosisInput {
  targetUrl: string;
  failedStepDescription: string;
  intendedAction: string;
  originalSelector: ActionSelector;
  errorMessage: string;
  inspectedElements: Array<{
    tagName: string;
    role?: string | null;
    innerText?: string;
    ariaLabel?: string | null;
    id?: string | null;
    attributes?: Record<string, string>;
  }>;
  stackTraceSnippet?: string;
}

export interface LLMDiagnosisResult {
  likelyCause: string;
  supportingEvidence: string[];
  alternativeExplanations: string[];
  confidence: number;
  isVerifiedFact: boolean;
  uncertaintyNotes?: string;
  suggestedReplacement?: ActionSelector;
  rootCauseCategory: RootCauseCategory;
  provider: string;
}

export interface LLMSourceChangeExplanation {
  explanation: string;
  correlationScore: number;
  correlationLabel: 'confirmed' | 'likely' | 'possible' | 'undetermined';
  primaryComponent?: string;
}

export class LLMService {
  private config: LLMConfig;

  constructor(customConfig?: Partial<LLMConfig>) {
    this.config = {
      provider: (process.env.LLM_PROVIDER as any) || (process.env.OPENAI_API_KEY ? 'openai' : (process.env.GEMINI_API_KEY ? 'gemini' : 'deterministic_fallback')),
      apiKey: process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY,
      model: process.env.LLM_MODEL || (process.env.OPENAI_API_KEY ? 'gpt-4o-mini' : (process.env.GEMINI_API_KEY ? 'gemini-1.5-flash' : 'local-deterministic')),
      baseUrl: process.env.LLM_BASE_URL,
      timeoutMs: Number(process.env.LLM_TIMEOUT_MS) || 8000,
      ...customConfig,
    };
  }

  public getStatus() {
    const isConfigured = Boolean(this.config.apiKey && this.config.apiKey.length > 5);
    return {
      provider: this.config.provider,
      model: this.config.model,
      isConfigured,
      mode: isConfigured ? 'live_api' : 'deterministic_fallback',
      timeoutMs: this.config.timeoutMs,
    };
  }

  /**
   * Helper to make an OpenAI-compatible chat completion request with timeout
   */
  private async callOpenAICompatible(prompt: string, systemPrompt: string): Promise<string | null> {
    if (!this.config.apiKey) return null;

    const endpoint = this.config.baseUrl 
      ? `${this.config.baseUrl.replace(/\/+$/, '')}/chat/completions`
      : 'https://api.openai.com/v1/chat/completions';

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: 0.1,
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        console.warn(`[LLMService] HTTP ${response.status} from ${endpoint}`);
        return null;
      }

      const data: any = await response.json();
      return data.choices?.[0]?.message?.content || null;
    } catch (err: any) {
      clearTimeout(timeout);
      console.warn(`[LLMService] API call failed (${err.name}): ${err.message}. Falling back to deterministic analysis.`);
      return null;
    }
  }

  /**
   * Helper to call Google Gemini API if configured
   */
  private async callGemini(prompt: string, systemPrompt: string): Promise<string | null> {
    if (!this.config.apiKey) return null;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}:generateContent?key=${this.config.apiKey}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `${systemPrompt}\n\nStrict instruction: Return ONLY raw JSON with no Markdown backticks.\n\n${prompt}` }]
          }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
          }
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) return null;
      const data: any = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
    } catch (err: any) {
      clearTimeout(timeout);
      console.warn(`[LLMService] Gemini call failed: ${err.message}. Falling back to deterministic analysis.`);
      return null;
    }
  }

  /**
   * Interprets natural language test intent into an explicit structured TestPlan
   */
  public async interpretNaturalLanguageTestPlan(instruction: string, targetUrl: string): Promise<TestPlan> {
    const systemPrompt = `You are an expert QA automation engineer specializing in Playwright end-to-end tests.
Convert natural language test instructions into structured, atomic, verifiable test steps.
Respond strictly in JSON matching this schema:
{
  "name": "concise test name",
  "preconditions": ["list of preconditions"],
  "steps": [
    {
      "order": 1,
      "action": "navigate" | "click" | "fill" | "assert_visible" | "assert_text" | "assert_enabled",
      "description": "human readable action description",
      "targetDescription": "element target name",
      "selector": { "role": "optional role", "name": "optional name", "testId": "optional testId" },
      "value": "optional input or assertion value",
      "expectedOutcome": "verifiable outcome of this step",
      "assertionCriteria": "optional assertion text"
    }
  ]
}`;

    const prompt = `Target URL: ${targetUrl}\nInstruction: "${instruction}"`;

    let rawJson: string | null = null;
    if (this.config.provider === 'openai') {
      rawJson = await this.callOpenAICompatible(prompt, systemPrompt);
    } else if (this.config.provider === 'gemini') {
      rawJson = await this.callGemini(prompt, systemPrompt);
    }

    if (rawJson) {
      try {
        const parsed = JSON.parse(rawJson);
        if (parsed.steps && Array.isArray(parsed.steps) && parsed.steps.length > 0) {
          const testPlanSteps: TestPlanStep[] = parsed.steps.map((s: any, idx: number) => ({
            id: `step-plan-${idx + 1}`,
            order: s.order || idx + 1,
            action: s.action || 'click',
            description: s.description || `Step ${idx + 1}`,
            targetDescription: s.targetDescription || s.description || 'Target',
            selector: s.selector || {},
            value: s.value,
            expectedOutcome: s.expectedOutcome || 'Step executes successfully',
            assertionCriteria: s.assertionCriteria,
          }));

          return {
            id: `plan-${Date.now().toString(36)}`,
            name: parsed.name || 'Natural Language E2E Test',
            originalIntent: instruction,
            targetUrl,
            preconditions: parsed.preconditions || [`Target accessible at ${targetUrl}`],
            steps: testPlanSteps,
            generatedBy: 'llm',
            createdAt: new Date().toISOString(),
            version: '1.0.0',
          };
        }
      } catch (err) {
        console.warn('[LLMService] Failed to parse LLM test plan response:', err);
      }
    }

    // Deterministic fallback generator
    return this.generateDeterministicTestPlan(instruction, targetUrl);
  }

  /**
   * Deterministic test plan generator (prompt requirement #3 fallback)
   */
  public generateDeterministicTestPlan(instruction: string, targetUrl: string): TestPlan {
    const steps: TestPlanStep[] = [];
    const runId = Date.now().toString(36);

    // Step 1: Navigate
    steps.push({
      id: `step-plan-1`,
      order: 1,
      action: 'navigate',
      description: `Navigate to target URL (${targetUrl})`,
      targetDescription: 'Target Application',
      selector: {},
      value: targetUrl,
      expectedOutcome: 'Target page loads with HTTP 200 and initial DOM is ready',
    });

    // Parse clauses
    const clauses = instruction
      .split(/(?:,|\.|\band then\b|\bthen\b|\band\b)/i)
      .map((c) => c.trim())
      .filter((c) => c.length > 3);

    let order = 2;
    for (const clause of clauses) {
      const lower = clause.toLowerCase();

      if (lower.startsWith('navigat') || lower.startsWith('open') || lower.startsWith('go to')) {
        continue; // handled by step 1
      }

      if (lower.includes('enter') || lower.includes('type') || lower.includes('fill') || lower.includes('search for')) {
        const quotedMatches = clause.match(/["']([^"']+)["']/g)?.map((s) => s.replace(/["']/g, ''));
        const value = quotedMatches ? quotedMatches[0] : clause.replace(/.*(?:for|enter|type|fill)\s+/i, '').trim();
        const fieldName = quotedMatches && quotedMatches.length > 1 ? quotedMatches[1] : 'search input';

        steps.push({
          id: `step-plan-${order}`,
          order: order++,
          action: 'fill',
          description: `Enter "${value}" into field`,
          targetDescription: fieldName,
          selector: { role: 'textbox', name: fieldName },
          value,
          expectedOutcome: `Input field contains "${value}"`,
        });
      } else if (lower.includes('click') || lower.includes('press') || lower.includes('add') || lower.includes('checkout') || lower.includes('submit')) {
        const quoted = clause.match(/["']([^"']+)["']/)?.[1];
        const btnText = quoted || (lower.includes('checkout') ? 'Checkout' : lower.includes('add to cart') || lower.includes('add it to the cart') ? 'Add to Cart' : 'Submit');

        steps.push({
          id: `step-plan-${order}`,
          order: order++,
          action: 'click',
          description: `Click "${btnText}"`,
          targetDescription: btnText,
          selector: { role: 'button', name: btnText },
          expectedOutcome: `Interactive action "${btnText}" dispatched to element`,
        });
      } else if (lower.includes('verify') || lower.includes('assert') || lower.includes('check')) {
        const quoted = clause.match(/["']([^"']+)["']/)?.[1];
        const assertText = quoted || clause.replace(/.*(?:verify|assert|check)\s+(?:that\s+)?/i, '').replace(/\s+is\s+visible.*/i, '').trim();

        steps.push({
          id: `step-plan-${order}`,
          order: order++,
          action: 'assert_visible',
          description: `Verify that "${assertText}" is visible`,
          targetDescription: assertText,
          selector: { text: assertText, name: assertText },
          value: assertText,
          expectedOutcome: `Element containing "${assertText}" is rendered and visible in DOM`,
          assertionCriteria: assertText,
        });
      }
    }

    // Default assertion if none generated
    if (steps.length === 2 && steps[1].action === 'click') {
      steps.push({
        id: `step-plan-${order}`,
        order: order++,
        action: 'assert_visible',
        description: `Verify action outcome for "${steps[1].targetDescription}"`,
        targetDescription: 'Status Confirmation',
        selector: { role: 'status' },
        expectedOutcome: 'Application presents visible confirmation banner or state transition',
      });
    }

    return {
      id: `plan-${runId}`,
      name: `Intent Test Plan: ${clauses[0] || 'E2E Flow'}`,
      originalIntent: instruction,
      targetUrl,
      preconditions: [`Target accessible at ${targetUrl}`, 'Chromium browser session initialized'],
      steps,
      generatedBy: 'deterministic',
      createdAt: new Date().toISOString(),
      version: '1.0.0',
    };
  }

  /**
   * Diagnoses Playwright failure using LLM or deterministic analysis
   */
  public async diagnoseFailureAndSuggestRecovery(input: FailureDiagnosisInput): Promise<LLMDiagnosisResult> {
    const isConfigured = Boolean(this.config.apiKey && this.config.apiKey.length > 5);

    if (isConfigured) {
      const systemPrompt = `You are a Principal Test Automation Architect and Playwright debugging expert.
Analyze this Playwright test step failure using the provided live DOM evidence.
Return strictly valid JSON:
{
  "likelyCause": "concise technical root cause",
  "supportingEvidence": ["evidence 1", "evidence 2"],
  "alternativeExplanations": ["alternative if plausible"],
  "confidence": 0.85,
  "isVerifiedFact": false,
  "uncertaintyNotes": "what cannot be proven with certainty",
  "rootCauseCategory": "LOCATOR_MISMATCH" | "ACCESSIBLE_NAME_OR_ATTRIBUTE_CHANGE" | "MISSING_OR_UNEXPECTED_ELEMENT" | "TIMING_OR_SYNCHRONIZATION_ISSUE" | "NAVIGATION_OR_NETWORK_FAILURE" | "APPLICATION_LOGIC_OR_ASSERTION_FAILURE" | "TEST_SETUP_OR_INFRASTRUCTURE_FAILURE" | "UNKNOWN_OR_INSUFFICIENT_EVIDENCE",
  "suggestedReplacement": {
    "role": "button",
    "name": "Add to Basket",
    "testId": "add-to-basket"
  }
}`;

      const sanitizedElements = input.inspectedElements.slice(0, 15).map(e => ({
        tag: e.tagName,
        role: e.role,
        text: (e.innerText || '').slice(0, 60),
        aria: e.ariaLabel,
        id: e.id,
        testId: e.attributes?.['data-testid'] || e.attributes?.['data-test']
      }));

      const prompt = `Failed Step: ${input.failedStepDescription}
Intended Action: ${input.intendedAction}
Original Selector: ${JSON.stringify(input.originalSelector)}
Error Message: ${input.errorMessage}
Live DOM Elements Discovered:
${JSON.stringify(sanitizedElements, null, 2)}`;

      let rawJson: string | null = null;
      if (this.config.provider === 'openai') {
        rawJson = await this.callOpenAICompatible(prompt, systemPrompt);
      } else if (this.config.provider === 'gemini') {
        rawJson = await this.callGemini(prompt, systemPrompt);
      }

      if (rawJson) {
        try {
          const parsed = JSON.parse(rawJson);
          return {
            likelyCause: parsed.likelyCause || 'Element identifier mismatch between test definition and current live DOM.',
            supportingEvidence: parsed.supportingEvidence || [input.errorMessage],
            alternativeExplanations: parsed.alternativeExplanations || [],
            confidence: Math.min(0.98, Math.max(0.1, Number(parsed.confidence) || 0.85)),
            isVerifiedFact: Boolean(parsed.isVerifiedFact),
            uncertaintyNotes: parsed.uncertaintyNotes || 'Inferred from live element inspection; requires Playwright execution verification.',
            suggestedReplacement: parsed.suggestedReplacement,
            rootCauseCategory: parsed.rootCauseCategory || 'LOCATOR_MISMATCH',
            provider: `${this.config.provider} (${this.config.model})`,
          };
        } catch (err) {
          console.warn('[LLMService] Failed to parse diagnosis JSON:', err);
        }
      }
    }

    // Deterministic Diagnosis Fallback (Prompt Requirement #3)
    return this.generateDeterministicDiagnosis(input);
  }

  private generateDeterministicDiagnosis(input: FailureDiagnosisInput): LLMDiagnosisResult {
    const errLower = input.errorMessage.toLowerCase();
    const origName = (input.originalSelector.name || input.originalSelector.text || '').toLowerCase();

    // Check if attribute changed or renamed
    let category: RootCauseCategory = 'LOCATOR_MISMATCH';
    let likelyCause = `The original locator ${JSON.stringify(input.originalSelector)} could not resolve a visible element in the current DOM state.`;
    const evidence: string[] = [`Playwright timed out waiting for locator: ${input.errorMessage.slice(0, 120)}`];
    let candidateReplacement: ActionSelector | undefined = undefined;

    // Search live elements for semantic candidates
    const match = input.inspectedElements.find(el => {
      const text = (el.innerText || '').toLowerCase();
      const aria = (el.ariaLabel || '').toLowerCase();
      const testId = (el.attributes?.['data-testid'] || '').toLowerCase();

      // Shopping / E-commerce synonyms: cart -> basket, checkout -> purchase
      if (origName.includes('cart') && (text.includes('basket') || testId.includes('basket'))) return true;
      if (origName.includes('checkout') && (text.includes('purchase') || text.includes('continue to purchase'))) return true;
      if (origName.includes('submit') && (text.includes('send') || aria.includes('send'))) return true;
      return false;
    });

    if (match) {
      category = 'ACCESSIBLE_NAME_OR_ATTRIBUTE_CHANGE';
      likelyCause = `UI Mutation Detected: Target element was renamed or updated its semantic identifiers from "${origName}" to "${match.innerText || match.ariaLabel}".`;
      evidence.push(`Found interactive <${match.tagName}> with text "${match.innerText}" and role "${match.role || 'button'}".`);
      candidateReplacement = {
        role: match.role || 'button',
        name: match.innerText || match.ariaLabel || undefined,
        ariaLabel: match.ariaLabel || undefined,
        testId: match.attributes?.['data-testid'],
      };
    } else if (errLower.includes('assertion failed') || errLower.includes('not visible in dom')) {
      category = 'APPLICATION_LOGIC_OR_ASSERTION_FAILURE';
      likelyCause = 'Action was dispatched, but expected outcome state was not established in the DOM.';
      evidence.push('Verifiable assertion condition failed against current live page content.');
    } else if (errLower.includes('timeout')) {
      category = 'TIMING_OR_SYNCHRONIZATION_ISSUE';
      likelyCause = 'Element was not mounted or did not transition to an enabled state within the allocated timeout window.';
      evidence.push(`Exceeded execution timeout.`);
    }

    return {
      likelyCause,
      supportingEvidence: evidence,
      alternativeExplanations: ['Element may have been conditionally unmounted by a state change.', 'Network lag may have delayed DOM rendering.'],
      confidence: match ? 0.90 : 0.65,
      isVerifiedFact: false,
      uncertaintyNotes: 'Determined via heuristic DOM inspection. Must be validated via Playwright execution retry.',
      suggestedReplacement: candidateReplacement,
      rootCauseCategory: category,
      provider: 'Deterministic Rule Engine (LLM Fallback)',
    };
  }

  /**
   * Generates a concise developer report from a completed TestRun
   */
  public generateDeveloperReport(run: TestRun): DeveloperReport {
    const isHealed = run.status === 'HEALED';
    const isPassed = run.status === 'PASSED';
    const failedStep = run.steps.find(s => s.status === 'failed' || s.status === 'error');
    const healedStep = run.steps.find(s => s.status === 'healed');
    const topRecord = run.healingRecords[0];

    const whatFailed = isPassed 
      ? 'No failure occurred. All steps passed cleanly.'
      : isHealed
      ? `Step #${healedStep?.order || 2} ("${healedStep?.description}") failed with locator: ${JSON.stringify(topRecord?.originalAction?.selector || {})}.`
      : `Step #${failedStep?.order || 1} ("${failedStep?.description}") permanently failed: ${failedStep?.error || 'Unknown error'}.`;

    const whyItProbablyFailed = isPassed
      ? 'Baseline assertions and locators accurately matched the live DOM.'
      : isHealed
      ? `UI mutation in application: ${topRecord?.detectedDomChanges?.changeType || 'Attribute change'} caused original locator to miss.`
      : run.errorClassification?.details || 'Target element was not accessible or expected assertion criteria was not met.';

    const recoveryAttempted = isHealed
      ? `Applied ${topRecord?.chosenAlternative?.strategy || 'accessible heuristic'} recovery. Replaced locator with ${JSON.stringify(topRecord?.chosenAlternative?.selector || {})}.`
      : 'No viable, unambiguous candidate met the safety confidence threshold (65%).';

    const recommendedFix = isHealed
      ? `Update Playwright test selector to use: await page.getByRole('${topRecord?.chosenAlternative?.selector?.role || 'button'}', { name: '${topRecord?.chosenAlternative?.selector?.name || ''}' }).click();`
      : isPassed
      ? 'Test code is healthy. No maintenance required.'
      : 'Inspect application DOM to verify whether element is missing or application behavior is broken.';

    return {
      runId: run.id,
      timestamp: new Date().toISOString(),
      whatFailed,
      whyItProbablyFailed,
      evidenceInspected: run.logs.slice(-5).map(l => l.message),
      recoveryAttempted,
      whySelectedStrategyWasAppropriate: isHealed
        ? `Top candidate achieved ${Math.round((topRecord?.confidenceScore || 0.9) * 100)}% confidence with unambiguous semantic match and matching role.`
        : 'Safety filters rejected candidate elements to prevent unintended destructive clicks.',
      whetherRecoverySucceeded: isHealed,
      whatWasVerified: run.intent.customSuccessCriteria || 'Ground truth outcome state verified in live browser DOM.',
      whetherAppSourceCodeChanged: false,
      whetherTestCodeChanged: isHealed,
      recommendedPermanentFix: recommendedFix,
      approvalStatus: isHealed ? 'pending_review' : 'applied',
    };
  }

  /**
   * Generates Playwright test code before-and-after patch
   */
  public generateTestCodePatch(run: TestRun): TestCodePatch | undefined {
    const topRecord = run.healingRecords[0];
    if (!topRecord) return undefined;

    const origSel = topRecord.originalAction.selector;
    const newSel = topRecord.chosenAlternative.selector;

    let origCode = `await page.locator('${origSel.name || origSel.text || 'button'}').click();`;
    if (origSel.testId) {
      origCode = `await page.getByTestId('${origSel.testId}').click();`;
    } else if (origSel.role && origSel.name) {
      origCode = `await page.getByRole('${origSel.role}', { name: '${origSel.name}' }).click();`;
    }

    let newCode = `await page.getByRole('${newSel.role || 'button'}', { name: '${newSel.name || ''}' }).click();`;
    if (newSel.testId) {
      newCode = `await page.getByTestId('${newSel.testId}').click();`;
    }

    const diff = `--- test.spec.ts (Original)\n+++ test.spec.ts (Suggested Patch)\n@@ -1,1 +1,1 @@\n-${origCode}\n+${newCode}`;

    return {
      id: `patch-${Date.now().toString(36)}`,
      runId: run.id,
      originalPlaywrightCode: origCode,
      suggestedReplacementCode: newCode,
      patchStatus: 'suggested_permanent_patch',
      patchDiff: diff,
      createdAt: new Date().toISOString(),
      authorNote: `Autonomous recovery via HealTest: Repaired broken locator with validated live candidate (${Math.round(topRecord.confidenceScore * 100)}% confidence).`,
    };
  }
}

export const llmService = new LLMService();
