import { database } from "../../core/database.js";
import { HttpError } from "../../core/http-error.js";
import { authenticatedUserId, isAdministrator } from "../../core/auth.js";
export function registerWeightGetRoutes(router) {
    router.get("/weights", async (_request, response) => {
        const userId = authenticatedUserId(response);
        const weights = await database.query(`SELECT id, user_id AS userId, CAST(weight_kg AS DOUBLE) AS weightKg,
              CAST(recorded_on AS CHAR) AS recordedOn, CAST(created_at AS CHAR) AS createdAt
         FROM weights WHERE user_id = ?
        ORDER BY recorded_on DESC, created_at DESC`, [userId]);
        response.json(weights);
    });
    router.get("/weights/:id", async (request, response) => {
        const userId = authenticatedUserId(response);
        const administrator = isAdministrator(response);
        const [weight] = await database.query(`SELECT id, user_id AS userId, CAST(weight_kg AS DOUBLE) AS weightKg,
              CAST(recorded_on AS CHAR) AS recordedOn, CAST(created_at AS CHAR) AS createdAt
         FROM weights WHERE id = ?${administrator ? "" : " AND user_id = ?"}`, [request.params["id"], ...(administrator ? [] : [userId])]);
        if (!weight)
            throw new HttpError(404, "Weight measurement not found");
        response.json(weight);
    });
}
