import 'fake-indexeddb/auto';
import { TestBed } from '@angular/core/testing';
import { beforeAll, describe, expect, it } from 'vitest';
import { IndexedDbClient } from './indexed-db.client';

describe('IndexedDbClient', () => {
  let service: IndexedDbClient;

  beforeAll(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(IndexedDbClient);
  });

  it('adds, reads, updates, lists, and deletes a record', async () => {
    await service.add('hikes', { id: 'one', name: 'First' });
    expect(await service.get<{ name: string }>('hikes', 'one')).toEqual({
      id: 'one',
      name: 'First',
    });
    await service.put('hikes', { id: 'one', name: 'Updated' });
    expect(await service.getAll<{ name: string }>('hikes')).toEqual([
      { id: 'one', name: 'Updated' },
    ]);
    await service.delete('hikes', 'one');
    expect(await service.get('hikes', 'one')).toBeUndefined();
  });

  it('writes a batch in one transaction', async () => {
    await service.putMany('liveActivityLocations', [
      { id: 'activity:1', activityId: 'activity', sequence: 1 },
      { id: 'activity:2', activityId: 'activity', sequence: 2 },
    ]);
    expect(await service.getAll('liveActivityLocations')).toHaveLength(2);
  });
});
