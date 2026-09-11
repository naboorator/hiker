import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, effect, inject, signal, untracked } from '@angular/core';
import type { ActivityType } from '../interface/activity-type.type';
import type { HikeDraft } from '../interface/hike-draft.interface';
import type { LiveActivity } from '../interface/live-activity.interface';
import type { LiveActivityLocation } from '../interface/live-activity-location.interface';
import type { LocationTrackingStatus } from '../interface/live-activity-status.type';
import { AuthService } from '../auth/auth.service';
import { canAppendLocation, isValidLocation, trackedDistance } from '../utils/geo-distance.helpers';
import { elapsedMinutes, localDateFromTimestamp } from '../utils/live-activity-time.helpers';
import { GeolocationTrackingService } from '../services/geolocation-tracking.service';
import { LiveActivityStorageService } from '../services/live-activity-storage.service';

@Injectable({ providedIn: 'root' })
export class LiveActivityStore {
  private readonly auth = inject(AuthService);
  private readonly storage = inject(LiveActivityStorageService);
  private readonly geolocation = inject(GeolocationTrackingService);
  private readonly document = inject(DOCUMENT);
  readonly activity = signal<LiveActivity | null>(null);
  readonly error = signal<string | null>(null);

  constructor() {
    const visibilityHandler = () => this.handleVisibilityChange();
    this.document.addEventListener('visibilitychange', visibilityHandler);
    inject(DestroyRef).onDestroy(() => {
      this.document.removeEventListener('visibilitychange', visibilityHandler);
      this.geolocation.stop();
    });
    effect(() => {
      const userId = this.auth.user()?.id;
      this.geolocation.stop();
      const stored = userId ? this.storage.read(userId) : null;
      const restored =
        stored?.status === 'saving' ? { ...stored, status: 'stopped' as const } : stored;
      this.activity.set(restored);
      if (stored?.status === 'saving' && restored) this.storage.write(restored);
      if (restored?.status === 'tracking' && this.document.visibilityState === 'visible') {
        untracked(() => this.resumeGeolocation(false));
      }
    });
  }

  start(activityType: ActivityType, startedAt = new Date().toISOString()): boolean {
    const userId = this.auth.user()?.id;
    if (!userId || this.activity()) return false;
    const activity: LiveActivity = {
      version: 1,
      id: crypto.randomUUID(),
      userId,
      activityType,
      status: 'tracking',
      startedAt,
      stoppedAt: null,
      locationTracking: 'pending',
      currentSegment: 0,
      locations: [],
      completionDraft: null,
    };
    if (!this.setAndPersist(activity)) {
      this.activity.set(null);
      return false;
    }
    this.resumeGeolocation(false);
    return true;
  }

  stop(stoppedAt = new Date().toISOString()): HikeDraft | null {
    const activity = this.activity();
    if (!activity || activity.status !== 'tracking') return null;
    this.geolocation.stop();
    const stopped: LiveActivity = { ...activity, status: 'stopped', stoppedAt };
    stopped.completionDraft = this.toDraft(stopped);
    this.setAndPersist(stopped);
    return stopped.completionDraft;
  }

  draft(): HikeDraft | null {
    const activity = this.activity();
    return activity?.stoppedAt ? (activity.completionDraft ?? this.toDraft(activity)) : null;
  }

  markSaving(completionDraft?: HikeDraft): void {
    this.update((activity) => ({
      ...activity,
      status: 'saving',
      completionDraft: completionDraft ?? activity.completionDraft,
    }));
  }

  saveFailed(): void {
    this.update((activity) => ({ ...activity, status: 'stopped' }));
  }

  completeSave(): void {
    this.geolocation.stop();
    this.storage.remove();
    this.activity.set(null);
    this.error.set(null);
  }

  discard(): void {
    this.completeSave();
  }

  private toDraft(activity: LiveActivity): HikeDraft {
    const endedAt = activity.stoppedAt ?? new Date().toISOString();
    return {
      activityType: activity.activityType,
      name: activity.activityType === 'fitness' ? 'Fitness' : '',
      date: localDateFromTimestamp(activity.startedAt),
      minutes: elapsedMinutes(activity.startedAt, endedAt),
      metres:
        activity.activityType === 'hiking' ? Math.round(trackedDistance(activity.locations)) : null,
      people: [],
    };
  }

  private handleVisibilityChange(): void {
    const activity = this.activity();
    if (!activity || activity.status !== 'tracking') return;
    if (this.document.visibilityState === 'hidden') {
      this.geolocation.stop();
      this.update((current) => ({ ...current, locationTracking: 'background-limited' }));
      return;
    }
    this.resumeGeolocation(true);
  }

  private resumeGeolocation(createSegment: boolean): void {
    if (createSegment) {
      this.update((activity) => ({
        ...activity,
        currentSegment: activity.currentSegment + 1,
        locationTracking: 'pending',
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
    const location: LiveActivityLocation = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      recordedAt: new Date(position.timestamp).toISOString(),
      segment: activity.currentSegment,
    };
    if (!isValidLocation(location, activity.activityType)) {
      this.setLocationStatus('weak-signal');
      return;
    }
    this.setLocationStatus('active');
    if (!canAppendLocation(activity.locations.at(-1), location, activity.activityType)) return;
    const current = this.activity();
    if (current) this.setAndPersist({ ...current, locations: [...current.locations, location] });
  }

  private setLocationStatus(status: LocationTrackingStatus): void {
    this.update((activity) =>
      activity.status === 'tracking' ? { ...activity, locationTracking: status } : activity,
    );
  }

  private update(update: (activity: LiveActivity) => LiveActivity): void {
    const activity = this.activity();
    if (activity) this.setAndPersist(update(activity));
  }

  private setAndPersist(activity: LiveActivity): boolean {
    this.activity.set(activity);
    const stored = this.storage.write(activity);
    this.error.set(stored ? null : 'liveActivity.storageError');
    return stored;
  }
}
