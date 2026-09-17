import { authenticatedUserId } from "../../core/auth.js";
import { database } from "../../core/database.js";
import { HttpError } from "../../core/http-error.js";
export function registerFriendActivityDeleteRoutes(router) {
    router.delete("/friends/activities/:activityId/reactions/:type", async (request, response) => {
        const userId = authenticatedUserId(response);
        if (request.params["type"] !== "like" &&
            request.params["type"] !== "slap")
            throw new HttpError(400, "Reaction must be like or slap");
        const activityId = request.params["activityId"] ?? "";
        const [activity] = await database.query(`SELECT a.id
         FROM activities a
         JOIN friend_connections f
           ON f.status = 'accepted'
          AND ((f.user_id_1 = ? AND f.user_id_2 = a.user_id)
            OR (f.user_id_2 = ? AND f.user_id_1 = a.user_id))
        WHERE a.id = ? AND a.user_id <> ?`, [userId, userId, activityId, userId]);
        if (!activity)
            throw new HttpError(404, "Activity not found");
        const result = await database.query(`DELETE FROM activity_reactions
        WHERE activity_id = ? AND user_id = ? AND reaction_type = ?`, [activityId, userId, request.params["type"]]);
        if (!result.affectedRows)
            throw new HttpError(404, "Reaction not found");
        response.status(204).send();
    });
}
