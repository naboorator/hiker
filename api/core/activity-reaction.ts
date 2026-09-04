import type { ActivityReaction } from '../interface/activity-reaction.interface.js';
import type { Activity } from '../interface/activity.interface.js';
import type { DatabaseSchema } from '../interface/database.interface.js';

export function reactionTargetsActivity(
  reaction: ActivityReaction,
  activity: Activity,
  activities: Activity[],
): boolean {
  if (reaction.activityId !== activity.id) return false;
  if (reaction.activityOwnerId) return reaction.activityOwnerId === activity.userId;

  const possibleOwnerIds = new Set(
    activities
      .filter(
        (candidate) =>
          candidate.id === reaction.activityId &&
          candidate.userId &&
          candidate.userId !== reaction.userId,
      )
      .map((candidate) => candidate.userId),
  );
  return possibleOwnerIds.size === 1 && possibleOwnerIds.has(activity.userId);
}

export function activityLikeSummary(
  activity: Activity,
  data: DatabaseSchema,
): { likes: number; likedBy: string[]; slaps: number; slappedBy: string[] } {
  const activityReactions = data.activityReactions.filter((reaction) =>
    reactionTargetsActivity(reaction, activity, data.activities),
  );
  const reactions = activityReactions
    .filter((reaction) => reaction.type === 'like')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const slapReactions = activityReactions
    .filter((reaction) => reaction.type === 'slap')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const users = new Map(data.users.map((user) => [user.id, user.name]));
  return {
    likes: reactions.length,
    slaps: slapReactions.length,
    likedBy: reactions
      .map((reaction) => users.get(reaction.userId))
      .filter((name): name is string => Boolean(name))
      .slice(0, 3),
    slappedBy: slapReactions
      .map((reaction) => users.get(reaction.userId))
      .filter((name): name is string => Boolean(name))
      .slice(0, 3),
  };
}
