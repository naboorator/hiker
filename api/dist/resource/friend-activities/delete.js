import { authenticatedUserId } from '../../core/auth.js';
import { database } from '../../core/json-database.js';
import { HttpError } from '../../core/http-error.js';
import { reactionTargetsActivity } from '../../core/activity-reaction.js';
export function registerFriendActivityDeleteRoutes(router) {
    router.delete('/friends/activities/:activityId/reactions/:type', async (request, response) => {
        const userId = authenticatedUserId(response);
        if (request.params['type'] !== 'like')
            throw new HttpError(400, 'Reaction must be like');
        await database.update((data) => {
            const friendIds = new Set(data.friendConnections.flatMap((connection) => connection.userIds.includes(userId) && connection.status !== 'pending'
                ? connection.userIds.filter((candidate) => candidate !== userId)
                : []));
            const activity = data.activities.find((candidate) => candidate.id === request.params['activityId'] && friendIds.has(candidate.userId));
            if (!activity)
                throw new HttpError(404, 'Activity not found');
            const index = data.activityReactions.findIndex((reaction) => reaction.userId === userId &&
                reaction.type === request.params['type'] &&
                reactionTargetsActivity(reaction, activity, data.activities));
            if (index < 0)
                throw new HttpError(404, 'Reaction not found');
            data.activityReactions.splice(index, 1);
        });
        response.status(204).send();
    });
}
