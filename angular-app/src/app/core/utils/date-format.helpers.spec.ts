import { describe, expect, it } from 'vitest';
import { applicationLocale, formatDatePart, monthParts, toMonthKey } from './date-format.helpers';

describe('date format helpers', () => {
  it('maps application languages to Intl locales', () => {
    expect(applicationLocale('si')).toBe('sl');
    expect(applicationLocale('en')).toBe('en');
  });

  it('creates and parses month keys', () => {
    expect(toMonthKey(2026, 0)).toBe('2026-01');
    expect(toMonthKey(2026, 11)).toBe('2026-12');
    expect(monthParts('2026-09')).toEqual({ year: 2026, monthIndex: 8 });
  });

  it('formats an individual date part', () => {
    expect(formatDatePart('2026-09-07', 'day', 'en')).toBe('7');
    expect(formatDatePart('2026-09-07', 'year', 'si')).toBe('2026');
  });
});
