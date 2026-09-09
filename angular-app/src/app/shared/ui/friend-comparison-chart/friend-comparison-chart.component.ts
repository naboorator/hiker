import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import type { FriendComparisonSeries } from '../../../core/interface/friend-comparison-series.interface';
import {
  FRIEND_CHART_HEIGHT,
  FRIEND_CHART_MINIMUM_WIDTH,
  FRIEND_CHART_PLOT,
  FRIEND_CHART_RIGHT_PADDING,
} from './friend-comparison-chart.constants';
import { comparisonSeriesColor, comparisonYPosition } from './friend-comparison-chart.helpers';

@Component({
  selector: 'app-friend-comparison-chart',
  imports: [TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './friend-comparison-chart.component.html',
  styleUrl: './friend-comparison-chart.component.css',
})
export class FriendComparisonChartComponent {
  readonly series = input.required<readonly FriendComparisonSeries[]>();
  readonly month = input.required<string>();
  readonly chartHeight = FRIEND_CHART_HEIGHT;
  readonly plot = FRIEND_CHART_PLOT;

  readonly days = computed(() => {
    const [year, month] = this.month().split('-').map(Number);
    return Array.from({ length: new Date(year, month, 0).getDate() }, (_, index) => index + 1);
  });
  readonly chartWidth = computed(() =>
    Math.max(
      FRIEND_CHART_MINIMUM_WIDTH,
      this.plot.left +
        FRIEND_CHART_RIGHT_PADDING +
        this.days().length * Math.max(28, this.series().length * 12),
    ),
  );
  readonly maximum = computed(() => {
    const maximum = Math.max(
      0,
      ...this.series().flatMap((item) => item.days.map((day) => day.activityCount)),
    );
    return Math.max(4, Math.ceil(maximum / 4) * 4);
  });
  readonly ticks = computed(() =>
    Array.from({ length: 5 }, (_, index) => {
      const value = (this.maximum() / 4) * index;
      return { value, y: comparisonYPosition(value, this.maximum(), this.plot) };
    }).reverse(),
  );
  readonly legend = computed(() =>
    this.series().map((item, index) => ({ ...item, color: comparisonSeriesColor(index) })),
  );
  readonly bars = computed(() => {
    const days = this.days();
    const series = this.series();
    const plotWidth = this.chartWidth() - this.plot.left - FRIEND_CHART_RIGHT_PADDING;
    const dayWidth = plotWidth / days.length;
    const groupWidth = Math.min(dayWidth * 0.82, Math.max(12, series.length * 10));
    const barWidth = groupWidth / series.length;

    return days.flatMap((day, dayIndex) =>
      series.map((item, seriesIndex) => {
        const date = `${this.month()}-${String(day).padStart(2, '0')}`;
        const count = item.days.find((value) => value.date === date)?.activityCount ?? 0;
        const y = comparisonYPosition(count, this.maximum(), this.plot);
        return {
          key: `${date}:${item.userId}`,
          day,
          name: item.name,
          count,
          color: comparisonSeriesColor(seriesIndex),
          x:
            this.plot.left +
            dayIndex * dayWidth +
            (dayWidth - groupWidth) / 2 +
            seriesIndex * barWidth,
          y,
          width: Math.max(1.5, barWidth - 1),
          height: this.plot.bottom - y,
        };
      }),
    );
  });

  dayX(index: number): number {
    const plotWidth = this.chartWidth() - this.plot.left - FRIEND_CHART_RIGHT_PADDING;
    return this.plot.left + (index + 0.5) * (plotWidth / this.days().length);
  }
}
