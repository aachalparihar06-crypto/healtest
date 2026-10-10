import { PlaywrightExecutor } from '../../engine/src/executor';
import type { TestIntent } from '../../shared/types';

async function runStage2Verification() {
  console.log('--- Starting Stage 2 Automated Real Playwright Test ---');

  const testIntent: TestIntent = {
    targetUrl: 'http://localhost:3001/fixture',
    naturalLanguageInstruction: 'Navigate to fixture page, enter "Stage 2 Verified" into "Feedback Input", click "Submit Feedback", verify "Feedback Submitted Successfully" is visible',
    allowLocalhost: true,
    timeoutMs: 15000,
    maxRetries: 1,
    customSuccessCriteria: 'Feedback Submitted Successfully',
  };

  const executor = new PlaywrightExecutor({
    headless: true,
    screenshotBaseUrl: 'http://localhost:3001/api/screenshots',
  });

  console.log('[Stage 2 Test] Running Playwright against minimal temporary fixture page (http://localhost:3001/fixture)...');
  const result = await executor.executeTestRun(testIntent);

  console.log('\n--- Playwright Execution Completed ---');
  console.log(`Run ID: ${result.id}`);
  console.log(`Status: ${result.status}`);
  console.log(`Duration: ${result.executionTimeMs}ms`);
  console.log(`Total Steps: ${result.summary.totalSteps}`);
  console.log(`Passed Steps: ${result.summary.passedSteps}`);
  console.log(`Failed Steps: ${result.summary.failedSteps}`);
  console.log(`Screenshots Captured: ${result.screenshots.length}`);
  
  console.log('\nSteps Breakdown:');
  for (const s of result.steps) {
    console.log(`  [Step #${s.order}] [${s.status.toUpperCase()}] ${s.description} (${s.durationMs}ms)`);
    if (s.screenshotAfterUrl) {
      console.log(`      Screenshot: ${s.screenshotAfterUrl}`);
    }
    if (s.domSnapshotExcerpt) {
      console.log(`      DOM: ${s.domSnapshotExcerpt.replace(/\n/g, '')}`);
    }
  }

  console.log('\nExecution Logs:');
  for (const l of result.logs) {
    console.log(`  [${l.timestamp}] [${l.level.toUpperCase()}] ${l.message}`);
  }

  if (result.status === 'PASSED' && result.summary.passedSteps >= 4) {
    console.log('\n✅ Stage 2 VERIFICATION SUCCESS: Real Playwright test executed and passed against fixture page!');
    process.exit(0);
  } else {
    console.error('\n❌ Stage 2 VERIFICATION FAILED: Expected all steps to pass.');
    process.exit(1);
  }
}

runStage2Verification().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
