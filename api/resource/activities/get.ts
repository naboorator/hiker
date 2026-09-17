import type { Router } from "express";
import { HttpError } from "../../core/http-error.js";
import { authenticatedUserId, isAdministrator } from "../../core/auth.js";
import {
  activitiesWithReactionSummaries,
  loadActivities,
} from "../../core/activity-repository.js";
import { database } from "../../core/database.js";
import type { ActivityLocation } from "../../interface/activity-location.interface.js";

export function registerActivityGetRoutes(router: Router): void {
  router.get("/activities", async (request, response) => {
    const userId = authenticatedUserId(response);
    const date =
      typeof request.query["date"] === "string" ? request.query["date"] : null;
    const month =
      typeof request.query["month"] === "string"
        ? request.query["month"]
        : null;
    const activities = await loadActivities(userId, {
      date: date ?? undefined,
      month: month ?? undefined,
    });
    response.json(await activitiesWithReactionSummaries(activities));
  });

  router.get("/activities/:id", async (request, response) => {
    const userId = authenticatedUserId(response);
    const [ownership] = await database.query<{ id: string; ownerId: string }[]>(
      "SELECT id, user_id AS ownerId FROM activities WHERE id = ?",
      [request.params["id"]],
    );
    if (!ownership) throw new HttpError(404, "Activity not found");
    if (!isAdministrator(response) && ownership.ownerId !== userId) {
      const [friendship] = await database.query<{ id: string }[]>(
        `SELECT id FROM friend_connections
          WHERE status = 'accepted'
            AND ((user_id_1 = ? AND user_id_2 = ?)
              OR (user_id_1 = ? AND user_id_2 = ?))
          LIMIT 1`,
        [userId, ownership.ownerId, ownership.ownerId, userId],
      );
      if (!friendship)
        throw new HttpError(
          403,
          "This activity is not available to you",
          "ACTIVITY_UNAVAILABLE",
        );
    }
    const [activity] = await loadActivities(null, { id: ownership.id });
    if (!activity) throw new HttpError(404, "Activity not found");
    response.json((await activitiesWithReactionSummaries([activity]))[0]);
  });

  router.get("/activities/:id/locations", async (request, response) => {
    const userId = authenticatedUserId(response);
    const [activity] = await database.query<{ id: string }[]>(
      `SELECT id FROM activities
        WHERE id = ? AND (? = 1 OR user_id = ?)`,
      [request.params["id"], isAdministrator(response) ? 1 : 0, userId],
    );
    if (!activity) throw new HttpError(404, "Activity not found");
    const locations = await database.query<ActivityLocation[]>(
      `SELECT sequence, segment,
              CAST(latitude AS DOUBLE) AS latitude,
              CAST(longitude AS DOUBLE) AS longitude,
              CAST(accuracy AS DOUBLE) AS accuracy,
              CONCAT(DATE_FORMAT(recorded_at, '%Y-%m-%dT%H:%i:%s.'),
                     LEFT(DATE_FORMAT(recorded_at, '%f'), 3), 'Z') AS recordedAt
         FROM activity_locations
        WHERE activity_id = ?
        ORDER BY sequence`,
      [activity.id],
    );
    response.json(locations);
  });
}
