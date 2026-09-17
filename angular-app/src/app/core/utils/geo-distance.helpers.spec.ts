import { describe, expect, it } from 'vitest';
import type { LiveActivityLocation } from '../interface/live-activity-location.interface';
import {
  canAppendLocation,
  distanceBetweenLocations,
  formatTrackedDistance,
  locationRejectionReason,
  minimumReliableMovement,
  trackedDistance,
} from './geo-distance.helpers';

const point = (longitude: number, recordedAt: string, segment = 0): LiveActivityLocation => ({
  latitude: 46.0569,
  longitude,
  accuracy: 10,
  recordedAt,
  segment,
});

describe('geo distance helpers', () => {
  it('calculates Haversine distance in metres', () => {
    expect(distanceBetweenLocations(point(14.5058, ''), point(14.5188, ''))).toBeCloseTo(1_003, -1);
  });

  it('rejects inaccurate and impossibly fast samples', () => {
    expect(
      canAppendLocation(
        undefined,
        { ...point(14.5058, '2026-09-10T10:00:00Z'), accuracy: 200 },
        'hiking',
      ),
    ).toBe(false);
    expect(
      canAppendLocation(
        point(14.5058, '2026-09-10T10:00:00Z'),
        point(14.5188, '2026-09-10T10:00:01Z'),
        'hiking',
      ),
    ).toBe(false);
  });

  it('uses a stricter accuracy profile for fitness', () => {
    const location = { ...point(14.5058, '2026-09-10T10:00:00Z'), accuracy: 30 };
    expect(canAppendLocation(undefined, location, 'hiking')).toBe(true);
    expect(canAppendLocation(undefined, location, 'fitness')).toBe(false);
  });

  it('ignores GPS jitter below the activity movement threshold', () => {
    expect(
      canAppendLocation(
        point(14.5058, '2026-09-10T10:00:00Z'),
        point(14.50581, '2026-09-10T10:00:10Z'),
        'hiking',
      ),
    ).toBe(false);
  });

  it('uses the combined accuracy of consecutive samples to reject stationary GPS drift', () => {
    const previous = point(14.5058, '2026-09-10T10:00:00Z');
    const apparentElevenMetreMove = point(14.505942, '2026-09-10T10:00:10Z');

    expect(minimumReliableMovement(previous, apparentElevenMetreMove, 'hiking')).toBe(12);
    expect(canAppendLocation(previous, apparentElevenMetreMove, 'hiking')).toBe(false);
    expect(locationRejectionReason(previous, apparentElevenMetreMove, 'hiking')).toBe('movement');
  });

  it('still accepts movement that exceeds GPS uncertainty', () => {
    expect(
      canAppendLocation(
        point(14.5058, '2026-09-10T10:00:00Z'),
        point(14.50606, '2026-09-10T10:00:10Z'),
        'hiking',
      ),
    ).toBe(true);
  });

  it('accepts valid GPS samples while travelling at car speed', () => {
    expect(
      canAppendLocation(
        point(14.5058, '2026-09-10T10:00:00Z'),
        point(14.50968, '2026-09-10T10:00:10Z'),
        'hiking',
      ),
    ).toBe(true);
  });

  it('still rejects physically implausible GPS jumps', () => {
    expect(
      canAppendLocation(
        point(14.5058, '2026-09-10T10:00:00Z'),
        point(14.5188, '2026-09-10T10:00:10Z'),
        'hiking',
      ),
    ).toBe(false);
  });

  it('caps the drift threshold so a real 15 metre movement is accepted with weaker GPS', () => {
    const previous = { ...point(14.5058, '2026-09-10T10:00:00Z'), accuracy: 20 };
    const fifteenMetreMove = { ...point(14.505994, '2026-09-10T10:00:10Z'), accuracy: 20 };

    expect(minimumReliableMovement(previous, fifteenMetreMove, 'hiking')).toBe(12);
    expect(canAppendLocation(previous, fifteenMetreMove, 'hiking')).toBe(true);
  });

  it('does not connect points from separate foreground segments', () => {
    const locations = [
      point(14.5058, '2026-09-10T10:00:00Z', 0),
      point(14.5068, '2026-09-10T10:01:00Z', 0),
      point(14.5188, '2026-09-10T10:02:00Z', 1),
    ];
    expect(trackedDistance(locations)).toBeGreaterThan(70);
    expect(trackedDistance(locations)).toBeLessThan(100);
  });

  it('formats tracked distance in metres and kilometres', () => {
    expect(formatTrackedDistance(248.6)).toBe('249 m');
    expect(formatTrackedDistance(1_234)).toBe('1.23 km');
  });

  it('reports why a GPS sample was rejected', () => {
    expect(
      locationRejectionReason(
        point(14.5058, '2026-09-10T10:00:00Z'),
        point(14.50581, '2026-09-10T10:00:10Z'),
        'hiking',
      ),
    ).toBe('movement');
    expect(
      locationRejectionReason(
        undefined,
        { ...point(14.5058, '2026-09-10T10:00:00Z'), accuracy: 100 },
        'hiking',
      ),
    ).toBe('accuracy');
  });
});
