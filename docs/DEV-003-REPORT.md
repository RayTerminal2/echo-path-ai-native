# DEV-003｜顺序解谜深化与棋盘 UI 优化

**状态：本地开发完成，等待人工验收**
**分支：`dev/dev-002-gameplay-experiment`**
**日期：2026-10-23**
**使用模型：`learnings_campus/deepseek-v4.1-flash`（OpenCode）**

## 1. 结论摘要

- 按优先级完成：先修复棋盘显示/变形问题，再取消合法移动提示，最后深化「顺序的陷阱」。
- 移除可移动格子的绿色高亮、边框、圆点和悬停变色；保留点击、键盘、方向按钮和合法移动判定。
- 修复棋盘网格：显式设置行数 `--h`、列数 `--n` 与 `aspect-ratio: var(--n)/var(--h)`，四个视口实测格子宽高差 ≤ 0.015625 CSS px。
- 新增实验 B1「先远后近」与 B2「预留退路」，A/B/C 地图与规则保持不变。
- `npm test`：**24 项通过，0 失败**（原 17 项 + 实验 7 项）。
- 浏览器实测：5 关实验、9 关原版、4 个视口全部通过；未运行 Playwright，未进行真实玩家试玩。

## 2. UI 修改说明

### 2.1 取消合法移动提示

- `src/render.mjs` 不再给可移动格子添加 `reachable` 类；仍保留 `data-dir`、`tabindex="0"` 与 `role="button"`，所以点击相邻格子和键盘 Enter/Space 仍可使用。
- `index.html` 删除 `.cell.reachable`、悬停变色、圆点、`stamped` 背景等样式；历史方向只由格子内的箭头字符表达。
- 图例删除“可移动位置”，保留收集物与出口。
- 开局提示文案从“点击绿色格子”改为“使用方向键 / WASD / 屏幕按钮，或点击相邻格子移动”。
- 焦点可见性保留：`button:focus-visible, .cell:focus-visible` 的描边样式没有移除。

### 2.2 格子变形修复

- 原实现只显式定义列数，行高依赖 auto；在内容、间隙或视口变化时可能出现行列尺寸不稳定。
- 现在 `.board` 同时声明 `grid-template-columns: repeat(var(--n), ...)`、`grid-template-rows: repeat(var(--h), ...)`，并使用 `aspect-ratio: var(--n)/var(--h)`；渲染时写入真实宽高。
- 实测覆盖：原九关 + 五关实验关卡；视口 320×720、390×844、768×1024、1100×800。

实测汇总（每个组合均检查所有格子的 `getBoundingClientRect()`）：

| 视口宽度 | 最大横向滚动宽度 | 最大单格宽高差 | 最大列宽差 | 最大行高差 |
|---:|---:|---:|---:|---:|
| 1100 | 1085 | 0.015625 | 0.015625 | 0.015625 |
| 768 | 768 | 0.015625 | 0.015625 | 0.015625 |
| 390 | 390 | 0.015625 | 0.015625 | 0.015625 |
| 320 | 320 | 0.015625 | 0.015625 | 0.015625 |

所有值均在 1 CSS px 以内，且未出现超过视口宽度 +2px 的横向滚动。

## 3. 新增实验关卡

### B1：「先远后近」

```text
.....
..S#.
..★★#
.★..E
#.#..
```

- 起点：`(1,2)`；出口：`(3,4)`；收集物：`(2,2)`、`(2,3)`、`(3,1)`。
- 参考路线：`L D D R U R D R`（方向数组 `[3,2,2,1,0,1,2,1]`），8 步。
- 可行收集顺序：**仅 `(3,1) → (2,2) → (2,3)`**。
- 设计意图：`(2,2)` 是离起点最近的收集物（曼哈顿距离 1），但以它为先的两种顺序都不可通关；玩家需要先走更远的 `(3,1)`，再回到近处。
- 证据：对三颗收集物的 6 种首次收集顺序逐一完整搜索；只有上述顺序存在通关状态。搜索没有使用启发式剪枝。

### B2：「预留退路」

```text
★★..★
.#...
E#S#.
..#.#
....#
```

- 起点：`(2,2)`；出口：`(2,0)`；收集物：`(0,0)`、`(0,1)`、`(0,4)`。
- 参考路线：`U R R U L L L L D D`（方向数组 `[0,1,1,0,3,3,3,3,2,2]`），10 步。
- 可行收集顺序：**仅 `(0,4) → (0,1) → (0,0)`**。
- 关键格子：`(1,4)`。参考路线到达 `(1,4)` 时没有给它写入箭头，因此可以向上进入 `(0,4)`；如果先从 `(1,4)` 向下走到 `(2,4)` 再回来，`(1,4)` 会永久写入“下”，之后无法向上取 `(0,4)`。
- 证据：在尚无收集物的状态下，同一格子 `(1,4)` 可由多条早期路线到达；其中一些箭头安排仍可通关，另一些不可通关。例如：
  - 路径 `(2,2)→(1,2)→(1,3)→(1,4)`：仍可通关。
  - 路径 `(2,2)→(1,2)→(1,3)→(1,4)→(2,4)→(1,4)`：同一位置、同一收集进度，但不可通关。
- 这验证“前期移动决策会影响后续可达性”，不是单纯增加步数。

## 4. 自动化与浏览器验证

### 已执行

```text
npm test
ℹ tests 24
ℹ pass 24
ℹ fail 0
```

新增/更新测试：

- 五关实验数据格式、参考路线实际通关、撤销/重开。
- A：不存在无重复格子的通关路线。
- B：6 种收集顺序仅 1 种可通关。
- C：参考路线与枚举通关状态均显示多路口与回访。
- B1：最近收集物优先的所有顺序均不可通关，唯一可行顺序以更远收集物开始。
- B2：唯一收集顺序成立；`(1,4)` 在收集前存在“可通关/不可通关”的箭头安排分叉。

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
PASS experiment stats remain isolated
PASS default nine levels replay
PASS no page/console errors
```

### 未运行

- `python tests/browser_regression.py`：**未运行**，当前 Python 环境未安装 Playwright。
- 真实玩家试玩：**未运行**。B1/B2 的可玩性、趣味性和“是否值得继续深化”仍需人工体验判断。

## 5. 文件变更（本分支当前）

```text
M  README.md
M  docs/development-log.md
M  docs/playtest-log.md
M  index.html
M  scripts/serve.mjs
M  src/app.mjs
M  src/render.mjs
A  data/levels.experimental.json
A  docs/DEV-002-REPORT.md
A  docs/DEV-003-REPORT.md
A  tests/experiment-analysis.mjs
A  tests/experiment.test.mjs
A  tests/fixtures/verified-paths.experimental.json
```

未修改 `data/levels.v0.2.json`、`tests/fixtures/verified-paths.v0.2.json`、`legacy/echo-v0.2-original.html` 或 `src/game-engine.mjs`。

## 6. 风险与待确认

- 取消移动提示后，首次理解成本可能上升；需要人工体验确认是否更符合预期。
- B1 的“最近先拿是陷阱”由求解器证明，但玩家是否会真的被吸引，需要试玩观察。
- B2 的关键格子 `(1,4)` 证据充分，但“预留退路”的教学效果未验证。
- 布局实测使用 headless Chrome；未覆盖真实手机、iOS Safari、Firefox 或高刷新率/缩放组合。
- 自动化通关不代表玩家体验；本任务没有记录任何真人通关时间或主观评价。
- 未执行 Git Commit、Push 或 Merge，等待人工体验验收。