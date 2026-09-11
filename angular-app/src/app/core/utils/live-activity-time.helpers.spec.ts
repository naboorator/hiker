import { describe, expect, it } from 'vitest';
import {
  elapsedMilliseconds,
  elapsedMinutes,
  formatElapsedTime,
  localDateFromTimestamp,
} from './live-activity-time.helpers';

describe('live activity time helpers', () => {
  it('calculates elapsed time and rounds partial minutes up', () => {
    expect(elapsedMilliseconds('2026-09-10T10:00:00Z', '2026-09-10T10:01:01Z')).toBe(61_000);
    expect(elapsedMinutes('2026-09-10T10:00:00Z', '2026-09-10T10:01:01Z')).toBe(2);
  });

  it('handles invalid or backwards timestamps safely', () => {
    expect(elapsedMilliseconds('invalid', '2026-09-10T10:00:00Z')).toBe(0);
    expect(elapsedMinutes('2026-09-10T10:01:00Z', '2026-09-10T10:00:00Z')).toBe(1);
  });

  it('formats a duration as hours, minutes, and seconds', () => {
    expect(formatElapsedTime(3_661_000)).toBe('01:01:01');
  });

  it('creates a date input value in the device timezone', () => {
    expect(localDateFromTimestamp('2026-09-10T10:00:00Z')).toMatch(/^2026-09-10$/);
    expect(localDateFromTimestamp('invalid')).toBe('');
  });
});
