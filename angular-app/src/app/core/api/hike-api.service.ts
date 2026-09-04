import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { IndexedDbClient } from '../data/indexeddb/indexed-db.client';
import type { AppSettings } from '../interface/app-settings.interface';
import type { ActivityType } from '../interface/activity-type.type';
import type { HikeDraft } from '../interface/hike-draft.interface';
import type { HikeExport } from '../interface/hike-export.interface';
import type { Hike } from '../interface/hike.interface';
import type { WeightEntry } from '../interface/weight-entry.interface';
import { LogWrapper } from '../logging/log-wrapper.service';
import { AuthService } from '../auth/auth.service';
import type { Friend } from '../interface/friend.interface';
import type { FriendRequest } from '../interface/friend-request.interface';
import type { ActivityReactionType, FriendActivity } from '../interface/friend-activity.interface';

type StoredSetting = { key: string; value: unknown };
type StoredHike = Partial<Hike> & { id: string; distance?: number; created?: number };

const apiUrl = 'http://localhost:3000/api';
const healthUrl = 'http://localhost:3000/health';
const migrationKey = 'api-db-json-migration-v3';
const previousMigrationKeyPrefix = 'api-db-json-migration-v2-';
const defaults: AppSettings = { appName: 'My hike log', ownerName: 'You' };

@Injectable({ providedIn: 'root' })
export class HikeApiService {
  private readonly http = inject(HttpClient);
  private readonly indexedDb = inject(IndexedDbClient);
  private readonly logger = inject(LogWrapper);
  private readonly auth = inject(AuthService);
  private migrationPromise?: Promise<void>;

  async checkHealth(): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.http.get<{ status: string }>(healthUrl).pipe(timeout(3000)),
      );
      return response.status === 'ok';
    } catch (error) {
      this.logger.error('API health check failed', error);
      return false;
    }
  }

  async loadHikes(): Promise<Hike[]> {
    await this.ensureMigration();
    return firstValueFrom(this.http.get<Hike[]>(`${apiUrl}/activities`));
  }

  async saveHike(draft: HikeDraft): Promise<Hike> {
    await this.ensureMigration();
    return firstValueFrom(this.http.post<Hike>(`${apiUrl}/activities`, draft));
  }

  async updateHike(id: string, draft: HikeDraft): Promise<Hike> {
    await this.ensureMigration();
    return firstValueFrom(this.http.put<Hike>(`${apiUrl}/activities/${id}`, draft));
  }

  async deleteHike(id: string): Promise<void> {
    await this.ensureMigration();
    return firstValueFrom(this.http.delete<void>(`${apiUrl}/activities/${id}`));
  }

  async loadSettings(): Promise<AppSettings> {
    await this.ensureMigration();
    return firstValueFrom(this.http.get<AppSettings>(`${apiUrl}/settings`));
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    await this.ensureMigration();
    await firstValueFrom(this.http.put<AppSettings>(`${apiUrl}/settings`, settings));
  }

  async exportHikes(): Promise<HikeExport> {
    return { version: 1, exportedAt: new Date().toISOString(), hikes: await this.loadHikes() };
  }

  async importHikes(payload: unknown): Promise<{ imported: number; skipped: number }> {
    const candidate = Array.isArray(payload) ? payload : (payload as Partial<HikeExport>)?.hikes;
    if (!Array.isArray(candidate)) throw new Error('Invalid backup file');
    const existing = await this.loadHikes();
    let imported = 0;
    let skipped = 0;
    for (const raw of candidate) {
      if (!raw || typeof raw !== 'object') {
        skipped++;
        continue;
      }
      const item = raw as Partial<Hike> & { distance?: number };
      const date = item.date;
      const activityType = this.activityType(item.activityType);
      const metres = activityType === 'hiking' ? Number(item.metres ?? item.distance ?? 0) : 0;
      if (
        !item.name?.trim() ||
        !date ||
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !Number.isFinite(Number(item.minutes))
      ) {
        skipped++;
        continue;
      }
      if (
        existing.some(
          (hike) =>
            hike.activityType === activityType &&
            hike.name === item.name &&
            hike.date === date &&
            hike.minutes === Number(item.minutes) &&
            hike.metres === metres,
        )
      ) {
        skipped++;
        continue;
      }
      const hike = await this.saveHike({
        activityType,
        name: item.name,
        date,
        minutes: Number(item.minutes),
        metres,
        people:
          Array.isArray(item.people) && item.people.length
            ? item.people.map(String)
            : [defaults.ownerName],
      });
      existing.push(hike);
      imported++;
    }
    return { imported, skipped };
  }

  async clearHikes(): Promise<void> {
    const hikes = await this.loadHikes();
    await Promise.all(hikes.map(({ id }) => this.deleteHike(id)));
  }

  async loadWeights(): Promise<WeightEntry[]> {
    await this.ensureMigration();
    return firstValueFrom(this.http.get<WeightEntry[]>(`${apiUrl}/weights`));
  }

  async saveWeight(weightKg: number, recordedOn: string): Promise<WeightEntry> {
    await this.ensureMigration();
    return firstValueFrom(
      this.http.post<WeightEntry>(`${apiUrl}/weights`, { weightKg, recordedOn }),
    );
  }

  async updateWeight(id: string, weightKg: number, recordedOn: string): Promise<WeightEntry> {
    await this.ensureMigration();
    return firstValueFrom(
      this.http.put<WeightEntry>(`${apiUrl}/weights/${id}`, { weightKg, recordedOn }),
    );
  }

  async deleteWeight(id: string): Promise<void> {
    await this.ensureMigration();
    return firstValueFrom(this.http.delete<void>(`${apiUrl}/weights/${id}`));
  }

  async loadFriends(): Promise<Friend[]> {
    return firstValueFrom(this.http.get<Friend[]>(`${apiUrl}/friends`));
  }

  async loadFriendRequests(): Promise<FriendRequest[]> {
    return firstValueFrom(this.http.get<FriendRequest[]>(`${apiUrl}/friends/requests`));
  }

  async addFriend(email: string): Promise<FriendRequest> {
    return firstValueFrom(this.http.post<FriendRequest>(`${apiUrl}/friends`, { email }));
  }

  async acceptFriendRequest(requestId: string): Promise<void> {
    await firstValueFrom(this.http.put(`${apiUrl}/friends/requests/${requestId}/accept`, {}));
  }

  async removeFriendRequest(requestId: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${apiUrl}/friends/requests/${requestId}`));
  }

  async removeFriend(friendId: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${apiUrl}/friends/${friendId}`));
  }

  async loadFriendActivities(): Promise<FriendActivity[]> {
    return firstValueFrom(this.http.get<FriendActivity[]>(`${apiUrl}/friends/activities`));
  }

  async addActivityReaction(activityId: string, type: ActivityReactionType): Promise<void> {
    await firstValueFrom(
      this.http.post(`${apiUrl}/friends/activities/${activityId}/reactions`, { type }),
    );
  }

  async removeActivityReaction(activityId: string, type: ActivityReactionType): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${apiUrl}/friends/activities/${activityId}/reactions/${type}`),
    );
  }

  private async migrateIndexedDb(): Promise<void> {
    if (!this.auth.user()?.id || localStorage.getItem(migrationKey)) return;
    if (Object.keys(localStorage).some((key) => key.startsWith(previousMigrationKeyPrefix))) {
      localStorage.setItem(migrationKey, new Date().toISOString());
      return;
    }

    const [storedSettings, storedHikes, storedWeights] = await Promise.all([
      this.indexedDb.getAll<StoredSetting>('settings'),
      this.indexedDb.getAll<StoredHike>('hikes'),
      this.indexedDb.getAll<WeightEntry>('weights'),
    ]);
    const settings = new Map(storedSettings.map(({ key, value }) => [key, value]));
    if (settings.has('appName') || settings.has('ownerName')) {
      await firstValueFrom(
        this.http.put<AppSettings>(`${apiUrl}/settings`, {
          appName: String(settings.get('appName') ?? defaults.appName),
          ownerName: String(settings.get('ownerName') ?? defaults.ownerName),
        }),
      );
    }

    const activities = storedHikes.map((entry) => this.normalizeStoredHike(entry));
    await firstValueFrom(this.http.post(`${apiUrl}/activities/migrate`, activities));
    await firstValueFrom(this.http.post(`${apiUrl}/weights/migrate`, storedWeights));
    localStorage.setItem(migrationKey, new Date().toISOString());
  }

  private ensureMigration(): Promise<void> {
    this.migrationPromise ??= this.migrateIndexedDb();
    return this.migrationPromise;
  }

  private normalizeStoredHike(entry: StoredHike): Hike {
    const activityType = this.activityType(entry.activityType);
    return {
      id: entry.id,
      activityType,
      name: activityType === 'fitness' ? 'Fitness' : (entry.name ?? 'Unnamed activity'),
      date: entry.date ?? new Date().toISOString().slice(0, 10),
      minutes: Number(entry.minutes ?? 0),
      metres: activityType === 'hiking' ? Number(entry.metres ?? entry.distance ?? 0) : 0,
      people:
        Array.isArray(entry.people) && entry.people.length ? entry.people : [defaults.ownerName],
      createdAt: Number(entry.createdAt ?? entry.created ?? Date.now()),
    };
  }

  private activityType(value: unknown): ActivityType {
    return value === 'fitness' ? 'fitness' : 'hiking';
  }
}
