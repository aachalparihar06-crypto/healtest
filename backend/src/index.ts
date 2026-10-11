import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import type { TestIntent, TestRun } from '../../shared/types';
import { classifyTestRun } from '../../shared/types';
import { validateBackendTargetUrl } from './safety';
import { PlaywrightExecutor } from '../../engine/src/executor';

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
 * Separate Target Demo Application - Version A ("Submit Feedback") and Version B ("Send")
 */
function renderDemoApp(version: 'A' | 'B'): string {
  const isA = version === 'A';
  const buttonHtml = isA
    ? `<button id="submit-feedback-btn" role="button">Submit Feedback</button>`
    : `<button id="send-btn" role="button">Send</button>`;
  const buttonId = isA ? 'submit-feedback-btn' : 'send-btn';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Customer Feedback Portal — Version ${version}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 40px 20px;
      background: #0b0f19;
      color: #f1f5f9;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 80vh;
    }
    .card {
      background: #111827;
      border: 1px solid #1f2937;
      border-radius: 16px;
      padding: 36px;
      max-width: 480px;
      width: 100%;
      box-shadow: 0 20px 40px rgba(0,0,0,0.6);
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      background: ${isA ? 'rgba(59, 130, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)'};
      color: ${isA ? '#60a5fa' : '#34d399'};
      border: 1px solid ${isA ? 'rgba(59, 130, 246, 0.4)' : 'rgba(16, 185, 129, 0.4)'};
      margin-bottom: 12px;
    }
    h1 {
      font-size: 22px;
      margin: 0 0 8px 0;
      color: #f8fafc;
    }
    p {
      color: #94a3b8;
      font-size: 14px;
      line-height: 1.5;
      margin-bottom: 24px;
    }
    .form-group {
      margin-top: 16px;
    }
    label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: #cbd5e1;
      margin-bottom: 8px;
    }
    input[type="text"] {
      width: 100%;
      padding: 12px 14px;
      border-radius: 8px;
      border: 1px solid #374151;
      background: #030712;
      color: white;
      font-size: 14px;
      box-sizing: border-box;
      outline: none;
      transition: border-color 0.2s;
    }
    input[type="text"]:focus {
      border-color: #6366f1;
    }
    button {
      margin-top: 18px;
      background: ${isA ? '#2563eb' : '#059669'};
      color: white;
      border: none;
      padding: 12px 24px;
      font-size: 14px;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      width: 100%;
    }
    button:hover {
      background: ${isA ? '#1d4ed8' : '#047857'};
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
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">TARGET APP: VERSION ${version}</span>
    <h1 id="app-heading">Customer Feedback Portal</h1>
    <p id="app-desc">Standalone feedback target app. Button: <strong>"${isA ? 'Submit Feedback' : 'Send'}"</strong>.</p>
    
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
    document.getElementById('${buttonId}').addEventListener('click', function() {
      var val = document.getElementById('feedback-input').value.trim();
      var banner = document.getElementById('status-banner');
      banner.style.display = 'block';
      banner.textContent = 'Feedback Submitted Successfully: ' + (val || 'Generic Demo');
    });
  </script>
</body>
</html>`;
}

app.get('/demo/version-a', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(renderDemoApp('A'));
});

app.get('/demo/version-b', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(renderDemoApp('B'));
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
    runsStore.unshift(completedRun);
    persistRunsHistory(runsStore);
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
 * Dedicated Live Button Extractor endpoint
 * Inspects the live DOM of any target URL using Playwright
 * and returns real interactive buttons with accessible name, role, text, selector, and enabled/disabled state.
 */
app.post('/api/extract-buttons', async (req, res) => {
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
    console.log(`[HealTest API] Live button extraction requested for: ${targetUrl}`);
    const inspectionResult = await executor.inspectPage(targetUrl, Number(timeoutMs) || 12000);
    res.json({
      targetUrl,
      finalUrl: inspectionResult.finalUrl,
      pageTitle: inspectionResult.pageTitle,
      httpStatus: inspectionResult.httpStatus,
      durationMs: inspectionResult.durationMs,
      buttons: inspectionResult.buttons,
      totalButtons: inspectionResult.buttons.length,
      errors: inspectionResult.errors,
      screenshotUrl: inspectionResult.screenshotUrl,
    });
  } catch (err: any) {
    console.error('[HealTest API] Button extraction failed:', err);
    res.status(500).json({
      error: `Live button extraction failed: ${err.message}`,
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
