# DEV-005-B｜E1/E2 核心玩法验证原型

**状态：本地开发与 DEV-005-CLOSE 收尾完成**
**分支：`dev/dev-002-gameplay-experiment`**
**基线：`25f686e DEV-004: close arrow visibility fix and B1/B1+ audit`**
**日期：2026-10-23**
**使用模型：`learnings_campus/deepseek-v4.1-flash`（OpenCode）**

## 1. 结论摘要

- 按 DEV-005-P 已评审地图新增 E1「诱人的近路」、E2「取舍的时机」，实验模式由 6 关变为 8 关。
- 未修改核心移动规则、原九关数据、B1/B2/B1+ 或箭头角标实现。
- `npm test`：**28 项通过，0 失败**；新增 3 项 E1/E2 规则测试。
- headless Chrome 临时 CDP 脚本验证：8 关加载、E1 12 步通关、E2 16 步通关、撤销/重开/切关/键盘与屏幕按钮、E2 箭头角标、320/390/768/1100 布局、原九关 9 条参考路线回放，均通过。
- **未运行** `python tests/browser_regression.py`：当前 Python 环境未安装 Playwright。
- PT-005 单次真实体验：E1 获得“有趣、有策略感”的正面反馈；E2 有思考但整体乐趣一般；玩家认为整体仍不够好。详见第 7 节。
- 本轮归档前未执行 Git Commit、Push 或 Merge；本地归档 Commit 由 DEV-005-CLOSE 单独执行。

## 2. 关卡实现

### E1「诱人的近路」

```text
S.★..
#...★
..★#.
####.
####E
```

- 起点：`(0,0)`；出口：`(4,4)`；收集物：`(0,2)`、`(1,4)`、`(2,2)`。
- 参考路线（12 步）：
  `R D D R U U R R D D D D`
  `(0,0) → (0,1) → (1,1) → (2,1) → (2,2)★ → (1,2) → (0,2)★ → (0,3) → (0,4) → (1,4)★ → (2,4) → (3,4) → (4,4)`
- 关卡标签保持中性：`实验 E1 · 新增策略验证关卡`。

### E2「取舍的时机」

```text
S.#.★
.....
★..#.
.#...
#.★★E
```

- 起点：`(0,0)`；出口：`(4,4)`；收集物：`(0,4)`、`(2,0)`、`(4,2)`、`(4,3)`。
- 参考路线（16 步）：
  `D D R U R R U R D D D L L D R R`
  `(0,0) → (1,0) → (2,0)★ → (2,1) → (1,1) → (1,2) → (1,3) → (0,3) → (0,4)★ → (1,4) → (2,4) → (3,4) → (3,3) → (3,2) → (4,2)★ → (4,3)★ → (4,4)`
- 关卡标签保持中性：`实验 E2 · 新增策略验证关卡`。

### 实验模式接入

- `data/levels.experimental.json` 追加 E1/E2，分别对应实验第 7、8 关。
- `tests/fixtures/verified-paths.experimental.json` 追加两条参考路线。
- `src/app.mjs` 实验模式文案更新为八关；提示只要求观察收集顺序与主动尝试，不展示路线或关键决策。
- `index.html` 仅将实验关卡按钮网格从 6 列调整为 8 列；原九关 9 列布局不变。
- 未修改 `src/game-engine.mjs`、`src/render.mjs`、`data/levels.v0.2.json`、既有实验关卡数据或参考路线。

## 3. 规则验证

新增 `solveFrom(state, {ignoreStamps})` 到 `tests/experiment-analysis.mjs`，从任意真实引擎状态继续求解；`ignoreStamps` 只用于移除历史箭头限制，墙壁、收集、终点和移动规则保持不变。

### E1：近星优先前缀

| 验证点 | 结果 |
|---|---|
| 最近收集物 | `(0,2)`，从 S 走 `R R` 到达 |
| 近星优先前缀 `R R` 后 | 已收集 1/3 星 |
| 有箭头继续求解 | **无解** |
| 移除箭头限制后求解 | **可通关** |
| 具体冲突 | 近星后经 `(1,2)` 下到中心星，`(1,2)` 被写成“向下”；再回到该格时向东离开非法 |
| 参考路线 | 12 步，真实引擎通关 |

测试名称：`E1: taking the nearest gem first is an irrecoverable arrow trap`

### E2：关键路口错误方向

决策状态：到达 `(3,3)`，已收集 `(2,0)`、`(0,4)`，剩余 `(4,2)`、`(4,3)`。

| 验证点 | 结果 |
|---|---|
| 正确方向 | 向西到 `(3,2)`，继续可通关 |
| 错误方向 | 向南到 `(4,3)` |
| 错误方向后（3/4 星） | 有箭头 **无解**；移除箭头限制 **可通关** |
| 再向西收集 `(4,2)`（4/4 星） | 有箭头 **仍无解**；移除箭头限制 **可通关** |
| 参考路线 | 16 步，真实引擎通关 |

测试名称：`E2: the wrong lower-star order is winnable only without arrow stamps`

### E2 箭头规则专项

从错误分支到达 `(4,2)`（4/4 星）后：

- `(4,3)` 已记录“向西”。
- 从 `(4,2)` 向东进入 `(4,3)`：**允许**，证明可以重新进入旧箭头格。
- 在 `(4,3)` 继续向东去 E：**非法**，只能按已记录的“向西”返回 `(4,2)`。
- 该行为与 `game-engine.mjs` 现有规则一致，未修改规则。

测试名称：`E2 arrow rule: re-entry is allowed, but departure must follow the stored direction`

## 4. 自动化测试

### Node 规则测试

```text
npm test
ℹ tests 28
ℹ pass 28
ℹ fail 0
```

包括：

- 原 25 项测试全部通过；
- 实验数据扩展为 8 关；
- 8 条实验参考路线全部在真实引擎通关；
- 新增 E1/E2 共 3 项规则测试。

### 浏览器自动化

当前环境未安装 Python Playwright，未运行 `python tests/browser_regression.py`。使用**临时 headless Chrome CDP 脚本**（位于系统临时目录，未加入仓库）完成以下检查：

```text
PASS experiment entry: 8 levels loaded
PASS UI replay E1 12
PASS undo/reset E1
PASS UI replay E2 16
PASS undo/reset E2
PASS dpad click and keyboard move
PASS E2 arrow rule and current-cell arrow badge
PASS layout 1100 {"scrollWidth":1085,"maxSquareDiff":0,"minButtonWidth":68.9375,"buttons":8}
PASS layout 768 {"scrollWidth":768,"maxSquareDiff":0,"minButtonWidth":86,"buttons":8}
PASS layout 390 {"scrollWidth":390,"maxSquareDiff":0.015625,"minButtonWidth":38.75,"buttons":8}
PASS layout 320 {"scrollWidth":320,"maxSquareDiff":0.015625,"minButtonWidth":30,"buttons":8}
PASS original mode remains nine levels
PASS original nine reference routes still replay
PASS no page/console errors
```

说明：

- E1/E2 通过真实 UI 方向按钮逐格回放，不是独立模拟器。
- 撤销、重开、切关、键盘方向键和屏幕方向按钮均已触发。
- E2 当前格角标断言：`.cell.current .player-arrow` 存在，文本为 `←`，`z-index` 为 `4`。
- 320px 下实验关卡按钮最小宽度约 30px，8 个按钮同排显示；视觉可读性仍需人工确认。

## 5. 文件变更

```text
M  README.md
M  data/levels.experimental.json
M  docs/DECISIONS.md
M  docs/development-log.md
M  docs/playtest-log.md
M  index.html
M  src/app.mjs
M  tests/experiment-analysis.mjs
M  tests/experiment.test.mjs
M  tests/fixtures/verified-paths.experimental.json
A  docs/DEV-005-B-REPORT.md
```

未修改：

- `src/game-engine.mjs`
- `src/render.mjs`
- `data/levels.v0.2.json`
- `tests/fixtures/verified-paths.v0.2.json`
- B1/B2/B1+ 地图与参考路线
- 箭头角标实现

## 6. 风险与未验证项

- **真实玩家体验证据有限**：PT-005 是单人单次体验，只能说明 E1 产生了主动思考、E2 有思考但乐趣一般；不能推断普遍玩家体验，也不代表 UI 已验收。
- **E1 的分叉较少**：如果玩家第一次就选择向下，可能不触发箭头思考；体验取决于近星是否足够显眼。
- **E2 有多个箭头陷阱**：除 `(3,3)` 的目标决策外，最近星贪心路线可能在 `(1,4)` 提前失败；需要观察它是否掩盖目标决策。
- **布局**：仅验证 headless Chrome 的 320/390/768/1100；未覆盖真实手机、iOS Safari、Firefox、系统缩放。8 个实验按钮在 320px 下每枚约 30px，需人工确认可点击性与可读性。
- **浏览器脚本**：临时 CDP 脚本未入库；Playwright 回归未运行。
- **角标**：E2 已确认显示当前格箭头，但角标在真实设备上的可读性仍需人工验收。

## 7. PT-005 与产品决策

### 7.1 真实反馈（单人体验）

- **E1「诱人的近路」**：有趣，经历了主动思考和策略调整；需要思考第一个先收集哪个目标，具有一定策略感。
- **E2「取舍的时机」**：有思考，但整体乐趣一般；首次使用 20 步通关，发现目标为 16 步后，产生了优化路线的探索欲望。
- **综合评价**：玩家认为目前这些关卡整体仍不够好。
- **边界**：以上为真实的单人体验反馈，不代表普遍用户结论；UI 人工验收尚未确认。

### 7.2 产品判断

- DEV-005 的工程实验已完成，但当前玩法尚未充分证明能够持续产生高质量解谜体验。
- 保留历史方向箭头规则。
- 正式版优先吸收 B1、E1 中得到正面反馈的收集顺序策略。
- 保留最短步数挑战作为额外游玩动力。
- 不再无期限进行小规模机制探索。
- 不得将当前版本描述为已经通过完整用户体验验证。

### 7.3 未来计划

- 先将《方向回声》开发为至少 50 关、具有合理难度递进的完整 H5 参赛候选作品。
- 完成第一款可提交作品后，继续探索其他游戏创意；最终参赛玩法仍可调整。

> 真实反馈、产品判断与未来计划分别记录，详见 `docs/DECISIONS.md` 2026-10-23 条目。

### 7.4 收尾状态

- DEV-005-B 工程成果、PT-005 反馈、产品决策与遗留问题已同步到 `docs/playtest-log.md`、`docs/DECISIONS.md` 和 `docs/development-log.md`。
- 本地归档 Commit 由 DEV-005-CLOSE 执行；不执行 Push、Merge 或 Force Push。