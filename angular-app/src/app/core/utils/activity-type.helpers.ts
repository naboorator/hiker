import { ACTIVITY_TYPE_OPTIONS } from '../constants/activity-types.constants';
import type { ActivityType } from '../interface/activity-type.type';
import type { ActivityTypeOption } from '../interface/activity-type-option.interface';

export function activityTypeOption(type: ActivityType): ActivityTypeOption {
  return ACTIVITY_TYPE_OPTIONS.find((option) => option.type === type) ?? ACTIVITY_TYPE_OPTIONS[0];
}

export function isActivityType(value: unknown): value is ActivityType {
  return ACTIVITY_TYPE_OPTIONS.some((option) => option.type === value);
}
