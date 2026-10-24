import type { CalendarData } from './model';
import { validDate } from './time';
export const CACHE_KEY='world-work-clock:calendar:v1';
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const https=(v:unknown)=>typeof v==='string'&&v.startsWith('https://');
export function validCalendarData(value:unknown): value is CalendarData {
  if(!record(value))return false;
  const d=value;
  if(d.schemaVersion!==1||typeof d.dataVersion!=='string'||!/^\w{16}$/.test(d.dataVersion)
    ||typeof d.generatedAt!=='string'||!Number.isFinite(Date.parse(d.generatedAt))
    ||typeof d.provider!=='string'||!d.provider||typeof d.providerVersion!=='string'||!d.providerVersion
    ||typeof d.coverageNote!=='string'||!Number.isInteger(d.reviewedThrough)
    ||!record(d.calendars)||!Object.keys(d.calendars).length)return false;
  return Object.entries(d.calendars).every(([key,c])=>{
    if(!record(c)||typeof c.countryCode!=='string'||!/^[A-Z]{2}$/.test(c.countryCode)
      ||typeof c.subdiv!=='string'||key!==`${c.countryCode}${c.subdiv?'-'+c.subdiv:''}`
      ||typeof c.scope!=='string'||!https(c.sourceUrl)||!https(c.rulesUrl)
      ||!record(c.years)||!Object.keys(c.years).length)return false;
    return Object.entries(c.years).every(([year,y])=>{
      if(!/^\d{4}$/.test(year)||!record(y)||typeof y.coverage!=='string'||!['rule-based','projected'].includes(y.coverage)
        ||!record(y.days)||!Object.keys(y.days).length)return false;
      // Every supported annual calendar has public holidays. An empty annual response is a gap.
      return Object.entries(y.days).every(([date,e])=>validDate(date)&&date.startsWith(year)&&record(e)
        &&typeof e.name==='string'&&!!e.name&&typeof e.originalName==='string'
        &&typeof e.kind==='string'&&['public-holiday','working-day'].includes(e.kind));
    });
  });
}
export function cachedCalendar():CalendarData|null {
  try {const raw=localStorage.getItem(CACHE_KEY);if(!raw)return null;const d:unknown=JSON.parse(raw);return validCalendarData(d)?d:null;}catch{return null;}
}
export async function fetchCalendar(signal:AbortSignal):Promise<CalendarData> {
  const response=await fetch(`${import.meta.env.BASE_URL}data/calendars.json`,{signal,cache:'no-cache'});
  if(!response.ok)throw new Error(`日历加载失败（${response.status}）`);
  const value:unknown=await response.json();
  if(!validCalendarData(value))throw new Error('日历文件格式无效');
  try {localStorage.setItem(CACHE_KEY,JSON.stringify(value));}catch {/* The loaded calendar is still usable in memory. */}
  return value;
}
