import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import type { ChartDay } from '../../core/interface/chart-day.interface';
import type { WeightChartPoint } from '../../core/interface/weight-chart-point.interface';
import { MockHikeStore } from '../../core/stores/mock-hike.store';
import { AppHeaderComponent } from '../../shared/ui/app-header/app-header.component';

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
  private readonly currentMonth = this.toMonthKey(this.today.getFullYear(), this.today.getMonth());

  readonly store = inject(MockHikeStore);
  readonly selectedMonth = signal(this.currentMonth);
  readonly chartWidth = 760;
  readonly chartHeight = 300;
  readonly plot = { left: 58, right: 700, top: 20, bottom: 242 } as const;

  readonly monthLabel = computed(() => {
    const { year, monthIndex } = this.monthParts();
    return new Intl.DateTimeFormat(this.locale(), { month: 'long', year: 'numeric' }).format(
      new Date(year, monthIndex, 1),
    );
  });

  readonly canGoToNextMonth = computed(() => this.selectedMonth() < this.currentMonth);

  readonly days = computed<ChartDay[]>(() => {
    const { year, monthIndex } = this.monthParts();
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
    const yMaximum = this.yMaximumFor(values.map(({ minutes }) => minutes));
    const activityMaximum = this.activityMaximumFor(
      values.map(({ activityCount }) => activityCount),
    );

    return values.map((value) => ({
      ...value,
      x: this.xPosition(value.day, numberOfDays),
      y: this.yPosition(value.minutes, yMaximum),
      activityY: this.yPosition(value.activityCount, activityMaximum),
    }));
  });

  readonly yMaximum = computed(() => this.yMaximumFor(this.days().map(({ minutes }) => minutes)));
  readonly yTicks = computed(() =>
    Array.from({ length: 5 }, (_, index) => {
      const minutes = (this.yMaximum() / 4) * index;
      return { minutes, y: this.yPosition(minutes, this.yMaximum()) };
    }).reverse(),
  );
  readonly activityMaximum = computed(() =>
    this.activityMaximumFor(this.days().map(({ activityCount }) => activityCount)),
  );
  readonly activityTicks = computed(() =>
    Array.from({ length: 5 }, (_, index) => {
      const count = (this.activityMaximum() / 4) * index;
      return { count, y: this.yPosition(count, this.activityMaximum()) };
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
    const { year, monthIndex } = this.monthParts();
    const target = new Date(year, monthIndex + offset, 1);
    const monthKey = this.toMonthKey(target.getFullYear(), target.getMonth());
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
      date: this.formatWeightDate(point.recordedOn),
      weight: this.formatWeight(point.weightKg),
    });
  }

  formatWeightDate(date: string): string {
    return new Intl.DateTimeFormat(this.locale(), {
      day: 'numeric',
      month: 'short',
      year: '2-digit',
    }).format(new Date(`${date}T12:00:00`));
  }

  formatWeight(weightKg: number): string {
    return `${new Intl.NumberFormat(this.locale(), { maximumFractionDigits: 1 }).format(weightKg)} kg`;
  }

  private monthParts(): { year: number; monthIndex: number } {
    const [year, month] = this.selectedMonth().split('-').map(Number);
    return { year, monthIndex: month - 1 };
  }

  private locale(): string {
    return this.activeLanguage() === 'si' ? 'sl' : 'en';
  }

  private toMonthKey(year: number, monthIndex: number): string {
    return `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
  }

  private xPosition(day: number, numberOfDays: number): number {
    const width = this.plot.right - this.plot.left;
    return this.plot.left + ((day - 1) / Math.max(1, numberOfDays - 1)) * width;
  }

  private yPosition(minutes: number, maximum: number): number {
    const height = this.plot.bottom - this.plot.top;
    return this.plot.bottom - (minutes / maximum) * height;
  }

  private yMaximumFor(values: number[]): number {
    const maximum = Math.max(0, ...values);
    return Math.max(60, Math.ceil(maximum / 30) * 30);
  }

  private activityMaximumFor(values: number[]): number {
    const maximum = Math.max(0, ...values);
    return Math.max(4, Math.ceil(maximum / 4) * 4);
  }
}
