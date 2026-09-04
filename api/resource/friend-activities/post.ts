import type { Router } from 'express';
import { authenticatedUserId } from '../../core/auth.js';
import { database } from '../../core/json-database.js';
import { HttpError } from '../../core/http-error.js';
import type { ActivityReactionType } from '../../interface/activity-reaction.interface.js';
import { reactionTargetsActivity } from '../../core/activity-reaction.js';

export function registerFriendActivityPostRoutes(router: Router): void {
  router.post('/friends/activities/:activityId/reactions', async (request, response) => {
    const userId = authenticatedUserId(response);
    const activityId = request.params['activityId'] ?? '';
    const type = request.body?.type;
    if (type !== 'like' && type !== 'slap')
      throw new HttpError(400, 'Reaction must be like or slap');
    const created = await database.update((data) => {
      const friendIds = new Set(
        data.friendConnections.flatMap((connection) =>
          connection.userIds.includes(userId) && connection.status !== 'pending'
            ? connection.userIds.filter((candidate) => candidate !== userId)
            : [],
        ),
      );
      const activity = data.activities.find(
        (candidate) => candidate.id === activityId && friendIds.has(candidate.userId),
      );
      if (!activity) throw new HttpError(404, 'Activity not found');
      const existing = data.activityReactions.find(
        (reaction) =>
          reaction.userId === userId &&
          reaction.type === type &&
          reactionTargetsActivity(reaction, activity, data.activities),
      );
      if (existing) return existing;
      const reaction = {
        activityId,
        activityOwnerId: activity.userId,
        userId,
        type: type as ActivityReactionType,
        createdAt: new Date().toISOString(),
      };
      data.activityReactions.push(reaction);
      return reaction;
    });
    response.status(201).json(created);
  });
}
