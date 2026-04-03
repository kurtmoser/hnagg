const MIN_DATE = '2026-03-01';
const DOMAIN = 'https://hnagg.com';
const MAX_PAGES = 5;

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

export interface DateLink {
  label: string;
  date: string;
  active: boolean;
}

export interface DateBarData {
  dateLinks: DateLink[];
  showNewerWeekBtn: boolean;
  newerWeekDate: string | null;
  showOlderWeekBtn: boolean;
  olderWeekDate: string | null;
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
      links.push({ label, date: iso, active: iso === selectedDate });
    }
  }

  const atMinDate = links.length > 0 && links[links.length - 1].date === MIN_DATE;

  // Newer week: navigate to top of next week window
  let newerWeekDate: string | null = null;
  if (weekOffset < 0) {
    const nextAnchor = new Date(
      anchor.getTime() + ((weekOffset + 1) * 7) * 86_400_000,
    );
    const nextIso = nextAnchor.toISOString().slice(0, 10);
    newerWeekDate = nextIso <= today ? nextIso : today;
  }

  // Older week: navigate to top of previous week window
  let olderWeekDate: string | null = null;
  if (!atMinDate) {
    const prevAnchor = new Date(
      anchor.getTime() + ((weekOffset - 1) * 7) * 86_400_000,
    );
    olderWeekDate = prevAnchor.toISOString().slice(0, 10);
    if (olderWeekDate < MIN_DATE) olderWeekDate = MIN_DATE;
  }

  return {
    dateLinks: links,
    showNewerWeekBtn: weekOffset < 0,
    newerWeekDate,
    showOlderWeekBtn: !atMinDate,
    olderWeekDate,
  };
}

export interface PageLink {
  number: number;
  href: string;
  active: boolean;
}

export function computePageLinks(
  date: string,
  currentPage: number,
  totalPages: number,
): PageLink[] {
  const capped = Math.min(totalPages, MAX_PAGES);
  const links: PageLink[] = [];
  for (let i = 1; i <= capped; i++) {
    links.push({
      number: i,
      href: i <= 1 ? `/date/${date}` : `/date/${date}/${i}`,
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
      name: 'Hacker News Aggregator',
      url: `${DOMAIN}/`,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: `Top Hacker News Stories – ${formatDate(date)}`,
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
