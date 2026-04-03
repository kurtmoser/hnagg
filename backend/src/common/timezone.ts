/**
 * Converts a YYYY-MM-DD string (interpreted as an Eastern Time date)
 * to a UTC Date at midnight ET on that date.
 */
export function etMidnightAsUtc(dateStr: string): Date {
  // Try EDT (UTC-4) first, then EST (UTC-5)
  for (const offsetHours of [4, 5]) {
    const candidate = new Date(`${dateStr}T00:00:00Z`);
    candidate.setUTCHours(candidate.getUTCHours() + offsetHours);

    const etDate = candidate.toLocaleDateString('en-CA', {
      timeZone: 'America/New_York',
    });

    if (etDate === dateStr) {
      return candidate;
    }
  }

  // Fallback (should not happen for valid dates)
  return new Date(`${dateStr}T04:00:00Z`);
}

/**
 * Returns the UTC Date range [from, to) corresponding to
 * midnight-to-midnight Eastern Time for the given date.
 * Handles DST transitions (23h or 25h days) correctly.
 */
export function etDateToUtcRange(dateStr: string): {
  from: Date;
  to: Date;
} {
  const from = etMidnightAsUtc(dateStr);

  // Compute next day's date string and find its midnight independently
  const nextDay = new Date(from.getTime() + 24 * 60 * 60 * 1000);
  const nextDayStr = nextDay.toLocaleDateString('en-CA', {
    timeZone: 'America/New_York',
  });
  const to = etMidnightAsUtc(nextDayStr);

  return { from, to };
}
