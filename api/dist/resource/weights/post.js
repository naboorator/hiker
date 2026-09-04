import { randomUUID } from 'node:crypto';
import { database } from '../../core/json-database.js';
import { weightInput } from '../../core/validation.js';
import { authenticatedUserId } from '../../core/auth.js';
export function registerWeightPostRoutes(router) {
    router.post('/weights/migrate', async (request, response) => {
        const userId = authenticatedUserId(response);
        const candidates = Array.isArray(request.body) ? request.body : [];
        const result = await database.update((data) => {
            let imported = 0;
            let skipped = 0;
            for (const candidate of candidates) {
                const source = candidate;
                if (!source.id || data.weights.some(({ id, userId: ownerId }) => id === source.id && ownerId === userId)) {
                    skipped++;
                    continue;
                }
                const input = weightInput(source);
                data.weights.push({
                    ...input,
                    id: source.id,
                    userId,
                    createdAt: source.createdAt ?? new Date().toISOString(),
                });
                imported++;
            }
            return { imported, skipped };
        });
        response.json(result);
    });
    router.post('/weights', async (request, response) => {
        const userId = authenticatedUserId(response);
        const input = weightInput(request.body);
        const weight = {
            ...input,
            id: randomUUID(),
            userId,
            createdAt: new Date().toISOString(),
        };
        await database.update((data) => data.weights.push(weight));
        response.status(201).json(weight);
    });
}
