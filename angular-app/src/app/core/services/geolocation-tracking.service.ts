import { Injectable } from '@angular/core';
import { LIVE_ACTIVITY_GEOLOCATION_OPTIONS } from '../constants/live-activity.constants';
import type { LocationTrackingStatus } from '../interface/live-activity-status.type';

@Injectable({ providedIn: 'root' })
export class GeolocationTrackingService {
  private watchId: number | null = null;

  start(
    onPosition: (position: GeolocationPosition) => void,
    onStatus: (status: LocationTrackingStatus) => void,
  ): void {
    this.stop();
    if (!navigator.geolocation) {
      onStatus('unavailable');
      return;
    }
    onStatus('pending');
    this.watchId = navigator.geolocation.watchPosition(
      (position) => onPosition(position),
      (error) => onStatus(error.code === error.PERMISSION_DENIED ? 'denied' : 'error'),
      LIVE_ACTIVITY_GEOLOCATION_OPTIONS,
    );
  }

  stop(): void {
    if (this.watchId === null || !navigator.geolocation) return;
    navigator.geolocation.clearWatch(this.watchId);
    this.watchId = null;
  }
}
