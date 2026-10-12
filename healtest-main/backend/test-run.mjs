// Quick E2E verification script
const intent = {
  targetUrl: 'http://localhost:3001/fixture',
  naturalLanguageInstruction: 'Navigate to fixture, enter "HealTest Demo" into "Feedback Input", click "Submit Feedback", verify "Feedback Submitted Successfully" is visible',
  allowLocalhost: true,
  timeoutMs: 15000,
  maxRetries: 2,
  customSuccessCriteria: 'Feedback Submitted Successfully'
};

console.log('[TEST] Starting baseline E2E test...');
const res = await fetch('http://localhost:3001/api/runs', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(intent)
});

const data = await res.json();
console.log('STATUS:', data.status);
console.log('Steps:');
data.steps?.forEach(s => console.log(`  Step ${s.order} [${s.status}]: ${s.description?.slice(0,70)}`));
console.log('Summary:', JSON.stringify(data.summary));
console.log('Last logs:');
data.logs?.slice(-5).forEach(l => console.log(`  [${l.level}] ${l.message?.slice(0,100)}`));
