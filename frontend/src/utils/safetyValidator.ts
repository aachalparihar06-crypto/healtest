import type { SafetyValidationResult } from '../types';

/**
 * Validates target URLs according to HealTest safety principles:
 * 1. Checks valid protocol (http / https only, blocks file://, javascript:, data:)
 * 2. Identifies private/localhost networks
 * 3. Enforces explicit user toggle for localhost/private network execution
 * 4. Checks for sensitive payment or destructive patterns in test instructions
 */

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0', 'local']);

export function isLocalOrPrivateNetwork(hostname: string): boolean {
  if (LOCAL_HOSTNAMES.has(hostname.toLowerCase())) return true;
  // Local subnet patterns: 192.168.x.x, 10.x.x.x, 172.16-31.x.x, *.local, *.test
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  if (hostname.endsWith('.local') || hostname.endsWith('.test') || hostname.endsWith('.internal')) return true;
  return false;
}

export function validateTargetUrl(rawUrl: string, allowLocalhost: boolean): SafetyValidationResult {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return {
      isValid: false,
      isLocal: false,
      blockedReason: 'URL cannot be empty.',
      warnings: [],
    };
  }

  // Ensure scheme is provided
  let urlObj: URL;
  try {
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    urlObj = new URL(withScheme);
  } catch {
    return {
      isValid: false,
      isLocal: false,
      blockedReason: 'Invalid URL format. Please provide a valid web URL.',
      warnings: [],
    };
  }

  // Enforce http/https
  if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
    return {
      isValid: false,
      isLocal: false,
      blockedReason: `Blocked unsafe protocol "${urlObj.protocol}". Only HTTP and HTTPS are permitted.`,
      warnings: [],
    };
  }

  const isLocal = isLocalOrPrivateNetwork(urlObj.hostname);
  const warnings: string[] = [];

  if (isLocal) {
    if (!allowLocalhost) {
      return {
        isValid: false,
        isLocal: true,
        sanitizedUrl: urlObj.toString(),
        blockedReason: 'Localhost and private-network targets are blocked by default. Enable "Allow Localhost / Dev Mode" to proceed with local demo testing.',
        warnings: ['Local target detected (Private Network/Localhost).'],
      };
    } else {
      warnings.push('Localhost mode is active: running against internal development service.');
    }
  } else {
    // Remote host
    if (urlObj.protocol === 'http:') {
      warnings.push('Target uses unencrypted HTTP. HTTPS is recommended for remote testing.');
    }
  }

  return {
    isValid: true,
    isLocal,
    sanitizedUrl: urlObj.toString(),
    warnings,
  };
}

export interface InstructionSafetyResult {
  isSafe: boolean;
  blockedReason?: string;
  detectedRisks: string[];
}

const DESTRUCTIVE_KEYWORDS = [
  'real credit card',
  'cvv',
  'pay real money',
  'live transaction',
  'stripe live',
  'paypal live checkout',
  'delete database',
  'drop table',
  'wipe data',
  'rm -rf',
];

export function validateTestInstruction(instruction: string): InstructionSafetyResult {
  const lower = instruction.toLowerCase();
  const detectedRisks: string[] = [];

  for (const keyword of DESTRUCTIVE_KEYWORDS) {
    if (lower.includes(keyword)) {
      detectedRisks.push(`Potential high-risk operation detected: "${keyword}"`);
    }
  }

  if (detectedRisks.length > 0) {
    return {
      isSafe: false,
      blockedReason: 'Instruction blocked by Safety Guardrail: Real payment processing and destructive operations are forbidden on HealTest.',
      detectedRisks,
    };
  }

  return {
    isSafe: true,
    detectedRisks: [],
  };
}
