import type { LiveActivityLocation } from './live-activity-location.interface';

export interface StoredLiveActivityLocation extends LiveActivityLocation {
  id: string;
  activityId: string;
  sequence: number;
}
