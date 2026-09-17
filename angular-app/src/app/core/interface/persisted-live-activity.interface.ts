import type { LiveActivity } from './live-activity.interface';

export type PersistedLiveActivity = Omit<LiveActivity, 'locations'>;
