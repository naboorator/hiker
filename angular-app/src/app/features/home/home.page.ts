import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { AppHeaderComponent } from '../../shared/ui/app-header/app-header.component';
import { HikeFormComponent } from '../../shared/ui/hike-form/hike-form.component';
import { HikeListComponent } from '../../shared/ui/hike-list/hike-list.component';
import { ActivityMonthListComponent } from '../../shared/ui/activity-month-list/activity-month-list.component';
import { MyWeightComponent } from '../../shared/ui/my-weight/my-weight.component';
import type { ActivityDayGroup } from '../../core/interface/activity-day-group.interface';
import type { HikeDraft } from '../../core/interface/hike-draft.interface';
import type { Hike } from '../../core/interface/hike.interface';
import { MockHikeStore } from '../../core/stores/mock-hike.store';
@Component({
  imports: [
    AppHeaderComponent,
    HikeFormComponent,
    HikeListComponent,
    ActivityMonthListComponent,
    MyWeightComponent,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.page.html',
  styleUrl: './home.page.css',
})
export class HomePage {
  readonly store = inject(MockHikeStore);
  private readonly transloco = inject(TranslocoService);
  private readonly activeLanguage = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang(),
  });
  readonly formOpen = signal(false);
  readonly weightModalOpen = signal(false);
  readonly names = computed(() => [...new Set(this.store.hikes().map((x) => x.name))]);
  readonly month = computed(() => groupCurrent(this.store.hikes(), this.activeLanguage()));
  format(m: number) {
    return m >= 60
      ? `${(m / 60).toFixed(1)} ${this.transloco.translate('common.hourShort')}`
      : `${m} ${this.transloco.translate('common.minuteShort')}`;
  }
  async save(d: HikeDraft) {
    await this.store.addMockHike(d);
    this.formOpen.set(false);
  }
}
function groupCurrent(hikes: Hike[], language: string) {
  type DayDraft = Omit<ActivityDayGroup, 'summary' | 'hikes'> & { hikes: Hike[] };
  const days = new Map<string, DayDraft>();
  for (const hike of hikes.filter((x) => x.date.startsWith(new Date().toISOString().slice(0, 7)))) {
    let day = days.get(hike.date);
    if (!day) {
      const s = new Date(hike.date + 'T12:00:00');
      day = {
        date: hike.date,
        day: s.getDate(),
        month: new Intl.DateTimeFormat(language === 'si' ? 'sl' : 'en', { month: 'short' }).format(
          s,
        ),
        hikes: [],
        minutes: 0,
        metres: 0,
      };
      days.set(hike.date, day);
    }
    day.hikes.push(hike);
    day.minutes += hike.minutes;
    day.metres += hike.metres;
  }
  const values = [...days.values()]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((day) => ({
      ...day,
      summary: day.hikes.length === 1 ? day.hikes[0].name : '',
    }));
  return {
    days: values,
    minutes: values.reduce((s, d) => s + d.minutes, 0),
    metres: values.reduce((s, d) => s + d.metres, 0),
  };
}
