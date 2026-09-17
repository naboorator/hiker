import type { ActivityType } from './activity-type.type';
import type { HikeDraft } from './hike-draft.interface';
import type { LiveActivityLocation } from './live-activity-location.interface';
import type { LiveActivityStatus, LocationTrackingStatus } from './live-activity-status.type';

export interface LegacyLiveActivity {
  version: 1;
  id: string;
  userId: string;
  activityType: ActivityType;
  status: LiveActivityStatus;
  startedAt: string;
  stoppedAt: string | null;
  locationTracking: LocationTrackingStatus;
  currentSegment: number;
  locations: LiveActivityLocation[];
  completionDraft: HikeDraft | null;
}
