import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import {
  LIVE_ACTIVITY_GEOLOCATION_OPTIONS,
  LIVE_ACTIVITY_INITIAL_GEOLOCATION_OPTIONS,
  LIVE_ACTIVITY_RETRY_DELAYS_MS,
  LIVE_ACTIVITY_STALE_TIMEOUT_MS,
  LIVE_ACTIVITY_WATCHDOG_INTERVAL_MS,
} from '../constants/live-activity.constants';
import type { LocationTrackingStatus } from '../interface/live-activity-status.type';
import { LogWrapper } from '../logging/log-wrapper.service';

@Injectable({ providedIn: 'root' })
export class GeolocationTrackingService {
  private readonly document = inject(DOCUMENT);
  private readonly logger = inject(LogWrapper);
  private watchId: number | null = null;
  private requestVersion = 0;
  private retryAttempt = 0;
  private retryTimer: number | null = null;
  private watchdogTimer: number | null = null;
  private lastCallbackAt = 0;
  private onPosition: ((position: GeolocationPosition) => void) | null = null;
  private onStatus: ((status: LocationTrackingStatus) => void) | null = null;

  start(
    onPosition: (position: GeolocationPosition) => void,
    onStatus: (status: LocationTrackingStatus) => void,
  ): void {
    this.stop();
    this.onPosition = onPosition;
    this.onStatus = onStatus;
    if (!navigator.geolocation) {
      onStatus('unavailable');
      return;
    }
    onStatus('pending');
    const requestVersion = this.requestVersion;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!this.isCurrent(requestVersion)) return;
        this.acceptPosition(position);
        this.startWatcher(requestVersion);
      },
      (error) => {
        if (!this.isCurrent(requestVersion)) return;
        this.lastCallbackAt = Date.now();
        if (error.code === error.PERMISSION_DENIED) return this.deny();
        onStatus('recovering');
        this.startWatcher(requestVersion);
      },
      LIVE_ACTIVITY_INITIAL_GEOLOCATION_OPTIONS,
    );
  }

  pause(): void {
    this.stopTimersAndWatcher();
    this.requestVersion += 1;
  }

  resume(): void {
    if (this.onPosition && this.onStatus) this.start(this.onPosition, this.onStatus);
  }

  stop(): void {
    this.pause();
    this.onPosition = null;
    this.onStatus = null;
    this.retryAttempt = 0;
    this.lastCallbackAt = 0;
  }

  private startWatcher(requestVersion: number): void {
    if (!this.isCurrent(requestVersion) || !navigator.geolocation) return;
    this.clearWatcher();
    this.lastCallbackAt = Date.now();
    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (this.isCurrent(requestVersion)) this.acceptPosition(position);
      },
      (error) => this.handleWatchError(requestVersion, error),
      LIVE_ACTIVITY_GEOLOCATION_OPTIONS,
    );
    this.startWatchdog(requestVersion);
    this.logger.info('GPS watcher started', { retryAttempt: this.retryAttempt });
  }

  private acceptPosition(position: GeolocationPosition): void {
    this.lastCallbackAt = Date.now();
    this.retryAttempt = 0;
    this.clearRetry();
    this.onPosition?.(position);
  }

  private handleWatchError(requestVersion: number, error: GeolocationPositionError): void {
    if (!this.isCurrent(requestVersion)) return;
    this.lastCallbackAt = Date.now();
    if (error.code === error.PERMISSION_DENIED) return this.deny();
    this.onStatus?.('recovering');
    this.logger.warn('Recoverable GPS watcher error', { code: error.code });
    this.clearWatcher();
    this.clearWatchdog();
    this.scheduleRestart();
  }

  private scheduleRestart(): void {
    if (this.retryTimer !== null || !this.onPosition || !this.onStatus) return;
    const delay =
      LIVE_ACTIVITY_RETRY_DELAYS_MS[
        Math.min(this.retryAttempt, LIVE_ACTIVITY_RETRY_DELAYS_MS.length - 1)
      ];
    this.retryAttempt += 1;
    this.logger.info('GPS watcher restart scheduled', { attempt: this.retryAttempt, delay });
    this.retryTimer = window.setTimeout(() => {
      this.retryTimer = null;
      if (this.document.visibilityState !== 'visible' || !this.onPosition || !this.onStatus) return;
      this.startWatcher(++this.requestVersion);
    }, delay);
  }

  private startWatchdog(requestVersion: number): void {
    this.clearWatchdog();
    this.watchdogTimer = window.setInterval(() => {
      if (
        !this.isCurrent(requestVersion) ||
        this.document.visibilityState !== 'visible' ||
        Date.now() - this.lastCallbackAt < LIVE_ACTIVITY_STALE_TIMEOUT_MS
      )
        return;
      this.onStatus?.('stale');
      this.logger.warn('Stale GPS watcher restarted');
      this.clearWatcher();
      this.clearWatchdog();
      this.startWatcher(++this.requestVersion);
    }, LIVE_ACTIVITY_WATCHDOG_INTERVAL_MS);
  }

  private deny(): void {
    this.stopTimersAndWatcher();
    this.onStatus?.('denied');
    this.logger.warn('GPS permission denied');
  }

  private isCurrent(requestVersion: number): boolean {
    return requestVersion === this.requestVersion && this.onPosition !== null;
  }

  private stopTimersAndWatcher(): void {
    this.clearRetry();
    this.clearWatchdog();
    this.clearWatcher();
  }

  private clearWatcher(): void {
    if (this.watchId === null || !navigator.geolocation) return;
    navigator.geolocation.clearWatch(this.watchId);
    this.watchId = null;
    this.logger.info('GPS watcher stopped');
  }

  private clearRetry(): void {
    if (this.retryTimer === null) return;
    window.clearTimeout(this.retryTimer);
    this.retryTimer = null;
  }

  private clearWatchdog(): void {
    if (this.watchdogTimer === null) return;
    window.clearInterval(this.watchdogTimer);
    this.watchdogTimer = null;
  }
}
