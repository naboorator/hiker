export interface ActivityGpsLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  recordedAt: string;
  segment: number;
  sequence?: number;
}
