import type { Hike } from './hike.interface';

export interface ActivityDayGroup {
  date: string;
  day: number;
  month: string;
  hikes: readonly Hike[];
  minutes: number;
  metres: number;
  summary: string;
}
