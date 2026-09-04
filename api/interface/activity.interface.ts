export type ActivityType = 'hiking' | 'fitness';

export interface Activity {
  id: string;
  userId: string;
  activityType: ActivityType;
  name: string;
  date: string;
  minutes: number;
  metres: number;
  people: string[];
  createdAt: number;
}

export interface ActivityInput {
  activityType: ActivityType;
  name: string;
  date: string;
  minutes: number;
  metres: number | null;
  people: string[];
}
