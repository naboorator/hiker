import type { Router } from "express";
import { requireAdministrator } from "../../core/auth.js";
import {
  activitiesWithReactionSummaries,
  attachPeople,
} from "../../core/activity-repository.js";
import { database } from "../../core/database.js";
import type { AdminActivityPage } from "../../interface/admin-activity-page.interface.js";
import type { AdminActivity } from "../../interface/admin-activity.interface.js";

const defaultPageSize = 10;
const maximumPageSize = 31;

interface AdminActivityRow extends Omit<AdminActivity, "author" | "people"> {
  authorId: string;
  authorName: string;
}

export function registerAdminActivityGetRoutes(router: Router): void {
  router.get("/admin/activities", async (request, response) => {
    requireAdministrator(response);
    const page = positiveInteger(request.query["page"], 1);
    const pageSize = Math.min(
      positiveInteger(request.query["pageSize"], defaultPageSize),
      maximumPageSize,
    );
    const [[activityCount], [dayCount]] = await Promise.all([
      database.query<{ total: number }[]>(
        "SELECT COUNT(*) AS total FROM activities",
      ),
      database.query<{ total: number }[]>(
        "SELECT COUNT(DISTINCT activity_date) AS total FROM activities",
      ),
    ]);
    const totalActivities = Number(activityCount?.total ?? 0);
    const totalDays = Number(dayCount?.total ?? 0);
    const totalPages = Math.max(1, Math.ceil(totalDays / pageSize));
    const normalizedPage = Math.min(page, totalPages);
    const dates = await database.query<{ date: string }[]>(
      `SELECT CAST(activity_date AS CHAR) AS date
         FROM activities
        GROUP BY activity_date
        ORDER BY activity_date DESC
        LIMIT ? OFFSET ?`,
      [pageSize, (normalizedPage - 1) * pageSize],
    );

    let items: AdminActivity[] = [];
    if (dates.length) {
      const placeholders = dates.map(() => "?").join(", ");
      const rows = await database.query<AdminActivityRow[]>(
        `SELECT a.id, a.user_id AS userId, a.activity_type AS activityType, a.name,
                CAST(a.activity_date AS CHAR) AS date, a.minutes, a.metres,
                EXISTS(SELECT 1 FROM activity_locations l WHERE l.activity_id = a.id) AS hasGpsLocations,
                a.created_at AS createdAt, u.id AS authorId, u.name AS authorName
           FROM activities a
           JOIN users u ON u.id = a.user_id
          WHERE a.activity_date IN (${placeholders})
          ORDER BY a.activity_date DESC, a.created_at DESC, a.id DESC`,
        dates.map(({ date }) => date),
      );
      const withAuthors = rows.map(({ authorId, authorName, ...activity }) => ({
        ...activity,
        hasGpsLocations: Boolean(activity.hasGpsLocations),
        author: { id: authorId, name: authorName },
      }));
      items = await activitiesWithReactionSummaries(
        await attachPeople(withAuthors),
      );
    }

    const result: AdminActivityPage = {
      items,
      page: normalizedPage,
      pageSize,
      totalActivities,
      totalDays,
      totalPages,
    };
    response.json(result);
  });
}

function positiveInteger(value: unknown, fallback: number): number {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}
