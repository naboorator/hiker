import { describe, expect, it } from 'vitest';
import { mergeUniqueLocations } from './live-activity-location.helpers';

describe('mergeUniqueLocations', () => {
  it('preserves route order while removing a duplicated persisted sample', () => {
    const first = {
      latitude: 46.05,
      longitude: 14.5,
      accuracy: 10,
      recordedAt: '2026-09-10T10:00:00Z',
      segment: 0,
    };
    const second = { ...first, longitude: 14.51, recordedAt: '2026-09-10T10:00:05Z' };
    expect(mergeUniqueLocations([first], [first, second])).toEqual([first, second]);
  });
});
