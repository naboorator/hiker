import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import type { ChartDay } from '../../core/interface/chart-day.interface';
import type { WeightChartPoint } from '../../core/interface/weight-chart-point.interface';
import { MockHikeStore } from '../../core/stores/mock-hike.store';
import { AppHeaderComponent } from '../../shared/ui/app-header/app-header.component';
import { applicationLocale, monthParts, toMonthKey } from '../../core/utils/date-format.helpers';
import { GRAPH_CHART_HEIGHT, GRAPH_CHART_WIDTH, GRAPH_PLOT } from './graphs.constants';
import {
  activityAxisMaximum,
  chartXPosition,
  chartYPosition,
  formatWeight,
  formatWeightDate,
  timeAxisMaximum,
} from './graphs.helpers';

@Component({
  imports: [AppHeaderComponent, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './graphs.page.html',
  styleUrl: './graphs.page.css',
})
export class GraphsPage {
  private readonly transloco = inject(TranslocoService);
  private readonly activeLanguage = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang(),
  });
  private readonly today = new Date();
  private readonly currentMonth = toMonthKey(this.today.getFullYear(), this.today.getMonth());

  readonly store = inject(MockHikeStore);
  readonly selectedMonth = signal(this.currentMonth);
  readonly chartWidth = GRAPH_CHART_WIDTH;
  readonly chartHeight = GRAPH_CHART_HEIGHT;
  readonly plot = GRAPH_PLOT;

  readonly monthLabel = computed(() => {
    const { year, monthIndex } = monthParts(this.selectedMonth());
    return new Intl.DateTimeFormat(applicationLocale(this.activeLanguage()), {
      month: 'long',
      year: 'numeric',
    }).format(new Date(year, monthIndex, 1));
  });

  readonly canGoToNextMonth = computed(() => this.selectedMonth() < this.currentMonth);

  readonly days = computed<ChartDay[]>(() => {
    const { year, monthIndex } = monthParts(this.selectedMonth());
    const numberOfDays = new Date(year, monthIndex + 1, 0).getDate();
    const totals = new Map<number, { minutes: number; activityCount: number }>();

    for (const hike of this.store.hikes()) {
      if (!hike.date.startsWith(`${this.selectedMonth()}-`)) continue;
      const day = Number(hike.date.slice(8, 10));
      const total = totals.get(day) ?? { minutes: 0, activityCount: 0 };
      totals.set(day, {
        minutes: total.minutes + hike.minutes,
        activityCount: total.activityCount + 1,
      });
    }

    const values = Array.from({ length: numberOfDays }, (_, index) => ({
      day: index + 1,
      date: `${this.selectedMonth()}-${String(index + 1).padStart(2, '0')}`,
      minutes: totals.get(index + 1)?.minutes ?? 0,
      activityCount: totals.get(index + 1)?.activityCount ?? 0,
    }));
    const yMaximum = timeAxisMaximum(values.map(({ minutes }) => minutes));
    const activityMaximum = activityAxisMaximum(values.map(({ activityCount }) => activityCount));

    return values.map((value) => ({
      ...value,
      x: chartXPosition(value.day, numberOfDays, this.plot),
      y: chartYPosition(value.minutes, yMaximum, this.plot),
      activityY: chartYPosition(value.activityCount, activityMaximum, this.plot),
    }));
  });

  readonly yMaximum = computed(() => timeAxisMaximum(this.days().map(({ minutes }) => minutes)));
  readonly yTicks = computed(() =>
    Array.from({ length: 5 }, (_, index) => {
      const minutes = (this.yMaximum() / 4) * index;
      return { minutes, y: chartYPosition(minutes, this.yMaximum(), this.plot) };
    }).reverse(),
  );
  readonly activityMaximum = computed(() =>
    activityAxisMaximum(this.days().map(({ activityCount }) => activityCount)),
  );
  readonly activityTicks = computed(() =>
    Array.from({ length: 5 }, (_, index) => {
      const count = (this.activityMaximum() / 4) * index;
      return { count, y: chartYPosition(count, this.activityMaximum(), this.plot) };
    }).reverse(),
  );
  readonly timeLinePoints = computed(() =>
    this.days()
      .map(({ x, y }) => `${x},${y}`)
      .join(' '),
  );
  readonly activityLinePoints = computed(() =>
    this.days()
      .map(({ x, activityY }) => `${x},${activityY}`)
      .join(' '),
  );
  readonly monthTotal = computed(() => this.days().reduce((total, day) => total + day.minutes, 0));
  readonly monthActivityTotal = computed(() =>
    this.days().reduce((total, day) => total + day.activityCount, 0),
  );
  readonly participation = computed(() => {
    const ownerName = this.store.settings().ownerName;
    const hikes = this.store
      .hikes()
      .filter(({ date }) => date.startsWith(`${this.selectedMonth()}-`));
    const solo = hikes.filter(({ people }) =>
      people.every((person) => person === ownerName),
    ).length;
    const withOthers = hikes.length - solo;

    return {
      total: hikes.length,
      solo,
      withOthers,
      soloPercentage: hikes.length ? Math.round((solo / hikes.length) * 100) : 0,
      withOthersPercentage: hikes.length ? Math.round((withOthers / hikes.length) * 100) : 0,
    };
  });
  readonly weightChart = computed(() => {
    const entries = [...this.store.weights()].sort(
      (a, b) => a.recordedOn.localeCompare(b.recordedOn) || a.createdAt.localeCompare(b.createdAt),
    );
    const weights = entries.map(({ weightKg }) => weightKg);
    const minimumWeight = weights.length ? Math.floor(Math.min(...weights) - 1) : 0;
    const maximumWeight = weights.length ? Math.ceil(Math.max(...weights) + 1) : 100;
    const range = Math.max(1, maximumWeight - minimumWeight);
    const width = this.plot.right - this.plot.left;
    const height = this.plot.bottom - this.plot.top;
    const points: WeightChartPoint[] = entries.map((entry, index) => ({
      ...entry,
      x:
        this.plot.left +
        (entries.length === 1 ? width / 2 : (index / (entries.length - 1)) * width),
      y: this.plot.bottom - ((entry.weightKg - minimumWeight) / range) * height,
    }));

    return {
      points,
      linePoints: points.map(({ x, y }) => `${x},${y}`).join(' '),
      ticks: Array.from({ length: 5 }, (_, index) => {
        const weightKg = minimumWeight + (range / 4) * index;
        return {
          weightKg,
          y: this.plot.bottom - ((weightKg - minimumWeight) / range) * height,
        };
      }).reverse(),
      change: entries.length > 1 ? entries.at(-1)!.weightKg - entries[0].weightKg : 0,
    };
  });

  changeMonth(offset: number): void {
    const { year, monthIndex } = monthParts(this.selectedMonth());
    const target = new Date(year, monthIndex + offset, 1);
    const monthKey = toMonthKey(target.getFullYear(), target.getMonth());
    if (monthKey <= this.currentMonth) this.selectedMonth.set(monthKey);
  }

  format(minutes: number): string {
    return minutes >= 60
      ? `${(minutes / 60).toFixed(minutes % 60 === 0 ? 0 : 1)} ${this.transloco.translate('common.hourShort')}`
      : `${minutes} ${this.transloco.translate('common.minuteShort')}`;
  }

  timeDayLabel(day: ChartDay): string {
    return this.transloco.translate('graphs.timeDayValue', {
      day: day.day,
      time: this.format(day.minutes),
    });
  }

  activityDayLabel(day: ChartDay): string {
    return this.transloco.translate('graphs.activityDayValue', {
      day: day.day,
      count: day.activityCount,
    });
  }

  weightPointLabel(point: WeightChartPoint): string {
    return this.transloco.translate('graphs.weightPointValue', {
      date: formatWeightDate(point.recordedOn, this.activeLanguage()),
      weight: formatWeight(point.weightKg, this.activeLanguage()),
    });
  }

  formatWeightDate(date: string): string {
    return formatWeightDate(date, this.activeLanguage());
  }

  formatWeight(weightKg: number): string {
    return formatWeight(weightKg, this.activeLanguage());
  }
}
