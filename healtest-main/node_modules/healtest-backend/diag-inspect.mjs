// Diagnostic: Test /api/inspect endpoint + mutated page DOM inspection + healing flow
import { chromium } from 'playwright';

// TEST 1: /api/inspect endpoint
console.log('=== TEST 1: /api/inspect endpoint ===');
try {
  const res = await fetch('http://localhost:3001/api/inspect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'http://localhost:3001/fixture', allowLocalhost: true, timeoutMs: 10000 }),
  });
  const data = await res.json();
  console.log('HTTP:', res.status);
  console.log('Page title:', data.pageTitle);
  console.log('Elements:', data.elements?.length || 0);
  console.log('Summary:', JSON.stringify(data.summary));
  if (data.elements?.length > 0) {
    data.elements.forEach(e => console.log(`  [${e.tagName}] role=${e.role} text="${e.innerText?.slice(0,40)}" aria="${e.ariaLabel}" id=${e.id}`));
  }
  if (data.errors?.length > 0) {
    console.log('Errors:', data.errors);
  }
} catch (err) {
  console.error('/api/inspect FAILED:', err.message);
}

// TEST 2: Inspect mutated page directly (the healing scenario)
console.log('\n=== TEST 2: Mutated fixture DOM inspection ===');
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await ctx.newPage();

await page.goto('http://localhost:3001/fixture?mutated=true', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(500);

const title = await page.title();
console.log('Page title:', title);

// DOM inspect for interactive elements
const elements = await page.evaluate(() => {
  const candidates = [];
  const selector = 'button, a, input, select, textarea, [role="button"], [role="link"], [role="textbox"], [role="status"], [role="heading"], h1, h2, h3, [data-action], [tabindex="0"]';
  document.querySelectorAll(selector).forEach(el => {
    const style = window.getComputedStyle(el);
    const isVisible = style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0' && el.offsetWidth > 0 && el.offsetHeight > 0;
    if (!isVisible) return;
    candidates.push({
      tag: el.tagName.toLowerCase(),
      role: el.getAttribute('role') || (el.tagName === 'BUTTON' ? 'button' : el.tagName === 'INPUT' ? 'textbox' : null),
      id: el.id || null,
      text: el.innerText?.trim().slice(0, 50) || null,
      ariaLabel: el.getAttribute('aria-label') || null,
      placeholder: el.getAttribute('placeholder') || null,
    });
  });
  return candidates;
});
console.log('Visible elements:', elements.length);
elements.forEach(e => console.log(`  <${e.tag}> role=${e.role} id=${e.id} text="${e.text}" aria="${e.ariaLabel}"`));

// TEST 3: Try the self-healing path — look for "Submit Feedback" which doesn't exist
console.log('\n=== TEST 3: Self-healing locator test on mutated page ===');
const submitBtn = page.getByRole('button', { name: 'Submit Feedback' });
const submitVisible = await submitBtn.isVisible({ timeout: 1000 }).catch(() => false);
console.log('"Submit Feedback" visible:', submitVisible);

// Now try the expected healing target
const sendBtn = page.getByRole('button', { name: 'Send Feedback' });
const sendVisible = await sendBtn.isVisible({ timeout: 1000 }).catch(() => false);
console.log('"Send Feedback" visible:', sendVisible);

// Try aria-label based
const ariaBtn = page.getByLabel('Send Feedback');
const ariaVisible = await ariaBtn.isVisible({ timeout: 1000 }).catch(() => false);
console.log('getByLabel("Send Feedback") visible:', ariaVisible);

// TEST 4: Full healing test run via API
console.log('\n=== TEST 4: Full healing run via API ===');
try {
  const res = await fetch('http://localhost:3001/api/runs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      targetUrl: 'http://localhost:3001/fixture?mutated=true',
      naturalLanguageInstruction: 'Navigate to fixture, enter "Test User" into "Feedback Input", click "Submit Feedback", verify "Feedback Submitted Successfully" is visible',
      allowLocalhost: true,
      timeoutMs: 15000,
      maxRetries: 2,
      customSuccessCriteria: 'Feedback Submitted Successfully'
    }),
  });
  const run = await res.json();
  console.log('Run status:', run.status);
  console.log('Steps:');
  run.steps?.forEach(s => console.log(`  Step ${s.order} [${s.status}]: ${s.description?.slice(0, 60)}`));
  console.log('Healing records:', run.healingRecords?.length || 0);
  if (run.healingRecords?.length > 0) {
    const hr = run.healingRecords[0];
    console.log('  Strategy:', hr.chosenAlternative?.strategy);
    console.log('  Confidence:', hr.confidenceScore);
    console.log('  Explanation:', hr.explanation?.slice(0, 120));
  }
  console.log('Heal logs:');
  run.logs?.filter(l => l.level === 'heal' || l.level === 'error').forEach(l => console.log(`  [${l.level}] ${l.message?.slice(0, 100)}`));
} catch (err) {
  console.error('API run FAILED:', err.message);
}

await ctx.close();
await browser.close();
console.log('\n=== DONE ===');
