# DEV-004｜箭头可见性修复与 B1 进阶实验

**状态：本地开发与 DEV-004-CLOSE 收尾完成，等待提交批准**
**分支：`dev/dev-002-gameplay-experiment`**
**基线：`f766a8d feat: add gameplay experiments and UI refinements`**
**日期：2026-10-23**
**使用模型：`learnings_campus/deepseek-v4.1-flash`（OpenCode）**

## 1. 结论摘要

- 开发前确认：分支 `dev/dev-002-gameplay-experiment`，工作树干净，基线 Commit 为 `f766a8d`；已把 `docs/development-log.md` 中 DEV-003 的 Commit ID 更新为 `f766a8d`。
- 修复 PT-003 反馈：玩家站在已有箭头的格子上时，现在会在角色上层显示方向角标，箭头方向可见。
- 新增实验 B1+「先远后近·进阶」：4 个收集物，6 条可通关收集顺序，最近的 `(2,2)` 先拿全部失败；第一手和第二手都仍然存在约束。
- `npm test`：**25 项通过，0 失败**。
- 浏览器实测：布局 320/390/768/1100 通过；六关实验与原九关回放通过；新增角标在浏览器中确认存在。
- 未执行 Git Commit、Push 或 Merge。

## 2. 箭头可见性修复

### 实现

- `src/render.mjs`：当角色位于已写入箭头的格子时，追加 `<span class="player-arrow">方向</span>`，方向来自该格永久箭头。
- `index.html`：新增 `.player-arrow` 样式，位于角色上层（`z-index: 4`），显示在格子右上角；不恢复任何合法移动绿色提示。
- 保留 `data-dir`、点击、键盘、触屏方向按钮和焦点可见性；未修改 `src/game-engine.mjs`。

### 证据与截图

- 浏览器断言：在原始第 1 关执行 `D D U` 后，角色站在已写入“↓”的格子上；`.cell.current .player-arrow` 存在，文本为 `↓`，`z-index` 为 `4`。
- 对比截图（棋盘裁剪）：
  - `docs/screenshots/dev-004-arrow-before-1100.png`
  - `docs/screenshots/dev-004-arrow-after-1100.png`
  - `docs/screenshots/dev-004-arrow-before-390.png`
  - `docs/screenshots/dev-004-arrow-after-390.png`
- “修复前”截图使用 `git archive f766a8d` 导出的基线代码重新启动服务截取；修复前 DOM 中不存在 `.player-arrow`，修复后存在。截图文件的 SHA256 已确认前后不同。
- 说明：当前环境不支持模型直接识别图片内容；视觉对比以截图文件、DOM 断言和尺寸测量为准。

### 布局复测

修复后重新测量原九关与六关实验关卡，四个视口均无非预期横向溢出，格子仍为正方形：

| 视口宽度 | 最大横向滚动宽度 | 最大单格宽高差 | 最大列宽差 | 最大行高差 |
|---:|---:|---:|---:|---:|
| 1100 | 1085 | 0.015625 | 0.015625 | 0.015625 |
| 768 | 768 | 0.015625 | 0.015625 | 0.015625 |
| 390 | 390 | 0.015625 | 0.015625 | 0.015625 |
| 320 | 320 | 0.015625 | 0.015625 | 0.015625 |

## 3. B1+「先远后近·进阶」

```text
#.S.E
★.#..
..★..
#.★★.
..#..
```

- 起点：`(0,2)`；出口：`(0,4)`；收集物：`(1,0)`、`(2,2)`、`(3,2)`、`(3,3)`。
- 参考路线：`L D L D R R D R U U U R`（方向数组 `[3,2,3,2,1,1,2,1,0,0,0,1]`），12 步。
- 位置序列：`(0,2)S → (0,1) → (1,1) → (1,0)★ → (2,0) → (2,1) → (2,2)★ → (3,2)★ → (3,3)★ → (2,3) → (1,3) → (0,3) → (0,4)E`

### 收集顺序证据

曼哈顿距离：`(1,0)=3`、`(2,2)=2`、`(3,2)=3`、`(3,3)=4`。最近的 `(2,2)` 是陷阱。

6 条可通关顺序：

1. `(1,0) → (2,2) → (3,2) → (3,3)`
2. `(1,0) → (2,2) → (3,3) → (3,2)`
3. `(1,0) → (3,2) → (2,2) → (3,3)`
4. `(1,0) → (3,2) → (3,3) → (2,2)`
5. `(3,3) → (2,2) → (3,2) → (1,0)`
6. `(3,3) → (3,2) → (2,2) → (1,0)`

其余 18 种首次收集顺序均不可通关。决策点：

- 第一手不能拿最近的 `(2,2)`；只能从 `(1,0)` 或 `(3,3)` 开始。
- 第二手仍受约束：先拿 `(1,0)` 后不能第二手拿 `(3,3)`；先拿 `(3,3)` 后不能第二手拿 `(1,0)`。
- 早期箭头也影响出口下方格子 `(1,4)`：同为未收集状态到达 `(1,4)`，路径 `(0,2)→(0,3)→(0,4)→(1,4)` 仍可通关；路径 `(0,2)→(0,3)→(1,3)→(1,4)` 不可通关。该分叉由 `findHistoryEffect` 在实际规则模块上验证。

### 证据边界

- “两个决策点”由收集顺序穷举与同格不同箭头的可达性分叉支持。
- “玩家能够观察地图和历史箭头进行推理”在 PT-004 中未发生；该反馈不支持 B1+ 已产生两个可感知决策点的结论。

## 4. 自动化与浏览器验证

### 已执行

```text
npm test
ℹ tests 25
ℹ pass 25
ℹ fail 0
```

新增测试 `B1+: two good first moves still require a correct second decision`，验证：

- 恰好 6 条可通关顺序；
- 可通关第一手仅为 `(1,0)` 与 `(3,3)`，最近 `(2,2)` 不在其中；
- 两个可通关第一手的第二手都仍有失败选项；
- `(1,4)` 在收集前存在“可通关/不可通关”的早期箭头分叉。

浏览器实测（headless Chrome 155，临时 CDP 脚本）：

```text
PASS layout 1100 {"maxScrollWidth":1085,"maxSquareDiff":0.015625,"maxWidthRange":0.015625,"maxHeightRange":0.015625}
PASS layout 768 {"maxScrollWidth":768,"maxSquareDiff":0.015625,"maxWidthRange":0.015625,"maxHeightRange":0.015625}
PASS layout 390 {"maxScrollWidth":390,"maxSquareDiff":0.015625,"maxWidthRange":0.015625,"maxHeightRange":0.015625}
PASS layout 320 {"maxScrollWidth":320,"maxSquareDiff":0.015625,"maxWidthRange":0.015625,"maxHeightRange":0.015625}
PASS no visual move hints; click/keyboard movement retained
PASS UI replay A 17
PASS UI replay B 13
PASS UI replay C 15
PASS UI replay B1 8
PASS UI replay B2 10
PASS UI replay B1+ 12
PASS experiment stats remain isolated
PASS default nine levels replay
PASS current-cell arrow badge visible
PASS no page/console errors
```

### 未运行

- `python tests/browser_regression.py`：**未运行**，当前 Python 环境未安装 Playwright。
- 真实玩家试玩：DEV-004 收尾已记录 PT-004 单次反馈（见 `docs/playtest-log.md`）——B1+ 未经策略思考直接通关，且未重复进入任何格子。角标是否真正解决 PT-003 的遮挡问题仍需人工确认。

## 5. 文件变更（DEV-004 增量）

```text
M  README.md
M  data/levels.experimental.json
M  docs/development-log.md
M  index.html
M  src/app.mjs
M  src/render.mjs
M  tests/experiment.test.mjs
M  tests/fixtures/verified-paths.experimental.json
A  docs/DEV-004-REPORT.md
A  docs/screenshots/dev-004-arrow-before-1100.png
A  docs/screenshots/dev-004-arrow-after-1100.png
A  docs/screenshots/dev-004-arrow-before-390.png
A  docs/screenshots/dev-004-arrow-after-390.png
```

未修改 `src/game-engine.mjs`、原九关数据、冻结基线或赛事配置。

## 6. 风险与待确认

- 方向角标解决了“角色遮挡箭头”的显示问题，但是否足够清晰、是否干扰出口/收集物辨识，需要人工体验确认。
- B1+ 的“先远后近”有求解证据；PT-004 显示实际体验未产生策略思考，详见第 7 节。
- 截图由脚本生成，当前环境无法进行模型级图像内容识别；请以文件和人工查看为准。
- 布局验证仅覆盖 headless Chrome；未覆盖真实手机、iOS Safari、Firefox 或系统缩放。
- 本任务未执行 Git Commit、Push 或 Merge，等待提交批准。

## 7. DEV-004-CLOSE｜PT-004 与 B1/B1+ 机制审计

### 7.1 真实反馈

- PT-004（2026-10-23）：B1+ 未经策略思考便直接通关，且通关过程中没有重复进入任何格子；具体步数、时长与撤销次数待补充。
- 该反馈与 PT-003 中 B1“产生实际思考乐趣、需要主动推翻最近优先”的正面反馈形成对照。

### 7.2 审计方法

- 使用 `src/game-engine.mjs` 原规则与 `tests/experiment-analysis.mjs` 的 `simplePathExists`、`solveFirst`、`orderSolvable`、`analyzeWins`。
- 另以只读的自避路径穷举统计“无重复通关”的路径数与收集顺序数；`maxStates` 设为 2,000,000，两关均未触发中止。
- 移除箭头限制的对照仅去掉 `stamps` 检查，墙壁、收集、终点与移动方向规则保持不变。
- 审计过程未改动关卡数据、规则模块或测试。

### 7.3 对照结果

| 审计项 | B1 先远后近 | B1+ 先远后近·进阶 |
|---|---|---|
| 存在无重复进入旧格的通关路线 | 是 | 是 |
| 无重复通关最短步数 | 8 | 12 |
| 无重复通关路径数 / 收集顺序数 | 36 条 / 1 种 | 16 条 / 2 种 |
| 有箭头限制最短路线 | 8 步 | 12 步 |
| 移除箭头限制后最短路线 | 8 步（不变） | 12 步（不变） |
| 移除箭头限制后可解性 | 仍可解 | 仍可解 |
| 可通关收集顺序数（有→无箭头） | 1 → 4 | 6 → 24 |
| 最近收集物优先是否可解（有/无箭头） | 否 / 是 | 否 / 是 |
| 箭头规则对“通关”是否必要 | 否 | 否 |
| 箭头规则对“设计意图”是否必要 | 是 | 仅约束回头解，不约束自然解 |

### 7.4 技术约束与实际体验的差异

1. 两关的最优路线都是无重复路径，箭头标记被写入但从未被读取；因此箭头规则对“能否通关”和“最短步数”都不是必要条件。
2. 箭头规则的实际作用是排除需要回头的替代解。B1 去掉箭头后，可通关顺序从 1 种增至 4 种，最近优先变为可解，因此 B1 的“先远后近”陷阱依赖箭头规则；B1+ 去掉箭头后，顺序从 6 种增至 24 种，但自然无重复路线在两种情况下都可通关。
3. B1+ 的“两个决策点”在顺序空间中成立：有箭头时首星只能是 `(1,0)` 或 `(3,3)`，最近的 `(2,2)` 首拿不可解。但 `(1,0)` 位于从 S 向左的自然走廊上，玩家沿自然路线行走即可满足首手与第二手约束，不需要意识到 `(2,2)` 是陷阱。
4. 相比之下，B1 的最近星 `(2,2)` 就在 S 正下方，反射性动作即是错误首手，因此玩家必须主动推翻直觉；B1+ 缺少同等强度的显性诱饵。
5. 结论：B1+ 的“仅 6/24 收集顺序可通关”是真实的技术约束，但不是可感知的体验难度。技术统计不能证明玩家进行了策略思考；PT-004 表明自然路线会绕过该约束。

### 7.5 收尾判断

- 保留箭头可见性修复、B1+ 关卡与既有自动化证据，不因 PT-004 回退实验成果。
- B1+ 当前应标记为“技术约束成立、体验目标未达成”的实验结果；不得宣称其已产生“两个决策点”的真人体验。
- 若后续重设计 B1+，需先经 PM 批准；本轮不改规则、不改关卡数据。

## 8. DEV-004-CLOSE 文件与验证

- 收尾新增修改：`docs/playtest-log.md`（PT-004）、`docs/DEV-004-REPORT.md`（本节）、`docs/development-log.md`（收尾记录）。
- 收尾验证：`npm test` 与 `git diff --check` 的结果以提交前检查报告为准；DOC 更新不改变规则或测试数量。
- 未执行 Git Commit、Push 或 Merge；等待批准后再执行本地 Commit。