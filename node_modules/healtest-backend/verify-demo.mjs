// Comprehensive demo verification script
// Tests all 3 scenarios and verifies All/Passed/Failed/Healed filter results

console.log('=== HealTest Demo Comprehensive Verification ===\n');

// 1. Health check
const health = await fetch('http://localhost:3001/api/health').then(r => r.json());
console.log('✅ Backend Health:', health.online ? 'ONLINE' : 'OFFLINE', '-', health.message);
console.log('   Engine Status:', health.engineStatus);
console.log('   Total Runs in History:', health.totalExecutedRuns);
console.log();

// 2. Run baseline test (should PASS)
console.log('--- TEST 1: Baseline E2E (should PASS) ---');
const baselineRun = await fetch('http://localhost:3001/api/runs', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    targetUrl: 'http://localhost:3001/fixture',
    naturalLanguageInstruction: 'Navigate to fixture, enter "Demo User" into "Feedback Input", click "Submit Feedback", verify "Feedback Submitted Successfully" is visible',
    allowLocalhost: true,
    timeoutMs: 15000,
    maxRetries: 2,
    customSuccessCriteria: 'Feedback Submitted Successfully'
  })
}).then(r => r.json());
console.log(`Result: ${baselineRun.status} | Steps: ${baselineRun.summary?.totalSteps} | Duration: ${baselineRun.executionTimeMs}ms`);
console.log(`Steps: ${baselineRun.steps?.map(s => `${s.order}:${s.status}`).join(' → ')}`);
console.log();

// 3. Run healing test (should HEALED)
console.log('--- TEST 2: Self-Healing Demo (mutated UI, should HEALED) ---');
const healingRun = await fetch('http://localhost:3001/api/runs', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    targetUrl: 'http://localhost:3001/fixture?mutated=true',
    naturalLanguageInstruction: 'Navigate to fixture, enter "HealTest User" into "Feedback Input", click "Submit Feedback", verify "Feedback Submitted Successfully" is visible',
    allowLocalhost: true,
    timeoutMs: 15000,
    maxRetries: 2,
    customSuccessCriteria: 'Feedback Submitted Successfully'
  })
}).then(r => r.json());
console.log(`Result: ${healingRun.status} | Healing Records: ${healingRun.healingRecords?.length || 0}`);
console.log(`Steps: ${healingRun.steps?.map(s => `${s.order}:${s.status}`).join(' → ')}`);
if (healingRun.healingRecords?.length > 0) {
  const hr = healingRun.healingRecords[0];
  console.log(`HEALING Strategy: ${hr.chosenAlternative?.strategy}`);
  console.log(`HEALING Confidence: ${Math.round(hr.confidenceScore * 100)}%`);
  console.log(`HEALING Explanation: ${hr.explanation?.slice(0, 100)}...`);
}
console.log();

// 4. Run broken test (should FAIL)
console.log('--- TEST 3: Strict Failure (broken UI, should FAIL) ---');
const failedRun = await fetch('http://localhost:3001/api/runs', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    targetUrl: 'http://localhost:3001/fixture?broken=true',
    naturalLanguageInstruction: 'Navigate to fixture, enter "Test Fail" into "Feedback Input", click "Submit Feedback", verify "Feedback Submitted Successfully" is visible',
    allowLocalhost: true,
    timeoutMs: 12000,
    maxRetries: 2,
    customSuccessCriteria: 'Feedback Submitted Successfully'
  })
}).then(r => r.json());
console.log(`Result: ${failedRun.status}`);
console.log(`Steps: ${failedRun.steps?.map(s => `${s.order}:${s.status}`).join(' → ')}`);
console.log();

// 5. Check all runs list and filter groups
console.log('--- FILTER VERIFICATION ---');
const allRuns = await fetch('http://localhost:3001/api/runs').then(r => r.json());
const passed = allRuns.filter(r => r.status === 'PASSED');
const healed = allRuns.filter(r => r.status === 'HEALED');
const failed = allRuns.filter(r => r.status === 'FAILED');
console.log(`ALL filter: ${allRuns.length} runs`);
console.log(`PASSED filter: ${passed.length} runs`);
console.log(`HEALED filter: ${healed.length} runs`);
console.log(`FAILED filter: ${failed.length} runs`);
console.log();

// 6. Verify screenshots exist
const latestRun = allRuns[0];
console.log('--- SCREENSHOTS ---');
console.log(`Latest run screenshots: ${latestRun?.screenshots?.length || 0}`);
if (latestRun?.screenshots?.length > 0) {
  console.log(`First screenshot URL: ${latestRun.screenshots[0]}`);
}
console.log();

console.log('=== SUMMARY ===');
const allOk = baselineRun.status === 'PASSED' && healingRun.status === 'HEALED' && failedRun.status === 'FAILED';
console.log(allOk ? '✅ ALL DEMO SCENARIOS VERIFIED CORRECTLY!' : '❌ SOME SCENARIOS FAILED!');
console.log(`Baseline: ${baselineRun.status} (expected PASSED)`);
console.log(`Healing:  ${healingRun.status} (expected HEALED)`);
console.log(`Failure:  ${failedRun.status} (expected FAILED)`);
console.log();
console.log('Frontend URL: http://localhost:5173/');
console.log('Backend URL:  http://localhost:3001/');
console.log('Fixture URL:  http://localhost:3001/fixture');
