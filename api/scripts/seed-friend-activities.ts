import { randomInt, randomUUID } from "node:crypto";
import { database, withTransaction } from "../core/database.js";

const targetEmail = process.env["TARGET_USER_EMAIL"] ?? "zbarek@gmail.com";
const targetMonth = process.env["TARGET_MONTH"] ?? "2026-09";

interface FriendUser {
  id: string;
  name: string;
  email: string;
}

try {
  const [target] = await database.query<{ id: string }[]>(
    "SELECT id FROM users WHERE email = ? AND status <> 'deleted'",
    [targetEmail],
  );
  if (!target) throw new Error(`User ${targetEmail} was not found`);

  const friends = await database.query<FriendUser[]>(
    `SELECT u.id, u.name, u.email
       FROM friend_connections f
       JOIN users u ON u.id = IF(f.user_id_1 = ?, f.user_id_2, f.user_id_1)
      WHERE f.status = 'accepted'
        AND (f.user_id_1 = ? OR f.user_id_2 = ?)
        AND u.status = 'active'
      ORDER BY u.name`,
    [target.id, target.id, target.id],
  );

  const results: { name: string; email: string; activitiesAdded: number }[] =
    [];
  await withTransaction(async (connection) => {
    for (const friend of friends) {
      const activityCount = randomInt(2, 11);
      results.push({
        name: friend.name,
        email: friend.email,
        activitiesAdded: activityCount,
      });

      for (let index = 0; index < activityCount; index++) {
        const activityId = randomUUID();
        const day = String(randomInt(1, 31)).padStart(2, "0");
        await connection.query(
          `INSERT INTO activities
             (id, user_id, activity_type, name, activity_date, minutes, metres, created_at)
           VALUES (?, ?, 'hiking', ?, ?, ?, ?, ?)`,
          [
            activityId,
            friend.id,
            `September hike ${index + 1}`,
            `${targetMonth}-${day}`,
            randomInt(30, 91),
            randomInt(1000, 15_001),
            Date.now() + index,
          ],
        );
        await connection.query(
          "INSERT INTO activity_people (activity_id, position, person_name) VALUES (?, 0, ?)",
          [activityId, friend.name],
        );
      }
    }
  });

  console.table(results);
  console.log(
    JSON.stringify({
      targetEmail,
      targetMonth,
      friends: results.length,
      activitiesAdded: results.reduce(
        (total, result) => total + result.activitiesAdded,
        0,
      ),
      minimumMinutes: 30,
      maximumMinutes: 90,
      activityType: "hiking",
    }),
  );
} finally {
  await database.end();
}
