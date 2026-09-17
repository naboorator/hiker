import { randomInt, randomUUID } from "node:crypto";
import { database, withTransaction } from "../core/database.js";

interface SeedUser {
  id: string;
  name: string;
}

const hikingNames = [
  "Morning hike",
  "Forest trail",
  "Hill walk",
  "Mountain adventure",
  "Evening hike",
] as const;

function randomDate(): string {
  const today = new Date();
  const date = new Date(
    Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate() - randomInt(0, 366),
    ),
  );
  return date.toISOString().slice(0, 10);
}

try {
  const users = await database.query<SeedUser[]>(
    `SELECT id, name
       FROM users
      WHERE status <> 'deleted'
      ORDER BY created_at`,
  );

  const activityCounts = new Map<string, number>();
  await withTransaction(async (connection) => {
    for (const user of users) {
      const count = randomInt(2, 13);
      activityCounts.set(user.id, count);

      for (let index = 0; index < count; index++) {
        const activityId = randomUUID();
        const isFitness = randomInt(0, 4) === 0;
        const activityType = isFitness ? "fitness" : "hiking";
        const name = isFitness
          ? "Fitness"
          : hikingNames[randomInt(0, hikingNames.length)];
        const createdAt = Date.now() - randomInt(0, 31_536_000_000);

        await connection.query(
          `INSERT INTO activities
             (id, user_id, activity_type, name, activity_date, minutes, metres, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            activityId,
            user.id,
            activityType,
            name,
            randomDate(),
            randomInt(20, 241),
            isFitness ? 0 : randomInt(500, 20_001),
            createdAt,
          ],
        );
        await connection.query(
          `INSERT INTO activity_people (activity_id, position, person_name)
           VALUES (?, 0, ?)`,
          [activityId, user.name],
        );
      }
    }
  });

  const counts = [...activityCounts.values()];
  console.log(
    JSON.stringify(
      {
        users: users.length,
        activitiesAdded: counts.reduce((total, count) => total + count, 0),
        minimumAddedPerUser: Math.min(...counts),
        maximumAddedPerUser: Math.max(...counts),
      },
      null,
      2,
    ),
  );
} finally {
  await database.end();
}
