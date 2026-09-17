import { describe, expect, it } from 'vitest';
import type { ActivityGpsLocation } from '../../../core/interface/activity-gps-location.interface';
import { drawableRouteSegments, routeBounds, routeGeoJson } from './activity-route-map.helpers';

const point = (
  longitude: number,
  latitude: number,
  segment: number,
  sequence: number,
): ActivityGpsLocation => ({
  longitude,
  latitude,
  segment,
  sequence,
  accuracy: 5,
  altitude: 500 + sequence,
  altitudeAccuracy: 7,
  recordedAt: `2026-09-17T10:00:${String(sequence).padStart(2, '0')}Z`,
});

describe('activity route map helpers', () => {
  it('creates ordered separate lines without mutating input', () => {
    const locations = [
      point(14.52, 46.07, 1, 3),
      point(14.5, 46.05, 0, 0),
      point(14.51, 46.06, 0, 1),
      point(14.53, 46.08, 1, 2),
    ];
    const original = [...locations];

    expect(drawableRouteSegments(locations)).toEqual([
      [
        [14.5, 46.05],
        [14.51, 46.06],
      ],
      [
        [14.53, 46.08],
        [14.52, 46.07],
      ],
    ]);
    expect(locations).toEqual(original);
  });

  it('removes invalid coordinates and one-point segments', () => {
    const locations = [
      point(14.5, 46.05, 0, 0),
      point(Number.NaN, 46.06, 0, 1),
      point(14.7, 95, 1, 2),
    ];
    expect(routeGeoJson(locations)).toBeNull();
  });

  it('calculates initial bounds across the complete route', () => {
    const feature = routeGeoJson([
      point(14.5, 46.05, 0, 0),
      point(14.51, 46.06, 0, 1),
      point(14.7, 46.2, 1, 2),
      point(15.2, 46.5, 1, 3),
      point(14.8, 46.3, 1, 4),
    ])!;
    expect(routeBounds(feature)).toEqual([
      [14.5, 46.05],
      [15.2, 46.5],
    ]);
    expect(feature.geometry.coordinates.flat()[0]).toHaveLength(2);
  });
});
