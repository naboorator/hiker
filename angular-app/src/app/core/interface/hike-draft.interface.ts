import type { ActivityType } from './activity-type.type';
import type { ActivityGpsLocation } from './activity-gps-location.interface';

export interface HikeDraft {
  activityType: ActivityType;
  name: string;
  date: string;
  minutes: number | null;
  metres: number | null;
  people: string[];
  gpsLocations?: ActivityGpsLocation[];
}
