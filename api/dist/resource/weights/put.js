import { database } from '../../core/json-database.js';
import { HttpError } from '../../core/http-error.js';
import { weightInput } from '../../core/validation.js';
import { authenticatedUserId } from '../../core/auth.js';
export function registerWeightPutRoutes(router) {
    router.put('/weights/:id', async (request, response) => {
        const userId = authenticatedUserId(response);
        const input = weightInput(request.body);
        const weight = await database.update((data) => {
            const index = data.weights.findIndex(({ id, userId: ownerId }) => id === request.params['id'] && ownerId === userId);
            if (index < 0)
                throw new HttpError(404, 'Weight measurement not found');
            const updated = { ...data.weights[index], ...input };
            data.weights[index] = updated;
            return updated;
        });
        response.json(weight);
    });
}
