import { randomBytes } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

export const CSP_NONCE_BYTES = 16;

export function buildContentSecurityPolicy(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    "style-src 'self'",
    "img-src 'self'",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "script-src-attr 'none'",
    "style-src-attr 'none'",
  ].join('; ');
}

/**
 * Non-HTML documents opened directly in a browser. A CSP on these protects
 * nothing and breaks Chrome's built-in XML viewer (it renders raw text).
 */
const CSP_EXEMPT_PATHS = new Set(['/sitemap.xml', '/robots.txt']);

export function contentSecurityPolicyMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const nonce = randomBytes(CSP_NONCE_BYTES).toString('base64');

  res.locals.cspNonce = nonce;
  if (!CSP_EXEMPT_PATHS.has(req.path)) {
    res.setHeader('Content-Security-Policy', buildContentSecurityPolicy(nonce));
  }
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

  next();
}
