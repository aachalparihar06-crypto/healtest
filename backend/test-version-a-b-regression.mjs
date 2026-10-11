import { PlaywrightExecutor } from '../engine/src/executor.ts';
import fs from 'fs';
import path from 'path';

console.log('======================================================================');
console.log('   HEALTEST VERSION A & VERSION B SELF-HEALING REGRESSION SUITE     ');
console.log('======================================================================\n');

const URL_A = 'http://localhost:3001/demo/version-a';
const URL_B = 'http://localhost:3001/demo/version-b';

console.log(`Target App URLs:`);
console.log(`  Version A (Baseline with "Submit Feedback"): ${URL_A}`);
console.log(`  Version B (Renamed button to "Send"):        ${URL_B}\n`);

const executor = new PlaywrightExecutor({
  headless: true,
  defaultTimeoutMs: 15000,
});

// ----------------------------------------------------------------------
// PHASE 1: Run HealTest on Version A & Save Original Locator
// ----------------------------------------------------------------------
console.log('>>> PHASE 1: Executing HealTest on Version A...');
const intentA = {
  id: 'intent-demo-version-a',
  targetUrl: URL_A,
  naturalLanguageInstruction: 'Open customer feedback portal, enter "HealTest Verified Feedback" into "Feedback Input", click "Submit Feedback", and verify "Feedback Submitted Successfully" is visible',
  allowLocalhost: true,
  timeoutMs: 15000,
  maxRetries: 1,
};

const runA = await executor.executeTestRun(intentA);

console.log(`\n  Run A Result:`);
console.log(`    Run ID:   ${runA.id}`);
console.log(`    Verdict:  ${runA.status} (${runA.executionTimeMs}ms)`);
console.log(`    Summary:  Passed=${runA.summary.passedSteps}, Healed=${runA.summary.healedSteps}, Failed=${runA.summary.failedSteps}`);
runA.steps.forEach((s) => {
  console.log(`      Step #${s.order} [${s.status.toUpperCase()}]: ${s.description} (${s.durationMs}ms)`);
});

if (runA.status !== 'PASSED') {
  throw new Error(`FAIL: Expected Run A on Version A to pass, got ${runA.status}`);
}

// Find the click step and save its original locator
const clickStepA = runA.steps.find((s) => s.type === 'click');
if (!clickStepA) {
  throw new Error('FAIL: No click step found in Run A!');
}
const savedOriginalLocator = JSON.parse(JSON.stringify(clickStepA.selector));
console.log(`\n  [SAVED LOCATOR] Saved original locator from Version A:`);
console.log(`    Selector: ${JSON.stringify(savedOriginalLocator)}`);
console.log(`    Target Name: "${savedOriginalLocator.name}" (Role: ${savedOriginalLocator.role})\n`);

// ----------------------------------------------------------------------
// PHASE 2: Replay the SAME Saved Test on Version B (Button renamed to "Send")
// ----------------------------------------------------------------------
console.log('>>> PHASE 2: Replaying Saved Test on Version B with Original Locator...');
console.log(`  Target: ${URL_B}`);
console.log(`  Executing with original locator: [${savedOriginalLocator.role}: "${savedOriginalLocator.name}"]\n`);

// Create exact saved steps from Run A, pointing to Version B
const savedStepsForB = JSON.parse(JSON.stringify(runA.steps)).map((s, idx) => {
  if (idx === 0 && s.type === 'navigate') {
    s.value = URL_B;
    s.description = `Navigate to target URL (${URL_B})`;
  }
  s.status = 'pending';
  s.error = undefined;
  s.durationMs = 0;
  return s;
});

const intentB = {
  id: 'intent-demo-version-b',
  targetUrl: URL_B,
  naturalLanguageInstruction: intentA.naturalLanguageInstruction,
  allowLocalhost: true,
  timeoutMs: 15000,
  maxRetries: 1,
  savedSteps: savedStepsForB, // Pass the saved steps with original locators!
};

const runB = await executor.executeTestRun(intentB);

console.log(`\n  Run B Result:`);
console.log(`    Run ID:   ${runB.id}`);
console.log(`    Verdict:  ${runB.status} (${runB.executionTimeMs}ms)`);
console.log(`    Summary:  Passed=${runB.summary.passedSteps}, Healed=${runB.summary.healedSteps}, Failed=${runB.summary.failedSteps}`);
runB.steps.forEach((s) => {
  console.log(`      Step #${s.order} [${s.status.toUpperCase()}]: ${s.description} (${s.durationMs}ms)`);
  if (s.error) console.log(`        Original Failure Error: ${s.error}`);
});

// ----------------------------------------------------------------------
// VERIFICATION OF RESULTS
// ----------------------------------------------------------------------
console.log('\n>>> PHASE 3: Verifying Self-Healing & Ground Truth Proof:');

// 1. Verify Run B overall status is HEALED
if (runB.status !== 'HEALED') {
  throw new Error(`FAIL: Expected Run B verdict to be HEALED, got ${runB.status}`);
}
console.log('  [PASS] Run B overall status is HEALED.');

// 2. Verify the old locator genuinely failed
const clickStepB = runB.steps.find((s) => s.type === 'click');
if (!clickStepB) {
  throw new Error('FAIL: No click step found in Run B!');
}
if (clickStepB.status !== 'healed') {
  throw new Error(`FAIL: Expected click step status to be 'healed', got '${clickStepB.status}'`);
}
if (!clickStepB.error || !clickStepB.error.includes('Timeout')) {
  throw new Error(`FAIL: Expected click step to record genuine timeout on old locator, got: ${clickStepB.error}`);
}
console.log(`  [PASS] Old locator genuinely failed: "${clickStepB.error}"`);

// 3. Verify HealTest found the new button ("Send") and generated a HealingRecord
if (runB.healingRecords.length === 0) {
  throw new Error('FAIL: No healing record generated in Run B!');
}
const healRecord = runB.healingRecords[0];
console.log(`  [PASS] HealTest discovered new button:`);
console.log(`         Strategy:          ${healRecord.chosenAlternative.strategy}`);
console.log(`         Confidence Score:  ${Math.round(healRecord.confidenceScore * 100)}%`);
console.log(`         Original Selector: ${JSON.stringify(healRecord.originalAction.selector)}`);
console.log(`         Repaired Selector: ${JSON.stringify(healRecord.chosenAlternative.selector)}`);
console.log(`         Explanation:       ${healRecord.explanation}`);

if (!healRecord.chosenAlternative.selector.name?.includes('Send') && !healRecord.chosenAlternative.selector.text?.includes('Send')) {
  throw new Error(`FAIL: Repaired selector should target "Send", got: ${JSON.stringify(healRecord.chosenAlternative.selector)}`);
}
console.log('  [PASS] Repaired selector correctly targets renamed button "Send".');

// 4. Verify assertion confirmed successful submission on Version B
const assertStepB = runB.steps.find((s) => s.type.startsWith('assert_'));
if (!assertStepB || assertStepB.status !== 'passed') {
  throw new Error(`FAIL: Assertion step did not pass in Run B!`);
}
console.log(`  [PASS] Submission outcome verified: "${assertStepB.description}" (status: passed).`);

// Save both runs into runs-history.json so they appear on dashboard & history API
const historyFile = path.resolve('artifacts/runs-history.json');
try {
  let history = [];
  if (fs.existsSync(historyFile)) {
    history = JSON.parse(fs.readFileSync(historyFile, 'utf-8'));
  }
  history.push(runA);
  history.push(runB);
  fs.writeFileSync(historyFile, JSON.stringify(history, null, 2), 'utf-8');
  console.log(`\n  [RECORDED] Saved Run A (${runA.id}) and Run B (${runB.id}) to history store.`);
} catch (histErr) {
  console.warn('Could not update history file:', histErr.message);
}

console.log('\n======================================================================');
console.log('🎉 DEMO APP VERSION A & VERSION B SELF-HEALING TEST COMPLETED 100%!');
console.log('======================================================================');
