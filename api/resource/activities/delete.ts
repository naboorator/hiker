import type { Router } from 'express';
import { database } from '../../core/json-database.js';
import { HttpError } from '../../core/http-error.js';
import { authenticatedUserId } from '../../core/auth.js';
import { reactionTargetsActivity } from '../../core/activity-reaction.js';

export function registerActivityDeleteRoutes(router: Router): void {
  router.delete('/activities/:id', async (request, response) => {
    const userId = authenticatedUserId(response);
    await database.update((data) => {
      const index = data.activities.findIndex(
        ({ id, userId: ownerId }) => id === request.params['id'] && ownerId === userId,
      );
      if (index < 0) throw new HttpError(404, 'Activity not found');
      const allActivities = [...data.activities];
      const [removed] = data.activities.splice(index, 1);
      if (removed)
        data.activityReactions = data.activityReactions.filter(
          (reaction) => !reactionTargetsActivity(reaction, removed, allActivities),
        );
    });
    response.status(204).send();
  });
}
