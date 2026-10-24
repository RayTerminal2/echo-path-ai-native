# DEV-002｜方向回声策略差异化关卡实验

**状态：本地开发完成，等待人工验收**
**分支：`dev/dev-002-gameplay-experiment`**
**日期：2026-10-23**
**使用模型：`learnings_campus/deepseek-v4.1-flash`（OpenCode）**

## 1. 结论摘要

- 新增三关独立实验关卡，未修改 V0.2 九关、核心移动规则、胜利条件或冻结基线。
- 三关均可通过现有游戏规则通关，并保存了实际验证过的参考路线。
- 三关分别验证：A 必经旧路、B 收集顺序陷阱、C 多路口往返规划。
- 实验模式入口：`http://127.0.0.1:5173/?mode=experiment`；默认地址仍为原九关。
- `npm test`：**22 项通过，0 失败**（原 17 项 + DEV-002 新增 5 项）。
- 浏览器验证：使用 headless Chrome 实际回放三关与原九关，覆盖移动、撤销、重开、切关、复制记录和移动端布局；未发现 JS/控制台错误。
- 未进行真实玩家试玩，不能据此宣称趣味性或难度已经验证。

## 2. 关卡设计与求解证据

规则未变。以下“必须”“仅”均来自实际规则模块上的穷举搜索，不是主观推断。

### 实验 A：「旧路必须重走」

```text
.S★.#
★.#..
....E
.#..#
.##..
```

- 起点：`(0,1)`；出口：`(2,4)`；收集物：`(0,2)`、`(1,0)`。
- 参考路线（方向序列）：`R R D R D L L L U L U R R R D R D`
- 参考步数：**17**。
- 位置序列：`(0,1)S → (0,2)★ → (0,3) → (1,3) → (1,4) → (2,4)E → (2,3) → (2,2) → (2,1) → (1,1) → (1,0)★ → (0,0) → (0,1) → (0,2) → (0,3) → (1,3) → (1,4) → (2,4)E`
- 设计特点：路线会提前经过出口，但此时尚未收齐收集物；随后必须绕回左侧，再次经过已经写入箭头的顶部通道，最后才停在出口。
- 证据：对“不重复进入任何格子”的 winning path 做穷举搜索，结果**不存在**。因此所有通关路线都至少重复进入一个格子；参考路线共重复进入 6 个格子（S、★、两段顶部通道、出口等）。
- 与简单绕圈的区别：不是单纯绕一圈后直接离开；必须先经过出口，再沿旧路返回并重走一段已经形成箭头的通道。

### 实验 B：「顺序的陷阱」

```text
★..★#
.#★..
.#.##
....E
S...#
```

- 起点：`(4,0)`；出口：`(3,4)`；收集物：`(0,0)`、`(0,3)`、`(1,2)`。
- 参考路线（方向序列）：`U U U U R R R D L D D R R`
- 参考步数：**13**。
- 首个收集物的唯一可行顺序：`(0,0) → (0,3) → (1,2)`。
- 证据：对三颗收集物的全部 6 种首次收集顺序逐一搜索，只有上述顺序存在通关状态；其余 5 种顺序均无解。该结论由实际规则模块的 `orderSolvable` 搜索验证。
- 设计特点：先拿中间那颗收集物会关闭后续可行的回程结构；先沿左侧上行、再取右上、最后回到中间，才是可解顺序。
- 该关的最短参考路线本身不需要重复格子；其策略差异来自收集顺序，而不是回访。

### 实验 C：「三处交汇」

```text
.★..#
E#...
.★...
.#.S#
.#.★.
```

- 起点：`(3,3)`；出口：`(1,0)`；收集物：`(0,1)`、`(2,1)`、`(4,3)`。
- 参考路线（方向序列）：`D L U U L L U U R R D D L L U`
- 参考步数：**15**。
- 位置序列：`(3,3)S → (4,3)★ → (4,2) → (3,2) → (2,2) → (2,1)★ → (2,0) → (1,0)E → (0,0) → (0,1)★ → (0,2) → (1,2) → (2,2) → (2,1) → (2,0) → (1,0)E`
- 设计特点：路线会在中间通道、顶部通道和出口附近多次交汇；需要安排“先下取右下、再上穿中间、提前经过出口、绕顶部取最后一颗、再沿旧路回到出口”。
- 证据：参考路线经过 **7 个不同的三向及以上路口**，共 9 次路口访问；对求解器枚举到的 20 个通关状态，最少也经过 7 个不同路口、至少 4 次重复进入。
- 证据边界：这里把“路口”定义为上下左右非墙邻居数 ≥ 3 的格子；“多次交汇”是路线结构指标，不等同于玩家主观难度。对所有可能路径的全局最少路口数未做完整证明，因此不声称“每条路线都必须经过 7 个路口”。

## 3. 实现概要

- 新增 `data/levels.experimental.json`：三关数据，沿用现有 `rows` / `S` / `E` / `★` / `optimal` 格式。
- 新增 `tests/fixtures/verified-paths.experimental.json`：三关方向序列与验证步数。
- `src/app.mjs`：根据 `?mode=experiment` 只加载对应数据源；实验统计使用 `exp:` 前缀；试玩记录标明模式；模式入口链接与返回链接；默认九关行为保持不变。
- `src/render.mjs`：实验模式标题、关卡按钮（A/B/C）、关卡类型标签；原九关渲染路径保持原行为。
- `index.html`：增加实验模式入口、实验模式提示元素和 3 列实验关卡样式；未改动游戏面板结构。
- `scripts/serve.mjs`：白名单增加实验 JSON。
- `tests/experiment-analysis.mjs`：测试辅助搜索，直接调用实际 `src/game-engine.mjs`，没有复制第二套规则。
- `tests/experiment.test.mjs`：验证数据、参考路线、A 无简单路径、B 唯一顺序、C 交汇/回访约束。

## 4. 验证结果

### 已执行

```text
npm test
ℹ tests 22
ℹ pass 22
ℹ fail 0
```

其中原有 17 项全部继续通过，DEV-002 新增 5 项通过。

浏览器验证使用 Node.js v24.14.0 + headless Chrome 155.0.8059.85（Windows）通过临时 CDP 脚本执行，实际点击页面关卡按钮、方向按钮、撤销、重开、模式链接和复制按钮：

```text
PASS experiment entry/data loaded
PASS UI replay A 17
PASS undo/reset A
PASS UI replay B 13
PASS experiment statistics are namespaced and exportable
PASS undo/reset B
PASS UI replay C 15
PASS undo/reset C
PASS default mode remains nine levels
PASS base UI replay 1 5
PASS base UI replay 2 11
PASS base UI replay 3 16
PASS base UI replay 4 14
PASS base UI replay 5 13
PASS base UI replay 6 17
PASS base UI replay 7 19
PASS base UI replay 8 19
PASS base UI replay 9 23
PASS default nine levels still replay
PASS mobile experiment layout 390
PASS no page/console errors
```

说明：上述浏览器检查脚本是临时验证工具，未纳入仓库；仓库现有 `tests/browser_regression.py` 需要 Python Playwright。

### 未运行

- `python tests/browser_regression.py`：**未运行**。当前 Python 环境报 `ModuleNotFoundError: No module named 'playwright'`。
- 真实玩家试玩：**未运行**。没有参与者数据、留存或趣味性结论。

## 5. 文件变更

```text
M  README.md
M  index.html
M  scripts/serve.mjs
M  src/app.mjs
M  src/render.mjs
M  docs/development-log.md
A  data/levels.experimental.json
A  docs/DEV-002-REPORT.md
A  tests/experiment-analysis.mjs
A  tests/experiment.test.mjs
A  tests/fixtures/verified-paths.experimental.json
```

未修改 `data/levels.v0.2.json`、`tests/fixtures/verified-paths.v0.2.json`、`legacy/echo-v0.2-original.html` 或核心规则文件。

## 6. 运行方式

```bash
npm run dev
```

- 默认九关：<http://127.0.0.1:5173/>
- 实验三关：<http://127.0.0.1:5173/?mode=experiment>
- 自动测试：`npm test`

## 7. 风险与待确认

- 自动化通关只证明规则可执行，不证明玩家会觉得有趣或难度合适；需要真实试玩。
- A 的“必经旧路”已由无重复格路径搜索证明；但“有意义”仍是设计判断，需要玩家观察是否感到重复访问是策略而非机械绕圈。
- B 的顺序唯一性已证明；其它潜在路线是否因求解器状态去重而被遗漏，已通过 6 种顺序逐一搜索覆盖，未使用启发式剪枝。
- C 的“多次交汇”使用路口数量作为结构指标；没有证明这是唯一合理的策略体验指标。
- 浏览器验证覆盖 headless Chrome 的 1100×800 与 390×844 视口；未覆盖 iOS Safari、Firefox、真实触屏设备或辅助技术。
- 实验统计与九关统计通过前缀区分，但同一页面切换模式会重新加载页面；当前没有跨模式合并统计需求。
- 本次未执行 Git Commit、Push 或 Merge，变更仍保留在本地分支，等待 PM 验收授权。