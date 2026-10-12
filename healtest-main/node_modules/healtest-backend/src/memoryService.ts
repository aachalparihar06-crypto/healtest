import fs from 'fs';
import path from 'path';
import type { 
  TestRun, 
  HealingAnalyticsSummary, 
  ComponentHealingMetric, 
  RootCauseCategory 
} from '../../shared/types';

export class MemoryService {
  private memoryFile: string;

  constructor(artifactsDir: string) {
    this.memoryFile = path.join(artifactsDir, 'healing-memory.json');
  }

  /**
   * Calculates real observed analytics from stored test runs
   */
  public calculateAnalytics(runs: TestRun[]): HealingAnalyticsSummary {
    const totalRuns = runs.length;
    const cleanPassCount = runs.filter(r => r.status === 'PASSED').length;
    const healedCount = runs.filter(r => r.status === 'HEALED').length;
    const failedCount = runs.filter(r => r.status === 'FAILED' || r.status === 'ERROR').length;
    const inconclusiveCount = runs.filter(r => r.status === 'IDLE' || (r.status as string) === 'INCONCLUSIVE').length;

    const overallRate = totalRuns > 0 
      ? Math.round(((cleanPassCount + healedCount) / totalRuns) * 100) 
      : 100;

    // Track repeated locator failures
    const locatorFailuresMap = new Map<string, { occurrences: number; lastFailedAt: string }>();
    const componentHealMap = new Map<string, ComponentHealingMetric>();
    const rootCauseCounts = new Map<RootCauseCategory, number>();

    for (const run of runs) {
      // Root cause categories
      const cat = run.errorClassification?.rootCauseCategory || 'NONE';
      rootCauseCounts.set(cat, (rootCauseCounts.get(cat) || 0) + 1);

      // Track failed steps
      for (const step of run.steps) {
        if (step.status === 'failed' || step.status === 'error') {
          const locKey = step.selector.name || step.selector.testId || step.selector.text || step.description;
          const existing = locatorFailuresMap.get(locKey);
          if (existing) {
            existing.occurrences++;
            existing.lastFailedAt = run.completedAt || run.createdAt;
          } else {
            locatorFailuresMap.set(locKey, {
              occurrences: 1,
              lastFailedAt: run.completedAt || run.createdAt,
            });
          }
        }

        // Track healed components
        if (step.healingRecord) {
          const compName = step.healingRecord.chosenAlternative.selector.name || step.healingRecord.originalAction.selector.name || 'Action Element';
          const existing = componentHealMap.get(compName);
          if (existing) {
            existing.healCount++;
            existing.lastHealedAt = step.healingRecord.healedAt;
            if (!existing.topStrategies.includes(step.healingRecord.chosenAlternative.strategy)) {
              existing.topStrategies.push(step.healingRecord.chosenAlternative.strategy);
            }
          } else {
            componentHealMap.set(compName, {
              componentName: compName,
              healCount: 1,
              failCount: 0,
              lastHealedAt: step.healingRecord.healedAt,
              topStrategies: [step.healingRecord.chosenAlternative.strategy],
            });
          }
        }
      }
    }

    const repeatedLocatorFailures = Array.from(locatorFailuresMap.entries())
      .map(([locator, data]) => ({ locator, ...data }))
      .sort((a, b) => b.occurrences - a.occurrences)
      .slice(0, 8);

    const frequentlyHealedComponents = Array.from(componentHealMap.values())
      .sort((a, b) => b.healCount - a.healCount)
      .slice(0, 8);

    const recurringRootCauses = Array.from(rootCauseCounts.entries())
      .filter(([cat]) => cat !== 'NONE')
      .map(([category, count]) => ({
        category,
        count,
        percentage: totalRuns > 0 ? Math.round((count / totalRuns) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Suggested maintenance tests
    const suggestedMaintenanceTests: HealingAnalyticsSummary['suggestedMaintenanceTests'] = [];
    if (repeatedLocatorFailures.length > 0) {
      suggestedMaintenanceTests.push({
        testId: runs[0]?.id || 'recent-run',
        reason: `Locator "${repeatedLocatorFailures[0].locator}" failed repeatedly across ${repeatedLocatorFailures[0].occurrences} runs. Recommend updating to a stable accessible role locator.`,
        priority: 'high',
      });
    }

    if (frequentlyHealedComponents.length > 0) {
      suggestedMaintenanceTests.push({
        testId: runs.find(r => r.status === 'HEALED')?.id || 'healed-run',
        reason: `Component "${frequentlyHealedComponents[0].componentName}" was healed ${frequentlyHealedComponents[0].healCount} time(s). Recommend applying suggested permanent Playwright test patch.`,
        priority: 'medium',
      });
    }

    return {
      totalRunsExecuted: totalRuns,
      cleanPassCount,
      healedCount,
      failedCount,
      inconclusiveCount,
      overallHealingSuccessRatePercent: overallRate,
      repeatedLocatorFailures,
      frequentlyHealedComponents,
      recurringRootCauses,
      suggestedMaintenanceTests,
    };
  }

  /**
   * Persists memory summary to disk
   */
  public saveMemory(analytics: HealingAnalyticsSummary) {
    try {
      fs.writeFileSync(this.memoryFile, JSON.stringify(analytics, null, 2), 'utf-8');
    } catch (err: any) {
      console.warn('[MemoryService] Failed to save memory analytics:', err.message);
    }
  }

  public loadMemory(): HealingAnalyticsSummary | null {
    try {
      if (fs.existsSync(this.memoryFile)) {
        return JSON.parse(fs.readFileSync(this.memoryFile, 'utf-8'));
      }
    } catch (err: any) {
      console.warn('[MemoryService] Failed to load memory analytics:', err.message);
    }
    return null;
  }
}
