import { authenticatedUserId } from "../../core/auth.js";
import { database } from "../../core/database.js";
import { attachPeople, reactionSummaries, } from "../../core/activity-repository.js";
export function registerFriendActivityGetRoutes(router) {
    router.get("/friends/activities", async (_request, response) => {
        const userId = authenticatedUserId(response);
        const rows = await database.query(`SELECT a.id, a.user_id AS userId, a.activity_type AS activityType, a.name,
              CAST(a.activity_date AS CHAR) AS date, a.minutes, a.metres,
              a.created_at AS createdAt, u.name AS authorName
         FROM activities a
         JOIN users u ON u.id = a.user_id
         JOIN friend_connections f
           ON f.status = 'accepted'
          AND ((f.user_id_1 = ? AND f.user_id_2 = a.user_id)
            OR (f.user_id_2 = ? AND f.user_id_1 = a.user_id))
        WHERE a.user_id <> ?
        ORDER BY a.activity_date DESC, a.created_at DESC`, [userId, userId, userId]);
        const activities = await attachPeople(rows);
        const ids = activities.map(({ id }) => id);
        const summaries = await reactionSummaries(ids);
        const myReactionRows = ids.length
            ? await database.query(`SELECT activity_id AS activityId, reaction_type AS type
             FROM activity_reactions
            WHERE user_id = ? AND activity_id IN (${ids.map(() => "?").join(", ")})`, [userId, ...ids])
            : [];
        const myReactions = new Map();
        for (const reaction of myReactionRows) {
            const types = myReactions.get(reaction.activityId) ?? [];
            types.push(reaction.type);
            myReactions.set(reaction.activityId, types);
        }
        response.json(activities.map(({ authorName, ...activity }) => ({
            ...activity,
            author: { id: activity.userId, name: authorName },
            ...summaries.get(activity.id),
            myReactions: myReactions.get(activity.id) ?? [],
        })));
    });
}
