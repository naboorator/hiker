import { randomUUID } from "node:crypto";
import type { Router } from "express";
import { database, withTransaction } from "../../core/database.js";
import { replaceActivityPeople } from "../../core/activity-repository.js";
import {
  activityInput,
  activityLocationsInput,
} from "../../core/validation.js";
import type { Activity } from "../../interface/activity.interface.js";
import { authenticatedUserId } from "../../core/auth.js";
import { toSqlDateTime } from "../../core/sql-date.js";

export function registerActivityPostRoutes(router: Router): void {
  router.post("/activities/migrate", async (request, response) => {
    const userId = authenticatedUserId(response);
    const candidates = Array.isArray(request.body) ? request.body : [];
    const result = await withTransaction(async (connection) => {
      let imported = 0;
      let skipped = 0;
      for (const candidate of candidates) {
        const source = candidate as Partial<Activity>;
        if (!source.id) {
          skipped++;
          continue;
        }
        const input = activityInput(source);
        const existing = await connection.query<{ id: string }[]>(
          "SELECT id FROM activities WHERE id = ?",
          [source.id],
        );
        if (existing.length) {
          skipped++;
          continue;
        }
        await connection.query(
          `INSERT INTO activities
             (id, user_id, activity_type, name, activity_date, minutes, metres, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            source.id,
            userId,
            input.activityType,
            input.name,
            input.date,
            input.minutes,
            input.metres ?? 0,
            Number.isFinite(source.createdAt)
              ? Number(source.createdAt)
              : Date.now(),
          ],
        );
        await replaceActivityPeople(connection, source.id, input.people);
        imported++;
      }
      return { imported, skipped };
    });
    response.json(result);
  });

  router.post("/activities", async (request, response) => {
    const userId = authenticatedUserId(response);
    const input = activityInput(request.body);
    const gpsLocations = activityLocationsInput(request.body);
    const activity: Activity = {
      ...input,
      id: randomUUID(),
      userId,
      metres: input.metres ?? 0,
      hasGpsLocations: gpsLocations.length > 0,
      createdAt: Date.now(),
    };
    await withTransaction(async (connection) => {
      await connection.query(
        `INSERT INTO activities
           (id, user_id, activity_type, name, activity_date, minutes, metres, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          activity.id,
          activity.userId,
          activity.activityType,
          activity.name,
          activity.date,
          activity.minutes,
          activity.metres,
          activity.createdAt,
        ],
      );
      await replaceActivityPeople(connection, activity.id, activity.people);
      if (gpsLocations.length)
        await connection.batch(
          `INSERT INTO activity_locations
             (activity_id, sequence, segment, latitude, longitude, accuracy,
              altitude, altitude_accuracy, recorded_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          gpsLocations.map((location, sequence) => [
            activity.id,
            sequence,
            location.segment,
            location.latitude,
            location.longitude,
            location.accuracy,
            location.altitude,
            location.altitudeAccuracy,
            toSqlDateTime(location.recordedAt),
          ]),
        );
    });
    response
      .status(201)
      .json({ ...activity, likes: 0, likedBy: [], slaps: 0, slappedBy: [] });
  });
}
