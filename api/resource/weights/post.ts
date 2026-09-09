import { randomUUID } from 'node:crypto';
import type { Router } from 'express';
import { database, withTransaction } from '../../core/database.js';
import { weightInput } from '../../core/validation.js';
import type { Weight } from '../../interface/weight.interface.js';
import { authenticatedUserId } from '../../core/auth.js';
import { toSqlDateTime } from '../../core/sql-date.js';

export function registerWeightPostRoutes(router: Router): void {
  router.post('/weights/migrate', async (request, response) => {
    const userId = authenticatedUserId(response);
    const candidates = Array.isArray(request.body) ? request.body : [];
    const result = await withTransaction(async (connection) => {
      let imported = 0;
      let skipped = 0;
      for (const candidate of candidates) {
        const source = candidate as Partial<Weight>;
        if (!source.id) {
          skipped++;
          continue;
        }
        const input = weightInput(source);
        const existing = await connection.query<{ id: string }[]>(
          'SELECT id FROM weights WHERE id = ?',
          [source.id],
        );
        if (existing.length) {
          skipped++;
          continue;
        }
        await connection.query(
          `INSERT INTO weights (id, user_id, weight_kg, recorded_on, created_at)
           VALUES (?, ?, ?, ?, ?)`,
          [
            source.id,
            userId,
            input.weightKg,
            input.recordedOn,
            toSqlDateTime(source.createdAt ?? new Date()),
          ],
        );
        imported++;
      }
      return { imported, skipped };
    });
    response.json(result);
  });

  router.post('/weights', async (request, response) => {
    const userId = authenticatedUserId(response);
    const input = weightInput(request.body);
    const weight: Weight = {
      ...input,
      id: randomUUID(),
      userId,
      createdAt: new Date().toISOString(),
    };
    await database.query(
      `INSERT INTO weights (id, user_id, weight_kg, recorded_on, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [weight.id, weight.userId, weight.weightKg, weight.recordedOn, toSqlDateTime(weight.createdAt)],
    );
    response.status(201).json(weight);
  });
}
