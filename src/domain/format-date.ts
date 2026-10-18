// Fixed UTC formatting keeps the illustrative fixture stable across environments.
const dayFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'UTC',
});

export function formatDay(date: string): string {
  return dayFormatter.format(new Date(date));
}

export function formatUpdatedAt(date: string): string {
  const value = new Date(date);
  return `${dayFormatter.format(value)}, ${timeFormatter.format(value)}`;
}
