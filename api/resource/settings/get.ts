import type { Router } from 'express';
import { database } from '../../core/json-database.js';
import { authenticatedUserId } from '../../core/auth.js';

export function registerSettingsGetRoutes(router: Router): void {
  router.get('/settings', async (_request, response) => {
    const userId = authenticatedUserId(response);
    const data = await database.read();
    const settings = data.settings.find((entry) => entry.userId === userId);
    const registeredName = data.users.find((user) => user.id === userId)?.name ?? 'You';
    response.json(settings ?? { appName: 'My hike log', ownerName: registeredName });
  });
}
