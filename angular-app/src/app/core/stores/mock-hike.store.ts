import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HikeApiService } from '../api/hike-api.service';
import type { AppSettings } from '../interface/app-settings.interface';
import type { HikeDraft } from '../interface/hike-draft.interface';
import type { Hike } from '../interface/hike.interface';
import type { WeightEntry } from '../interface/weight-entry.interface';
import type { DataImportResult } from '../interface/data-import-result.interface';
import { LogWrapper } from '../logging/log-wrapper.service';
import { AuthService } from '../auth/auth.service';
import { FriendsStore } from './friends.store';
const today = new Date().toISOString().slice(0, 10);
@Injectable({ providedIn: 'root' })
export class MockHikeStore {
  private readonly api = inject(HikeApiService);
  private readonly logger = inject(LogWrapper);
  private readonly auth = inject(AuthService);
  private readonly friendsStore = inject(FriendsStore);
  private readonly router = inject(Router);
  readonly settings = signal<AppSettings>({
    appName: 'My hike log',
    ownerName: 'YourName(change in settings)',
  });
  readonly hikes = signal<Hike[]>([]);
  readonly weights = signal<WeightEntry[]>([]);
  readonly loading = signal(true);
  readonly apiOnline = signal<boolean | null>(null);
  readonly error = signal<string | null>(null);
  readonly todayHikes = computed(() => this.hikes().filter((hike) => hike.date === today));
  readonly totalMinutes = computed(() =>
    this.todayHikes().reduce((sum, hike) => sum + hike.minutes, 0),
  );
  readonly people = computed(() => [
    ...new Set([
      this.settings().ownerName,
      ...this.friendsStore.friends().map((friend) => friend.name),
      ...this.hikes().flatMap((hike) => hike.people),
    ]),
  ]);
  readonly lastActivityType = computed(() => {
    const latest = this.hikes().reduce<Hike | null>(
      (current, hike) => (!current || hike.createdAt > current.createdAt ? hike : current),
      null,
    );
    return latest?.activityType ?? 'hiking';
  });
  readonly lastHikingName = computed(() => {
    const latestHike = this.hikes().reduce<Hike | null>(
      (current, hike) =>
        hike.activityType === 'hiking' && (!current || hike.createdAt > current.createdAt)
          ? hike
          : current,
      null,
    );
    return latestHike?.name ?? '';
  });
  constructor() {
    if (this.auth.isAuthenticated()) void this.load();
  }
  async load(): Promise<boolean> {
    this.loading.set(true);
    try {
      const apiOnline = await this.api.checkHealth();
      this.apiOnline.set(apiOnline);
      if (!apiOnline) {
        this.error.set(null);
        await this.router.navigate(['/service-unavailable']);
        return false;
      }
      const [settings, hikes, weights] = await Promise.all([
        this.api.loadSettings(),
        this.api.loadHikes(),
        this.api.loadWeights(),
      ]);
      this.settings.set(this.withRegisteredOwnerName(settings));
      this.hikes.set(hikes);
      this.weights.set(weights);
      return true;
    } catch (error) {
      this.reportRequestError(error);
      return false;
    } finally {
      this.loading.set(false);
    }
  }
  async refreshHikes(): Promise<void> {
    this.error.set(null);
    try {
      this.hikes.set(await this.api.loadHikes());
    } catch (error) {
      this.reportRequestError(error);
    }
  }
  reset(): void {
    this.hikes.set([]);
    this.weights.set([]);
    this.error.set(null);
    this.apiOnline.set(null);
  }

  private withRegisteredOwnerName(settings: AppSettings): AppSettings {
    const registeredName = this.auth.user()?.name?.trim();
    return registeredName && (settings.ownerName === 'You' || !settings.ownerName.trim())
      ? { ...settings, ownerName: registeredName }
      : settings;
  }
  async addMockHike(draft: HikeDraft): Promise<void> {
    await this.execute(async () => {
      const hike = await this.api.saveHike(draft);
      this.hikes.update((hikes) => [hike, ...hikes]);
    });
  }
  async updateHike(id: string, draft: HikeDraft): Promise<void> {
    await this.execute(async () => {
      const hike = await this.api.updateHike(id, draft);
      this.hikes.update((hikes) =>
        hikes
          .map((item) => (item.id === id ? hike : item))
          .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt),
      );
    });
  }
  async removeMockHike(id: string): Promise<void> {
    await this.execute(async () => {
      await this.api.deleteHike(id);
      this.hikes.update((hikes) => hikes.filter((hike) => hike.id !== id));
    });
  }
  async saveSettings(settings: AppSettings): Promise<void> {
    await this.execute(async () => {
      const previousName = this.settings().ownerName;
      await this.api.saveSettings(settings);
      this.auth.updateRegisteredName(settings.ownerName);
      this.settings.set(settings);
      if (previousName.toLocaleLowerCase() !== settings.ownerName.toLocaleLowerCase()) {
        this.hikes.update((hikes) =>
          hikes.map((hike) => ({
            ...hike,
            people: [
              ...new Set(
                hike.people.map((person) =>
                  person.toLocaleLowerCase() === previousName.toLocaleLowerCase()
                    ? settings.ownerName
                    : person,
                ),
              ),
            ],
          })),
        );
      }
    });
  }
  async addWeight(weightKg: number, recordedOn: string): Promise<void> {
    await this.execute(async () => {
      const entry = await this.api.saveWeight(weightKg, recordedOn);
      this.weights.update((weights) =>
        [entry, ...weights].sort(
          (a, b) =>
            b.recordedOn.localeCompare(a.recordedOn) || b.createdAt.localeCompare(a.createdAt),
        ),
      );
    });
  }
  async updateWeight(id: string, weightKg: number, recordedOn: string): Promise<void> {
    await this.execute(async () => {
      const updated = await this.api.updateWeight(id, weightKg, recordedOn);
      this.weights.update((weights) =>
        weights
          .map((entry) => (entry.id === id ? updated : entry))
          .sort(
            (a, b) =>
              b.recordedOn.localeCompare(a.recordedOn) || b.createdAt.localeCompare(a.createdAt),
          ),
      );
    });
  }
  async removeWeight(id: string): Promise<void> {
    await this.execute(async () => {
      await this.api.deleteWeight(id);
      this.weights.update((weights) => weights.filter((entry) => entry.id !== id));
    });
  }
  async exportData(): Promise<string> {
    return this.execute(async () => JSON.stringify(await this.api.exportData(), null, 2));
  }
  async importData(file: File): Promise<DataImportResult> {
    return this.execute(async () => {
      const result = await this.api.importData(JSON.parse(await file.text()));
      await this.load();
      if (result.settingsImported) this.auth.updateRegisteredName(this.settings().ownerName);
      return result;
    });
  }
  async clearHikes(): Promise<void> {
    await this.execute(async () => {
      await this.api.clearHikes();
      this.hikes.set([]);
    });
  }

  private async execute<T>(request: () => Promise<T>): Promise<T> {
    this.error.set(null);
    try {
      return await request();
    } catch (error) {
      this.reportRequestError(error);
      throw error;
    }
  }

  private reportRequestError(error: unknown): void {
    this.logger.error('API resource request failed', error);
    this.error.set('common.apiRequestFailed');
  }
}
