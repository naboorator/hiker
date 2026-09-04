import { authenticatedUserId } from '../../core/auth.js';
import { database } from '../../core/json-database.js';
import { reactionTargetsActivity } from '../../core/activity-reaction.js';
export function registerFriendActivityGetRoutes(router) {
    router.get('/friends/activities', async (_request, response) => {
        const userId = authenticatedUserId(response);
        const data = await database.read();
        const friendIds = new Set(data.friendConnections.flatMap((connection) => connection.userIds.includes(userId) && connection.status !== 'pending'
            ? connection.userIds.filter((candidate) => candidate !== userId)
            : []));
        const users = new Map(data.users.map((user) => [user.id, user]));
        response.json(data.activities
            .filter((activity) => activity.userId !== userId && friendIds.has(activity.userId))
            .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
            .map((activity) => {
            const reactions = data.activityReactions.filter((reaction) => reactionTargetsActivity(reaction, activity, data.activities));
            return {
                ...activity,
                author: {
                    id: activity.userId,
                    name: users.get(activity.userId)?.name ?? 'Unknown user',
                },
                likes: reactions.filter((reaction) => reaction.type === 'like').length,
                myReactions: reactions
                    .filter((reaction) => reaction.userId === userId)
                    .map((reaction) => reaction.type),
            };
        }));
    });
}
