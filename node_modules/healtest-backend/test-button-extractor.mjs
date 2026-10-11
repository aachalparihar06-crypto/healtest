
async function verifyButtonExtractor() {
  console.log('======================================================================');
  console.log('        HEALTEST LIVE BUTTON EXTRACTOR AUTOMATED VERIFICATION          ');
  console.log('======================================================================\n');

  const BASE_URL = 'http://localhost:3001';

  // TEST 1: Baseline Fixture Button Extraction
  console.log('>>> TEST 1: Extract buttons from live Baseline Fixture (http://localhost:3001/fixture)');
  const res1 = await fetch(`${BASE_URL}/api/extract-buttons`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: `${BASE_URL}/fixture`, allowLocalhost: true }),
  });
  const data1 = await res1.json();
  console.log(`  HTTP Status: ${res1.status}`);
  console.log(`  Page Title: "${data1.pageTitle}"`);
  console.log(`  Extracted Buttons Count: ${data1.totalButtons}`);
  console.log(`  Buttons Extracted:`, JSON.stringify(data1.buttons, null, 2));

  if (data1.totalButtons !== 1) {
    throw new Error(`TEST 1 FAILED: Expected 1 button, found ${data1.totalButtons}`);
  }
  const btn1 = data1.buttons[0];
  if (btn1.accessibleName !== 'Submit Feedback') throw new Error(`TEST 1 FAILED: Expected accessibleName "Submit Feedback", got "${btn1.accessibleName}"`);
  if (btn1.role !== 'button') throw new Error(`TEST 1 FAILED: Expected role "button", got "${btn1.role}"`);
  if (btn1.text !== 'Submit Feedback') throw new Error(`TEST 1 FAILED: Expected text "Submit Feedback", got "${btn1.text}"`);
  if (!btn1.selector.includes('submit-btn')) throw new Error(`TEST 1 FAILED: Expected selector targeting #submit-btn, got "${btn1.selector}"`);
  if (btn1.isEnabled !== true) throw new Error(`TEST 1 FAILED: Expected isEnabled true, got ${btn1.isEnabled}`);
  console.log('  [PASS] Test 1: Real button successfully extracted with all accessible properties verified!\n');

  // TEST 2: Mutated Fixture Button Extraction
  console.log('>>> TEST 2: Extract buttons from live Mutated Fixture (http://localhost:3001/fixture?mutated=true)');
  const res2 = await fetch(`${BASE_URL}/api/extract-buttons`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: `${BASE_URL}/fixture?mutated=true`, allowLocalhost: true }),
  });
  const data2 = await res2.json();
  console.log(`  Extracted Buttons Count: ${data2.totalButtons}`);
  const btn2 = data2.buttons[0];
  console.log(`  Extracted Button: "${btn2.accessibleName}", role=${btn2.role}, selector=${btn2.selector}, isEnabled=${btn2.isEnabled}`);

  if (btn2.accessibleName !== 'Send Feedback') throw new Error(`TEST 2 FAILED: Expected accessibleName "Send Feedback", got "${btn2.accessibleName}"`);
  if (!btn2.selector.includes('send-feedback-btn')) throw new Error(`TEST 2 FAILED: Expected selector targeting #send-feedback-btn, got "${btn2.selector}"`);
  console.log('  [PASS] Test 2: Mutated button accurately discovered with live accessible name!\n');

  // TEST 3: Broken Fixture (No Mock Data Fabricated)
  console.log('>>> TEST 3: Broken Page with 0 Buttons (http://localhost:3001/fixture?broken=true)');
  const res3 = await fetch(`${BASE_URL}/api/extract-buttons`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: `${BASE_URL}/fixture?broken=true`, allowLocalhost: true }),
  });
  const data3 = await res3.json();
  console.log(`  Extracted Buttons Count: ${data3.totalButtons}`);
  if (data3.totalButtons !== 0) throw new Error(`TEST 3 FAILED: Expected 0 buttons, got ${data3.totalButtons}`);
  console.log('  [PASS] Test 3: Strictly 0 buttons returned when DOM has none. No mock buttons fabricated!\n');

  // TEST 4: Inaccessible URL Error Handling (Connection Refused)
  console.log('>>> TEST 4: Inaccessible URL Error Handling (http://localhost:59999)');
  const res4 = await fetch(`${BASE_URL}/api/extract-buttons`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: `http://localhost:59999`, allowLocalhost: true, timeoutMs: 3000 }),
  });
  const data4 = await res4.json();
  console.log(`  Reported Errors (${data4.errors?.length}):`, data4.errors);
  if (!data4.errors || data4.errors.length === 0) {
    throw new Error('TEST 4 FAILED: Expected honest connection error for unreachable port.');
  }
  const hasRefusedMsg = data4.errors.some(e => e.includes('refused connection') || e.includes('ERR_CONNECTION_REFUSED'));
  if (!hasRefusedMsg) {
    throw new Error('TEST 4 FAILED: Did not provide clear connection refusal explanation.');
  }
  console.log('  [PASS] Test 4: Inaccessible URL honestly handled with clear diagnosis!\n');

  // TEST 5: Invalid Hostname Error Handling (DNS Failure)
  console.log('>>> TEST 5: Non-Existent Domain Error Handling (http://invalid-non-existent-hostname-123456.xyz)');
  const res5 = await fetch(`${BASE_URL}/api/extract-buttons`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: `http://invalid-non-existent-hostname-123456.xyz`, allowLocalhost: true, timeoutMs: 4000 }),
  });
  const data5 = await res5.json();
  console.log(`  Reported Errors:`, data5.errors);
  const hasDnsOrTimeout = data5.errors.some(e => e.includes('DNS resolution failed') || e.includes('ERR_NAME_NOT_RESOLVED') || e.includes('timed out'));
  if (!hasDnsOrTimeout) {
    throw new Error('TEST 5 FAILED: Expected DNS resolution or timeout error explanation.');
  }
  console.log('  [PASS] Test 5: Unresolvable domain honestly reported with error diagnosis!\n');

  console.log('======================================================================');
  console.log('   ALL BUTTON EXTRACTION LIVE VERIFICATION TESTS PASSED (5/5)!        ');
  console.log('======================================================================');
}

verifyButtonExtractor().catch((err) => {
  console.error('[BUTTON EXTRACTOR VERIFICATION FAILED]:', err);
  process.exit(1);
});
