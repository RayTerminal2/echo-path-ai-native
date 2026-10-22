# 方向回声 | Echo Path — AI Native 玩法候选研究

> 状态：**候选机制 / 工程化准备版**。不是最终参赛作品，尚未确定是否生产50关。

## 运行

需要 Node.js 18 或更新版本，无需安装第三方包。

```bash
npm run dev
```

在浏览器打开 <http://127.0.0.1:5173/>。

也可以直接双击 `index.html`：当前版本保留 V0.2 原版单文件实现（重构后可能需要本地服务器）。

## 测试

```bash
npm test
```

当前仅为**冻结基线数据/参考路线检查**，并未单测 HTML 内的游戏规则实现。Codex 在 DEV-001 中会补充独立规则单测和真实游戏回归测试。

如已安装 Python Playwright 和浏览器，可执行 `python tests/browser_regression.py`，实际回放九关并检查桌面/手机视口。

## 目录

- `index.html`：V0.2 未改动的可运行游戏基线。
- `legacy/echo-v0.2-original.html`：冻结的原版，重构后用于对比。
- `data/levels.v0.2.json`：9关快照数据，预备成为重构后唯一数据源。
- `tests/fixtures/verified-paths.v0.2.json`：九条经旧版求解器计算的参考路线。
- `tests/baseline.test.mjs`：当前基线检查；不代表产品验收完成。
- `docs/DEV-001.md`：发给 Codex 的第一张正式任务单。
- `docs/DECISIONS.md`：真实反馈与产品决策。
- `docs/TEST_PLAN.md`：测试层次与证据边界。
- `AGENTS.md`：Codex 的长效协作约束。

## 角色与协作

用户/PM：玩法方向、优先级、主观体验、最终验收。  
ChatGPT：需求、技术方案评估、测试设计、审查。  
Codex：开发、自动测试、修复，建议在独立分支并通过 PR 交付。

所有产品决策保持人工确认。只记录真实发生的工作和验证结果。

## 冻结基线的浏览器回放（可选）

如果已安装 Python Playwright 和 Chromium，可运行 `python tests/browser_baseline.py`。它通过单文件内容加载验证旧版，不代表重构版本已通过浏览器验收。
