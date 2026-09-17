import { authenticatedUserId } from "../../core/auth.js";
import { database } from "../../core/database.js";
import { loadActivities } from "../../core/activity-repository.js";
export function registerBackupGetRoutes(router) {
    router.get("/backup", async (_request, response) => {
        const userId = authenticatedUserId(response);
        const [settings] = await database.query("SELECT app_name AS appName, owner_name AS ownerName FROM settings WHERE user_id = ?", [userId]);
        const weights = await database.query(`SELECT id, CAST(weight_kg AS DOUBLE) AS weightKg,
              CAST(recorded_on AS CHAR) AS recordedOn, CAST(created_at AS CHAR) AS createdAt
         FROM weights
        WHERE user_id = ?
        ORDER BY recorded_on DESC, created_at DESC`, [userId]);
        response.json({
            version: 2,
            exportedAt: new Date().toISOString(),
            settings: settings ?? null,
            activities: await loadActivities(userId),
            weights,
        });
    });
}
