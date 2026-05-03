import { Router, Request, Response } from 'express';
import https from 'https';
import http from 'http';

const router = Router();

// Block private/loopback ranges to prevent SSRF
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
  if (req.headers.range) upstream['Range'] = req.headers.range;

  const lib = parsed.protocol === 'https:' ? https : http;

  const proxyReq = lib.request(raw, { headers: upstream }, (proxyRes) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Content-Type, Accept-Ranges');

    const forward = ['content-type', 'content-length', 'content-range', 'accept-ranges'];
    for (const h of forward) {
      const v = proxyRes.headers[h];
      if (v) res.setHeader(h, v);
    }

    res.status(proxyRes.statusCode ?? 200);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', () => {
    if (!res.headersSent) res.status(502).json({ message: 'Proxy error' });
  });

  req.on('close', () => proxyReq.destroy());
  proxyReq.end();
});

export default router;
