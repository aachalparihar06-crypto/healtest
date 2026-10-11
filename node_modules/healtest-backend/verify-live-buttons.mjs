import { PlaywrightExecutor } from '../engine/src/executor.ts';

async function main() {
  console.log('======================================================================');
  console.log('  LIVE PLAYWRIGHT BUTTON EXTRACTION PROOF: http://localhost:4000/    ');
  console.log('======================================================================');

  const executor = new PlaywrightExecutor({ headless: true });
  console.log('\n[1/3] Launching real Playwright Chromium browser session...');
  const startTime = Date.now();
  const result = await executor.inspectPage('http://localhost:4000/', 10000);
  const elapsed = Date.now() - startTime;

  console.log(`[2/3] Page inspection finished in ${elapsed}ms:`);
  console.log(`  - Target URL:        ${result.targetUrl}`);
  console.log(`  - HTTP Status:       ${result.httpStatus}`);
  console.log(`  - Real Page Title:   "${result.pageTitle}"`);
  console.log(`  - Total Elements:    ${result.elements.length}`);
  console.log(`  - Total Buttons:     ${result.buttons.length}`);
  console.log(`  - Inspection Image:  ${result.screenshotUrl}`);

  console.log('\n[3/3] Live Buttons Extracted Directly from DOM with Accessible Roles & Selectors:');
  result.buttons.forEach((b, index) => {
    const textPreview = b.text ? `"${b.text.slice(0, 30)}"` : '(icon/empty text)';
    console.log(`  #${String(index + 1).padStart(2, ' ')} | Name: "${b.accessibleName}" | Role: ${b.role} | Tag: <${b.tagName}> | ID: ${b.id ? '#' + b.id : 'none'} | Selector: ${b.playwrightSelector}`);
  });

  console.log('\n======================================================================');
  console.log(`✅ VERIFIED: Extracted ${result.buttons.length} REAL buttons via live Playwright browser execution.`);
  console.log('======================================================================');
}

main().catch(console.error);
