export type ActivityType =
  | "hiking"
  | "fitness"
  | "cycling"
  | "tennis"
  | "badminton"
  | "table_tennis"
  | "construction"
  | "housework";

export interface Activity {
  id: string;
  userId: string;
  activityType: ActivityType;
  name: string;
  date: string;
  minutes: number;
  metres: number;
  hasGpsLocations: boolean;
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
