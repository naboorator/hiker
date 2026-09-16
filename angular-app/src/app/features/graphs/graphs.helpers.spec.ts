import { describe, expect, it } from 'vitest';
import {
  activityAxisMaximum,
  chartXPosition,
  chartYPosition,
  formatDistance,
  formatWeight,
  monthlyActivitySummary,
  timeAxisMaximum,
} from './graphs.helpers';

const plot = { left: 10, right: 110, top: 20, bottom: 220 };

describe('graph helpers', () => {
  it('positions the first and last day at the plot edges', () => {
    expect(chartXPosition(1, 31, plot)).toBe(10);
    expect(chartXPosition(31, 31, plot)).toBe(110);
  });

  it('positions zero and maximum values at the vertical plot edges', () => {
    expect(chartYPosition(0, 100, plot)).toBe(220);
    expect(chartYPosition(100, 100, plot)).toBe(20);
  });

  it('rounds time and activity axes to useful minimums', () => {
    expect(timeAxisMaximum([])).toBe(60);
    expect(timeAxisMaximum([61])).toBe(90);
    expect(activityAxisMaximum([])).toBe(4);
    expect(activityAxisMaximum([5])).toBe(8);
  });

  it('formats weight with the selected locale', () => {
    expect(formatWeight(81.5, 'en')).toBe('81.5 kg');
  });

  it('calculates all monthly activity totals', () => {
    const hikes = [
      { minutes: 45, metres: 3200 },
      { minutes: 70, metres: 7800 },
    ];

    expect(monthlyActivitySummary(hikes)).toEqual({
      activityCount: 2,
      minutes: 115,
      metres: 11000,
    });
  });

  it('formats distances in metres and kilometres', () => {
    expect(formatDistance(850, 'en')).toBe('850 m');
    expect(formatDistance(1250, 'en')).toBe('1.3 km');
  });
});
