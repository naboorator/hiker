export type ActivityReactionType = 'like' | 'slap';

export interface ActivityReaction {
  activityId: string;
  activityOwnerId?: string;
  userId: string;
  type: ActivityReactionType;
  createdAt: string;
}
