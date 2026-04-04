import { Module } from '@nestjs/common';
import { SitemapController } from './sitemap.controller';
import { RobotsController } from './robots.controller';

@Module({
  controllers: [SitemapController, RobotsController],
})
export class SitemapModule {}
