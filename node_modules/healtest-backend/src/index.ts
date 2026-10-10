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
  const safety = validateBackendTargetUrl(intent.targetUrl, intent.allowLocalhost ?? false);
  if (!safety.isValid) {
    return res.status(403).json({
      error: safety.blockedReason || 'URL blocked by safety policy.',
      safety,
    });
  }

  try {
    console.log(`[HealTest API] Dispatching Playwright test for: ${intent.targetUrl}`);
    const completedRun = await executor.executeTestRun(intent);
    if (!completedRun.errorClassification) {
      completedRun.errorClassification = classifyTestRun(completedRun);
    }
    runsStore.unshift(completedRun);
    persistRunsHistory(runsStore);
    res.json(completedRun);
  } catch (err) {
    console.error('[HealTest API] Fatal execution error:', err);
    res.status(500).json({
      error: `Execution failed: ${(err as Error).message}`,
    });
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

const server = app.listen(PORT, '0.0.0.0', () => {
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
