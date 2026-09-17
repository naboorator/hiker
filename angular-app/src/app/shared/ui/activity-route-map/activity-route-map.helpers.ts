import type { ActivityGpsLocation } from '../../../core/interface/activity-gps-location.interface';

export type RoutePosition = [number, number];

export interface RouteFeature {
  type: 'Feature';
  properties: Record<string, never>;
  geometry: {
    type: 'MultiLineString';
    coordinates: RoutePosition[][];
  };
}

export function drawableRouteSegments(
  locations: readonly ActivityGpsLocation[],
): RoutePosition[][] {
  const ordered = locations
    .map((location, index) => ({ location, order: location.sequence ?? index }))
    .sort((first, second) => first.order - second.order);
  const bySegment = new Map<number, RoutePosition[]>();
  for (const { location } of ordered) {
    if (!validCoordinate(location)) continue;
    const coordinates = bySegment.get(location.segment) ?? [];
    coordinates.push([location.longitude, location.latitude]);
    bySegment.set(location.segment, coordinates);
  }
  return [...bySegment.values()].filter((coordinates) => coordinates.length >= 2);
}

export function routeGeoJson(locations: readonly ActivityGpsLocation[]): RouteFeature | null {
  const coordinates = drawableRouteSegments(locations);
  return coordinates.length
    ? {
        type: 'Feature',
        properties: {},
        geometry: { type: 'MultiLineString', coordinates },
      }
    : null;
}

export function routeBounds(feature: RouteFeature): [RoutePosition, RoutePosition] {
  const coordinates = feature.geometry.coordinates.flat();
  const longitudes = coordinates.map(([longitude]) => longitude!);
  const latitudes = coordinates.map(([, latitude]) => latitude!);
  return [
    [Math.min(...longitudes), Math.min(...latitudes)],
    [Math.max(...longitudes), Math.max(...latitudes)],
  ];
}

function validCoordinate(location: Pick<ActivityGpsLocation, 'latitude' | 'longitude'>): boolean {
  return (
    Number.isFinite(location.latitude) &&
    Number.isFinite(location.longitude) &&
    location.latitude >= -90 &&
    location.latitude <= 90 &&
    location.longitude >= -180 &&
    location.longitude <= 180
  );
}
