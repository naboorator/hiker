export type LiveActivityStatus = 'tracking' | 'stopped' | 'saving';

export type LocationTrackingStatus =
  | 'pending'
  | 'active'
  | 'weak-signal'
  | 'recovering'
  | 'stale'
  | 'background-limited'
  | 'denied'
  | 'unavailable'
  | 'error';

export type LocationRejectionReason =
  'accuracy' | 'movement' | 'timestamp' | 'speed' | 'coordinates' | null;
