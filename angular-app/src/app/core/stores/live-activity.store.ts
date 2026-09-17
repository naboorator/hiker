import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, effect, inject, signal, untracked } from '@angular/core';
import {
  LIVE_ACTIVITY_MAX_ACCEPTED_SAMPLES,
  LIVE_ACTIVITY_MAX_PENDING_SAMPLES,
  LIVE_ACTIVITY_PERSISTENCE_FLUSH_MS,
  LIVE_ACTIVITY_VERSION,
} from '../constants/live-activity.constants';
import type { ActivityType } from '../interface/activity-type.type';
import type { HikeDraft } from '../interface/hike-draft.interface';
import type { LegacyLiveActivity } from '../interface/legacy-live-activity.interface';
import type { LiveActivity } from '../interface/live-activity.interface';
import type { LiveActivityLocation } from '../interface/live-activity-location.interface';
import type { LocationTrackingStatus } from '../interface/live-activity-status.type';
import { AuthService } from '../auth/auth.service';
import { LogWrapper } from '../logging/log-wrapper.service';
import { GeolocationTrackingService } from '../services/geolocation-tracking.service';
import { LiveActivityLocationRepository } from '../services/live-activity-location.repository';
import { LiveActivityStorageService } from '../services/live-activity-storage.service';
import { activityTypeOption } from '../utils/activity-type.helpers';
import {
  distanceBetweenLocations,
  locationRejectionReason,
  normalizeAltitude,
  normalizeAltitudeAccuracy,
} from '../utils/geo-distance.helpers';
import { elapsedMinutes, localDateFromTimestamp } from '../utils/live-activity-time.helpers';
import { mergeUniqueLocations } from '../utils/live-activity-location.helpers';

@Injectable({ providedIn: 'root' })
export class LiveActivityStore {
  private readonly auth = inject(AuthService);
  private readonly storage = inject(LiveActivityStorageService);
  private readonly locations = inject(LiveActivityLocationRepository);
  private readonly geolocation = inject(GeolocationTrackingService);
  private readonly logger = inject(LogWrapper);
  private readonly document = inject(DOCUMENT);
  private readonly window = this.document.defaultView;
  private pendingLocations: LiveActivityLocation[] = [];
  private persistedLocationCount = 0;
  private flushTimer: number | null = null;
  private flushInFlight: Promise<void> | null = null;
  private foreground = this.document.visibilityState === 'visible';
  readonly activity = signal<LiveActivity | null>(null);
  readonly error = signal<string | null>(null);

  constructor() {
    const visibilityHandler = () =>
      this.document.visibilityState === 'hidden'
        ? this.handleBackground('visibilitychange')
        : this.handleForeground('visibilitychange');
    const pageHideHandler = () => this.handleBackground('pagehide');
    const pageShowHandler = () => this.handleForeground('pageshow');
    const focusHandler = () => this.handleForeground('focus');
    this.document.addEventListener('visibilitychange', visibilityHandler);
    this.window?.addEventListener('pagehide', pageHideHandler);
    this.window?.addEventListener('pageshow', pageShowHandler);
    this.window?.addEventListener('focus', focusHandler);
    inject(DestroyRef).onDestroy(() => {
      this.document.removeEventListener('visibilitychange', visibilityHandler);
      this.window?.removeEventListener('pagehide', pageHideHandler);
      this.window?.removeEventListener('pageshow', pageShowHandler);
      this.window?.removeEventListener('focus', focusHandler);
      this.geolocation.stop();
      void this.flushPendingLocations();
    });
    effect(() => {
      const userId = this.auth.user()?.id;
      this.geolocation.stop();
      untracked(() => void this.restore(userId));
    });
  }

  start(activityType: ActivityType, startedAt = new Date().toISOString()): boolean {
    const userId = this.auth.user()?.id;
    if (!userId || this.activity()) return false;
    const activity: LiveActivity = {
      version: LIVE_ACTIVITY_VERSION,
      id: crypto.randomUUID(),
      userId,
      activityType,
      status: 'tracking',
      startedAt,
      stoppedAt: null,
      locationTracking: 'pending',
      currentSegment: 0,
      locations: [],
      trackedDistanceMetres: 0,
      lastCallbackAt: null,
      lastValidSampleAt: null,
      lastAcceptedSampleAt: null,
      rejectionReason: null,
      storageWarning: false,
      completionDraft: null,
    };
    if (!this.setAndPersist(activity)) {
      this.activity.set(null);
      return false;
    }
    this.foreground = true;
    this.resumeGeolocation(false);
    return true;
  }

  stop(stoppedAt = new Date().toISOString()): HikeDraft | null {
    const activity = this.activity();
    if (!activity || activity.status !== 'tracking') return null;
    this.geolocation.stop();
    void this.flushPendingLocations();
    const stopped: LiveActivity = { ...activity, status: 'stopped', stoppedAt };
    stopped.completionDraft = this.toDraft(stopped);
    this.setAndPersist(stopped);
    return stopped.completionDraft;
  }

  retryGeolocation(): void {
    const activity = this.activity();
    if (!activity || activity.status !== 'tracking') return;
    this.foreground = true;
    this.resumeGeolocation(true);
  }

  draft(): HikeDraft | null {
    const activity = this.activity();
    if (activity?.stoppedAt) {
      void this.flushPendingLocations();
      return activity.completionDraft ?? this.toDraft(activity);
    }
    return null;
  }

  markSaving(completionDraft?: HikeDraft): void {
    this.update((activity) => ({
      ...activity,
      status: 'saving',
      completionDraft: completionDraft ?? activity.completionDraft,
    }));
  }

  async withGpsLocations(draft: HikeDraft): Promise<HikeDraft> {
    const activity = this.activity();
    if (!activity) return draft;
    await this.flushPendingLocations();
    let storedLocations: LiveActivityLocation[] = [];
    try {
      storedLocations = await this.locations.read(activity.id);
    } catch (error) {
      this.logger.error('Unable to load tracked locations for activity save', error);
    }
    const gpsLocations = mergeUniqueLocations(storedLocations, this.pendingLocations);
    return gpsLocations.length ? { ...draft, gpsLocations } : draft;
  }

  saveFailed(): void {
    this.update((activity) => ({ ...activity, status: 'stopped' }));
  }

  completeSave(): void {
    const activityId = this.activity()?.id;
    this.geolocation.stop();
    this.clearFlushTimer();
    this.storage.remove();
    const flushed = this.flushPendingLocations();
    void flushed.finally(async () => {
      this.pendingLocations = [];
      this.clearFlushTimer();
      if (activityId) await this.locations.remove(activityId);
    });
    this.persistedLocationCount = 0;
    this.activity.set(null);
    this.error.set(null);
  }

  discard(): void {
    this.completeSave();
  }

  private async restore(userId: string | undefined): Promise<void> {
    this.clearFlushTimer();
    this.pendingLocations = [];
    this.persistedLocationCount = 0;
    const stored = userId ? this.storage.read(userId) : null;
    if (!stored) {
      this.activity.set(null);
      return;
    }
    try {
      const restored =
        stored.version === 1 ? await this.migrate(stored) : await this.restoreLocations(stored);
      const normalized =
        restored.status === 'saving' ? { ...restored, status: 'stopped' as const } : restored;
      this.activity.set(normalized);
      if (restored.status === 'saving') this.storage.write(normalized);
      if (normalized.status === 'tracking' && this.document.visibilityState === 'visible') {
        this.foreground = true;
        this.resumeGeolocation(false);
      }
    } catch (error) {
      this.logger.error('Unable to restore live activity locations', error);
      this.error.set('liveActivity.storageError');
    }
  }

  private async migrate(stored: LegacyLiveActivity): Promise<LiveActivity> {
    const distance = stored.locations.reduce((total, location, index) => {
      const previous = stored.locations[index - 1];
      return !previous || previous.segment !== location.segment
        ? total
        : total + distanceBetweenLocations(previous, location);
    }, 0);
    await this.locations.append(stored.id, stored.locations, 0);
    const last = stored.locations.at(-1);
    const migrated: LiveActivity = {
      ...stored,
      version: LIVE_ACTIVITY_VERSION,
      locations: last ? [last] : [],
      trackedDistanceMetres: distance,
      lastCallbackAt: last?.recordedAt ?? null,
      lastValidSampleAt: last?.recordedAt ?? null,
      lastAcceptedSampleAt: last?.recordedAt ?? null,
      rejectionReason: null,
      storageWarning: false,
    };
    this.persistedLocationCount = stored.locations.length;
    if (!this.storage.write(migrated)) throw new Error('Unable to save migrated activity summary');
    return migrated;
  }

  private async restoreLocations(activity: LiveActivity): Promise<LiveActivity> {
    const restoredLocations = await this.locations.read(activity.id);
    this.persistedLocationCount = restoredLocations.length;
    const last = restoredLocations.at(-1);
    return { ...activity, locations: last ? [last] : [] };
  }

  private toDraft(activity: LiveActivity): HikeDraft {
    const endedAt = activity.stoppedAt ?? new Date().toISOString();
    return {
      activityType: activity.activityType,
      name: activityTypeOption(activity.activityType).defaultName,
      date: localDateFromTimestamp(activity.startedAt),
      minutes: elapsedMinutes(activity.startedAt, endedAt),
      metres:
        activity.activityType === 'hiking' ? Math.round(activity.trackedDistanceMetres) : null,
      people: [],
    };
  }

  private handleBackground(source: string): void {
    const activity = this.activity();
    if (!activity || activity.status !== 'tracking' || !this.foreground) return;
    this.foreground = false;
    this.geolocation.pause();
    this.setLocationStatus('background-limited');
    void this.flushPendingLocations();
    this.logger.info('Live GPS entered background-limited mode', { source });
  }

  private handleForeground(source: string): void {
    const activity = this.activity();
    if (
      !activity ||
      activity.status !== 'tracking' ||
      this.document.visibilityState !== 'visible' ||
      this.foreground
    )
      return;
    this.foreground = true;
    this.logger.info('Live GPS returned to foreground', { source });
    this.resumeGeolocation(true);
  }

  private resumeGeolocation(createSegment: boolean): void {
    if (createSegment) {
      this.update((activity) => ({
        ...activity,
        currentSegment: activity.currentSegment + 1,
        locationTracking: 'pending',
        rejectionReason: null,
      }));
    }
    this.geolocation.start(
      (position) => this.addPosition(position),
      (status) => this.setLocationStatus(status),
    );
  }

  private addPosition(position: GeolocationPosition): void {
    const activity = this.activity();
    if (!activity || activity.status !== 'tracking') return;
    const callbackAt = new Date().toISOString();
    const location: LiveActivityLocation = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: normalizeAltitude(position.coords.altitude),
      altitudeAccuracy: normalizeAltitudeAccuracy(position.coords.altitudeAccuracy),
      recordedAt: new Date(position.timestamp).toISOString(),
      segment: activity.currentSegment,
    };
    const previous = activity.locations.at(-1);
    const rejectionReason = locationRejectionReason(previous, location, activity.activityType);
    const validSample = rejectionReason !== 'coordinates' && rejectionReason !== 'accuracy';
    if (rejectionReason) {
      const status = validSample ? 'active' : 'weak-signal';
      this.setAndPersistIfChanged({
        ...activity,
        locationTracking: status,
        lastCallbackAt: callbackAt,
        lastValidSampleAt: validSample ? location.recordedAt : activity.lastValidSampleAt,
        rejectionReason,
      });
      return;
    }
    if (
      this.persistedLocationCount + this.pendingLocations.length >=
        LIVE_ACTIVITY_MAX_ACCEPTED_SAMPLES ||
      this.pendingLocations.length >= LIVE_ACTIVITY_MAX_PENDING_SAMPLES
    ) {
      this.reportStorageFailure(new Error('Live activity location limit reached'));
      return;
    }
    const addedDistance =
      previous && previous.segment === location.segment
        ? distanceBetweenLocations(previous, location)
        : 0;
    const updated: LiveActivity = {
      ...activity,
      locations: [location],
      trackedDistanceMetres: activity.trackedDistanceMetres + addedDistance,
      locationTracking: 'active',
      lastCallbackAt: callbackAt,
      lastValidSampleAt: location.recordedAt,
      lastAcceptedSampleAt: location.recordedAt,
      rejectionReason: null,
    };
    this.activity.set(updated);
    this.pendingLocations.push(location);
    this.scheduleFlush();
  }

  private setLocationStatus(status: LocationTrackingStatus): void {
    const activity = this.activity();
    if (!activity || activity.status !== 'tracking' || activity.locationTracking === status) return;
    const createsGap = status === 'recovering' || status === 'stale';
    this.setAndPersist({
      ...activity,
      locationTracking: status,
      currentSegment: createsGap ? activity.currentSegment + 1 : activity.currentSegment,
      lastCallbackAt:
        createsGap || status === 'denied' ? new Date().toISOString() : activity.lastCallbackAt,
    });
  }

  private update(update: (activity: LiveActivity) => LiveActivity): void {
    const activity = this.activity();
    if (activity) this.setAndPersist(update(activity));
  }

  private setAndPersistIfChanged(activity: LiveActivity): void {
    const current = this.activity();
    if (
      current?.locationTracking === activity.locationTracking &&
      current.rejectionReason === activity.rejectionReason
    ) {
      this.activity.set(activity);
      return;
    }
    this.setAndPersist(activity);
  }

  private setAndPersist(activity: LiveActivity): boolean {
    this.activity.set(activity);
    const stored = this.storage.write(activity);
    if (!stored) this.reportStorageFailure(new Error('Summary persistence failed'));
    else if (!activity.storageWarning) this.error.set(null);
    return stored;
  }

  private scheduleFlush(): void {
    if (this.flushTimer !== null) return;
    this.flushTimer = window.setTimeout(
      () => void this.flushPendingLocations(),
      LIVE_ACTIVITY_PERSISTENCE_FLUSH_MS,
    );
  }

  private flushPendingLocations(): Promise<void> {
    if (this.flushInFlight) return this.flushInFlight;
    this.flushInFlight = this.performFlush().finally(() => {
      this.flushInFlight = null;
      if (this.pendingLocations.length) this.scheduleFlush();
    });
    return this.flushInFlight;
  }

  private async performFlush(): Promise<void> {
    this.clearFlushTimer();
    const activity = this.activity();
    if (!activity || !this.pendingLocations.length) return;
    const batch = [...this.pendingLocations];
    try {
      await this.locations.append(activity.id, batch, this.persistedLocationCount);
      const current = this.activity();
      if (current?.id === activity.id) {
        const recovered = { ...current, storageWarning: false };
        if (!this.storage.write(recovered)) throw new Error('Summary persistence failed');
        this.activity.set(recovered);
      }
      this.pendingLocations.splice(0, batch.length);
      this.persistedLocationCount += batch.length;
      this.error.set(null);
    } catch (error) {
      this.reportStorageFailure(error);
    }
  }

  private reportStorageFailure(error: unknown): void {
    const activity = this.activity();
    if (activity && !activity.storageWarning)
      this.activity.set({ ...activity, storageWarning: true });
    this.error.set('liveActivity.storageError');
    this.logger.error('Unable to persist live activity locations', error);
  }

  private clearFlushTimer(): void {
    if (this.flushTimer === null) return;
    window.clearTimeout(this.flushTimer);
    this.flushTimer = null;
  }
}
