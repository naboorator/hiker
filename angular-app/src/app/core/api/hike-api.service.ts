import { Injectable, inject } from '@angular/core';
import { IndexedDbClient } from '../data/indexeddb/indexed-db.client';
import type { AppSettings } from '../interface/app-settings.interface';
import type { ActivityType } from '../interface/activity-type.type';
import type { HikeDraft } from '../interface/hike-draft.interface';
import type { HikeExport } from '../interface/hike-export.interface';
import type { Hike } from '../interface/hike.interface';
import type { WeightEntry } from '../interface/weight-entry.interface';
type StoredSetting = { key: string; value: unknown };
type StoredHike = Partial<Hike> & { id: string; distance?: number; created?: number };
const defaults: AppSettings = {
  appName: 'My hike log',
  ownerName: 'You',
};
@Injectable({ providedIn: 'root' })
export class HikeApiService {
  private readonly db = inject(IndexedDbClient);

  async loadHikes(): Promise<Hike[]> {
    const entries = await this.db.getAll<StoredHike>('hikes');
    return entries
      .map((entry) => ({
        id: entry.id,
        activityType: this.activityType(entry.activityType),
        name: entry.name ?? 'Unnamed hike',
        date: entry.date ?? new Date().toISOString().slice(0, 10),
        minutes: Number(entry.minutes ?? 0),
        metres: Number(entry.metres ?? entry.distance ?? 0),
        people:
          Array.isArray(entry.people) && entry.people.length ? entry.people : [defaults.ownerName],
        createdAt: Number(entry.createdAt ?? entry.created ?? Date.now()),
      }))
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  }
  async saveHike(draft: HikeDraft): Promise<Hike> {
    return this.writeHike({
      id: crypto.randomUUID(),
      activityType: draft.activityType,
      name: draft.name.trim(),
      date: draft.date,
      minutes: Number(draft.minutes),
      metres: draft.activityType === 'hiking' ? Number(draft.metres) : 0,
      people: draft.people,
      createdAt: Date.now(),
    });
  }
  async updateHike(id: string, draft: HikeDraft): Promise<Hike> {
    const existing = await this.db.get<StoredHike>('hikes', id);
    return this.writeHike({
      id,
      activityType: draft.activityType,
      name: draft.name.trim(),
      date: draft.date,
      minutes: Number(draft.minutes),
      metres: draft.activityType === 'hiking' ? Number(draft.metres) : 0,
      people: draft.people,
      createdAt: Number(existing?.createdAt ?? existing?.created ?? Date.now()),
    });
  }
  private async writeHike(hike: Hike): Promise<Hike> {
    await this.db.put('hikes', { ...hike, distance: hike.metres, created: hike.createdAt });
    return hike;
  }
  deleteHike(id: string): Promise<void> {
    return this.db.delete('hikes', id);
  }
  async loadSettings(): Promise<AppSettings> {
    const values = new Map(
      (await this.db.getAll<StoredSetting>('settings')).map((entry) => [entry.key, entry.value]),
    );
    return {
      appName: String(values.get('appName') ?? defaults.appName),
      ownerName: String(values.get('ownerName') ?? defaults.ownerName),
    };
  }
  async saveSettings(settings: AppSettings): Promise<void> {
    await Promise.all([
      this.db.put('settings', { key: 'appName', value: settings.appName }),
      this.db.put('settings', { key: 'ownerName', value: settings.ownerName }),
    ]);
  }
  async exportHikes(): Promise<HikeExport> {
    return { version: 1, exportedAt: new Date().toISOString(), hikes: await this.loadHikes() };
  }
  async importHikes(payload: unknown): Promise<{ imported: number; skipped: number }> {
    const candidate = Array.isArray(payload) ? payload : (payload as Partial<HikeExport>)?.hikes;
    if (!Array.isArray(candidate)) throw new Error('Invalid backup file');
    const existing = await this.loadHikes();
    let imported = 0,
      skipped = 0;
    for (const raw of candidate) {
      if (!raw || typeof raw !== 'object') {
        skipped++;
        continue;
      }
      const item = raw as Partial<Hike> & { distance?: number; created?: number };
      const date = item.date;
      if (
        !item.name?.trim() ||
        !date ||
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !Number.isFinite(Number(item.minutes))
      ) {
        skipped++;
        continue;
      }
      const metres = Number(item.metres ?? item.distance ?? 0);
      const activityType = this.activityType(item.activityType);
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
      const hike = await this.writeHike({
        id:
          existing.some((value) => value.id === item.id) || !item.id
            ? crypto.randomUUID()
            : item.id,
        activityType,
        name: item.name.trim(),
        date,
        minutes: Number(item.minutes),
        metres,
        people:
          Array.isArray(item.people) && item.people.length
            ? item.people.map(String)
            : [defaults.ownerName],
        createdAt: Number(item.createdAt ?? item.created ?? Date.now()),
      });
      existing.push(hike);
      imported++;
    }
    return { imported, skipped };
  }

  private activityType(value: unknown): ActivityType {
    return value === 'fitness' ? 'fitness' : 'hiking';
  }
  async clearHikes(): Promise<void> {
    const hikes = await this.db.getAll<StoredHike>('hikes');
    await Promise.all(hikes.map((hike) => this.db.delete('hikes', hike.id)));
  }

  async loadWeights(): Promise<WeightEntry[]> {
    return (await this.db.getAll<WeightEntry>('weights')).sort(
      (a, b) => b.recordedOn.localeCompare(a.recordedOn) || b.createdAt.localeCompare(a.createdAt),
    );
  }

  async saveWeight(weightKg: number, recordedOn: string): Promise<WeightEntry> {
    const entry: WeightEntry = {
      id: crypto.randomUUID(),
      weightKg,
      recordedOn,
      createdAt: new Date().toISOString(),
    };
    await this.db.add('weights', entry);
    return entry;
  }

  async updateWeight(id: string, weightKg: number, recordedOn: string): Promise<WeightEntry> {
    const existing = await this.db.get<WeightEntry>('weights', id);
    if (!existing) throw new Error('Weight measurement not found');
    const entry: WeightEntry = { ...existing, weightKg, recordedOn };
    await this.db.put('weights', entry);
    return entry;
  }

  deleteWeight(id: string): Promise<void> {
    return this.db.delete('weights', id);
  }
}
