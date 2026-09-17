import type { Router } from "express";
import { authenticatedUserId } from "../../core/auth.js";
import { database } from "../../core/database.js";
import { HttpError } from "../../core/http-error.js";

export function registerFriendGetRoutes(router: Router): void {
  router.get("/friends/comparison", async (request, response) => {
    const userId = authenticatedUserId(response);
    const currentMonth = new Date().toISOString().slice(0, 7);
    const month =
      typeof request.query["month"] === "string" &&
      /^\d{4}-(0[1-9]|1[0-2])$/.test(request.query["month"])
        ? request.query["month"]
        : currentMonth;
    const friendIds = [
      ...new Set(
        (typeof request.query["friendIds"] === "string"
          ? request.query["friendIds"]
          : ""
        )
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean),
      ),
    ].slice(0, 50);

    if (friendIds.includes(userId))
      throw new HttpError(400, "Current user must not be a friend selection");
    if (friendIds.length) {
      const placeholders = friendIds.map(() => "?").join(", ");
      const [allowed] = await database.query<{ total: number }[]>(
        `SELECT COUNT(*) AS total
           FROM friend_connections
          WHERE status = 'accepted'
            AND ((user_id_1 = ? AND user_id_2 IN (${placeholders}))
              OR (user_id_2 = ? AND user_id_1 IN (${placeholders})))`,
        [userId, ...friendIds, userId, ...friendIds],
      );
      if (Number(allowed?.total ?? 0) !== friendIds.length) {
        response
          .status(403)
          .json({ error: "You can compare only with accepted friends" });
        return;
      }
    }

    const selectedIds = [userId, ...friendIds];
    const placeholders = selectedIds.map(() => "?").join(", ");
    const users = await database.query<{ id: string; name: string }[]>(
      `SELECT id, name FROM users WHERE id IN (${placeholders})`,
      selectedIds,
    );
    const counts = await database.query<
      { userId: string; date: string; activityCount: number }[]
    >(
      `SELECT user_id AS userId, CAST(activity_date AS CHAR) AS date,
              COUNT(*) AS activityCount
         FROM activities
        WHERE user_id IN (${placeholders})
          AND DATE_FORMAT(activity_date, '%Y-%m') = ?
        GROUP BY user_id, activity_date
        ORDER BY activity_date`,
      [...selectedIds, month],
    );
    const countsByUser = new Map<
      string,
      { date: string; activityCount: number }[]
    >();
    for (const count of counts) {
      const days = countsByUser.get(count.userId) ?? [];
      days.push({
        date: count.date,
        activityCount: Number(count.activityCount),
      });
      countsByUser.set(count.userId, days);
    }
    const usersById = new Map(users.map((user) => [user.id, user]));
    response.json(
      selectedIds.map((id) => ({
        userId: id,
        name: usersById.get(id)?.name ?? "",
        isCurrentUser: id === userId,
        days: countsByUser.get(id) ?? [],
      })),
    );
  });

  router.get("/friends/search", async (request, response) => {
    const userId = authenticatedUserId(response);
    const search =
      typeof request.query["search"] === "string"
        ? request.query["search"].trim().slice(0, 320)
        : "";
    if (!search) {
      response.json([]);
      return;
    }
    const users = await database.query<
      {
        id: string;
        name: string;
        email: string;
        connectionStatus: "pending" | "accepted" | null;
      }[]
    >(
      `SELECT u.id, u.name, u.email, f.status AS connectionStatus
         FROM users u
         LEFT JOIN friend_connections f
           ON (f.user_id_1 = ? AND f.user_id_2 = u.id)
           OR (f.user_id_2 = ? AND f.user_id_1 = u.id)
        WHERE u.id <> ?
          AND u.status = 'active'
          AND (LOCATE(?, u.name) > 0 OR u.email = ?)
        ORDER BY u.name, u.email
        LIMIT 20`,
      [userId, userId, userId, search, search],
    );
    response.json(
      users.map((user) => ({
        ...user,
        connectionStatus: user.connectionStatus ?? "none",
      })),
    );
  });

  router.get("/friends", async (_request, response) => {
    const userId = authenticatedUserId(response);
    response.json(
      await database.query(
        `SELECT u.id, u.name, u.email, u.role
           FROM friend_connections f
           JOIN users u ON u.id = IF(f.user_id_1 = ?, f.user_id_2, f.user_id_1)
          WHERE (f.user_id_1 = ? OR f.user_id_2 = ?) AND f.status = 'accepted'
          ORDER BY u.name`,
        [userId, userId, userId],
      ),
    );
  });

  router.get("/friends/requests", async (_request, response) => {
    const userId = authenticatedUserId(response);
    const rows = await database.query<
      {
        id: string;
        requesterId: string;
        createdAt: string;
        otherId: string;
        otherName: string;
        otherEmail: string;
        otherRole: string;
      }[]
    >(
      `SELECT f.id, f.requester_id AS requesterId, CAST(f.created_at AS CHAR) AS createdAt,
              u.id AS otherId, u.name AS otherName, u.email AS otherEmail, u.role AS otherRole
         FROM friend_connections f
         JOIN users u ON u.id = IF(f.user_id_1 = ?, f.user_id_2, f.user_id_1)
        WHERE (f.user_id_1 = ? OR f.user_id_2 = ?) AND f.status = 'pending'
        ORDER BY f.created_at DESC`,
      [userId, userId, userId],
    );
    response.json(
      rows.map((row) => ({
        id: row.id,
        direction: row.requesterId === userId ? "outgoing" : "incoming",
        user: {
          id: row.otherId,
          name: row.otherName,
          email: row.otherEmail,
          role: row.otherRole,
        },
        createdAt: row.createdAt,
      })),
    );
  });
}
