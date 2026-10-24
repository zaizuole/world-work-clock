"""Generate versioned, reviewable calendar data. No network requests at runtime."""
import argparse
import hashlib
import json
from datetime import date, datetime, timezone
from pathlib import Path
import holidays

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/data/calendars.json'
COUNTRIES = json.loads((ROOT / 'config/countries.json').read_text())
# Annual announcements are not guessed. Advance only after reviewing the new year's data.
REVIEWED_THROUGH = 2026
TRANSLATIONS = {
    "New Year's Day": '元旦', 'New Year Holidays': '新年假期', 'Diwali': '屠妖节', 'Election Day': '选举日',
    'Substitute Holiday': '替代休日', 'National Holiday': '国民休日',
    'ANZAC Day': '澳新军团日', 'New Year Holiday': '新年假期',
    'Late Summer Bank Holiday': '夏末银行假日', 'Easter Sunday': '复活节', 'Easter Saturday': '复活节前星期六',
    'Chinese New Year': '农历新年', "Chinese New Year's Day": '农历新年',
    'Chinese New Year (Second Day)': '农历新年初二', 'Labour Day': '劳动节',
    'Labor Day': '劳动节', 'Good Friday': '耶稣受难日', 'Easter Monday': '复活节星期一',
    'Christmas Day': '圣诞节', 'Boxing Day': '节礼日', 'Deepavali': '屠妖节',
    'Vesak Day': '卫塞节', 'National Day': '国庆日', 'Hari Raya Puasa': '开斋节',
    'Hari Raya Haji': '哈芝节', 'Thaipusam': '大宝森节',
    'Federal Territory Day': '联邦直辖区日', 'Malaysia Day': '马来西亚日',
    'Independence Day': '独立日', 'Veterans Day': '退伍军人节', 'Thanksgiving Day': '感恩节',
    'Memorial Day': '阵亡将士纪念日', 'Martin Luther King Jr. Day': '马丁·路德·金纪念日',
    "Washington's Birthday": '华盛顿诞辰', 'Juneteenth National Independence Day': '六月节',
    'Columbus Day': '哥伦布日', 'Australia Day': '澳大利亚日', 'Anzac Day': '澳新军团日',
    "King's Birthday": '国王诞辰', 'Waitangi Day': '怀唐伊日', 'Matariki': '毛利新年',
    'Auckland Anniversary Day': '奥克兰周年纪念日', 'Wellington Anniversary Day': '惠灵顿周年纪念日',
    'Day after New Year\'s Day': '元旦次日', 'Early May Bank Holiday': '五月初银行假日',
    'Spring Bank Holiday': '春季银行假日', 'Summer Bank Holiday': '夏季银行假日',
    'Melbourne Cup': '墨尔本杯赛日', 'Melbourne Cup Day': '墨尔本杯赛日',
}

def display_name(name):
    if name.endswith(' (observed)'):
        return display_name(name[:-11]) + '（补休）'
    return TRANSLATIONS.get(name, name)

def generate(year):
    result = {}
    for c in COUNTRIES:
        for region in c['regions']:
            key = region['calendarKey']
            if key in result:
                continue
            years = {}
            for y in [year - 1, year, year + 1]:
                options = dict(country=c['code'], subdiv=region['subdiv'] or None,
                               years=[y], observed=True, expand=False, categories=['public'])
                en = holidays.country_holidays(**options, language='en_US')
                localized = holidays.country_holidays(**options, language='zh_CN') if 'zh_CN' in en.supported_languages else en
                days = {d.isoformat(): {'name': display_name(localized[d]), 'originalName': name,
                                      'kind': 'public-holiday'} for d, name in sorted(en.items()) if d.year == y}
                for d in sorted(en.weekend_workdays):
                    if d.year == y:
                        if d.isoformat() in days:
                            raise ValueError(f'Conflicting workday/holiday: {key} {d}')
                        days[d.isoformat()] = {'name': '调休上班', 'originalName': 'Substituted working day', 'kind': 'working-day'}
                years[str(y)] = {'coverage': 'rule-based' if y <= REVIEWED_THROUGH else 'projected',
                                 'days': dict(sorted(days.items()))}
            result[key] = {'countryCode': c['code'], 'subdiv': region['subdiv'], 'scope': c['scope'],
                           'sourceUrl': c['sourceUrl'],
                           'rulesUrl': f'https://github.com/vacanza/holidays/blob/v{holidays.__version__}/holidays/countries/{c["module"]}.py',
                           'years': years}
    content = {'schemaVersion': 1, 'provider': 'Python holidays', 'providerVersion': holidays.__version__,
               'coverageNote': '依据公开日历规则生成，已抽查关键日期；非逐日官方认证。未核验年份显示待核实。',
               'reviewedThrough': REVIEWED_THROUGH, 'calendars': result}
    content['dataVersion'] = hashlib.sha256(json.dumps(content, ensure_ascii=False, sort_keys=True).encode()).hexdigest()[:16]
    old = json.loads(OUT.read_text()) if OUT.exists() else {}
    content['generatedAt'] = old.get('generatedAt') if old.get('dataVersion') == content['dataVersion'] else datetime.now(timezone.utc).isoformat(timespec='seconds')
    return content

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--year', type=int, default=date.today().year)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    data = generate(args.year)
    serialized = json.dumps(data, ensure_ascii=False, indent=2) + '\n'
    if args.check:
        assert OUT.exists() and OUT.read_text() == serialized, 'Calendar snapshot differs; regenerate and review the diff.'
    else:
        OUT.parent.mkdir(parents=True, exist_ok=True)
        OUT.write_text(serialized)
    print(f'{len(data["calendars"])} regional calendars, {args.year-1}–{args.year+1}, version {data["dataVersion"]}')
