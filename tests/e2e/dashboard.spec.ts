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
 await page.getByRole('checkbox',{name:'墨尔本',exact:true}).uncheck();
 await page.getByLabel('当地工作时段',{exact:true}).fill('18:00-09:00');await page.getByRole('button',{name:'保存设置'}).click();await expect(page.getByRole('alert')).toContainText('跨午夜');
 await page.getByLabel('当地工作时段',{exact:true}).fill('09:00-18:00');await page.getByRole('button',{name:'保存设置'}).click();await expect(page.locator('.focus-description')).toContainText('11');
 await page.reload();await expect(page.getByText(/日历已加载/)).toBeVisible();await expect(page.locator('.focus-description')).toContainText('11');
 await expect(page.getByRole('button',{name:'查看澳大利亚的城市详情'})).toContainText('部分城市工作中 1/2');
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

for(const width of [360,390,768,1440])test(`full application fits ${width}px and shows readable overview`,async({page},testInfo)=>{
 await page.setViewportSize({width,height:width<768?844:1000});await page.goto(sample);await expect(page.getByText(/日历已加载/)).toBeVisible();
 await expect(page.locator('.time-disclosure')).not.toHaveAttribute('open','');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await expect(page.getByRole('button',{name:'查看澳大利亚的城市详情'})).toContainText('部分城市工作中 1/3');
 await expect(page.getByRole('button',{name:'查看俄罗斯的城市详情'})).toContainText('部分城市工作中 4/5');
 await expect(page.getByRole('button',{name:'查看澳大利亚的城市详情'})).toContainText('16:30–19:30');
 if(width<768)expect((await page.locator('.alert-country').boundingBox())!.y).toBeLessThan(844);
 await page.screenshot({path:testInfo.outputPath(`overview-${width}.png`)});
});

test('calendar keeps simulation mode and can return to real time',async({page})=>{
 await page.goto(sample);await expect(page.getByText(/日历已加载/)).toBeVisible();
 await page.getByRole('button',{name:'节日日历',exact:true}).click();await expect(page.locator('.calendar-mode')).toContainText('时间模拟 · 北京时间 2026-10-26 16:30');
 await page.getByRole('button',{name:'↺ 回到现在'}).click();await expect(page.locator('.calendar-mode')).toHaveCount(0);await expect(page.getByText('以现在为起点，按目的地当地日期')).toBeVisible();
});

test('out of coverage is distinct from known no holidays',async({page})=>{
 await page.goto('?at=2028-01-03T02%3A00%3A00Z');await expect(page.getByText(/日历已加载/)).toBeVisible();
 await expect(page.locator('.alert-country')).toHaveText('未来 14 天日历不完整');
 await page.getByRole('button',{name:'节日日历',exact:true}).click();await expect(page.locator('.empty')).toContainText('日历未知');
 await page.getByLabel('筛选国家').selectOption('CN');await page.locator('.coverage-notice summary').click();await expect(page.locator('.coverage-notice')).toContainText('中国·北京 2028');
});

for(const body of ['', '{}', '{"schemaVersion":1,"calendars":[]}'])test(`empty or corrupt response remains unknown: ${body||'empty'}`,async({page})=>{
 await page.route('**/data/calendars.json',route=>route.fulfill({status:200,contentType:'application/json',body}));await page.goto(sample);
 await expect(page.getByText(/日历暂时无法加载/)).toBeVisible();await expect(page.locator('.uncertain')).toContainText('日历待核实');
 await page.getByRole('button',{name:'节日日历',exact:true}).click();await expect(page.locator('.empty')).toContainText('日历未知');
});

test('corrupt response uses last valid cache instead of overwriting it',async({page})=>{
 await page.goto(sample);await expect(page.getByText(/日历已加载/)).toBeVisible();
 await page.route('**/data/calendars.json',route=>route.fulfill({contentType:'application/json',body:'{}'}));await page.reload();
 await expect(page.getByText(/正在使用本机缓存/)).toBeVisible();await expect(page.locator('.focus-title')).toContainText('9');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('world-work-clock:calendar:v1')!).providerVersion)).toBe('0.107');
});

test('in-memory calendar survives retry when storage is blocked',async({page})=>{
 await page.addInitScript(()=>{Storage.prototype.getItem=()=>{throw new Error('blocked')};Storage.prototype.setItem=()=>{throw new Error('blocked')}});
 await page.goto(sample);await expect(page.getByText(/日历已加载/)).toBeVisible();
 await page.route('**/data/calendars.json',route=>route.abort());await page.getByRole('button',{name:'重新检查'}).click();
 await expect(page.getByText(/正在使用本页内存快照/)).toBeVisible();await expect(page.locator('.focus-title')).toContainText('9');
});

test('settings retain cities and weekly rest days, reject zero weights',async({page})=>{
 await page.goto(sample);await expect(page.getByText(/日历已加载/)).toBeVisible();await page.getByRole('button',{name:'关注与设置'}).click();
 await page.getByRole('checkbox',{name:'爱丁堡',exact:true}).check();await page.getByRole('checkbox',{name:'周一',exact:true}).check();
 await page.getByRole('button',{name:'保存设置'}).click();await expect(page.locator('#country-CN')).toContainText('周末');await page.reload();await expect(page.getByText(/日历已加载/)).toBeVisible();
 await page.getByRole('button',{name:'关注与设置'}).click();await expect(page.getByRole('checkbox',{name:'爱丁堡',exact:true})).toBeChecked();await expect(page.getByRole('checkbox',{name:'周一',exact:true})).toBeChecked();
 await page.getByRole('checkbox',{name:'按自定义国家权重计算'}).check();for(const input of await page.locator('.weights input').all())await input.fill('0');
 await page.getByRole('button',{name:'保存设置'}).click();await expect(page.getByRole('alert')).toContainText('权重');await page.getByLabel('中国权重',{exact:true}).fill('3');await page.getByRole('button',{name:'保存设置'}).click();
 await page.locator('.time-disclosure summary').click();await expect(page.locator('.overlap-title')).toContainText('加权工作覆盖估算');await expect(page.locator('.overlap-title')).not.toContainText('NaN');
});

test('keyboard filter, expanded city, date and next seven days work together',async({page})=>{
 await page.goto(sample);await expect(page.getByText(/日历已加载/)).toBeVisible();
 const holiday=page.locator('.filters').getByRole('button',{name:'假日影响'});await holiday.focus();await page.keyboard.press('Enter');await expect(page.locator('.country-row')).toHaveCount(1);await expect(page.locator('.country-row')).toContainText('新西兰');
 await page.locator('.filters').getByRole('button',{name:'全部 12'}).click();const city=page.locator('#country-AU button');await city.focus();await page.keyboard.press('Enter');await expect(city).toHaveAttribute('aria-expanded','true');await expect(page.locator('.region-details')).toContainText('珀斯');
 const disclosure=page.locator('.time-disclosure summary');await disclosure.focus();await page.keyboard.press('Enter');await expect(page.locator('.week-strip button')).toHaveCount(7);
 await page.getByLabel('查看日期 · 北京时间').fill('2026-10-10');await expect(page.locator('#country-CN')).toContainText('工作中');
 await page.getByRole('button',{name:'关注与设置'}).click();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('real time refreshes each minute and immediately on return to foreground',async({page})=>{
 await page.clock.install({time:new Date('2026-10-26T00:59:00Z')});await page.goto('');await expect(page.getByText(/日历已加载/)).toBeVisible();
 await expect(page.locator('.top-clock')).toContainText('08:59');await page.clock.fastForward(60000);await expect(page.locator('.top-clock')).toContainText('09:00');await expect(page.locator('#country-CN')).toContainText('工作中');
 await page.clock.setSystemTime(new Date('2026-10-26T10:00:00Z'));await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await expect(page.locator('.top-clock')).toContainText('18:00');await expect(page.locator('#country-CN')).toContainText('非工作时段');
});
