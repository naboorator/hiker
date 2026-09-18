import { InjectionToken } from '@angular/core';

export const INDEXED_DB_NAME = new InjectionToken<string>('INDEXED_DB_NAME', {
  providedIn: 'root',
  factory: () => 'hike-log',
});
