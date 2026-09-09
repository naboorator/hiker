export function toSqlDateTime(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid date-time value: ${String(value)}`);
  return date.toISOString().slice(0, 23).replace('T', ' ');
}
