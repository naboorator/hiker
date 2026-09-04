import type { ActivityDayGroup } from './activity-day-group.interface';
import type { Hike } from './hike.interface';

export interface MonthDraft {
  key: string;
  title: string;
  minutes: number;
  metres: number;
  byDay: Map<
    string,
    Omit<ActivityDayGroup, 'summary' | 'hikes'> & {
      hikes: Hike[];
    }
  >;
}
