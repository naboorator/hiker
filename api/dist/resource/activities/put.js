import { database } from '../../core/json-database.js';
import { HttpError } from '../../core/http-error.js';
import { activityInput } from '../../core/validation.js';
import { authenticatedUserId } from '../../core/auth.js';
import { activityLikeSummary } from '../../core/activity-reaction.js';
export function registerActivityPutRoutes(router) {
    router.put('/activities/:id', async (request, response) => {
        const userId = authenticatedUserId(response);
        const input = activityInput(request.body);
        const activity = await database.update((data) => {
            const index = data.activities.findIndex(({ id, userId: ownerId }) => id === request.params['id'] && ownerId === userId);
            if (index < 0)
                throw new HttpError(404, 'Activity not found');
            const current = data.activities[index];
            const updated = { ...current, ...input, metres: input.metres ?? 0 };
            data.activities[index] = updated;
            return updated;
        });
        const data = await database.read();
        response.json({
            ...activity,
            ...activityLikeSummary(activity, data),
        });
    });
}
