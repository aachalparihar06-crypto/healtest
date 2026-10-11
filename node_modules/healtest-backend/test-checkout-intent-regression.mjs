import { PlaywrightExecutor } from '../engine/src/executor.ts';
import { decomposeIntentIntoSteps, isSimulationOrDebugControl, groundStepsWithLiveDom } from '../engine/src/intentParser.js';
import { evaluateSelfHealingCandidates, areSynonyms } from '../engine/src/healingStrategist.js';

console.log('======================================================================');
console.log('   HEALTEST INTENT PARSER & CHECKOUT WORKFLOW AUTOMATED REGRESSION   ');
console.log('======================================================================\n');

// ----------------------------------------------------------------------
// TEST 1: Intent Decomposition Unit Verification
// ----------------------------------------------------------------------
console.log('>>> TEST 1: Unit Decomposition of Checkout Instruction');
const intent = {
  id: 'intent-checkout-test',
  targetUrl: 'http://localhost:4000/',
  naturalLanguageInstruction: 'Open the shopping website, locate the "Checkout" button, click it, and verify that the checkout page',
};

const decomposedSteps = decomposeIntentIntoSteps(intent);
console.log(`  Decomposed into ${decomposedSteps.length} atomic steps:`);
decomposedSteps.forEach((s) => {
  console.log(`    Step #${s.order} [${s.type}]: "${s.description}" | selector: ${JSON.stringify(s.selector)}`);
});

if (decomposedSteps.length < 3) {
  throw new Error(`Expected at least 3 steps, got ${decomposedSteps.length}`);
}

// Verify Step 2 is Click "Checkout", NOT an assertion on "Simulate Checkout Failure"
const clickStep = decomposedSteps.find((s) => s.type === 'click');
if (!clickStep) {
  throw new Error('Expected a click step for Checkout');
}
if (clickStep.description.includes('Simulate Checkout Failure')) {
  throw new Error('FAIL: Click step targeted "Simulate Checkout Failure" instead of "Checkout"!');
}
if (!clickStep.description.toLowerCase().includes('checkout')) {
  throw new Error(`FAIL: Click step description should target Checkout, got: ${clickStep.description}`);
}
console.log('  [PASS] Click step correctly targets Checkout.');

// Verify Step 3 does NOT treat "checkout page" as literal page text
const assertStep = decomposedSteps.find((s) => s.type.startsWith('assert_'));
if (!assertStep) {
  throw new Error('Expected an assert step for checkout page outcome');
}
if (assertStep.description.includes('"checkout page"')) {
  throw new Error(`FAIL: Treated "checkout page" as literal text: ${assertStep.description}`);
}
if (assertStep.selector.text === 'checkout page') {
  throw new Error(`FAIL: Selector text is literal "checkout page"!`);
}
console.log(`  [PASS] Assertion correctly targets page outcome: "${assertStep.description}" (role: ${assertStep.selector.role})`);

// ----------------------------------------------------------------------
// TEST 2: Simulation Control Disqualification Unit Verification
// ----------------------------------------------------------------------
console.log('\n>>> TEST 2: Simulation & Mock Control Disqualification');
const mockToggleFailureElement = {
  id: 'toggle-failure',
  tagName: 'button',
  role: 'switch',
  innerText: 'Simulate Checkout Failure',
  label: 'Simulate Checkout Failure',
  isVisible: true,
  isEnabled: true,
};

const isBlockedForNormal = isSimulationOrDebugControl(mockToggleFailureElement, 'Checkout');
if (!isBlockedForNormal) {
  throw new Error('FAIL: isSimulationOrDebugControl should return true for normal "Checkout" intent!');
}
console.log('  [PASS] "Simulate Checkout Failure" correctly disqualified for normal "Checkout" intent.');

const isAllowedForExplicit = isSimulationOrDebugControl(mockToggleFailureElement, 'click Simulate Checkout Failure');
if (isAllowedForExplicit) {
  throw new Error('FAIL: isSimulationOrDebugControl should allow control when explicitly requested in instruction!');
}
console.log('  [PASS] "Simulate Checkout Failure" allowed when explicitly requested.');

// Grounding test: Ensure live DOM grounding rejects simulation control
const groundedSteps = groundStepsWithLiveDom(
  JSON.parse(JSON.stringify(decomposedSteps)),
  [mockToggleFailureElement]
);
const groundedClick = groundedSteps.find((s) => s.type === 'click');
if (groundedClick.description.includes('Simulate Checkout Failure')) {
  throw new Error('FAIL: groundStepsWithLiveDom incorrectly retargeted Checkout to Simulate Checkout Failure!');
}
console.log('  [PASS] groundStepsWithLiveDom preserved original Checkout intent without matching switch toggle.');

// ----------------------------------------------------------------------
// TEST 3: Synonym Resolution
// ----------------------------------------------------------------------
console.log('\n>>> TEST 3: Checkout Semantic Synonyms');
const synonymsMatch = areSynonyms('Checkout', 'Continue to Purchase');
if (!synonymsMatch) {
  throw new Error('FAIL: "Checkout" and "Continue to Purchase" should be recognized as synonyms!');
}
console.log('  [PASS] "Checkout" and "Continue to Purchase" recognized as semantic synonyms.');

// ----------------------------------------------------------------------
// TEST 4: Real Playwright Execution Against ShopEase (http://localhost:4000/)
// ----------------------------------------------------------------------
console.log('\n>>> TEST 4: Real Playwright Execution on Live Target (http://localhost:4000/)');
console.log('  Instruction: "Open the shopping website, locate the \\"Checkout\\" button, click it, and verify that the checkout page"');

const executor = new PlaywrightExecutor({
  headless: true,
  defaultTimeoutMs: 15000,
});

const runResult = await executor.executeTestRun({
  id: 'run-checkout-regression',
  targetUrl: 'http://localhost:4000/',
  naturalLanguageInstruction: 'Open the shopping website, locate the "Checkout" button, click it, and verify that the checkout page',
  allowLocalhost: true,
  timeoutMs: 15000,
  maxRetries: 1,
});

console.log(`\n  Run ID: ${runResult.id}`);
console.log(`  Verdict: ${runResult.status} (${runResult.durationMs}ms)`);
console.log(`  Steps Summary: Total=${runResult.summary.totalSteps}, Passed=${runResult.summary.passedSteps}, Healed=${runResult.summary.healedSteps}, Failed=${runResult.summary.failedSteps}`);

runResult.steps.forEach((s) => {
  console.log(`    Step #${s.order} [${s.status.toUpperCase()}]: ${s.description} (${s.durationMs}ms)`);
  if (s.error) console.log(`      Error: ${s.error}`);
});

// Assertions on real execution outcome:
if (runResult.status !== 'HEALED' && runResult.status !== 'PASSED') {
  throw new Error(`FAIL: Expected run status HEALED or PASSED, got ${runResult.status}`);
}

// Verify "Simulate Checkout Failure" was NEVER clicked
const failureSwitchClicked = runResult.steps.some((s) => s.description.includes('Simulate Checkout Failure')) ||
  runResult.logs.some((l) => l.message.includes('Click "Simulate Checkout Failure"'));
if (failureSwitchClicked) {
  throw new Error('FAIL: "Simulate Checkout Failure" was clicked during execution!');
}
console.log('  [PASS] "Simulate Checkout Failure" was NEVER clicked.');

// Verify self-healing triggered and recovered to the real checkout button
if (runResult.healingRecords.length === 0) {
  throw new Error('FAIL: Expected self-healing to trigger for Checkout button!');
}
const healRecord = runResult.healingRecords[0];
console.log(`  [PASS] Self-healing triggered on genuine locator failure:`);
console.log(`         Strategy: ${healRecord.chosenAlternative.strategy}`);
console.log(`         Confidence: ${Math.round(healRecord.confidenceScore * 100)}%`);
console.log(`         Repaired Selector: ${JSON.stringify(healRecord.chosenAlternative.selector)}`);

// Verify final checkout page outcome was verified
const finalStep = runResult.steps[runResult.steps.length - 1];
if (finalStep.status !== 'passed') {
  throw new Error(`FAIL: Final checkout page verification step did not pass (status: ${finalStep.status})`);
}
console.log(`  [PASS] Checkout page verified via live DOM / real URL.`);

console.log('\n======================================================================');
console.log('🎉 ALL CHECKOUT INTENT & HEALING REGRESSION TESTS PASSED (4/4)!');
console.log('======================================================================');
