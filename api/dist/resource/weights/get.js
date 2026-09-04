import { database } from '../../core/json-database.js';
import { HttpError } from '../../core/http-error.js';
import { authenticatedUserId } from '../../core/auth.js';
export function registerWeightGetRoutes(router) {
    router.get('/weights', async (_request, response) => {
        const userId = authenticatedUserId(response);
        const weights = (await database.read()).weights.filter((weight) => weight.userId === userId).sort((a, b) => b.recordedOn.localeCompare(a.recordedOn) || b.createdAt.localeCompare(a.createdAt));
        response.json(weights);
    });
    router.get('/weights/:id', async (request, response) => {
        const userId = authenticatedUserId(response);
        const weight = (await database.read()).weights.find(({ id, userId: ownerId }) => id === request.params['id'] && ownerId === userId);
        if (!weight)
            throw new HttpError(404, 'Weight measurement not found');
        response.json(weight);
    });
}
