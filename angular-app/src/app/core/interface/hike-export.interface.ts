import type { Hike } from './hike.interface';

export interface HikeExport {
  version: 1;
  exportedAt: string;
  hikes: Hike[];
}
