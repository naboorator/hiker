import { authenticatedUserId } from '../../core/auth.js';
import { database } from '../../core/database.js';
import { HttpError } from '../../core/http-error.js';
export function registerFriendPutRoutes(router) {
    router.put('/friends/requests/:requestId/accept', async (request, response) => {
        const userId = authenticatedUserId(response);
        const [pending] = await database.query(`SELECT id, user_id_1 AS userId1, user_id_2 AS userId2,
              requester_id AS requesterId, status, CAST(created_at AS CHAR) AS createdAt
         FROM friend_connections WHERE id = ? AND status = 'pending'`, [request.params['requestId']]);
        if (!pending)
            throw new HttpError(404, 'Friend request not found');
        if ((pending.userId1 !== userId && pending.userId2 !== userId) ||
            pending.requesterId === userId)
            throw new HttpError(403, 'Only the recipient can approve this friend request');
        await database.query("UPDATE friend_connections SET status = 'accepted' WHERE id = ?", [
            pending.id,
        ]);
        response.json({
            id: pending.id,
            userIds: [pending.userId1, pending.userId2],
            requesterId: pending.requesterId,
            status: 'accepted',
            createdAt: pending.createdAt,
        });
    });
}
