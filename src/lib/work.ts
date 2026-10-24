import { countries, defaultSchedule, type CalendarData, type Country, type Region, type Settings } from './model';
import { addDays, beijingInstant, localTime } from './time';
export type State = 'work' | 'partial' | 'holiday' | 'weekend' | 'rest' | 'unknown';
export const labels: Record<State,string> = { work:'工作中', partial:'部分工作', holiday:'公共假日', weekend:'周末', rest:'非工作时段', unknown:'日历待核实' };
export function regionState(country: Country, region: Region, instant: number, data: CalendarData | null, settings: Settings) {
  const time = localTime(instant, region.timeZone), schedule = settings.schedules[region.id] || defaultSchedule;
  const year = data?.calendars[region.calendarKey]?.years[time.year];
  const complete = year?.coverage === 'rule-based';
  const event = year?.days[time.date];
  const inHours = schedule.intervals.some(([start,end]) => time.minutes >= start && time.minutes < end);
  const weekend = schedule.weekend.includes(time.weekday);
  let status: State;
  if (complete && event?.kind === 'public-holiday') status = 'holiday';
  else if (complete && event?.kind === 'working-day') status = inHours ? 'work' : 'rest';
  else if (!complete && inHours) status = 'unknown';
  else if (weekend) status = 'weekend';
  else status = inHours ? 'work' : 'rest';
  return { region, time, event, complete, inHours, status, working: status==='work', uncertain: status==='unknown' };
}
export function countryState(country: Country, instant: number, data: CalendarData | null, settings: Settings) {
  const selected = settings.regions[country.code];
  const regions = country.regions.filter(r => selected.includes(r.id)).map(r => regionState(country,r,instant,data,settings));
  const working = regions.filter(r=>r.working).length, unknown = regions.filter(r=>r.uncertain).length;
  const holiday = regions.filter(r=>r.status==='holiday');
  const status: State = working===regions.length ? 'work' : working ? 'partial' : unknown ? 'unknown' : holiday.length ? 'holiday' : regions.every(r=>r.status==='weekend') ? 'weekend' : 'rest';
  return { country, regions, working, unknown, holiday, status };
}
export type CountryState = ReturnType<typeof countryState>;
export function getStates(instant: number, data: CalendarData | null, settings: Settings) {
  return countries.filter(c=>settings.enabled.includes(c.code)).map(c=>countryState(c,instant,data,settings));
}
export function coverage(states: CountryState[], settings: Settings) {
  // Normalize before multiplication so very small, valid weights cannot underflow.
  const scale = settings.weighted ? Math.max(...states.map(s=>settings.weights[s.country.code])) : 1;
  if (!scale || !Number.isFinite(scale)) return { lower:0, upper:0 };
  const weight = (s:CountryState) => settings.weighted ? settings.weights[s.country.code]/scale : 1;
  const total = states.reduce((sum,s)=>sum+weight(s),0);
  if (!total) return { lower:0, upper:0 };
  const sum = (uncertain: boolean) => states.reduce((n,s)=>n+((s.working+(uncertain?s.unknown:0))/s.regions.length)*weight(s),0)/total*100;
  return { lower: Math.round(sum(false)), upper: Math.round(sum(true)) };
}
export function timeline(country: Country, region: Region, date: string, data: CalendarData | null, settings: Settings) {
  const slots = Array.from({length:96},(_,i)=>regionState(country,region,beijingInstant(date,i*15),data,settings));
  const result: { start:number; end:number; state: State }[] = [];
  slots.forEach((slot,i)=>{
    const state = slot.status;
    if (!['work','unknown','holiday'].includes(state)) return;
    // Full-day holiday is shown only over the configured work intervals.
    if (state==='holiday' && !slot.inHours) return;
    const last = result.at(-1);
    if(last?.end===i && last.state===state) last.end=i+1;
    else result.push({start:i,end:i+1,state});
  });
  return result;
}
export function overlap(date: string, data: CalendarData | null, settings: Settings) {
  return Array.from({length:96},(_,i)=>({minutes:i*15,...coverage(getStates(beijingInstant(date,i*15),data,settings),settings)}));
}
export function upcoming(instant: number, data: CalendarData | null, settings: Settings, days=90) {
  const events: {country: Country; date:string; name:string; originalName:string; regions:string[]; projected:boolean; sourceUrl:string}[]=[];
  if(!data) return events;
  for(const country of countries.filter(c=>settings.enabled.includes(c.code))) {
    for(const region of country.regions.filter(r=>settings.regions[country.code].includes(r.id))) {
      const today=localTime(instant,region.timeZone).date, end=addDays(today,days);
      const calendar=data.calendars[region.calendarKey];
      if(!calendar) continue;
      for(const year of Object.values(calendar.years)) for(const [date,event] of Object.entries(year.days)) {
        if(event.kind!=='public-holiday'||date<today||date>end) continue;
        const existing=events.find(e=>e.country.code===country.code&&e.date===date&&e.name===event.name);
        if(existing) existing.regions.push(region.name);
        else events.push({country,date,name:event.name,originalName:event.originalName,regions:[region.name],projected:year.coverage==='projected',sourceUrl:calendar.sourceUrl});
      }
    }
  }
  return events.sort((a,b)=>a.date.localeCompare(b.date)||a.country.name.localeCompare(b.country.name,'zh-CN'));
}

// Check every local year touched by a window, including a partially covered horizon.
export function calendarCoverage(instant: number, data: CalendarData | null, settings: Settings, days: number, code='all') {
  const missing: string[] = [], projected: string[] = [];
  for (const country of countries.filter(c=>settings.enabled.includes(c.code)&&(code==='all'||c.code===code))) {
    for (const region of country.regions.filter(r=>settings.regions[country.code].includes(r.id))) {
      const start=localTime(instant,region.timeZone).date, end=addDays(start,days);
      for(let year=Number(start.slice(0,4));year<=Number(end.slice(0,4));year++) {
        const coverage=data?.calendars[region.calendarKey]?.years[String(year)]?.coverage;
        const label=`${country.name}·${region.name} ${year}`;
        if(!coverage) missing.push(label);
        else if(coverage==='projected') projected.push(label);
      }
    }
  }
  return {missing,projected};
}
