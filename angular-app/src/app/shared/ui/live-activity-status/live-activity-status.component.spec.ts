import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LiveActivityStatusComponent } from './live-activity-status.component';

describe('LiveActivityStatusComponent', () => {
  afterEach(() => vi.useRealTimers());

  it('updates elapsed time and exposes the GPS status key', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-10T10:00:00Z'));
    TestBed.configureTestingModule({ imports: [LiveActivityStatusComponent] });
    TestBed.overrideComponent(LiveActivityStatusComponent, { set: { template: '' } });
    const fixture = TestBed.createComponent(LiveActivityStatusComponent);
    fixture.componentRef.setInput('activity', {
      version: 2,
      id: 'live-1',
      userId: 'user-1',
      activityType: 'hiking',
      status: 'tracking',
      startedAt: '2026-09-10T09:59:00Z',
      stoppedAt: null,
      locationTracking: 'active',
      currentSegment: 0,
      locations: [
        {
          latitude: 46.0569,
          longitude: 14.5058,
          accuracy: 10,
          recordedAt: '2026-09-10T09:59:00Z',
          segment: 0,
        },
        {
          latitude: 46.0569,
          longitude: 14.5068,
          accuracy: 10,
          recordedAt: '2026-09-10T10:00:00Z',
          segment: 0,
        },
      ],
      trackedDistanceMetres: 77,
      lastCallbackAt: '2026-09-10T10:00:00Z',
      lastValidSampleAt: '2026-09-10T10:00:00Z',
      lastAcceptedSampleAt: '2026-09-10T10:00:00Z',
      rejectionReason: null,
      storageWarning: false,
      completionDraft: null,
    });
    fixture.detectChanges();
    expect(fixture.componentInstance.elapsed()).toBe('00:01:00');
    expect(fixture.componentInstance.locationKey()).toBe('liveActivity.location.active');
    expect(fixture.componentInstance.gpsPulseKey()).toBe('2026-09-10T10:00:00Z');
    expect(fixture.componentInstance.distance()).toMatch(/^77 m$/);
  });

  it('offers a GPS retry after location permission is denied', () => {
    TestBed.configureTestingModule({ imports: [LiveActivityStatusComponent] });
    TestBed.overrideComponent(LiveActivityStatusComponent, { set: { template: '' } });
    const fixture = TestBed.createComponent(LiveActivityStatusComponent);
    fixture.componentRef.setInput('activity', {
      version: 2,
      id: 'live-1',
      userId: 'user-1',
      activityType: 'hiking',
      status: 'tracking',
      startedAt: '2026-09-10T09:59:00Z',
      stoppedAt: null,
      locationTracking: 'denied',
      currentSegment: 0,
      locations: [],
      trackedDistanceMetres: 0,
      lastCallbackAt: null,
      lastValidSampleAt: null,
      lastAcceptedSampleAt: null,
      rejectionReason: null,
      storageWarning: false,
      completionDraft: null,
    });
    fixture.detectChanges();
    expect(fixture.componentInstance.canRetryLocation()).toBe(true);
  });
});
