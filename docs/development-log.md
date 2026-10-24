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
- **Commit ID**：`f766a8d feat: add gameplay experiments and UI refinements`

---

## DEV-004｜箭头可见性修复与 B1 进阶实验

- **日期**：2026-10-23
- **分支**：`dev/dev-002-gameplay-experiment`（未提交）
- **基线**：`f766a8d feat: add gameplay experiments and UI refinements`；开工前工作树干净，已把 DEV-003 的 Commit ID 更新为 `f766a8d`。
- **需求目标**：修复 PT-003 的“角色遮挡箭头”问题；新增基于「先远后近」的进阶关卡，要求至少两个有意义决策点。
- **使用模型**：`learnings_campus/deepseek-v4.1-flash`（OpenCode）
- **实现概要**：
  1. `src/render.mjs` 在角色位于已写入箭头的格子时追加上层 `.player-arrow` 角标；`index.html` 增加角标样式，不恢复合法移动提示。
  2. 新增实验 B1+「先远后近·进阶」：4 个收集物、6 条可通关收集顺序，最近收集物先拿全部失败；第一手与第二手均存在约束。
  3. 扩展 `tests/experiment.test.mjs` 与 `tests/fixtures/verified-paths.experimental.json`，验证 B1+ 的顺序约束与早期箭头分叉。
  4. 使用 `git archive f766a8d` 生成修复前基线截图，再对当前实现生成修复后截图；截图保存在 `docs/screenshots/`。
- **修改文件（DEV-004 增量）**：
  - `README.md`
  - `index.html`（`.player-arrow` 样式、实验关卡 6 列）
  - `src/render.mjs`（角色上层方向角标）
  - `src/app.mjs`（实验模式文案更新为六关）
  - `data/levels.experimental.json`（追加 B1+）
  - `tests/fixtures/verified-paths.experimental.json`（追加 B1+ 参考路线）
  - `tests/experiment.test.mjs`（六关与 B1+ 证据）
  - `docs/development-log.md`（DEV-003 Commit ID 与本记录）
  - `docs/DEV-004-REPORT.md`（新建）
  - `docs/screenshots/dev-004-arrow-*.png`（新建）
- **验证结果**：
  - 已执行 `npm test`：**25 项通过，0 失败**；原有 24 项全部通过，新增 B1+ 测试通过。
  - 已用临时 CDP 脚本在 headless Chrome 155 中检查 320/390/768/1100 四个视口，覆盖原九关与六关实验关卡；最大格子宽高差 0.015625 CSS px，无横向溢出。
  - 已在浏览器实际回放六关实验路线与九关原版路线，验证移动、撤销、重开、切关、复制记录和统计隔离；`.cell.current .player-arrow` 存在且文本为当前格箭头方向。
  - 已生成箭头修复前后截图；当前环境不支持模型直接识别图片内容，视觉结论以截图文件、DOM 断言和测量为准。
  - **未运行** `python tests/browser_regression.py`：当前 Python 环境未安装 Playwright。
  - 已记录 PT-004 单次真实试玩：B1+ 未经策略思考直接通关，且未重复进入任何格子；详见 `docs/playtest-log.md`。
  - 已执行 B1/B1+ 机制审计：两关均存在无重复通关路线；移除箭头后最短步数不变（B1 8 步、B1+ 12 步），可通关收集顺序分别由 1→4、6→24；箭头规则对通关并非必要，B1+ 的技术顺序约束未转化为实际决策压力。详见 `docs/DEV-004-REPORT.md` 第 7 节。
  - 角标可读性仍需更多人工确认；本次 PT-004 未提供该 UI 的明确反馈。
- **遗留问题**：
  - PT-004 表明 B1+ 的“两个决策点”未转化为可感知体验；未经 PM 批准不重设计。
  - 方向角标是否干扰出口/收集物辨识需要人工确认。
  - 布局验证未覆盖真实手机、iOS Safari、Firefox 或系统缩放。
- **DEV-004-CLOSE 收尾（2026-10-23）**：
  - 新增/更新 `docs/playtest-log.md`（PT-004）、`docs/DEV-004-REPORT.md`（第 7 节审计与收尾）、`docs/development-log.md`（本记录）。
  - 未修改规则模块、关卡数据、箭头 UI 修复或既有实验成果。
  - 已执行 `npm test`：**25 项通过，0 失败**。
  - 已执行 `git diff --check`：无空白错误；仅有 LF→CRLF 提示。
  - 未执行 Push 或 Merge；本地 Commit 等待批准。
- **Commit ID**：待补充（已获批准后再执行本地 Commit）。

---

## DEV-005-B｜E1/E2 核心玩法验证原型

- **日期**：2026-10-23
- **分支**：`dev/dev-002-gameplay-experiment`（未提交）
- **基线**：`25f686e DEV-004: close arrow visibility fix and B1/B1+ audit`；开工前工作树干净。
- **需求目标**：按 DEV-005-P 已评审地图实现 E1「诱人的近路」、E2「取舍的时机」，接入实验模式并提供规则与浏览器验证，不修改核心规则。
- **使用模型**：`learnings_campus/deepseek-v4.1-flash`（OpenCode）
- **实现概要**：
  1. `data/levels.experimental.json` 追加 E1/E2，实验模式扩展为 8 关；既有 A–C、B1/B2/B1+ 数据未改。
  2. `tests/fixtures/verified-paths.experimental.json` 追加 E1 12 步、E2 16 步参考路线。
  3. `tests/experiment-analysis.mjs` 新增 `solveFrom`，支持从任意真实引擎状态继续求解，并可仅移除历史箭头限制。
  4. `tests/experiment.test.mjs` 扩展为 8 关校验，新增 E1 近星陷阱、E2 错误路口、E2 重新进入旧箭头格但必须遵守离开方向的测试。
  5. `src/app.mjs` 更新实验模式文案为八关；`index.html` 实验关卡按钮网格由 6 列改为 8 列；不展示正确路线或关键决策提示。
  6. 保留箭头角标、撤销、重开、切关与试玩记录功能。
- **修改文件（DEV-005-B 增量）**：
  - `data/levels.experimental.json`
  - `tests/fixtures/verified-paths.experimental.json`
  - `tests/experiment-analysis.mjs`
  - `tests/experiment.test.mjs`
  - `src/app.mjs`
  - `index.html`
  - `README.md`
  - `docs/DEV-005-B-REPORT.md`（新建）
  - `docs/development-log.md`（本记录）
- **验证结果**：
  - 已执行 `npm test`：**28 项通过，0 失败**；原 25 项无退化，新增 3 项 E1/E2 规则测试。
  - 已用临时 headless Chrome CDP 脚本验证 8 关加载、E1 12 步通关、E2 16 步通关、撤销/重开/切关、键盘与屏幕按钮、E2 当前格箭头角标、320/390/768/1100 布局，以及原九关 9 条参考路线回放；无页面/控制台错误。
  - 320/390/768/1100 均无横向溢出；格子最大宽高差 0.015625 CSS px；实验关卡按钮为 8 个同排显示，320px 下最小宽度约 30px。
  - **未运行** `python tests/browser_regression.py`：当前 Python 环境未安装 Playwright；临时 CDP 脚本未加入仓库。
  - 已记录 PT-005 单次真实体验：E1 有趣、有策略感；E2 有思考但整体乐趣一般，首次 20 步通关后因 16 步目标产生优化欲望；玩家认为整体仍不够好。详见 `docs/playtest-log.md`。
- **DEV-005-CLOSE 收尾（2026-10-23）**：
  - 新增/更新 `docs/playtest-log.md`（PT-005）、`docs/DECISIONS.md`（2026-10-23 产品决策）、`docs/DEV-005-B-REPORT.md`（第 7 节）、`docs/development-log.md`（本记录）。
  - 产品决策：DEV-005 工程实验完成，但玩法尚未充分证明可持续产生高质量解谜体验；保留历史方向箭头规则，优先吸收 B1、E1 的收集顺序策略，保留最短步数挑战；不再无期限进行小规模机制探索；先开发至少 50 关、具有合理难度递进的完整 H5 参赛候选作品。不得宣称已通过完整用户体验验证。
  - 已执行 `npm test`：**28 项通过，0 失败**；`git diff --check` 通过。
  - 未执行 Push、Merge、Force Push；本次仅执行一次本地归档 Commit。
- **遗留问题**：
  - PT-005 为单人单次体验；E2 的整体乐趣一般，当前玩法尚未充分证明可持续产生高质量解谜体验。
  - E1 若玩家首次直接向下，可能绕过近星陷阱；近星显眼程度需人工确认。
  - E2 存在 `(1,4)` 等额外箭头陷阱，可能掩盖 `(3,3)` 的目标决策；后续关卡设计需借鉴并验证。
  - 8 个实验按钮在 320px 下较窄，视觉可读性与点击手感需人工验收；UI 人工验收尚未确认。
  - 布局验证仅覆盖 headless Chrome，未覆盖真实手机、iOS Safari、Firefox 或系统缩放。
- **Commit ID**：`063bd21 DEV-005: archive gameplay experiments and product decision`（结项核对时确认）。

---

## DEV-006-B｜V1.0 关卡生产工具与首批 10 关

- **日期**：2026-10-23
- **分支**：`dev/dev-002-gameplay-experiment`（未提交）
- **基线**：`063bd21 DEV-005: archive gameplay experiments and product decision`
- **需求目标**：修复关卡分析工具的 32 位位掩码问题，建立可区分“可解/不可解/超限”的求解结果；交付五章各两关的第一批 10 关；提供最小 `?mode=campaign` 预览；不修改核心规则、不覆盖历史数据、不生产 50 关。
- **使用模型**：`learnings_campus/deepseek-v4.1-flash`（OpenCode）
- **实现概要**：
  1. `tests/experiment-analysis.mjs` 使用 BigInt 修复 `simplePathExists`；为 `solveFirst`、`solveFrom`、`simplePathExists`、`orderSolvable`、`analyzeWins` 增加 `solved/unsolvable/aborted` 状态；新增 `orderShortest` 与贪心基线。
  2. 新增 `data/levels.campaign.batch1.json` 与 `tests/fixtures/verified-paths.campaign.batch1.json`：10 关，7 关复用 V02-01/V02-02/V02-03/V02-09/EXP-B1/EXP-E1/EXP-E2，3 关新设计 C2-02/C4-02/C5-02。
  3. 新增 `tests/campaign.test.mjs`：数据、参考路线、最短步数、策略证据、去重、BigInt 回归与三态求解测试。
  4. 新增 `scripts/analyze-levels.mjs`：输出最短步数、顺序、无重复路径、贪心、历史分支和布局相似度。
  5. `src/app.mjs`、`src/render.mjs`、`index.html`、`scripts/serve.mjs` 接入最小 campaign 模式；经典与实验模式保持独立。
- **新关卡设计**：
  - C2-02「短回程」：5×5、2 星、12 步、1 次回访、无重复解；贪心失败@2，去掉箭头后可 8 步通关。
  - C4-02「两条回程」：5×5、3 星、两条可行路线 14/16 步；贪心 16 步，最优 14 步。
  - C5-02「双陷阱」：6×6、4 星、20 步、4/24 顺序；最近星中有陷阱；`(4,4)` 存在可通关/不可通关历史分支；贪心失败@14。
- **修改文件**：
  - `README.md`
  - `index.html`
  - `scripts/serve.mjs`
  - `scripts/analyze-levels.mjs`（新建）
  - `src/app.mjs`
  - `src/render.mjs`
  - `tests/experiment-analysis.mjs`
  - `tests/campaign.test.mjs`（新建）
  - `data/levels.campaign.batch1.json`（新建）
  - `tests/fixtures/verified-paths.campaign.batch1.json`（新建）
  - `docs/DEV-006-B-REPORT.md`（新建）
  - `docs/TEST_PLAN.md`
  - `docs/development-log.md`（本记录）
- **验证结果**：
  - 已执行 `npm test`：**38 项通过，0 失败**；原有 28 项无退化。
  - 已执行 `node scripts/analyze-levels.mjs`：十关最短步数与 `optimal` 一致；输出顺序、简单路径、贪心、历史分支与重复布局。
  - 已执行临时 headless Chrome CDP 脚本：十关 UI 回放、撤销/重开/切关、320/390/768/1100 布局、经典九关与实验八关回归均通过；无页面/控制台错误。
  - **未运行** `python tests/browser_regression.py`：当前 Python 环境未安装 Playwright。
  - 已执行 `git diff --check`：无空白错误，仅有 LF→CRLF 提示。
  - **未进行**真实玩家试玩；C2-02 的“规划感”、C4-02 的“2 步优化动机”、C5-02 的“双冲突可感知”仍为设计假设。
- **遗留问题**：
  - C5-02 的完整顺序/历史分析在测试中约需数秒；后续批量生产需要优化状态编码或缓存。
  - C2-02、C4-02、C5-02 均未经过真人试玩，不能宣称难度或趣味性已验证。
  - 浏览器 CDP 脚本未入库；后续需要可复现的 Playwright 或仓库内脚本。
  - 50 关的章节选择/分页 UI 未开发；当前 campaign 网格只适配首批 10 关。
- **Commit ID**：`1b13d15 release: prepare Echo Path V1.0 public playtest`（结项核对时确认，与 DEV-007/DEV-008 同批提交）

---

## DEV-007｜步数挑战正式化与 50 关扩展（跨会话恢复）

- **日期**：2026-10-23
- **分支**：`dev/dev-002-gameplay-experiment`（未提交）
- **基线**：`063bd21 DEV-005` + DEV-006-B 未提交工作区
- **需求目标**：归档 PT-006 反馈与冲刺决策；把步数/最优/个人最佳/localStorage/通关后再挑战做成正式功能；正式关卡扩展至 50 关（五章各十关）；完成章节分页 UI 与移动端适配；保留经典与实验模式。
- **使用模型**：`learnings_campus/qwen3.8-flash`（OpenCode，第二会话；第一会话上下文超限中断）
- **跨会话恢复**：上一会话已完成 PT-006 归档（`docs/playtest-log.md`、`docs/DECISIONS.md`）、步数系统（`src/app.mjs`、`src/render.mjs`、`index.html`）和生成器 `scripts/generate-campaign-v1.mjs`，并在系统临时目录留下了第一至第四章的生成产物。本会话未重新生成或覆盖这些数据，直接复用 `gen-c1-8/c2-8/c3-8/c4-8.json`，仅补生成第五章（V1_SEED=1370000，355 次尝试）。
- **实现概要**：
  1. 新增 `scripts/merge-campaign-50.mjs`：合并第一批十关与四十生成关，逐关做真实引擎回放（含撤销/重开）、完整 BFS（`maxStates=2_000_000`，必须 `solved`，`aborted` 视为失败）、声明式复用之外的精确去重与汉明距离检查；产出 `data/levels.campaign.json` 与 `tests/fixtures/verified-paths.campaign.json`。
  2. 新增 `tests/campaign-50.test.mjs`（6 项）：五十关结构、fixtures 一致性、逐关引擎回放与撤销/重开、逐关完整 BFS 最优验证、生成关槽位证据、去重。
  3. campaign 模式切换为加载 50 关数据；`src/render.mjs` 新增章节标签页（含每章通关计数）与按章过滤的关卡网格；`src/app.mjs` 增加 `chapterView` 状态与标签页事件；`index.html` 增加 `#chapterTabs` 与样式；`scripts/serve.mjs` 白名单加入 `levels.campaign.json`。
  4. 文案从“第一批原型”更新为“V1.0 正式50关”；重开提示明确个人最佳保留；记录导出改名 `方向回声_V1正式50关_试玩记录.txt`。
  5. 步数系统（上一会话已实现，本会话验证）：当前步数/最优步数/个人最佳常驻显示；localStorage `echoPath.best.v1` 按 `campaign:<id>` 存最佳，仅通关后刷新；通关提示含“追平最优/距离最优 N 步/已刷新/未刷新可再挑战”。
- **验证结果**：
  - 已执行 `node scripts/merge-campaign-50.mjs`：五十关全部引擎回放通关且步数与 `optimal` 一致；完整 BFS 全部 `solved` 且与 `optimal` 一致；除 7 个声明式复用外无重复；1 条汉明 7 警告（C3-04 与 C1-07），无 <6。
  - 已执行 `npm test`：**44 项通过，0 失败**（原 38 项无退化）。
  - 已执行临时 headless Chrome CDP 脚本（`campaign50-cdp.mjs`，位于系统临时目录，未入库）：五十关逐关 UI 最优通关、章节标签页切换/计数（3 章 10/10）、localStorage 个人最佳持久化与重载保留、同分重玩显示“未刷新纪录，重开可再挑战”、撤销/重开、末关隐藏下一关、320/390/768/1100 无横向溢出且布局保持方形、经典九关与实验八关回归、标签页在经典/实验模式隐藏、箭头角标可见、无页面/控制台错误。
  - **未运行** `python tests/browser_regression.py`：当前环境未安装 Playwright。
  - **未进行**新的真实玩家试玩；50 关难度递进与趣味性待统一人工验收。
- **遗留问题**：见 `docs/DEV-007-HANDOFF.md`。
- **Commit ID**：`1b13d15 release: prepare Echo Path V1.0 public playtest`（结项核对时确认）

---

## DEV-008｜V1.0 发布准备与静态发布包

- **日期**：2026-10-23
- **分支**：`dev/dev-002-gameplay-experiment`（未提交）
- **基线**：`063bd21 DEV-005` + DEV-006-B/DEV-007 未提交工作区成果（全部保留，未 reset/clean/覆盖）
- **需求目标**：整理可公开分享的自包含静态发布目录，提供可重复打包方法，完成发布前回归与敏感信息检查，复核 C1-07/C3-04 相似性；不新增关卡/机制，不擅自改视觉与玩法，不部署、不提交。
- **使用模型**：`learnings_campus/qwen3.8-flash`（OpenCode）
- **实现概要**：
  1. 新增 `scripts/build-dist.mjs` + `npm run build`：按运行时白名单（index.html、三个 src/*.mjs、三个 data/levels.*.json）生成 `dist/`，内置关卡计数校验、敏感模式扫描（命中即中止并清除产物）、白名单外文件检测、`manifest.json`（SHA-256）。
  2. `dist/` 已在 `.gitignore`，不进入版本库；未修改 `src/`，本地 `npm run dev` 行为不变。
  3. 报告 `docs/DEV-008-REPORT.md`：发布文件检查、独立静态回归、相似性复核与人工部署步骤。
- **验证结果**：
  - 已执行 `npm run build`：7 文件通过，敏感扫描 clean，manifest 生成。
  - 已执行 `npm test`：**44 项通过，0 失败**（无退化）。
  - 已执行源码/关卡/dist 凭据扫描：无命中；仓库无 `.env`。
  - 已执行 `git diff --check`：无空白错误（仅 LF→CRLF 提示）。
  - 已在**独立静态服务器**（临时 node，127.0.0.1:5200，非开发服务器）+ headless Chrome CDP（临时脚本 `dist-cdp.mjs`，未入库）回归：五十关逐关 UI 最优通关、五章标签与计数、切关/撤销/重开/末关隐藏下一关、localStorage 个人最佳 50 条写入且重载保留、320/390/768/1100 无溢出且控件可用、全部 src/data 资产 200、经典九关与实验八关正常、开发专属文件 404（确未混入）、无非预期 4xx/5xx、无控制台错误。
  - **未运行** `python tests/browser_regression.py`（无 Playwright）；**未进行**新的真实玩家试玩；未在真实手机浏览器/iOS Safari 验证；**未部署**。
- **C1-07 / C3-04 复核结论**：仅地图外观接近（同 5×5、同起点、共一颗星，汉明 7），玩法维度完全不同（无墙开放双顺序教学题 vs 有墙唯一顺序陷阱题；星数、出口、墙、决策类型均不同），相隔 17 个关卡位次。**建议发布前不调整**，仅记录，未改动关卡。
- **遗留问题**：浏览器自动请求 `/favicon.ico` 返回 404（页面不引用图标，良性）；公开分享建议链接 `/?mode=campaign`；是否改默认落地模式为产品决策，未擅自变更。
- **Commit ID**：`1b13d15 release: prepare Echo Path V1.0 public playtest`（结项核对时确认）

---

## DEV-008-RELEASE｜V1.0 发布定版与本地提交

- **日期**：2026-10-23
- **分支**：`dev/dev-002-gameplay-experiment`
- **需求目标**：PM 批准 V1.0 公测发布后：无 `mode` 参数默认进入 50 关战役；保留 `?mode=campaign` 与 `?mode=experiment`；经典九关明确入口 `?mode=classic`；重新构建与独立静态回归；核对清单后执行一次本地提交。favicon 404 暂不处理；不 Push/Merge。
- **使用模型**：`learnings_campus/qwen3.8-flash`（OpenCode）
- **实现概要**（仅模式路由，未重构 UI 或规则）：
  1. `src/app.mjs`：新增 `CLASSIC=params.get('mode')==='classic'`；`CAMPAIGN=!EXPERIMENT&&!CLASSIC`（默认即战役）；三种模式各自的头部链接改为指向另外两种模式（`?mode=campaign`/`?mode=experiment`/`?mode=classic`），移除所有指向 `./` 的回跳（否则会重载战役页）。
  2. `index.html`：静态默认与 `<title>` 对齐新落地页（战役）；角标“玩法未定稿”→“V1.0 公测版”；`#campaignLink` 静态默认改为“经典九关 →”。九关/实验数据、规则、章节标签逻辑未动。
  3. 文档同步：README 状态与入口说明、`docs/DEV-008-REPORT.md` 增补“发布定版”一节与部署步骤。
- **验证结果**：
  - 已执行 `npm test`：**44 项通过，0 失败**。
  - 已执行 `npm run build`：`dist ready: 7 files, secret scan clean`；白名单核验 `dist/` 仅含 7 个运行时文件 + `manifest.json`。
  - 已在独立静态服务器（127.0.0.1:5200，非开发服务器）+ headless Chrome CDP（临时脚本 `release-routing-cdp.mjs`，未入库）回归，34 项全 PASS：`/` 默认加载五十关且起点 C1-01、五章标签页可见；`?mode=campaign/experiment/classic` 各自 50/8/9 关正确加载，经典默认开第4关、章节标签页仅战役显示；三页头部链接均正确指向另外两模式，从 `/` 点击“经典九关”可达经典；经 `/` 入口五十关逐关最优通关；步数/最优/个人最佳显示、localStorage 写入与重载保留、通关反馈、撤销/重开正常；320/390/768/1100 无溢出、控件可用；全部资产 200，开发专属文件 404，无非预期 4xx/5xx，无页面/控制台错误。
  - 已执行 `git diff --check`：无空白错误（仅 LF→CRLF 提示）。
  - 敏感复核：新增改动仅路由与文案，无凭据、无个人配置、无临时文件进入提交清单；`.env` 类文件不存在；`dist/`、生成临时 JSON 均在仓库外或被 `.gitignore` 排除。
  - **未运行** `python tests/browser_regression.py`（无 Playwright）；**未部署**。
- **Commit ID**：`1b13d15 release: prepare Echo Path V1.0 public playtest`（结项核对时确认；已获 PM 批准执行本地 Commit，未 Push/Merge）

---

## ECHO-CLOSE｜最终结项归档

- **日期**：2026-10-24
- **分支 / 基线**：`dev/dev-002-gameplay-experiment`；开工前 HEAD `1b13d15 release: prepare Echo Path V1.0 public playtest`，工作树干净、无未跟踪文件。
- **需求目标**：在停止主动开发的前提下完成最终结项：核实项目现状；记录真实产品复盘；同步产品决策与开发日志；执行测试、构建、空白与敏感信息检查；在全部通过后执行一次本地归档 Commit。不新增玩法、不改 UI/默认首页、不 Push/Merge/部署。
- **使用模型**：`learnings_campus/deepseek-v4.1-flash`（OpenCode）
- **现状核实（实际执行）**：
  1. `git status`：工作树干净；`git status --porcelain --untracked-files=all` 无输出；`git stash list` 为空。
  2. `git log --all --oneline --decorate`：当前分支仅本地；远程存在 `origin/main` 与 `origin/dev/dev-001-refactor`，本分支未 Push。
  3. **DEV-006-B、DEV-007、DEV-008 均已提交**：三者与 DEV-008-RELEASE 一并包含在 `1b13d15`；本记录同时把此前“待补充”的 Commit ID 更正为该提交。
  4. **DEV-008-RELEASE 已实际执行**：`src/app.mjs` 中 `CAMPAIGN=!EXPERIMENT&&!CLASSIC`，无 `mode` 参数默认进入 50 关；`dist/` 已存在（7 个运行时文件 + `manifest.json`，被 `.gitignore` 排除）。未部署。
  5. 未执行 reset / clean / checkout / 覆盖；所有历史数据、实验记录和参考关卡保留。
- **实现概要**：
  1. 新建 `docs/PROJECT-RETROSPECTIVE.md`：记录项目目标、玩法假设、实验与真实反馈、50 关工程与测试、失败判断、核心失败原因、步数优化矛盾、AI 协作经验和最终决策；明确区分已验证结果、单人主观反馈与产品分析。
  2. `docs/DECISIONS.md` 增加“2026-10-24 · 最终结项决策”：停止主动开发、归档保留、不 Push/Merge、转向新创意；并记录“35/50 关存在无重复通关路线、27/50 关参考最优路线零回访、24/50 关移除箭头后最优步数不变”的分析结论及其边界。
  3. 本记录追加 ECHO-CLOSE；更正 DEV-005-B、DEV-006-B、DEV-007、DEV-008、DEV-008-RELEASE 的实际 Commit ID。
  4. `README.md` 状态从“等待部署”更正为“已结项归档”，并增加复盘文档入口；未修改玩法、关卡数据、UI、默认首页或构建逻辑。
- **复盘量化依据（使用现有真实规则模块只读重算）**：
  - 50 关中 35 关的 `evidence.simplePath === true`，即存在不重复进入任何格子的通关路线；此类路线不受历史箭头约束。
  - 逐关回放 `verified-paths.campaign.json`：27/50 关参考最优路线回访进入次数为 0，全部路线合计 62 次回访。
  - 同一引擎在每步后清除 `stamps` 做完整 BFS：24/50 关最优步数不变，26 关下降（最大差值 10 步，C5-07 由 23 降至 13）；无 aborted。
  - 以上是关卡结构分析，不是玩家行为统计。
- **修改文件**：
  - `docs/PROJECT-RETROSPECTIVE.md`（新建）
  - `docs/DECISIONS.md`
  - `docs/development-log.md`
  - `README.md`
- **验证结果（真实执行）**：
  - `npm test`：**44 项通过 / 0 失败 / 0 跳过**，耗时约 23.9 秒；含 50 关逐关完整 BFS、参考路线回放与撤销/重开、实验关卡证据、求解器三态测试。
  - `npm run build`：`dist ready: 7 files, secret scan clean.`；输出 7 个运行时文件，`manifest.json` 由构建脚本生成；`dist/` 仍被 `.gitignore` 排除。
  - `git diff --check`：退出码 0；仅提示 `docs/DECISIONS.md` 将在下次 Git 操作时 LF→CRLF，无空白错误。
  - 敏感信息扫描：排除 `.git/`、`dist/`、`node_modules/` 后扫描 API Key、私钥、Bearer、password/secret/token 与 `.env` 模式；唯一命中为 4 个文件的合法 `process.env` 配置读取（`PORT`、生成种子、临时目录），无凭据内容；仓库内无 `.env`、`.pem`、`.key`、`id_rsa` 或凭据文件。
  - 未运行：`python tests/browser_regression.py`（环境无 Playwright）；未在真实手机/iOS Safari 验证；未做新的人工试玩；未部署。
- **遗留问题**：
  - 50 关未完成统一人工试玩验收，趣味性与难度曲线没有外部数据；结项决定基于产品负责人的主观体验。
  - 临时 CDP 浏览器脚本未入库，历史浏览器证据无法一键重放。
  - 当前分支未 Push；GitHub 备份需 PM 另行批准。
- **Commit ID**：本次归档提交（提交信息 `archive: finalize Echo Path project and retrospective`）；结项报告给出实际哈希。未 Push/Merge/Force Push。

---

## 历史记录占位

- DEV-001：任务单存在（`docs/DEV-001.md`），截至本记录标记为待核实；完成情况**待补充**。
- 更早版本（V0.2 基线导入）：仅有 `93c06c8` 提交与 `docs/SOURCE_PROVENANCE.md` 可作证据；详细开发过程**待补充**。