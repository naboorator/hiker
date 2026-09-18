import { Injectable, inject } from '@angular/core';
import { INDEXED_DB_NAME } from './indexed-db.constants';

type StoreName = 'hikes' | 'settings' | 'weights' | 'liveActivityLocations';

@Injectable({ providedIn: 'root' })
export class IndexedDbClient {
  private readonly databaseName = inject(INDEXED_DB_NAME);
  private readonly database = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(this.databaseName, 4);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('hikes')) db.createObjectStore('hikes', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('settings'))
        db.createObjectStore('settings', { keyPath: 'key' });
      if (!db.objectStoreNames.contains('weights'))
        db.createObjectStore('weights', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('liveActivityLocations'))
        db.createObjectStore('liveActivityLocations', { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  async getAll<T>(storeName: StoreName): Promise<T[]> {
    const db = await this.database;
    return new Promise((resolve, reject) => {
      const request = db.transaction(storeName).objectStore(storeName).getAll();
      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () => reject(request.error);
    });
  }
  async get<T>(storeName: StoreName, key: string): Promise<T | undefined> {
    const db = await this.database;
    return new Promise((resolve, reject) => {
      const request = db.transaction(storeName).objectStore(storeName).get(key);
      request.onsuccess = () => resolve(request.result as T | undefined);
      request.onerror = () => reject(request.error);
    });
  }
  async put<T>(storeName: StoreName, value: T): Promise<void> {
    const db = await this.database;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put(value);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
  async add<T>(storeName: StoreName, value: T): Promise<void> {
    const db = await this.database;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).add(value);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
  async delete(storeName: StoreName, key: string): Promise<void> {
    const db = await this.database;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async putMany<T>(storeName: StoreName, values: readonly T[]): Promise<void> {
    if (!values.length) return;
    const db = await this.database;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      values.forEach((value) => store.put(value));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }
}
