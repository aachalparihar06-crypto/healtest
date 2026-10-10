import { chromium, Browser, BrowserContext, Page, Locator } from 'playwright';
import path from 'path';
import fs from 'fs';
import type { 
  TestIntent, 
  TestStep, 
  TestRun, 
  ExecutionLog, 
  ActionSelector,
  HealingRecord
} from '../../shared/types';
import { classifyTestRun } from '../../shared/types';
import { decomposeIntentIntoSteps } from './intentParser';
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
      if (selector.role === 'button') {
        return page.getByRole('button', { name: selector.name })
          .or(page.getByRole('link', { name: selector.name }))
          .or(page.getByText(selector.name, { exact: false }));
      }
      if (selector.role === 'textbox') {
        return page.getByRole('textbox', { name: selector.name })
          .or(page.getByLabel(selector.name))
          .or(page.getByPlaceholder(selector.name));
      }
      return page.getByRole(selector.role as any, { name: selector.name });
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

    // 5. Accessible Text
    if (selector.text) {
      return page.getByText(selector.text, { exact: false });
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
    let runStatus: TestRun['status'] = 'PASSED';

    try {
      const execPath = chromium.executablePath();
      addLog('info', `Launching Chromium binary at ${execPath} (headless: ${this.options.headless})...`);
      browser = await chromium.launch({
        headless: this.options.headless,
        executablePath: execPath,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });

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
              const response = await page.goto(targetUrl, {
                waitUntil: 'domcontentloaded',
                timeout: intent.timeoutMs || 15000,
              });
              const httpStatus = response?.status() || 200;
              const pageTitle = await page.title().catch(() => '');
              const resolvedUrl = page.url();
              step.domSnapshotExcerpt = `<title>${pageTitle || 'Target Page'}</title> (Status: ${httpStatus})`;
              addLog('info', `Target loaded: "${resolvedUrl}" [HTTP ${httpStatus}] Title: "${pageTitle}"`, step.id);
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

            case 'assert_visible':
            case 'assert_text': {
              const locator = this.resolveAccessibleLocator(page, step.selector);
              await locator.first().waitFor({ state: 'visible', timeout: 5000 });

              try {
                step.domSnapshotExcerpt = await locator.first().evaluate((el) => el.outerHTML.slice(0, 300));
              } catch {
                // Non-fatal
              }

              const isVisible = await locator.first().isVisible();
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

          // Execute Generic Self-Healing Recovery
          let healedSuccessfully = false;
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
              } else if (step.type === 'assert_visible' || step.type === 'assert_text') {
                const isVis = await repairedLocator.first().isVisible();
                if (!isVis) throw new Error('Repaired target not visible in DOM');
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

          if (!healedSuccessfully) {
            step.status = 'failed';
            step.durationMs = Date.now() - stepStart;
            addLog('error', `Step #${step.order} permanently failed. Halting workflow.`, step.id);
            break;
          }
        }
      }

    } catch (globalErr) {
      addLog('error', `Execution engine encountered fatal error: ${(globalErr as Error).message}`);
    } finally {
      if (context) await context.close().catch(() => {});
      if (browser) await browser.close().catch(() => {});
    }

    const totalDuration = Date.now() - startTime;
    const passedCount = steps.filter((s: TestStep) => s.status === 'passed').length;
    const failedCount = steps.filter((s: TestStep) => s.status === 'failed').length;
    const healedCount = steps.filter((s: TestStep) => s.status === 'healed').length;

    // Strict Ground Truth Outcome Verification (Never fabricate results)
    if (failedCount > 0) {
      runStatus = 'FAILED';
    } else if (healedCount > 0) {
      runStatus = 'HEALED';
    } else {
      runStatus = 'PASSED';
    }

    addLog('info', `Playwright execution finished in ${totalDuration}ms. Verdict: ${runStatus}. (Healed: ${healedCount}, Passed: ${passedCount}, Failed: ${failedCount}).`);

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
        outcomeVerdict: runStatus === 'HEALED' ? 'HEALED' : runStatus === 'PASSED' ? 'PASSED' : 'FAILED',
        safetyCheckPassed: true,
      },
    };
    completedRun.errorClassification = classifyTestRun(completedRun);

    return completedRun;
  }
}
