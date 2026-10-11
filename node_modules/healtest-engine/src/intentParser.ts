import type { TestIntent, TestStep, ActionType, ActionSelector, InspectedElement } from '../../shared/types';

/**
 * Strips UI element descriptor suffixes from natural language phrases.
 * E.g., "Add to Cart button" -> cleanName: "Add to Cart", inferredRole: "button"
 * "Username input" -> cleanName: "Username", inferredRole: "textbox"
 * "Sign in link" -> cleanName: "Sign in", inferredRole: "link"
 */
export function stripDescriptorSuffix(text: string): { cleanName: string; inferredRole?: string } {
  let trimmed = text.trim();

  // If text is purely the descriptor itself, retain it to avoid an empty string
  if (/^(?:button|btn|link|input|field|textbox|checkbox|dropdown|select|icon|tab)$/i.test(trimmed)) {
    return { cleanName: trimmed };
  }

  // Strip leading articles
  trimmed = trimmed.replace(/^(?:the|a|an)\s+/gi, '').trim();

  // Check common UI descriptor suffixes
  if (/\s+(?:button|btn)$/i.test(trimmed)) {
    return {
      cleanName: trimmed.replace(/\s+(?:button|btn)$/i, '').trim(),
      inferredRole: 'button',
    };
  }
  if (/\s+(?:link)$/i.test(trimmed)) {
    return {
      cleanName: trimmed.replace(/\s+(?:link)$/i, '').trim(),
      inferredRole: 'link',
    };
  }
  if (/\s+(?:field|input|box|textbox)$/i.test(trimmed)) {
    return {
      cleanName: trimmed.replace(/\s+(?:field|input|box|textbox)$/i, '').trim(),
      inferredRole: 'textbox',
    };
  }
  if (/\s+(?:dropdown|select|picker|menu)$/i.test(trimmed)) {
    return {
      cleanName: trimmed.replace(/\s+(?:dropdown|select|picker|menu)$/i, '').trim(),
      inferredRole: 'combobox',
    };
  }
  if (/\s+(?:checkbox|check)$/i.test(trimmed)) {
    return {
      cleanName: trimmed.replace(/\s+(?:checkbox|check)$/i, '').trim(),
      inferredRole: 'checkbox',
    };
  }
  if (/\s+(?:tab)$/i.test(trimmed)) {
    return {
      cleanName: trimmed.replace(/\s+(?:tab)$/i, '').trim(),
      inferredRole: 'tab',
    };
  }

  return { cleanName: trimmed };
}

/**
 * Detects whether a string is an anaphoric pronoun or generic element reference.
 */
export function isPronoun(text: string): boolean {
  return /^(?:it|them|this|that|itself|the\s+same|element|the\s+element|button|the\s+button|link|the\s+link)$/i.test(text.trim());
}

/**
 * Converts natural-language intent strings into structured, verifiable atomic test actions.
 * Correctly strips descriptor phrases and resolves anaphoric pronouns and state assertions.
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
  let lastTarget: string | undefined = undefined;

  for (const clause of clauses) {
    const lower = clause.toLowerCase();

    // Skip redundant navigation mentions or handle secondary navigations
    if (/^(?:open|navigate|go to|visit)\b/i.test(clause)) {
      if (order === 2 && steps.length === 1) {
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
        lastTarget = parsedFill.field;
        continue;
      }
    }

    // 2. Click / Press
    if (/^(?:click|press|select|tap)\b/i.test(clause) || lower.includes('click on') || lower.includes('click the')) {
      const parsedClick = parseClickClause(clause, lastTarget);
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
        lastTarget = parsedClick.targetName;
        continue;
      }
    }

    // 3. Assert / Verify / Check
    if (/^(?:verify|assert|check|confirm|ensure|see)\b/i.test(clause) || 
        lower.includes('is visible') || lower.includes('is enabled') || lower.includes('is disabled') || lower.includes('appears')) {
      const parsedAssert = parseAssertClause(clause, lastTarget);
      if (parsedAssert) {
        const desc = parsedAssert.type === 'assert_enabled'
          ? `Verify that "${parsedAssert.targetName}" is enabled`
          : parsedAssert.type === 'assert_disabled'
          ? `Verify that "${parsedAssert.targetName}" is disabled`
          : `Verify that "${parsedAssert.expectedText || parsedAssert.targetName}" is visible`;

        steps.push({
          id: `${runPrefix}-${order}`,
          order: order++,
          type: parsedAssert.type,
          description: desc,
          selector: parsedAssert.selector,
          value: parsedAssert.expectedText || parsedAssert.targetName,
          status: 'pending',
          durationMs: 0,
        });
        lastTarget = parsedAssert.targetName;
        continue;
      }
    }

    // Fallback: Generic Action Element if explicit target is provided
    const quotedTarget = extractQuoted(clause);
    const cleanedTarget = cleanTargetText(clause);
    const rawTarget = quotedTarget || cleanedTarget;

    // Never generate fallback assertions for pronouns or state words like "enabled", "it", etc.
    if (rawTarget && rawTarget.length > 2 && !isPronoun(rawTarget) && !/^(?:then|and|next|finally|enabled|disabled|visible|true)$/i.test(rawTarget)) {
      const { cleanName, inferredRole } = stripDescriptorSuffix(rawTarget);
      if (cleanName && !isPronoun(cleanName)) {
        steps.push({
          id: `${runPrefix}-${order}`,
          order: order++,
          type: 'assert_visible',
          description: `Verify presence of "${cleanName}"`,
          selector: { role: inferredRole, text: cleanName, name: cleanName },
          status: 'pending',
          durationMs: 0,
        });
        lastTarget = cleanName;
      }
    }
  }

  // Check if any explicit assertion step was produced
  const hasExplicitAssertion = steps.some((s) => s.type.startsWith('assert_'));

  // If user provided a custom success criteria, verify that it is actually relevant to this intent
  if (intent.customSuccessCriteria && intent.customSuccessCriteria.trim().length > 0) {
    const criteriaText = intent.customSuccessCriteria.trim();
    const isRelevant = isCriteriaRelevantToIntent(
      criteriaText,
      intent.naturalLanguageInstruction,
      intent.targetUrl
    );

    if (isRelevant) {
      const quotedCriteria = extractQuoted(criteriaText);
      const criteriaTarget = quotedCriteria ? stripDescriptorSuffix(quotedCriteria).cleanName : criteriaText;

      steps.push({
        id: `${runPrefix}-${order}`,
        order: order++,
        type: 'assert_text',
        description: `Verify ground truth outcome: "${criteriaText}"`,
        selector: { text: criteriaTarget, name: criteriaTarget },
        value: criteriaTarget,
        status: 'pending',
        durationMs: 0,
      });
    }
  }

  // If still no assertion step exists, generate an assertion directly from the user's actual goal
  const hasAssertionNow = steps.some((s) => s.type.startsWith('assert_'));
  if (!hasAssertionNow) {
    const lastAction = [...steps].reverse().find((s) => s.type === 'click' || s.type === 'fill');
    if (lastAction && lastAction.type === 'click') {
      const goalTarget = lastAction.selector.name || lastAction.selector.text || 'Target';
      steps.push({
        id: `${runPrefix}-${order}`,
        order: order++,
        type: 'assert_visible',
        description: `Verify goal outcome: "${goalTarget}" is active and displayed`,
        selector: { name: goalTarget, text: goalTarget },
        value: goalTarget,
        status: 'pending',
        durationMs: 0,
      });
    } else if (lastAction && lastAction.type === 'fill') {
      const fieldTarget = lastAction.selector.name || 'field';
      steps.push({
        id: `${runPrefix}-${order}`,
        order: order++,
        type: 'assert_visible',
        description: `Verify goal outcome: field "${fieldTarget}" contains entered value`,
        selector: lastAction.selector,
        value: lastAction.value,
        status: 'pending',
        durationMs: 0,
      });
    } else if (steps.length === 1 && steps[0].type === 'navigate') {
      // User only asked to navigate without specifying an action or goal
      steps.push({
        id: `${runPrefix}-${order}`,
        order: order++,
        type: 'assert_visible',
        description: `Verify goal outcome: page loaded and content is visible`,
        selector: { role: 'main' },
        status: 'pending',
        durationMs: 0,
      });
    }
  }

  return steps;
}

/**
 * Validates that custom success criteria is genuinely relevant to the current test intent,
 * preventing accidental injection of stale fixture strings (e.g. "Feedback Submitted Successfully").
 */
function isCriteriaRelevantToIntent(criteria: string, instruction: string, targetUrl: string): boolean {
  const critNorm = criteria.toLowerCase().trim();
  const instNorm = instruction.toLowerCase().trim();
  const urlNorm = targetUrl.toLowerCase().trim();

  if (!critNorm) return false;

  // Specific guard against unrelated feedback fixture leftovers
  if (critNorm.includes('feedback') || critNorm.includes('submit feedback')) {
    return instNorm.includes('feedback') || instNorm.includes('submit') || urlNorm.includes('fixture');
  }

  // If the criteria text itself appears in the instruction
  if (instNorm.includes(critNorm) || urlNorm.includes(critNorm)) {
    return true;
  }

  // If meaningful words from criteria appear in the instruction
  const words = critNorm.split(/\s+/).filter((w) => w.length > 3 && !['with', 'from', 'that', 'this', 'then', 'into'].includes(w));
  if (words.length > 0 && words.some((w) => instNorm.includes(w) || urlNorm.includes(w))) {
    return true;
  }

  return false;
}

function parseClickClause(clause: string, previousTarget?: string): { targetName: string; selector: ActionSelector } | null {
  const strippedPrefix = clause.replace(/^(?:click\s+on\s+the|click\s+the|click\s+on|click|press\s+on\s+the|press\s+the|press\s+on|press|tap\s+on\s+the|tap\s+the|tap\s+on|tap|select)\s+/gi, '').trim();

  const quoted = extractQuoted(strippedPrefix) || extractQuoted(clause);
  const rawTarget = quoted || strippedPrefix;

  // Strip descriptor words like "button", "link", etc.
  const { cleanName, inferredRole } = stripDescriptorSuffix(rawTarget);
  let finalTarget = cleanName;

  // If the target is an anaphoric pronoun (e.g. "it", "them", "this", "that")
  if (isPronoun(finalTarget)) {
    if (previousTarget && !isPronoun(previousTarget)) {
      finalTarget = previousTarget;
    } else {
      // Look for a known action keyword in clause
      const nounMatch = clause.match(/\b(?:cart|submit|login|search|checkout|buy|pay|menu|close|save)\b/i);
      if (nounMatch) {
        finalTarget = nounMatch[0];
      }
    }
  }

  // Never produce an invalid "it" target
  if (!finalTarget || isPronoun(finalTarget)) {
    if (previousTarget) {
      finalTarget = previousTarget;
    } else {
      return null;
    }
  }

  return {
    targetName: finalTarget,
    selector: {
      role: inferredRole || 'button',
      name: finalTarget,
      text: finalTarget,
    },
  };
}

function parseFillClause(clause: string): { field: string; value: string; selector: ActionSelector } | null {
  const quotedMatches = clause.match(/["']([^"']+)["']/g)?.map((s) => s.slice(1, -1)) || [];
  
  if (quotedMatches.length >= 2) {
    if (clause.toLowerCase().includes(' into ')) {
      const cleanField = stripDescriptorSuffix(quotedMatches[1]).cleanName;
      return {
        value: quotedMatches[0],
        field: cleanField,
        selector: { role: 'textbox', name: cleanField, placeholder: cleanField },
      };
    }
    const cleanField = stripDescriptorSuffix(quotedMatches[0]).cleanName;
    return {
      field: cleanField,
      value: quotedMatches[1],
      selector: { role: 'textbox', name: cleanField, placeholder: cleanField },
    };
  }

  if (quotedMatches.length === 1) {
    const val = quotedMatches[0];
    const fieldPart = clause.replace(/["'][^"']+["']/g, '').replace(/^(?:enter|type|fill|input|into|with|the|in)\s+/gi, '').trim();
    const cleanField = stripDescriptorSuffix(fieldPart).cleanName || 'input';
    return {
      field: cleanField,
      value: val,
      selector: { role: 'textbox', name: cleanField },
    };
  }

  const parts = clause.split(/\b(?:into|with|in)\b/i);
  if (parts.length === 2) {
    const first = parts[0].replace(/^(?:enter|type|fill|input|the)\s+/gi, '').trim();
    const second = parts[1].replace(/^(?:the|field)\s+/gi, '').trim();
    const cleanField = stripDescriptorSuffix(second).cleanName;
    return {
      field: cleanField,
      value: first,
      selector: { role: 'textbox', name: cleanField },
    };
  }

  return null;
}

function parseAssertClause(
  clause: string, 
  previousTarget?: string
): { targetName: string; type: ActionType; selector: ActionSelector; expectedText?: string } | null {
  const lower = clause.toLowerCase();

  // 1. State Assertion: ENABLED
  if (/\b(?:is\s+)?enabled\b/i.test(lower)) {
    let subject = clause
      .replace(/^(?:verify|assert|check|confirm|ensure|see)\s+(?:that\s+)?/gi, '')
      .replace(/\s+(?:is\s+)?enabled.*$/gi, '')
      .trim();

    const quoted = extractQuoted(subject);
    if (quoted) subject = quoted;
    const { cleanName, inferredRole } = stripDescriptorSuffix(subject);
    let target = cleanName;

    if (!target || isPronoun(target)) {
      target = previousTarget || 'element';
    }

    return {
      targetName: target,
      type: 'assert_enabled',
      selector: {
        role: inferredRole || 'button',
        name: target,
      },
    };
  }

  // 2. State Assertion: DISABLED
  if (/\b(?:is\s+)?disabled\b/i.test(lower)) {
    let subject = clause
      .replace(/^(?:verify|assert|check|confirm|ensure|see)\s+(?:that\s+)?/gi, '')
      .replace(/\s+(?:is\s+)?disabled.*$/gi, '')
      .trim();

    const quoted = extractQuoted(subject);
    if (quoted) subject = quoted;
    const { cleanName, inferredRole } = stripDescriptorSuffix(subject);
    let target = cleanName;

    if (!target || isPronoun(target)) {
      target = previousTarget || 'element';
    }

    return {
      targetName: target,
      type: 'assert_disabled',
      selector: {
        role: inferredRole || 'button',
        name: target,
      },
    };
  }

  // 3. State Assertion: VISIBLE
  if (/\b(?:is\s+)?(?:visible|rendered|displayed|appears)\b/i.test(lower)) {
    let subject = clause
      .replace(/^(?:verify|assert|check|confirm|ensure|see)\s+(?:that\s+)?/gi, '')
      .replace(/\s+(?:is\s+)?(?:visible|rendered|displayed|appears).*$/gi, '')
      .trim();

    const quoted = extractQuoted(subject);
    if (quoted) subject = quoted;
    const { cleanName, inferredRole } = stripDescriptorSuffix(subject);
    let target = cleanName;

    if (!target || isPronoun(target)) {
      target = previousTarget || 'element';
    }

    return {
      targetName: target,
      type: 'assert_visible',
      selector: {
        role: inferredRole,
        name: target,
        text: target,
      },
      expectedText: target,
    };
  }

  // 4. Quoted Text Verification
  const quoted = extractQuoted(clause);
  if (quoted) {
    const { cleanName, inferredRole } = stripDescriptorSuffix(quoted);
    return {
      targetName: cleanName,
      type: 'assert_text',
      selector: {
        role: inferredRole,
        text: cleanName,
        name: cleanName,
      },
      expectedText: cleanName,
    };
  }

  // 5. Unquoted Text Verification
  let rawText = clause
    .replace(/^(?:verify|assert|check|confirm|ensure|see)\s+(?:that\s+)?/gi, '')
    .trim();

  // Filter out standalone pronouns and state words
  if (/^(?:it|them|enabled|disabled|visible|true|success)$/i.test(rawText)) {
    if (previousTarget) {
      return {
        targetName: previousTarget,
        type: 'assert_visible',
        selector: { name: previousTarget, text: previousTarget },
        expectedText: previousTarget,
      };
    }
    return null;
  }

  const { cleanName } = stripDescriptorSuffix(rawText);
  return {
    targetName: cleanName,
    type: 'assert_visible',
    selector: { text: cleanName },
    expectedText: cleanName,
  };
}

function extractQuoted(str: string): string | null {
  const match = str.match(/["']([^"']+)["']/);
  return match ? match[1] : null;
}

function cleanTargetText(str: string): string {
  return str.replace(/^(?:the|a|an|that|then)\s+/gi, '').trim();
}

function isElementCompatibleWithAction(el: InspectedElement, actionType: ActionType): boolean {
  if (actionType === 'fill') {
    return (
      ['input', 'textarea', 'select'].includes(el.tagName) ||
      ['textbox', 'combobox', 'searchbox'].includes(el.role || '')
    );
  }
  if (actionType === 'click') {
    const tag = el.tagName;
    const r = el.role || '';
    if (['div', 'section', 'article', 'main', 'header', 'footer', 'body', 'ul', 'ol', 'form'].includes(tag) &&
        !['button', 'link', 'tab', 'menuitem', 'checkbox', 'radio'].includes(r)) {
      return false;
    }
    return true;
  }
  if (actionType === 'assert_enabled' || actionType === 'assert_disabled') {
    if (['div', 'section', 'article', 'main', 'header', 'footer', 'body'].includes(el.tagName) && !el.role) {
      return false;
    }
  }
  return true;
}

function calculateMatchScore(el: InspectedElement, normTarget: string, expectedRole?: string): number {
  const id = (el.id || '').toLowerCase().trim();
  const name = (el.name || '').toLowerCase().trim();
  const placeholder = (el.placeholder || '').toLowerCase().trim();
  const label = (el.label || '').toLowerCase().trim();
  const ariaLabel = (el.ariaLabel || '').toLowerCase().trim();
  const testId = ((el.attributes?.['data-testid'] || el.attributes?.['data-test']) || '').toLowerCase().trim();
  const innerText = (el.innerText || '').toLowerCase().trim();

  const roleMatches = expectedRole ? (el.role === expectedRole || el.tagName === expectedRole) : false;
  const roleBonus = roleMatches ? 15 : 0;

  // 1. Direct identifier exact match
  if (id === normTarget || name === normTarget || placeholder === normTarget || 
      label === normTarget || ariaLabel === normTarget || testId === normTarget) {
    return 100 + roleBonus;
  }

  // 2. Exact innerText match
  if (innerText === normTarget && innerText.length > 0) {
    return 85 + roleBonus;
  }

  // 3. Direct identifier contains or is contained in normTarget
  if ((id && (id.includes(normTarget) || normTarget.includes(id))) ||
      (name && (name.includes(normTarget) || normTarget.includes(name))) ||
      (placeholder && (placeholder.includes(normTarget) || normTarget.includes(placeholder))) ||
      (label && (label.includes(normTarget) || normTarget.includes(label))) ||
      (ariaLabel && (ariaLabel.includes(normTarget) || normTarget.includes(ariaLabel))) ||
      (testId && (testId.includes(normTarget) || normTarget.includes(testId)))) {
    return 65 + roleBonus;
  }

  // 4. Role matches + innerText substring (short text only)
  if (roleMatches && innerText && innerText.length < 80 && 
      (innerText.includes(normTarget) || normTarget.includes(innerText))) {
    return 50;
  }

  // 5. Fallback innerText substring for non-container elements
  if (!['div', 'main', 'section', 'body', 'form'].includes(el.tagName) &&
      innerText && innerText.length < 50 &&
      (innerText.includes(normTarget) || normTarget.includes(innerText))) {
    return 30;
  }

  return 0;
}

/**
 * Grounds abstract natural-language steps against the actual live elements discovered in the page DOM.
 * Maps descriptor phrases like "Add to Cart button" directly to the real element's name ("Add to Cart") and role ("button").
 * Resolves pronouns like "it" to the appropriate live target.
 */
export function groundStepsWithLiveDom(steps: TestStep[], liveElements: InspectedElement[]): TestStep[] {
  let lastInteractedElement: InspectedElement | null = null;

  for (const step of steps) {
    if (step.type === 'navigate') continue;

    const targetName = step.selector.name || step.selector.text || '';
    const isTargetPronoun = isPronoun(targetName);

    let matchedEl: InspectedElement | null = null;

    if (!isTargetPronoun && targetName) {
      const normTarget = targetName.toLowerCase().trim();

      // Find compatible candidate elements for this step type
      const compatibleCandidates = liveElements.filter(el => isElementCompatibleWithAction(el, step.type));
      const pool = compatibleCandidates.length > 0 ? compatibleCandidates : liveElements;

      let bestScore = 0;
      let bestCandidate: InspectedElement | null = null;

      for (const el of pool) {
        const score = calculateMatchScore(el, normTarget, step.selector.role);
        if (score > bestScore) {
          bestScore = score;
          bestCandidate = el;
        }
      }

      if (bestScore > 0) {
        matchedEl = bestCandidate;
      }
    } else if (isTargetPronoun && lastInteractedElement) {
      matchedEl = lastInteractedElement;
    }

    if (matchedEl) {
      let realName = '';
      if (step.type === 'fill') {
        realName = matchedEl.label || matchedEl.ariaLabel || matchedEl.placeholder || matchedEl.name || matchedEl.id || matchedEl.innerText || '';
        step.selector.role = matchedEl.role || 'textbox';
        if (matchedEl.placeholder) step.selector.placeholder = matchedEl.placeholder;
      } else {
        realName = matchedEl.label || matchedEl.ariaLabel || matchedEl.innerText || matchedEl.name || matchedEl.placeholder || matchedEl.id || '';
        step.selector.role = matchedEl.role || (matchedEl.tagName === 'button' ? 'button' : (matchedEl.tagName === 'a' ? 'link' : undefined));
      }

      step.selector.name = realName;
      if (matchedEl.id) step.selector.cssFallback = `#${matchedEl.id}`;
      const dataTest = matchedEl.attributes?.['data-testid'] || matchedEl.attributes?.['data-test'];
      if (dataTest) {
        step.selector.testId = dataTest;
      }

      // Update human-readable step description
      if (step.type === 'click') {
        step.description = `Click "${realName}"`;
        lastInteractedElement = matchedEl;
      } else if (step.type === 'fill') {
        step.description = `Enter "${step.value}" into field "${realName}"`;
        lastInteractedElement = matchedEl;
      } else if (step.type === 'assert_enabled') {
        step.description = `Verify that "${realName}" is enabled`;
      } else if (step.type === 'assert_disabled') {
        step.description = `Verify that "${realName}" is disabled`;
      } else if (step.type === 'assert_visible') {
        step.description = `Verify that "${realName}" is visible`;
      }
    }
  }

  return steps;
}
