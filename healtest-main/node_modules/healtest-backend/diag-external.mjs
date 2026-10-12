// Diagnostic: Test DOM inspection on REAL external websites
import { chromium } from 'playwright';

const testUrls = [
  'https://example.com',
  'https://the-internet.herokuapp.com/login',
  'https://www.saucedemo.com',
];

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });

for (const url of testUrls) {
  console.log(`\n=== Testing: ${url} ===`);
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();

  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    console.log('HTTP:', resp?.status(), 'URL:', page.url());
    await page.waitForTimeout(1000);

    const title = await page.title();
    console.log('Title:', title);

    // Check frames
    const frameCount = page.frames().length;
    console.log('Frames:', frameCount);

    // Check main frame content
    const bodyInfo = await page.evaluate(() => ({
      hasBody: !!document.body,
      childCount: document.body?.children.length || 0,
      innerHTMLLen: document.body?.innerHTML.length || 0,
      readyState: document.readyState,
    }));
    console.log('Body:', JSON.stringify(bodyInfo));

    // DOM inspection 
    const elements = await page.evaluate(() => {
      const candidates = [];
      const sel = 'button, a, input, select, textarea, [role="button"], [role="link"], [role="textbox"], [role="status"], [role="heading"], h1, h2, h3, [data-action], [tabindex="0"]';
      document.querySelectorAll(sel).forEach(el => {
        const style = window.getComputedStyle(el);
        const isVis = style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0' && el.offsetWidth > 0 && el.offsetHeight > 0;
        if (!isVis) return;
        candidates.push({
          tag: el.tagName.toLowerCase(),
          role: el.getAttribute('role') || null,
          id: el.id || null,
          text: el.innerText?.trim().slice(0, 50) || null,
          type: el.getAttribute('type') || null,
          ariaLabel: el.getAttribute('aria-label') || null,
        });
      });
      return candidates;
    });
    console.log('Visible interactive elements:', elements.length);
    elements.slice(0, 8).forEach(e => console.log(`  <${e.tag}> role=${e.role} id=${e.id} text="${e.text}" type=${e.type}`));
    if (elements.length > 8) console.log(`  ... and ${elements.length - 8} more`);

    // Test /api/inspect endpoint with this URL
    console.log('--- /api/inspect endpoint ---');
    const inspRes = await fetch('http://localhost:3001/api/inspect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, allowLocalhost: true, timeoutMs: 15000 }),
    });
    const inspData = await inspRes.json();
    if (inspRes.ok) {
      console.log('Inspect OK: elements=', inspData.elements?.length, 'errors=', inspData.errors?.length);
      if (inspData.errors?.length > 0) console.log('Inspect errors:', inspData.errors);
    } else {
      console.log('Inspect FAILED:', inspData.error || inspRes.status);
    }

  } catch (err) {
    console.error('FAILED:', err.message);
  }
  await ctx.close();
}

await browser.close();
console.log('\n=== ALL DONE ===');
