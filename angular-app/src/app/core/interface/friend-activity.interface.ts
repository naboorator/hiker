import type { Hike } from './hike.interface';

export type ActivityReactionType = 'like' | 'slap';

export interface FriendActivity extends Hike {
  author: { id: string; name: string };
  likes: number;
  slaps: number;
  myReactions: ActivityReactionType[];
}
