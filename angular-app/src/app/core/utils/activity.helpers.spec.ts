import { describe, expect, it } from 'vitest';
import type { Hike } from '../interface/hike.interface';
import { toHikeDraft } from './activity.helpers';

describe('activity helpers', () => {
  it('removes persisted and reaction fields from an editable activity draft', () => {
    const activity: Hike = {
      id: 'activity-id',
      activityType: 'hiking',
      name: 'Triglav',
      date: '2026-09-07',
      minutes: 120,
      metres: 2200,
      people: ['Zoran'],
      createdAt: 1,
      likes: 3,
      likedBy: ['Ana'],
      slaps: 1,
      slappedBy: ['Miha'],
    };

    expect(toHikeDraft(activity)).toEqual({
      activityType: 'hiking',
      name: 'Triglav',
      date: '2026-09-07',
      minutes: 120,
      metres: 2200,
      people: ['Zoran'],
    });
  });
});
