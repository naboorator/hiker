import { DOCUMENT } from '@angular/common';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../auth/auth.service';
import { GeolocationTrackingService } from '../services/geolocation-tracking.service';
import { LiveActivityLocationRepository } from '../services/live-activity-location.repository';
import { LiveActivityStorageService } from '../services/live-activity-storage.service';
import { LogWrapper } from '../logging/log-wrapper.service';
import { LiveActivityStore } from './live-activity.store';

describe('LiveActivityStore', () => {
  let store: LiveActivityStore;
  const user = signal({ id: 'user-1', name: 'Zoran' });
  const storage = { read: vi.fn(), write: vi.fn(), remove: vi.fn() };
  const geolocation = { start: vi.fn(), stop: vi.fn(), pause: vi.fn() };
  const locations = { append: vi.fn(), read: vi.fn(), remove: vi.fn() };

  beforeEach(() => {
    user.set({ id: 'user-1', name: 'Zoran' });
    Object.values(storage).forEach((mock) => mock.mockReset());
    Object.values(geolocation).forEach((mock) => mock.mockReset());
    Object.values(locations).forEach((mock) => mock.mockReset());
    storage.read.mockReturnValue(null);
    storage.write.mockReturnValue(true);
    locations.append.mockResolvedValue(undefined);
    locations.read.mockResolvedValue([]);
    locations.remove.mockResolvedValue(undefined);
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    TestBed.configureTestingModule({
      providers: [
        LiveActivityStore,
        { provide: AuthService, useValue: { user } },
        { provide: LiveActivityStorageService, useValue: storage },
        { provide: GeolocationTrackingService, useValue: geolocation },
        { provide: LiveActivityLocationRepository, useValue: locations },
        { provide: LogWrapper, useValue: { info: vi.fn(), error: vi.fn() } },
        { provide: DOCUMENT, useValue: document },
      ],
    });
    store = TestBed.inject(LiveActivityStore);
    TestBed.flushEffects();
  });

  afterEach(() => vi.useRealTimers());

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
      coords: { latitude: 46.0569, longitude: 14.5061, accuracy: 10 },
      timestamp: Date.parse('2026-09-10T10:00:10Z'),
    });
    expect(store.activity()?.locations).toHaveLength(1);
    expect(store.activity()?.locationTracking).toBe('active');
    expect(store.stop('2026-09-10T10:01:00Z')?.metres).toBeGreaterThan(20);
  });

  it('batches accepted samples in IndexedDB instead of writing them to local storage', async () => {
    vi.useFakeTimers();
    store.start('hiking', '2026-09-10T10:00:00Z');
    storage.write.mockClear();
    const onPosition = geolocation.start.mock.calls.at(-1)?.[0];
    onPosition({
      coords: { latitude: 46.0569, longitude: 14.5058, accuracy: 10 },
      timestamp: Date.parse('2026-09-10T10:00:00Z'),
    });
    expect(storage.write).not.toHaveBeenCalled();
    expect(locations.append).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(locations.append).toHaveBeenCalledOnce();
    expect(storage.write).toHaveBeenCalledOnce();
  });

  it('attaches the persisted GPS route when preparing the backend activity', async () => {
    store.start('hiking', '2026-09-10T10:00:00Z');
    const route = [
      {
        latitude: 46.0569,
        longitude: 14.5058,
        accuracy: 10,
        recordedAt: '2026-09-10T10:00:00Z',
        segment: 0,
      },
    ];
    locations.read.mockResolvedValue(route);
    const draft = store.stop('2026-09-10T10:30:00Z')!;
    await expect(store.withGpsLocations(draft)).resolves.toEqual({
      ...draft,
      gpsLocations: route,
    });
  });

  it('pauses in the background and resumes only once in a new segment', () => {
    store.start('hiking', '2026-09-10T10:00:00Z');
    geolocation.start.mockClear();
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(geolocation.pause).toHaveBeenCalledOnce();
    expect(store.activity()?.locationTracking).toBe('background-limited');

    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('focus'));
    expect(store.activity()?.currentSegment).toBe(1);
    expect(geolocation.start).toHaveBeenCalledOnce();
  });

  it('does not bridge distance across a background gap', () => {
    store.start('hiking', '2026-09-10T10:00:00Z');
    geolocation.start.mock.calls.at(-1)?.[0]({
      coords: { latitude: 46.0569, longitude: 14.5058, accuracy: 10 },
      timestamp: Date.parse('2026-09-10T10:00:00Z'),
    });
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
    geolocation.start.mock.calls.at(-1)?.[0]({
      coords: { latitude: 46.0569, longitude: 14.5158, accuracy: 10 },
      timestamp: Date.parse('2026-09-10T10:05:00Z'),
    });
    expect(store.activity()?.trackedDistanceMetres).toBe(0);
  });

  it('migrates version-one locations before replacing the local summary', async () => {
    const legacy = {
      version: 1,
      id: 'legacy-activity',
      userId: 'user-2',
      activityType: 'hiking',
      status: 'stopped',
      startedAt: '2026-09-10T10:00:00Z',
      stoppedAt: '2026-09-10T10:10:00Z',
      locationTracking: 'active',
      currentSegment: 0,
      locations: [
        {
          latitude: 46.0569,
          longitude: 14.5058,
          accuracy: 10,
          recordedAt: '2026-09-10T10:00:00Z',
          segment: 0,
        },
      ],
      completionDraft: null,
    };
    storage.read.mockReturnValue(legacy);
    user.set({ id: 'user-2', name: 'Zoran' });
    TestBed.flushEffects();
    await Promise.resolve();
    await Promise.resolve();
    expect(locations.append).toHaveBeenCalledWith('legacy-activity', legacy.locations, 0);
    expect(store.activity()?.version).toBe(2);
    expect(storage.write).toHaveBeenCalledWith(expect.objectContaining({ version: 2 }));
  });

  it('keeps timing active and exposes a warning when location persistence fails', async () => {
    vi.useFakeTimers();
    locations.append.mockRejectedValue(new Error('quota'));
    store.start('hiking', '2026-09-10T10:00:00Z');
    geolocation.start.mock.calls.at(-1)?.[0]({
      coords: { latitude: 46.0569, longitude: 14.5058, accuracy: 10 },
      timestamp: Date.parse('2026-09-10T10:00:00Z'),
    });
    await vi.advanceTimersByTimeAsync(5_000);
    expect(store.activity()?.status).toBe('tracking');
    expect(store.activity()?.storageWarning).toBe(true);
    expect(store.error()).toBe('liveActivity.storageError');
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

  it('restarts GPS in a new segment when the user retries location tracking', () => {
    store.start('hiking', '2026-09-10T10:00:00Z');
    geolocation.start.mockClear();
    store.retryGeolocation();
    expect(store.activity()?.currentSegment).toBe(1);
    expect(store.activity()?.locationTracking).toBe('pending');
    expect(geolocation.start).toHaveBeenCalledOnce();
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
