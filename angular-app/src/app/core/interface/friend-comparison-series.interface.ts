import type { FriendComparisonDay } from './friend-comparison-day.interface';

export interface FriendComparisonSeries {
  userId: string;
  name: string;
  isCurrentUser: boolean;
  days: FriendComparisonDay[];
}
