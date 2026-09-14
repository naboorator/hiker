import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { HikeApiService } from '../../../core/api/hike-api.service';
import { LogWrapper } from '../../../core/logging/log-wrapper.service';
import { MockHikeStore } from '../../../core/stores/mock-hike.store';
import { AdminActivitiesPage } from './admin-activities.page';

describe('AdminActivitiesPage', () => {
  const activity = {
    id: 'activity-1',
    userId: 'user-1',
    activityType: 'hiking' as const,
    name: 'Hill',
    date: '2026-09-14',
    minutes: 60,
    metres: 3000,
    people: ['Zoran'],
    createdAt: 1,
    author: { id: 'user-1', name: 'Zoran' },
  };

  function createPage(loadAdminActivities: ReturnType<typeof vi.fn>) {
    const logger = { error: vi.fn() };
    TestBed.configureTestingModule({
      imports: [AdminActivitiesPage],
      providers: [
        { provide: HikeApiService, useValue: { loadAdminActivities } },
        { provide: LogWrapper, useValue: logger },
        {
          provide: MockHikeStore,
          useValue: { settings: signal({ appName: 'My Hike', ownerName: 'Zoran' }) },
        },
        {
          provide: TranslocoService,
          useValue: {
            langChanges$: of('en'),
            getActiveLang: () => 'en',
            translate: (key: string) => key,
          },
        },
      ],
    });
    TestBed.overrideComponent(AdminActivitiesPage, { set: { template: '' } });
    return { page: TestBed.createComponent(AdminActivitiesPage).componentInstance, logger };
  }

  it('loads and groups an administrator page of activities', async () => {
    const loadAdminActivities = vi.fn().mockResolvedValue({
      items: [activity],
      page: 1,
      pageSize: 10,
      totalActivities: 1,
      totalDays: 1,
      totalPages: 1,
    });
    const { page } = createPage(loadAdminActivities);
    await vi.waitFor(() => expect(page.loading()).toBe(false));

    expect(loadAdminActivities).toHaveBeenCalledWith(1, 10);
    expect(page.totalActivities()).toBe(1);
    expect(page.months()[0]?.days[0]?.hikes[0]?.author?.name).toBe('Zoran');
  });

  it('exposes a failed state and logs API errors', async () => {
    const loadAdminActivities = vi.fn().mockRejectedValue(new Error('offline'));
    const { page, logger } = createPage(loadAdminActivities);
    await vi.waitFor(() => expect(page.loading()).toBe(false));

    expect(page.loadFailed()).toBe(true);
    expect(logger.error).toHaveBeenCalled();
  });
});
