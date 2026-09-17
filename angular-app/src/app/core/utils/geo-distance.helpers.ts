import {
  ACTIVITY_GPS_FILTERS,
  LIVE_ACTIVITY_MAX_DRIFT_THRESHOLD_METRES,
} from '../constants/live-activity.constants';
import type { ActivityType } from '../interface/activity-type.type';
import type { LiveActivityLocation } from '../interface/live-activity-location.interface';
import type { LocationRejectionReason } from '../interface/live-activity-status.type';

const earthRadiusMetres = 6_371_000;

const radians = (degrees: number): number => (degrees * Math.PI) / 180;

export function minimumReliableMovement(
  previous: Pick<LiveActivityLocation, 'accuracy'>,
  next: Pick<LiveActivityLocation, 'accuracy'>,
  activityType: ActivityType,
): number {
  const configuredMinimum = ACTIVITY_GPS_FILTERS[activityType].minimumMovementMetres;
  const combinedGpsUncertainty = Math.hypot(previous.accuracy, next.accuracy);
  return Math.max(
    configuredMinimum,
    Math.min(combinedGpsUncertainty, LIVE_ACTIVITY_MAX_DRIFT_THRESHOLD_METRES),
  );
}

export function distanceBetweenLocations(
  first: Pick<LiveActivityLocation, 'latitude' | 'longitude'>,
  second: Pick<LiveActivityLocation, 'latitude' | 'longitude'>,
): number {
  const latitudeDelta = radians(second.latitude - first.latitude);
  const longitudeDelta = radians(second.longitude - first.longitude);
  const value =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(first.latitude)) *
      Math.cos(radians(second.latitude)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusMetres * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function isValidLocation(
  location: LiveActivityLocation,
  activityType: ActivityType,
): boolean {
  const filter = ACTIVITY_GPS_FILTERS[activityType];
  return (
    Number.isFinite(location.latitude) &&
    Number.isFinite(location.longitude) &&
    Number.isFinite(location.accuracy) &&
    location.accuracy >= 0 &&
    location.accuracy <= filter.maximumAccuracyMetres &&
    Number.isFinite(Date.parse(location.recordedAt))
  );
}

export function canAppendLocation(
  previous: LiveActivityLocation | undefined,
  next: LiveActivityLocation,
  activityType: ActivityType,
): boolean {
  if (!isValidLocation(next, activityType)) return false;
  if (!previous || previous.segment !== next.segment) return true;
  const elapsedSeconds = (Date.parse(next.recordedAt) - Date.parse(previous.recordedAt)) / 1_000;
  if (elapsedSeconds <= 0) return false;
  const distance = distanceBetweenLocations(previous, next);
  const filter = ACTIVITY_GPS_FILTERS[activityType];
  return (
    distance >= minimumReliableMovement(previous, next, activityType) &&
    distance / elapsedSeconds <= filter.maximumSpeedMetresPerSecond
  );
}

export function locationRejectionReason(
  previous: LiveActivityLocation | undefined,
  next: LiveActivityLocation,
  activityType: ActivityType,
): LocationRejectionReason {
  if (
    !Number.isFinite(next.latitude) ||
    !Number.isFinite(next.longitude) ||
    !Number.isFinite(next.accuracy) ||
    !Number.isFinite(Date.parse(next.recordedAt))
  )
    return 'coordinates';
  if (next.accuracy < 0 || next.accuracy > ACTIVITY_GPS_FILTERS[activityType].maximumAccuracyMetres)
    return 'accuracy';
  if (!previous || previous.segment !== next.segment) return null;
  const elapsedSeconds = (Date.parse(next.recordedAt) - Date.parse(previous.recordedAt)) / 1_000;
  if (elapsedSeconds <= 0) return 'timestamp';
  const distance = distanceBetweenLocations(previous, next);
  if (distance < minimumReliableMovement(previous, next, activityType)) return 'movement';
  if (distance / elapsedSeconds > ACTIVITY_GPS_FILTERS[activityType].maximumSpeedMetresPerSecond)
    return 'speed';
  return null;
}

export function trackedDistance(locations: readonly LiveActivityLocation[]): number {
  return locations.reduce((total, location, index) => {
    const previous = locations[index - 1];
    return !previous || previous.segment !== location.segment
      ? total
      : total + distanceBetweenLocations(previous, location);
  }, 0);
}

export function formatTrackedDistance(distanceMetres: number): string {
  const safeDistance = Math.max(0, distanceMetres);
  return safeDistance < 1_000
    ? `${Math.round(safeDistance)} m`
    : `${(safeDistance / 1_000).toFixed(2)} km`;
}
