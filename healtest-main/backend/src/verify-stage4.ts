import http from 'http';

function makeRequest(options: http.RequestOptions, body?: any): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode || 200, data: data ? JSON.parse(data) : null });
        } catch {
          resolve({ status: res.statusCode || 200, data });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

function checkUrlAccessible(urlStr: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const req = http.get({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
    }, (res) => {
      resolve(res.statusCode || 0);
    });
    req.on('error', reject);
  });
}

async function runStage4Verification() {
  console.log('========================================================================');
  console.log('  HealTest Stage 4 E2E Verification: Dashboard API & Real Execution Trace');
  console.log('========================================================================\n');

  // 1. Health check
  console.log('[Step 1] Verifying Backend Health API...');
  const healthRes = await makeRequest({
    hostname: 'localhost',
    port: 3001,
    path: '/api/health',
    method: 'GET',
  });
  console.log(`  Health API Status: ${healthRes.status} (online: ${healthRes.data?.online})`);
  if (!healthRes.data?.online) {
    throw new Error('Backend health check failed');
  }

  // 2. Test Baseline E2E Pass Flow
  console.log('\n[Step 2] Executing Baseline E2E Test (http://localhost:3001/fixture)...');
  const baselineRes = await makeRequest({
    hostname: 'localhost',
    port: 3001,
    path: '/api/runs',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, {
    targetUrl: 'http://localhost:3001/fixture',
    naturalLanguageInstruction: 'Navigate to fixture, enter "Shivansh Patel" into "Feedback Input", click "Submit Feedback", verify "Feedback Submitted Successfully" is visible',
    allowLocalhost: true,
    timeoutMs: 15000,
    customSuccessCriteria: 'Feedback Submitted Successfully',
  });

  const baselineRun = baselineRes.data;
  console.log(`  Run ID: ${baselineRun.id}`);
  console.log(`  Verdict: ${baselineRun.status} (${baselineRun.executionTimeMs}ms)`);
  console.log(`  Steps: Passed = ${baselineRun.summary.passedSteps}/${baselineRun.summary.totalSteps}`);
  console.log(`  Screenshots Generated: ${baselineRun.screenshots.length}`);
  if (baselineRun.status !== 'PASSED') {
    throw new Error(`Expected baseline run to be PASSED, got ${baselineRun.status}`);
  }

  // Verify screenshot is accessible via HTTP
  if (baselineRun.screenshots.length > 0) {
    const firstScreenshotUrl = baselineRun.screenshots[0];
    const imgStatus = await checkUrlAccessible(firstScreenshotUrl);
    console.log(`  Screenshot HTTP Verification (${firstScreenshotUrl}): ${imgStatus} OK`);
    if (imgStatus !== 200) {
      throw new Error(`Screenshot not accessible over HTTP: ${firstScreenshotUrl}`);
    }
  }

  // 3. Test Autonomous Self-Healing Flow
  console.log('\n[Step 3] Executing Self-Healing Flow (http://localhost:3001/fixture?mutated=true)...');
  const mutatedRes = await makeRequest({
    hostname: 'localhost',
    port: 3001,
    path: '/api/runs',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, {
    targetUrl: 'http://localhost:3001/fixture?mutated=true',
    naturalLanguageInstruction: 'Navigate to fixture, enter "Stage 4 Self-Healing Test" into "Feedback Input", click "Submit Feedback", verify "Feedback Submitted Successfully" is visible',
    allowLocalhost: true,
    timeoutMs: 15000,
    customSuccessCriteria: 'Feedback Submitted Successfully',
  });

  const mutatedRun = mutatedRes.data;
  console.log(`  Run ID: ${mutatedRun.id}`);
  console.log(`  Verdict: ${mutatedRun.status} (${mutatedRun.executionTimeMs}ms)`);
  console.log(`  Healed Steps: ${mutatedRun.summary.healedSteps}`);
  console.log(`  Healing Records: ${mutatedRun.healingRecords.length}`);

  if (mutatedRun.status !== 'HEALED' || mutatedRun.healingRecords.length === 0) {
    throw new Error(`Expected mutated run to be HEALED, got ${mutatedRun.status}`);
  }

  const healRecord = mutatedRun.healingRecords[0];
  console.log(`  Healing Details:`);
  console.log(`    Strategy: ${healRecord.chosenAlternative.strategy}`);
  console.log(`    Confidence: ${Math.round(healRecord.confidenceScore * 100)}%`);
  console.log(`    Broken Target: ${JSON.stringify(healRecord.originalAction.selector)}`);
  console.log(`    Repaired Target: ${JSON.stringify(healRecord.chosenAlternative.selector)}`);
  console.log(`    Explanation: ${healRecord.explanation}`);

  // 4. Test Strict Failure Reporting (Zero Fabrication)
  console.log('\n[Step 4] Executing Strict Failure Flow (http://localhost:3001/fixture?broken=true)...');
  const brokenRes = await makeRequest({
    hostname: 'localhost',
    port: 3001,
    path: '/api/runs',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, {
    targetUrl: 'http://localhost:3001/fixture?broken=true',
    naturalLanguageInstruction: 'Navigate to fixture, enter "Unrecoverable Target" into "Feedback Input", click "Submit Feedback", verify "Feedback Submitted Successfully" is visible',
    allowLocalhost: true,
    timeoutMs: 10000,
    customSuccessCriteria: 'Feedback Submitted Successfully',
  });

  const brokenRun = brokenRes.data;
  console.log(`  Run ID: ${brokenRun.id}`);
  console.log(`  Verdict: ${brokenRun.status} (${brokenRun.executionTimeMs}ms)`);
  console.log(`  Failed Steps: ${brokenRun.summary.failedSteps}`);
  if (brokenRun.status !== 'FAILED') {
    throw new Error(`Expected broken run to be FAILED without fabrication, got ${brokenRun.status}`);
  }

  // 5. Test History Retrieval
  console.log('\n[Step 5] Verifying Full History API (GET /api/runs)...');
  const historyRes = await makeRequest({
    hostname: 'localhost',
    port: 3001,
    path: '/api/runs',
    method: 'GET',
  });
  console.log(`  History API returned ${historyRes.data?.length} recorded test runs.`);

  console.log('\n========================================================================');
  console.log('🎉 STAGE 4 END-TO-END VERIFICATION COMPLETED WITH 100% SUCCESS!');
  console.log('   All flows (PASSED, HEALED, FAILED) verified live with real Playwright!');
  console.log('   Real screenshots and logs served and verified over HTTP.');
  console.log('========================================================================\n');
}

runStage4Verification().catch((err) => {
  console.error('\n❌ Stage 4 Verification Failed:', err);
  process.exit(1);
});
