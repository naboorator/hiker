import type { ActivityDayGroup } from '../interface/activity-day-group.interface';
import type { Hike } from '../interface/hike.interface';
import type { MonthDraft } from '../interface/month-draft.interface';

export function groupActivitiesByMonth(hikes: Hike[], language: string) {
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
