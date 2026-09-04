import type { Router } from 'express';
import { database } from '../../core/json-database.js';
import { HttpError } from '../../core/http-error.js';
import { weightInput } from '../../core/validation.js';
import type { Weight } from '../../interface/weight.interface.js';
import { authenticatedUserId } from '../../core/auth.js';

export function registerWeightPutRoutes(router: Router): void {
  router.put('/weights/:id', async (request, response) => {
    const userId = authenticatedUserId(response);
    const input = weightInput(request.body);
    const weight = await database.update((data) => {
      const index = data.weights.findIndex(
        ({ id, userId: ownerId }) => id === request.params['id'] && ownerId === userId,
      );
      if (index < 0) throw new HttpError(404, 'Weight measurement not found');
      const updated: Weight = { ...(data.weights[index] as Weight), ...input };
      data.weights[index] = updated;
      return updated;
    });
    response.json(weight);
  });
}
