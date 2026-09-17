export interface ActivityLocationInput {
  latitude: number;
  longitude: number;
  accuracy: number;
  recordedAt: string;
  segment: number;
}

export interface ActivityLocation extends ActivityLocationInput {
  sequence: number;
}
