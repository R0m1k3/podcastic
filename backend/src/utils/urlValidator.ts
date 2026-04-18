import { lookup } from 'dns/promises';
import { isIP } from 'net';

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '::',
  'metadata.google.internal',
]);

const isPrivateIp = (ip: string): boolean => {
  const v = isIP(ip);
  if (v === 4) {
    const parts = ip.split('.').map(Number);
    if (parts[0] === 10) return true;
    if (parts[0] === 127) return true;
    if (parts[0] === 0) return true;
    if (parts[0] === 169 && parts[1] === 254) return true; // link-local / cloud metadata
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    return false;
  }
  if (v === 6) {
    const lower = ip.toLowerCase();
    if (lower === '::1' || lower === '::') return true;
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // unique local
    if (lower.startsWith('fe80')) return true; // link-local
    return false;
  }
  return false;
};

/**
 * Validates an external URL is safe to fetch — blocks SSRF attempts
 * to localhost, private networks, and cloud metadata endpoints.
 */
export const validateExternalUrl = async (url: string): Promise<URL> => {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('Invalid URL');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only HTTP(S) URLs are allowed');
  }

  const hostname = parsed.hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new Error('URL points to a blocked host');
  }

  if (isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      throw new Error('URL points to a private network');
    }
    return parsed;
  }

  // Resolve hostname and check all A/AAAA records
  try {
    const records = await lookup(hostname, { all: true });
    for (const r of records) {
      if (isPrivateIp(r.address)) {
        throw new Error('URL resolves to a private network');
      }
    }
  } catch (err: any) {
    if (err.message?.includes('private network') || err.message?.includes('blocked')) {
      throw err;
    }
    throw new Error('Unable to resolve URL hostname');
  }

  return parsed;
};
