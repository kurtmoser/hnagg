import { Controller, Get, Header } from '@nestjs/common';

const MIN_DATE = '2026-03-01';
const DOMAIN = 'https://hnagg.com';

@Controller('sitemap.xml')
export class SitemapController {
  @Get()
  @Header('Content-Type', 'application/xml')
  getSitemap(): string {
    const todayStr = new Date().toLocaleDateString('en-CA', {
      timeZone: 'America/New_York',
    });

    const dates: string[] = [];
    const current = new Date(`${MIN_DATE}T00:00:00Z`);
    const end = new Date(`${todayStr}T00:00:00Z`);

    while (current <= end) {
      dates.push(current.toISOString().slice(0, 10));
      current.setUTCDate(current.getUTCDate() + 1);
    }

    const urls = [
      `  <url>
    <loc>${DOMAIN}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`,
      ...dates.map((date) => {
        const isToday = date === todayStr;
        return `  <url>
    <loc>${DOMAIN}/date/${date}</loc>
    <changefreq>${isToday ? 'daily' : 'weekly'}</changefreq>
    <priority>0.8</priority>
  </url>`;
      }),
    ];

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;
  }
}
