import { Injectable, inject } from '@angular/core';
import {
  LIVE_ACTIVITY_STORAGE_KEY,
  LIVE_ACTIVITY_VERSION,
} from '../constants/live-activity.constants';
import type { LiveActivity } from '../interface/live-activity.interface';
import type { LegacyLiveActivity } from '../interface/legacy-live-activity.interface';
import { isActivityType } from '../utils/activity-type.helpers';
import { LogWrapper } from '../logging/log-wrapper.service';

@Injectable({ providedIn: 'root' })
export class LiveActivityStorageService {
  private readonly logger = inject(LogWrapper);

  read(userId: string): LiveActivity | LegacyLiveActivity | null {
    const stored = localStorage.getItem(LIVE_ACTIVITY_STORAGE_KEY);
    if (!stored) return null;
    try {
      const activity = JSON.parse(stored) as Partial<LiveActivity | LegacyLiveActivity>;
      if (
        (activity.version !== LIVE_ACTIVITY_VERSION && activity.version !== 1) ||
        activity.userId !== userId ||
        typeof activity.id !== 'string' ||
        !isActivityType(activity.activityType) ||
        !['tracking', 'stopped', 'saving'].includes(activity.status ?? '') ||
        typeof activity.startedAt !== 'string' ||
        !Number.isFinite(Date.parse(activity.startedAt)) ||
        (activity.stoppedAt !== null && typeof activity.stoppedAt !== 'string') ||
        typeof activity.currentSegment !== 'number' ||
        (activity.version === 1 && !Array.isArray(activity.locations))
      ) {
        return null;
      }
      if (activity.version === 1) return activity as LegacyLiveActivity;
      return { ...(activity as LiveActivity), locations: [] };
    } catch (error) {
      this.logger.error('Unable to read the live activity from local storage', error);
      localStorage.removeItem(LIVE_ACTIVITY_STORAGE_KEY);
      return null;
    }
  }

  write(activity: LiveActivity): boolean {
    try {
      localStorage.setItem(
        LIVE_ACTIVITY_STORAGE_KEY,
        JSON.stringify({ ...activity, locations: undefined }),
      );
      return true;
    } catch (error) {
      this.logger.error('Unable to save the live activity to local storage', error);
      return false;
    }
  }

  remove(): void {
    localStorage.removeItem(LIVE_ACTIVITY_STORAGE_KEY);
  }
}
