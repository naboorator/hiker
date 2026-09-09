import type { AppSettings } from './app-settings.interface';
import type { Hike } from './hike.interface';
import type { WeightEntry } from './weight-entry.interface';

export interface DataExport {
  version: 2;
  exportedAt: string;
  settings: AppSettings | null;
  activities: Hike[];
  weights: WeightEntry[];
}
