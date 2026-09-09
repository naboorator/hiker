import { database } from '../../core/database.js';
import { HttpError } from '../../core/http-error.js';
import { authenticatedUserId, isAdministrator } from '../../core/auth.js';
export function registerWeightDeleteRoutes(router) {
    router.delete('/weights/:id', async (request, response) => {
        const userId = authenticatedUserId(response);
        const administrator = isAdministrator(response);
        const result = await database.query(`DELETE FROM weights WHERE id = ?${administrator ? '' : ' AND user_id = ?'}`, [request.params['id'], ...(administrator ? [] : [userId])]);
        if (!result.affectedRows)
            throw new HttpError(404, 'Weight measurement not found');
        response.status(204).send();
    });
}
