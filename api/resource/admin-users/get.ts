import type { Router } from 'express';
import { requireAdministrator } from '../../core/auth.js';
import { database } from '../../core/database.js';
import { HttpError } from '../../core/http-error.js';
import { activitiesWithReactionSummaries, attachPeople } from '../../core/activity-repository.js';
import type { Activity } from '../../interface/activity.interface.js';

const defaultPageSize = 10;
const maximumPageSize = 50;

export function registerAdminUserGetRoutes(router: Router): void {
  router.get('/admin/users/:id/activities', async (request, response) => {
    requireAdministrator(response);
    const userId = request.params['id'] ?? '';
    const [user] = await database.query<{ id: string }[]>(
      'SELECT id FROM users WHERE id = ?',
      [userId],
    );
    if (!user) throw new HttpError(404, 'User not found');
    const page = positiveInteger(request.query['page'], 1);
    const pageSize = Math.min(
      positiveInteger(request.query['pageSize'], defaultPageSize),
      maximumPageSize,
    );
    const [count] = await database.query<{ total: number }[]>(
      'SELECT COUNT(*) AS total FROM activities WHERE user_id = ?',
      [userId],
    );
    const total = Number(count?.total ?? 0);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const normalizedPage = Math.min(page, totalPages);
    const rows = await database.query<Omit<Activity, 'people'>[]>(
      `SELECT id, user_id AS userId, activity_type AS activityType, name,
              CAST(activity_date AS CHAR) AS date, minutes, metres, created_at AS createdAt
         FROM activities
        WHERE user_id = ?
        ORDER BY activity_date DESC, created_at DESC
        LIMIT ? OFFSET ?`,
      [userId, pageSize, (normalizedPage - 1) * pageSize],
    );
    const activities = await attachPeople(rows);
    response.json({
      items: await activitiesWithReactionSummaries(activities),
      page: normalizedPage,
      pageSize,
      total,
      totalPages,
    });
  });

  router.get('/admin/users/:id', async (request, response) => {
    requireAdministrator(response);
    const [user] = await database.query(
      `SELECT id, name, email, role, status,
              CONCAT(
                DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%s.'),
                LEFT(DATE_FORMAT(created_at, '%f'), 3),
                'Z'
              ) AS createdAt
         FROM users WHERE id = ? AND status <> 'deleted'`,
      [request.params['id']],
    );
    if (!user) throw new HttpError(404, 'User not found');
    response.json(user);
  });

  router.get('/admin/users', async (request, response) => {
    requireAdministrator(response);
    const page = positiveInteger(request.query['page'], 1);
    const pageSize = Math.min(positiveInteger(request.query['pageSize'], defaultPageSize), maximumPageSize);
    const search = typeof request.query['search'] === 'string' ? request.query['search'].trim().slice(0, 320) : '';
    const searchClause = search ? ' AND (LOCATE(?, name) > 0 OR LOCATE(?, email) > 0)' : '';
    const searchValues = search ? [search, search] : [];
    const [count] = await database.query<{ total: number }[]>(
      `SELECT COUNT(*) AS total
         FROM users
        WHERE status <> 'deleted'${searchClause}`,
      searchValues,
    );
    const total = Number(count?.total ?? 0);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const normalizedPage = Math.min(page, totalPages);
    const offset = (normalizedPage - 1) * pageSize;
    const items = await database.query(
      `SELECT id, name, email, role, status,
              CONCAT(
                DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%s.'),
                LEFT(DATE_FORMAT(created_at, '%f'), 3),
                'Z'
              ) AS createdAt
         FROM users
        WHERE status <> 'deleted'${searchClause}
        ORDER BY created_at DESC, id DESC
        LIMIT ? OFFSET ?`,
      [...searchValues, pageSize, offset],
    );
    response.json({ items, page: normalizedPage, pageSize, total, totalPages });
  });
}

function positiveInteger(value: unknown, fallback: number): number {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}
