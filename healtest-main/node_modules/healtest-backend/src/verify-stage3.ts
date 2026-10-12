import { PlaywrightExecutor } from '../../engine/src/executor';
import type { TestIntent } from '../../shared/types';

async function runStage3Verification() {
  console.log('================================================================');
  console.log('  HealTest Stage 3 Verification: Generic Failure Detection,');
  console.log('  Autonomous Action Recovery & Ground Truth Outcome Verification');
  console.log('================================================================\n');

  const executor = new PlaywrightExecutor({
    headless: true,
    screenshotBaseUrl: 'http://localhost:3001/api/screenshots',
  });

  // TEST 1: Real UI Mutation with Autonomous Self-Healing Recovery
  console.log('--- TEST 1: Autonomous Self-Healing on Mutated Target Page ---');
  console.log('Target: http://localhost:3001/fixture?mutated=true');
  console.log('Expected Mutation: Button changed from "Submit Feedback" to "Send Feedback"');

  const mutatedIntent: TestIntent = {
    targetUrl: 'http://localhost:3001/fixture?mutated=true',
    naturalLanguageInstruction: 'Navigate to fixture, enter "Stage 3 Healing Verified" into "Feedback Input", click "Submit Feedback", verify "Feedback Submitted Successfully" is visible',
    allowLocalhost: true,
    timeoutMs: 15000,
    maxRetries: 2,
    customSuccessCriteria: 'Feedback Submitted Successfully',
  };

  const healResult = await executor.executeTestRun(mutatedIntent);

  console.log(`\nTest 1 Result: Status = [${healResult.status}], Duration = ${healResult.executionTimeMs}ms`);
  console.log(`Steps: Total = ${healResult.summary.totalSteps}, Passed = ${healResult.summary.passedSteps}, Healed = ${healResult.summary.healedSteps}, Failed = ${healResult.summary.failedSteps}`);
  console.log(`Healing Records Generated: ${healResult.healingRecords.length}`);

  for (const hr of healResult.healingRecords) {
    console.log(`\n  [HEALING RECORD] Step #${hr.stepIndex + 1}`);
    console.log(`    Strategy: ${hr.chosenAlternative.strategy}`);
    console.log(`    Confidence Score: ${Math.round(hr.confidenceScore * 100)}%`);
    console.log(`    Original Broken Selector: ${JSON.stringify(hr.originalAction.selector)}`);
    console.log(`    Repaired Live Selector:   ${JSON.stringify(hr.chosenAlternative.selector)}`);
    console.log(`    Detected DOM Mutation:    ${hr.detectedDomChanges.changeType}`);
    console.log(`    Live Element Discovered:  ${hr.chosenAlternative.domSnippet.replace(/\n/g, '')}`);
    console.log(`    Explanation: ${hr.explanation}`);
  }

  // Assertions for Test 1
  if (healResult.status !== 'HEALED' || healResult.summary.healedSteps !== 1 || healResult.healingRecords.length === 0) {
    console.error('\n❌ TEST 1 FAILED: Expected outcome to be HEALED with 1 healed action.');
    process.exit(1);
  }
  console.log('\n✅ TEST 1 PASSED: UI Mutation detected and autonomously healed!\n');

  // TEST 2: Unrecoverable Target Page (Strict No-Fabrication Check)
  console.log('--- TEST 2: Strict No-Fabrication Failure Verification ---');
  console.log('Target: http://localhost:3001/fixture?broken=true');
  console.log('Expected Condition: Interactive target missing entirely with no viable replacement.');

  const brokenIntent: TestIntent = {
    targetUrl: 'http://localhost:3001/fixture?broken=true',
    naturalLanguageInstruction: 'Navigate to fixture, enter "Testing Failure" into "Feedback Input", click "Submit Feedback", verify "Feedback Submitted Successfully" is visible',
    allowLocalhost: true,
    timeoutMs: 10000,
    maxRetries: 1,
    customSuccessCriteria: 'Feedback Submitted Successfully',
  };

  const brokenResult = await executor.executeTestRun(brokenIntent);

  console.log(`\nTest 2 Result: Status = [${brokenResult.status}], Failed Steps = ${brokenResult.summary.failedSteps}`);
  
  if (brokenResult.status !== 'FAILED') {
    console.error('\n❌ TEST 2 FAILED: Expected run to fail strictly without fabricating recovery.');
    process.exit(1);
  }
  console.log('✅ TEST 2 PASSED: Correctly reported FAILED. No fake healing fabricated.\n');

  console.log('================================================================');
  console.log('🎉 ALL STAGE 3 VERIFICATION TESTS PASSED SUCCESSFULLY!');
  console.log('================================================================');
  process.exit(0);
}

runStage3Verification().catch((err) => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
