import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import hbs from 'hbs';
import { join } from 'path';
import { contentSecurityPolicyMiddleware } from './security/csp.middleware';

function computeAssetVersion(assetsDir: string): string {
  const hash = createHash('sha1');
  for (const file of ['home.css', 'home.js']) {
    try {
      hash.update(readFileSync(join(assetsDir, file)));
    } catch {
      // Asset missing: leave it out of the hash.
    }
  }
  return hash.digest('hex').slice(0, 10);
}

export function configureApplication(app: NestExpressApplication) {
  app.disable('x-powered-by');
  app.use(contentSecurityPolicyMiddleware);
  app.use(cookieParser());
  const assetsDir = join(__dirname, 'assets');
  app.useStaticAssets(assetsDir, { prefix: '/assets/' });
  app.getHttpAdapter().getInstance().locals.assetVersion =
    computeAssetVersion(assetsDir);
  app.setBaseViewsDir(join(__dirname, '..', 'views'));
  hbs.registerPartials(join(__dirname, '..', 'views', 'partials'));
  app.setViewEngine('hbs');

  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
}
