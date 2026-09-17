import type { Router } from "express";
import { authenticatedUserId } from "../../core/auth.js";
import { requireActivityReadAccess } from "../../core/activity-access.js";
import {
  activitiesWithReactionSummaries,
  loadActivities,
} from "../../core/activity-repository.js";
import { database } from "../../core/database.js";
import { HttpError } from "../../core/http-error.js";
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
    const ownership = await requireActivityReadAccess(
      response,
      request.params["id"],
    );
    const [activity] = await loadActivities(null, { id: ownership.id });
    if (!activity) throw new HttpError(404, "Activity not found");
    response.json((await activitiesWithReactionSummaries([activity]))[0]);
  });

  router.get("/activities/:id/locations", async (request, response) => {
    const activity = await requireActivityReadAccess(
      response,
      request.params["id"],
    );
    const locations = await database.query<ActivityLocation[]>(
      `SELECT sequence, segment,
              CAST(latitude AS DOUBLE) AS latitude,
              CAST(longitude AS DOUBLE) AS longitude,
              CAST(accuracy AS DOUBLE) AS accuracy,
              CAST(altitude AS DOUBLE) AS altitude,
              CAST(altitude_accuracy AS DOUBLE) AS altitudeAccuracy,
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
