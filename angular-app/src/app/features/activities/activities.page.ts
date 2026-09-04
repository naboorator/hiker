import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { AppHeaderComponent } from '../../shared/ui/app-header/app-header.component';
import type { ActivityDayGroup } from '../../core/interface/activity-day-group.interface';
import type { HikeDraft } from '../../core/interface/hike-draft.interface';
import type { Hike } from '../../core/interface/hike.interface';
import type { MonthDraft } from '../../core/interface/month-draft.interface';
import { ActivityMonthListComponent } from '../../shared/ui/activity-month-list/activity-month-list.component';
import { HikeFormComponent } from '../../shared/ui/hike-form/hike-form.component';
import { ModalDialogComponent } from '../../shared/ui/modal-dialog/modal-dialog.component';
import { MockHikeStore } from '../../core/stores/mock-hike.store';
@Component({
  imports: [
    AppHeaderComponent,
    ActivityMonthListComponent,
    HikeFormComponent,
    ModalDialogComponent,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './activities.page.html',
  styleUrl: './activities.page.css',
})
export class ActivitiesPage {
  readonly store = inject(MockHikeStore);
  private readonly transloco = inject(TranslocoService);
  private readonly activeLanguage = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang(),
  });
  readonly selected = signal<Hike | null>(null);
  readonly adding = signal(false);
  readonly pendingDelete = signal<string | null>(null);
  readonly names = computed(() => [...new Set(this.store.hikes().map((x) => x.name))]);
  readonly months = computed(() => groupMonths(this.store.hikes(), this.activeLanguage()));

  constructor() {
    void this.store.refreshHikes();
    const refreshInterval = window.setInterval(() => void this.store.refreshHikes(), 5000);
    inject(DestroyRef).onDestroy(() => window.clearInterval(refreshInterval));
  }
  draft(h: Hike): HikeDraft {
    return {
      activityType: h.activityType,
      name: h.name,
      date: h.date,
      minutes: h.minutes,
      metres: h.metres,
      people: h.people,
    };
  }
  async save(id: string, d: HikeDraft) {
    await this.store.updateHike(id, d);
    this.selected.set(null);
  }
  async add(draft: HikeDraft): Promise<void> {
    await this.store.addMockHike(draft);
    this.adding.set(false);
  }
  async confirmDelete() {
    const id = this.pendingDelete();
    if (id) {
      await this.store.removeMockHike(id);
      this.pendingDelete.set(null);
    }
  }
}
function groupMonths(hikes: Hike[], language: string) {
  type DayDraft = Omit<ActivityDayGroup, 'summary' | 'hikes'> & { hikes: Hike[] };
  const months = new Map<string, MonthDraft>();
  for (const hike of hikes) {
    const key = hike.date.slice(0, 7);
    let month = months.get(key);
    if (!month) {
      month = {
        key,
        title: new Intl.DateTimeFormat(language === 'si' ? 'sl' : 'en', {
          month: 'long',
          year: 'numeric',
        }).format(new Date(hike.date + 'T12:00:00')),
        minutes: 0,
        metres: 0,
        byDay: new Map<string, DayDraft>(),
      };
      months.set(key, month);
    }
    month.minutes += hike.minutes;
    month.metres += hike.metres;
    let day = month.byDay.get(hike.date);
    if (!day) {
      const stamp = new Date(hike.date + 'T12:00:00');
      day = {
        date: hike.date,
        day: stamp.getDate(),
        month: new Intl.DateTimeFormat(language === 'si' ? 'sl' : 'en', {
          month: 'short',
        }).format(stamp),
        hikes: [],
        minutes: 0,
        metres: 0,
      };
      month.byDay.set(hike.date, day);
    }
    day.hikes.push(hike);
    day.minutes += hike.minutes;
    day.metres += hike.metres;
  }
  return [...months.values()]
    .sort((a, b) => b.key.localeCompare(a.key))
    .map((month) => ({
      ...month,
      days: [...month.byDay.values()]
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((day) => ({
          ...day,
          summary: day.hikes.length === 1 ? day.hikes[0].name : '',
        })) as ActivityDayGroup[],
    }));
}
