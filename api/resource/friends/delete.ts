import type { Router } from 'express';
import { authenticatedUserId } from '../../core/auth.js';
import { database } from '../../core/database.js';
import { HttpError } from '../../core/http-error.js';

export function registerFriendDeleteRoutes(router: Router): void {
  router.delete('/friends/requests/:requestId', async (request, response) => {
    const userId = authenticatedUserId(response);
    const result = await database.query(
      `DELETE FROM friend_connections
        WHERE id = ? AND status = 'pending' AND (user_id_1 = ? OR user_id_2 = ?)`,
      [request.params['requestId'], userId, userId],
    );
    if (!result.affectedRows) throw new HttpError(404, 'Friend request not found');
    response.status(204).send();
  });

  router.delete('/friends/:friendId', async (request, response) => {
    const userId = authenticatedUserId(response);
    const friendId = request.params['friendId'] ?? '';
    const [userId1, userId2] = [userId, friendId].sort();
    const result = await database.query(
      `DELETE FROM friend_connections
        WHERE user_id_1 = ? AND user_id_2 = ? AND status = 'accepted'`,
      [userId1, userId2],
    );
    if (!result.affectedRows) throw new HttpError(404, 'Friend connection not found');
    response.status(204).send();
  });
}
