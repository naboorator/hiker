import { Injectable, inject } from '@angular/core';
import {
  LIVE_ACTIVITY_STORAGE_KEY,
  LIVE_ACTIVITY_VERSION,
} from '../constants/live-activity.constants';
import type { LiveActivity } from '../interface/live-activity.interface';
import { isActivityType } from '../utils/activity-type.helpers';
import { LogWrapper } from '../logging/log-wrapper.service';

@Injectable({ providedIn: 'root' })
export class LiveActivityStorageService {
  private readonly logger = inject(LogWrapper);

  read(userId: string): LiveActivity | null {
    const stored = localStorage.getItem(LIVE_ACTIVITY_STORAGE_KEY);
    if (!stored) return null;
    try {
      const activity = JSON.parse(stored) as Partial<LiveActivity>;
      if (
        activity.version !== LIVE_ACTIVITY_VERSION ||
        activity.userId !== userId ||
        typeof activity.id !== 'string' ||
        !isActivityType(activity.activityType) ||
        !['tracking', 'stopped', 'saving'].includes(activity.status ?? '') ||
        typeof activity.startedAt !== 'string' ||
        !Number.isFinite(Date.parse(activity.startedAt)) ||
        (activity.stoppedAt !== null && typeof activity.stoppedAt !== 'string') ||
        typeof activity.currentSegment !== 'number' ||
        !Array.isArray(activity.locations)
      ) {
        return null;
      }
      return activity as LiveActivity;
    } catch (error) {
      this.logger.error('Unable to read the live activity from local storage', error);
      localStorage.removeItem(LIVE_ACTIVITY_STORAGE_KEY);
      return null;
    }
  }

  write(activity: LiveActivity): boolean {
    try {
      localStorage.setItem(LIVE_ACTIVITY_STORAGE_KEY, JSON.stringify(activity));
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
