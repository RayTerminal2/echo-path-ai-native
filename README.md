# 方向回声 | Echo Path — AI Native 玩法候选研究

> 状态：**候选机制 / 工程化准备版**。不是最终参赛作品，尚未确定是否生产50关。

## 运行

需要 Node.js 18 或更新版本，无需安装第三方包。

```bash
npm run dev
```

在浏览器打开 <http://127.0.0.1:5173/>。

DEV-001 已将规则与关卡数据拆分，必须通过本地 HTTP 服务运行，不能直接双击 `index.html`。原版单文件保留于 `legacy/echo-v0.2-original.html`。

实验模式：<http://127.0.0.1:5173/?mode=experiment>，提供 DEV-002 三关、DEV-003 B1/B2、DEV-004 B1+ 及 DEV-005-B E1/E2，共八关实验关卡；不带参数时仍为原九关。

## 测试

```bash
npm test
```

包含 3 项冻结基线校验、14 项实际规则模块测试和 11 项实验关卡验证，覆盖边界、旧箭头、收集、胜利、撤销、重开、九关参考路径及八关实验设计约束。规则测试通过不代表玩家体验已验证。

如已安装 Python Playwright 和浏览器，可执行 `python tests/browser_regression.py`，实际回放九关并检查桌面/手机视口。本次开发环境未安装 Playwright，实验模式的浏览器验证记录见 `docs/DEV-002-REPORT.md`。

## 目录

- `index.html`：保留 V0.2 布局、样式与文案，加载原生 ES 模块。
- `src/game-engine.mjs`：纯规则状态转换；非法移动返回原状态，合法移动创建新状态。
- `src/render.mjs`：DOM 渲染。
- `src/app.mjs`：UI 事件、撤销历史、会话统计和记录导出。
- `legacy/echo-v0.2-original.html`：冻结的原版，重构后用于对比。
- `data/levels.v0.2.json`：原九关的唯一数据源，九关内容及顺序冻结。
- `data/levels.experimental.json`：DEV-002/DEV-003/DEV-004/DEV-005-B 八关实验数据，仅在 `?mode=experiment` 加载。
- `tests/fixtures/verified-paths.v0.2.json`：九条经旧版求解器计算的参考路线。
- `tests/fixtures/verified-paths.experimental.json`：八关实验关卡的参考路线。
- `tests/baseline.test.mjs`：冻结基线检查；`tests/game-engine.test.mjs` 测试实际规则模块。
- `tests/experiment.test.mjs`：实验关卡通关、回访、顺序和交汇约束测试。
- `docs/DEV-001.md`：DEV-001 任务单。
- `docs/DEV-002-REPORT.md`：DEV-002 设计、证据和验证报告。
- `docs/DEV-003-REPORT.md`：DEV-003 UI 优化与 B1/B2 设计验证报告。
- `docs/DEV-004-REPORT.md`：DEV-004 箭头可见性修复与 B1+ 验证报告。
- `docs/DEV-005-B-REPORT.md`：DEV-005-B E1/E2 原型、规则验证与浏览器检查报告。
- `docs/screenshots/`：DEV-004 箭头修复前后对比截图。
- `docs/DECISIONS.md`：真实反馈与产品决策。
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

## DEV-002/DEV-003/DEV-004/DEV-005-B 实验模式

实验模式现有八关，不改动原九关或核心规则。实验统计使用 `exp:` 前缀与九关统计区分；试玩记录会标明当前模式。棋盘不再直接高亮可移动位置，格子按正方形网格稳定渲染；玩家站在已有箭头的格子上时，会在角色上层显示方向角标。设计与验证证据见 [DEV-002 报告](docs/DEV-002-REPORT.md)、[DEV-003 报告](docs/DEV-003-REPORT.md)、[DEV-004 报告](docs/DEV-004-REPORT.md) 和 [DEV-005-B 报告](docs/DEV-005-B-REPORT.md)。自动通关不代表真实玩家体验。
