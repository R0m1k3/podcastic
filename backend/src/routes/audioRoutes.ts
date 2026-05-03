import { Router, Request, Response } from 'express';
import https from 'https';
import http from 'http';
import { IncomingMessage } from 'http';

const router = Router();

const BLOCKED = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^::1$/,
  /^localhost$/i,
];

function isBlocked(hostname: string): boolean {
  return BLOCKED.some(r => r.test(hostname));
}

const REDIRECT_CODES = new Set([301, 302, 303, 307, 308]);

function fetchAudio(
  url: string,
  headers: Record<string, string>,
  res: Response,
  depth: number,
): void {
  if (depth > 8) {
    if (!res.headersSent) res.status(502).json({ message: 'Too many redirects' });
    return;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    if (!res.headersSent) res.status(400).json({ message: 'Invalid redirect URL' });
    return;
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    if (!res.headersSent) res.status(400).json({ message: 'Protocol not allowed' });
    return;
  }
  if (isBlocked(parsed.hostname)) {
    if (!res.headersSent) res.status(403).json({ message: 'Forbidden' });
    return;
  }

  const lib = parsed.protocol === 'https:' ? https : http;

  const proxyReq = lib.request(url, { headers }, (proxyRes: IncomingMessage) => {
    const status = proxyRes.statusCode ?? 200;

    // Follow redirects server-side so browser never sees non-CORS domains
    if (REDIRECT_CODES.has(status) && proxyRes.headers.location) {
      const next = new URL(proxyRes.headers.location, url).toString();
      proxyRes.resume(); // drain to free socket
      fetchAudio(next, headers, res, depth + 1);
      return;
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Content-Type, Accept-Ranges');

    const forward = ['content-type', 'content-length', 'content-range', 'accept-ranges'];
    for (const h of forward) {
      const v = proxyRes.headers[h];
      if (v) res.setHeader(h, v as string);
    }

    res.status(status);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', () => {
    if (!res.headersSent) res.status(502).json({ message: 'Proxy error' });
  });

  proxyReq.end();
}

router.get('/proxy', (req: Request, res: Response) => {
  const raw = req.query.url as string;
  if (!raw) { res.status(400).json({ message: 'url required' }); return; }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    res.status(400).json({ message: 'Invalid URL' }); return;
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    res.status(400).json({ message: 'Protocol not allowed' }); return;
  }
  if (isBlocked(parsed.hostname)) {
    res.status(403).json({ message: 'Forbidden' }); return;
  }

  const upstream: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (compatible; Podcastic/1.0)',
    'Accept': '*/*',
  };
  if (req.headers.range) upstream['Range'] = req.headers.range as string;

  req.on('close', () => res.destroy());

  fetchAudio(raw, upstream, res, 0);
});

export default router;
