import type { ActivityType } from './activity-type.type';

export interface HikeDraft {
  activityType: ActivityType;
  name: string;
  date: string;
  minutes: number | null;
  metres: number | null;
  people: string[];
}
