import type { ActivityDayGroup } from '../../core/interface/activity-day-group.interface';
import type { Hike } from '../../core/interface/hike.interface';

export function randomItem<T>(items: readonly T[]): T | undefined {
  return items[Math.floor(Math.random() * items.length)];
}

export function groupCurrentMonthActivities(hikes: Hike[], language: string) {
  type DayDraft = Omit<ActivityDayGroup, 'summary' | 'hikes'> & { hikes: Hike[] };
  const days = new Map<string, DayDraft>();
  const currentMonth = new Date().toISOString().slice(0, 7);
  for (const hike of hikes.filter((item) => item.date.startsWith(currentMonth))) {
    let day = days.get(hike.date);
    if (!day) {
      const date = new Date(`${hike.date}T12:00:00`);
      day = {
        date: hike.date,
        day: date.getDate(),
        month: new Intl.DateTimeFormat(language === 'si' ? 'sl' : 'en', {
          month: 'short',
        }).format(date),
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
    minutes: values.reduce((total, day) => total + day.minutes, 0),
    metres: values.reduce((total, day) => total + day.metres, 0),
  };
}
