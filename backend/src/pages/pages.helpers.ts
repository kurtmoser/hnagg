const MIN_DATE = '2026-03-01';
const DOMAIN = 'https://hnagg.com';
const MAX_PAGES = 5;

export type Period = 'day' | 'week' | 'month';

export { MIN_DATE, DOMAIN, MAX_PAGES };

export function todayIso(): string {
  return new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/New_York',
  });
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function formatDate(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export function timeAgo(dateString: string | Date): string {
  const now = new Date();
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function extractDomain(url: string | null): string {
  if (!url) return '';
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return '';
  }
}

/** Number of color buckets defined as .mono-N classes in home.css. */
export const MONOGRAM_COLORS = 10;

/**
 * Derive a monogram letter + deterministic color class from a domain.
 * Returns a CSS class (not an inline color) because the CSP forbids inline
 * styles — see backend/src/security/csp.middleware.ts.
 */
export function monogram(domain: string): { letter: string; colorClass: string } {
  const letter = (domain.trim()[0] || '?').toUpperCase();
  let hash = 0;
  for (let i = 0; i < domain.length; i++) {
    hash = (hash * 31 + domain.charCodeAt(i)) >>> 0;
  }
  const colorClass = `mono-${hash % MONOGRAM_COLORS}`;
  return { letter, colorClass };
}

/** Return the Sunday (week start) for a given ISO date. */
export function getSundayStart(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  const day = d.getUTCDay(); // 0=Sun
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

/** Return the YYYY-MM for a given ISO date. */
export function getMonthOf(date: string): string {
  return date.slice(0, 7);
}

/** Compute from/to ISO date strings for a period. */
export function periodDateRange(
  dateOrMonth: string,
  period: Period,
): { fromDate: string; toDate: string } {
  if (period === 'week') {
    const from = dateOrMonth; // should already be a Sunday
    return { fromDate: from, toDate: addDays(from, 7) };
  }
  if (period === 'month') {
    const fromDate = `${dateOrMonth}-01`;
    const d = new Date(`${fromDate}T12:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + 1);
    const toDate = d.toISOString().slice(0, 10);
    return { fromDate, toDate };
  }
  // day
  return { fromDate: dateOrMonth, toDate: addDays(dateOrMonth, 1) };
}

/** Format heading for a period. */
export function formatPeriodHeading(
  dateOrMonth: string,
  period: Period,
): string {
  if (period === 'week') {
    const start = new Date(`${dateOrMonth}T12:00:00Z`);
    const end = new Date(start.getTime() + 6 * 86_400_000);
    const sameMonth =
      start.getUTCMonth() === end.getUTCMonth() &&
      start.getUTCFullYear() === end.getUTCFullYear();
    if (sameMonth) {
      const month = start.toLocaleDateString('en-US', {
        month: 'short',
        timeZone: 'UTC',
      });
      const year = start.getUTCFullYear();
      return `${month} ${start.getUTCDate()}-${end.getUTCDate()}, ${year}`;
    }
    const fmt = (d: Date) =>
      d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      });
    const year = end.getUTCFullYear();
    return `${fmt(start)} - ${fmt(end)}, ${year}`;
  }
  if (period === 'month') {
    const d = new Date(`${dateOrMonth}-01T12:00:00Z`);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      timeZone: 'UTC',
    });
  }
  return formatDate(dateOrMonth);
}

export interface DateLink {
  label: string;
  href: string;
  active: boolean;
}

export interface DateBarData {
  dateLinks: DateLink[];
  showNewerBtn: boolean;
  newerHref: string | null;
  showOlderBtn: boolean;
  olderHref: string | null;
}

export function computeDateBarLinks(
  selectedDate: string,
  today: string,
): DateBarData {
  // Determine week offset from today
  const todayMs = new Date(`${today}T12:00:00Z`).getTime();
  const selectedMs = new Date(`${selectedDate}T12:00:00Z`).getTime();
  const dayOffset = Math.round((selectedMs - todayMs) / 86_400_000);
  const weekOffset = dayOffset <= 0 ? Math.ceil(dayOffset / 7) : 0;

  const anchor = new Date(`${today}T12:00:00Z`);
  const links: DateLink[] = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(anchor.getTime() + (weekOffset * 7 - i) * 86_400_000);
    const iso = d.toISOString().slice(0, 10);

    let label: string;
    if (weekOffset === 0 && i === 0) {
      label = 'Today';
    } else if (weekOffset === 0 && i === 1) {
      label = 'Yesterday';
    } else {
      label = d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      });
    }

    if (iso >= MIN_DATE) {
      links.push({ label, href: `/date/${iso}`, active: iso === selectedDate });
    }
  }

  const lastDate = links.length > 0 ? links[links.length - 1].href.slice(6) : '';
  const atMinDate = lastDate === MIN_DATE;

  // Newer week: navigate to top of next week window
  let newerHref: string | null = null;
  if (weekOffset < 0) {
    const nextAnchor = new Date(
      anchor.getTime() + ((weekOffset + 1) * 7) * 86_400_000,
    );
    const nextIso = nextAnchor.toISOString().slice(0, 10);
    const dest = nextIso <= today ? nextIso : today;
    newerHref = `/date/${dest}`;
  }

  // Older week: navigate to top of previous week window
  let olderHref: string | null = null;
  if (!atMinDate) {
    const prevAnchor = new Date(
      anchor.getTime() + ((weekOffset - 1) * 7) * 86_400_000,
    );
    let olderDate = prevAnchor.toISOString().slice(0, 10);
    if (olderDate < MIN_DATE) olderDate = MIN_DATE;
    olderHref = `/date/${olderDate}`;
  }

  return {
    dateLinks: links,
    showNewerBtn: weekOffset < 0,
    newerHref,
    showOlderBtn: !atMinDate,
    olderHref,
  };
}

export function computeWeekBarLinks(
  selectedSunday: string,
  today: string,
): DateBarData {
  const COUNT = 5;
  const todaySunday = getSundayStart(today);
  const minSunday = getSundayStart(MIN_DATE);

  // Determine group offset from todaySunday (analogous to day bar's weekOffset).
  // Group 0 = the most recent COUNT weeks ending at todaySunday.
  // Group -1 = the COUNT weeks before that, etc.
  const selectedMs = new Date(`${selectedSunday}T12:00:00Z`).getTime();
  const todaySundayMs = new Date(`${todaySunday}T12:00:00Z`).getTime();
  const weeksBehind = Math.round((todaySundayMs - selectedMs) / (7 * 86_400_000));
  const groupOffset = weeksBehind >= 0 ? -Math.floor(weeksBehind / COUNT) : 0;

  const links: DateLink[] = [];
  for (let i = 0; i < COUNT; i++) {
    const sun = addDays(todaySunday, (groupOffset * COUNT - i) * 7);
    if (sun < minSunday) continue;
    if (sun > todaySunday) continue;

    const sat = addDays(sun, 6);
    const sunD = new Date(`${sun}T12:00:00Z`);
    const satD = new Date(`${sat}T12:00:00Z`);

    let label: string;
    if (groupOffset === 0 && i === 0) {
      label = 'This Week';
    } else if (groupOffset === 0 && i === 1) {
      label = 'Last Week';
    } else if (sunD.getUTCMonth() === satD.getUTCMonth()) {
      const month = sunD.toLocaleDateString('en-US', {
        month: 'short',
        timeZone: 'UTC',
      });
      label = `${month} ${sunD.getUTCDate()}-${satD.getUTCDate()}`;
    } else {
      const fmt = (d: Date) =>
        d.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          timeZone: 'UTC',
        });
      label = `${fmt(sunD)}-${fmt(satD)}`;
    }

    links.push({
      label,
      href: `/week/${sun}`,
      active: sun === selectedSunday,
    });
  }

  const oldestShown = links.length > 0 ? links[links.length - 1].href.slice(6) : minSunday;
  const atMinWeek = oldestShown <= minSunday;

  // Newer group: jump COUNT weeks forward from the newest shown
  let newerHref: string | null = null;
  if (groupOffset < 0) {
    const newestInNextGroup = addDays(todaySunday, ((groupOffset + 1) * COUNT) * 7);
    const dest = newestInNextGroup <= todaySunday ? newestInNextGroup : todaySunday;
    newerHref = `/week/${dest}`;
  }

  // Older group: jump COUNT weeks back from the oldest shown
  let olderHref: string | null = null;
  if (!atMinWeek) {
    const oldestInPrevGroup = addDays(todaySunday, ((groupOffset - 1) * COUNT) * 7);
    const dest = oldestInPrevGroup >= minSunday ? oldestInPrevGroup : minSunday;
    olderHref = `/week/${dest}`;
  }

  return {
    dateLinks: links,
    showNewerBtn: groupOffset < 0,
    newerHref,
    showOlderBtn: !atMinWeek,
    olderHref,
  };
}

function addMonthOffset(ym: string, n: number): string {
  const y = parseInt(ym.slice(0, 4), 10);
  const m = parseInt(ym.slice(5, 7), 10) - 1 + n;
  const d = new Date(Date.UTC(y, m, 1, 12));
  return d.toISOString().slice(0, 7);
}

export function computeMonthBarLinks(
  selectedMonth: string,
  today: string,
): DateBarData {
  const COUNT = 5;
  const todayMonth = today.slice(0, 7);
  const minMonth = MIN_DATE.slice(0, 7);

  // Group offset: group 0 = most recent COUNT months ending at todayMonth.
  const selYear = parseInt(selectedMonth.slice(0, 4), 10);
  const selMon = parseInt(selectedMonth.slice(5, 7), 10);
  const todYear = parseInt(todayMonth.slice(0, 4), 10);
  const todMon = parseInt(todayMonth.slice(5, 7), 10);
  const monthsBehind = (todYear - selYear) * 12 + (todMon - selMon);
  const groupOffset = monthsBehind >= 0 ? -Math.floor(monthsBehind / COUNT) : 0;

  const links: DateLink[] = [];
  for (let i = 0; i < COUNT; i++) {
    const iso = addMonthOffset(todayMonth, groupOffset * COUNT - i);
    if (iso < minMonth) continue;
    if (iso > todayMonth) continue;

    const d = new Date(`${iso}-01T12:00:00Z`);
    let label: string;
    if (groupOffset === 0 && i === 0) {
      label = 'This Month';
    } else if (groupOffset === 0 && i === 1) {
      label = 'Last Month';
    } else {
      label = d.toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      });
    }

    links.push({
      label,
      href: `/month/${iso}`,
      active: iso === selectedMonth,
    });
  }

  const oldestShown = links.length > 0 ? links[links.length - 1].href.slice(7) : minMonth;
  const atMinMonth = oldestShown <= minMonth;

  // Newer group
  let newerHref: string | null = null;
  if (groupOffset < 0) {
    const newestInNextGroup = addMonthOffset(todayMonth, (groupOffset + 1) * COUNT);
    const dest = newestInNextGroup <= todayMonth ? newestInNextGroup : todayMonth;
    newerHref = `/month/${dest}`;
  }

  // Older group
  let olderHref: string | null = null;
  if (!atMinMonth) {
    const oldestInPrevGroup = addMonthOffset(todayMonth, (groupOffset - 1) * COUNT);
    const dest = oldestInPrevGroup >= minMonth ? oldestInPrevGroup : minMonth;
    olderHref = `/month/${dest}`;
  }

  return {
    dateLinks: links,
    showNewerBtn: groupOffset < 0,
    newerHref,
    showOlderBtn: !atMinMonth,
    olderHref,
  };
}

export interface PageLink {
  number: number;
  href: string;
  active: boolean;
}

export function computePageLinks(
  basePath: string,
  currentPage: number,
  totalPages: number,
): PageLink[] {
  const capped = Math.min(totalPages, MAX_PAGES);
  const links: PageLink[] = [];
  for (let i = 1; i <= capped; i++) {
    links.push({
      number: i,
      href: i <= 1 ? basePath : `${basePath}/${i}`,
      active: i === currentPage,
    });
  }
  return links;
}

export function buildJsonLd(
  date: string,
  stories: Array<{ rank: number; title: string | null; url: string | null; id: number }>,
): string {
  const url = `${DOMAIN}/date/${date}`;
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'HNAgg',
      url: `${DOMAIN}/`,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: `Top Hacker News Stories - ${formatDate(date)}`,
      url,
      itemListElement: stories.map((story) => ({
        '@type': 'ListItem',
        position: story.rank,
        name: story.title,
        url: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: `${DOMAIN}/`,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: formatDate(date),
          item: url,
        },
      ],
    },
  ];
  return JSON.stringify(jsonLd);
}
