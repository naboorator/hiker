import { database } from '../../core/json-database.js';
import { HttpError } from '../../core/http-error.js';
import { authenticatedUserId } from '../../core/auth.js';
export function registerWeightDeleteRoutes(router) {
    router.delete('/weights/:id', async (request, response) => {
        const userId = authenticatedUserId(response);
        await database.update((data) => {
            const index = data.weights.findIndex(({ id, userId: ownerId }) => id === request.params['id'] && ownerId === userId);
            if (index < 0)
                throw new HttpError(404, 'Weight measurement not found');
            data.weights.splice(index, 1);
        });
        response.status(204).send();
    });
}
