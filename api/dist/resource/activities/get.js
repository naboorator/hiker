import { HttpError } from '../../core/http-error.js';
import { authenticatedUserId, isAdministrator } from '../../core/auth.js';
import { activitiesWithReactionSummaries, loadActivities } from '../../core/activity-repository.js';
export function registerActivityGetRoutes(router) {
    router.get('/activities', async (request, response) => {
        const userId = authenticatedUserId(response);
        const date = typeof request.query['date'] === 'string' ? request.query['date'] : null;
        const month = typeof request.query['month'] === 'string' ? request.query['month'] : null;
        const activities = await loadActivities(userId, {
            date: date ?? undefined,
            month: month ?? undefined,
        });
        response.json(await activitiesWithReactionSummaries(activities));
    });
    router.get('/activities/:id', async (request, response) => {
        const userId = authenticatedUserId(response);
        const [activity] = await loadActivities(isAdministrator(response) ? null : userId, {
            id: request.params['id'],
        });
        if (!activity)
            throw new HttpError(404, 'Activity not found');
        response.json((await activitiesWithReactionSummaries([activity]))[0]);
    });
}
