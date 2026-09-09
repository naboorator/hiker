import { randomUUID } from 'node:crypto';
import type { Router } from 'express';
import { authenticatedUserId } from '../../core/auth.js';
import { withTransaction } from '../../core/database.js';
import { HttpError } from '../../core/http-error.js';
import { toSqlDateTime } from '../../core/sql-date.js';
import { activityInput, settingsInput, weightInput } from '../../core/validation.js';
import { replaceActivityPeople } from '../../core/activity-repository.js';
import type { Activity } from '../../interface/activity.interface.js';
import type { Weight } from '../../interface/weight.interface.js';

export function registerBackupPostRoutes(router: Router): void {
  router.post('/backup/import', async (request, response) => {
    const userId = authenticatedUserId(response);
    const payload = backupPayload(request.body);
    const result = await withTransaction(async (connection) => {
      let importedActivities = 0;
      let skippedActivities = 0;
      let importedWeights = 0;
      let skippedWeights = 0;

      if (payload.settings) {
        const settings = settingsInput(payload.settings);
        const [user] = await connection.query<{ name: string }[]>(
          'SELECT name FROM users WHERE id = ? FOR UPDATE',
          [userId],
        );
        if (!user) throw new HttpError(404, 'User not found');
        await connection.query('UPDATE users SET name = ? WHERE id = ?', [
          settings.ownerName,
          userId,
        ]);
        await connection.query(
          `UPDATE activity_people p
             JOIN activities a ON a.id = p.activity_id
              SET p.person_name = ?
            WHERE a.user_id = ? AND LOWER(p.person_name) = LOWER(?)`,
          [settings.ownerName, userId, user.name],
        );
        await connection.query(
          `INSERT INTO settings (user_id, app_name, owner_name) VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE app_name = VALUES(app_name), owner_name = VALUES(owner_name)`,
          [userId, settings.appName, settings.ownerName],
        );
      }

      for (const candidate of payload.activities) {
        try {
          const source = candidate as Partial<Activity>;
          const input = activityInput(source);
          if (input.minutes <= 0) throw new HttpError(400, 'Activity duration must be positive');
          const existing = await connection.query<{ id: string }[]>(
            `SELECT id FROM activities
              WHERE user_id = ? AND activity_type = ? AND name = ? AND activity_date = ?
                AND minutes = ? AND metres = ?
              LIMIT 1`,
            [
              userId,
              input.activityType,
              input.name,
              input.date,
              input.minutes,
              input.metres ?? 0,
            ],
          );
          if (existing.length) {
            skippedActivities++;
            continue;
          }
          const id = randomUUID();
          await connection.query(
            `INSERT INTO activities
               (id, user_id, activity_type, name, activity_date, minutes, metres, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              id,
              userId,
              input.activityType,
              input.name,
              input.date,
              input.minutes,
              input.metres ?? 0,
              validTimestamp((source as Partial<Activity>).createdAt),
            ],
          );
          await replaceActivityPeople(connection, id, input.people);
          importedActivities++;
        } catch (error) {
          if (!(error instanceof HttpError && error.status === 400)) throw error;
          skippedActivities++;
        }
      }

      for (const candidate of payload.weights) {
        try {
          const source = candidate as Partial<Weight>;
          const input = weightInput(source);
          const existing = await connection.query<{ id: string }[]>(
            `SELECT id FROM weights
              WHERE user_id = ? AND weight_kg = ? AND recorded_on = ?
              LIMIT 1`,
            [userId, input.weightKg, input.recordedOn],
          );
          if (existing.length) {
            skippedWeights++;
            continue;
          }
          await connection.query(
            `INSERT INTO weights (id, user_id, weight_kg, recorded_on, created_at)
             VALUES (?, ?, ?, ?, ?)`,
            [
              randomUUID(),
              userId,
              input.weightKg,
              input.recordedOn,
              toSqlDateTime(source.createdAt ?? new Date()),
            ],
          );
          importedWeights++;
        } catch (error) {
          if (!(error instanceof HttpError && error.status === 400)) throw error;
          skippedWeights++;
        }
      }

      return {
        importedActivities,
        skippedActivities,
        importedWeights,
        skippedWeights,
        settingsImported: Boolean(payload.settings),
      };
    });
    response.json(result);
  });
}

function backupPayload(value: unknown): {
  settings: { appName: string; ownerName: string } | null;
  activities: unknown[];
  weights: unknown[];
} {
  if (!value || typeof value !== 'object') throw new HttpError(400, 'Invalid backup file');
  const source = value as Record<string, unknown>;
  if (source['version'] !== 2) throw new HttpError(400, 'Unsupported backup version');
  if (!Array.isArray(source['activities']) || !Array.isArray(source['weights'])) {
    throw new HttpError(400, 'Invalid backup file');
  }
  return {
    settings:
      source['settings'] && typeof source['settings'] === 'object'
        ? (source['settings'] as { appName: string; ownerName: string })
        : null,
    activities: source['activities'],
    weights: source['weights'],
  };
}

function validTimestamp(value: unknown): number {
  const timestamp = Number(value);
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : Date.now();
}
