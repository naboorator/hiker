import { randomUUID } from 'node:crypto';
import { authenticatedUserId } from '../../core/auth.js';
import { database } from '../../core/json-database.js';
import { HttpError } from '../../core/http-error.js';
export function registerFriendPostRoutes(router) {
    router.post('/friends', async (request, response) => {
        const userId = authenticatedUserId(response);
        const email = typeof request.body?.email === 'string' ? request.body.email.trim().toLowerCase() : '';
        if (!email)
            throw new HttpError(400, 'Friend email is required');
        const requestResult = await database.update((data) => {
            const candidate = data.users.find((user) => user.email.toLowerCase() === email);
            if (!candidate)
                throw new HttpError(404, 'No registered user was found with this email');
            if (candidate.id === userId)
                throw new HttpError(400, 'You cannot add yourself as a friend');
            if (data.friendConnections.some((connection) => connection.userIds.includes(userId) && connection.userIds.includes(candidate.id)))
                throw new HttpError(409, 'A friend request or connection already exists with this user');
            const connection = {
                id: randomUUID(),
                userIds: [userId, candidate.id],
                requesterId: userId,
                status: 'pending',
                createdAt: new Date().toISOString(),
            };
            data.friendConnections.push(connection);
            const { id, name, role } = candidate;
            return {
                id: connection.id,
                direction: 'outgoing',
                user: { id, name, email: candidate.email, role },
                createdAt: connection.createdAt,
            };
        });
        response.status(201).json(requestResult);
    });
}
