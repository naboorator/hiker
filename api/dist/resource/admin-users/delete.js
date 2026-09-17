import { authenticatedUserId, requireAdministrator } from "../../core/auth.js";
import { withTransaction } from "../../core/database.js";
import { HttpError } from "../../core/http-error.js";
export function registerAdminUserDeleteRoutes(router) {
    router.delete("/admin/users/:id", async (request, response) => {
        requireAdministrator(response);
        const userId = request.params["id"] ?? "";
        if (userId === authenticatedUserId(response))
            throw new HttpError(400, "You cannot delete your own account");
        await withTransaction(async (connection) => {
            const [user] = await connection.query("SELECT id FROM users WHERE id = ? AND status <> 'deleted' FOR UPDATE", [userId]);
            if (!user)
                throw new HttpError(404, "User not found");
            await connection.query("DELETE FROM settings WHERE user_id = ?", [
                userId,
            ]);
            await connection.query("DELETE FROM weights WHERE user_id = ?", [userId]);
            await connection.query("DELETE FROM friend_connections WHERE user_id_1 = ? OR user_id_2 = ?", [userId, userId]);
            await connection.query("DELETE FROM activity_reactions WHERE user_id = ?", [userId]);
            await connection.query(`UPDATE users
            SET name = 'Deleted user', email = ?, status = 'deleted'
          WHERE id = ?`, [`deleted+${userId}@deleted.invalid`, userId]);
        });
        response.status(204).send();
    });
}
