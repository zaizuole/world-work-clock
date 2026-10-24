"""Regression fixtures from official holiday notices; not an all-days certification."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
d=json.loads((ROOT/'public/data/calendars.json').read_text())
assert d['providerVersion']=='0.107'
assert len(d['calendars'])==29
for c in json.loads((ROOT/'config/countries.json').read_text()):
    for r in c['regions']:
        cal=d['calendars'][r['calendarKey']]
        assert cal['countryCode']==c['code'] and cal['subdiv']==r['subdiv']
        assert cal['years']['2026']['coverage']=='rule-based'
        assert cal['years']['2027']['coverage']=='projected'
        assert len(cal['years']['2026']['days'])>=5
checks={'CN':{'2026-01-04':'working-day','2026-02-14':'working-day','2026-02-28':'working-day','2026-05-09':'working-day','2026-09-20':'working-day','2026-10-10':'working-day','2026-10-07':'public-holiday'},'JP':{'2026-05-06':'public-holiday','2026-09-22':'public-holiday'},'SG':{'2026-11-09':'public-holiday'},'RU':{'2026-01-09':'public-holiday','2026-05-11':'public-holiday','2026-12-31':'public-holiday'},'MY-14':{'2026-06-02':'public-holiday'},'NZ-AUK':{'2026-10-26':'public-holiday'},'AU-VIC':{'2026-11-03':'public-holiday'},'MO':{'2026-10-01':'public-holiday'}}
for key,days in checks.items():
 for day,kind in days.items():assert d['calendars'][key]['years']['2026']['days'][day]['kind']==kind,(key,day)
assert '2026-11-03' not in d['calendars']['AU-NSW']['years']['2026']['days']
# Macau PUBLIC covers mandatory holidays; do not include public-employee compensatory days.
assert '2026-10-05' not in d['calendars']['MO']['years']['2026']['days']
print(f'Calendar coverage and {sum(map(len,checks.values()))} date fixtures passed.')
