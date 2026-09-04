import type { Activity } from './activity.interface.js';
import type { Settings } from './settings.interface.js';
import type { Weight } from './weight.interface.js';
import type { User } from './user.interface.js';
import type { FriendConnection } from './friend-connection.interface.js';
import type { ActivityReaction } from './activity-reaction.interface.js';

export interface DatabaseSchema {
  users: User[];
  settings: Settings[];
  activities: Activity[];
  weights: Weight[];
  friendConnections: FriendConnection[];
  activityReactions: ActivityReaction[];
}
