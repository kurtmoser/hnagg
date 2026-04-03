import { Controller, Get, Param, ParseIntPipe, Res } from '@nestjs/common';
import type { Response } from 'express';
import { StoriesService } from '../stories/stories.service';
import {
  MIN_DATE,
  DOMAIN,
  MAX_PAGES,
  todayIso,
  formatDate,
  timeAgo,
  extractDomain,
  computeDateBarLinks,
  computePageLinks,
  buildJsonLd,
} from './pages.helpers';

@Controller()
export class PagesController {
  constructor(private readonly storiesService: StoriesService) {}

  @Get()
  redirectToToday(@Res() res: Response) {
    res.redirect(302, `/date/${todayIso()}`);
  }

  @Get('date/:date')
  async datePage(
    @Param('date') date: string,
    @Res() res: Response,
  ) {
    return this.renderPage(date, 1, res);
  }

  @Get('date/:date/:page')
  async datePageWithPage(
    @Param('date') date: string,
    @Param('page', ParseIntPipe) page: number,
    @Res() res: Response,
  ) {
    return this.renderPage(date, page, res);
  }

  private async renderPage(date: string, page: number, res: Response) {
    const today = todayIso();

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.redirect(302, '/');
    }

    // Validate date range
    if (date < MIN_DATE || date > today) {
      return res.redirect(302, '/');
    }

    // Validate page
    if (page < 1 || page > MAX_PAGES || isNaN(page)) {
      return res.redirect(302, `/date/${date}`);
    }

    // Compute date range for query
    const fromDate = date;
    const toDay = new Date(`${date}T00:00:00Z`);
    toDay.setUTCDate(toDay.getUTCDate() + 1);
    const toDate = toDay.toISOString().slice(0, 10);

    // Fetch stories
    const result = await this.storiesService.findPaginated(
      page,
      30,
      fromDate,
      toDate,
    );

    const limit = result.meta.limit;

    // Map stories for template
    const stories = result.data.map((story, index) => {
      const storyUrl =
        story.url || `https://news.ycombinator.com/item?id=${story.id}`;
      return {
        id: story.id,
        title: story.title ?? '(untitled)',
        url: story.url,
        storyUrl,
        domain: extractDomain(storyUrl),
        score: story.score ?? 0,
        by: story.by,
        timeAgo: timeAgo(story.time),
        descendants: story.descendants ?? 0,
        rank: (page - 1) * limit + index + 1,
        imagePath: story.metadata?.local_image_path || null,
      };
    });

    // Compute template data
    const dateBar = computeDateBarLinks(date, today);
    const totalPages = Math.min(result.meta.totalPages, MAX_PAGES);
    const pageLinks = computePageLinks(date, page, result.meta.totalPages);
    const heading = `Top Hacker News Stories – ${formatDate(date)}`;
    const metaDescription = `Top ranked Hacker News stories for ${formatDate(date)}.`;
    const canonicalUrl = `${DOMAIN}/date/${date}`;
    const jsonLd = buildJsonLd(date, stories);

    res.render('home', {
      pageTitle: heading,
      metaDescription,
      canonicalUrl,
      jsonLd,
      heading,
      date,
      today,
      minDate: MIN_DATE,
      dateBar,
      stories,
      showPagination: totalPages > 1,
      pageLinks,
    });
  }
}
