# DEV-008｜方向回声 V1.0 发布准备

**状态：发布包与回归完成，等待 PM 最终部署确认**
**分支**：`dev/dev-002-gameplay-experiment`（DEV-006-B / DEV-007 / DEV-008 工作区成果均未提交）
**基线**：`063bd21 DEV-005` + 前序未提交工作区
**日期**：2026-10-23
**使用模型**：`learnings_campus/qwen3.8-flash`（OpenCode）

## 一、现有成果保护

开工前核对 `git status`：DEV-006-B 与 DEV-007 的全部已修改与未跟踪文件均在位（十关数据、正式 50 关数据、fixtures、campaign 测试、生成/合并脚本、UI、文档、HANDOFF）。本任务未执行 reset / clean / checkout，未覆盖任何未提交文件。本任务仅新增 `scripts/build-dist.mjs`、`dist/` 构建产物与本/相关文档；`dist/` 已在 `.gitignore` 中，不进入版本库。

## 二、发布目录（dist/）

运行时依赖清单（经代码扫描确认）：`index.html`（CSS/JS 全内联或相对路径，无外部图片/字体/网络资源）→ `src/app.mjs` → `src/render.mjs`、`src/game-engine.mjs`；关卡数据按模式加载 `data/levels.v0.2.json`、`data/levels.experimental.json`、`data/levels.campaign.json`（全部为模块 URL 相对路径，任意静态根目录可直接运行）。

`npm run build`（`scripts/build-dist.mjs`）可重复执行：
1. 重建 `dist/`，仅复制上述 7 个运行时文件；
2. 关卡计数校验（50 / 9 / 8）；
3. 敏感模式扫描（`sk-…`、api key、secret/token/password/私钥、Bearer、`.env`、`process.env`）命中即中止并删除产物；
4. 白名单外文件检测；
5. 写出 `dist/manifest.json`（逐文件字节数与 SHA-256）。

`dist/` 内容（不含 Git 记录、docs/、tests/、scripts/、legacy/、AGENTS.md、package.json、模型配置）：

```text
index.html                     src/app.mjs   src/render.mjs  src/game-engine.mjs
data/levels.campaign.json      data/levels.v0.2.json  data/levels.experimental.json
manifest.json（构建元数据）
```

本地 `npm run dev` 行为不变（未修改 `src/`；`serve.mjs` 未改）。

## 二·补 发布定版：默认入口路由（DEV-008-RELEASE）

PM 批准 V1.0 公测发布后，按指示调整为**默认进入 50 关正式战役**，只改模式路由，不重构 UI 或规则：

- `src/app.mjs`：新增 `CLASSIC = params.get('mode')==='classic'`，把 `CAMPAIGN` 由 `mode==='campaign'` 改为 `!EXPERIMENT && !CLASSIC`，因此无 `mode` 参数即默认进入 50 关战役；`?mode=campaign`、`?mode=experiment`、`?mode=classic` 三种显式入口全部保留。
- 头部两枚模式链接在每个页面都指向“另外两种模式”，去除了原先指向 `./` 的回跳（否则会错误地重新加载战役）：
  - 战役页：`实验模式 → ?mode=experiment`、`经典九关 → ?mode=classic`；
  - 实验页：`V1.0 正式50关 → ?mode=campaign`、`经典九关 → ?mode=classic`；
  - 经典页：`V1.0 正式50关 → ?mode=campaign`、`实验模式 → ?mode=experiment`。
- `index.html`：更新静态默认与 `<title>`，使首屏（默认战役）在脚本执行前也语义一致；`玩法未定稿` 角标改为 `V1.0 公测版`。经典九关与八关实验关卡数据、规则、章节标签页逻辑均未改动。
- 分享链接：直接访问站点根 `/` 即为正式 50 关；经典为 `/?mode=classic`。
- `/favicon.ico` 的良性 404 按指示**暂不处理**。

定版回归（独立静态服务器 127.0.0.1:5200 + headless Chrome CDP，临时脚本 `release-routing-cdp.mjs`，未入库）全部 PASS：根 `/` 默认加载五十关、起点 C1-01、五章标签页；三种 `?mode` 各自正确加载（50/8/9）且经典默认开第4关、章节标签页仅在战役显示；头部链接点击可从 `/` 进入经典；经 `/` 入口五十关逐关最优通关；步数/最优/个人最佳显示、localStorage 写入与重载保留、通关反馈、撤销/重开均正常；320/390/768/1100 无溢出且控件可用；dist 资产全 200、开发专属文件 404、无非预期 4xx/5xx、无控制台错误。

## 三、发布前回归（真实执行）

| 项目 | 方式 | 结果 |
|---|---|---|
| `npm test` | node --test | **44 通过 / 0 失败** |
| `git diff --check` | git | 无空白错误（仅 LF→CRLF 换行提示） |
| 源码+关卡+dist 凭据扫描 | Select-String 多模式 | **CLEAN**，无命中；仓库无 `.env` |
| dist 白名单/计数/敏感扫描 | npm run build | 7 文件通过，manifest 生成 |
| 独立静态环境回归 | 临时 node 静态服务器 (127.0.0.1:5200，非开发服务器) + headless Chrome CDP（临时脚本 `dist-cdp.mjs`，未入库） | **全部 PASS**，见下 |

CDP 独立静态回归覆盖：
- 五十关逐关 UI 回放全部按最优步数通关（50/50）；
- 五章标签页切换、按章过滤、每章通关计数（10/10）；
- 切关 / 撤销 / 重开 / 末关隐藏“下一关”；
- 步数挑战：当前/最优/个人最佳实时显示；localStorage `echoPath.best.v1` 在静态主机上写入 50 条、页面重载后保留（C1-07 显示“个人最佳 10 步”）；
- 320 / 390 / 768 / 1100 视口：无横向溢出、格子保持方形、10 关卡按钮 + 5 章节标签可用；
- 资源状态：`/`、`/?mode=campaign`、`/?mode=experiment` 与全部 src/data 资产均 200 且 MIME 正确；经典九关与实验八关在 dist 同样正常运行；
- 反向探测：`/data/levels.campaign.batch1.json`、`/docs/development-log.md` 均 404（开发文件确未混入）；
- 网络层无非预期 4xx/5xx；页面无异常、控制台无错误。
- 已知良性项：浏览器自动请求 `/favicon.ico` 返回 404。页面本身不引用任何图标资源，不影响功能与视觉；如需消除，可未来在 `index.html` 加一行空 favicon 链接（涉及源码改动，未擅自执行）。
- **未运行** `python tests/browser_regression.py`（环境无 Playwright）；未在真实手机浏览器/iOS Safari 验证。

## 四、C1-07 / C3-04 风险复核

两关同为 5×5，汉明距离 7（DEV-007 遗留警告）。逐格差异：

| 格 | C1-07 | C3-04 |
|---|---|---|
| (0,3) | . | ★ |
| (1,1) | ★ | . |
| (3,3) | . | # |
| (3,4) | . | E |
| (4,2) | E | . |
| (4,3) | . | # |
| (4,4) | . | ★ |

- **相同点仅在地图层面**：同尺寸、同起点 (2,0)、同有一颗星在 (2,4)，其余 18 个相同格几乎全是空地。
- **玩法完全不同**：
  - C1-07「双星绕行」（第1章，基础规则/路线规划）：0 墙、2 星、最优 10；2/2 顺序都可行，贪心成功，无回访，存在无重复路径——教学级开放规划题。
  - C3-04「唯一顺序」（第3章，顺序陷阱/回程）：2 墙封住右侧通道、3 星、最优 11；仅 1/6 顺序可行，贪心失败@6，需 1 次回访，无无重复路径——硬顺序陷阱题。
- **体验多样性影响：低。** 两关相隔 17 个关卡位次（第 7 关 vs 第 24 关），玩家不会连续遇到；核心决策类型（绕行方向 vs 唯一收集顺序）不同；墙数、星数、出口位置均不同。汉明距离在空地占比高的小棋盘上天然偏小，指标本身夸大了相似度。
- **建议：发布前不调整。** 若后续人工试玩反馈“视觉雷同感”，可用生成器换种子重生成 C3-04（流程已具备）；本任务按边界未改动任何关卡。

## 五、人工上传部署步骤（Netlify 示例，由 PM 执行）

1. 本地执行 `npm run build`，确认输出 `dist ready: 7 files, secret scan clean`。
2. 打开 https://app.netlify.com/drop，把整个 `dist` 文件夹拖入上传。
3. 站点就绪后，根地址 `https://<站点名>.netlify.app/` 即进入正式 50 关；经典九关为 `/?mode=classic`，实验为 `/?mode=experiment`。
4. 手机访问分享链接抽查：切章、通关一关后刷新页面确认“个人最佳”保留、320–390px 宽度无横向滚动。
5. 如需绑定正式域名或添加重定向规则，另行由 PM 决策；不在本次范围。

## 六、结论与边界

- `dist/` 为自包含、可重复构建、经独立静态环境回归的发布候选；未部署、未提交。
- 发布包不含凭据、内部文档与 Git 记录；开发模式不受影响。
- 自动化证据仅支持“可解、最优步数正确、UI 与持久化在静态环境正常”；50 关趣味性与难度递进仍以 PM 组织的人工试玩为准。
