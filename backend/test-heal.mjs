// Self-Healing E2E test - button text mutated from "Submit Feedback" to "Send Feedback"
const intent = {
  targetUrl: 'http://localhost:3001/fixture?mutated=true',
  naturalLanguageInstruction: 'Navigate to fixture, enter "HealTest User" into "Feedback Input", click "Submit Feedback", verify "Feedback Submitted Successfully" is visible',
  allowLocalhost: true,
  timeoutMs: 15000,
  maxRetries: 2,
  customSuccessCriteria: 'Feedback Submitted Successfully'
};

console.log('[TEST] Starting self-healing test (mutated UI)...');
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
console.log('Healing Records:', data.healingRecords?.length || 0);
data.healingRecords?.forEach(h => {
  console.log('  Healing:', h.explanation?.slice(0, 120));
  console.log('  Strategy:', h.chosenAlternative?.strategy, 'Confidence:', h.confidenceScore);
});
console.log('Key logs:');
data.logs?.filter(l => l.level === 'heal' || l.level === 'error').forEach(l => console.log(`  [${l.level}] ${l.message?.slice(0,120)}`));
