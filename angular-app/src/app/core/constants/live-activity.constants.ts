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
  cycling: { maximumAccuracyMetres: 30, maximumSpeedMetresPerSecond: 20, minimumMovementMetres: 5 },
  tennis: { maximumAccuracyMetres: 20, maximumSpeedMetresPerSecond: 8, minimumMovementMetres: 6 },
  badminton: {
    maximumAccuracyMetres: 20,
    maximumSpeedMetresPerSecond: 8,
    minimumMovementMetres: 6,
  },
  table_tennis: {
    maximumAccuracyMetres: 20,
    maximumSpeedMetresPerSecond: 5,
    minimumMovementMetres: 6,
  },
  construction: {
    maximumAccuracyMetres: 30,
    maximumSpeedMetresPerSecond: 5,
    minimumMovementMetres: 5,
  },
  housework: {
    maximumAccuracyMetres: 30,
    maximumSpeedMetresPerSecond: 5,
    minimumMovementMetres: 5,
  },
};
export const LIVE_ACTIVITY_TIMER_INTERVAL_MS = 1_000;

export const LIVE_ACTIVITY_GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 10_000,
  timeout: 20_000,
};

export const LIVE_ACTIVITY_INITIAL_GEOLOCATION_OPTIONS: PositionOptions = {
  ...LIVE_ACTIVITY_GEOLOCATION_OPTIONS,
  maximumAge: 0,
};
