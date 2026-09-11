import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LIVE_ACTIVITY_STORAGE_KEY } from '../constants/live-activity.constants';
import { LogWrapper } from '../logging/log-wrapper.service';
import { LiveActivityStorageService } from './live-activity-storage.service';

const activity = {
  version: 1 as const,
  id: 'activity-1',
  userId: 'user-1',
  activityType: 'hiking' as const,
  status: 'tracking' as const,
  startedAt: '2026-09-10T10:00:00Z',
  stoppedAt: null,
  locationTracking: 'pending' as const,
  currentSegment: 0,
  locations: [],
  completionDraft: null,
};

describe('LiveActivityStorageService', () => {
  let service: LiveActivityStorageService;
  const error = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    error.mockReset();
    TestBed.configureTestingModule({
      providers: [LiveActivityStorageService, { provide: LogWrapper, useValue: { error } }],
    });
    service = TestBed.inject(LiveActivityStorageService);
  });

  it('stores and restores only the matching user activity', () => {
    expect(service.write(activity)).toBe(true);
    expect(service.read('user-1')).toEqual(activity);
    expect(service.read('user-2')).toBeNull();
  });

  it('removes malformed data and reports it', () => {
    localStorage.setItem(LIVE_ACTIVITY_STORAGE_KEY, '{bad');
    expect(service.read('user-1')).toBeNull();
    expect(localStorage.getItem(LIVE_ACTIVITY_STORAGE_KEY)).toBeNull();
    expect(error).toHaveBeenCalled();
  });

  it('ignores an unsupported storage version', () => {
    localStorage.setItem(LIVE_ACTIVITY_STORAGE_KEY, JSON.stringify({ ...activity, version: 2 }));
    expect(service.read('user-1')).toBeNull();
  });

  it('removes a completed activity', () => {
    service.write(activity);
    service.remove();
    expect(service.read('user-1')).toBeNull();
  });
});
