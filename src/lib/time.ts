const formatters = new Map<string, Intl.DateTimeFormat>();
export function localTime(instant: number, timeZone: string) {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-GB', { timeZone, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hourCycle:'h23' });
    formatters.set(timeZone, formatter);
  }
  const parts = Object.fromEntries(formatter.formatToParts(instant).map(p => [p.type,p.value]));
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  return { date, year: parts.year, clock: `${parts.hour}:${parts.minute}`, minutes: Number(parts.hour)*60+Number(parts.minute), weekday: new Date(`${date}T12:00:00Z`).getUTCDay() };
}
export const beijingInstant = (date: string, minutes: number) => Date.parse(`${date}T00:00:00+08:00`) + minutes*60000;
export const addDays = (date: string, days: number) => new Date(Date.parse(`${date}T12:00:00Z`)+days*86400000).toISOString().slice(0,10);
export const weekdayText = (weekday: number) => `周${'日一二三四五六'[weekday]}`;
export function validDate(date: string) { return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0,10) === date; }

// Shareable simulation links always identify an instant, never a device-local time.
export function parseSimulation(value: string | null): number | null {
  if (!value) return null;
  const match = value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/);
  if (!match || !validDate(match[1]) || +match[2]>23 || +match[3]>59 || +(match[4]||0)>59) return null;
  const instant=Date.parse(value);
  return Number.isFinite(instant) ? instant : null;
}
