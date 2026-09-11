import { DOCUMENT } from '@angular/common';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../auth/auth.service';
import { GeolocationTrackingService } from '../services/geolocation-tracking.service';
import { LiveActivityStorageService } from '../services/live-activity-storage.service';
import { LiveActivityStore } from './live-activity.store';

describe('LiveActivityStore', () => {
  let store: LiveActivityStore;
  const user = signal({ id: 'user-1', name: 'Zoran' });
  const storage = { read: vi.fn(), write: vi.fn(), remove: vi.fn() };
  const geolocation = { start: vi.fn(), stop: vi.fn() };

  beforeEach(() => {
    user.set({ id: 'user-1', name: 'Zoran' });
    Object.values(storage).forEach((mock) => mock.mockReset());
    Object.values(geolocation).forEach((mock) => mock.mockReset());
    storage.read.mockReturnValue(null);
    storage.write.mockReturnValue(true);
    TestBed.configureTestingModule({
      providers: [
        LiveActivityStore,
        { provide: AuthService, useValue: { user } },
        { provide: LiveActivityStorageService, useValue: storage },
        { provide: GeolocationTrackingService, useValue: geolocation },
        { provide: DOCUMENT, useValue: document },
      ],
    });
    store = TestBed.inject(LiveActivityStore);
    TestBed.flushEffects();
  });

  it('starts only one local activity without calling an API', () => {
    expect(store.start('hiking', '2026-09-10T10:00:00Z')).toBe(true);
    expect(store.start('fitness')).toBe(false);
    expect(store.activity()?.userId).toBe('user-1');
    expect(storage.write).toHaveBeenCalled();
    expect(geolocation.start).toHaveBeenCalled();
  });

  it('stops and produces a prefilled activity draft', () => {
    store.start('hiking', '2026-09-10T10:00:00Z');
    const draft = store.stop('2026-09-10T10:30:30Z');
    expect(draft).toMatchObject({ activityType: 'hiking', minutes: 31, metres: 0 });
    expect(store.activity()?.status).toBe('stopped');
    expect(geolocation.stop).toHaveBeenCalled();
  });

  it('adds accurate GPS samples and calculates their distance', () => {
    store.start('hiking', '2026-09-10T10:00:00Z');
    const onPosition = geolocation.start.mock.calls.at(-1)?.[0];
    onPosition({
      coords: { latitude: 46.0569, longitude: 14.5058, accuracy: 10 },
      timestamp: Date.parse('2026-09-10T10:00:00Z'),
    });
    onPosition({
      coords: { latitude: 46.0569, longitude: 14.5059, accuracy: 10 },
      timestamp: Date.parse('2026-09-10T10:00:10Z'),
    });
    expect(store.activity()?.locations).toHaveLength(2);
    expect(store.activity()?.locationTracking).toBe('active');
    expect(store.stop('2026-09-10T10:01:00Z')?.metres).toBeGreaterThan(7);
  });

  it('reports a weak signal instead of pretending that an inaccurate point is active', () => {
    store.start('fitness', '2026-09-10T10:00:00Z');
    const onPosition = geolocation.start.mock.calls.at(-1)?.[0];
    onPosition({
      coords: { latitude: 46.0569, longitude: 14.5058, accuracy: 35 },
      timestamp: Date.parse('2026-09-10T10:00:00Z'),
    });
    expect(store.activity()?.locations).toEqual([]);
    expect(store.activity()?.locationTracking).toBe('weak-signal');
  });

  it('preserves state after a failed save and removes it after success', () => {
    store.start('fitness', '2026-09-10T10:00:00Z');
    store.stop('2026-09-10T10:30:00Z');
    store.markSaving();
    store.saveFailed();
    expect(store.activity()?.status).toBe('stopped');
    expect(storage.remove).not.toHaveBeenCalled();
    store.completeSave();
    expect(store.activity()).toBeNull();
    expect(storage.remove).toHaveBeenCalled();
  });
});
