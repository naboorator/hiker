import { randomUUID } from 'node:crypto';
import { withTransaction } from '../../core/database.js';
import { replaceActivityPeople } from '../../core/activity-repository.js';
import { activityInput } from '../../core/validation.js';
import { authenticatedUserId } from '../../core/auth.js';
export function registerActivityPostRoutes(router) {
    router.post('/activities/migrate', async (request, response) => {
        const userId = authenticatedUserId(response);
        const candidates = Array.isArray(request.body) ? request.body : [];
        const result = await withTransaction(async (connection) => {
            let imported = 0;
            let skipped = 0;
            for (const candidate of candidates) {
                const source = candidate;
                if (!source.id) {
                    skipped++;
                    continue;
                }
                const input = activityInput(source);
                const existing = await connection.query('SELECT id FROM activities WHERE id = ?', [source.id]);
                if (existing.length) {
                    skipped++;
                    continue;
                }
                await connection.query(`INSERT INTO activities
             (id, user_id, activity_type, name, activity_date, minutes, metres, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
                    source.id,
                    userId,
                    input.activityType,
                    input.name,
                    input.date,
                    input.minutes,
                    input.metres ?? 0,
                    Number.isFinite(source.createdAt) ? Number(source.createdAt) : Date.now(),
                ]);
                await replaceActivityPeople(connection, source.id, input.people);
                imported++;
            }
            return { imported, skipped };
        });
        response.json(result);
    });
    router.post('/activities', async (request, response) => {
        const userId = authenticatedUserId(response);
        const input = activityInput(request.body);
        const activity = {
            ...input,
            id: randomUUID(),
            userId,
            metres: input.metres ?? 0,
            createdAt: Date.now(),
        };
        await withTransaction(async (connection) => {
            await connection.query(`INSERT INTO activities
           (id, user_id, activity_type, name, activity_date, minutes, metres, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
                activity.id,
                activity.userId,
                activity.activityType,
                activity.name,
                activity.date,
                activity.minutes,
                activity.metres,
                activity.createdAt,
            ]);
            await replaceActivityPeople(connection, activity.id, activity.people);
        });
        response.status(201).json({ ...activity, likes: 0, likedBy: [], slaps: 0, slappedBy: [] });
    });
}
