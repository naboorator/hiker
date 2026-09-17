import type { Router } from "express";
import { database } from "../../core/database.js";
import { HttpError } from "../../core/http-error.js";
import { weightInput } from "../../core/validation.js";
import { authenticatedUserId, isAdministrator } from "../../core/auth.js";

export function registerWeightPutRoutes(router: Router): void {
  router.put("/weights/:id", async (request, response) => {
    const userId = authenticatedUserId(response);
    const administrator = isAdministrator(response);
    const input = weightInput(request.body);
    const result = await database.query(
      `UPDATE weights SET weight_kg = ?, recorded_on = ? WHERE id = ?${
        administrator ? "" : " AND user_id = ?"
      }`,
      [
        input.weightKg,
        input.recordedOn,
        request.params["id"],
        ...(administrator ? [] : [userId]),
      ],
    );
    if (!result.affectedRows)
      throw new HttpError(404, "Weight measurement not found");
    const [weight] = await database.query(
      `SELECT id, user_id AS userId, CAST(weight_kg AS DOUBLE) AS weightKg,
              CAST(recorded_on AS CHAR) AS recordedOn, CAST(created_at AS CHAR) AS createdAt
         FROM weights WHERE id = ?${administrator ? "" : " AND user_id = ?"}`,
      [request.params["id"], ...(administrator ? [] : [userId])],
    );
    response.json(weight);
  });
}
