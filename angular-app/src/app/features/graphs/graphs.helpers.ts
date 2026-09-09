import { applicationLocale } from '../../core/utils/date-format.helpers';

export interface ChartPlot {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

export function chartXPosition(day: number, numberOfDays: number, plot: ChartPlot): number {
  return plot.left + ((day - 1) / Math.max(1, numberOfDays - 1)) * (plot.right - plot.left);
}

export function chartYPosition(value: number, maximum: number, plot: ChartPlot): number {
  return plot.bottom - (value / maximum) * (plot.bottom - plot.top);
}

export function timeAxisMaximum(values: number[]): number {
  return Math.max(60, Math.ceil(Math.max(0, ...values) / 30) * 30);
}

export function activityAxisMaximum(values: number[]): number {
  return Math.max(4, Math.ceil(Math.max(0, ...values) / 4) * 4);
}

export function formatWeightDate(date: string, language: string): string {
  return new Intl.DateTimeFormat(applicationLocale(language), {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  }).format(new Date(`${date}T12:00:00`));
}

export function formatWeight(weightKg: number, language: string): string {
  return `${new Intl.NumberFormat(applicationLocale(language), { maximumFractionDigits: 1 }).format(weightKg)} kg`;
}
