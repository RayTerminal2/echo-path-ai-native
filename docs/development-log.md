# 开发日志 / Development Log

本文件按任务编号记录真实发生的开发工作。没有证据的历史信息标记为“待补充”，不得补写或编造。

## 记录规范

每条记录至少包含：

- **任务编号**：与任务单/PM 指令一致
- **需求目标**：本任务要解决的问题与边界
- **使用模型**：实际执行任务的模型或工具标识
- **实现概要**：做了什么、为什么这样做
- **修改文件**：真实变更的文件清单
- **验证结果**：实际执行的命令与真实输出/结论；未运行的测试单独标注
- **遗留问题**：尚未验证的风险、待 PM 决策事项
- **Commit ID**：真实提交哈希；未提交或未授权提交时明确写明

---

## MIG-002｜项目操作验证与轻量开发规范建立

- **日期**：2026-10-22
- **需求目标**：验证 OpenCode 对项目结构、文档与 Git 状态的操作能力；在现有约定基础上补充开发规范；建立开发日志与试玩日志模板，且不修改游戏核心代码。
- **使用模型**：`learnings_campus/deepseek-v4.1-flash`（OpenCode）
- **实现概要**：
  1. 读取项目根目录、`README.md`、`package.json`、`AGENTS.md` 及 `docs/` 现有文档，确认技术栈为原生 HTML/CSS/JS + Node.js 内置测试。
  2. 执行 `git status` 与 `git log --oneline -10`，确认工作树干净、当前分支 `main` 与远程同步。
  3. 保留 `AGENTS.md` 原有规则，补充“游戏完整性与体验优先级”“任务、范围与验证”“Git、密钥与外部配置”三节。
  4. 新建本开发日志与 `docs/playtest-log.md`；历史任务信息只记录有文档证据的内容。
  5. 执行 `npm test` 复核现有基线测试。
- **修改文件**：
  - `AGENTS.md`（补充规范）
  - `docs/development-log.md`（新建）
  - `docs/playtest-log.md`（新建）
- **验证结果**：
  - 已执行 `npm test`：3 个测试全部通过，0 失败（冻结基线 SHA256、关卡数据一致性、九关参考路线校验）。
  - 已执行 `git diff --check`：退出码 0；仅有 `AGENTS.md` 与 `docs/DEV-001.md` 的 LF→CRLF 换行提示，无空白或格式错误。
  - 已读取项目结构、README、技术栈与现有规范，未发现与任务要求直接冲突的规则。
  - 未运行 `python tests/browser_regression.py` 与 `python tests/browser_baseline.py`：本任务未涉及游戏代码改动，且浏览器测试需额外 Playwright 环境；结果标记为**未运行**。
  - 未进行九关浏览器手动复核：本任务仅修改/新增文档，未改动游戏行为；结果标记为**未运行**。
- **遗留问题**：
  - `docs/DEV-001.md` 标记为“待核实”；仓库中未发现 `src/game-engine.mjs` 或对应规则测试，完成情况待后续任务确认。
  - 浏览器回归与真实试玩数据尚缺，不能据此宣称玩法体验结论。
  - 本任务未获得 `git commit`/`git push` 授权，变更仅保留在工作树中。
- **Commit ID**：待补充（本任务未提交；未获准 commit）
- **基线参考**：当前 `git log` 最新提交为 `93c06c8 chore: import Echo Path V0.2 baseline`。

---

## DEV-002｜策略差异化关卡实验

- **日期**：2026-10-23
- **分支**：`dev/dev-002-gameplay-experiment`（未提交）
- **需求目标**：在不改变核心规则和 V0.2 九关的前提下，新增三关可游玩的实验关卡，分别验证必经旧路、收集顺序陷阱和多路口规划，并补充可核对的求解证据。
- **使用模型**：`learnings_campus/deepseek-v4.1-flash`（OpenCode）
- **实现概要**：
  1. 设计并求解三关 5×5 实验地图，保存到 `data/levels.experimental.json`；每关 2–4 个收集物，均通过实际规则模块通关。
  2. 保存三关参考方向序列到 `tests/fixtures/verified-paths.experimental.json`。
  3. 在 `src/app.mjs` 增加 `?mode=experiment`，只加载对应数据源；实验统计使用 `exp:` 前缀，试玩记录标明模式；默认九关行为保持。
  4. 在 `src/render.mjs` 增加实验标题与 A/B/C 关卡按钮；不改变原九关渲染逻辑。
  5. `index.html` 增加实验模式入口和 3 列实验关卡样式；`scripts/serve.mjs` 白名单增加实验 JSON。
  6. 新增 `tests/experiment-analysis.mjs` 与 `tests/experiment.test.mjs`，直接使用实际规则模块验证通关、回访、顺序和交汇约束。
- **修改文件**：
  - `README.md`（实验模式、测试与目录说明）
  - `index.html`（实验入口、提示元素、实验关卡栅格样式）
  - `scripts/serve.mjs`（实验数据白名单）
  - `src/app.mjs`（模式加载、统计命名空间、导出、模式链接）
  - `src/render.mjs`（实验/默认渲染分支）
  - `data/levels.experimental.json`（新建）
  - `tests/fixtures/verified-paths.experimental.json`（新建）
  - `tests/experiment-analysis.mjs`（新建）
  - `tests/experiment.test.mjs`（新建）
  - `docs/DEV-002-REPORT.md`（新建）
  - `docs/development-log.md`（本记录）
- **验证结果**：
  - 已执行 `npm test`：**22 项通过，0 失败**；原有 17 项全部通过，新增 5 项通过。
  - 已用临时 CDP 脚本在 Node.js v24.14.0 + headless Chrome 155.0.8059.85 中实际点击游玩三关，验证移动、撤销、重开、切关、复制记录、模式切换和 390px 移动端布局；同时回放原九关，均通过，未发现页面/控制台错误。
  - **未运行** `python tests/browser_regression.py`：当前 Python 环境未安装 Playwright（`ModuleNotFoundError`）。
  - **未运行**真实玩家试玩；没有留存、趣味性或难度结论。
- **遗留问题**：
  - 尚无真实玩家反馈，A/C 的“有意义回访”和“多路口体验”仍需人工试玩确认。
  - C 的路口指标是结构指标，不是完整的“所有路径最少路口数”证明。
  - 浏览器检查使用临时 CDP 工具，未纳入仓库；仓库现有 Playwright 回归未运行。
- **Commit ID**：待补充（本任务按要求未执行 commit/push，等待验收授权）。

---

## DEV-003｜顺序解谜深化与棋盘 UI 优化

- **日期**：2026-10-23
- **分支**：`dev/dev-002-gameplay-experiment`（未提交）
- **需求目标**：按“显示缺陷修复 > 交互视觉简化 > 顺序玩法探索”的优先级，取消可移动位置提示、修复棋盘格子变形，并新增 B1/B2 两个顺序类实验关卡。
- **使用模型**：`learnings_campus/deepseek-v4.1-flash`（OpenCode）
- **实现概要**：
  1. `src/render.mjs` 不再输出 `reachable`/`stamped` 视觉类；保留 `data-dir`、焦点和合法移动判定。历史方向仅由箭头字符表达。
  2. `index.html` 删除绿色可移动提示、悬停变色、圆点和“可移动位置”图例；棋盘显式设置 `--n`/`--h`、行模板与 `aspect-ratio: var(--n)/var(--h)`，保证格子为正方形。
  3. 新增实验 B1「先远后近」与 B2「预留退路」；A/B/C 地图与规则保持不变。
  4. 扩展 `tests/experiment-analysis.mjs`，用实际规则模块验证 B1 顺序陷阱和 B2 早期箭头分叉；新增对应测试。
  5. 更新 README、试玩日志和 DEV-003 报告。
- **修改文件（DEV-003 增量）**：
  - `index.html`（移除提示样式、修复网格、更新图例）
  - `src/render.mjs`（去掉视觉提示类、写入行数）
  - `src/app.mjs`（提示文案、实验模式说明更新）
  - `data/levels.experimental.json`（追加 B1/B2）
  - `tests/fixtures/verified-paths.experimental.json`（追加 B1/B2 参考路线）
  - `tests/experiment-analysis.mjs`（新增历史箭头分叉分析）
  - `tests/experiment.test.mjs`（五关与 B1/B2 证据）
  - `README.md`（实验关卡数量、测试数量、DEV-003 报告入口）
  - `docs/playtest-log.md`（记录 DEV-003 任务单中的真实用户反馈）
  - `docs/DEV-003-REPORT.md`（新建）
  - `docs/development-log.md`（本记录）
- **验证结果**：
  - 已执行 `npm test`：**24 项通过，0 失败**；原有 17 项全部通过，实验相关测试为 7 项。
  - 已用临时 CDP 脚本在 headless Chrome 155 中检查 320/390/768/1100 四个视口，覆盖原九关与五关实验关卡；最大格子宽高差 0.015625 CSS px，最大滚动宽度不超过视口宽度 +2px。
  - 已在浏览器实际回放五关实验路线与九关原版路线，验证移动、撤销、重开、切关、复制记录和统计隔离；无页面/控制台错误。
  - **未运行** `python tests/browser_regression.py`：当前 Python 环境未安装 Playwright。
  - **未运行**真实玩家试玩；没有趣味性、难度或留存结论。
- **遗留问题**：
  - B1/B2 的求解证据充分，但“陷阱是否有吸引力”“预留退路是否易懂”需要人工试玩确认。
  - 取消移动提示可能提高首次理解成本，需要人工体验确认。
  - 布局验证仅覆盖 headless Chrome；未覆盖真实手机、iOS Safari、Firefox 或缩放组合。
- **Commit ID**：待补充（本任务按要求未执行 commit/push，等待验收授权）。

---

## 历史记录占位

- DEV-001：任务单存在（`docs/DEV-001.md`），截至本记录标记为待核实；完成情况**待补充**。
- 更早版本（V0.2 基线导入）：仅有 `93c06c8` 提交与 `docs/SOURCE_PROVENANCE.md` 可作证据；详细开发过程**待补充**。