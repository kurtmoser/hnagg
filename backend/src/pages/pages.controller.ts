import { Controller, Get, Param, ParseIntPipe, Res } from '@nestjs/common';
import type { Response } from 'express';
import { StoriesService } from '../stories/stories.service';
import {
  MIN_DATE,
  DOMAIN,
  MAX_PAGES,
  Period,
  todayIso,
  formatDate,
  formatPeriodHeading,
  timeAgo,
  extractDomain,
  computeDateBarLinks,
  computeWeekBarLinks,
  computeMonthBarLinks,
  computePageLinks,
  buildJsonLd,
  getSundayStart,
  getMonthOf,
  periodDateRange,
} from './pages.helpers';

@Controller()
export class PagesController {
  constructor(private readonly storiesService: StoriesService) { }

  @Get()
  redirectToToday(@Res() res: Response) {
    res.redirect(302, `/date/${todayIso()}`);
  }

  // --- Day routes (existing) ---

  @Get('date/:date')
  async datePage(
    @Param('date') date: string,
    @Res() res: Response,
  ) {
    return this.renderPage('day', date, 1, res);
  }

  @Get('date/:date/:page')
  async datePageWithPage(
    @Param('date') date: string,
    @Param('page', ParseIntPipe) page: number,
    @Res() res: Response,
  ) {
    return this.renderPage('day', date, page, res);
  }

  // --- Week routes ---

  @Get('week/:date')
  async weekPage(
    @Param('date') date: string,
    @Res() res: Response,
  ) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.redirect(302, '/');
    }
    const sunday = getSundayStart(date);
    if (sunday !== date) {
      return res.redirect(302, `/week/${sunday}`);
    }
    return this.renderPage('week', date, 1, res);
  }

  @Get('week/:date/:page')
  async weekPageWithPage(
    @Param('date') date: string,
    @Param('page', ParseIntPipe) page: number,
    @Res() res: Response,
  ) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.redirect(302, '/');
    }
    const sunday = getSundayStart(date);
    if (sunday !== date) {
      return res.redirect(302, `/week/${sunday}`);
    }
    return this.renderPage('week', date, page, res);
  }

  // --- Month routes ---

  @Get('month/:month')
  async monthPage(
    @Param('month') month: string,
    @Res() res: Response,
  ) {
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.redirect(302, '/');
    }
    return this.renderPage('month', month, 1, res);
  }

  @Get('month/:month/:page')
  async monthPageWithPage(
    @Param('month') month: string,
    @Param('page', ParseIntPipe) page: number,
    @Res() res: Response,
  ) {
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.redirect(302, '/');
    }
    return this.renderPage('month', month, page, res);
  }

  // --- Shared render ---

  private async renderPage(
    period: Period,
    dateOrMonth: string,
    page: number,
    res: Response,
  ) {
    const today = todayIso();
    const minDate = MIN_DATE;
    const minMonth = MIN_DATE.slice(0, 7);

    // Validate date format
    if (period === 'day' && !/^\d{4}-\d{2}-\d{2}$/.test(dateOrMonth)) {
      return res.redirect(302, '/');
    }

    // Validate date/month range
    if (period === 'day' && (dateOrMonth < minDate || dateOrMonth > today)) {
      return res.redirect(302, '/');
    }
    if (period === 'week') {
      if (dateOrMonth < minDate) return res.redirect(302, '/');
      // Allow weeks that start before today (they may span into future, that's ok)
    }
    if (period === 'month') {
      if (dateOrMonth < minMonth || dateOrMonth > today.slice(0, 7)) {
        return res.redirect(302, '/');
      }
    }

    // Validate page
    if (page < 1 || page > MAX_PAGES || isNaN(page)) {
      const base =
        period === 'day'
          ? `/date/${dateOrMonth}`
          : period === 'week'
            ? `/week/${dateOrMonth}`
            : `/month/${dateOrMonth}`;
      return res.redirect(302, base);
    }

    // Compute date range for query
    const { fromDate, toDate } = periodDateRange(dateOrMonth, period);

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

    // Compute date bar
    const dateBar =
      period === 'week'
        ? computeWeekBarLinks(dateOrMonth, today)
        : period === 'month'
          ? computeMonthBarLinks(dateOrMonth, today)
          : computeDateBarLinks(dateOrMonth, today);

    // Base path for pagination
    const basePath =
      period === 'day'
        ? `/date/${dateOrMonth}`
        : period === 'week'
          ? `/week/${dateOrMonth}`
          : `/month/${dateOrMonth}`;

    const totalPages = Math.min(result.meta.totalPages, MAX_PAGES);
    const pageLinks = computePageLinks(basePath, page, result.meta.totalPages);

    // Heading
    const periodLabel = `Top Hacker News Stories - ${formatPeriodHeading(dateOrMonth, period)}`;
    const heading = periodLabel;
    const metaDescription = `Top ranked Hacker News stories for ${formatPeriodHeading(dateOrMonth, period)}.`;
    const canonicalUrl = `${DOMAIN}${basePath}`;

    // For day view, use the date for JSON-LD; for others use fromDate
    const jsonLdDate = period === 'day' ? dateOrMonth : fromDate;
    const jsonLd = buildJsonLd(jsonLdDate, stories);

    // Cog links: always navigate to current week/month/day
    const cogLinks = {
      day: `/date/${today}`,
      week: `/week/${getSundayStart(today)}`,
      month: `/month/${getMonthOf(today)}`,
    };

    res.render('home', {
      pageTitle: heading,
      metaDescription,
      canonicalUrl,
      jsonLd,
      heading,
      date: dateOrMonth,
      today,
      minDate: MIN_DATE,
      period,
      periodIsDay: period === 'day',
      periodIsWeek: period === 'week',
      periodIsMonth: period === 'month',
      dateBar,
      cogLinks,
      stories,
      showPagination: totalPages > 1,
      pageLinks,
    });
  }
}
