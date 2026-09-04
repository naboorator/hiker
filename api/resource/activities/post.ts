import { randomUUID } from 'node:crypto';
import type { Router } from 'express';
import { database } from '../../core/json-database.js';
import { activityInput } from '../../core/validation.js';
import type { Activity } from '../../interface/activity.interface.js';
import { authenticatedUserId } from '../../core/auth.js';

export function registerActivityPostRoutes(router: Router): void {
  router.post('/activities/migrate', async (request, response) => {
    const userId = authenticatedUserId(response);
    const candidates = Array.isArray(request.body) ? request.body : [];
    const result = await database.update((data) => {
      let imported = 0;
      let skipped = 0;
      for (const candidate of candidates) {
        const source = candidate as Partial<Activity>;
        if (!source.id || data.activities.some(({ id }) => id === source.id)) {
          skipped++;
          continue;
        }
        const input = activityInput(source);
        data.activities.push({
          ...input,
          id: source.id,
          userId,
          metres: input.metres ?? 0,
          createdAt: Number.isFinite(source.createdAt) ? Number(source.createdAt) : Date.now(),
        });
        imported++;
      }
      return { imported, skipped };
    });
    response.json(result);
  });

  router.post('/activities', async (request, response) => {
    const userId = authenticatedUserId(response);
    const input = activityInput(request.body);
    const activity: Activity = {
      ...input,
      id: randomUUID(),
      userId,
      metres: input.metres ?? 0,
      createdAt: Date.now(),
    };
    await database.update((data) => data.activities.push(activity));
    response.status(201).json({ ...activity, likes: 0, likedBy: [], slaps: 0, slappedBy: [] });
  });
}
