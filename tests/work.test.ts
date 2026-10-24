import { describe,it,expect } from 'vitest';
import raw from '../public/data/calendars.json';
import { countries,defaultSettings,type CalendarData } from '../src/lib/model';
import { beijingInstant,localTime,parseSimulation } from '../src/lib/time';
import { regionState,countryState,getStates,coverage,timeline,upcoming,calendarCoverage } from '../src/lib/work';
import { parseIntervals,validSettings } from '../src/lib/settings';
import { validCalendarData } from '../src/lib/calendars';
const data=raw as CalendarData,settings=defaultSettings();
const country=(code:string)=>countries.find(c=>c.code===code)!;
const at=(code:string,date:string,time='10:00')=>regionState(country(code),country(code).regions[0],Date.parse(`${date}T${time}:00+08:00`),data,settings);
describe('local dates and DST',()=>{
 it('uses destination year across New Year',()=>{expect(localTime(Date.parse('2027-01-01T08:00:00+08:00'),'America/Los_Angeles').date).toBe('2026-12-31')});
 it('distinguishes two instants in repeated New York hour',()=>{expect(localTime(Date.parse('2026-11-01T05:30:00Z'),'America/New_York').clock).toBe('01:30');expect(localTime(Date.parse('2026-11-01T06:30:00Z'),'America/New_York').clock).toBe('01:30');expect(localTime(Date.parse('2026-11-01T07:30:00Z'),'America/New_York').clock).toBe('02:30')});
 it('uses actual London and Sydney summer offsets',()=>{expect(localTime(Date.parse('2026-07-01T00:00:00Z'),'Europe/London').clock).toBe('01:00');expect(localTime(Date.parse('2026-01-01T00:00:00Z'),'Australia/Sydney').clock).toBe('11:00');expect(localTime(Date.parse('2026-07-01T00:00:00Z'),'Australia/Sydney').clock).toBe('10:00')});
});
describe('work status and calendar precedence',()=>{
 it('includes opening but excludes closing minute',()=>{expect(at('CN','2026-10-26','09:00').status).toBe('work');expect(at('CN','2026-10-26','17:59').status).toBe('work');expect(at('CN','2026-10-26','18:00').status).toBe('rest')});
 it('recognizes official weekend make-up day and continuous leave',()=>{expect(at('CN','2026-10-10').status).toBe('work');expect(at('CN','2026-10-07').status).toBe('holiday');expect(at('CN','2026-01-04').event?.kind).toBe('working-day')});
 it('uses NZ Monday holiday while Beijing is still Sunday',()=>{const result=at('NZ','2026-10-25','20:00');expect(result.time.date).toBe('2026-10-26');expect(result.status).toBe('holiday')});
 it('aggregates partly working Australia without implying nationwide activity',()=>{const result=countryState(country('AU'),beijingInstant('2026-10-26',990),data,settings);expect(result.status).toBe('partial');expect(result.working).toBe(1);expect(result.regions).toHaveLength(3)});
 it('keeps a Victoria holiday out of NSW',()=>{const c=country('AU'),instant=Date.parse('2026-11-03T10:00:00+11:00');expect(regionState(c,c.regions.find(r=>r.subdiv==='VIC')!,instant,data,settings).status).toBe('holiday');expect(regionState(c,c.regions.find(r=>r.subdiv==='NSW')!,instant,data,settings).status).toBe('work')});
 it('shows unknown instead of work when calendar is absent or projected',()=>{expect(regionState(country('CN'),country('CN').regions[0],beijingInstant('2026-10-26',600),null,settings).status).toBe('unknown');expect(at('CN','2027-01-04').status).toBe('unknown')});
 it('keeps holiday visible outside work hours',()=>expect(at('CN','2026-10-01','23:00').status).toBe('holiday'));
 it('honors a custom local lunch break',()=>{const custom=structuredClone(settings);custom.schedules['CN-beijing']={weekend:[0,6],intervals:[[540,720],[780,1080]]};expect(regionState(country('CN'),country('CN').regions[0],beijingInstant('2026-10-26',750),data,custom).status).toBe('rest')});
 it('unknown regions remain in the coverage denominator',()=>{const s=structuredClone(settings);s.enabled=['CN','SG'];const partial=structuredClone(data);delete partial.calendars.CN;const states=getStates(beijingInstant('2026-10-26',600),partial,s);expect(coverage(states,s)).toEqual({lower:50,upper:100});s.weighted=true;s.weights.CN=3;expect(coverage(states,s)).toEqual({lower:25,upper:100})});
 it('timeline is consistent with state boundaries',()=>{expect(timeline(country('CN'),country('CN').regions[0],'2026-10-26',data,settings)).toEqual([{start:36,end:72,state:'work'}])});
 it('upcoming crosses years and marks forecasts',()=>{const events=upcoming(beijingInstant('2026-12-30',600),data,settings);expect(events.some(e=>e.date==='2027-01-01'&&e.projected)).toBe(true)});
});
describe('settings and data contracts',()=>{
 it('accepts split shifts but rejects overlaps and invalid clock values',()=>{expect(parseIntervals('09:00-12:00,13:00-18:00')).toEqual([[540,720],[780,1080]]);for(const text of ['22:00-06:00','09:00-12:00,11:00-18:00','09:60-18:00','24:00-24:01'])expect(()=>parseIntervals(text)).toThrow()});
 it('validates supported region IDs and positive weighted totals',()=>{expect(validSettings(settings)).toBe(true);const s=structuredClone(settings);s.enabled=[];expect(validSettings(s)).toBe(false);s.enabled=['CN'];s.weighted=true;s.weights.CN=0;expect(validSettings(s)).toBe(false);s.weights.CN=1;s.regions.CN=['unknown'];expect(validSettings(s)).toBe(false)});
 it('rejects corrupted data rather than treating it as a normal workday',()=>{expect(validCalendarData(data)).toBe(true);expect(validCalendarData({})).toBe(false);const d=structuredClone(data);d.calendars.CN.years['2026'].days['2026-02-30']={name:'bad',originalName:'bad',kind:'working-day'};expect(validCalendarData(d)).toBe(false)});
});

describe('delivery boundary regressions',()=>{
 it('requires explicit zones and real dates in share links',()=>{
  expect(parseSimulation('2026-10-26T16:30:00+08:00')).toBe(Date.parse('2026-10-26T08:30:00Z'));
  for(const v of [null,'2026-10-26T16:30','2026-02-30T12:00:00Z','2026-10-26T24:01:00Z','bad'])expect(parseSimulation(v)).toBeNull();
 });
 it('tracks missing and projected local years across the horizon',()=>{
  const s=structuredClone(settings);s.enabled=['CN'];
  expect(calendarCoverage(beijingInstant('2026-12-31',600),data,s,14)).toEqual({missing:[],projected:['中国·北京 2027']});
  expect(calendarCoverage(beijingInstant('2028-01-01',600),data,s,90).missing).toEqual(['中国·北京 2028']);
 });
 it('reports coverage by selected region and country filter',()=>{
  const d=structuredClone(data);delete d.calendars['GB-SCT'];
  const s=structuredClone(settings);s.regions.GB.push('GB-edinburgh');
  expect(calendarCoverage(beijingInstant('2026-11-01',600),d,s,14,'GB').missing).toEqual(['英国·爱丁堡 2026']);
  expect(calendarCoverage(beijingInstant('2026-11-01',600),d,s,14,'CN').missing).toEqual([]);
 });
 it('does not infer a weekend is safe when all calendar data is missing',()=>{
  expect(regionState(country('SG'),country('SG').regions[0],beijingInstant('2026-10-24',600),null,settings).status).toBe('unknown');
 });
 it('keeps uncertainty visible in a partially working country',()=>{
  const d=structuredClone(data);delete d.calendars['AU-VIC'];
  const result=countryState(country('AU'),beijingInstant('2026-10-26',600),d,settings);
  expect(result.status).toBe('partial');expect(result.unknown).toBe(1);
  const s=structuredClone(settings);s.enabled=['AU'];
  expect(coverage([result],s)).toEqual({lower:67,upper:100});
 });
 it('uses UK regional holidays even where time zones match',()=>{
  const c=country('GB'),instant=Date.parse('2026-11-30T10:00:00Z');
  expect(regionState(c,c.regions.find(r=>r.subdiv==='SCT')!,instant,data,settings).status).toBe('holiday');
  expect(regionState(c,c.regions[0],instant,data,settings).status).toBe('work');
 });
 it('distinguishes MY states and applies SG observed holidays',()=>{
  const c=country('MY'),instant=beijingInstant('2026-01-01',600);
  expect(regionState(c,c.regions[0],instant,data,settings).event).toBeDefined();
  expect(regionState(c,c.regions.find(r=>r.subdiv==='01')!,instant,data,settings).event).toBeUndefined();
  expect(at('SG','2026-11-09').status).toBe('holiday');
 });
 it('custom weekends yield to known make-up working days',()=>{
  const s=structuredClone(settings);s.schedules['CN-beijing']={weekend:[0,1,2,3,4,5,6],intervals:[[540,1080]]};
  expect(regionState(country('CN'),country('CN').regions[0],beijingInstant('2026-10-10',600),data,s).status).toBe('work');
 });
 it('rejects overflowing, negative, nonfinite or malformed settings without throwing',()=>{
  for(const patch of [{regions:[]},{schedules:[]},{weights:[]},{schedules:{'CN-beijing':{intervals:[null],weekend:[0]}}}])expect(validSettings({...settings,...patch})).toBe(false);
  for(const weight of [Infinity,NaN,-1,Number.MAX_VALUE]) {const s=structuredClone(settings);s.weighted=true;for(const c of s.enabled)s.weights[c]=weight;expect(validSettings(s)).toBe(false);}
 });
 it('rejects empty annual snapshots, absent metadata and corrupted field types',()=>{
  for(const patch of [{calendars:[]},{provider:null},{generatedAt:null},{calendars:{CN:{...data.calendars.CN,years:{}}}},{calendars:{CN:{...data.calendars.CN,years:{'2026':{coverage:'rule-based',days:{}}}}}}])expect(validCalendarData({...data,...patch})).toBe(false);
 });
});

it('normalizes subnormal weights before calculating city fractions',()=>{
 const s=structuredClone(settings);s.enabled=['AU'];s.weighted=true;s.weights.AU=Number.MIN_VALUE;
 const states=getStates(beijingInstant('2026-10-26',990),data,s);
 expect(validSettings(s)).toBe(true);expect(coverage(states,s)).toEqual({lower:33,upper:33});
});
