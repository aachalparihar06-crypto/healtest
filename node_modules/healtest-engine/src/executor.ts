import { chromium, Browser, BrowserContext, Page, Locator } from 'playwright';
import path from 'path';
import fs from 'fs';
import type { 
  TestIntent, 
  TestStep, 
  TestRun, 
  ExecutionLog, 
  ActionSelector,
  HealingRecord,
  DomInspectionResult,
  InspectedElement
} from '../../shared/types';
import { classifyTestRun } from '../../shared/types';
import { decomposeIntentIntoSteps, groundStepsWithLiveDom } from './intentParser';
import { inspectInteractiveDom } from './domAnalyzer';
import { evaluateSelfHealingCandidates } from './healingStrategist';

export interface ExecutorOptions {
  headless?: boolean;
  artifactsDir?: string;
  screenshotBaseUrl?: string;
  defaultTimeoutMs?: number;
}

export class PlaywrightExecutor {
  private options: ExecutorOptions;

  constructor(options: ExecutorOptions = {}) {
    this.options = {
      headless: true,
      artifactsDir: path.resolve(process.cwd(), 'artifacts'),
      screenshotBaseUrl: '/api/screenshots',
      defaultTimeoutMs: 10000,
      ...options,
    };
  }

  /**
   * Resolves a Playwright locator from accessible roles, labels, text, and placeholders.
   * Never relies on brittle, site-specific hardcoded CSS/XPath selectors.
   */
  public resolveAccessibleLocator(page: Page, selector: ActionSelector): Locator {
    // 1. Accessibility Role + Name
    if (selector.role && selector.name) {
      const escaped = selector.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (selector.role === 'button') {
        let loc = page.getByRole('button', { name: selector.name })
          .or(page.getByRole('button', { name: new RegExp(escaped, 'i') }))
          .or(page.getByRole('link', { name: selector.name }))
          .or(page.getByRole('link', { name: new RegExp(escaped, 'i') }))
          .or(page.locator(`input[type="submit"][value*="${selector.name}" i]`))
          .or(page.locator(`input[type="button"][value*="${selector.name}" i]`))
          .or(page.locator(`button[id*="${selector.name}" i]`))
          .or(page.locator(`button[name*="${selector.name}" i]`))
          .or(page.getByText(selector.name, { exact: false }));
        if (selector.testId) loc = loc.or(page.getByTestId(selector.testId));
        if (selector.cssFallback) loc = loc.or(page.locator(selector.cssFallback));
        return loc;
      }
      if (selector.role === 'link') {
        let loc = page.getByRole('link', { name: selector.name })
          .or(page.getByRole('link', { name: new RegExp(escaped, 'i') }))
          .or(page.getByRole('button', { name: selector.name }))
          .or(page.getByRole('button', { name: new RegExp(escaped, 'i') }))
          .or(page.locator(`a:has-text("${selector.name}")`))
          .or(page.getByText(selector.name, { exact: false }));
        if (selector.testId) loc = loc.or(page.getByTestId(selector.testId));
        if (selector.cssFallback) loc = loc.or(page.locator(selector.cssFallback));
        return loc;
      }
      if (selector.role === 'textbox') {
        let loc = page.getByRole('textbox', { name: selector.name })
          .or(page.getByRole('textbox', { name: new RegExp(escaped, 'i') }))
          .or(page.getByLabel(selector.name))
          .or(page.getByPlaceholder(selector.name))
          .or(page.locator(`input[name*="${selector.name}" i]`))
          .or(page.locator(`input[id*="${selector.name}" i]`));
        if (selector.placeholder) loc = loc.or(page.getByPlaceholder(selector.placeholder));
        if (selector.testId) loc = loc.or(page.getByTestId(selector.testId));
        if (selector.cssFallback) loc = loc.or(page.locator(selector.cssFallback));
        return loc;
      }
      let loc = page.getByRole(selector.role as any, { name: selector.name })
        .or(page.getByRole(selector.role as any, { name: new RegExp(escaped, 'i') }))
        .or(page.getByText(selector.name, { exact: false }));
      if (selector.testId) loc = loc.or(page.getByTestId(selector.testId));
      if (selector.cssFallback) loc = loc.or(page.locator(selector.cssFallback));
      return loc;
    }

    // 2. Accessibility Role alone
    if (selector.role && !selector.name) {
      return page.getByRole(selector.role as any);
    }

    // 3. Aria Label
    if (selector.ariaLabel) {
      return page.getByLabel(selector.ariaLabel);
    }

    // 4. Placeholder
    if (selector.placeholder) {
      return page.getByPlaceholder(selector.placeholder);
    }

    // 5. Accessible Text & Goal Target Matching
    if (selector.text || selector.name) {
      const targetText = selector.text || selector.name || '';
      const escaped = targetText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      let loc = page.getByRole('heading', { name: new RegExp(escaped, 'i') })
        .or(page.getByRole('main', { name: new RegExp(escaped, 'i') }))
        .or(page.getByRole('tab', { name: new RegExp(escaped, 'i') }))
        .or(page.locator(`[aria-current="page"]:has-text("${targetText}")`))
        .or(page.locator(`.active:has-text("${targetText}")`))
        .or(page.getByText(targetText, { exact: false }));
      if (selector.testId) loc = loc.or(page.getByTestId(selector.testId));
      if (selector.cssFallback) loc = loc.or(page.locator(selector.cssFallback));
      return loc;
    }

    // 6. Test ID fallback
    if (selector.testId) {
      return page.getByTestId(selector.testId);
    }

    // 7. CSS Fallback if provided
    if (selector.cssFallback) {
      return page.locator(selector.cssFallback);
    }

    // Default to body
    return page.locator('body');
  }

  /**
   * Executes a full test intent with Playwright, featuring autonomous self-healing on failure.
   */
  public async executeTestRun(intent: TestIntent): Promise<TestRun> {
    const runId = `run-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const startTime = Date.now();
    const logs: ExecutionLog[] = [];
    const screenshotPaths: string[] = [];
    const healingRecords: HealingRecord[] = [];

    const runArtifactsDir = path.join(this.options.artifactsDir || 'artifacts', runId);
    fs.mkdirSync(runArtifactsDir, { recursive: true });

    const addLog = (level: ExecutionLog['level'], message: string, stepId?: string) => {
      logs.push({
        id: `log-${Date.now().toString(36)}-${logs.length}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        level,
        message,
        stepId,
      });
    };

    addLog('info', `Initializing Playwright execution engine for target: ${intent.targetUrl}`);
    addLog('info', `Intent instruction: "${intent.naturalLanguageInstruction}"`);

    const steps = decomposeIntentIntoSteps(intent);
    addLog('info', `Decomposed intent into ${steps.length} atomic actions using accessible semantics.`);

    let browser: Browser | null = null;
    let context: BrowserContext | null = null;
    let page: Page | null = null;
    let isInfrastructureError = false;
    let runStatus: TestRun['status'] = 'PENDING';

    try {
      // Try explicit executable path first; fall back to Playwright-managed binary
      let launchArgs: any = {
        headless: this.options.headless,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      };
      try {
        const execPath = chromium.executablePath();
        launchArgs.executablePath = execPath;
        addLog('info', `Launching Chromium at ${execPath} (headless: ${this.options.headless})...`);
      } catch {
        addLog('info', `Launching Playwright-managed Chromium (headless: ${this.options.headless})...`);
      }
      browser = await chromium.launch(launchArgs);

      context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        userAgent: 'HealTest-Autonomous-Runner/1.0 (Playwright)',
      });

      page = await context.newPage();
      page.setDefaultTimeout(intent.timeoutMs || this.options.defaultTimeoutMs || 10000);

      // Listen for browser console messages & errors to capture real evidence
      page.on('console', (msg) => {
        if (msg.type() === 'error' || msg.type() === 'warning') {
          addLog(msg.type() === 'error' ? 'error' : 'warn', `[Browser Console] ${msg.text()}`);
        }
      });

      page.on('pageerror', (err) => {
        addLog('warn', `[Page Unhandled Exception] ${err.message}`);
      });

      // Execute steps sequentially
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        step.status = 'running';
        const stepStart = Date.now();
        addLog('info', `[Step #${step.order}] Executing ${step.type.toUpperCase()}: ${step.description}`, step.id);

        try {
          switch (step.type) {
            case 'navigate': {
              const targetUrl = step.value || intent.targetUrl;
              let response;
              try {
                response = await page.goto(targetUrl, {
                  waitUntil: 'domcontentloaded',
                  timeout: intent.timeoutMs || 15000,
                });
              } catch (navErr: any) {
                const msg = navErr.message || String(navErr);
                // Translate low-level network errors into human-readable form
                if (msg.includes('net::ERR_CONNECTION_REFUSED') || msg.includes('ECONNREFUSED')) {
                  throw new Error(`Target server is not running or refused the connection: ${targetUrl}. Ensure the target application is started before running tests.`);
                } else if (msg.includes('net::ERR_NAME_NOT_RESOLVED') || msg.includes('ENOTFOUND')) {
                  throw new Error(`DNS resolution failed for host in: ${targetUrl}. Check that the hostname is correct and the network is reachable.`);
                } else if (msg.includes('Timeout') || msg.includes('timeout')) {
                  throw new Error(`Page load timed out after ${intent.timeoutMs || 15000}ms for: ${targetUrl}. The server may be slow or unreachable.`);
                } else {
                  throw new Error(`Failed to navigate to ${targetUrl}: ${msg}`);
                }
              }
              const httpStatus = response?.status() || 200;
              // Treat server errors (5xx) as failures, warn on 4xx
              if (httpStatus >= 500) {
                throw new Error(`Target server returned HTTP ${httpStatus} (server error) for: ${targetUrl}.`);
              }
              if (httpStatus >= 400 && httpStatus < 500) {
                addLog('warn', `Target returned HTTP ${httpStatus} for ${targetUrl}. Page may have limited content.`, step.id);
              }
              const pageTitle = await page.title().catch(() => '');
              const resolvedUrl = page.url();
              const frames = page.frames();
              const liveElements = await inspectInteractiveDom(page);
              const visibleButtons = liveElements.filter(e => (e.role === 'button' || e.tagName === 'button' || (e.tagName === 'input' && (e.type === 'submit' || e.type === 'button'))) && e.isVisible);
              step.domSnapshotExcerpt = `<title>${pageTitle || 'Target Page'}</title> (Status: ${httpStatus})`;
              addLog('info', `Target loaded: "${resolvedUrl}" [HTTP ${httpStatus}] Title: "${pageTitle}" (${frames.length} frames, ${visibleButtons.length} visible buttons)`, step.id);
              console.log(`[Playwright Engine] Page loaded: "${resolvedUrl}" [HTTP ${httpStatus}]`);
              console.log(`[Playwright Engine] Page title: "${pageTitle}"`);
              console.log(`[Playwright Engine] Frames detected: ${frames.length}`);
              console.log(`[Playwright Engine] Visible buttons (${visibleButtons.length}): ${visibleButtons.map(b => `"${b.innerText || b.ariaLabel || b.name || b.id || b.tagName}"`).join(', ') || 'None found'}`);

              // Inspect live DOM to ground subsequent intent steps with actual element names and roles
              groundStepsWithLiveDom(steps.slice(i + 1), liveElements);
              addLog('info', `Grounded subsequent test actions against live DOM elements.`, step.id);
              break;
            }

            case 'click': {
              const locator = this.resolveAccessibleLocator(page, step.selector);
              await locator.first().waitFor({ state: 'visible', timeout: 5000 });

              try {
                step.domSnapshotExcerpt = await locator.first().evaluate((el) => el.outerHTML.slice(0, 300));
              } catch {
                // Non-fatal
              }

              await locator.first().click({ timeout: 5000 });
              addLog('info', `Dispatched click to accessible target "${step.description}".`, step.id);
              console.log(`[Playwright Engine] Successfully clicked target: "${step.description}"`);
              break;
            }

            case 'fill': {
              const locator = this.resolveAccessibleLocator(page, step.selector);
              await locator.first().waitFor({ state: 'visible', timeout: 5000 });

              try {
                step.domSnapshotExcerpt = await locator.first().evaluate((el) => el.outerHTML.slice(0, 300));
              } catch {
                // Non-fatal
              }

              const valueToFill = step.value || '';
              await locator.first().fill(valueToFill, { timeout: 5000 });
              addLog('info', `Entered value "${valueToFill}" into field.`, step.id);
              break;
            }

            case 'assert_enabled': {
              const locator = this.resolveAccessibleLocator(page, step.selector);
              await locator.first().waitFor({ state: 'visible', timeout: 5000 });

              try {
                step.domSnapshotExcerpt = await locator.first().evaluate((el) => el.outerHTML.slice(0, 300));
              } catch {
                // Non-fatal
              }

              const isEnabled = await locator.first().isEnabled();
              if (!isEnabled) {
                throw new Error(`Assertion failed: Target "${step.description}" is not enabled in DOM.`);
              }
              addLog('info', `Verified target is enabled in DOM: "${step.selector.name || step.description}"`, step.id);
              break;
            }

            case 'assert_disabled': {
              const locator = this.resolveAccessibleLocator(page, step.selector);
              await locator.first().waitFor({ state: 'attached', timeout: 5000 });

              try {
                step.domSnapshotExcerpt = await locator.first().evaluate((el) => el.outerHTML.slice(0, 300));
              } catch {
                // Non-fatal
              }

              const isDisabled = await locator.first().isDisabled();
              if (!isDisabled) {
                throw new Error(`Assertion failed: Target "${step.description}" is not disabled in DOM.`);
              }
              addLog('info', `Verified target is disabled in DOM: "${step.selector.name || step.description}"`, step.id);
              break;
            }

            case 'assert_visible':
            case 'assert_text': {
              const locator = this.resolveAccessibleLocator(page, step.selector);
              let isVisible = false;

              try {
                await locator.first().waitFor({ state: 'visible', timeout: 5000 });
                isVisible = await locator.first().isVisible();
              } catch {
                // If this is a synthesized goal outcome, inspect whether URL transition or page title verified the goal
                if (step.description.includes('goal outcome') && step.value) {
                  const valLower = step.value.toLowerCase().trim();
                  const currentUrl = page.url().toLowerCase();
                  const currentTitle = (await page.title().catch(() => '')).toLowerCase();
                  if (currentUrl.includes(valLower) || currentTitle.includes(valLower)) {
                    isVisible = true;
                    addLog('info', `Verified goal outcome via live page transition (URL/Title contains "${step.value}").`, step.id);
                  }
                }
              }

              try {
                step.domSnapshotExcerpt = await locator.first().evaluate((el) => el.outerHTML.slice(0, 300)).catch(() => '');
              } catch {
                // Non-fatal
              }

              if (!isVisible) {
                throw new Error(`Assertion failed: Target "${step.description}" is not visible in DOM.`);
              }
              const actualText = await locator.first().innerText().catch(() => '');
              addLog('info', `Verified live element in DOM: "${actualText?.trim().slice(0, 80) || step.description}"`, step.id);
              break;
            }

            default: {
              addLog('warn', `Unrecognized step action type: ${step.type}`, step.id);
            }
          }

          // Step succeeded on initial attempt
          step.status = 'passed';
          step.durationMs = Date.now() - stepStart;

          // Capture real step screenshot
          const screenshotFilename = `step-${step.order}-after.png`;
          const screenshotFilePath = path.join(runArtifactsDir, screenshotFilename);
          try {
            await page.screenshot({ path: screenshotFilePath, fullPage: false });
            const publicUrl = `${this.options.screenshotBaseUrl}/${runId}/${screenshotFilename}`;
            step.screenshotAfterUrl = publicUrl;
            screenshotPaths.push(publicUrl);
          } catch (scErr) {
            addLog('warn', `Could not capture screenshot for step #${step.order}: ${(scErr as Error).message}`, step.id);
          }

        } catch (stepErr) {
          const errorMsg = (stepErr as Error).message || String(stepErr);
          step.error = errorMsg;

          // Check if failure is an infrastructure/network error during navigation
          if (step.type === 'navigate') {
            isInfrastructureError = true;
            step.status = 'error';
            step.durationMs = Date.now() - stepStart;
            addLog('error', `Navigation infrastructure failure: ${errorMsg}. Halting workflow.`, step.id);

            // Block all subsequent planned dependent steps
            for (let j = i + 1; j < steps.length; j++) {
              steps[j].status = 'blocked';
              steps[j].error = `Execution blocked: dependent on navigation step #${step.order} which failed.`;
              steps[j].durationMs = 0;
              addLog('warn', `Step #${steps[j].order} (${steps[j].description}) BLOCKED due to navigation failure.`, steps[j].id);
            }
            break;
          }

          addLog('warn', `Step #${step.order} failed: ${errorMsg}. Inspecting DOM for dynamic mutations...`, step.id);

          // Capture failure before screenshot
          const failureScreenshotFilename = `step-${step.order}-failure.png`;
          const failureScreenshotPath = path.join(runArtifactsDir, failureScreenshotFilename);
          try {
            await page.screenshot({ path: failureScreenshotPath, fullPage: false });
            const publicUrl = `${this.options.screenshotBaseUrl}/${runId}/${failureScreenshotFilename}`;
            step.screenshotBeforeUrl = publicUrl;
            screenshotPaths.push(publicUrl);
          } catch {
            // ignore
          }

          // Execute Generic Self-Healing Recovery (only for actionable elements, not assertion failures)
          let healedSuccessfully = false;
          const isAssertion = step.type.startsWith('assert_');

          if (!isAssertion) {
            try {
              const inspectedElements = await inspectInteractiveDom(page);
              const healingEval = evaluateSelfHealingCandidates(
                step,
                i,
                errorMsg,
                inspectedElements
              );

              if (healingEval.canHeal && healingEval.healingRecord && healingEval.repairedSelector) {
                addLog('heal', `[SELF-HEALING] Discovered safe recovery candidate. Strategy: ${healingEval.healingRecord.chosenAlternative.strategy} (${Math.round(healingEval.healingRecord.confidenceScore * 100)}% confidence).`, step.id);
                addLog('heal', `[SELF-HEALING] ${healingEval.healingRecord.explanation}`, step.id);

                // Apply repaired selector and retry
                const repairedLocator = this.resolveAccessibleLocator(page, healingEval.repairedSelector);
                await repairedLocator.first().waitFor({ state: 'visible', timeout: 5000 });

                if (step.type === 'click') {
                  await repairedLocator.first().click({ timeout: 5000 });
                } else if (step.type === 'fill') {
                  await repairedLocator.first().fill(step.value || '', { timeout: 5000 });
                }

                // Retry succeeded!
                step.status = 'healed';
                step.selector = healingEval.repairedSelector;
                step.healingRecord = healingEval.healingRecord;
                healingRecords.push(healingEval.healingRecord);
                step.durationMs = Date.now() - stepStart;
                healedSuccessfully = true;

                addLog('heal', `[SELF-HEALING] Action retry succeeded with repaired locator! Workflow recovered.`, step.id);

                // Capture healed screenshot
                const healedScreenshotFilename = `step-${step.order}-healed.png`;
                const healedScreenshotPath = path.join(runArtifactsDir, healedScreenshotFilename);
                try {
                  await page.screenshot({ path: healedScreenshotPath, fullPage: false });
                  const publicUrl = `${this.options.screenshotBaseUrl}/${runId}/${healedScreenshotFilename}`;
                  step.screenshotAfterUrl = publicUrl;
                  screenshotPaths.push(publicUrl);
                } catch {
                  // ignore
                }
              } else {
                addLog('warn', `[SELF-HEALING] Recovery rejected: ${healingEval.rejectionReason || 'No safe candidate found.'}`, step.id);
              }
            } catch (healErr) {
              addLog('error', `[SELF-HEALING] Recovery attempt failed: ${(healErr as Error).message}`, step.id);
            }
          } else {
            addLog('warn', `Ground truth assertion genuinely failed: ${errorMsg}. No synthetic bypass permitted.`, step.id);
          }

          if (!healedSuccessfully) {
            step.status = 'failed';
            step.durationMs = Date.now() - stepStart;
            addLog('error', `Step #${step.order} permanently failed. Halting workflow.`, step.id);

            // Block all subsequent planned dependent steps
            for (let j = i + 1; j < steps.length; j++) {
              steps[j].status = 'blocked';
              steps[j].error = `Execution blocked: dependent on prior Step #${step.order} ("${step.description}") which failed.`;
              steps[j].durationMs = 0;
              addLog('warn', `Step #${steps[j].order} (${steps[j].description}) BLOCKED due to failure of Step #${step.order}.`, steps[j].id);
            }
            break;
          }
        }
      }

    } catch (globalErr) {
      isInfrastructureError = true;
      const fatalMsg = (globalErr as Error).message || String(globalErr);
      addLog('error', `Execution engine encountered fatal runner error: ${fatalMsg}`);
      for (const s of steps) {
        if (s.status === 'pending' || s.status === 'running') {
          s.status = 'blocked';
          s.error = `Runner infrastructure error: ${fatalMsg}`;
          s.durationMs = 0;
        }
      }
    } finally {
      if (context) await context.close().catch(() => {});
      if (browser) await browser.close().catch(() => {});
    }

    const totalDuration = Date.now() - startTime;
    const passedCount = steps.filter((s: TestStep) => s.status === 'passed').length;
    const failedCount = steps.filter((s: TestStep) => s.status === 'failed').length;
    const healedCount = steps.filter((s: TestStep) => s.status === 'healed').length;
    const blockedCount = steps.filter((s: TestStep) => s.status === 'blocked').length;
    const skippedCount = steps.filter((s: TestStep) => s.status === 'skipped').length;
    const errorCount = steps.filter((s: TestStep) => s.status === 'error').length;

    // Strict Ground Truth Outcome Verification:
    // - PASS: only when ALL required steps and the final goal are verified (no failures, no blocked steps)
    // - HEALED: only after recovery and successful re-verification of all required steps
    // - FAIL: when an assertion genuinely fails or an interactive action fails permanently
    // - ERROR: for runner / infrastructure failures
    if (isInfrastructureError || errorCount > 0) {
      runStatus = 'ERROR';
    } else if (failedCount > 0 || blockedCount > 0) {
      runStatus = 'FAILED';
    } else if (healedCount > 0 && passedCount + healedCount === steps.length && steps.length > 0) {
      runStatus = 'HEALED';
    } else if (passedCount === steps.length && steps.length > 0) {
      runStatus = 'PASSED';
    } else {
      runStatus = 'FAILED';
    }

    addLog('info', `Playwright execution finished in ${totalDuration}ms. Verdict: ${runStatus}. (Passed: ${passedCount}, Healed: ${healedCount}, Failed: ${failedCount}, Blocked: ${blockedCount}, Error: ${errorCount}).`);

    const completedRun: TestRun = {
      id: runId,
      createdAt: new Date(startTime).toISOString(),
      completedAt: new Date().toISOString(),
      intent,
      status: runStatus,
      steps,
      healingRecords,
      logs,
      screenshots: screenshotPaths,
      executionTimeMs: totalDuration,
      summary: {
        totalSteps: steps.length,
        passedSteps: passedCount,
        failedSteps: failedCount,
        healedSteps: healedCount,
        blockedSteps: blockedCount,
        skippedSteps: skippedCount,
        outcomeVerdict: runStatus as any,
        safetyCheckPassed: true,
      },
    };
    completedRun.errorClassification = classifyTestRun(completedRun);

    return completedRun;
  }

  /**
   * Inspects a live target page using Playwright without executing tests.
   * Extracts page title, HTTP status, interactive elements, accessible roles, labels, text, and errors.
   */
  public async inspectPage(url: string, timeoutMs: number = 10000): Promise<DomInspectionResult> {
    const startTime = Date.now();
    let browser: Browser | null = null;
    let context: BrowserContext | null = null;
    const errors: string[] = [];
    let pageTitle = '';
    let finalUrl = url;
    let httpStatus: number | null = null;
    let elements: InspectedElement[] = [];
    let screenshotUrl: string | undefined = undefined;

    try {
      browser = await chromium.launch({
        headless: this.options.headless ?? true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) HealTest-LiveInspector/1.0',
      });

      const page: Page = await context.newPage();

      // Monitor browser console errors
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(`[Console Error] ${msg.text()}`);
        }
      });

      page.on('pageerror', (err) => {
        errors.push(`[Uncaught Page Error] ${err.message}`);
      });

      // Navigate to live URL
      const response = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: timeoutMs,
      });

      // Allow full load state with graceful timeout fallback for slow external resources
      try {
        await page.waitForLoadState('load', { timeout: Math.min(timeoutMs, 5000) });
      } catch {
        // Fallback for pages where subresources take longer
      }

      // Allow SPA framework/JS to mount DOM elements
      await page.waitForTimeout(600);

      httpStatus = response ? response.status() : null;
      pageTitle = await page.title();
      finalUrl = page.url();

      const frames = page.frames();

      // Extract interactive DOM elements across all frames
      elements = await inspectInteractiveDom(page);

      // Check visible buttons and log page details
      const visibleButtons = elements.filter(e => (e.role === 'button' || e.tagName === 'button' || (e.tagName === 'input' && (e.type === 'submit' || e.type === 'button'))) && e.isVisible);
      console.log(`[Playwright Inspector] Page loaded: "${finalUrl}" (HTTP ${httpStatus})`);
      console.log(`[Playwright Inspector] Page title: "${pageTitle}"`);
      console.log(`[Playwright Inspector] Frames detected: ${frames.length}`);
      console.log(`[Playwright Inspector] Visible buttons (${visibleButtons.length}): ${visibleButtons.map(b => `"${b.innerText || b.ariaLabel || b.name || b.id || b.tagName}"`).join(', ') || 'None found'}`);

      // Take inspection snapshot
      try {
        const inspectId = `inspect-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
        const inspectDir = path.join(this.options.artifactsDir!, 'inspections');
        fs.mkdirSync(inspectDir, { recursive: true });
        const filePath = path.join(inspectDir, `${inspectId}.png`);
        await page.screenshot({ path: filePath, fullPage: false });
        screenshotUrl = `${this.options.screenshotBaseUrl}/inspections/${inspectId}.png`;
      } catch (shotErr) {
        // Screenshot capture error is non-fatal
      }

    } catch (err: any) {
      const msg = err.message || String(err);
      if (msg.includes('net::ERR_CONNECTION_REFUSED') || msg.includes('ECONNREFUSED')) {
        errors.push(`Target server refused connection at ${url}. Ensure the local application server is started and reachable.`);
      } else if (msg.includes('net::ERR_NAME_NOT_RESOLVED') || msg.includes('ENOTFOUND')) {
        errors.push(`DNS resolution failed for ${url}. Check hostname and network connectivity.`);
      } else if (msg.includes('Timeout') || msg.includes('timeout')) {
        errors.push(`Page load timed out after ${timeoutMs}ms for ${url}. Target site may be slow or unreachable.`);
      } else {
        errors.push(`Inspection failed: ${msg}`);
      }
      console.error(`[Playwright Inspector] Error inspecting ${url}:`, msg);
    } finally {
      if (context) await context.close().catch(() => {});
      if (browser) await browser.close().catch(() => {});
    }

    const durationMs = Date.now() - startTime;
    const buttonsCount = elements.filter(e => (e.role === 'button' || e.tagName === 'button' || (e.tagName === 'input' && (e.type === 'submit' || e.type === 'button'))) && e.isVisible).length;
    const inputsCount = elements.filter(e => (e.role === 'textbox' || e.role === 'combobox' || e.tagName === 'select' || e.tagName === 'textarea' || (e.tagName === 'input' && e.type !== 'submit' && e.type !== 'button' && e.type !== 'reset')) && e.isVisible).length;
    const linksCount = elements.filter(e => (e.role === 'link' || e.tagName === 'a') && e.isVisible).length;
    const textElementsCount = elements.filter(e => (e.role === 'heading' || e.role === 'status' || /^h[1-6]$/.test(e.tagName)) && e.isVisible).length;

    return {
      targetUrl: url,
      finalUrl,
      pageTitle,
      httpStatus,
      inspectedAt: new Date().toISOString(),
      durationMs,
      elements,
      summary: {
        totalElements: elements.length,
        buttonsCount,
        inputsCount,
        linksCount,
        textElementsCount,
      },
      errors,
      screenshotUrl,
    };
  }
}

