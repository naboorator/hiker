import type { Hike } from './hike.interface';

export interface AdminActivity extends Hike {
  author: {
    id: string;
    name: string;
  };
}
