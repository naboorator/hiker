export interface FriendConnection {
  id: string;
  userIds: [string, string];
  requesterId: string;
  status: 'pending' | 'accepted';
  createdAt: string;
}
