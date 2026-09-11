import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LiveActivityStore } from '../../core/stores/live-activity.store';
import { MockHikeStore } from '../../core/stores/mock-hike.store';
import type { HikeDraft } from '../../core/interface/hike-draft.interface';
import { HomePage } from './home.page';

describe('HomePage live activity flow', () => {
  const addMockHike = vi.fn();
  const liveActivity = {
    activity: signal<null>(null),
    error: signal(null),
    start: vi.fn(),
    stop: vi.fn(),
    draft: vi.fn(),
    markSaving: vi.fn(),
    saveFailed: vi.fn(),
    completeSave: vi.fn(),
    discard: vi.fn(),
  };
  let page: HomePage;

  beforeEach(() => {
    addMockHike.mockReset();
    Object.values(liveActivity).forEach((value) => {
      if (typeof value === 'function' && 'mockReset' in value) value.mockReset();
    });
    TestBed.configureTestingModule({
      providers: [
        {
          provide: MockHikeStore,
          useValue: {
            settings: signal({ appName: 'My Hike', ownerName: 'Zoran' }),
            hikes: signal([]),
            weights: signal([]),
            people: signal(['Zoran']),
            todayHikes: signal([]),
            totalMinutes: signal(0),
            lastActivityType: signal('hiking'),
            lastHikingName: signal('Hill'),
            addMockHike,
          },
        },
        { provide: LiveActivityStore, useValue: liveActivity },
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
    TestBed.overrideComponent(HomePage, { set: { template: '' } });
    page = TestBed.createComponent(HomePage).componentInstance;
  });

  it('starts the selected activity and closes the start dialog', () => {
    liveActivity.start.mockReturnValue(true);
    page.startModalOpen.set(true);
    page.start('fitness');
    expect(liveActivity.start).toHaveBeenCalledWith('fitness');
    expect(page.startModalOpen()).toBe(false);
  });

  it('opens completion with measured values after stop', () => {
    liveActivity.stop.mockReturnValue({
      activityType: 'hiking',
      name: '',
      date: '2026-09-10',
      minutes: 31,
      metres: 420,
      people: [],
    });
    page.stop();
    expect(page.completionDraft()).toMatchObject({ minutes: 31, metres: 420, people: ['Zoran'] });
    expect(page.completionModalOpen()).toBe(true);
  });

  it('clears local tracking only after a successful API save', async () => {
    addMockHike.mockResolvedValue(undefined);
    const draft: HikeDraft = {
      activityType: 'fitness',
      name: 'Fitness',
      date: '2026-09-10',
      minutes: 30,
      metres: null,
      people: ['Zoran'],
    };
    await page.save(draft);
    expect(liveActivity.markSaving).toHaveBeenCalled();
    expect(addMockHike).toHaveBeenCalledWith(draft);
    expect(liveActivity.completeSave).toHaveBeenCalled();
  });

  it('preserves the stopped activity when the API save fails', async () => {
    addMockHike.mockRejectedValue(new Error('offline'));
    const draft: HikeDraft = {
      activityType: 'hiking',
      name: 'Hill',
      date: '2026-09-10',
      minutes: 30,
      metres: 200,
      people: ['Zoran'],
    };
    await page.save(draft);
    expect(liveActivity.saveFailed).toHaveBeenCalled();
    expect(liveActivity.completeSave).not.toHaveBeenCalled();
  });
});
