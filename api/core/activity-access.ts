import type { Response } from "express";
import { authenticatedUserId, isAdministrator } from "./auth.js";
import { database } from "./database.js";
import { HttpError } from "./http-error.js";

export async function requireActivityReadAccess(
  response: Response,
  activityId: string | undefined,
): Promise<{ id: string; ownerId: string }> {
  const userId = authenticatedUserId(response);
  const [activity] = await database.query<{ id: string; ownerId: string }[]>(
    "SELECT id, user_id AS ownerId FROM activities WHERE id = ?",
    [activityId],
  );
  if (!activity) throw new HttpError(404, "Activity not found");
  if (isAdministrator(response) || activity.ownerId === userId) return activity;
  const [friendship] = await database.query<{ id: string }[]>(
    `SELECT id FROM friend_connections
      WHERE status = 'accepted'
        AND ((user_id_1 = ? AND user_id_2 = ?)
          OR (user_id_1 = ? AND user_id_2 = ?))
      LIMIT 1`,
    [userId, activity.ownerId, activity.ownerId, userId],
  );
  if (!friendship)
    throw new HttpError(
      403,
      "This activity is not available to you",
      "ACTIVITY_UNAVAILABLE",
    );
  return activity;
}
