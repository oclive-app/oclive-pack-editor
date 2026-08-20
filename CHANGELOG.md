# Changelog

本文件随 **Git 标签 / Release** 更新；维护者发版步骤见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## [0.5.0] - 2026-08-20

### Changed

- 首发安装器与窗口的用户可见名称统一为 **A.I.Live 角色包编写器**；仓库名、内部应用标识符和兼容路径保持不变。

### Added

- 高级创作支持独立编辑与校验 `memory_seed.json`、`user_identities/index.json` 和身份模板 Markdown。
- 新建角色包默认输出 Stable v4 蓝图；导入的 v2 继续按 v2 无损导出。zip / ocpak 与磁盘角色包会透传路径安全的未知卫星文件及 v4 `extensions` 外置 JSON 载荷，并保留编写器暂不编辑的蓝图扩展字段。
- 开始页新增 Character Card / Tavern V1、V2、V3 JSON，PNG/APNG `chara` / `ccv3` 卡与 V3 CHARX 的离线转换入口；提取人设、场景、开场白、候选开场、示例对话、知识库和可安全映射的主图/情绪图，生成可编辑草稿与逐项转换报告。转换完成后可选择进入简单创造或高级创作，两者复用同一份草稿。CHARX 具备路径、条目数、解压总量与单资源上限，远程及可执行资源不加载。翻译与 R18 扩展生成暂缓。
- 新增显式本机 Character Card 样本巡检入口；第三方样本不入库、不进入普通 CI，报告只记录格式、结构计数、转换/复核项和拒绝原因。
- 新增不含第三方正文的 Character Card 生成式测试矩阵，区分规范夹具、已观察平台方言与安全反例，覆盖 V1/V2/V3、JSON/PNG/APNG/CHARX、字段映射、未来版本提示和恶意容器拒绝。
- 简单创造新增“自定义回复优化”开关。默认写入从沐沐调优经验抽象出的通用角色表现锚点；打开后可在默认铺满内容区、支持横纵双向调整且不会超出应用宽度的长文本编辑区整段替换，运行时内核硬约束仍会在其后追加。
- 场景编辑新增 `welcome_message` 与 `monologues` 的真实编辑、导入和导出支持，用于承接角色卡 `first_mes` / `alternate_greetings`。

### Fixed

- 支持每个字段单独存放在 PNG 文本块中的早期 Tavern V1 卡；避免只认 `chara`/`ccv3` 封装而误拒绝。
- 缺少完整 `IEND` 的截断 PNG/APNG 现在会明确判为容器损坏，不再误报为“未找到角色卡元数据”。
- CHARX 图片以内容魔数纠正误标扩展名；安全保留 Risu 的 `x-risu-asset` 静态情绪图，并让主头像优先占用 neutral 槽，避免默认情绪图覆盖主头像或静默丢图。
- 修正相邻主仓校验 crate 与 wasm crate 路径；桌面端默认 roles 根对齐 `distros/chat-pro/roles`。
- 修正编辑视图已访问集合的响应式更新，避免高级异步面板首次切换后保持空白。
- 收敛 Tauri 自定义命令：角色加载改为一次返回已知包文件，移除任意路径文本读写、任意可执行文件启动与目录插件进程测试入口。

## [0.5.0-preview.1] - 2026-07-10

### Changed

- **`HOST_RUNTIME_VERSION`** 升至 **0.5.0**（与 oclivenewnew `distros/desktop-tauri/Cargo.toml` 对齐；catalog / 语音侧通道 `ui.json` 种子需主程序 ≥0.5）。

### Added

- **脚本**：新增 **`npm run check`**（`build` + `vitest` + **`contract:json-keys`**），与主仓发版前自检习惯对齐。
- **界面**：全局 **暖色主题**（象牙/卡其，与 oclive-launcher 日间 token 对齐）；根字号公式与 **界面缩放** 行为保持不变。
- **试聊 HTTP**：`runtimeApi` 的 `RuntimeChatMeta` 识别 oclive `--api` 回包 **`personality_source`**（`vector` | `profile`）；试聊消息条展示 **人格·七维 / 人格·档案** 芯片（有该字段时）。
- **简单创作 / 契约文案**：`evolution.personality_source`、**`max_change_per_event`** 与 UI 提示对齐 oclivenewnew **性格档案**设计轴心（核心/可变档案、七维视图）；README、CHANGELOG 同步。
- **文档**：README「与运行时的关系」补充 **`creator_message.txt`** 与启动器职责链接；补充 **性格档案**与 oclivenewnew `personality-archive-notes.md`、`design-axis-evolution.md` 链接；CONTRIBUTING **跨仓约定**（文件名与 oclive-launcher 同步）。

## [0.4.0] - 2026-06-12

### Added

- **`PortraitCatalogEditor`**：7 固定槽 + 高级 `extra_*` 条目；`kind: live2d` 支持 model3.json 文件选择。
- **分级导出 profile**：`desktop-full` / `vscode-lite` / `theater`（导出菜单）。
- **`visual_presentation` UI**：折叠面板含 live2d backend 与 model 路径。
- **草稿 v2**：`oclive-pack-editor-draft-v2` 保存槽位文件名与 VP 配置（仍不存图片二进制）；自动迁移 v1。
- **导出校验**：Tauri `validate_role_pack_export` 写入 catalog / live2d 占位路径，与主仓 `oclive_validation` portrait 规则对齐。
- **导入 roundtrip**：zip 导入恢复 `portrait_catalog` + `config.json` visual 字段。

### Changed

- 移除遗留 `EmotionAssetsControl.vue`（由 `PortraitCatalogEditor` 取代）。
- `HOST_RUNTIME_VERSION` 升至 **0.4.0**（catalog 需主程序 ≥0.4）。

### Fixed

- `vue-tsc` 编译：清理未使用的 emotion 批量 API 与 portrait slot 类型。
- Live2D / rig3d 资源按 catalog `path` 写入 zip 与 roles 文件夹（不再一律落在 `assets/images/`）。

## 0.2.0

### 编写与导出

- **简单创作**：`manifest` / `settings` 支持 **`knowledge.enabled`** 与 **`knowledge.glob`**（与运行时合并语义一致，settings 优先）；`min_runtime_version` 等字段保持与 README 描述一致。
- **合并前检查**：[CONTRIBUTING.md](./CONTRIBUTING.md) 中的「合并前审查要点」；`usePackEditor` 使用 `simpleKnowledgeForSettings` 统一写入 settings 侧 `knowledge`。

### 契约与校验

- **`npm run contract:json-keys`**：对比 `jsonKeys.ts` 与 oclivenewnew `json_keys.rs`。
- **`HOST_RUNTIME_VERSION`**（`src/lib/hostRuntimeVersion.ts`）与 oclivenewnew `Cargo.toml` 版本对齐（当前 **0.2.0**）。

### 其它

- **简单创作性能**：表单变更写入 JSON 使用约 **220ms 防抖**，减轻长文输入卡顿；切换到「检查 / 试聊」、导出或运行检查前会**立即同步**，避免未落盘表单。
- 试聊、E2E smoke、CI（含 wasm 构建）等与 [README.md](./README.md) 一致。
