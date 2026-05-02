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

export function contentSecurityPolicyMiddleware(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  const nonce = randomBytes(CSP_NONCE_BYTES).toString('base64');

  res.locals.cspNonce = nonce;
  res.setHeader('Content-Security-Policy', buildContentSecurityPolicy(nonce));
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

  next();
}
