import type { ActivityType } from './activity-type.type';
import type { LiveActivityLocation } from './live-activity-location.interface';
import type {
  LiveActivityStatus,
  LocationRejectionReason,
  LocationTrackingStatus,
} from './live-activity-status.type';
import type { HikeDraft } from './hike-draft.interface';

export interface LiveActivity {
  version: 2;
  id: string;
  userId: string;
  activityType: ActivityType;
  status: LiveActivityStatus;
  startedAt: string;
  stoppedAt: string | null;
  locationTracking: LocationTrackingStatus;
  currentSegment: number;
  locations: LiveActivityLocation[];
  trackedDistanceMetres: number;
  lastCallbackAt: string | null;
  lastValidSampleAt: string | null;
  lastAcceptedSampleAt: string | null;
  rejectionReason: LocationRejectionReason;
  storageWarning: boolean;
  completionDraft: HikeDraft | null;
}
