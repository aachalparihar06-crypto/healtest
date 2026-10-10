import type { SafetyValidationResult } from '../../shared/types';

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0', 'local']);

export function isLocalOrPrivateNetwork(hostname: string): boolean {
  if (LOCAL_HOSTNAMES.has(hostname.toLowerCase())) return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  if (hostname.endsWith('.local') || hostname.endsWith('.test') || hostname.endsWith('.internal')) return true;
  return false;
}

export function validateBackendTargetUrl(rawUrl: string, allowLocalhost: boolean): SafetyValidationResult {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return {
      isValid: false,
      isLocal: false,
      blockedReason: 'Target URL cannot be empty.',
      warnings: [],
    };
  }

  let urlObj: URL;
  try {
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    urlObj = new URL(withScheme);
  } catch {
    return {
      isValid: false,
      isLocal: false,
      blockedReason: 'Invalid URL format.',
      warnings: [],
    };
  }

  if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
    return {
      isValid: false,
      isLocal: false,
      blockedReason: `Blocked protocol "${urlObj.protocol}". Only HTTP and HTTPS are permitted.`,
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
        blockedReason: 'Localhost and private-network targets require explicit authorization. Set "allowLocalhost" to true.',
        warnings: ['Local target detected (Private Network/Localhost).'],
      };
    } else {
      warnings.push('Localhost target execution authorized in local development mode.');
    }
  }

  return {
    isValid: true,
    isLocal,
    sanitizedUrl: urlObj.toString(),
    warnings,
  };
}
