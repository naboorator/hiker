import type { LiveActivityLocation } from '../interface/live-activity-location.interface';

export function mergeUniqueLocations(
  ...collections: readonly (readonly LiveActivityLocation[])[]
): LiveActivityLocation[] {
  const locations = collections.flat();
  return locations.filter(
    (location, index) =>
      locations.findIndex(
        (candidate) =>
          candidate.recordedAt === location.recordedAt &&
          candidate.latitude === location.latitude &&
          candidate.longitude === location.longitude,
      ) === index,
  );
}
