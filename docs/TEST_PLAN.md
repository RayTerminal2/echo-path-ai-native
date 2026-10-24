# 测试策略（DEV-001）

| 层级 | 做什么 | 可得出什么结论 |
|---|---|---|
| 数据校验 | 9关地图与参考路径 | 当前数据格式与参考解路径一致；不是可玩性结论 |
| 规则单测 | 方向写入、非法移动、收集、胜利、撤销、重开 | 规则在边界条件下保持正确 |
| 端到端冒烟 | 浏览器依次跑通9关，检查操作和移动端布局 | 前端集成运行正常 |
| 玩家试玩 | 观察绕圈策略是否占优、难度与乐趣 | 机制是否值得进一步投入 |

DEV-001 后，`npm test` 执行冻结基线校验与 `src/game-engine.mjs` 的实际规则单测（包括九关路径）。DEV-006-B 后新增第一批十关的数据、参考路线、完整 BFS 最短步数、策略证据和去重测试。浏览器回归独立执行，结果见 `docs/DEV-001-REPORT.md` 与 `docs/DEV-006-B-REPORT.md`；两类自动测试均不能替代玩家体验验证。

## V1.0 第一批（DEV-006-B）

- 数据：`data/levels.campaign.batch1.json`，五章各两关。
- 参考路线：`tests/fixtures/verified-paths.campaign.batch1.json`。
- 自动测试：`tests/campaign.test.mjs`。
- 分析工具：`node scripts/analyze-levels.mjs`（默认分析第一批，可传入数据路径或 `--json`）。
- 求解器三态：`solved`、`unsolvable`、`aborted`；`aborted` 不得写成“不可解”或“最优”。
- 浏览器检查：`?mode=campaign` 十关回放、撤销/重开/切关、320/390/768/1100 布局；经典与实验模式回归。

## V1.0 正式50关（DEV-007）

- 数据：`data/levels.campaign.json`（五十关 = 第一批十关 + 生成四十关），参考路线 `tests/fixtures/verified-paths.campaign.json`。
- 生成：`scripts/generate-campaign-v1.mjs` 按章节槽位标准（尺寸、星数、步数区间、顺序比例、贪心陷阱、步数差、历史分支）逐关生成。
- 合并校验：`scripts/merge-campaign-50.mjs` 逐关做真实引擎回放（含撤销/重开）、完整 BFS（`maxStates=2_000_000`，必须 `solved` 且与 `optimal` 一致）、声明式复用之外的精确去重与汉明距离检查。
- 自动测试：`tests/campaign-50.test.mjs`（结构、回放、完整 BFS、槽位证据、去重），纳入 `npm test`；当前共 44 项。
- 步数系统：UI 显示当前/最优/个人最佳；个人最佳存 localStorage `echoPath.best.v1`，仅通关后刷新。localStorage 行为只能在浏览器中验证，Node 测试不覆盖。
- 浏览器检查：五十关 UI 全部按最优通关、章节标签页切换与计数、个人最佳持久化与刷新、通关后再挑战提示、320/390/768/1100 布局、经典/实验模式回归。
- 边界：以上验证只证明**可解性与最优步数正确**；难度递进、趣味性与步数挑战的激励效果仍待统一人工试玩验收。

## 数据基线
- 9关最短步数记录：5 / 11 / 16 / 14 / 13 / 17 / 19 / 19 / 23
- 固定参考路线：`tests/fixtures/verified-paths.v0.2.json`
- 用户主观体验：手动记录；不可伪造测试参与人数

## 可选浏览器回归

`python tests/browser_regression.py` 使用 Python Playwright 和 Chromium 实际运行全部九关。该项需要预先配置 Playwright，默认 `npm test` **不会**执行它。验收报告必须分别标注 Node 基线测试与浏览器回归结果。

## 冻结基线浏览器测试

`python tests/browser_baseline.py` 对冻结的 V0.2 单文件进行 Playwright 回放，避免本地 HTTP 访问；该测试只能证明**原版**行为，不测试 DEV-001 重构后的游戏。DEV-001 必须以重构后的代码重新执行浏览器回归。
