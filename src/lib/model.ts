import countryData from '../../config/countries.json';
export type Region = { id: string; name: string; timeZone: string; subdiv: string; default: boolean; calendarKey: string };
export type Country = { code: string; name: string; flag: string; scope: string; sourceUrl: string; regions: Region[] };
export const countries: Country[] = countryData;
export type CalendarDay = { name: string; originalName: string; kind: 'public-holiday' | 'working-day' };
export type CalendarYear = { coverage: 'rule-based' | 'projected'; days: Record<string, CalendarDay> };
export type Calendar = { countryCode: string; subdiv: string; scope: string; sourceUrl: string; rulesUrl: string; years: Record<string, CalendarYear> };
export type CalendarData = { schemaVersion: 1; provider: string; providerVersion: string; dataVersion: string; generatedAt: string; reviewedThrough: number; coverageNote: string; calendars: Record<string, Calendar> };
export type Schedule = { weekend: number[]; intervals: [number, number][] };
export type Settings = { schemaVersion: 1; enabled: string[]; regions: Record<string, string[]>; schedules: Record<string, Schedule>; weighted: boolean; weights: Record<string, number> };
export const defaultSchedule: Schedule = { weekend: [0, 6], intervals: [[540, 1080]] };
export function defaultSettings(): Settings {
  return { schemaVersion: 1, enabled: countries.map(c => c.code), regions: Object.fromEntries(countries.map(c => [c.code, c.regions.filter(r => r.default).map(r => r.id)])), schedules: {}, weighted: false, weights: Object.fromEntries(countries.map(c => [c.code, 1])) };
}
export const clockText = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2,'0')}:${String(minutes % 60).padStart(2,'0')}`;
