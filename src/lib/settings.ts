import { countries, defaultSettings, type Schedule, type Settings } from './model';
export const SETTINGS_KEY='world-work-clock:settings:v1';
export function parseIntervals(value: string): [number,number][] {
  const intervals=value.split(/[,，]/).map(s=>{
    const m=s.trim().match(/^(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})$/);
    if(!m) throw new Error('工作时段格式：09:00-12:00,13:00-18:00');
    const [a,b,c,d]=m.slice(1).map(Number);
    if(a>23||c>24||b>59||d>59||(c===24&&d!==0)) throw new Error('时间必须在 00:00–24:00 内');
    return [a*60+b,c*60+d] as [number,number];
  }).sort((a,b)=>a[0]-b[0]);
  if(!intervals.length||intervals.length>4||intervals.some(([a,b],i)=>a>=b||(i>0&&intervals[i-1][1]>a))) throw new Error('时段不能重叠或跨午夜，最多 4 段');
  return intervals;
}
function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function validSchedule(s: Schedule) {
  return record(s) && Array.isArray(s.weekend)&&s.weekend.every(d=>Number.isInteger(d)&&d>=0&&d<=6)&&new Set(s.weekend).size===s.weekend.length && Array.isArray(s.intervals)&&s.intervals.length>0&&s.intervals.length<=4&&s.intervals.every((p,i)=>Array.isArray(p)&&p.length===2&&p.every(Number.isInteger)&&p[0]>=0&&p[1]<=1440&&p[0]<p[1]&&(i===0||s.intervals[i-1][1]<=p[0]));
}
export function validSettings(value: unknown): value is Settings {
  if(!record(value)) return false;
  const s=value as Settings;
  if(s.schemaVersion!==1||!Array.isArray(s.enabled)||!s.enabled.length||new Set(s.enabled).size!==s.enabled.length||s.enabled.some(c=>!countries.some(x=>x.code===c))||!record(s.regions)||!record(s.schedules)||!record(s.weights)||typeof s.weighted!=='boolean') return false;
  for(const c of countries) {
    if(!Array.isArray(s.regions[c.code])||!s.regions[c.code].length||s.regions[c.code].some(id=>!c.regions.some(r=>r.id===id))||new Set(s.regions[c.code]).size!==s.regions[c.code].length) return false;
    if(typeof s.weights[c.code]!=='number'||!Number.isFinite(s.weights[c.code])||s.weights[c.code]<0) return false;
  }
  if(s.weighted) {
    const total=s.enabled.reduce((sum,c)=>sum+s.weights[c],0);
    if(!Number.isFinite(total)||total<=0) return false;
  }
  return Object.entries(s.schedules).every(([id,v])=>countries.some(c=>c.regions.some(r=>r.id===id))&&validSchedule(v));
}
export function loadSettings(): {settings:Settings; warning:string} {
  try { const raw=localStorage.getItem(SETTINGS_KEY);if(!raw)return {settings:defaultSettings(),warning:''};const value=JSON.parse(raw);if(validSettings(value))return {settings:value,warning:''};return {settings:defaultSettings(),warning:'本机设置格式不兼容，已使用默认设置。'}; }
  catch { return {settings:defaultSettings(),warning:'无法读取本机设置，当前使用默认设置。'}; }
}
export function saveSettings(settings:Settings) {
  try {localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));return '';} catch {return '浏览器不允许保存设置，本次修改仅在当前页面有效。';}
}
