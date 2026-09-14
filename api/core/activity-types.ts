import type { ActivityType } from '../interface/activity.interface.js';

export const activityTypeNames: Readonly<Record<ActivityType, string>> = {
  hiking: '',
  fitness: 'Fitness',
  cycling: 'Cycling',
  tennis: 'Tennis',
  badminton: 'Badminton',
  table_tennis: 'Table tennis',
  construction: 'Construction work',
  housework: 'Housework',
};

export function isActivityType(value: unknown): value is ActivityType {
  return typeof value === 'string' && Object.hasOwn(activityTypeNames, value);
}
