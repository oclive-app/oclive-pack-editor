# 编写器 · 进度与下一步（更新 2026-08-20）

## 已完成（Sprint A–D + v0.5.0）

| 项 | 说明 |
|----|------|
| Phase 1 壳层 | 侧栏 开始/简单/高级；顶栏检查+导出；Toast |
| Phase 1.5 | 导出 Teleport；检查角色包文案；PackShellMenu 语言/主题 |
| Phase 2 | roles 根绑定 + 扫描下拉；Tauri camelCase；idle 检查守卫；写回确认 |
| 本地草稿 v2 | 槽位文件名 + VP 配置元数据；v1 自动迁移 |
| **Sprint A** | `PortraitCatalogEditor`（7 槽 + 额外条目 + live2d picker）；`visual_presentation` UI |
| **Sprint D** | 分级导出 profile：`desktop-full` / `vscode-lite` / `theater` |
| 导入 roundtrip | zip 导入恢复 `portrait_catalog` + `config.json` visual 字段 |
| 人设 / 记忆解耦 | 高级编辑 `memory_seed.json` 与 `user_identities/`；zip 和磁盘加载均可回填 |
| 无损再导出 | 保留蓝图 `includes` / `groups` / `expert_overlay` / `runtime_config` 与安全卫星文件 |
| 遗留清理 | 删除 `EmotionAssetsControl.vue` |
| 文件化高级创作 | 为角色包各主要文件提供对应界面，帮助说明使用不遮挡；简单/高级/成人页编辑同一份真实草稿 |
| 回复表现优化 | 简单创造默认使用通用表现锚点，可切换为创作者自定义长文；不覆盖内核硬约束 |
| 桌面导出位置 | 首次“导出 `.ocpak`”另存为，后续复用目标；旁边保留“另存为”用于切换位置 |
| 外部角色卡转换 | 离线读取 V1/V2/V3 JSON、PNG/APNG 与 CHARX，转换后选择简单或高级创作；原始来源随包保留 |
| 兼容样本巡检 | 本机首轮 16 个真实容器、8 个角色，覆盖 V1 PNG、V2/V3 JSON、V3 PNG 与 CHARX，16/16 转换并通过基础角色包校验 |
| 生成式兼容矩阵 | 42 个中性用例覆盖规范容器、字段映射、旧 Tavern/Risu 方言以及损坏/恶意输入；第三方正文不入库 |

## 自动化验收（v0.5.0）

| # | 场景 | 结果 | 证据 |
|---|------|------|------|
| 1 | 简单 7 槽 → 导出 → roles 对话立绘 | ✅ | `collectCatalogBinaryAssets` · 主仓 `portrait_catalog_fallback` |
| 2 | 高级 `extra_*` + cluster → catalog >7 条 | ✅ | `buildPortraitCatalogJson` / `portrait_director_catalog` |
| 3 | 分级导出 vscode-lite / theater | ✅ | `applyExportProfile` 单测 |
| 4 | Tauri 检查含 catalog id 重复 | ✅ | `validatePortraitCatalogState` + Tauri export validate 占位路径 |
| 5 | 双仓自动化 | ✅ | pack-editor `npm run build`；主仓结果以其 `AI_VERIFICATION_PROTOCOL.md` 与测试矩阵为准 |
| 6 | 人设 / 记忆 / 卫星文件 roundtrip | ✅ | Vitest 导入导出与路径安全用例；Playwright 高级页 smoke |
| 7 | Character Card 真实样本 | ✅（首轮） | `npm run audit:character-cards`；修复老式 V1 分块 PNG、CHARX 图片扩展名误标与 `x-risu-asset` 静态立绘保留 |
| 8 | Character Card 生成式矩阵 | ✅ | `npm run test:character-cards`；42 个生成用例 + 11 个导入器回归用例，覆盖格式、映射、方言与安全边界 |

**主程序 E2E**：加载带 `portrait_catalog.json` 的包后，`visual_state_id` + `performance_directive` 由主仓 OOCP 与 invoke 热路径矩阵负责断言；场景编号与条数以主仓测试 SSOT 为准。

## 下一步（非阻塞）

- 将真实样本逐步扩至 30–50 个差异明显的合法公开卡；样本不入库，只保留匿名结构报告
- 完成 Windows 安装包与 Chat Pro 配套发行检查；外部平台按可导出文件兼容，不做登录抓取
- **R18 / 语音仅在内测推进**：R18 做撤销、隔离、上限与人工内容确认；语音做设备、切分、取消/重试、长时间和听感验证
- wasm 全量 portrait 路径存在性（需真实导出二进制；当前 Tauri validate 用占位字节）
- Live2D Cubism 实装（主仓 defer，见 `handoff/LIVE2D_CUBISM_DEFER.md`）

## 2026-06-12 · roles 工作区 ↔ 第 3/4 设施

| 链路 | 状态 |
|------|------|
| 导出 zip / 写 roles 文件夹 | `portrait_catalog.json` + `config.json`（`portrait_catalog.enabled` / `visual_presentation`） |
| zip 导入 | catalog path 二进制（含 live2d）+ VP 配置回填 |
| **roles 扫描加载** | `load_role_pack_for_editor` 返回 catalog 文本 + 磁盘 assets → 7 槽 / VP UI |
| 主程序运行时 | `RoleStorage` 读 catalog + `materialize_directive`（主仓 ≥0.4） |
