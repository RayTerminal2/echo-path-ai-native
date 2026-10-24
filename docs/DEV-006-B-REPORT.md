# DEV-006-B｜V1.0 关卡生产工具与首批 10 关

**状态：本地开发完成，等待人工验收**
**分支：`dev/dev-002-gameplay-experiment`**
**基线：`063bd21 DEV-005: archive gameplay experiments and product decision`**
**日期：2026-10-23**
**使用模型：`learnings_campus/deepseek-v4.1-flash`（OpenCode）**

## 1. 结论摘要

- 修复了 `simplePathExists` 在超过 31 格棋盘上的 32 位位掩码溢出，改用 BigInt；V02-07、V02-09 已加入回归测试。
- 求解器现在显式区分 `solved`、`unsolvable`、`aborted`；超限结果不再被当作“不可解”。
- 交付第一批 10 关：7 关复用现有强关卡，3 关新设计（C2-02、C4-02、C5-02）。
- 新增 `?mode=campaign` 最小预览入口；十关可切换、移动、撤销、重开和通关；经典九关与八关实验模式保持不变。
- `npm test`：**38 项通过，0 失败**。
- 浏览器检查使用临时 headless Chrome CDP 脚本：十关 UI 回放、撤销/重开/切关、320/390/768/1100 布局、经典/实验模式回归均通过；**未运行** `python tests/browser_regression.py`，当前 Python 环境未安装 Playwright。
- **未进行真实玩家试玩**。本报告中的策略结论来自规则求解器与设计分析，不代表玩家已经感知到这些策略。

## 2. 求解器修复

### 2.1 改动

- `tests/experiment-analysis.mjs`
  - `simplePathExists` 的已访问格位掩码从 `1 << pos` 改为 `1n << BigInt(pos)`，不再受 32 位限制。
  - `solveFirst`、`solveFrom`、`simplePathExists`、`orderSolvable`、`analyzeWins` 增加 `status`：
    - `solved`：找到解；
    - `unsolvable`：搜索完整结束且无解；
    - `aborted`：达到 `maxStates`，结果未知。
  - 保留原有 `won`、`exists`、`ok`、`aborted` 字段，现有实验测试不需要改写。
- 新增 `orderShortest`、`greedy`：
  - `orderShortest` 返回指定收集顺序下的最短步数；
  - `greedy` 模拟“每步走向最近未收集星，收齐后走向出口”的基线策略，可选择忽略箭头限制作为诊断。

### 2.2 回归证据

- V02-07（6×6）和 V02-09（7×7）的 `simplePathExists` 现在返回 `exists: true, status: 'solved'`。旧实现会因 32 位溢出误判为“不存在无重复路径”。
- V02-03 仍返回 `exists: false, status: 'unsolvable'`，说明修复没有把“确实需要回访”的关卡误判成简单路径。
- `solveFirst(V02-09, {maxStates: 1})` 返回 `status: 'aborted'`，不再被当作不可解。
- 测试名称：`solver status distinguishes solved, unsolvable and aborted`。

## 3. 第一批 10 关

### 3.1 总表

| ID | 来源 | 尺寸/星 | 最短 | 可行顺序 | 无重复解 | 贪心基线 | 主策略 |
|---|---|---|---:|---:|---|---|---|
| C1-01 | V02-01 | 4×4/1 | 5 | 1/1 | 是 | 成功 5 | 基础规则 |
| C1-02 | V02-02 | 4×4/2 | 11 | 2/2 | 否 | 失败@4 | 回程/旧路 |
| C2-01 | V02-03 | 4×4/2 | 16 | 2/2 | 否 | 成功 16 | 回程/旧路 |
| C2-02 | 新 | 5×5/2 | 12 | 1/2 | 否 | 失败@2 | 短回程、路线规划 |
| C3-01 | EXP-B1 | 5×5/3 | 8 | 1/6 | 是 | 失败@5 | 顺序陷阱 |
| C3-02 | EXP-E1 | 5×5/3 | 12 | 1/6 | 是 | 失败@4 | 顺序陷阱、回程 |
| C4-01 | EXP-E2 | 5×5/4 | 16 | 4/24 | 是 | 失败@12 | 多方案取舍、步数优化 |
| C4-02 | 新 | 5×5/3 | 14 | 2/6 | 否 | 成功 16 | 多方案、步数优化 |
| C5-01 | V02-09 | 7×7/5 | 23 | 4/120 | 是 | 失败@7 | 综合锚点 |
| C5-02 | 新 | 6×6/4 | 20 | 4/24 | 是 | 失败@14 | 顺序 + 历史分支 |

“贪心”指每步走向最近未收集星、收齐后走向出口；失败表示该策略在中途已无合法路线。该指标是设计代理，不是玩家行为数据。

### 3.2 新关卡设计说明

#### C2-02「短回程」

```text
...E★
##..#
.★.#.
.#S#.
.....
```

- 起点 `(3,2)`，出口 `(0,3)`，星 `(2,1)`、`(0,4)`。
- 参考路线 12 步，仅 **1 次回访**，不存在无重复通关路线。
- 最近的星 `(2,1)` 是第一手，但直接贪心会在第 2 步后无路；必须先从下方绕到左侧，再经过出口取顶部星，最后回到出口。
- 去掉箭头限制后，同一贪心策略可 8 步通关；说明箭头规则确实在限制“直接回头”，而不是只靠墙制造路线。
- 设计目标：把“回程”压缩成一次短回路，避免 V02-06/EXP-A 那种多次回访被感知为机械绕圈。
- 尚未验证：玩家是否能在不撤销的情况下第一次就看出回程；是否会把“经过出口再返回”理解为设计意图。

#### C4-02「两条回程」

```text
.....
.E..#
#★#.★
.★.#.
S#...
```

- 起点 `(4,0)`，出口 `(1,1)`，星 `(3,1)`、`(2,4)`、`(2,1)`。
- 两条可行路线：
  - 先取 `(3,1)`，再绕右侧取 `(2,4)`，最后回到 `(2,1)` 并停在出口：**14 步**；
  - 先取 `(3,1)`，再直接取 `(2,1)` 并经过出口，最后去 `(2,4)`：**16 步**。
- 自然贪心 16 步，最优 14 步；两条路线都成立，但短路线需要先绕远、后回程。
- 收集 `(3,1)` 后，`(3,2)` 的箭头安排会决定哪条回程可行；该历史分支已由 `findHistoryEffect` 找到。
- 设计目标：让“更短”不是单纯多走几步，而是路线顺序和回程承诺的取舍。
- 尚未验证：2 步差是否足以让玩家主动重玩；是否会被玩家视为“只差一点”而不值得优化。

#### C5-02「双陷阱」

```text
......
★..#..
...S.★
.##.★.
......
E#..★.
```

- 起点 `(2,3)`，出口 `(5,0)`，星 `(1,0)`、`(2,5)`、`(3,4)`、`(5,4)`。
- 最短 20 步，4/24 个可行收集顺序；自然贪心在第 14 步后无路，去掉箭头限制后可 18 步通关。
- 两个可验证冲突：
  1. 两颗最近星中有一颗不能作为第一手；可行第一手只来自 `(1,0)`、`(3,4)`、`(5,4)`。
  2. 收集 `(3,4)` 后，`(4,4)` 的不同箭头历史分别对应可通关/不可通关；已保存两条可复现前缀：
     - `R D D`：可通关；
     - `R D R D L`：不可通关。
- 设计目标：把“顺序”和“历史箭头”放在同一张 6×6 地图里，且自然贪心不能直接绕过。
- 尚未验证：两个冲突是否都能被玩家感知；20 步、4 星是否超出首批玩家的耐心。

### 3.3 复用关卡说明

- C1-01、C1-02、C2-01、C3-01、C3-02、C4-01、C5-01 的地图数据与来源关卡逐格一致；复用关系记录在 `source` 字段。
- C3-02 的 `EXP-E1` 是 1/6 顺序：直接向右拿最近星的短前缀会失败，唯一可行顺序先下行拿 `(2,2)`。该结论来自完整顺序枚举，不是只验证一条前缀。
- C4-01 的 `EXP-E2` 有 4/24 顺序，贪心失败；C5-01 的 `V02-09` 有 4/120 顺序，贪心失败。两者继续作为第 4/5 章锚点。
- 复用关卡没有修改原九关或实验数据文件。

## 4. V1.0 第一批预览

- 入口：`http://127.0.0.1:5173/?mode=campaign`
- 关卡按钮：C1-01 至 C5-02，共 10 个，按五章各两关展示。
- 保留：移动、撤销、重开、通关提示、下一关、试玩统计与复制记录。
- 统计命名空间：`cam:`，与经典模式和实验模式分开。
- 不包含：进度保存、排行榜、章节解锁、完整 50 关 UI、正式难度排序。
- 经典模式（默认）仍为九关；实验模式仍为八关；两者数据与统计未被覆盖。

## 5. 验证结果

### 5.1 Node 测试

```text
npm test
ℹ tests 38
ℹ pass 38
ℹ fail 0
```

新增测试覆盖：
- 十关数据、章节分布、复用来源；
- 十关参考路线在真实引擎通关，并支持撤销/重开；
- 十关最短步数与完整 BFS 一致；
- C2-02 短回程、C3-01/C3-02 最近星陷阱、C4-02 两条路线、C5-02 顺序+历史；
- 新地图旋转/镜像/近似重复检查；
- V02-07/V02-09 的 BigInt 回归与三态求解结果。

### 5.2 浏览器检查

当前 Python 环境未安装 Playwright，**未运行** `python tests/browser_regression.py`。使用临时 headless Chrome CDP 脚本完成以下检查。下列为结果摘录：十关每关各输出“wins through UI”和“wins in N steps”两行 PASS；每个布局视口各输出三行 PASS。

```text
PASS campaign mode loads
PASS campaign has ten levels
PASS campaign shows ten level buttons
PASS campaign starts at C1-01
PASS C1-01 wins through UI
PASS C1-01 wins in 5 steps
...
PASS C5-02 wins through UI
PASS C5-02 wins in 20 steps
PASS campaign undo works
PASS campaign restart works
PASS campaign level button switches
PASS last campaign level hides next button
PASS campaign layout 1100 / 768 / 390 / 320
PASS classic mode still loads (9 levels)
PASS experiment mode still loads (8 levels)
PASS campaign arrow badge remains visible
PASS no page or console errors
PASS campaign browser regression complete
```

布局检查结果：四个视口均无横向溢出，格子宽高差 ≤1 CSS px，十个关卡按钮均可用。该 CDP 脚本位于系统临时目录，未加入仓库，因此不是可重复的仓库内 Playwright 回归。

### 5.3 静态检查

```text
git diff --check
```

无空白错误；仅有 `LF will be replaced by CRLF` 的换行提示。

## 6. 证据边界

- **程序验证**：十关地图格式、参考路线、最短步数、顺序枚举、无重复路径、贪心基线、历史分支、重复布局。
- **设计假设**：C2-02 “短回程更像规划而非绕圈”、C4-02 “2 步差值得优化”、C5-02 “两个冲突都能被感知”。这些尚未由真实玩家验证。
- **未运行**：Python Playwright 回归；真实玩家试玩；320px 以下视口；iOS Safari、Firefox、真实触屏设备。
- **不得宣称**：首批十关已经完成正式难度排序、已经证明趣味性、已经通过完整用户体验验收。

## 7. 风险与遗留

1. **C5-02 分析成本较高**：完整顺序枚举和 `findHistoryEffect` 在测试中约需数秒；后续 50 关批量生产需要更紧凑的状态编码或缓存。
2. **C2-02 可能仍被自然路线绕过**：目前只用贪心基线证明“最近优先”会失败；真人可能选择其他自然路线。
3. **C4-02 的 2 步差可能不够显眼**：需要试玩确认玩家是否愿意为更短路线重玩。
4. **C5-02 的 20 步/4 星可能偏长**：首批玩家体验后可能需要缩短。
5. **C3-02 的复用证据来自单次正面体验**：PT-005 只说明 E1 对一名玩家有趣，不代表首批十关整体成立。
6. **浏览器回归不可重复**：本次 CDP 脚本未入库；后续应补 Playwright 或可复现脚本。
7. **50 关 UI 尚未设计**：当前 campaign 网格只适配 10 关；正式 50 关需要章节选择或分页，不在本任务范围。
8. **未提交**：按要求未执行 Commit/Push/Merge。

## 8. 文件变更

新增：

- `data/levels.campaign.batch1.json`
- `tests/fixtures/verified-paths.campaign.batch1.json`
- `tests/campaign.test.mjs`
- `scripts/analyze-levels.mjs`
- `docs/DEV-006-B-REPORT.md`

修改：

- `tests/experiment-analysis.mjs`（BigInt 与三态求解器）
- `src/app.mjs`（campaign 模式、统计、记录导出）
- `src/render.mjs`（campaign 关卡按钮与章节标签）
- `index.html`（campaign 入口与 5 列关卡网格）
- `scripts/serve.mjs`（campaign 数据白名单）
- `README.md`
- `docs/TEST_PLAN.md`
- `docs/development-log.md`

未修改：

- `src/game-engine.mjs`
- `data/levels.v0.2.json`
- `data/levels.experimental.json`
- `tests/fixtures/verified-paths.v0.2.json`
- `tests/fixtures/verified-paths.experimental.json`
- `legacy/echo-v0.2-original.html`

## 9. 收尾状态

- 未执行 Git Commit、Push、Merge。
- 未开始第二批关卡生产。
- 等待人工验收第一批十关、预览入口和策略证据。