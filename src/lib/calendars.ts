import type { CalendarData } from './model';
import { validDate } from './time';
export const CACHE_KEY='world-work-clock:calendar:v1';
export function validCalendarData(value:unknown): value is CalendarData {
  if(!value||typeof value!=='object')return false;
  const d=value as CalendarData;
  if(d.schemaVersion!==1||typeof d.dataVersion!=='string'||!/^\w{16}$/.test(d.dataVersion)||!Number.isFinite(Date.parse(d.generatedAt))||!d.calendars||typeof d.calendars!=='object'||!Object.keys(d.calendars).length)return false;
  return Object.entries(d.calendars).every(([key,c])=>/^[A-Z]{2}(?:-[A-Z0-9]+)?$/.test(key)&&c&&typeof c.countryCode==='string'&&typeof c.scope==='string'&&typeof c.sourceUrl==='string'&&c.sourceUrl.startsWith('https://')&&c.years&&Object.entries(c.years).every(([year,y])=>/^\d{4}$/.test(year)&&y&&['rule-based','projected'].includes(y.coverage)&&y.days&&Object.entries(y.days).every(([date,e])=>validDate(date)&&date.startsWith(year)&&e&&typeof e.name==='string'&&typeof e.originalName==='string'&&['public-holiday','working-day'].includes(e.kind))));
}
export function cachedCalendar():CalendarData|null {
  try {const raw=localStorage.getItem(CACHE_KEY);if(!raw)return null;const d=JSON.parse(raw);return validCalendarData(d)?d:null;}catch{return null;}
}
export async function fetchCalendar(signal:AbortSignal):Promise<CalendarData> {
  const response=await fetch(`${import.meta.env.BASE_URL}data/calendars.json`,{signal,cache:'no-cache'});
  if(!response.ok)throw new Error(`日历加载失败（${response.status}）`);
  const value:unknown=await response.json();
  if(!validCalendarData(value))throw new Error('日历文件格式无效');
  try {localStorage.setItem(CACHE_KEY,JSON.stringify(value));}catch {/* The loaded calendar is still usable in memory. */}
  return value;
}
