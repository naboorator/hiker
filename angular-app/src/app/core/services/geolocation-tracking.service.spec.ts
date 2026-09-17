import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LogWrapper } from '../logging/log-wrapper.service';
import { GeolocationTrackingService } from './geolocation-tracking.service';

describe('GeolocationTrackingService', () => {
  const getCurrentPosition = vi.fn();
  const watchPosition = vi.fn();
  const clearWatch = vi.fn();
  let service: GeolocationTrackingService;

  beforeEach(() => {
    vi.useFakeTimers();
    getCurrentPosition.mockReset();
    watchPosition.mockReset().mockReturnValue(7);
    clearWatch.mockReset();
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition, watchPosition, clearWatch },
    });
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    TestBed.configureTestingModule({
      providers: [
        GeolocationTrackingService,
        { provide: LogWrapper, useValue: { info: vi.fn(), warn: vi.fn() } },
      ],
    });
    service = TestBed.inject(GeolocationTrackingService);
  });

  afterEach(() => vi.useRealTimers());

  it('requests a fresh position before starting a continuous watcher', () => {
    const position = vi.fn();
    const status = vi.fn();
    service.start(position, status);
    expect(getCurrentPosition).toHaveBeenCalledOnce();
    expect(watchPosition).not.toHaveBeenCalled();
    getCurrentPosition.mock.calls[0][0]({ coords: {} });
    expect(position).toHaveBeenCalledOnce();
    expect(watchPosition).toHaveBeenCalledOnce();
    watchPosition.mock.calls[0][0]({ coords: {} });
    expect(status).toHaveBeenNthCalledWith(1, 'pending');
    expect(position).toHaveBeenCalledTimes(2);
  });

  it('retries recoverable watcher errors with one bounded retry timer', () => {
    const status = vi.fn();
    service.start(vi.fn(), status);
    getCurrentPosition.mock.calls[0][0]({ coords: {} });
    const watcherError = watchPosition.mock.calls[0][1];
    watcherError({ code: 3, PERMISSION_DENIED: 1 });
    watcherError({ code: 2, PERMISSION_DENIED: 1 });
    expect(status).toHaveBeenLastCalledWith('recovering');
    vi.advanceTimersByTime(999);
    expect(watchPosition).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(1);
    expect(watchPosition).toHaveBeenCalledTimes(2);
  });

  it('does not retry permission denial', () => {
    const status = vi.fn();
    service.start(vi.fn(), status);
    getCurrentPosition.mock.calls[0][1]({ code: 1, PERMISSION_DENIED: 1 });
    vi.advanceTimersByTime(60_000);
    expect(status).toHaveBeenLastCalledWith('denied');
    expect(watchPosition).not.toHaveBeenCalled();
  });

  it('restarts a watcher that becomes stale while visible', () => {
    const status = vi.fn();
    service.start(vi.fn(), status);
    getCurrentPosition.mock.calls[0][0]({ coords: {} });
    vi.advanceTimersByTime(45_000);
    expect(status).toHaveBeenLastCalledWith('stale');
    expect(watchPosition).toHaveBeenCalledTimes(2);
  });

  it('pauses stale detection while hidden', () => {
    service.start(vi.fn(), vi.fn());
    getCurrentPosition.mock.calls[0][0]({ coords: {} });
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    vi.advanceTimersByTime(90_000);
    expect(watchPosition).toHaveBeenCalledOnce();
  });

  it('ignores callbacks from an obsolete request after stop', () => {
    const position = vi.fn();
    service.start(position, vi.fn());
    service.stop();
    getCurrentPosition.mock.calls[0][0]({ coords: {} });
    expect(position).not.toHaveBeenCalled();
    expect(watchPosition).not.toHaveBeenCalled();
  });
});
