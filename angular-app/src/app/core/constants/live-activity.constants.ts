import type { ActivityType } from '../interface/activity-type.type';
import type { ActivityGpsFilter } from '../interface/activity-gps-filter.interface';

export const LIVE_ACTIVITY_STORAGE_KEY = 'my-hike-live-activity-v1';
export const LIVE_ACTIVITY_VERSION = 2 as const;
export const LIVE_ACTIVITY_STALE_TIMEOUT_MS = 45_000;
export const LIVE_ACTIVITY_WATCHDOG_INTERVAL_MS = 5_000;
export const LIVE_ACTIVITY_RETRY_DELAYS_MS = [1_000, 2_000, 5_000, 10_000, 20_000] as const;
export const LIVE_ACTIVITY_PERSISTENCE_FLUSH_MS = 5_000;
export const LIVE_ACTIVITY_MAX_PENDING_SAMPLES = 250;
export const LIVE_ACTIVITY_MAX_ACCEPTED_SAMPLES = 20_000;
export const LIVE_ACTIVITY_MAX_DRIFT_THRESHOLD_METRES = 12;
export const LIVE_ACTIVITY_MAX_PLAUSIBLE_SPEED_METRES_PER_SECOND = 70;
export const ACTIVITY_GPS_FILTERS: Readonly<Record<ActivityType, ActivityGpsFilter>> = {
  hiking: {
    maximumAccuracyMetres: 40,
    maximumSpeedMetresPerSecond: LIVE_ACTIVITY_MAX_PLAUSIBLE_SPEED_METRES_PER_SECOND,
    minimumMovementMetres: 4,
  },
  fitness: {
    maximumAccuracyMetres: 20,
    maximumSpeedMetresPerSecond: LIVE_ACTIVITY_MAX_PLAUSIBLE_SPEED_METRES_PER_SECOND,
    minimumMovementMetres: 6,
  },
  cycling: {
    maximumAccuracyMetres: 30,
    maximumSpeedMetresPerSecond: LIVE_ACTIVITY_MAX_PLAUSIBLE_SPEED_METRES_PER_SECOND,
    minimumMovementMetres: 5,
  },
  tennis: {
    maximumAccuracyMetres: 20,
    maximumSpeedMetresPerSecond: LIVE_ACTIVITY_MAX_PLAUSIBLE_SPEED_METRES_PER_SECOND,
    minimumMovementMetres: 6,
  },
  badminton: {
    maximumAccuracyMetres: 20,
    maximumSpeedMetresPerSecond: LIVE_ACTIVITY_MAX_PLAUSIBLE_SPEED_METRES_PER_SECOND,
    minimumMovementMetres: 6,
  },
  table_tennis: {
    maximumAccuracyMetres: 20,
    maximumSpeedMetresPerSecond: LIVE_ACTIVITY_MAX_PLAUSIBLE_SPEED_METRES_PER_SECOND,
    minimumMovementMetres: 6,
  },
  construction: {
    maximumAccuracyMetres: 30,
    maximumSpeedMetresPerSecond: LIVE_ACTIVITY_MAX_PLAUSIBLE_SPEED_METRES_PER_SECOND,
    minimumMovementMetres: 5,
  },
  housework: {
    maximumAccuracyMetres: 30,
    maximumSpeedMetresPerSecond: LIVE_ACTIVITY_MAX_PLAUSIBLE_SPEED_METRES_PER_SECOND,
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
