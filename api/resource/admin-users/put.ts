import type { Response, Router } from 'express';
import { authenticatedUserId, requireAdministrator } from '../../core/auth.js';
import { isDuplicateEntry, withTransaction } from '../../core/database.js';
import { HttpError } from '../../core/http-error.js';
import type { UserRole } from '../../interface/user.interface.js';

export function registerAdminUserPutRoutes(router: Router): void {
  router.put('/admin/users/:id/block', async (request, response) => {
    await updateStatus(request.params['id'] ?? '', 'blocked', response);
  });

  router.put('/admin/users/:id/unblock', async (request, response) => {
    await updateStatus(request.params['id'] ?? '', 'active', response);
  });

  router.put('/admin/users/:id', async (request, response) => {
    requireAdministrator(response);
    const input = adminUserInput(request.body);
    try {
      const user = await withTransaction(async (connection) => {
        const [current] = await connection.query<{
          name: string;
          status: 'active' | 'blocked';
          createdAt: string;
        }[]>(
          `SELECT name, CONCAT(
             DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%s.'),
             LEFT(DATE_FORMAT(created_at, '%f'), 3), 'Z'
           ) AS createdAt, status
             FROM users WHERE id = ? AND status <> 'deleted' FOR UPDATE`,
          [request.params['id']],
        );
        if (!current) throw new HttpError(404, 'User not found');
        await connection.query('UPDATE users SET name = ?, email = ?, role = ? WHERE id = ?', [
          input.name,
          input.email,
          input.role,
          request.params['id'],
        ]);
        if (current.name.toLocaleLowerCase() !== input.name.toLocaleLowerCase()) {
          await connection.query('UPDATE settings SET owner_name = ? WHERE user_id = ?', [
            input.name,
            request.params['id'],
          ]);
          await connection.query(
            `UPDATE activity_people ap
               JOIN activities a ON a.id = ap.activity_id
                SET ap.person_name = ?
              WHERE a.user_id = ? AND LOWER(ap.person_name) = LOWER(?)`,
            [input.name, request.params['id'], current.name],
          );
        }
        return {
          id: request.params['id'],
          ...input,
          status: current.status,
          createdAt: current.createdAt,
        };
      });
      response.json(user);
    } catch (error) {
      if (isDuplicateEntry(error))
        throw new HttpError(409, 'A user is already registered with this email');
      throw error;
    }
  });
}

async function updateStatus(
  userId: string,
  status: 'active' | 'blocked',
  response: Response,
): Promise<void> {
  requireAdministrator(response);
  if (userId === authenticatedUserId(response))
    throw new HttpError(400, 'You cannot block or unblock your own account');
  const result = await withTransaction(async (connection) => {
    const update = await connection.query(
      "UPDATE users SET status = ? WHERE id = ? AND status <> 'deleted'",
      [status, userId],
    );
    if (!update.affectedRows) throw new HttpError(404, 'User not found');
    const [user] = await connection.query(
      `SELECT id, name, email, role, status,
              CONCAT(DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%s.'),
                     LEFT(DATE_FORMAT(created_at, '%f'), 3), 'Z') AS createdAt
         FROM users WHERE id = ?`,
      [userId],
    );
    return user;
  });
  response.json(result);
}

function adminUserInput(value: unknown): { name: string; email: string; role: UserRole } {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new HttpError(400, 'A JSON object is required');
  const body = value as Record<string, unknown>;
  const name = typeof body['name'] === 'string' ? body['name'].trim() : '';
  const email = typeof body['email'] === 'string' ? body['email'].trim().toLowerCase() : '';
  const role = body['role'];
  if (!name) throw new HttpError(400, 'Name is required');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new HttpError(400, 'Valid email is required');
  if (role !== 'normal_user' && role !== 'admin') throw new HttpError(400, 'Valid role is required');
  return { name, email, role };
}
