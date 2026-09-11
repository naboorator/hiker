import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GeolocationTrackingService } from './geolocation-tracking.service';

describe('GeolocationTrackingService', () => {
  const watchPosition = vi.fn();
  const clearWatch = vi.fn();
  let service: GeolocationTrackingService;

  beforeEach(() => {
    watchPosition.mockReset().mockReturnValue(7);
    clearWatch.mockReset();
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { watchPosition, clearWatch },
    });
    TestBed.configureTestingModule({ providers: [GeolocationTrackingService] });
    service = TestBed.inject(GeolocationTrackingService);
  });

  it('starts watching, reports an accepted position, and stops', () => {
    const position = vi.fn();
    const status = vi.fn();
    service.start(position, status);
    watchPosition.mock.calls[0][0]({ coords: {} });
    expect(status).toHaveBeenNthCalledWith(1, 'pending');
    expect(position).toHaveBeenCalled();
    service.stop();
    expect(clearWatch).toHaveBeenCalledWith(7);
  });

  it('maps denied permission to a denied status', () => {
    const status = vi.fn();
    service.start(vi.fn(), status);
    watchPosition.mock.calls[0][1]({ code: 1, PERMISSION_DENIED: 1 });
    expect(status).toHaveBeenLastCalledWith('denied');
  });
});
