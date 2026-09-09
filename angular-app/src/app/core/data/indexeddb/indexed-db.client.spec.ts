import 'fake-indexeddb/auto';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { IndexedDbClient } from './indexed-db.client';

describe('IndexedDbClient', () => {
  let service: IndexedDbClient;

  beforeEach(async () => {
    await new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase('hike-log');
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    });
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
});
