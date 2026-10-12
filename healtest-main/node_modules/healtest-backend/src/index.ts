import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import type { TestIntent, TestRun } from '../../shared/types';
import { classifyTestRun } from '../../shared/types';
import { validateBackendTargetUrl } from './safety';
import { PlaywrightExecutor } from '../../engine/src/executor';
import { llmService } from './llmService';
import { sourceDiffService } from './sourceDiffService';
import { MemoryService } from './memoryService';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Artifacts directory for screenshots and history
const ARTIFACTS_DIR = path.resolve(__dirname, '../artifacts');
fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

app.use(cors());
app.use(express.json());

// Serve captured screenshots statically
app.use('/api/screenshots', express.static(ARTIFACTS_DIR));

// Persistent runs history file in artifacts
const HISTORY_FILE = path.join(ARTIFACTS_DIR, 'runs-history.json');

function loadRunsHistory(): TestRun[] {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const data = fs.readFileSync(HISTORY_FILE, 'utf-8');
      const parsed: TestRun[] = JSON.parse(data);
      return parsed.map((run) => {
        if (!run.errorClassification) {
          run.errorClassification = classifyTestRun(run);
        }
        return run;
      });
    }
  } catch (err) {
    console.error('[HealTest API] Error reading history file:', err);
  }
  return [];
}

function persistRunsHistory(runs: TestRun[]) {
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(runs.slice(0, 100), null, 2), 'utf-8');
  } catch (err) {
    console.error('[HealTest API] Error writing history file:', err);
  }
}

// Memory store for test runs executed in this session
const runsStore: TestRun[] = loadRunsHistory();

// Initialize executor instance
const executor = new PlaywrightExecutor({
  headless: true,
  artifactsDir: ARTIFACTS_DIR,
  screenshotBaseUrl: `http://localhost:${PORT}/api/screenshots`,
  defaultTimeoutMs: 12000,
});

// Initialize historical memory service
const memoryService = new MemoryService(ARTIFACTS_DIR);

/**
 * Stage 2 Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    online: true,
    stage: 'Stage 2 Active (Express API & Real Playwright)',
    version: '1.2.0',
    engineStatus: 'ready',
    artifactsDir: ARTIFACTS_DIR,
    totalExecutedRuns: runsStore.length,
    message: 'HealTest backend and Playwright engine are operational',
  });
});

/**
 * Minimal temporary test fixture page for Stage 2 E2E verification
 * Provides accessible elements: role="heading", role="textbox", role="button", role="status"
 */
app.get('/fixture', (req, res) => {
  const isMutated = req.query.mutated === 'true';
  const isBroken = req.query.broken === 'true';

  let buttonHtml = `<button id="submit-btn" role="button">Submit Feedback</button>`;
  let buttonScript = `
    document.getElementById('submit-btn').addEventListener('click', function() {
      var val = document.getElementById('feedback-input').value.trim();
      var banner = document.getElementById('status-banner');
      banner.style.display = 'block';
      banner.textContent = 'Feedback Submitted Successfully: ' + (val || 'Generic Demo');
    });
  `;

  if (isMutated) {
    // UI Mutation: Button text changed from "Submit Feedback" to "Send Feedback" with updated ID and aria-label
    buttonHtml = `<button id="send-feedback-btn" class="btn-mutated" role="button" aria-label="Send Feedback">Send Feedback</button>`;
    buttonScript = `
      document.getElementById('send-feedback-btn').addEventListener('click', function() {
        var val = document.getElementById('feedback-input').value.trim();
        var banner = document.getElementById('status-banner');
        banner.style.display = 'block';
        banner.textContent = 'Feedback Submitted Successfully: ' + (val || 'Generic Demo');
      });
    `;
  } else if (isBroken) {
    // UI Mutation: Button removed entirely, no viable candidate exists
    buttonHtml = `<div class="alert-disabled" style="color: #ef4444; font-size: 13px; margin-top: 14px;">Submission service currently unavailable.</div>`;
    buttonScript = '';
  }

  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HealTest Fixture Target Page</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      margin: 0;
      padding: 40px 20px;
      background: #090d16;
      color: #e2e8f0;
      display: flex;
      justify-content: center;
    }
    .card {
      background: #131c2e;
      border: 1px solid #1e293b;
      border-radius: 12px;
      padding: 32px;
      max-width: 480px;
      width: 100%;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    }
    h1 {
      font-size: 20px;
      margin-top: 0;
      color: #38bdf8;
    }
    p {
      color: #94a3b8;
      font-size: 14px;
      line-height: 1.5;
    }
    .form-group {
      margin-top: 20px;
    }
    label {
      display: block;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #cbd5e1;
      margin-bottom: 8px;
    }
    input[type="text"] {
      width: 100%;
      padding: 10px 12px;
      border-radius: 6px;
      border: 1px solid #334155;
      background: #0a0f1d;
      color: white;
      font-size: 14px;
      box-sizing: border-box;
      outline: none;
    }
    input[type="text"]:focus {
      border-color: #38bdf8;
    }
    button {
      margin-top: 16px;
      background: #2563eb;
      color: white;
      border: none;
      padding: 10px 20px;
      font-size: 14px;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.2s;
    }
    button:hover {
      background: #1d4ed8;
    }
    button.btn-mutated {
      background: #059669;
    }
    button.btn-mutated:hover {
      background: #047857;
    }
    #status-banner {
      display: none;
      margin-top: 24px;
      padding: 14px 16px;
      border-radius: 8px;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.4);
      color: #6ee7b7;
      font-size: 14px;
      font-weight: 500;
    }
    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      background: #1e293b;
      color: #38bdf8;
      margin-bottom: 12px;
      font-family: monospace;
    }
    .mutation-banner {
      background: ${isMutated ? 'rgba(245, 158, 11, 0.15)' : isBroken ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)'};
      border: 1px solid ${isMutated ? 'rgba(245, 158, 11, 0.4)' : isBroken ? 'rgba(239, 68, 68, 0.4)' : 'rgba(59, 130, 246, 0.4)'};
      color: ${isMutated ? '#fcd34d' : isBroken ? '#fca5a5' : '#93c5fd'};
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      margin-bottom: 16px;
      font-family: monospace;
    }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">E2E TEST FIXTURE</span>
    <div class="mutation-banner">MODE: ${isMutated ? 'MUTATED UI (Submit -> Send)' : isBroken ? 'BROKEN UI (No Button)' : 'BASELINE UI'}</div>
    <h1 id="fixture-heading">HealTest Fixture Target</h1>
    <p id="fixture-desc">This test page validates real Playwright navigation, accessible input filling, button clicking, self-healing recovery, and outcome verification.</p>
    
    <div class="form-group">
      <label for="feedback-input">Feedback Input</label>
      <input type="text" id="feedback-input" placeholder="Type your feedback message" aria-label="Feedback Input">
      ${buttonHtml}
    </div>

    <div id="status-banner" role="status">
      Feedback Submitted Successfully
    </div>
  </div>

  <script>
    ${buttonScript}
  </script>
</body>
</html>`);
});

/**
 * List all test runs
 */
app.get('/api/runs', (req, res) => {
  res.json(runsStore);
});

/**
 * Get single test run by ID
 */
app.get('/api/runs/:id', (req, res) => {
  const run = runsStore.find((r) => r.id === req.params.id);
  if (!run) {
    return res.status(404).json({ error: 'Run not found' });
  }
  res.json(run);
});

/**
 * Dispatch real Playwright test execution
 */
app.post('/api/runs', async (req, res) => {
  const intent: TestIntent = req.body;

  if (!intent || !intent.targetUrl || !intent.naturalLanguageInstruction) {
    return res.status(400).json({
      error: 'Missing required parameters: targetUrl and naturalLanguageInstruction are required.',
    });
  }

  // Safety checks
  const safety = validateBackendTargetUrl(intent.targetUrl, intent.allowLocalhost ?? true);
  if (!safety.isValid) {
    return res.status(403).json({
      error: safety.blockedReason || 'URL blocked by safety policy.',
      safety,
    });
  }
  intent.targetUrl = safety.sanitizedUrl || intent.targetUrl;

  try {
    console.log(`[HealTest API] Dispatching Playwright test for: ${intent.targetUrl}`);
    const completedRun = await executor.executeTestRun(intent);
    if (!completedRun.errorClassification) {
      completedRun.errorClassification = classifyTestRun(completedRun);
    }

    // Attach developer report and test code patch
    try {
      completedRun.developerReport = llmService.generateDeveloperReport(completedRun);
      completedRun.suggestedTestPatch = llmService.generateTestCodePatch(completedRun);
    } catch (reportErr: any) {
      console.warn('[HealTest API] Could not generate developer report:', reportErr.message);
    }

    // Attach source code diff (ShopEase demo or unavailable notice)
    try {
      completedRun.sourceCodeDiff = sourceDiffService.compareSourceVersions();
    } catch (diffErr: any) {
      console.warn('[HealTest API] Could not generate source diff:', diffErr.message);
    }

    runsStore.unshift(completedRun);
    persistRunsHistory(runsStore);

    // Persist analytics memory
    try {
      const analytics = memoryService.calculateAnalytics(runsStore);
      memoryService.saveMemory(analytics);
    } catch (memErr: any) {
      console.warn('[HealTest API] Could not persist memory analytics:', memErr.message);
    }

    res.json(completedRun);
  } catch (err: any) {
    console.error('[HealTest API] Fatal execution error:', err);
    const fatalRun: TestRun = {
      id: `run-${Date.now().toString(36)}-err`,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      intent,
      status: 'ERROR',
      steps: [
        {
          id: `step-err-1`,
          order: 1,
          type: 'navigate',
          description: `Navigate to target: ${intent.targetUrl}`,
          selector: {},
          status: 'error',
          durationMs: 0,
          error: err.message || String(err),
        }
      ],
      healingRecords: [],
      logs: [
        {
          id: `log-err-1`,
          timestamp: new Date().toLocaleTimeString(),
          level: 'error',
          message: `Fatal execution engine error: ${err.message || String(err)}`,
        }
      ],
      screenshots: [],
      executionTimeMs: 0,
      summary: {
        totalSteps: 1,
        passedSteps: 0,
        failedSteps: 0,
        healedSteps: 0,
        blockedSteps: 0,
        outcomeVerdict: 'ERROR',
        safetyCheckPassed: true,
      },
      errorClassification: {
        category: 'SYSTEM_ERROR',
        label: 'Fatal Runner Infrastructure Crash',
        source: 'system',
        details: err.message || String(err),
      },
    };
    runsStore.unshift(fatalRun);
    persistRunsHistory(runsStore);
    res.status(500).json({
      error: `Execution failed: ${err.message}`,
      run: fatalRun,
    });
  }
});

/**
 * Live DOM & Accessibility Inspection endpoint using Playwright
 */
app.post('/api/inspect', async (req, res) => {
  const { url, allowLocalhost = true, timeoutMs = 12000 } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Target URL is required.' });
  }

  const safety = validateBackendTargetUrl(url, Boolean(allowLocalhost));
  if (!safety.isValid) {
    return res.status(403).json({
      error: safety.blockedReason || 'Target URL blocked by safety policy.',
      safety,
    });
  }

  const targetUrl = safety.sanitizedUrl || url;

  try {
    console.log(`[HealTest API] Live DOM inspection requested for: ${targetUrl}`);
    const inspectionResult = await executor.inspectPage(targetUrl, Number(timeoutMs) || 12000);
    res.json(inspectionResult);
  } catch (err: any) {
    console.error('[HealTest API] Inspection failed:', err);
    res.status(500).json({
      error: `Live inspection failed: ${err.message}`,
    });
  }
});

/**
 * Embedded Browser Preview Proxy endpoint
 * Strips framing restriction headers (X-Frame-Options, CSP frame-ancestors)
 * so target apps (including localhost) can be rendered inside HealTest's embedded frame.
 */
app.get('/api/preview/proxy', async (req, res) => {
  const rawTargetUrl = req.query.url as string;
  if (!rawTargetUrl) {
    return res.status(400).send('Missing "url" query parameter.');
  }

  let targetUrl = rawTargetUrl;

  try {
    const safety = validateBackendTargetUrl(rawTargetUrl, true);
    if (!safety.isValid) {
      return res.status(403).send(`Blocked URL: ${safety.blockedReason}`);
    }

    targetUrl = safety.sanitizedUrl || rawTargetUrl;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) HealTest-PreviewProxy/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(response.status).send(`Target returned HTTP ${response.status}: ${response.statusText}`);
    }

    let html = await response.text();

    // Ensure relative assets (images, css, scripts) resolve against target origin
    const baseTag = `<base href="${targetUrl}">`;
    if (html.toLowerCase().includes('<head>')) {
      html = html.replace(/<head>/i, `<head>\n  ${baseTag}`);
    } else {
      html = `${baseTag}\n${html}`;
    }

    // Set permissive frame headers for embedded preview
    res.removeHeader('X-Frame-Options');
    res.setHeader('Content-Security-Policy', "frame-ancestors * 'self'");
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-HealTest-Proxied', 'true');
    res.send(html);
  } catch (err: any) {
    console.error(`[HealTest Preview Proxy] Failed to proxy "${targetUrl}":`, err.message);
    res.status(502).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: ui-sans-serif, system-ui, sans-serif; background: #090d16; color: #94a3b8; padding: 32px; text-align: center; }
            h2 { color: #f87171; margin-bottom: 8px; font-size: 18px; }
            p { font-size: 13px; line-height: 1.6; }
            code { background: #1e293b; color: #f1f5f9; padding: 3px 6px; border-radius: 4px; font-family: monospace; }
          </style>
        </head>
        <body>
          <h2>Target Page Unreachable via Proxy</h2>
          <p>Could not connect to: <code>${targetUrl}</code></p>
          <p>Error details: ${err.message}</p>
          <p>Verify that your target server is actively running and accessible.</p>
        </body>
      </html>
    `);
  }
});

/**
 * Clear test runs history
 */
app.delete('/api/runs', (req, res) => {
  runsStore.length = 0;
  persistRunsHistory(runsStore);
  res.json({ success: true, message: 'All test run history cleared.' });
});

/**
 * Analytics — historical healing memory summary
 */
app.get('/api/analytics', (req, res) => {
  try {
    const analytics = memoryService.calculateAnalytics(runsStore);
    res.json(analytics);
  } catch (err: any) {
    res.status(500).json({ error: `Analytics calculation failed: ${err.message}` });
  }
});

/**
 * Source Code Diff — compare ShopEase Version A vs Version B
 */
app.get('/api/diff', (req, res) => {
  try {
    const diff = sourceDiffService.compareSourceVersions({
      versionAId: req.query.versionA as string || 'Version-A (Baseline)',
      versionBId: req.query.versionB as string || 'Version-B (Mutated)',
    });
    res.json(diff);
  } catch (err: any) {
    res.status(500).json({ error: `Diff generation failed: ${err.message}` });
  }
});

/**
 * Natural-Language Test Plan Generation
 */
app.post('/api/plans/generate', async (req, res) => {
  const { targetUrl, naturalLanguageInstruction } = req.body;
  if (!targetUrl || !naturalLanguageInstruction) {
    return res.status(400).json({ error: 'targetUrl and naturalLanguageInstruction are required.' });
  }
  try {
    const plan = await llmService.interpretNaturalLanguageTestPlan(naturalLanguageInstruction, targetUrl);
    res.json(plan);
  } catch (err: any) {
    res.status(500).json({ error: `Test plan generation failed: ${err.message}` });
  }
});

/**
 * Patch approval endpoint — returns patch preview for a given run
 */
app.get('/api/patches/:runId', (req, res) => {
  const run = runsStore.find((r) => r.id === req.params.runId);
  if (!run) {
    return res.status(404).json({ error: 'Run not found.' });
  }
  if (!run.suggestedTestPatch) {
    return res.status(404).json({ error: 'No patch available for this run.' });
  }
  res.json(run.suggestedTestPatch);
});

/**
 * Approve patch — marks patch as approved (no file modification without explicit action)
 */
app.post('/api/patches/:runId/approve', (req, res) => {
  const run = runsStore.find((r) => r.id === req.params.runId);
  if (!run || !run.suggestedTestPatch) {
    return res.status(404).json({ error: 'Run or patch not found.' });
  }
  run.suggestedTestPatch.patchStatus = 'approved_and_applied';
  if (run.developerReport) {
    run.developerReport.approvalStatus = 'approved_and_applied';
  }
  persistRunsHistory(runsStore);
  res.json({
    success: true,
    message: 'Patch approved for review. No application source files were modified.',
    patch: run.suggestedTestPatch,
  });
});

app.post('/api/runs/:runId/approve-patch', (req, res) => {
  const run = runsStore.find((r) => r.id === req.params.runId);
  if (!run || !run.suggestedTestPatch) {
    return res.status(404).json({ error: 'Run or patch not found.' });
  }
  run.suggestedTestPatch.patchStatus = 'approved_and_applied';
  if (run.developerReport) {
    run.developerReport.approvalStatus = 'approved_and_applied';
  }
  persistRunsHistory(runsStore);
  res.json({
    success: true,
    message: 'Patch approved for review. No application source files were modified.',
    patch: run.suggestedTestPatch,
  });
});

/**
 * ShopEase Demo — Version A (Baseline: data-testid="add-to-cart", "Add to Cart")
 */
app.get('/demo/shopease/version-a', (req, res) => {
  const demoPath = path.join(__dirname, 'demo', 'shopease-version-a.html');
  if (fs.existsSync(demoPath)) {
    res.setHeader('Content-Type', 'text/html');
    res.send(fs.readFileSync(demoPath, 'utf-8'));
  } else {
    res.setHeader('Content-Type', 'text/html');
    res.send(`<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>ShopEase — Version A</title>
<style>body{font-family:system-ui;background:#0f172a;color:#e2e8f0;padding:40px;display:flex;justify-content:center;}
.card{background:#1e293b;border:1px solid #334155;border-radius:12px;padding:32px;max-width:500px;width:100%;}
h1{color:#38bdf8;margin-top:0;}p{color:#94a3b8;}
.product{border:1px solid #334155;border-radius:8px;padding:16px;margin:16px 0;}
.price{font-size:24px;font-weight:700;color:#10b981;margin:8px 0;}
button{background:#2563eb;color:#fff;border:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;margin-top:12px;}
button:hover{background:#1d4ed8;}
#cart-count{background:#ef4444;color:#fff;border-radius:50%;padding:2px 7px;font-size:12px;margin-left:6px;}
</style></head>
<body><div class="card">
<div style="display:flex;justify-content:space-between;align-items:center">
  <h1>🛍️ ShopEase</h1>
  <span>🛒 Cart <span id="cart-count" role="status">0</span></span>
</div>
<span style="background:#1e3a2f;color:#4ade80;padding:3px 8px;border-radius:4px;font-size:11px;font-family:monospace">VERSION A — BASELINE</span>
<div class="product">
  <strong>Premium Running Shoes</strong>
  <div class="price">$89.99</div>
  <p>High-performance athletic footwear with advanced cushioning.</p>
  <button data-testid="add-to-cart" aria-label="Add to Cart">Add to Cart</button>
</div>
</div>
<script>
  var count = 0;
  var btn = document.querySelector('[data-testid="add-to-cart"]');
  if (btn) btn.addEventListener('click', function() {
    count++;
    document.getElementById('cart-count').textContent = count;
  });
</script></body></html>`);
  }
});

/**
 * ShopEase Demo — Version B (Mutated: data-testid="add-to-basket", "Add to Basket")
 */
app.get('/demo/shopease/version-b', (req, res) => {
  const demoPath = path.join(__dirname, 'demo', 'shopease-version-b.html');
  if (fs.existsSync(demoPath)) {
    res.setHeader('Content-Type', 'text/html');
    res.send(fs.readFileSync(demoPath, 'utf-8'));
  } else {
    res.setHeader('Content-Type', 'text/html');
    res.send(`<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>ShopEase — Version B</title>
<style>body{font-family:system-ui;background:#0f172a;color:#e2e8f0;padding:40px;display:flex;justify-content:center;}
.card{background:#1e293b;border:1px solid #334155;border-radius:12px;padding:32px;max-width:500px;width:100%;}
h1{color:#38bdf8;margin-top:0;}p{color:#94a3b8;}
.product{border:1px solid #334155;border-radius:8px;padding:16px;margin:16px 0;}
.price{font-size:24px;font-weight:700;color:#10b981;margin:8px 0;}
button{background:#7c3aed;color:#fff;border:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;margin-top:12px;}
button:hover{background:#6d28d9;}
#cart-count{background:#ef4444;color:#fff;border-radius:50%;padding:2px 7px;font-size:12px;margin-left:6px;}
</style></head>
<body><div class="card">
<div style="display:flex;justify-content:space-between;align-items:center">
  <h1>🛍️ ShopEase</h1>
  <span>🛒 Cart <span id="cart-count" role="status">0</span></span>
</div>
<span style="background:#2d1b69;color:#c4b5fd;padding:3px 8px;border-radius:4px;font-size:11px;font-family:monospace">VERSION B — MUTATED UI</span>
<div class="product">
  <strong>Premium Running Shoes</strong>
  <div class="price">$89.99</div>
  <p>High-performance athletic footwear with advanced cushioning.</p>
  <button data-testid="add-to-basket" aria-label="Add to Basket">Add to Basket</button>
</div>
</div>
<script>
  var count = 0;
  var btn = document.querySelector('[data-testid="add-to-basket"]');
  if (btn) btn.addEventListener('click', function() {
    count++;
    document.getElementById('cart-count').textContent = count;
  });
</script></body></html>`);
  }
});

/**
 * ShopEase Demo — Broken (Cart logic disabled — confirms FAIL, not false heal)
 */
app.get('/demo/shopease/broken', (req, res) => {
  const demoPath = path.join(__dirname, 'demo', 'shopease-broken.html');
  if (fs.existsSync(demoPath)) {
    res.setHeader('Content-Type', 'text/html');
    res.send(fs.readFileSync(demoPath, 'utf-8'));
  } else {
    res.setHeader('Content-Type', 'text/html');
    res.send(`<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>ShopEase — Broken</title>
<style>body{font-family:system-ui;background:#0f172a;color:#e2e8f0;padding:40px;display:flex;justify-content:center;}
.card{background:#1e293b;border:1px solid #334155;border-radius:12px;padding:32px;max-width:500px;width:100%;}
h1{color:#38bdf8;margin-top:0;}p{color:#94a3b8;}
.product{border:1px solid #334155;border-radius:8px;padding:16px;margin:16px 0;}
.price{font-size:24px;font-weight:700;color:#10b981;margin:8px 0;}
button{background:#6b7280;color:#fff;border:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;cursor:not-allowed;margin-top:12px;opacity:0.7;}
#cart-count{background:#ef4444;color:#fff;border-radius:50%;padding:2px 7px;font-size:12px;margin-left:6px;}
</style></head>
<body><div class="card">
<div style="display:flex;justify-content:space-between;align-items:center">
  <h1>🛍️ ShopEase</h1>
  <span>🛒 Cart <span id="cart-count" role="status">0</span></span>
</div>
<span style="background:#3b1515;color:#fca5a5;padding:3px 8px;border-radius:4px;font-size:11px;font-family:monospace">BROKEN — CART LOGIC DISABLED</span>
<div class="product">
  <strong>Premium Running Shoes</strong>
  <div class="price">$89.99</div>
  <p>High-performance athletic footwear with advanced cushioning.</p>
  <button data-testid="add-to-cart" aria-label="Add to Cart" disabled>Add to Cart</button>
</div>
<p style="color:#ef4444;font-size:12px;margin-top:8px;">⚠️ Cart service temporarily unavailable.</p>
</div>
<!-- Cart update logic intentionally removed to simulate application bug -->
</body></html>`);
  }
});

/**
 * Target Website Demo routes — Version A and Version B
 */
app.get('/demo/version-a', (req, res) => {
  res.redirect('http://localhost:4000/version-a');
});
app.get('/demo/version-b', (req, res) => {
  res.redirect('http://localhost:4000/version-b');
});



const server = app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`  HealTest Backend API operational on port ${PORT}`);
  console.log(`  Health Check:    http://localhost:${PORT}/api/health`);
  console.log(`  Stage 2 Fixture: http://localhost:${PORT}/fixture`);
  console.log(`====================================================`);
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[HealTest Backend] Port ${PORT} is already in use by another process.`);
    console.error(`[HealTest Backend] Terminate the existing process or set PORT=<port>.`);
  } else {
    console.error('[HealTest Backend] Server error:', err);
  }
});

export default app;
