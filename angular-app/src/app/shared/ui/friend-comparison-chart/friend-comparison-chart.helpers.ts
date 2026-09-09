import { FRIEND_CHART_COLORS } from './friend-comparison-chart.constants';

export function comparisonSeriesColor(index: number): string {
  return FRIEND_CHART_COLORS[index] ?? `hsl(${Math.round((index * 137.508) % 360)} 55% 45%)`;
}

export function comparisonYPosition(
  value: number,
  maximum: number,
  plot: { top: number; bottom: number },
): number {
  return plot.bottom - (value / maximum) * (plot.bottom - plot.top);
}
