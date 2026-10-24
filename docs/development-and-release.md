# 独立仓库、开发、测试与 Pages 交付

本流程是明确交付范围，不以“文档写完”或“本地能看”代替可用网址。

## 1. 创建独立 GitHub 仓库

使用已授权 GitHub 账号 `zaizuole`，仓库名 `world-work-clock`，与其他业务仓库分离。代码保留当前工作目录，采用公开仓库及 GitHub Pages，不写入密码、Token、真实用户人数或本地临时产物。

首次创建用 `gh repo create zaizuole/world-work-clock --public --source=. --remote=origin`；操作前检查仓库是否已经存在，后续不得重复创建。Pages Source 设为 GitHub Actions。部署地址由 GitHub 返回值核实，不仅按命名猜测。

## 2. 写代码与规格同步

正式代码位于 `src/`；配置在 `config/`，日历生成与校验脚本在 `scripts/`，数据快照在 `public/data/`。视觉采用设计文档 v0.3：银灰背景、白色区域、炭黑文字、小面积蓝/绿/琥珀提示，保留已确认的焦点布局。

按工作状态、数据日历、响应式看板三项 OpenSpec 能力实现。遇到数据范围变化，同步说明，不能把预测年份或缺失数据标成已核验。国家扩展走可审阅配置和生成数据，不在 UI 中随意输入不受支持的国家代码。

## 3. 提交代码与测试

提交前完成：

1. `npm run check`：TypeScript 检查与关键业务测试。
2. 固定版本的日历快照再生一致性检查及官方/规则样例校验。
3. 带 `/world-work-clock/` 基础路径构建，避免 Pages 子路径资源 404。
4. Playwright 端到端：概览/详情同步、手机、设置持久化、非法工时、数据失败和重试、缓存回退、禁止存储、预测年份。
5. 正常应用入口的桌面/手机截图与人工查看；设计原型不替代正式应用验收。

Git 提交使用详细中文，包含原因和验证结果，末尾加 `Co-authored-by: codex <codex@openai.com>`。只整理本次创建的内容，不改写用户历史提交。

## 4. 自动发布 Pages

工作流 `.github/workflows/pages.yml` 在 `main` push / 手动运行时发布，PR 仅验证。构建上传 `dist`；部署 job 必须依赖 verify 成功。权限为读取源码、写 Pages 和 OIDC，采用 `github-pages` environment，不在前端或仓库写个人访问令牌。

失败保留上一版本，不能为了上线跳过测试。正常更新只需提交、推送 main，不需要手动上传站点文件或维护服务器。

## 5. 最终交付

只有完成以下项目才标记“已上线”：

- GitHub Actions 的测试与部署均成功，有具体 run 与 commit 记录。
- GitHub 返回的 Pages URL 实际 HTTP 成功，页面、JS/CSS、同源日历均能加载。
- 真实 URL 的桌面/移动视口，实时和模拟状态、日历和关键交互复查。
- README 写明可用网址，提供仓库地址与上线验证记录；截图标明真实部署环境和版本。

当前进度与证据见 `docs/release-verification.md`；不能将预测网址或本地截图当作已上线证明。
