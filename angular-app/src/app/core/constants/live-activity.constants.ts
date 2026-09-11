import type { ActivityType } from '../interface/activity-type.type';
import type { ActivityGpsFilter } from '../interface/activity-gps-filter.interface';

export const LIVE_ACTIVITY_STORAGE_KEY = 'my-hike-live-activity-v1';
export const LIVE_ACTIVITY_VERSION = 1 as const;
export const ACTIVITY_GPS_FILTERS: Readonly<Record<ActivityType, ActivityGpsFilter>> = {
  hiking: {
    maximumAccuracyMetres: 40,
    maximumSpeedMetresPerSecond: 6,
    minimumMovementMetres: 4,
  },
  fitness: {
    maximumAccuracyMetres: 20,
    maximumSpeedMetresPerSecond: 4,
    minimumMovementMetres: 6,
  },
};
export const LIVE_ACTIVITY_TIMER_INTERVAL_MS = 1_000;

export const LIVE_ACTIVITY_GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 10_000,
  timeout: 20_000,
};
