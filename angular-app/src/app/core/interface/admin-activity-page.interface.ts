import type { AdminActivity } from './admin-activity.interface';

export interface AdminActivityPage {
  items: AdminActivity[];
  page: number;
  pageSize: number;
  totalActivities: number;
  totalDays: number;
  totalPages: number;
}
