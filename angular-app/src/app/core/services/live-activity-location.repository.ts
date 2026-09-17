import { Injectable, inject } from '@angular/core';
import { IndexedDbClient } from '../data/indexeddb/indexed-db.client';
import type { LiveActivityLocation } from '../interface/live-activity-location.interface';
import type { StoredLiveActivityLocation } from '../interface/stored-live-activity-location.interface';

@Injectable({ providedIn: 'root' })
export class LiveActivityLocationRepository {
  private readonly database = inject(IndexedDbClient);

  async append(
    activityId: string,
    locations: readonly LiveActivityLocation[],
    firstSequence: number,
  ): Promise<void> {
    const records: StoredLiveActivityLocation[] = locations.map((location, index) => {
      const sequence = firstSequence + index;
      return {
        ...location,
        id: `${activityId}:${String(sequence).padStart(8, '0')}`,
        activityId,
        sequence,
      };
    });
    await this.database.putMany('liveActivityLocations', records);
  }

  async read(activityId: string): Promise<LiveActivityLocation[]> {
    const records = await this.database.getAll<StoredLiveActivityLocation>('liveActivityLocations');
    return records
      .filter((record) => record.activityId === activityId)
      .sort((first, second) => first.sequence - second.sequence)
      .map(({ id: _id, activityId: _activityId, sequence: _sequence, ...location }) => ({
        ...location,
        altitude: location.altitude ?? null,
        altitudeAccuracy: location.altitudeAccuracy ?? null,
      }));
  }

  async remove(activityId: string): Promise<void> {
    const records = await this.database.getAll<StoredLiveActivityLocation>('liveActivityLocations');
    await Promise.all(
      records
        .filter((record) => record.activityId === activityId)
        .map((record) => this.database.delete('liveActivityLocations', record.id)),
    );
  }
}
