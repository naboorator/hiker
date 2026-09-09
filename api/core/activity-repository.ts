import type { PoolConnection } from 'mariadb';
import { database } from './database.js';
import type { Activity } from '../interface/activity.interface.js';

type Queryable = Pick<PoolConnection, 'query' | 'batch'>;

interface ActivityRow {
  id: string;
  userId: string;
  activityType: Activity['activityType'];
  name: string;
  date: string;
  minutes: number;
  metres: number;
  createdAt: number;
}

interface ReactionRow {
  activityId: string;
  type: 'like' | 'slap';
  userId: string;
  userName: string;
  createdAt: string;
}

export async function loadActivities(
  userId: string | null,
  filters: { id?: string; date?: string; month?: string } = {},
): Promise<Activity[]> {
  const clauses: string[] = [];
  const values: unknown[] = [];
  if (userId) {
    clauses.push('a.user_id = ?');
    values.push(userId);
  }
  if (filters.id) {
    clauses.push('a.id = ?');
    values.push(filters.id);
  }
  if (filters.date) {
    clauses.push('a.activity_date = ?');
    values.push(filters.date);
  }
  if (filters.month) {
    clauses.push("DATE_FORMAT(a.activity_date, '%Y-%m') = ?");
    values.push(filters.month);
  }
  const rows = await database.query<ActivityRow[]>(
    `SELECT a.id, a.user_id AS userId, a.activity_type AS activityType, a.name,
            CAST(a.activity_date AS CHAR) AS date, a.minutes, a.metres, a.created_at AS createdAt
       FROM activities a
      ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
      ORDER BY a.activity_date DESC, a.created_at DESC`,
    values,
  );
  return attachPeople(rows);
}

export async function attachPeople<T extends ActivityRow>(rows: T[]): Promise<(T & { people: string[] })[]> {
  if (!rows.length) return [];
  const placeholders = rows.map(() => '?').join(', ');
  const people = await database.query<{ activityId: string; personName: string }[]>(
    `SELECT activity_id AS activityId, person_name AS personName
       FROM activity_people
      WHERE activity_id IN (${placeholders})
      ORDER BY activity_id, position`,
    rows.map(({ id }) => id),
  );
  const byActivity = new Map<string, string[]>();
  for (const person of people) {
    const names = byActivity.get(person.activityId) ?? [];
    names.push(person.personName);
    byActivity.set(person.activityId, names);
  }
  return rows.map((row) => ({ ...row, people: byActivity.get(row.id) ?? [] }));
}

export async function replaceActivityPeople(
  connection: Queryable,
  activityId: string,
  people: string[],
): Promise<void> {
  await connection.query('DELETE FROM activity_people WHERE activity_id = ?', [activityId]);
  if (people.length)
    await connection.batch(
      'INSERT INTO activity_people (activity_id, position, person_name) VALUES (?, ?, ?)',
      people.map((person, position) => [activityId, position, person]),
    );
}

export async function reactionSummaries(activityIds: string[]) {
  const result = new Map<
    string,
    { likes: number; likedBy: string[]; slaps: number; slappedBy: string[] }
  >();
  for (const id of activityIds)
    result.set(id, { likes: 0, likedBy: [], slaps: 0, slappedBy: [] });
  if (!activityIds.length) return result;
  const placeholders = activityIds.map(() => '?').join(', ');
  const rows = await database.query<ReactionRow[]>(
    `SELECT r.activity_id AS activityId, r.reaction_type AS type, r.user_id AS userId,
            u.name AS userName, CAST(r.created_at AS CHAR) AS createdAt
       FROM activity_reactions r
       JOIN users u ON u.id = r.user_id
      WHERE r.activity_id IN (${placeholders})
      ORDER BY r.created_at DESC`,
    activityIds,
  );
  for (const row of rows) {
    const summary = result.get(row.activityId);
    if (!summary) continue;
    if (row.type === 'like') {
      summary.likes++;
      if (summary.likedBy.length < 3) summary.likedBy.push(row.userName);
    } else {
      summary.slaps++;
      if (summary.slappedBy.length < 3) summary.slappedBy.push(row.userName);
    }
  }
  return result;
}

export async function activitiesWithReactionSummaries(activities: Activity[]) {
  const summaries = await reactionSummaries(activities.map(({ id }) => id));
  return activities.map((activity) => ({ ...activity, ...summaries.get(activity.id) }));
}
