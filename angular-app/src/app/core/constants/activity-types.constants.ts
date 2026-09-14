import type { ActivityTypeOption } from '../interface/activity-type-option.interface';

export const ACTIVITY_TYPE_OPTIONS: readonly ActivityTypeOption[] = [
  {
    type: 'hiking',
    translationKey: 'hikeForm.hiking',
    defaultName: '',
    hasCustomName: true,
    hasDistance: true,
  },
  {
    type: 'fitness',
    translationKey: 'hikeForm.fitness',
    defaultName: 'Fitness',
    hasCustomName: false,
    hasDistance: false,
  },
  {
    type: 'cycling',
    translationKey: 'hikeForm.cycling',
    defaultName: 'Cycling',
    hasCustomName: false,
    hasDistance: false,
  },
  {
    type: 'tennis',
    translationKey: 'hikeForm.tennis',
    defaultName: 'Tennis',
    hasCustomName: false,
    hasDistance: false,
  },
  {
    type: 'badminton',
    translationKey: 'hikeForm.badminton',
    defaultName: 'Badminton',
    hasCustomName: false,
    hasDistance: false,
  },
  {
    type: 'table_tennis',
    translationKey: 'hikeForm.tableTennis',
    defaultName: 'Table tennis',
    hasCustomName: false,
    hasDistance: false,
  },
  {
    type: 'construction',
    translationKey: 'hikeForm.construction',
    defaultName: 'Construction work',
    hasCustomName: false,
    hasDistance: false,
  },
  {
    type: 'housework',
    translationKey: 'hikeForm.housework',
    defaultName: 'Housework',
    hasCustomName: false,
    hasDistance: false,
  },
] as const;
