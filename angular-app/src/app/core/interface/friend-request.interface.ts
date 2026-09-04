import type { Friend } from './friend.interface';

export interface FriendRequest {
  id: string;
  direction: 'incoming' | 'outgoing';
  user: Friend;
  createdAt: string;
}
