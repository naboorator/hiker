import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { IndexedDbClient } from '../data/indexeddb/indexed-db.client';
import type { AppSettings } from '../interface/app-settings.interface';
import type { ActivityType } from '../interface/activity-type.type';
import { activityTypeOption, isActivityType } from '../utils/activity-type.helpers';
import type { HikeDraft } from '../interface/hike-draft.interface';
import type { DataExport } from '../interface/data-export.interface';
import type { DataImportResult } from '../interface/data-import-result.interface';
import type { Hike } from '../interface/hike.interface';
import type { WeightEntry } from '../interface/weight-entry.interface';
import { LogWrapper } from '../logging/log-wrapper.service';
import { AuthService } from '../auth/auth.service';
import type { Friend } from '../interface/friend.interface';
import type { FriendRequest } from '../interface/friend-request.interface';
import type { FriendSearchResult } from '../interface/friend-search-result.interface';
import type { FriendComparisonSeries } from '../interface/friend-comparison-series.interface';
import type { ActivityReactionType, FriendActivity } from '../interface/friend-activity.interface';
import type { AdminUser } from '../interface/admin-user.interface';
import type { PaginatedResponse } from '../interface/paginated-response.interface';
import type { AdminUserDraft } from '../interface/admin-user-draft.interface';
import type { ChangePasswordDraft } from '../interface/change-password-draft.interface';
import type { AdminActivityPage } from '../interface/admin-activity-page.interface';
import type { AdminTestEmailDraft } from '../interface/admin-test-email-draft.interface';
import { environment } from '../../../environments/environment';

type StoredSetting = { key: string; value: unknown };
type StoredHike = Partial<Hike> & { id: string; distance?: number; created?: number };

const apiUrl = `${environment.apiOrigin}/api`;
const healthUrl = `${environment.apiOrigin}/health`;
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

  async changePassword(draft: ChangePasswordDraft): Promise<void> {
    await firstValueFrom(this.http.put<void>(`${apiUrl}/account/password`, draft));
  }

  async exportData(): Promise<DataExport> {
    return firstValueFrom(this.http.get<DataExport>(`${apiUrl}/backup`));
  }

  async importData(payload: unknown): Promise<DataImportResult> {
    return firstValueFrom(this.http.post<DataImportResult>(`${apiUrl}/backup/import`, payload));
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

  async searchUsersForFriendship(search: string): Promise<FriendSearchResult[]> {
    return firstValueFrom(
      this.http.get<FriendSearchResult[]>(`${apiUrl}/friends/search`, {
        params: { search },
      }),
    );
  }

  async loadFriendComparison(
    friendIds: string[],
    month: string,
  ): Promise<FriendComparisonSeries[]> {
    return firstValueFrom(
      this.http.get<FriendComparisonSeries[]>(`${apiUrl}/friends/comparison`, {
        params: { friendIds: friendIds.join(','), month },
      }),
    );
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

  async loadAdminUsers(
    page: number,
    pageSize = 10,
    search = '',
  ): Promise<PaginatedResponse<AdminUser>> {
    return firstValueFrom(
      this.http.get<PaginatedResponse<AdminUser>>(`${apiUrl}/admin/users`, {
        params: { page, pageSize, search },
      }),
    );
  }

  async loadAdminUser(id: string): Promise<AdminUser> {
    return firstValueFrom(this.http.get<AdminUser>(`${apiUrl}/admin/users/${id}`));
  }

  async updateAdminUser(id: string, draft: AdminUserDraft): Promise<AdminUser> {
    return firstValueFrom(this.http.put<AdminUser>(`${apiUrl}/admin/users/${id}`, draft));
  }

  async setAdminUserBlocked(id: string, blocked: boolean): Promise<AdminUser> {
    const action = blocked ? 'block' : 'unblock';
    return firstValueFrom(this.http.put<AdminUser>(`${apiUrl}/admin/users/${id}/${action}`, {}));
  }

  async deleteAdminUser(id: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${apiUrl}/admin/users/${id}`));
  }

  async loadAdminUserActivities(
    id: string,
    page: number,
    pageSize = 10,
  ): Promise<PaginatedResponse<Hike>> {
    return firstValueFrom(
      this.http.get<PaginatedResponse<Hike>>(`${apiUrl}/admin/users/${id}/activities`, {
        params: { page, pageSize },
      }),
    );
  }

  async loadAdminActivities(page: number, pageSize = 10): Promise<AdminActivityPage> {
    return firstValueFrom(
      this.http.get<AdminActivityPage>(`${apiUrl}/admin/activities`, {
        params: { page, pageSize },
      }),
    );
  }

  async sendAdminTestEmail(draft: AdminTestEmailDraft): Promise<void> {
    await firstValueFrom(this.http.post<void>(`${apiUrl}/admin/emails/send-test-email`, draft));
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
      name: activityTypeOption(activityType).defaultName || (entry.name ?? 'Unnamed activity'),
      date: entry.date ?? new Date().toISOString().slice(0, 10),
      minutes: Number(entry.minutes ?? 0),
      metres: activityType === 'hiking' ? Number(entry.metres ?? entry.distance ?? 0) : 0,
      people:
        Array.isArray(entry.people) && entry.people.length ? entry.people : [defaults.ownerName],
      createdAt: Number(entry.createdAt ?? entry.created ?? Date.now()),
    };
  }

  private activityType(value: unknown): ActivityType {
    return isActivityType(value) ? value : 'hiking';
  }
}
