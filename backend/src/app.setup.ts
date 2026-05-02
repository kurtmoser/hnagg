import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { join } from 'path';
import { contentSecurityPolicyMiddleware } from './security/csp.middleware';

export function configureApplication(app: NestExpressApplication) {
  app.disable('x-powered-by');
  app.use(contentSecurityPolicyMiddleware);
  app.use(cookieParser());
  app.useStaticAssets(join(__dirname, 'assets'), { prefix: '/assets/' });
  app.setBaseViewsDir(join(__dirname, '..', 'views'));
  app.setViewEngine('hbs');

  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
}
