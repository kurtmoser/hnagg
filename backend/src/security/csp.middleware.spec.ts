import type { NextFunction, Request, Response } from 'express';
import { contentSecurityPolicyMiddleware } from './csp.middleware';

describe('contentSecurityPolicyMiddleware', () => {
  const run = (path: string) => {
    const headers: Record<string, string> = {};
    const res = {
      locals: {},
      setHeader: (name: string, value: string) => {
        headers[name] = value;
      },
    } as unknown as Response;
    const next = jest.fn() as NextFunction;
    contentSecurityPolicyMiddleware({ path } as Request, res, next);
    expect(next).toHaveBeenCalled();
    return headers;
  };

  it.each(['/', '/date/2026-11-20', '/archive'])('sets CSP on %s', (path) => {
    expect(run(path)['Content-Security-Policy']).toContain(
      "default-src 'self'",
    );
  });

  it.each(['/sitemap.xml', '/robots.txt'])('skips CSP on %s', (path) => {
    const headers = run(path);
    expect(headers['Content-Security-Policy']).toBeUndefined();
    expect(headers['Cross-Origin-Resource-Policy']).toBe('same-origin');
  });
});
