import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoriesModule } from './stories/stories.module';
import { ImagesModule } from './images/images.module';
import { SitemapModule } from './sitemap/sitemap.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { PagesModule } from './pages/pages.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [__dirname + '/**/*.entity.{js,ts}'],
      migrations: [__dirname + '/**/*.migration.{js,ts}'],
      migrationsRun: false,
      synchronize: false,
    }),
    StoriesModule,
    ImagesModule,
    SitemapModule,
    SchedulerModule,
    PagesModule,
  ],
})
export class AppModule {}
