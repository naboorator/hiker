import { database } from '../../core/database.js';
import { authenticatedUserId } from '../../core/auth.js';
export function registerSettingsGetRoutes(router) {
    router.get('/settings', async (_request, response) => {
        const userId = authenticatedUserId(response);
        const [settings] = await database.query('SELECT app_name AS appName, owner_name AS ownerName FROM settings WHERE user_id = ?', [userId]);
        const [user] = await database.query('SELECT name FROM users WHERE id = ?', [
            userId,
        ]);
        response.json(settings ?? { appName: 'My hike log', ownerName: user?.name ?? 'You' });
    });
}
