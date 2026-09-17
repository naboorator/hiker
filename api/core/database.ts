import mariadb, { type PoolConnection, type UpsertResult } from "mariadb";

export const database = mariadb.createPool({
  host: process.env["DB_HOST"] ?? "127.0.0.1",
  port: Number(process.env["DB_PORT"] ?? 3306),
  database: process.env["DB_NAME"] ?? "my_hike",
  user: process.env["DB_USER"] ?? "my_hike",
  password: process.env["DB_PASSWORD"] ?? "my_hike_dev_password",
  connectionLimit: Number(process.env["DB_CONNECTION_LIMIT"] ?? 10),
  bigIntAsNumber: true,
  insertIdAsNumber: true,
  dateStrings: true,
});

export async function withTransaction<T>(
  operation: (connection: PoolConnection) => Promise<T>,
): Promise<T> {
  const connection = await database.getConnection();
  try {
    await connection.beginTransaction();
    const result = await operation(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.release();
  }
}

export function isDuplicateEntry(error: unknown): boolean {
  return Boolean(
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "ER_DUP_ENTRY",
  );
}

export type DatabaseResult = UpsertResult;
