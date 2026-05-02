import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { contentSecurityPolicyMiddleware } from './security/csp.middleware';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(contentSecurityPolicyMiddleware);
  app.use(cookieParser());
  app.useStaticAssets(join(__dirname, 'assets'), { prefix: '/assets/' });
  app.setBaseViewsDir(join(__dirname, '..', 'views'));
  app.setViewEngine('hbs');

  app.useGlobalPipes(
    new ValidationPipe({ transform: true, whitelist: true }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
