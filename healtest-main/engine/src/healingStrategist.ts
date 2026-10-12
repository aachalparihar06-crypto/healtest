import type { 
  ActionSelector, 
  CandidateAlternative, 
  HealingRecord, 
  HealingStrategy,
  TestStep 
} from '../../shared/types';
import type { InspectedElement } from './domAnalyzer';

// Common semantic synonyms in web applications
const SYNONYM_MAP: Record<string, string[]> = {
  submit: ['send', 'post', 'save', 'apply', 'confirm', 'proceed', 'done'],
  send: ['submit', 'post', 'dispatch'],
  signin: ['login', 'log in', 'sign in', 'authenticate', 'enter'],
  login: ['signin', 'sign in', 'log in', 'authenticate', 'enter'],
  signup: ['register', 'create account', 'join', 'sign up'],
  register: ['signup', 'sign up', 'create account', 'join'],
  search: ['find', 'query', 'filter', 'explore', 'lookup'],
  cancel: ['close', 'dismiss', 'back', 'abort'],
  continue: ['next', 'proceed', 'forward'],
  delete: ['remove', 'trash', 'discard'],
  checkout: ['continue to purchase', 'proceed to checkout', 'purchase', 'place order', 'buy', 'pay', 'order', 'complete order'],
  purchase: ['checkout', 'continue to purchase', 'place order', 'buy', 'pay', 'order'],
  continuetopurchase: ['checkout', 'purchase', 'proceed to checkout', 'place order', 'buy', 'pay', 'order'],
  addtocart: ['add to basket', 'buy now', 'purchase', 'bag it', 'add item', 'basket'],
  addtobasket: ['add to cart', 'buy now', 'purchase', 'bag it', 'add item', 'cart'],
  cart: ['basket', 'bag', 'trolley'],
  basket: ['cart', 'bag', 'trolley'],
};

/**
 * Calculates normalized Levenshtein similarity between two strings (0.0 to 1.0).
 */
export function calculateStringSimilarity(a: string, b: string): number {
  const s1 = a.trim().toLowerCase();
  const s2 = b.trim().toLowerCase();
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;

  // Exact substring check
  if (s1.includes(s2) || s2.includes(s1)) {
    const minLen = Math.min(s1.length, s2.length);
    const maxLen = Math.max(s1.length, s2.length);
    return 0.8 + 0.2 * (minLen / maxLen);
  }

  // Token word similarity check
  const tokens1 = new Set(s1.split(/\s+/));
  const tokens2 = new Set(s2.split(/\s+/));
  let intersection = 0;
  tokens1.forEach((t) => {
    if (tokens2.has(t)) intersection++;
  });
  const tokenJaccard = intersection / Math.max(tokens1.size, tokens2.size);
  if (tokenJaccard > 0.5) {
    return 0.7 + 0.3 * tokenJaccard;
  }

  // Levenshtein distance
  const matrix: number[][] = [];
  for (let i = 0; i <= s1.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= s2.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const distance = matrix[s1.length][s2.length];
  const maxLen = Math.max(s1.length, s2.length);
  return Math.max(0, 1 - distance / maxLen);
}

/**
 * Checks if two words/phrases are recognized semantic synonyms.
 */
function areSynonyms(a: string, b: string): boolean {
  const normA = a.toLowerCase().replace(/[^a-z]/g, '');
  const normB = b.toLowerCase().replace(/[^a-z]/g, '');
  if (normA === normB) return true;

  const synonymsA = SYNONYM_MAP[normA] || [];
  if (synonymsA.some((s) => s.replace(/[^a-z]/g, '') === normB)) return true;

  const synonymsB = SYNONYM_MAP[normB] || [];
  if (synonymsB.some((s) => s.replace(/[^a-z]/g, '') === normA)) return true;

  return false;
}

export interface HealingEvaluationResult {
  canHeal: boolean;
  healingRecord?: HealingRecord;
  repairedSelector?: ActionSelector;
  rejectionReason?: string;
}

/**
 * Analyzes failure and discovers safe, unambiguous replacement selectors.
 */
export function evaluateSelfHealingCandidates(
  step: TestStep,
  stepIndex: number,
  failureError: string,
  inspectedElements: InspectedElement[]
): HealingEvaluationResult {
  const originalSelector = step.selector;
  const originalTargetName = originalSelector.name || originalSelector.text || originalSelector.placeholder || '';
  const expectedRole = originalSelector.role;

  const candidates: CandidateAlternative[] = [];

  for (const el of inspectedElements) {
    if (!el.isVisible || !el.isEnabled) continue;

    let score = 0;
    let strategy: HealingStrategy = 'semantic_attribute_heuristic';
    let matchReason = '';

    const elText = el.innerText || '';
    const elLabel = el.label || el.ariaLabel || '';
    const elPlaceholder = el.placeholder || '';
    const elValue = (el.attributes && el.attributes['value']) || '';
    const elEffectiveName = elLabel || elText || elPlaceholder || elValue;

    // 1. Role matching
    let roleMatches = false;
    if (expectedRole) {
      if (expectedRole === 'button') {
        roleMatches = el.role === 'button' || el.tagName === 'button' || el.tagName === 'a' || el.role === 'link' || (el.tagName === 'input' && (el.type === 'submit' || el.type === 'button'));
      } else if (expectedRole === 'textbox') {
        roleMatches = el.role === 'textbox' || (el.tagName === 'input' && el.type !== 'submit' && el.type !== 'button' && el.type !== 'reset') || el.tagName === 'textarea';
      } else {
        roleMatches = el.role === expectedRole || el.tagName === expectedRole;
      }
    } else {
      roleMatches = true;
    }
    if (roleMatches) {
      score += 0.35;
    }

    // 2. Semantic name / text comparison
    if (originalTargetName && elEffectiveName) {
      if (areSynonyms(originalTargetName, elEffectiveName)) {
        score += 0.55;
        strategy = 'role_and_name_match';
        matchReason = `Semantic synonym detected ("${originalTargetName}" → "${elEffectiveName}") with matching role.`;
      } else {
        const sim = calculateStringSimilarity(originalTargetName, elEffectiveName);
        if (sim > 0.6) {
          score += 0.50 * sim;
          strategy = elLabel ? 'aria_label_fallback' : 'text_content_fuzzy';
          matchReason = `Fuzzy text similarity match (${Math.round(sim * 100)}%) on element ${elLabel ? 'label/aria' : 'text'}.`;
        }
      }
    }

    // 3. Placeholder match for inputs
    if (originalSelector.placeholder && elPlaceholder) {
      const pSim = calculateStringSimilarity(originalSelector.placeholder, elPlaceholder);
      if (pSim > 0.7) {
        score += 0.45 * pSim;
        strategy = 'placeholder_match';
        matchReason = `Input placeholder similarity (${Math.round(pSim * 100)}%).`;
      }
    }

    // 4. Attribute heuristic
    if (el.id && originalTargetName && el.id.toLowerCase().includes(originalTargetName.toLowerCase())) {
      score += 0.15;
    }

    // Normalize score to maximum of 0.98
    const finalScore = Math.min(0.98, Number(score.toFixed(2)));

    if (finalScore >= 0.50) {
      // Synthesize resilient replacement selector
      const replacementSelector: ActionSelector = {};
      if (el.role || (el.tagName === 'button' ? 'button' : null)) {
        replacementSelector.role = el.role || (el.tagName === 'button' ? 'button' : undefined);
      }
      if (el.label) {
        replacementSelector.name = el.label;
      } else if (el.ariaLabel) {
        replacementSelector.name = el.ariaLabel;
        replacementSelector.ariaLabel = el.ariaLabel;
      } else if (el.innerText) {
        replacementSelector.name = el.innerText;
        replacementSelector.text = el.innerText;
      } else if (el.placeholder) {
        replacementSelector.placeholder = el.placeholder;
      }

      if (el.attributes && (el.attributes['data-testid'] || el.attributes['data-test'])) {
        replacementSelector.testId = el.attributes['data-testid'] || el.attributes['data-test'];
      }

      if (el.id) {
        replacementSelector.cssFallback = `#${el.id}`;
      }

      candidates.push({
        selector: replacementSelector,
        strategy,
        confidenceScore: finalScore,
        domSnippet: el.outerHtml,
        matchReason: matchReason || `Heuristic match on interactive <${el.tagName}>.`,
      });
    }
  }

  // Sort candidates by confidence score descending
  candidates.sort((a, b) => b.confidenceScore - a.confidenceScore);

  if (candidates.length === 0) {
    return {
      canHeal: false,
      rejectionReason: `No candidate elements in live DOM met the minimum confidence threshold for "${originalTargetName}".`,
    };
  }

  const topCandidate = candidates[0];

  // Ambiguity check: if top 2 candidates are virtually identical in confidence and target differs
  if (candidates.length > 1) {
    const secondCandidate = candidates[1];
    if (Math.abs(topCandidate.confidenceScore - secondCandidate.confidenceScore) < 0.05 &&
        topCandidate.confidenceScore < 0.90) {
      return {
        canHeal: false,
        rejectionReason: `Ambiguous recovery: Discovered multiple candidate elements with identical confidence (${Math.round(topCandidate.confidenceScore * 100)}%). Blocked to prevent unintended interaction.`,
      };
    }
  }

  // Enforce safety confidence threshold
  if (topCandidate.confidenceScore < 0.65) {
    return {
      canHeal: false,
      rejectionReason: `Highest candidate confidence (${Math.round(topCandidate.confidenceScore * 100)}%) is below safety threshold (65%).`,
    };
  }

  // Detect mutation change type
  let changeType: HealingRecord['detectedDomChanges']['changeType'] = 'text_renamed';
  if (topCandidate.strategy === 'aria_label_fallback') {
    changeType = 'attribute_changed';
  } else if (topCandidate.strategy === 'placeholder_match') {
    changeType = 'attribute_changed';
  }

  const explanation = `Action on [${originalSelector.role || 'element'}: "${originalTargetName}"] failed. Inspecting live DOM discovered replacement with ${Math.round(topCandidate.confidenceScore * 100)}% confidence using strategy "${topCandidate.strategy}". Recovered to: ${JSON.stringify(topCandidate.selector)}.`;

  const healingRecord: HealingRecord = {
    id: `heal-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
    stepId: step.id,
    stepIndex,
    originalAction: {
      type: step.type,
      selector: { ...originalSelector },
      value: step.value,
    },
    failureReason: failureError,
    detectedDomChanges: {
      previousExpected: `<${originalSelector.role || 'element'}>${originalTargetName}</${originalSelector.role || 'element'}>`,
      actualDetected: topCandidate.domSnippet,
      changeType,
    },
    candidatesEvaluated: candidates.slice(0, 4),
    chosenAlternative: topCandidate,
    explanation,
    confidenceScore: topCandidate.confidenceScore,
    healedAt: new Date().toISOString(),
  };

  return {
    canHeal: true,
    healingRecord,
    repairedSelector: topCandidate.selector,
  };
}
