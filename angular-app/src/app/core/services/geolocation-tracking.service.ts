import { Injectable } from '@angular/core';
import {
  LIVE_ACTIVITY_GEOLOCATION_OPTIONS,
  LIVE_ACTIVITY_INITIAL_GEOLOCATION_OPTIONS,
} from '../constants/live-activity.constants';
import type { LocationTrackingStatus } from '../interface/live-activity-status.type';

@Injectable({ providedIn: 'root' })
export class GeolocationTrackingService {
  private watchId: number | null = null;
  private requestVersion = 0;

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
    const requestVersion = this.requestVersion;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (requestVersion !== this.requestVersion) return;
        onPosition(position);
        this.watch(requestVersion, onPosition, onStatus);
      },
      (error) => {
        if (requestVersion !== this.requestVersion) return;
        const status = error.code === error.PERMISSION_DENIED ? 'denied' : 'error';
        onStatus(status);
        if (status !== 'denied') this.watch(requestVersion, onPosition, onStatus);
      },
      LIVE_ACTIVITY_INITIAL_GEOLOCATION_OPTIONS,
    );
  }

  private watch(
    requestVersion: number,
    onPosition: (position: GeolocationPosition) => void,
    onStatus: (status: LocationTrackingStatus) => void,
  ): void {
    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (requestVersion === this.requestVersion) onPosition(position);
      },
      (error) => {
        if (requestVersion !== this.requestVersion) return;
        onStatus(error.code === error.PERMISSION_DENIED ? 'denied' : 'error');
      },
      LIVE_ACTIVITY_GEOLOCATION_OPTIONS,
    );
  }

  stop(): void {
    this.requestVersion += 1;
    if (this.watchId === null || !navigator.geolocation) return;
    navigator.geolocation.clearWatch(this.watchId);
    this.watchId = null;
  }
}
