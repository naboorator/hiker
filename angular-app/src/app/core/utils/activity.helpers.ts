import type { HikeDraft } from '../interface/hike-draft.interface';
import type { Hike } from '../interface/hike.interface';

export function toHikeDraft(hike: Hike): HikeDraft {
  return {
    activityType: hike.activityType,
    name: hike.name,
    date: hike.date,
    minutes: hike.minutes,
    metres: hike.metres,
    people: hike.people,
  };
}
