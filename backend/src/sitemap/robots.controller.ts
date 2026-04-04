import { Controller, Get, Header } from '@nestjs/common';

const DOMAIN = 'https://hnagg.com';

@Controller('robots.txt')
export class RobotsController {
  @Get()
  @Header('Content-Type', 'text/plain')
  getRobots(): string {
    return `User-agent: *\nAllow: /\n\nSitemap: ${DOMAIN}/sitemap.xml\n`;
  }
}
