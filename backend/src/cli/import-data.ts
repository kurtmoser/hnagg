import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  console.log('Import data...');
  await app.close();
}

bootstrap();
