# 全球工作时钟 · World Hours

以北京时间为参照，查看不同国家/地区的当地时间、工作时段、公共假日和调休。纯前端，无登录、无数据库、无运行时密钥。

- 计划发布地址：<https://zaizuole.github.io/world-work-clock/>（首次部署验收中）
- 独立仓库：<https://github.com/zaizuole/world-work-clock>
- 交付流程：[开发与发布](docs/development-and-release.md)
- OpenSpec：[设计与视觉规范](openspec/changes/add-world-work-calendar/design.md)、[任务清单](openspec/changes/add-world-work-calendar/tasks.md)

## 功能

- 首屏直接列出工作中的国家和地区，区分部分代表城市工作，突出假日影响。
- 12 个国家/地区：CN、RU、MY、KR、US、NZ、AU、GB、JP、SG、HK、MO；29 组地区日历。
- IANA 时区与夏令时、当地日期、周末/补班/补休、24 小时时间带和未来 7 天时间选择。
- 未来 14 天提醒、未来 90 天假日日历、国家筛选和来源链接。
- 自定义关注地区、代表城市、工作时段、每周休息日和可选国家权重，本机保存。
- 银灰、白色、炭黑的响应式界面；支持桌面和手机。模拟模式始终标注，不冒充当前实况。

## 数据边界

日历使用固定版本 `holidays==0.107` 生成，包含 2025–2027 年数据。2025/2026 按库的地区日历规则计算，已抽查关键日期；**不是逐日官方认证**。2027 年仍显示预测/待核实，不用于确定工作中的结论。俄罗斯共和国额外节日、企业/学校/行业差异、临时公告可能不在覆盖范围。

澳门采用强制性假日口径，不套用公务员补休；美国州/联邦假日不保证私人企业停工。工作覆盖只是作息估算，不是实时在线人数或流量。数据详情见 [来源调研](docs/research.md) 和 [数据维护](docs/calendar-maintenance.md)。

## 本地开发

Node.js 22（建议最新补丁）、Python 3.12。

```sh
npm ci
npm run dev
```

默认打开 Vite 输出的本地地址。设计草稿保留在 `preview/index.html`，正式产品入口为根目录 `index.html`。

```sh
npm run check                       # 类型检查和业务单测
pip install -r scripts/requirements.txt
python scripts/generate_calendars.py --year 2026 --check
python scripts/check_calendars.py
VITE_BASE_PATH=/world-work-clock/ npm run build
VITE_BASE_PATH=/world-work-clock/ npm run test:e2e
```

本地端到端测试使用已安装的 Chrome；CI 安装 Playwright Chromium。无 Chrome 的开发机可按测试配置改用 Playwright Chromium。输出和缓存可通过 `VITE_BUILD_DIR`、`VITE_CACHE_DIR`、`PLAYWRIGHT_OUTPUT_DIR` 指向外置磁盘。不要提交 node_modules、缓存或测试截图。

## 自动发布

`main` 推送触发 `.github/workflows/pages.yml`：日历快照与日期校验 → 类型检查/单测 → 构建 → 浏览器测试 → GitHub Pages。任一步失败不进入部署。PR 仅测试，不部署。支持手动运行。

每周日历维护工作流只检查固定快照与年份覆盖，不擅自提高未核验年份的可信等级。修改日历应更新版本、查看差异、运行测试，然后提交；正常 main 发布链路自动更新站点。

## 文档与版权

第三方 Python holidays MIT 许可保留在 [licenses/python-holidays-MIT.txt](licenses/python-holidays-MIT.txt)。前端依赖的许可见各 npm 包；项目不包含用户数据或内部业务统计。历史设计预览的模拟数据不参与正式计算。
