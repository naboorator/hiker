export type DatePart = 'day' | 'month' | 'year';

export function applicationLocale(language: string): string {
  return language === 'si' ? 'sl' : 'en';
}

export function formatDatePart(value: string, part: DatePart, language: string): string {
  const options: Intl.DateTimeFormatOptions =
    part === 'day'
      ? { day: 'numeric' }
      : part === 'month'
        ? { month: 'short' }
        : { year: 'numeric' };
  return new Intl.DateTimeFormat(applicationLocale(language), options).format(
    new Date(`${value}T12:00:00`),
  );
}

export function formatRegistrationDate(createdAt: string, language: string): string {
  return new Intl.DateTimeFormat(applicationLocale(language), { dateStyle: 'medium' }).format(
    new Date(createdAt),
  );
}

export function toMonthKey(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
}

export function monthParts(monthKey: string): { year: number; monthIndex: number } {
  const [year, month] = monthKey.split('-').map(Number);
  return { year, monthIndex: month - 1 };
}
