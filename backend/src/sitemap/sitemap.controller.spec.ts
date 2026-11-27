import { SitemapController } from './sitemap.controller';

describe('SitemapController', () => {
  const controller = new SitemapController();

  beforeEach(() => {
    jest.useFakeTimers();
    // 17:00 UTC = 12:00 in New York, so "today" is 2026-11-27.
    jest.setSystemTime(new Date('2026-11-27T17:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const parse = () => {
    const xml = controller.getSitemap();
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    const lastmods = new Map(
      [
        ...xml.matchAll(
          /<loc>https:\/\/hnagg\.com\/date\/([\d-]+)<\/loc>\s*<lastmod>([\d-]+)<\/lastmod>/g,
        ),
      ].map((m) => [m[1], m[2]]),
    );
    return { locs, lastmods };
  };

  it('lists home and archive first', () => {
    const { locs } = parse();
    expect(locs[0]).toBe('https://hnagg.com/');
    expect(locs[1]).toBe('https://hnagg.com/archive');
  });

  it('sets lastmod to today for home and archive', () => {
    const xml = controller.getSitemap();
    for (const path of ['/', '/archive']) {
      expect(xml).toContain(
        `<loc>https://hnagg.com${path}</loc>\n    <lastmod>2026-11-27</lastmod>`,
      );
    }
  });

  it('lists every day from MIN_DATE to today, newest first', () => {
    const { locs } = parse();
    const dates = locs.slice(2);
    expect(dates).toHaveLength(272);
    expect(dates[0]).toBe('https://hnagg.com/date/2026-11-27');
    expect(dates[1]).toBe('https://hnagg.com/date/2026-11-26');
    expect(dates[dates.length - 1]).toBe('https://hnagg.com/date/2026-03-01');
  });

  it('sets lastmod to day + 1, capped at today', () => {
    const { lastmods } = parse();
    expect(lastmods.size).toBe(272);
    expect(lastmods.get('2026-11-27')).toBe('2026-11-27');
    expect(lastmods.get('2026-11-26')).toBe('2026-11-27');
    expect(lastmods.get('2026-11-25')).toBe('2026-11-26');
    expect(lastmods.get('2026-10-31')).toBe('2026-11-01');
    expect(lastmods.get('2026-03-01')).toBe('2026-03-02');
  });
});
