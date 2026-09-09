import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HikeApiService } from '../api/hike-api.service';
import { AuthService } from '../auth/auth.service';
import { LogWrapper } from '../logging/log-wrapper.service';
import { FriendsStore } from './friends.store';
import { MockHikeStore } from './mock-hike.store';

describe('MockHikeStore', () => {
  let store: MockHikeStore;
  const api = {
    checkHealth: vi.fn(),
    loadSettings: vi.fn(),
    loadHikes: vi.fn(),
    loadWeights: vi.fn(),
    saveHike: vi.fn(),
  };
  const navigate = vi.fn();

  beforeEach(() => {
    Object.values(api).forEach((mock) => mock.mockReset());
    navigate.mockReset();
    TestBed.configureTestingModule({
      providers: [
        MockHikeStore,
        { provide: HikeApiService, useValue: api },
        { provide: LogWrapper, useValue: { error: vi.fn() } },
        {
          provide: AuthService,
          useValue: { isAuthenticated: signal(false), user: signal({ name: 'Zoran' }) },
        },
        { provide: FriendsStore, useValue: { friends: signal([{ id: 'friend-1', name: 'Ana' }]) } },
        { provide: Router, useValue: { navigate } },
      ],
    });
    store = TestBed.inject(MockHikeStore);
  });

  it('loads account data and uses the registered name for default settings', async () => {
    api.checkHealth.mockResolvedValue(true);
    api.loadSettings.mockResolvedValue({ appName: 'My hike log', ownerName: 'You' });
    api.loadHikes.mockResolvedValue([]);
    api.loadWeights.mockResolvedValue([]);
    await expect(store.load()).resolves.toBe(true);
    expect(store.settings().ownerName).toBe('Zoran');
    expect(store.apiOnline()).toBe(true);
    expect(store.loading()).toBe(false);
  });

  it('redirects to the unavailable page when health check fails', async () => {
    api.checkHealth.mockResolvedValue(false);
    await expect(store.load()).resolves.toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/service-unavailable']);
  });

  it('adds a saved activity to the store', async () => {
    const hike = {
      id: 'hike-1',
      date: '2026-09-09',
      minutes: 45,
      people: [],
      activityType: 'hiking',
      name: 'Hill',
      createdAt: 1,
    };
    api.saveHike.mockResolvedValue(hike);
    await store.addMockHike(hike as never);
    expect(store.hikes()).toEqual([hike]);
    expect(store.people()).toContain('Ana');
  });
});
