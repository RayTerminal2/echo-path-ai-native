# DEV-001 开发与验证报告

日期：2026-10-22（Asia/Shanghai）。交付分支：`dev/dev-001-refactor`，关联 Issue #1。等待 PM 审核，不合并 main。

## 变更及原因

- 从原版抽离 `src/game-engine.mjs`，提供 initial / target / move / undo / restart。状态转换无 DOM、计时或统计依赖；合法移动产生新状态，非法移动保持原状态。撤销使用历史状态，避免复制整份棋盘数据。
- `src/render.mjs` 负责渲染；`src/app.mjs` 保留输入事件、通知、会话统计、复制及下载记录。初始仍打开第4关，HTML/CSS/文案保持原样。
- 页面仅加载 `data/levels.v0.2.json`，不再内嵌重复关卡。开发服务器以白名单提供模块和 JSON，禁止读取其他仓库文件；favicon 返回 204，避免浏览器默认请求产生 404 控制台噪声。
- 补充规则测试及浏览器回归，更新 README 和测试策略。不新增运行时依赖，不扩关、不改规则。

## 验证环境及结果

Linux 云环境，Node.js v24.19.0，Python Playwright 1.62.0，系统 Chromium 154.0.8037.57（headless）。浏览器需本地端口和进程权限，沙箱内首次启动服务 EPERM；授权的完整运行成功。沙箱 Node 子进程汇总仅显示文件级结果，以下为完整运行的逐用例结果。

执行：

```text
npm test
ℹ tests 17
ℹ suites 0
ℹ pass 17
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```

其中 3 项基线检查（含冻结 HTML SHA256、九关逐字段对比），14 项实际引擎测试；包含九关 5/11/16/14/13/17/19/19/23 步通关、失败状态不变、旧箭头约束、收集不重复、提前经过出口、胜利后禁止移动、胜利后撤销、重开和输入不变性。

执行：

```text
python tests/browser_regression.py
PASS viewport 1100 all 9 routes, undo/reset/stats, keyboard/click/touch, next/switch, export, no overflow/JS errors
PASS viewport 390 all 9 routes, undo/reset/stats, keyboard/click/touch, next/switch, export, no overflow/JS errors
PASS viewport 320 all 9 routes, undo/reset/stats, keyboard/click/touch, next/switch, export, no overflow/JS errors
```

实际视口为 1100×800、390×844、320×720。每个视口通过同一页面入口回放全部九关，并验证通关后撤销、重开、下一关、统计字段和各关横向溢出；覆盖方向键/WASD、Backspace/Ctrl+Z、绿色格子点击及移动视口 tap、屏幕方向按钮、关卡按钮。捕获 JS 异常和控制台错误，均无错误。复制路径通过注入 clipboard 捕获文本验证字段；另外验证 execCommand 成功分支和失败后的实际文本下载。

`git diff --check` 通过；冻结 `legacy/echo-v0.2-original.html`、九关 JSON、参考路径 fixture 无改动。

## 保留行为、风险与未验证项

- “重开归零”落实为当前步数、收集、箭头、胜利标记与撤销历史归零；累计撤销/重开/无效操作/通关记录继续保留。原版明确提示“测试统计仍然保留”，为遵守保守重构，未将其改成会话统计归零。若需改变，应由 PM 决策。
- 原版通关后撤销再通关会再次计一次通关；撤销不回滚累计统计。按基线保留。
- 模块及 JSON 加载需要 HTTP 服务；直接 file:// 双击不再支持，README 已说明。网络或文件加载失败尚无专用恢复界面。
- 移动端为 Chromium 触屏模拟，未覆盖 iOS Safari、Firefox、真实手机、辅助技术或长期运行；未做逐像素截图比对。
- clipboard/execCommand 使用替身验证集成及文本，未验证宿主操作系统剪贴板权限交互；下载分支读取了实际下载内容。
- 自动路径通过只说明当前规则与集成可执行；没有开展玩家试玩，不证明趣味性、难度、最短解的独立最优性或是否应生产50关。

回退可使用冻结原版或撤回本 PR；不修改 main。
