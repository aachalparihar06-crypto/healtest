import { decomposeIntentIntoSteps } from '../engine/src/intentParser.js';

async function runRegressionTests() {
  console.log('======================================================================');
  console.log('      HEALTEST ASSERTION LOGIC REGRESSION & GOAL VERIFICATION         ');
  console.log('======================================================================\n');

  // REGRESSION TEST 1: Decompose intent "Navigate to target and click Dashboard"
  // Even with stale customSuccessCriteria="Feedback Submitted Successfully" passed in intent!
  console.log('>>> REGRESSION TEST 1: Unit Decomposition of "Navigate to target and click Dashboard"');
  const intent1 = {
    targetUrl: 'http://localhost:3000',
    naturalLanguageInstruction: 'Navigate to target and click Dashboard',
    customSuccessCriteria: 'Feedback Submitted Successfully', // stale leftover from previous test
    allowLocalhost: true,
    timeoutMs: 15000,
    maxRetries: 2,
  };

  const steps1 = decomposeIntentIntoSteps(intent1);
  console.log(`  Decomposed ${steps1.length} steps:`);
  for (const s of steps1) {
    console.log(`    Step #${s.order} [${s.type}]: "${s.description}" (selector: ${JSON.stringify(s.selector)})`);
  }

  // Verify: "Feedback Submitted Successfully" MUST NOT exist in ANY step
  const hasFeedbackArtifact = steps1.some((s) => 
    s.description.includes('Feedback Submitted Successfully') || 
    s.selector.text === 'Feedback Submitted Successfully' || 
    s.value === 'Feedback Submitted Successfully'
  );

  if (hasFeedbackArtifact) {
    throw new Error('REGRESSION FAILURE: "Feedback Submitted Successfully" was erroneously injected into steps!');
  }
  console.log('  [PASS] Confirmed: No unrelated "Feedback Submitted Successfully" was invented!');

  // Verify: Goal assertion for "Dashboard" WAS generated
  const goalStep = steps1.find((s) => s.type.startsWith('assert_') && (s.value === 'Dashboard' || s.selector.name === 'Dashboard'));
  if (!goalStep) {
    throw new Error('REGRESSION FAILURE: Expected goal assertion for "Dashboard" was not generated!');
  }
  console.log(`  [PASS] Confirmed: Goal outcome assertion generated for "${goalStep.selector.name}"!\n`);

  // REGRESSION TEST 2: Intent with legitimate custom criteria
  console.log('>>> REGRESSION TEST 2: Legitimate custom criteria matching intent');
  const intent2 = {
    targetUrl: 'http://localhost:3001/fixture',
    naturalLanguageInstruction: 'Enter "Shivansh" into "Feedback Input", click "Submit Feedback"',
    customSuccessCriteria: 'Feedback Submitted Successfully', // legitimate for feedback fixture
    allowLocalhost: true,
    timeoutMs: 15000,
    maxRetries: 2,
  };
  const steps2 = decomposeIntentIntoSteps(intent2);
  const legitCriteriaStep = steps2.find((s) => s.description.includes('Feedback Submitted Successfully'));
  if (!legitCriteriaStep) {
    throw new Error('REGRESSION FAILURE: Relevant criteria was not preserved when legitimate!');
  }
  console.log('  [PASS] Confirmed: Legitimate relevant criteria preserved for matching intent.\n');

  // REGRESSION TEST 3: Real Playwright Execution via API (No Unrelated Assertion)
  console.log('>>> REGRESSION TEST 3: Real Playwright Run on Live Fixture (Navigate + Click Submit Feedback)');
  const res3 = await fetch('http://localhost:3001/api/runs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      targetUrl: 'http://localhost:3001/fixture',
      naturalLanguageInstruction: 'Navigate to fixture and click Submit Feedback',
      customSuccessCriteria: 'Unrelated Cart Total Calculated', // stale leftover in request, must be discarded
      allowLocalhost: true,
      timeoutMs: 15000,
    }),
  });
  const run3 = await res3.json();
  console.log('  Run ID:', run3.id);
  console.log('  Verdict:', run3.status);
  console.log('  Executed Steps:');
  for (const s of run3.steps) {
    console.log(`    Step #${s.order} [${s.type}]: status=${s.status} desc="${s.description}"`);
  }

  // Ensure "Unrelated Cart Total Calculated" is NOT in executed steps
  const hasUnrelatedInRun = run3.steps.some((s) => s.description.includes('Unrelated Cart Total Calculated'));
  if (hasUnrelatedInRun) {
    throw new Error('REGRESSION FAILURE: Real run executed unrelated criteria assertion!');
  }
  console.log('  [PASS] Confirmed: "Unrelated Cart Total Calculated" was completely discarded from real execution!');

  // Ensure step 3 is the goal outcome assertion
  const goalOutcomeStep = run3.steps.find((s) => s.type.startsWith('assert_') && s.description.toLowerCase().includes('feedback'));
  if (!goalOutcomeStep) {
    throw new Error('REGRESSION FAILURE: Goal outcome assertion was not found in executed steps!');
  }
  console.log(`  [PASS] Confirmed: Real goal outcome assertion executed: "${goalOutcomeStep.description}" (status=${goalOutcomeStep.status})`);

  if (run3.status !== 'PASSED') {
    throw new Error('REGRESSION FAILURE: Real run did not pass: ' + JSON.stringify(run3.logs));
  }
  console.log('  [PASS] Real Playwright run verified actual goal outcome without inventing unrelated assertions!\n');

  console.log('======================================================================');
  console.log('     ALL ASSERTION LOGIC REGRESSION TESTS PASSED SUCCESSFULLY!        ');
  console.log('======================================================================');
}

runRegressionTests().catch((err) => {
  console.error('[REGRESSION TEST FAILED]:', err);
  process.exit(1);
});
