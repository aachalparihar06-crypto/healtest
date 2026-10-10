import type { TestIntent, TestStep, ActionType, ActionSelector } from '../../shared/types';

/**
 * Converts natural-language intent strings into structured, verifiable atomic test actions.
 * Extracts accessible roles, names, targets, and input values.
 */
export function decomposeIntentIntoSteps(intent: TestIntent): TestStep[] {
  const steps: TestStep[] = [];
  const runPrefix = `step-${Date.now().toString(36)}`;

  // Step 1: Explicit Navigation to Target URL
  steps.push({
    id: `${runPrefix}-1`,
    order: 1,
    type: 'navigate',
    description: `Navigate to target URL (${intent.targetUrl})`,
    selector: {},
    value: intent.targetUrl,
    status: 'pending',
    durationMs: 0,
  });

  // Split natural language by delimiters: commas, semicolons, then/and clauses
  const clauses = intent.naturalLanguageInstruction
    .split(/(?:,|;|\. |\band then\b|\bthen\b|\band\b)/i)
    .map((c: string) => c.trim())
    .filter((c: string) => c.length > 2);

  let order = 2;

  for (const clause of clauses) {
    const lower = clause.toLowerCase();

    // Skip redundant navigation mentions or handle secondary navigations
    if (/^(?:open|navigate|go to|visit)\b/i.test(clause)) {
      if (order === 2 && steps.length === 1) {
        // Step 1 already covers initial navigation to the targetUrl
        continue;
      }
      const urlMatch = clause.match(/https?:\/\/[^\s]+/i) || clause.match(/\/[\w\-\/]+/i);
      if (urlMatch) {
        steps.push({
          id: `${runPrefix}-${order}`,
          order: order++,
          type: 'navigate',
          description: `Navigate to ${urlMatch[0]}`,
          selector: {},
          value: urlMatch[0],
          status: 'pending',
          durationMs: 0,
        });
      }
      continue;
    }

    // 1. Fill / Type / Enter input
    if (/^(?:enter|type|fill|input)\b/i.test(clause) || lower.includes(' into ') || lower.includes(' with ')) {
      const parsedFill = parseFillClause(clause);
      if (parsedFill) {
        steps.push({
          id: `${runPrefix}-${order}`,
          order: order++,
          type: 'fill',
          description: `Enter "${parsedFill.value}" into field "${parsedFill.field}"`,
          selector: parsedFill.selector,
          value: parsedFill.value,
          status: 'pending',
          durationMs: 0,
        });
        continue;
      }
    }

    // 2. Click / Press
    if (/^(?:click|press|select|tap)\b/i.test(clause) || lower.includes('click on') || lower.includes('click the')) {
      const parsedClick = parseClickClause(clause);
      if (parsedClick) {
        steps.push({
          id: `${runPrefix}-${order}`,
          order: order++,
          type: 'click',
          description: `Click "${parsedClick.targetName}"`,
          selector: parsedClick.selector,
          status: 'pending',
          durationMs: 0,
        });
        continue;
      }
    }

    // 3. Assert / Verify / Check
    if (/^(?:verify|assert|check|confirm|ensure|see)\b/i.test(clause) || lower.includes('is visible') || lower.includes('appears') || lower.includes('displays')) {
      const parsedAssert = parseAssertClause(clause);
      if (parsedAssert) {
        steps.push({
          id: `${runPrefix}-${order}`,
          order: order++,
          type: parsedAssert.type,
          description: `Verify that "${parsedAssert.expectedText}" is visible`,
          selector: parsedAssert.selector,
          value: parsedAssert.expectedText,
          status: 'pending',
          durationMs: 0,
        });
        continue;
      }
    }

    // Fallback: Generic Action Element if explicit target is provided
    const quotedTarget = extractQuoted(clause);
    const cleanedTarget = cleanTargetText(clause);
    if (quotedTarget || (cleanedTarget && cleanedTarget.length > 3 && !/^(?:then|and|next|finally)$/i.test(cleanedTarget))) {
      const targetText = quotedTarget || cleanedTarget;
      steps.push({
        id: `${runPrefix}-${order}`,
        order: order++,
        type: 'assert_visible',
        description: `Verify presence of "${targetText}"`,
        selector: { text: targetText },
        status: 'pending',
        durationMs: 0,
      });
    }
  }

  // If user provided an explicit custom success criteria, add as ground truth assertion
  if (intent.customSuccessCriteria && intent.customSuccessCriteria.trim().length > 0) {
    const criteriaText = intent.customSuccessCriteria.trim();
    steps.push({
      id: `${runPrefix}-${order}`,
      order: order++,
      type: 'assert_text',
      description: `Verify ground truth outcome: "${criteriaText}"`,
      selector: { text: extractQuoted(criteriaText) || criteriaText },
      value: extractQuoted(criteriaText) || criteriaText,
      status: 'pending',
      durationMs: 0,
    });
  }

  return steps;
}

function parseClickClause(clause: string): { targetName: string; selector: ActionSelector } | null {
  const quoted = extractQuoted(clause);
  const target = quoted || clause.replace(/^(?:click|press|select|tap|on|the|button)\s+/gi, '').replace(/\s+(?:button|link)$/gi, '').trim();
  if (!target) return null;

  return {
    targetName: target,
    selector: {
      role: 'button',
      name: target,
      text: target,
    },
  };
}

function parseFillClause(clause: string): { field: string; value: string; selector: ActionSelector } | null {
  // Pattern: enter "value" into "field" OR fill "field" with "value"
  const quotedMatches = clause.match(/["']([^"']+)["']/g)?.map((s) => s.slice(1, -1)) || [];
  
  if (quotedMatches.length >= 2) {
    // If syntax: enter X into Y -> value is first, field is second
    if (clause.toLowerCase().includes(' into ')) {
      return {
        value: quotedMatches[0],
        field: quotedMatches[1],
        selector: { role: 'textbox', name: quotedMatches[1], placeholder: quotedMatches[1] },
      };
    }
    // If syntax: fill Y with X -> field is first, value is second
    return {
      field: quotedMatches[0],
      value: quotedMatches[1],
      selector: { role: 'textbox', name: quotedMatches[0], placeholder: quotedMatches[0] },
    };
  }

  if (quotedMatches.length === 1) {
    const val = quotedMatches[0];
    const fieldPart = clause.replace(/["'][^"']+["']/g, '').replace(/^(?:enter|type|fill|input|into|with|the|in)\s+/gi, '').trim();
    return {
      field: fieldPart || 'input',
      value: val,
      selector: { role: 'textbox', name: fieldPart || undefined },
    };
  }

  // No quotes, split on into/with
  const parts = clause.split(/\b(?:into|with|in)\b/i);
  if (parts.length === 2) {
    const first = parts[0].replace(/^(?:enter|type|fill|input|the)\s+/gi, '').trim();
    const second = parts[1].replace(/^(?:the|field)\s+/gi, '').trim();
    return {
      field: second,
      value: first,
      selector: { role: 'textbox', name: second },
    };
  }

  return null;
}

function parseAssertClause(clause: string): { expectedText: string; type: ActionType; selector: ActionSelector } {
  const quoted = extractQuoted(clause);
  const target = quoted || clause.replace(/^(?:verify|assert|check|confirm|ensure|see|that)\s+/gi, '')
    .replace(/\s+(?:is visible|is rendered|appears|displays|shows)$/gi, '')
    .trim();

  return {
    expectedText: target,
    type: 'assert_visible',
    selector: {
      text: target,
    },
  };
}

function extractQuoted(str: string): string | null {
  const match = str.match(/["']([^"']+)["']/);
  return match ? match[1] : null;
}

function cleanTargetText(str: string): string {
  return str.replace(/^(?:the|a|an|that|then)\s+/gi, '').trim();
}
