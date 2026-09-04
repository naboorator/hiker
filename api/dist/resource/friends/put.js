import { authenticatedUserId } from '../../core/auth.js';
import { database } from '../../core/json-database.js';
import { HttpError } from '../../core/http-error.js';
export function registerFriendPutRoutes(router) {
    router.put('/friends/requests/:requestId/accept', async (request, response) => {
        const userId = authenticatedUserId(response);
        const connection = await database.update((data) => {
            const pending = data.friendConnections.find((item) => item.id === request.params['requestId'] && item.status === 'pending');
            if (!pending)
                throw new HttpError(404, 'Friend request not found');
            if (!pending.userIds.includes(userId) || pending.requesterId === userId)
                throw new HttpError(403, 'Only the recipient can approve this friend request');
            pending.status = 'accepted';
            return pending;
        });
        response.json(connection);
    });
}
