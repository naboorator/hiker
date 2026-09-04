import { database } from '../../core/json-database.js';
import { HttpError } from '../../core/http-error.js';
import { authenticatedUserId } from '../../core/auth.js';
import { activityLikeSummary } from '../../core/activity-reaction.js';
export function registerActivityGetRoutes(router) {
    router.get('/activities', async (request, response) => {
        const userId = authenticatedUserId(response);
        const data = await database.read();
        const date = typeof request.query['date'] === 'string' ? request.query['date'] : null;
        const month = typeof request.query['month'] === 'string' ? request.query['month'] : null;
        const result = data.activities
            .filter((activity) => activity.userId === userId &&
            (!date || activity.date === date) && (!month || activity.date.startsWith(month)))
            .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
            .map((activity) => ({
            ...activity,
            ...activityLikeSummary(activity, data),
        }));
        response.json(result);
    });
    router.get('/activities/:id', async (request, response) => {
        const userId = authenticatedUserId(response);
        const data = await database.read();
        const activity = data.activities.find(({ id, userId: ownerId }) => id === request.params['id'] && ownerId === userId);
        if (!activity)
            throw new HttpError(404, 'Activity not found');
        response.json({
            ...activity,
            ...activityLikeSummary(activity, data),
        });
    });
}
