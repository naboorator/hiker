import { Injectable, computed, inject, signal } from '@angular/core';
import { HikeApiService } from '../api/hike-api.service';
import type { AppSettings } from '../interface/app-settings.interface';
import type { HikeDraft } from '../interface/hike-draft.interface';
import type { Hike } from '../interface/hike.interface';
import type { WeightEntry } from '../interface/weight-entry.interface';
const today = new Date().toISOString().slice(0, 10);
@Injectable({ providedIn: 'root' })
export class MockHikeStore {
  private readonly api = inject(HikeApiService);
  readonly settings = signal<AppSettings>({
    appName: 'My hike log',
    ownerName: 'YourName(change in settings)',
  });
  readonly hikes = signal<Hike[]>([]);
  readonly weights = signal<WeightEntry[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly todayHikes = computed(() => this.hikes().filter((hike) => hike.date === today));
  readonly totalMinutes = computed(() =>
    this.todayHikes().reduce((sum, hike) => sum + hike.minutes, 0),
  );
  readonly people = computed(() => [...new Set(this.hikes().flatMap((hike) => hike.people))]);
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
    void this.load();
  }
  async load(): Promise<void> {
    try {
      const [settings, hikes, weights] = await Promise.all([
        this.api.loadSettings(),
        this.api.loadHikes(),
        this.api.loadWeights(),
      ]);
      this.settings.set(settings);
      this.hikes.set(hikes);
      this.weights.set(weights);
    } catch {
      this.error.set('Could not load your hike data.');
    } finally {
      this.loading.set(false);
    }
  }
  async addMockHike(draft: HikeDraft): Promise<void> {
    const hike = await this.api.saveHike(draft);
    this.hikes.update((hikes) => [hike, ...hikes]);
  }
  async updateHike(id: string, draft: HikeDraft): Promise<void> {
    const hike = await this.api.updateHike(id, draft);
    this.hikes.update((hikes) =>
      hikes
        .map((item) => (item.id === id ? hike : item))
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt),
    );
  }
  async removeMockHike(id: string): Promise<void> {
    await this.api.deleteHike(id);
    this.hikes.update((hikes) => hikes.filter((hike) => hike.id !== id));
  }
  async saveSettings(settings: AppSettings): Promise<void> {
    await this.api.saveSettings(settings);
    this.settings.set(settings);
  }
  async addWeight(weightKg: number, recordedOn: string): Promise<void> {
    const entry = await this.api.saveWeight(weightKg, recordedOn);
    this.weights.update((weights) =>
      [entry, ...weights].sort(
        (a, b) =>
          b.recordedOn.localeCompare(a.recordedOn) || b.createdAt.localeCompare(a.createdAt),
      ),
    );
  }
  async updateWeight(id: string, weightKg: number, recordedOn: string): Promise<void> {
    const updated = await this.api.updateWeight(id, weightKg, recordedOn);
    this.weights.update((weights) =>
      weights
        .map((entry) => (entry.id === id ? updated : entry))
        .sort(
          (a, b) =>
            b.recordedOn.localeCompare(a.recordedOn) || b.createdAt.localeCompare(a.createdAt),
        ),
    );
  }
  async removeWeight(id: string): Promise<void> {
    await this.api.deleteWeight(id);
    this.weights.update((weights) => weights.filter((entry) => entry.id !== id));
  }
  async exportHikes(): Promise<string> {
    return JSON.stringify(await this.api.exportHikes(), null, 2);
  }
  async importHikes(file: File): Promise<{ imported: number; skipped: number }> {
    const result = await this.api.importHikes(JSON.parse(await file.text()));
    this.hikes.set(await this.api.loadHikes());
    return result;
  }
  async clearHikes(): Promise<void> {
    await this.api.clearHikes();
    this.hikes.set([]);
  }
}
