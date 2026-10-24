# 时区与节假日工具：数据源及静态部署调研

调研日期：2026-10-24（Asia/Shanghai）。状态：规划依据，尚未实现、生成生产日历或部署。网络检查来自开发机，不能代表所有用户网络；带 `Origin: https://example.github.io` 的请求验证了服务器 CORS 响应头，尚未完成部署页面内的真实浏览器端到端请求。

## 1. 结论

推荐**纯静态前端 + 构建阶段生成的年度日历 JSON + 官方公告校正**。网页放在 GitHub Pages，时间计算、筛选和设置都在浏览器完成；无需数据库或常驻后端。GitHub Actions 可以运行 Python 生成 JSON，这不改变运行时纯前端的架构。

主要数据基座建议选 **MIT 许可的 `vacanza/holidays`（Python holidays）**，覆盖本期全部 12 个国家/地区，提供地区参数和实际补休日期。部署前锁定稳定版本并做官方样例核对。不要只从“节日名称/原始日期”推断“今天休息”。

**Nager.Date 技术上支持无 key 浏览器调用，官方条款明确允许 private 或 non-profit projects，可保留为个人使用的可选来源。** 条款同时要求 commercial purposes 有 active sponsorship，并限制使用其数据发布或运营 holiday portal；“个人用于观察公司业务”是否被认定为商业用途、此类辅助看板是否属于 holiday portal，现有文字没有明确界定，不能直接断言禁止，也不能把“无 key”扩大解释为所有商业用途完全免费。本次默认选择开源构建数据，是为了完整覆盖、补休处理和减少外部依赖，不是认定个人查看违规。[S1][S2]

**OpenHolidays API 当前不覆盖这 12 个目标国家/地区**，不能作为这些市场的兜底。[S6]

## 2. Nager.Date / Nager.Holidays 的实际检查

官方目前引导使用 v4：

```text
GET https://nagerholidays.com/api/v4/Holidays/{CountryCode}/{Year}
```

v4 字段包括 `date`、`name`、`countryCode`、`nationalHoliday`、`subdivisionCodes`、`holidayTypes`。旧 v3 使用 `global`、`counties`、`types`，两者不能不经转换混用。官方 README 声明 Community v3 的 EOL 为 **2027-01-31**，v4 发布于 2026-06-30；新项目不应以 v3 为长久依赖。[S2][S3]

下面是 2026 年端点实测结果。请求不含认证信息，携带 `Origin`；v4 成功请求同时使用常规浏览器 User-Agent。一次不带该 User-Agent 的批量 v4 请求返回 403，添加后成功，说明自动化访问也应处理 403/失败，不能承诺持续可用。v3 同期检查得到相同的条目数量。

| 国家/地区 | ISO | v4 HTTP | 条目数 | 其中地区条目 | CORS 响应 | 本期结论 |
|---|---|---:|---:|---:|---|---|
| 中国 | CN | 200 | 6 | 0 | `*` | 不是完整放假调休日历 |
| 俄罗斯 | RU | 200 | 13 | 0 | `*` | 不是完整工作日转移日历 |
| 马来西亚 | MY | 204 | 0 | — | `*` | 无数据，绝不能显示“今天无假日” |
| 韩国 | KR | 200 | 18 | 0 | `*` | 有条目，仍需核对补休和临时公告 |
| 美国 | US | 200 | 17 | 6 | `*` | 有全国、州和不同休假类型，不能整体当停工 |
| 新西兰 | NZ | 200 | 23 | 12 | `*` | 需要地区及实际补休日处理 |
| 澳大利亚 | AU | 200 | 27 | 21 | `*` | 大量州/领地差异 |
| 英国 | GB | 200 | 14 | 9 | `*` | 英格兰/威尔士/苏格兰/北爱有差异 |
| 日本 | JP | 200 | 16 | 0 | `*` | 缺少已核实的替代/夹日休息日 |
| 新加坡 | SG | 200 | 11 | 0 | `*` | 原日期之外的补休日需补充 |
| 香港 | HK | 200 | 17 | 0 | `*` | 需区分公众假期与法定假日口径 |
| 澳门 | MO | 204 | 0 | — | `*` | 无数据，需其他来源 |

条目数量不是休假天数：同一天可以出现多种类型或不同地区记录。`Observance`、`Optional`、`School`、`Authorities`、`Bank` 不应一律当作所有用户放假；`nationalHoliday=false` 也不能直接忽略，因为部分国家可能用地区列表列出覆盖范围。[S3]

### 数据完整性反例

- 中国端点仅返回 `01-01、02-17、05-01、06-19、09-25、10-01`，既缺连续休假日，也缺补班。国务院 2026 年公告明确 1 月 4 日、2 月 14 日、2 月 28 日、5 月 9 日、9 月 20 日、10 月 10 日上班，因此“周六日一律休息”会错误判断。[S4]
- 日本端点返回 16 个节日日期，未含 **2026-05-06**（替代休日）及 **2026-09-22**（两个节日之间的休日）；日本内阁府官网明确列出这两天。[S5]
- 新加坡端点包含 **2026-11-08** Deepavali，未含 **11-09**。MOM 官网明确：当 11 月 8 日为员工休息日时，11 月 9 日为公共假日；同样列出 6 月 1 日和 8 月 10 日的对应情形。这是带适用条件的补休，不应毫无说明地归为全人群休假。[S7]
- 俄罗斯端点是基本节日日期集合；工作日转移还需要年度配置。`vacanza/holidays` 当前源码包含 2026 年 1 月 9 日、12 月 31 日转移安排及 3 月 9 日、5 月 11 日补休配置，但本次未独立核验俄罗斯官方原始公告，不能据此宣称全年已验收。[S11]

### 费用与使用条件

官方 API 页面称 “No Rate Limits / Browser ready / CORS Enabled”，不能覆盖官方条款中的商业用途限制。条款原文：[S1]

> The Web API can be used for private or non-profit projects. For commercial purposes we require active sponsorship.
>
> It is not allowed to use the holiday information to publish or operate your own holiday portal.

用户明确用途为自己查看，条款中的 private projects 是可用依据；不能笼统说“自己看也不行”。公司内部个人使用与商业用途的边界、此看板是否属于 holiday portal，条款没有给出明确判定。本项目保留 Nager 作为个人使用可选适配器，不将其默认关闭描述成授权要求。默认仍推荐开源构建方案，主要依据是 MY/MO 数据缺口、CN/RU 调休、JP/SG 替代休日完整性以及更新可控。是否最终直连 Nager 不影响当前规划和预览完成。

## 3. 可行的免费数据路线

### 3.1 Python holidays：推荐作为构建数据基座

`vacanza/holidays` 的 LICENSE 允许使用、修改、发布、分发及销售，要求保留版权和许可声明，属于 MIT 许可；项目内应保留第三方许可说明。[S8]

通过官方源码逐一确认存在下列 country 模块（2026-10-24 读取 `dev` 分支；不是已锁定发行版的生产验证）：[S9]

| ISO | 模块 | 需特别处理 |
|---|---|---|
| CN | `china.py` | 年度调休、周末补班、公告覆盖年度 |
| RU | `russia.py` | 年度休息日转移及补班；地区性节日覆盖待确认 |
| MY | `malaysia.py` | 州/联邦直辖区、不同休息日习惯、宗教节日公告 |
| KR | `south_korea.py` | 替代假日、临时假日与适用群体 |
| US | `united_states.py` | 州差异；联邦假日不代表所有私营企业停工 |
| NZ | `new_zealand.py` | 地区周年纪念日、补休 |
| AU | `australia.py` | 州/领地、补休 |
| GB | `united_kingdom.py` | 英格兰、威尔士、苏格兰、北爱差异 |
| JP | `japan.py` | 替代休日、节日之间的休息日 |
| SG | `singapore.py` | 星期日假日替代休息日及其适用条件 |
| HK | `hongkong.py` | 法定假日与公众假期口径；软件常见周末习惯不能照搬劳动法规默认值 |
| MO | `macau.py` | PUBLIC / GOVERNMENT / OPTIONAL 分类；不能把公务员补休当所有用户放假 |

官方 `country_holidays()` 支持 `country`、`subdiv`、`years`、`observed`、`categories`。`observed=True` 默认包含实际补休日；建议显式传入，仅采用产品选定的假日口径。[S10]

```python
# 仅说明计划中的生成方式；本次未添加生产脚本或依赖。
calendar = holidays.country_holidays(
    country="US", subdiv="CA", years=[2026, 2027], observed=True
)
```

生成结果仍需官方样例比对。库有某个国家模块 ≠ 该国所有地区/年度/临时公告都已完整验证；预测日期、尚未公布年份须标注 `tentative` 或 `unverified`，不能承诺“无节假日”。中国/俄罗斯源码已有年度转移记录，可减少人工维护，但导出时必须同时输出**休息日期**及**补班日期**，不能只序列化 holiday 字典后丢掉工作日覆盖信息。[S11]

本次只核验许可、接口文档、源码国家覆盖与部分年度配置，未安装锁定版本、未生成整套日历、未运行跨国正确性测试。实施时应固定实际采用的 release 版本/提交，避免直接依赖浮动 `dev`。

### 3.2 官方数据与年度校正

| 地区 | 官方来源 | 本次实测 | 建议用法 |
|---|---|---|---|
| 英国 | GOV.UK `bank-holidays.json` | 200，CORS `*`；无需 key | 可直接前端请求，也可在构建时合并；保留三个 jurisdiction 分组 |
| 中国 | 国务院 2026 年放假安排 | 页面 200，已核对放假范围与补班日 | 提取结构化事实并保留公告链接；年度维护 |
| 日本 | 内阁府国民祝日页 | 页面 200，核实 05-06 / 09-22 | 校验 observed 和夹日休息日 |
| 新加坡 | MOM public-holidays 页 | 页面 200；请求未见 CORS 许可头 | 构建/人工核对，不能直接当可跨域 fetch 的 API |
| 马来西亚 | BKPP `hari-kelepasan-am` | 页面 200，发现 2026 官方 PDF 链接 | 按州整理；PDF 具体表格本次未解析，属于实施核对项 |
| 澳门 | 澳门政府 2026 年假期页 | 页面 200；未见 CORS 许可头；有 iCal 入口 | 区分公众假日、强制假日、公务员豁免/补休，再录入 |
| 香港 | 香港政府 2026 年假期页 | 本次网络 SSL 连接失败 | 来源候选，待重试，不能标记数据验收通过 |

英国分组键：`england-and-wales`、`scotland`、`northern-ireland`。直接 GET JSON 得到跨域许可，不等于其它政府 HTML 页面也支持 CORS。[S12]

澳门政府页面标题明确包含 “Public Holidays, Exemption from Work and Compensatory Rest Days for Public Employees”，并以星号标明劳动关系法中的 obligatory holidays。若默认展示公众假日，应同时把适用对象说明展示给用户。[S13]

马来西亚官方页面提供 [2026 公共假期 PDF](https://www.kabinet.gov.my/storage/2025/08/HKA-2026.pdf)，该链接来自本次读取的官网链接，未下载和逐项解析。政府首页另说明 2026 年卫塞节与 6 月 1 日假期相接时部分州的补休规则，进一步证明不能只维护全国单日列表。[S14]

### 3.3 其他来源为何不作默认

- **OpenHolidays API**：`Countries?languageIsoCode=EN` 本次 200、CORS `*`，当前返回列表与本期 12 个 ISO 代码无交集，主要覆盖欧洲等其他地区。未来扩展国家时再评估；不能现在挂一个“自动兜底”名称却返回空结果。[S6]
- **JavaScript `date-holidays`**：可作为浏览器或 Node 生成方案候选，但其代码 ISC 与假日数据 **CC BY-SA 3.0** 是两种许可；不能只看到代码 ISC 就宣称全部数据无归属/共享条件。当前优先 Python holidays 的构建路线，避免重复引入两套日历规则。[S15]
- 需要私密 API key 的付费/免费额度 API 不适合直接写进 Pages 前端。已找到无需运行时 key 的方案，无需为当前工具再增加后端代理。

## 4. 静态 JSON 的更新与降级设计

建议仓库保存明确版本的数据，按国家/地区与年份拆分，例如 `data/calendars/2026/CN.json`；实际目录由实现方案确定。每份包含 `schemaVersion`、生成时间、覆盖年份、来源版本、来源链接、适用地区/类型、核验状态、休假日与补班日。不要把用户个人信息或公司真实流量写入公开仓库。

推荐顺序：

1. 首屏加载随站点发布且已校验的同源 JSON，保证跨域服务失败时仍可用。
2. Actions 每周及手动触发更新候选数据，覆盖本地日历年份前一年、当前年、下一年；这样跨年和时区日期边界不会临时失效。
3. 校验 schema、覆盖范围、重复记录、补班/休假冲突、重要官方样例；有新增/删除/改期时生成可审阅差异。验证失败保留上一份，不把失败结果或空响应覆盖到成功数据上。
4. 页面显示“日历覆盖至某年 / 最近更新 / 数据待确认”等状态。年度覆盖缺失、数据损坏、网络失败与“已核实今天无公共假日”必须分开。
5. 国家当地日期参与查表；不要用 UTC+8 日期同时查所有国家。多时区国家按所选城市/地区分别查日期和假日适用范围。

周末规则、办公时段是**产品假设/用户设置**，不等于节假日库所反映的法定休息制度。默认周一到周五 09:00–18:00 可以帮助估计工作时段，但应允许按地区调整，并明确它是潜在活跃度，不是真实在线人数或流量预测。

## 5. GitHub Pages 适配性

GitHub 官方确认 Pages 托管 HTML、CSS、JavaScript 等静态文件，支持构建后发布；GitHub Free 支持公开仓库的 Pages。私有仓库的 Pages 可用性与账号套餐有关，不能承诺免费私有仓库也一样。[S16]

采用项目站点时通常路径为 `https://<owner>.github.io/<repo>/`，构建必须设置仓库基础路径；初版一个页面或 hash 路由最简单，避免刷新深层 SPA 路由 404。部署使用官方 `configure-pages`、`upload-pages-artifact`、`deploy-pages`，并给予 `pages: write`、`id-token: write` 的所需权限。[S17]

当前官方限制包括发布体积不大于 1 GB、部署超过 10 分钟超时、每月 100 GB 软流量限制；小型静态工具通常远低于这些指标。Pages 不用于主要提供商业交易或商业 SaaS 的免费托管，本方案按公开静态时区/日历辅助工具设计，没有交易、账号或服务端业务。[S18]

定期 Actions 并非严格计时器：高负载时可延迟甚至丢弃，公开仓库 60 天无活动会自动禁用 schedule；必须保留 `workflow_dispatch` 和页面数据新鲜度提示。不要把“设了 cron”写成“永久保证自动更新”。公开仓库的标准 GitHub-hosted runners 使用免费，但仍应关注平台额度/政策变化；避免 large runner 等不必要资源。[S19][S20]

本次没有创建远端仓库、设置 Pages 或运行线上工作流；以上是可实施路线。

## 6. 开发前后需要完成的验证

- 固定数据生成依赖版本并针对 12 个目标国家/地区生成样本；明确到哪一年、哪些地区、哪些假日类型已核验。
- 重点核对 CN 补班、RU 转移工作日、MY 州规则、MO 适用群体、JP 夹日休日、SG/US/NZ/AU observed 日期以及 GB 分区。
- 实际 Chrome/Safari 手机浏览器验证同源 JSON 读取、离线/失败状态、当地日期跨年、夏令时切换。
- 验证构建基础路径与 Pages 刷新；将“本地可看”“部署成功”“线上验收”分别记录。

## 来源索引

- S1：Nager 官方使用条款：<https://nagerholidays.com/legal/termsofservice>。
- S2：Nager 官方 API 页面：<https://nagerholidays.com/api>；实测路由示例：<https://nagerholidays.com/api/v4/Holidays/US/2026>、<https://nagerholidays.com/api/v4/Holidays/MY/2026>、<https://nagerholidays.com/api/v4/Holidays/MO/2026>。
- S3：Nager 官方 README（版本生命周期、类型与精度说明）：<https://github.com/nager/Nager.Date/blob/main/README.md>。
- S4：中国国务院 2026 年放假安排：<https://www.gov.cn/gongbao/2025/issue_12406/202511/content_7048922.html>。
- S5：日本内阁府国民祝日：<https://www8.cao.go.jp/chosei/shukujitsu/gaiyou.html>。
- S6：OpenHolidays 官方说明：<https://www.openholidaysapi.org/en/>；国家目录：<https://openholidaysapi.org/Countries?languageIsoCode=EN>。
- S7：新加坡 MOM：<https://www.mom.gov.sg/employment-practices/public-holidays>。
- S8：Python holidays 许可：<https://github.com/vacanza/holidays/blob/dev/LICENSE>。
- S9：Python holidays 国家实现目录：<https://github.com/vacanza/holidays/tree/dev/holidays/countries>。
- S10：Python holidays API：<https://github.com/vacanza/holidays/blob/dev/_autodocs/api-reference/utils.md>；observed 说明：<https://github.com/vacanza/holidays/blob/dev/_autodocs/api-reference/observed_holiday_base.md>（同时经 Context7 查询官方库资料）。
- S11：中国模块：<https://github.com/vacanza/holidays/blob/dev/holidays/countries/china.py>；俄罗斯模块：<https://github.com/vacanza/holidays/blob/dev/holidays/countries/russia.py>。
- S12：英国官方 JSON：<https://www.gov.uk/bank-holidays.json>。
- S13：澳门政府 2026 年假期：<https://www.gov.mo/en/public-holidays/year-2026/>。
- S14：马来西亚 BKPP 公共假期：<https://www.kabinet.gov.my/hari-kelepasan-am/>。
- S15：date-holidays 许可：<https://github.com/commenthol/date-holidays/blob/master/LICENSE>。
- S16：GitHub Pages 概述：<https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages>。
- S17：GitHub 自动部署指南：<https://docs.github.com/en/get-started/start-your-journey/deploying-your-website-automatically>。
- S18：GitHub Pages 限制：<https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits>。
- S19：GitHub Actions schedule：<https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule>。
- S20：GitHub Actions 计费：<https://docs.github.com/en/billing/concepts/product-billing/github-actions>。
