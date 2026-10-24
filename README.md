# 方向回声 | Echo Path — AI Native 玩法候选研究

> 状态：**已结项归档（2026-10-24）**。V1.0 五章 50 关、步数挑战、自动化测试与静态发布包已完成；产品负责人判断核心玩法吸引力不足，已停止主动开发，不再新增关卡或发布功能。现有成果仅作历史保留，未部署、未 Push。最终复盘见 [`docs/PROJECT-RETROSPECTIVE.md`](docs/PROJECT-RETROSPECTIVE.md)。

## 运行

需要 Node.js 18 或更新版本，无需安装第三方包。

```bash
npm run dev
```

在浏览器打开 <http://127.0.0.1:5173/>。

DEV-001 已将规则与关卡数据拆分，必须通过本地 HTTP 服务运行，不能直接双击 `index.html`。原版单文件保留于 `legacy/echo-v0.2-original.html`。

实验模式：<http://127.0.0.1:5173/?mode=experiment>，提供 DEV-002 三关、DEV-003 B1/B2、DEV-004 B1+ 及 DEV-005-B E1/E2，共八关实验关卡；**不带参数默认进入 V1.0 正式50关**（也可用 <http://127.0.0.1:5173/?mode=campaign>）；经典九关入口：<http://127.0.0.1:5173/?mode=classic>。

## 测试

```bash
npm test
```

包含 3 项冻结基线校验、4 项实际规则模块测试、实验关卡验证、V1.0 第一批十关检查，以及正式50关的数据结构、参考路线引擎回放、完整 BFS 最优步数验证、槽位证据与去重测试。当前共 44 项测试；规则测试通过不代表玩家体验已验证。

## 发布打包

```bash
npm run build
```

`scripts/build-dist.mjs` 依据运行时白名单（`index.html`、三个 `src/*.mjs`、三个 `data/levels.*.json`）生成独立静态目录 `dist/`，并输出 `dist/manifest.json`（逐文件 SHA-256）。构建时执行敏感信息扫描（API Key、Token、私钥、`.env` 等模式）与关卡计数校验，命中即中止并删除产物。`dist/` 不含 Git 记录、内部文档、模型配置、测试脚本或凭据；可上传 Netlify 等任意静态托管。本地 `npm run dev` 开发模式不受影响。

如已安装 Python Playwright 和浏览器，可执行 `python tests/browser_regression.py`，实际回放九关并检查桌面/手机视口。本次开发环境未安装 Playwright，实验模式的浏览器验证记录见 `docs/DEV-002-REPORT.md`。

## 目录

- `index.html`：保留 V0.2 布局、样式与文案，加载原生 ES 模块。
- `src/game-engine.mjs`：纯规则状态转换；非法移动返回原状态，合法移动创建新状态。
- `src/render.mjs`：DOM 渲染。
- `src/app.mjs`：UI 事件、撤销历史、会话统计和记录导出。
- `legacy/echo-v0.2-original.html`：冻结的原版，重构后用于对比。
- `data/levels.v0.2.json`：原九关的唯一数据源，九关内容及顺序冻结。
- `data/levels.experimental.json`：DEV-002/DEV-003/DEV-004/DEV-005-B 八关实验数据，仅在 `?mode=experiment` 加载。
- `data/levels.campaign.batch1.json`：V1.0 第一批十关数据（DEV-006-B 历史版本，保留）。
- `data/levels.campaign.json`：V1.0 正式五十关数据（第一批十关 + 四十生成关），仅在 `?mode=campaign` 加载。
- `tests/fixtures/verified-paths.v0.2.json`：九条经旧版求解器计算的参考路线。
- `tests/fixtures/verified-paths.experimental.json`：八关实验关卡的参考路线。
- `tests/fixtures/verified-paths.campaign.batch1.json`：第一批十关的参考路线。
- `tests/fixtures/verified-paths.campaign.json`：正式五十关的参考路线。
- `tests/baseline.test.mjs`：冻结基线检查；`tests/game-engine.test.mjs` 测试实际规则模块。
- `tests/experiment.test.mjs`：实验关卡通关、回访、顺序和交汇约束测试。
- `tests/campaign.test.mjs`：第一批十关的数据、最短步数、参考路线、策略证据和去重测试。
- `tests/campaign-50.test.mjs`：正式五十关的结构、引擎回放、完整 BFS 最优、槽位证据与去重测试。
- `scripts/analyze-levels.mjs`：关卡最短步数、顺序、贪心基线、历史分支和重复布局分析工具。
- `scripts/generate-campaign-v1.mjs`：按章节槽位标准生成新关卡并附策略证据。
- `scripts/merge-campaign-50.mjs`：合并第一批与生成关卡，逐关做引擎回放、完整 BFS 与去重校验。
- `scripts/build-dist.mjs`：按运行时白名单生成独立静态发布目录 `dist/`，含敏感扫描与产物校验。
- `docs/DEV-001.md`：DEV-001 任务单。
- `docs/DEV-002-REPORT.md`：DEV-002 设计、证据和验证报告。
- `docs/DEV-003-REPORT.md`：DEV-003 UI 优化与 B1/B2 设计验证报告。
- `docs/DEV-004-REPORT.md`：DEV-004 箭头可见性修复与 B1+ 验证报告。
- `docs/DEV-005-B-REPORT.md`：DEV-005-B E1/E2 原型、规则验证与浏览器检查报告。
- `docs/DEV-006-B-REPORT.md`：V1.0 第一批十关、分析工具、预览接入与验证报告。
- `docs/DEV-007-HANDOFF.md`：DEV-007 会话交接记录（进度、修改文件、测试结果、遗留问题）。
- `docs/screenshots/`：DEV-004 箭头修复前后对比截图。
- `docs/DECISIONS.md`：真实反馈与产品决策。
- `docs/PROJECT-RETROSPECTIVE.md`：最终结项复盘、失败原因与 AI 协作经验。
- `docs/TEST_PLAN.md`：测试层次与证据边界。
- `AGENTS.md`：Codex/OpenCode 的长效协作约束。

## 角色与协作

用户/PM：玩法方向、优先级、主观体验、最终验收。  
ChatGPT：需求、技术方案评估、测试设计、审查。  
Codex：开发、自动测试、修复，建议在独立分支并通过 PR 交付。

所有产品决策保持人工确认。只记录真实发生的工作和验证结果。

## 冻结基线的浏览器回放（可选）

如果已安装 Python Playwright 和 Chromium，可运行 `python tests/browser_baseline.py`。它通过单文件内容加载验证旧版，不代表重构版本已通过浏览器验收。

## DEV-001 验证记录

验证环境、命令输出和测试盲区见 [开发报告](docs/DEV-001-REPORT.md)。重开清零当前棋盘、步数及撤销历史，累计试玩统计继续保留，与 V0.2 原版一致。复制记录及其复制失败后的下载回退保持原行为。

## V1.0 正式50关模式

`?mode=campaign` 提供 C1-01 至 C5-10 正式五十关，按五章各十关组织，章节标签页切换，每章显示通关进度计数。第一批十关（C1-01 至 C5-02）保留为其中一部分；其余四十关由 `scripts/generate-campaign-v1.mjs` 按槽位标准生成，并经 `scripts/merge-campaign-50.mjs` 与 `tests/campaign-50.test.mjs` 逐关完成真实引擎回放与完整 BFS 最优步数验证。步数挑战为正式功能：棋盘上方实时显示当前步数、最优步数与个人最佳，个人最佳存于 localStorage，仅在通关后刷新，通关后可重开再挑战。**无 `mode` 参数时默认进入本模式**（DEV-008-RELEASE 定版）。经典九关（`?mode=classic`）与八关实验模式（`?mode=experiment`）保持独立。**五十关的难度递进与趣味性尚未完成统一人工试玩验收。**

## DEV-002/DEV-003/DEV-004/DEV-005-B 实验模式

实验模式现有八关，不改动原九关或核心规则。实验统计使用 `exp:` 前缀与九关统计区分；试玩记录会标明当前模式。棋盘不再直接高亮可移动位置，格子按正方形网格稳定渲染；玩家站在已有箭头的格子上时，会在角色上层显示方向角标。设计与验证证据见 [DEV-002 报告](docs/DEV-002-REPORT.md)、[DEV-003 报告](docs/DEV-003-REPORT.md)、[DEV-004 报告](docs/DEV-004-REPORT.md) 和 [DEV-005-B 报告](docs/DEV-005-B-REPORT.md)。自动通关不代表真实玩家体验。
