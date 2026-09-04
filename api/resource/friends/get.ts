import type { Router } from 'express';
import { authenticatedUserId } from '../../core/auth.js';
import { database } from '../../core/json-database.js';

export function registerFriendGetRoutes(router: Router): void {
  router.get('/friends', async (_request, response) => {
    const userId = authenticatedUserId(response);
    const data = await database.read();
    const friendIds = data.friendConnections.flatMap((connection) =>
      connection.userIds.includes(userId) && connection.status !== 'pending'
        ? connection.userIds.filter((candidate) => candidate !== userId)
        : [],
    );
    response.json(
      data.users
        .filter((user) => friendIds.includes(user.id))
        .map(({ id, name, email, role }) => ({ id, name, email, role }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    );
  });

  router.get('/friends/requests', async (_request, response) => {
    const userId = authenticatedUserId(response);
    const data = await database.read();
    const requests = data.friendConnections
      .filter((connection) => connection.status === 'pending' && connection.userIds.includes(userId))
      .map((connection) => {
        const otherId = connection.userIds.find((id) => id !== userId);
        const other = data.users.find((user) => user.id === otherId);
        return {
          id: connection.id,
          direction: connection.requesterId === userId ? 'outgoing' : 'incoming',
          user: other
            ? { id: other.id, name: other.name, email: other.email, role: other.role }
            : { id: otherId, name: 'Unknown user', email: '', role: 'normal_user' },
          createdAt: connection.createdAt,
        };
      });
    response.json(requests);
  });
}
