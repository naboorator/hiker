import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Hike } from '../../core/interface/hike.interface';
import { groupCurrentMonthActivities, randomItem } from './home.helpers';

describe('home helpers', () => {
  afterEach(() => vi.restoreAllMocks());

  it('selects an item using the random index', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.6);
    expect(randomItem(['first', 'second', 'third'])).toBe('second');
    expect(randomItem([])).toBeUndefined();
  });

  it('groups and totals only current-month activities', () => {
    const month = new Date().toISOString().slice(0, 7);
    const activity = (id: string, day: string, minutes: number, metres: number): Hike => ({
      id,
      activityType: 'hiking',
      name: id,
      date: `${month}-${day}`,
      minutes,
      metres,
      people: ['User'],
      createdAt: 1,
      likes: 0,
      likedBy: [],
      slaps: 0,
      slappedBy: [],
    });
    const result = groupCurrentMonthActivities(
      [activity('one', '01', 30, 1000), activity('two', '01', 45, 500)],
      'en',
    );

    expect(result.days).toHaveLength(1);
    expect(result.days[0].hikes).toHaveLength(2);
    expect(result.minutes).toBe(75);
    expect(result.metres).toBe(1500);
  });
});
