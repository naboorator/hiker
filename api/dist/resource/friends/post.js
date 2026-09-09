import { randomUUID } from 'node:crypto';
import { authenticatedUserId } from '../../core/auth.js';
import { database, isDuplicateEntry } from '../../core/database.js';
import { HttpError } from '../../core/http-error.js';
import { toSqlDateTime } from '../../core/sql-date.js';
export function registerFriendPostRoutes(router) {
    router.post('/friends', async (request, response) => {
        const userId = authenticatedUserId(response);
        const email = typeof request.body?.email === 'string' ? request.body.email.trim().toLowerCase() : '';
        if (!email)
            throw new HttpError(400, 'Friend email is required');
        const [candidate] = await database.query('SELECT id, name, email, role FROM users WHERE email = ?', [email]);
        if (!candidate)
            throw new HttpError(404, 'No registered user was found with this email');
        if (candidate.id === userId)
            throw new HttpError(400, 'You cannot add yourself as a friend');
        const [userId1, userId2] = [userId, candidate.id].sort();
        const connection = {
            id: randomUUID(),
            requesterId: userId,
            createdAt: new Date().toISOString(),
        };
        try {
            await database.query(`INSERT INTO friend_connections
             (id, user_id_1, user_id_2, requester_id, status, created_at)
           VALUES (?, ?, ?, ?, 'pending', ?)`, [connection.id, userId1, userId2, userId, toSqlDateTime(connection.createdAt)]);
        }
        catch (error) {
            if (isDuplicateEntry(error))
                throw new HttpError(409, 'A friend request or connection already exists with this user');
            throw error;
        }
        const { id, name, role } = candidate;
        const requestResult = {
            id: connection.id,
            direction: 'outgoing',
            user: { id, name, email: candidate.email, role },
            createdAt: connection.createdAt,
        };
        response.status(201).json(requestResult);
    });
}
