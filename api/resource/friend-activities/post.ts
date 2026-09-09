import type { Router } from 'express';
import { authenticatedUserId } from '../../core/auth.js';
import { database } from '../../core/database.js';
import { HttpError } from '../../core/http-error.js';
import type { ActivityReactionType } from '../../interface/activity-reaction.interface.js';

export function registerFriendActivityPostRoutes(router: Router): void {
  router.post('/friends/activities/:activityId/reactions', async (request, response) => {
    const userId = authenticatedUserId(response);
    const activityId = request.params['activityId'] ?? '';
    const type = request.body?.type;
    if (type !== 'like' && type !== 'slap')
      throw new HttpError(400, 'Reaction must be like or slap');
    const [activity] = await database.query<{ userId: string }[]>(
      `SELECT a.user_id AS userId
         FROM activities a
         JOIN friend_connections f
           ON f.status = 'accepted'
          AND ((f.user_id_1 = ? AND f.user_id_2 = a.user_id)
            OR (f.user_id_2 = ? AND f.user_id_1 = a.user_id))
        WHERE a.id = ? AND a.user_id <> ?`,
      [userId, userId, activityId, userId],
    );
      if (!activity) throw new HttpError(404, 'Activity not found');
    const reaction = {
        activityId,
        activityOwnerId: activity.userId,
        userId,
        type: type as ActivityReactionType,
        createdAt: new Date().toISOString(),
      };
    const result = await database.query(
      `INSERT IGNORE INTO activity_reactions (activity_id, user_id, reaction_type)
       VALUES (?, ?, ?)`,
      [activityId, userId, type],
    );
    response.status(result.affectedRows ? 201 : 200).json(reaction);
  });
}
