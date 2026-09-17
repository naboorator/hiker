import 'fake-indexeddb/auto';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { LiveActivityLocationRepository } from './live-activity-location.repository';

describe('LiveActivityLocationRepository', () => {
  let repository: LiveActivityLocationRepository;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    repository = TestBed.inject(LiveActivityLocationRepository);
  });

  it('appends, restores, and removes ordered activity samples', async () => {
    const samples = [
      {
        latitude: 46.05,
        longitude: 14.5,
        accuracy: 10,
        recordedAt: '2026-09-10T10:00:00Z',
        segment: 0,
      },
      {
        latitude: 46.06,
        longitude: 14.51,
        accuracy: 9,
        recordedAt: '2026-09-10T10:00:05Z',
        segment: 0,
      },
    ];
    await repository.append('activity-1', samples, 0);
    await repository.append('activity-2', [samples[0]], 0);
    expect(await repository.read('activity-1')).toEqual(samples);
    await repository.remove('activity-1');
    expect(await repository.read('activity-1')).toEqual([]);
    expect(await repository.read('activity-2')).toEqual([samples[0]]);
  });
});
