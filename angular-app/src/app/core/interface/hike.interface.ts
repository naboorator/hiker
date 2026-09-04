import type { ActivityType } from './activity-type.type';

export interface Hike {
  id: string;
  activityType: ActivityType;
  name: string;
  date: string;
  minutes: number;
  metres: number;
  people: string[];
  createdAt: number;
  likes?: number;
  slaps?: number;
  likedBy?: string[];
  slappedBy?: string[];
}
