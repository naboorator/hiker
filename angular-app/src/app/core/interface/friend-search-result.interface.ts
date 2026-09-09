export interface FriendSearchResult {
  id: string;
  name: string;
  email: string;
  connectionStatus: 'none' | 'pending' | 'accepted';
}
