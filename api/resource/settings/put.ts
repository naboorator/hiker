import type { Router } from 'express';
import { withTransaction } from '../../core/database.js';
import { settingsInput } from '../../core/validation.js';
import { authenticatedUserId } from '../../core/auth.js';
import { HttpError } from '../../core/http-error.js';

export function registerSettingsPutRoutes(router: Router): void {
  router.put('/settings', async (request, response) => {
    const userId = authenticatedUserId(response);
    const settings = settingsInput(request.body);
    await withTransaction(async (connection) => {
      const [user] = await connection.query<{ name: string }[]>(
        'SELECT name FROM users WHERE id = ? FOR UPDATE',
        [userId],
      );
      if (!user) throw new HttpError(404, 'User not found');
      await connection.query('UPDATE users SET name = ? WHERE id = ?', [settings.ownerName, userId]);
      if (user.name.toLocaleLowerCase() !== settings.ownerName.toLocaleLowerCase())
        await connection.query(
          `UPDATE activity_people
              SET person_name = ?
            WHERE LOWER(person_name) = LOWER(?)`,
          [settings.ownerName, user.name],
        );
      await connection.query(
        `INSERT INTO settings (user_id, app_name, owner_name) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE app_name = VALUES(app_name), owner_name = VALUES(owner_name)`,
        [userId, settings.appName, settings.ownerName],
      );
    });
    response.json(settings);
  });
}
