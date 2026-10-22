# 来源与工程证据

- 原型 `index.html` 与 `legacy/echo-v0.2-original.html` 均源自项目当前讨论中的方向回声 V0.2 文件，初始内容保持完全相同。
- 9关数据来自同一 V0.2 配置，拆出为 JSON 快照，但此阶段 HTML 仍为自身数据源（DEV-001 才将 JSON 变为唯一来源）。
- 9条参考通关路径来自之前生成的离线规则搜索器；它们是在当前交接准备时重新计算并生成方向序列，不代表真人通关记录。
- 交接准备阶段没有调用 Codex，也没有创建 GitHub 远程仓库。DEV-001 状态为待开发。

- 准备交接包时运行了 Node 基线测试与冻结 HTML 的 Playwright 回放。当前执行环境阻止 Chromium 访问 localhost，因此 `tests/browser_regression.py` 未能在此执行；后续应在 Codex 可用的环境实际运行重构后网页。
