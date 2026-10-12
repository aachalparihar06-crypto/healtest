// Pure JS diagnostic for DOM inspection
import { chromium } from 'playwright';

console.log('[DIAG] Launching Chromium...');
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await context.newPage();

// Capture browser console errors
page.on('console', msg => {
  if (msg.type() === 'error') console.log('[Browser Console Error]', msg.text());
});
page.on('pageerror', err => console.log('[Page Error]', err.message));

// Step 1: Navigate
console.log('[DIAG] Navigating to fixture...');
let httpStatus = null;
try {
  const response = await page.goto('http://localhost:3001/fixture', { waitUntil: 'domcontentloaded', timeout: 10000 });
  httpStatus = response?.status();
  console.log('[DIAG] HTTP status:', httpStatus);
  console.log('[DIAG] Page URL:', page.url());
} catch (navErr) {
  console.error('[DIAG] Navigation FAILED:', navErr.message);
  await browser.close();
  process.exit(1);
}

// Step 2: Wait for DOM
await page.waitForTimeout(600);

// Step 3: Page title
const title = await page.title();
console.log('[DIAG] Page title:', title);

// Step 4: Body / readyState check
const bodyCheck = await page.evaluate(() => ({
  hasBody: !!document.body,
  bodyChildren: document.body?.children.length,
  innerHTML_len: document.body?.innerHTML.length,
  readyState: document.readyState,
  frameCount: window.frames.length,
}));
console.log('[DIAG] Body check:', JSON.stringify(bodyCheck));

// Step 5: Count matching elements (no TS casts)
const elemCount = await page.evaluate(() => {
  const sel = 'button, a, input, select, textarea, [role="button"], [role="link"], [role="textbox"], [role="status"], [role="heading"], h1, h2, h3';
  const els = document.querySelectorAll(sel);
  const results = [];
  els.forEach(el => {
    results.push({
      tag: el.tagName.toLowerCase(),
      id: el.id || null,
      text: el.innerText?.trim().slice(0, 50) || null,
      type: el.getAttribute('type') || null,
      ariaLabel: el.getAttribute('aria-label') || null,
      offsetW: el.offsetWidth,
      offsetH: el.offsetHeight,
    });
  });
  return results;
});
console.log('[DIAG] Elements matching selector:', elemCount.length);
elemCount.forEach(e => console.log(`  <${e.tag}> id=${e.id} text="${e.text}" aria="${e.ariaLabel}" size=${e.offsetW}x${e.offsetH}`));

// Step 6: Test exact inspectInteractiveDom logic - the current implementation
console.log('\n[DIAG] Testing inspectInteractiveDom logic...');
let inspectResult;
try {
  inspectResult = await page.evaluate(() => {
    const candidates = [];
    const selector = 'button, a, input, select, textarea, [role="button"], [role="link"], [role="textbox"], [role="status"], [role="heading"], h1, h2, h3, [data-action], [tabindex="0"]';
    const elements = document.querySelectorAll(selector);

    elements.forEach((el) => {
      const htmlEl = el;
      const style = window.getComputedStyle(htmlEl);
      const isVisible = style.display !== 'none' &&
                        style.visibility !== 'hidden' &&
                        style.opacity !== '0' &&
                        htmlEl.offsetWidth > 0 &&
                        htmlEl.offsetHeight > 0;

      if (!isVisible) return;

      const isEnabled = !htmlEl.disabled;
      const tagName = htmlEl.tagName.toLowerCase();
      const role = htmlEl.getAttribute('role') || 
        (tagName === 'button' ? 'button' : 
         tagName === 'a' ? 'link' : 
         tagName === 'input' ? 'textbox' : null);
      const innerText = htmlEl.innerText ? htmlEl.innerText.trim() : (htmlEl.textContent ? htmlEl.textContent.trim() : '');
      const ariaLabel = htmlEl.getAttribute('aria-label') || htmlEl.getAttribute('aria-labelledby') || null;
      const placeholder = htmlEl.getAttribute('placeholder') || null;
      const id = htmlEl.id || null;

      candidates.push({ tagName, role, innerText: innerText.slice(0, 60), ariaLabel, placeholder, id, isVisible, isEnabled });
    });
    return candidates;
  });
  console.log('[DIAG] inspectInteractiveDom returned:', inspectResult.length, 'elements');
  inspectResult.forEach(e => console.log(`  [${e.tagName}] role=${e.role} text="${e.innerText}" aria="${e.ariaLabel}" id=${e.id}`));
} catch (evalErr) {
  console.error('[DIAG] page.evaluate THREW:', evalErr.message);
  console.error(evalErr.stack?.slice(0, 800));
}

// Step 7: Try Playwright locators
console.log('\n[DIAG] Testing Playwright locators...');
try {
  const inputLocator = page.getByLabel('Feedback Input');
  const inputVisible = await inputLocator.isVisible().catch(() => false);
  console.log('[DIAG] Input (getByLabel) visible:', inputVisible);

  const btnLocator = page.getByRole('button', { name: 'Submit Feedback' });
  const btnVisible = await btnLocator.isVisible().catch(() => false);
  console.log('[DIAG] Button (getByRole) visible:', btnVisible);

  if (btnVisible) {
    await inputLocator.fill('Diag Click Test');
    await btnLocator.click({ timeout: 5000 });
    await page.waitForTimeout(400);
    const status = page.getByRole('status');
    const statusVisible = await status.isVisible().catch(() => false);
    const statusText = await status.innerText().catch(() => '');
    console.log('[DIAG] Status banner visible:', statusVisible);
    console.log('[DIAG] Status text:', statusText);
  }
} catch (locErr) {
  console.error('[DIAG] Locator test FAILED:', locErr.message);
}

// Step 8: Screenshot
try {
  await page.screenshot({ path: 'backend/artifacts/diag-dom.png', fullPage: true });
  console.log('\n[DIAG] Screenshot saved: backend/artifacts/diag-dom.png');
} catch {}

await context.close();
await browser.close();
console.log('[DIAG] Done.');
