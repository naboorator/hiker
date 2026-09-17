import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { describe, expect, it, vi } from 'vitest';
import { HikeApiService } from '../../core/api/hike-api.service';
import { LogWrapper } from '../../core/logging/log-wrapper.service';
import { MockHikeStore } from '../../core/stores/mock-hike.store';
import { ActivityDetailPage } from './activity-detail.page';

describe('ActivityDetailPage', () => {
  const activity = {
    id: 'activity-1',
    activityType: 'hiking' as const,
    name: 'Forest trail',
    date: '2026-09-17',
    minutes: 45,
    metres: 3200,
    people: ['Zoran', 'Ana'],
    createdAt: 1,
  };

  function createPage(loadHike: ReturnType<typeof vi.fn>) {
    const logger = { error: vi.fn() };
    TestBed.configureTestingModule({
      imports: [ActivityDetailPage],
      providers: [
        { provide: HikeApiService, useValue: { loadHike } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => 'activity-1' } } },
        },
        {
          provide: MockHikeStore,
          useValue: { settings: signal({ appName: 'My Hike', ownerName: 'Zoran' }) },
        },
        {
          provide: TranslocoService,
          useValue: { getActiveLang: () => 'en', translate: (key: string) => key },
        },
        { provide: LogWrapper, useValue: logger },
      ],
    });
    TestBed.overrideComponent(ActivityDetailPage, { set: { template: '' } });
    return { page: TestBed.createComponent(ActivityDetailPage).componentInstance, logger };
  }

  it('loads the selected activity and exposes its translated type', async () => {
    const loadHike = vi.fn().mockResolvedValue(activity);
    const { page } = createPage(loadHike);
    await vi.waitFor(() => expect(page.loading()).toBe(false));

    expect(loadHike).toHaveBeenCalledWith('activity-1');
    expect(page.activity()).toEqual(activity);
    expect(page.typeTranslationKey(activity)).toBe('hikeForm.hiking');
    expect(page.formattedDate(activity.date)).toContain('2026');
  });

  it('shows a failed state and logs when the activity cannot be loaded', async () => {
    const loadHike = vi.fn().mockRejectedValue(new Error('not found'));
    const { page, logger } = createPage(loadHike);
    await vi.waitFor(() => expect(page.loading()).toBe(false));

    expect(page.loadFailed()).toBe(true);
    expect(logger.error).toHaveBeenCalled();
  });

  it('shows the unavailable state for an activity outside the user friend network', async () => {
    const loadHike = vi.fn().mockRejectedValue(
      new HttpErrorResponse({
        status: 403,
        error: { code: 'ACTIVITY_UNAVAILABLE' },
      }),
    );
    const { page } = createPage(loadHike);
    await vi.waitFor(() => expect(page.loading()).toBe(false));

    expect(page.unavailable()).toBe(true);
    expect(page.loadFailed()).toBe(false);
  });
});
