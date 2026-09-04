import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { DatabaseSchema } from '../interface/database.interface.js';

const databasePath = resolve(import.meta.dirname, '../db.json');
const temporaryPath = `${databasePath}.tmp`;
const initialData: DatabaseSchema = {
  users: [],
  settings: [],
  activities: [],
  weights: [],
  friendConnections: [],
  activityReactions: [],
};

export class JsonDatabase {
  private writeQueue = Promise.resolve();

  async read(): Promise<DatabaseSchema> {
    try {
      const stored = JSON.parse(await readFile(databasePath, 'utf8')) as Partial<DatabaseSchema>;
      return {
        users: Array.isArray(stored.users) ? stored.users : [],
        settings: Array.isArray(stored.settings) ? stored.settings : [],
        activities: Array.isArray(stored.activities) ? stored.activities : [],
        weights: Array.isArray(stored.weights) ? stored.weights : [],
        friendConnections: Array.isArray(stored.friendConnections)
          ? stored.friendConnections
          : [],
        activityReactions: Array.isArray(stored.activityReactions)
          ? stored.activityReactions.filter(
              (reaction) => reaction.type === 'like' || reaction.type === 'slap',
            )
          : [],
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      await this.write(initialData);
      return structuredClone(initialData);
    }
  }

  update<T>(mutation: (database: DatabaseSchema) => T | Promise<T>): Promise<T> {
    const operation = this.writeQueue.then(async () => {
      const database = await this.read();
      const result = await mutation(database);
      await this.write(database);
      return result;
    });
    this.writeQueue = operation.then(
      () => undefined,
      () => undefined,
    );
    return operation;
  }

  private async write(database: DatabaseSchema): Promise<void> {
    await mkdir(dirname(databasePath), { recursive: true });
    await writeFile(temporaryPath, `${JSON.stringify(database, null, 2)}\n`, 'utf8');
    await rename(temporaryPath, databasePath);
  }
}

export const database = new JsonDatabase();
