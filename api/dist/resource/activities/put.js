import { withTransaction } from '../../core/database.js';
import { HttpError } from '../../core/http-error.js';
import { activityInput } from '../../core/validation.js';
import { authenticatedUserId, isAdministrator } from '../../core/auth.js';
import { activitiesWithReactionSummaries, loadActivities, replaceActivityPeople } from '../../core/activity-repository.js';
export function registerActivityPutRoutes(router) {
    router.put('/activities/:id', async (request, response) => {
        const userId = authenticatedUserId(response);
        const administrator = isAdministrator(response);
        const input = activityInput(request.body);
        const id = request.params['id'] ?? '';
        await withTransaction(async (connection) => {
            const result = await connection.query(`UPDATE activities
            SET activity_type = ?, name = ?, activity_date = ?, minutes = ?, metres = ?
          WHERE id = ?${administrator ? '' : ' AND user_id = ?'}`, [
                input.activityType,
                input.name,
                input.date,
                input.minutes,
                input.metres ?? 0,
                id,
                ...(administrator ? [] : [userId]),
            ]);
            if (!result.affectedRows)
                throw new HttpError(404, 'Activity not found');
            await replaceActivityPeople(connection, id, input.people);
        });
        const [activity] = await loadActivities(administrator ? null : userId, { id });
        if (!activity)
            throw new HttpError(404, 'Activity not found');
        response.json((await activitiesWithReactionSummaries([activity]))[0]);
    });
}
