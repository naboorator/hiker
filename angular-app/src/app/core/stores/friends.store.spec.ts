import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { HikeApiService } from '../api/hike-api.service';
import { LogWrapper } from '../logging/log-wrapper.service';
import { FriendsStore } from './friends.store';

describe('FriendsStore', () => {
  let store: FriendsStore;
  const api = {
    loadFriends: vi.fn(),
    loadFriendActivities: vi.fn(),
    loadFriendRequests: vi.fn(),
    searchUsersForFriendship: vi.fn(),
    addFriend: vi.fn(),
    acceptFriendRequest: vi.fn(),
    removeFriendRequest: vi.fn(),
    removeFriend: vi.fn(),
    addActivityReaction: vi.fn(),
    removeActivityReaction: vi.fn(),
  };

  beforeEach(() => {
    Object.values(api).forEach((mock) => mock.mockReset());
    TestBed.configureTestingModule({
      providers: [
        FriendsStore,
        { provide: HikeApiService, useValue: api },
        { provide: LogWrapper, useValue: { error: vi.fn() } },
      ],
    });
    store = TestBed.inject(FriendsStore);
  });

  it('loads friends, activities, and requests', async () => {
    api.loadFriends.mockResolvedValue([{ id: 'friend-1', name: 'Ana' }]);
    api.loadFriendActivities.mockResolvedValue([{ id: 'activity-1' }]);
    api.loadFriendRequests.mockResolvedValue([{ id: 'request-1', direction: 'incoming' }]);
    await store.load();
    expect(store.friends()[0].name).toBe('Ana');
    expect(store.activities()).toHaveLength(1);
    expect(store.incomingRequests()).toHaveLength(1);
    expect(store.loading()).toBe(false);
  });

  it('clears results without calling the API for an empty search', async () => {
    store.searchResults.set([{ id: 'user-1' } as never]);
    await store.searchUsers('');
    expect(store.searchResults()).toEqual([]);
    expect(api.searchUsersForFriendship).not.toHaveBeenCalled();
  });

  it('adds a friend request and marks the search result pending', async () => {
    const request = { id: 'request-1', direction: 'outgoing', user: { id: 'user-1', name: 'Ana' } };
    store.searchResults.set([{ id: 'user-1', connectionStatus: 'none' } as never]);
    api.addFriend.mockResolvedValue(request);
    await expect(store.addFriend('ana@example.com')).resolves.toBe(true);
    expect(store.requests()).toContain(request);
    expect(store.searchResults()[0].connectionStatus).toBe('pending');
  });
});
