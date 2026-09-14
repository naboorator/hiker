import type { ActivityType } from './activity-type.type';

export interface ActivityTypeOption {
  type: ActivityType;
  translationKey: string;
  defaultName: string;
  hasCustomName: boolean;
  hasDistance: boolean;
}
