import {
  ArchiveDay,
  ArchiveMonth,
  buildArchiveCalendar,
  buildPageTitle,
} from './pages.helpers';

describe('buildArchiveCalendar', () => {
  const titles = new Map<string, string | null>([
    ['2026-03-01', 'First story'],
    ['2026-03-02', null],
    ['2026-04-30', 'End of April'],
    ['2026-05-02', 'May story'],
  ]);
  const today = '2026-05-02'; // Saturday
  const months = buildArchiveCalendar(titles, today);
  const byLabel = (label: string): ArchiveMonth =>
    months.find((m) => m.label === label)!;
  const findDay = (m: ArchiveMonth, day: number): ArchiveDay =>
    m.weeks.flatMap((w) => w.days).find((d) => d?.day === day)!;

  it('lists months newest first down to March 2026', () => {
    expect(months.map((m) => m.label)).toEqual([
      'May 2026',
      'April 2026',
      'March 2026',
    ]);
    expect(months[0].href).toBe('/month/2026-05');
  });

  it('lays out the first week of March 2026 starting on Sunday', () => {
    const march = byLabel('March 2026');
    expect(march.weeks).toHaveLength(5);
    expect(march.weeks[0].href).toBe('/week/2026-03-01');
    expect(march.weeks[0].label).toBe('Week of Mar 1-7, 2026');
    expect(march.weeks[0].days.map((d) => d?.day)).toEqual([
      1, 2, 3, 4, 5, 6, 7,
    ]);
  });

  it('links days with stories and carries the top title', () => {
    const day = findDay(byLabel('March 2026'), 1);
    expect(day.href).toBe('/date/2026-03-01');
    expect(day.title).toBe('First story');
    expect(day.ariaLabel).toBe('March 1, 2026: First story');
  });

  it('links a day with stories but an untitled top story', () => {
    const day = findDay(byLabel('March 2026'), 2);
    expect(day.href).toBe('/date/2026-03-02');
    expect(day.title).toBeNull();
    expect(day.ariaLabel).toBe('March 2, 2026');
  });

  it('does not link days without stories', () => {
    expect(findDay(byLabel('March 2026'), 3).href).toBeNull();
    expect(findDay(byLabel('May 2026'), 31).href).toBeNull();
  });

  it('leaves days outside the month empty', () => {
    const may = byLabel('May 2026');
    // May 1, 2026 is a Friday: Sun..Thu belong to April.
    expect(may.weeks[0].days.slice(0, 5)).toEqual([
      null,
      null,
      null,
      null,
      null,
    ]);
    expect(may.weeks[0].days[5]?.day).toBe(1);
  });

  it('shows a week spanning two months in both', () => {
    const april = byLabel('April 2026');
    expect(april.weeks[april.weeks.length - 1].href).toBe('/week/2026-04-26');
    expect(byLabel('May 2026').weeks[0].href).toBe('/week/2026-04-26');
    expect(findDay(byLabel('April 2026'), 30).href).toBe('/date/2026-04-30');
  });

  it('flags today', () => {
    const day = findDay(byLabel('May 2026'), 2);
    expect(day.isToday).toBe(true);
    expect(day.href).toBe('/date/2026-05-02');
  });

  it('does not link future weeks', () => {
    const may = byLabel('May 2026');
    expect(may.weeks[0].href).toBe('/week/2026-04-26');
    expect(may.weeks.slice(1).every((w) => w.href === null)).toBe(true);
  });

  it('does not link future days even if data exists for them', () => {
    const future = buildArchiveCalendar(
      new Map([['2026-05-03', 'Tomorrow']]),
      today,
    );
    expect(findDay(future[0], 3).href).toBeNull();
  });
});

describe('buildPageTitle', () => {
  it('leads a day title with the top story', () => {
    expect(
      buildPageTitle(
        'Nvidia Reinstates Jensen Huang as CEO',
        '2026-11-23',
        'day',
      ),
    ).toBe(
      'Nvidia Reinstates Jensen Huang as CEO and more on Hacker News, Nov 23, 2026',
    );
  });

  it('uses the week range within one month', () => {
    expect(buildPageTitle('Headline', '2026-11-22', 'week')).toBe(
      'Headline and more on Hacker News, Nov 22-28, 2026',
    );
  });

  it('uses the week range across months', () => {
    expect(buildPageTitle('Headline', '2026-11-29', 'week')).toBe(
      'Headline and more on Hacker News, Nov 29 - Dec 5, 2026',
    );
  });

  it('uses the month name for months', () => {
    expect(buildPageTitle('Headline', '2026-11', 'month')).toBe(
      'Headline and more on Hacker News, November 2026',
    );
  });

  it('keeps special characters as-is (escaped by the template)', () => {
    expect(buildPageTitle('AT&T <b>down</b>', '2026-11-23', 'day')).toBe(
      'AT&T <b>down</b> and more on Hacker News, Nov 23, 2026',
    );
  });

  it.each([null, undefined, '', '   '])(
    'falls back to the generic title when the top title is %p',
    (title) => {
      expect(buildPageTitle(title, '2026-11-23', 'day')).toBe(
        'Top Hacker News Stories - November 23, 2026',
      );
    },
  );
});
