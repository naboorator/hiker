import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { HikeApiService } from '../api/hike-api.service';
import type { ActivityReactionType, FriendActivity } from '../interface/friend-activity.interface';
import type { Friend } from '../interface/friend.interface';
import type { FriendRequest } from '../interface/friend-request.interface';
import { LogWrapper } from '../logging/log-wrapper.service';

@Injectable({ providedIn: 'root' })
export class FriendsStore {
  private readonly api = inject(HikeApiService);
  private readonly logger = inject(LogWrapper);
  readonly friends = signal<Friend[]>([]);
  readonly activities = signal<FriendActivity[]>([]);
  readonly requests = signal<FriendRequest[]>([]);
  readonly incomingRequests = computed(() =>
    this.requests().filter((request) => request.direction === 'incoming'),
  );
  readonly outgoingRequests = computed(() =>
    this.requests().filter((request) => request.direction === 'outgoing'),
  );
  readonly loading = signal(false);
  readonly error = signal('');

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const [friends, activities, requests] = await Promise.all([
        this.api.loadFriends(),
        this.api.loadFriendActivities(),
        this.api.loadFriendRequests(),
      ]);
      this.friends.set(friends);
      this.activities.set(activities);
      this.requests.set(requests);
    } catch (error) {
      this.report(error);
    } finally {
      this.loading.set(false);
    }
  }

  async loadRequests(): Promise<void> {
    try {
      this.requests.set(await this.api.loadFriendRequests());
      this.error.set('');
    } catch (error) {
      this.report(error);
    }
  }

  async loadHeaderData(): Promise<void> {
    try {
      const [friends, requests] = await Promise.all([
        this.api.loadFriends(),
        this.api.loadFriendRequests(),
      ]);
      this.friends.set(friends);
      this.requests.set(requests);
      this.error.set('');
    } catch (error) {
      this.report(error);
    }
  }

  reset(): void {
    this.friends.set([]);
    this.activities.set([]);
    this.requests.set([]);
    this.error.set('');
  }

  async addFriend(email: string): Promise<boolean> {
    try {
      const request = await this.api.addFriend(email);
      this.requests.update((requests) => [...requests, request]);
      this.error.set('');
      return true;
    } catch (error) {
      this.report(error);
      return false;
    }
  }

  async acceptRequest(requestId: string): Promise<void> {
    try {
      await this.api.acceptFriendRequest(requestId);
      await this.load();
    } catch (error) {
      this.report(error);
    }
  }

  async removeRequest(requestId: string): Promise<void> {
    try {
      await this.api.removeFriendRequest(requestId);
      this.requests.update((requests) => requests.filter((request) => request.id !== requestId));
      this.error.set('');
    } catch (error) {
      this.report(error);
    }
  }

  async removeFriend(friendId: string): Promise<void> {
    try {
      await this.api.removeFriend(friendId);
      this.friends.update((friends) => friends.filter((friend) => friend.id !== friendId));
      this.activities.update((activities) =>
        activities.filter((activity) => activity.author.id !== friendId),
      );
    } catch (error) {
      this.report(error);
    }
  }

  async toggleReaction(activity: FriendActivity, type: ActivityReactionType): Promise<boolean> {
    try {
      if (activity.myReactions.includes(type))
        await this.api.removeActivityReaction(activity.id, type);
      else await this.api.addActivityReaction(activity.id, type);
      this.activities.set(await this.api.loadFriendActivities());
      this.error.set('');
      return true;
    } catch (error) {
      this.report(error);
      return false;
    }
  }

  private report(error: unknown): void {
    this.logger.error('Friends API request failed', error);
    this.error.set(
      error instanceof HttpErrorResponse && typeof error.error?.error === 'string'
        ? error.error.error
        : "Something went wrong, the API didn't respond correctly.",
    );
  }
}
