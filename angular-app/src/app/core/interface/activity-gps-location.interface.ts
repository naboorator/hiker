export interface ActivityGpsLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number | null;
  altitudeAccuracy?: number | null;
  recordedAt: string;
  segment: number;
  sequence?: number;
}
