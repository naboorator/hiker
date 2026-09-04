import type { Router } from 'express';
import { authenticatedUserId } from '../../core/auth.js';
import { database } from '../../core/json-database.js';
import { HttpError } from '../../core/http-error.js';

export function registerFriendDeleteRoutes(router: Router): void {
  router.delete('/friends/requests/:requestId', async (request, response) => {
    const userId = authenticatedUserId(response);
    await database.update((data) => {
      const index = data.friendConnections.findIndex(
        (connection) =>
          connection.id === request.params['requestId'] &&
          connection.status === 'pending' &&
          connection.userIds.includes(userId),
      );
      if (index < 0) throw new HttpError(404, 'Friend request not found');
      data.friendConnections.splice(index, 1);
    });
    response.status(204).send();
  });

  router.delete('/friends/:friendId', async (request, response) => {
    const userId = authenticatedUserId(response);
    await database.update((data) => {
      const index = data.friendConnections.findIndex(
        (connection) =>
          connection.userIds.includes(userId) &&
          connection.status !== 'pending' &&
          connection.userIds.includes(request.params['friendId'] ?? ''),
      );
      if (index < 0) throw new HttpError(404, 'Friend connection not found');
      data.friendConnections.splice(index, 1);
    });
    response.status(204).send();
  });
}
