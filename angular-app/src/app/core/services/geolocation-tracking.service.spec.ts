import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GeolocationTrackingService } from './geolocation-tracking.service';

describe('GeolocationTrackingService', () => {
  const getCurrentPosition = vi.fn();
  const watchPosition = vi.fn();
  const clearWatch = vi.fn();
  let service: GeolocationTrackingService;

  beforeEach(() => {
    getCurrentPosition.mockReset();
    watchPosition.mockReset().mockReturnValue(7);
    clearWatch.mockReset();
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition, watchPosition, clearWatch },
    });
    TestBed.configureTestingModule({ providers: [GeolocationTrackingService] });
    service = TestBed.inject(GeolocationTrackingService);
  });

  it('requests a fresh initial position before starting the continuous watch', () => {
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
    service.stop();
    expect(clearWatch).toHaveBeenCalledWith(7);
  });

  it('maps denied initial permission to a denied status without starting a watch', () => {
    const status = vi.fn();
    service.start(vi.fn(), status);
    getCurrentPosition.mock.calls[0][1]({ code: 1, PERMISSION_DENIED: 1 });
    expect(status).toHaveBeenLastCalledWith('denied');
    expect(watchPosition).not.toHaveBeenCalled();
  });

  it('continues with a watch after a recoverable initial location error', () => {
    const status = vi.fn();
    service.start(vi.fn(), status);
    getCurrentPosition.mock.calls[0][1]({ code: 3, PERMISSION_DENIED: 1 });
    expect(status).toHaveBeenLastCalledWith('error');
    expect(watchPosition).toHaveBeenCalledOnce();
  });

  it('does not start a delayed watch after tracking has stopped', () => {
    service.start(vi.fn(), vi.fn());
    service.stop();
    getCurrentPosition.mock.calls[0][0]({ coords: {} });
    expect(watchPosition).not.toHaveBeenCalled();
  });
});
