import type { ActivityType } from './activity-type.type';

export interface Hike {
  id: string;
  activityType: ActivityType;
  name: string;
  date: string;
  minutes: number;
  metres: number;
  hasGpsLocations?: boolean;
  people: string[];
  createdAt: number;
  likes?: number;
  slaps?: number;
  likedBy?: string[];
  slappedBy?: string[];
  author?: { id: string; name: string };
  myReactions?: ('like' | 'slap')[];
}
