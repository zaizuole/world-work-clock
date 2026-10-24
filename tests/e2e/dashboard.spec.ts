import { test,expect } from '@playwright/test';
const sample='?at=2026-10-26T08%3A30%3A00.000Z';
test('loads at the Pages subpath and keeps overview, detail and simulation consistent',async({page})=>{
 await page.goto(sample);await expect(page.getByText(/日历已加载/)).toBeVisible();
 await expect(page.locator('.focus-title')).toContainText('9');await expect(page.locator('.alert-country')).toContainText('新西兰');
 await page.getByRole('button',{name:'查看俄罗斯的城市详情'}).click();await expect(page.locator('.region-details')).toContainText('符拉迪沃斯托克');
 await page.locator('.time-disclosure summary').click();await page.locator('#time').fill('1200');await expect(page.locator('.focus-title')).toContainText('2');
 await page.getByRole('button',{name:'↺ 回到现在'}).click();await expect(page.locator('.focus-meta')).toContainText('当前时间');expect(new URL(page.url()).searchParams.has('at')).toBe(false);
});
test('mobile keeps the overview and holiday usable with no horizontal overflow',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto(sample);await expect(page.getByText(/日历已加载/)).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await expect(page.locator('.focus-title')).toBeVisible();await expect(page.locator('.alert-country')).toContainText('新西兰');
 await page.getByRole('button',{name:'查看假日日历 ›'}).click();await expect(page.getByRole('heading',{name:'未来 90 天的假日'})).toBeVisible();
 await page.getByLabel('筛选国家').selectOption('SG');await expect(page.locator('.event').first()).toContainText('新加坡');
});
test('settings persist and invalid work intervals do not save',async({page})=>{
 await page.goto(sample);await expect(page.getByText(/日历已加载/)).toBeVisible();await page.getByRole('button',{name:'关注与设置'}).click();
 await page.locator('.country-check').filter({hasText:'澳门'}).getByRole('checkbox').uncheck();
 await page.getByLabel('当地工作时段',{exact:true}).fill('18:00-09:00');await page.getByRole('button',{name:'保存设置'}).click();await expect(page.getByRole('alert')).toContainText('跨午夜');
 await page.getByLabel('当地工作时段',{exact:true}).fill('09:00-18:00');await page.getByRole('button',{name:'保存设置'}).click();await expect(page.locator('.focus-description')).toContainText('11');
 await page.reload();await expect(page.getByText(/日历已加载/)).toBeVisible();await expect(page.locator('.focus-description')).toContainText('11');
});
test('missing calendar gives unknown state; retry recovers',async({page})=>{
 await page.route('**/data/calendars.json',route=>route.abort());await page.goto(sample);
 await expect(page.getByText(/日历暂时无法加载/)).toBeVisible();await expect(page.locator('.focus-title')).toContainText('待核实');await expect(page.locator('.top-clock')).toContainText('16:30');
 await page.unroute('**/data/calendars.json');await page.getByRole('button',{name:'重新检查'}).click();await expect(page.getByText(/日历已加载/)).toBeVisible();await expect(page.locator('.focus-title')).toContainText('9');
});
test('cached data survives a failed refresh',async({page})=>{
 await page.goto(sample);await expect(page.getByText(/日历已加载/)).toBeVisible();await page.route('**/data/calendars.json',route=>route.abort());await page.reload();
 await expect(page.getByText(/正在使用本机缓存/)).toBeVisible();await expect(page.locator('.focus-title')).toContainText('9');
});
test('storage unavailable does not break settings or clock',async({page})=>{
 await page.addInitScript(()=>{Storage.prototype.getItem=()=>{throw new Error('blocked')};Storage.prototype.setItem=()=>{throw new Error('blocked')}});
 await page.goto(sample);await expect(page.getByText(/日历已加载/)).toBeVisible();await page.getByRole('button',{name:'关注与设置'}).click();await page.getByRole('button',{name:'保存设置'}).click();
 await expect(page.getByText(/本次修改仅在当前页面有效/)).toBeVisible();await expect(page.locator('.focus-title')).toContainText('9');
});
test('forecast year is visibly uncertain',async({page})=>{
 await page.goto('?at=2027-01-04T02%3A00%3A00Z');await expect(page.getByText(/日历已加载/)).toBeVisible();
 await expect(page.locator('.uncertain')).toContainText('日历待核实');await expect(page.locator('.country-row').filter({hasText:'中国'})).toContainText('待核实');
});
