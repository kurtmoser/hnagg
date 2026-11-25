import { buildPageTitle } from './pages.helpers';

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
