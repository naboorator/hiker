import type { Router } from 'express';
import { database } from '../../core/json-database.js';
import { settingsInput } from '../../core/validation.js';
import { authenticatedUserId } from '../../core/auth.js';
import { HttpError } from '../../core/http-error.js';

export function registerSettingsPutRoutes(router: Router): void {
  router.put('/settings', async (request, response) => {
    const userId = authenticatedUserId(response);
    const settings = settingsInput(request.body);
    await database.update((data) => {
      const user = data.users.find((candidate) => candidate.id === userId);
      if (!user) throw new HttpError(404, 'User not found');
      const previousName = user.name;
      user.name = settings.ownerName;
      if (previousName.toLocaleLowerCase() !== settings.ownerName.toLocaleLowerCase()) {
        for (const activity of data.activities) {
          const renamedPeople = activity.people.map((person) =>
            person.toLocaleLowerCase() === previousName.toLocaleLowerCase()
              ? settings.ownerName
              : person,
          );
          activity.people = renamedPeople.filter(
            (person, index) =>
              renamedPeople.findIndex(
                (candidate) => candidate.toLocaleLowerCase() === person.toLocaleLowerCase(),
              ) === index,
          );
        }
      }
      const index = data.settings.findIndex((entry) => entry.userId === userId);
      const stored = { ...settings, userId };
      if (index < 0) data.settings.push(stored);
      else data.settings[index] = stored;
    });
    response.json(settings);
  });
}
