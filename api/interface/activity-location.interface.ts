export interface ActivityLocationInput {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  altitudeAccuracy: number | null;
  recordedAt: string;
  segment: number;
}

export interface ActivityLocation extends ActivityLocationInput {
  sequence: number;
}
