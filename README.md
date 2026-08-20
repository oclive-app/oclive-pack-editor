# A.I.Live 角色包编写器

独立 **A.I.Live 角色包编写器**（仓库名：`oclive-pack-editor`，Vite + Vue 3 + TypeScript + **Tauri 2** 桌面壳）：面向创作者的 **简单创作** 流程（人设、立绘、世界观 → 导出 `.ocpak` / 写入 `roles/`），并提供按真实角色包文件组织的 **高级创作**。产物与 **oclivenewnew** 运行时兼容；**不包含**对话引擎源码。

[![CI](https://github.com/linkaiheng2233-cyber/oclive-pack-editor/actions/workflows/ci.yml/badge.svg)](https://github.com/linkaiheng2233-cyber/oclive-pack-editor/actions/workflows/ci.yml)

**当前版本：0.5.0**（`package.json`、`src-tauri/tauri.conf.json`、`Cargo.toml` 已对齐）。

**贡献与发版**（本地命令、`HOST_RUNTIME_VERSION`、`wasm:build`、顶层键对比脚本）：见 [CONTRIBUTING.md](./CONTRIBUTING.md)。**变更记录**：[CHANGELOG.md](./CHANGELOG.md)。

## 与 A.I.Live 主应用的关系

| 能力 | 在哪做 |
|------|--------|
| 角色人设、只读 `memory_seed.json`、`user_identities/*.md` 身份模板、`meta` / `slot_registry`（六槽 + agent）、场景与知识 Markdown、情绪图、导出 zip / 写入 `roles/` | **本编写器** |
| **专家模型路由**（`blueprint/includes/expert_routing.json`）、架构图 **`groups`**、蓝图 **`includes[]`** 合并 | **A.I.Live（oclivenewnew）** → 插件与后端管理 → 架构图 |
| 对话、记忆持久化、`load_role` 最终校验 | **A.I.Live** |

**保存注意事项**：侧栏「角色包」保存时会更新编写器管理的 `meta` / slot 字段，同时保留未知 meta 字段、多实例 `slot_registry` 以及 `includes`、`groups`、`expert_overlay`、`runtime_config`、v4 `extensions` 和它们引用的安全载荷文件。v3 / dual-core 蓝图当前不进入编写器编辑流程；v2 会原版本往返，Stable v4 是新包默认。

**专家路由配置**：请在 **A.I.Live** 主应用配置（`blueprint/includes/expert_routing.json`）；本编写器不编辑该文件。详见 [creator-docs/ROLE_PACK_EDITOR.md](./creator-docs/ROLE_PACK_EDITOR.md)。

## 与运行时的关系

| 项目 | 说明 |
|------|------|
| **本仓库** | 产出 **`pipeline.ocblueprint`**（新包 Stable v4；v2 兼容）、`core_personality.txt`、可选只读 **`memory_seed.json`**、**`user_identities/*.md`**、**`knowledge/**/*.md`**、场景、情绪资源、`config.json`、`ui.json`、`author.json`、`voice_profile.json` 与已知 `prompts/` 文件；未知安全文件和未来字段在导入导出时保留 |
| **oclivenewnew** | 加载、校验与对话；契约原文在其仓库 **`creator-docs/`** 与 **`roles/README_MANIFEST.md`** |

## 与「插件市场 / 模块条目 / Profile（特征码）」的边界

编写器只负责**角色包内容与蓝图编辑**（Stable v4 / v2 兼容、知识、素材、导出），不负责插件市场与一键部署。

- **插件市场条目（`type: "plugin" | "module" | "profile"`）**：由 `oclivenewnew` 的「插件与后端管理」负责同步索引、安装依赖插件、权限确认与应用后端覆盖。
- **Profile（特征码/一键部署）**：属于运行时侧的「环境配置 + 依赖声明」能力；编写器不解析/不应用 Profile，只在角色包里提供 `plugin_backends` 等字段供运行时读取。

**性格档案**：本编写器编辑包内 **核心性格档案**（`core_personality.txt`）与 **`evolution`**（含 **`personality_source`**、`max_change_per_event`）。若选用 **`profile`**，运行时的 **可变性格档案**由 oclive 在数据库中维护，**不可**在包内手写；设计说明见 oclivenewnew **[personality-archive-notes.md](https://github.com/linkaiheng2233-cyber/oclivenewnew/blob/main/docs/personality-archive-notes.md)**，思路变化见 **[design-axis-evolution.md](https://github.com/linkaiheng2233-cyber/oclivenewnew/blob/main/docs/design-axis-evolution.md)**。

**版本对齐**：`src/lib/hostRuntimeVersion.ts` 中的 **`HOST_RUNTIME_VERSION`** 应与 **oclivenewnew** `distros/desktop-tauri/Cargo.toml` 的 **`version`** 一致；导出前校验会检查 **`meta.min_runtime_version`** 并按 schema 精确分派 v2 / v3 / v4 蓝图契约（见 [PACK_VERSIONING.md](https://github.com/linkaiheng2233-cyber/oclivenewnew/blob/main/creator-docs/role-pack/PACK_VERSIONING.md)）。

桌面版可从开始页选择 **roles 根**，加载其中的 v2 / Stable v4 角色包，再通过同一套简单/高级创作界面修改；写回统一经过导出预检，不再保留旧的第二套磁盘编辑面板。

编写器只负责创作与静态校验。对话、角色反馈和插件进程执行属于运行时边界；请把导出的角色包放入 A.I.Live 后进行动态联调。

路径约定（Windows 示例）：与 `oclivenewnew` **同级**放置本仓库，例如 `D:\oclive-pack-editor` 与 `D:\oclivenewnew`。

## 新用户：编写器 + 运行时（推荐）

| 步骤 | 说明 |
|------|------|
| 1 | 安装 **Node.js**；完整运行时如使用本机模型，再按需安装 **Ollama**。 |
| 2 | 同级克隆 **[oclivenewnew](https://github.com/linkaiheng2233-cyber/oclivenewnew)**（A.I.Live 运行时）与本 **编写器**。 |
| 3 | 在本编写器中编辑或导入角色包，**导出 .zip / .ocpak** 或 **「写入文件夹」**，使 **`{角色id}/pipeline.ocblueprint`** 位于 **roles 根** 下；主仓默认根为 `oclivenewnew/distros/chat-pro/roles/`，也可设置环境变量 **`OCLIVE_ROLES_DIR`** 指向其他根。 |
| 4 | 启动 **oclivenewnew**（`npm run tauri:dev` 或 Release），加载角色并进行动态联调。 |
| 5 | （可选）在 **A.I.Live** 中配置专家路由与架构图分组，保存后回到编写器编辑人设时，扩展蓝图字段会被保留。 |

权威说明：**[CREATOR_WORKFLOW.md](https://github.com/linkaiheng2233-cyber/oclivenewnew/blob/main/creator-docs/getting-started/CREATOR_WORKFLOW.md)**。旧版 **oclive-launcher** 已退役，见 [启动器 README](https://github.com/linkaiheng2233-cyber/oclive-launcher/blob/main/README.md)（归档只读）。

界面风格参考 **Fluent Design**（与常见 Fluent 桌面工具如 **qfluentwidgets** 一脉：浅色页背景、卡片层次、主色强调按钮），在 `src/style.css` 中通过 CSS 变量统一，并支持系统深色偏好；日间为 **象牙/卡其暖色**，与 **oclive-launcher** 对齐以便跨应用习惯一致。

## 离线范围

- **核心能力**（编辑、运行全部检查、导出 zip、桌面版选择 **roles 根** 并写入完整目录树）**不依赖外网**；不内嵌 LLM 或对话引擎。
- **桌面壳**为 **Tauri 2**（与 oclivenewnew 同大版本线），权限通过 `src-tauri/capabilities/main.json` 收敛；生产 CSP 不开放本地服务端口或 `unsafe-eval`，Vite 开发端点仅存在于 `devCsp`。本地完整打包需安装 **Rust** 与对应平台依赖（见下）。

## 环境依赖

| 用途 | 需要 |
|------|------|
| 前端开发 / 测试 | **Node.js 20+**、`npm ci` |
| 桌面开发与打包 | **Rust**（`rustup` stable）、**Tauri 2** 平台依赖 |
| Windows | **WebView2**（通常已随系统/Edge）、`tauri build` 需 **Visual Studio Build Tools**（MSVC、Windows SDK） |
| Linux（含 CI） | `libwebkit2gtk-4.1-dev`、`libsoup-3.0-dev`、`libgtk-3-dev`、`libayatana-appindicator3-dev`、`librsvg2-dev` 等（与 [Tauri 2 前置说明](https://v2.tauri.app/start/prerequisites/) 一致） |

## 创作模式

- **简单创作**
  - **基础**：**核心性格档案**长文（写入 `core_personality.txt`）、默认启用的通用 **回复表现优化**（可打开开关整段自定义）与 **情绪图片**（导出至 `assets/images/`，文件名需与 oclive 情绪资源命名一致）。回复优化写入 Stable v4 `runtime_config.reply_quality_anchor`（v2 为兼容字段），作为独立区块紧邻不可覆盖的内核硬约束；物理顺序服从运行时前缀缓存布局，不与核心人设混写。
  - **进阶**（可折叠）：场景、用户身份、**世界观**（`knowledge/world.md`）、**事件影响系数**、**人格来源**（`evolution.personality_source`）、**单轮可变档案步长**（`max_change_per_event`）等，对应 blueprint **meta** 与运行时视图字段。
  - **推理归属**：简单包只保留 **Ollama 兜底**，不写入当前电脑的模型名、GGUF 或运行参数；实际后端和基础模型统一在 **Chat Pro 设置页**选择。
- **高级创作**：按实际文件导航编辑 **`pipeline.ocblueprint`**、`core_personality.txt` / `creator_message.txt`、`config.json`、`memory_seed.json`、`user_identities/`、`knowledge/`、`scenes/`、`prompts/`、`voice_profile.json`、`ui.json`、`author.json` 与情绪资源。Stable v4 的 **理想推理配置**只表达可移植采样、预算、推理强度和性能意图；不重复 Chat Pro 的模型/GGUF 设置。
- **世界观与知识文件（高级 · 世界观）**
  - 支持多个 **`knowledge/*.md`**；简单模式下的「世界观」仍与 **`knowledge/world.md`** 同步。
  - **Front matter 表单**：`id`、`tags`、`scenes`、`event_hints`、`weight`，无需手写 YAML；正文与元数据分离编辑。
  - **运行全部检查** 会附带知识级校验（例如路径、`id` 重复等），与 manifest/settings 结果合并展示。
  - **知识强调预览 / 调参助手**（仅编辑器内近似）：输入关键词可预览命中与原因、正文片段；可选「预览条件：场景」与严格场景开关；**临时权重滑杆**只影响预览排序，满意后再写入真实 `weight`。运行时召回以 oclivenewnew 为准，预览用于创作调参。
- **导入角色包**：支持 **`.zip` / `.ocpak`**，解析后回填上述内容，便于在已有包上修改或另存为新包。导入后会保留编写器不直接编辑的安全文件与蓝图扩展字段，避免再次导出时静默丢失。导入时会校验 zip 内路径：拒绝含 `..` / `.` 段的非法路径（防 zip-slip）；情绪图仅接受 `{roleId}/assets/images/` 下**单层**文件名（不接受子目录）。
- **转换外部角色卡**：开始页可选择 Character Card / Tavern **V1、V2、V3 `.json`**，带分字段旧式 V1 或 `chara` / `ccv3` 元数据的 **`.png` / `.apng`**，以及 V3 **`.charx`**。编写器提取名称、昵称、作者、人设、场景、`first_mes`、`alternate_greetings`、`mes_example`、`character_book`，并把本地可解析的 V3 主图和情绪图映射到 OCLive 立绘目录；CHARX 中实际图片格式与声明扩展名不一致时以安全魔数识别为准，`x-risu-asset` 静态图片作为需复核的额外立绘保留。转换完成后可直接选择进入**简单创造**或**高级创作**，两者编辑同一份草稿。转换报告显示在简单创造顶部，规范 JSON 保存在 `imports/original_character_card.json`，V3 PNG/APNG/CHARX 原文件也会保存在 `imports/`。外部 `system_prompt` / `post_history_instructions` 只保存为 `prompts/system.md` 参考，不会直接接管运行时；`group_only_greetings` 与无直接等价行为的高级知识规则只保留供复核。转换器不联网抓取远程资源，不执行代码或模型资产，不翻译文本、不生成 R18 扩展，也不启用平台私有 `extensions`。CHARX 会拒绝不安全路径、过多条目和超出限制的解压内容。

**首发与内测边界**：基础角色包编辑、Character Card 转换和 `.ocpak` 导出属于首发范围；成人扩展与 `voice_profile.json` 的编辑入口已经存在，但真实内容效果、撤销/错误隔离、语音设备与长时间播报体验继续在内测推进，不阻塞基础版本发布。

**简单创作已覆盖（表单 → JSON）**：角色 `id` / `name` / `version` / `author` / `description` / `min_runtime_version`（可选）/ `scenes` / `default_personality` / 单槽 `user_relations` + `default_relation` / **`knowledge.enabled` 与 `knowledge.glob`**；运行部分覆盖 `schema_version` / `evolution.event_impact_factor` / **`evolution.personality_source`** / **`evolution.max_change_per_event`** / `identity_binding` / `interaction_mode` / `memory_config.scene_weight_multiplier` / `remote_presence.default_enabled` 以及非 LLM 插件后端。简单模式会删除旧的 `model` / `ollama_model` 并固定 `plugin_backends.llm = ollama` 作为兜底，避免复制 Chat Pro 设置。**仍须高级创作的典型项**：理想推理配置、多身份并存、`life_trajectory` / `life_schedule`、`dev_only`、`autonomous_scene`、逐场景 `topic_weights` 精调等。

编写器 **不包含**对话引擎本体，也不启动运行时、插件或任意外部进程。动态行为以角色包写入运行时 **roles 根** 后，由完整 A.I.Live 进程加载测试为准。

## 使用

**Windows**：安装依赖后，双击 **`scripts/start.bat`** 会**先询问打开方式**（Tauri 桌面窗口 / 仅浏览器），不会同时打开两种界面。命令行可直接指定：`scripts/start.bat tauri`、`scripts/start.bat web`。

```bash
npm install
npm run tauri:dev    # 桌面窗口：Vite 在后台，不自动打开系统浏览器
npm run dev:browser  # 仅浏览器：Vite + 自动打开浏览器
npm run dev          # 仅启动 Vite（不自动开浏览器；供 Tauri 子进程或手动打开 http://localhost:5173）
```

1. 可选 **「运行全部检查」** 查看 Stable v4 / v2 兼容蓝图契约一致性。
2. 勾选 **「导出前校验包内容」**（默认开启）：关闭后可在未通过检查时仍导出 zip 或写入文件夹，便于半成品或插件扩展包到 oclive 中实测。  
3. **导出** `.ocpak` / `.zip`（浏览器下载到本机任意位置），或使用 **「写入文件夹（自选 roles 根目录）」**（Tauri 或支持 File System Access 的 Chromium）。  
4. 将解压或写入得到的 **`{roleId}/`** 文件夹放进运行时的 **roles 根**（与 zip 内结构一致：**不要**多套一层目录）。  
5. 在 oclive 进程环境中设置 **`OCLIVE_ROLES_DIR`** 指向 **roles 根**：即直接包含各 `角色id/` 子文件夹的那一层（与 oclivenewnew 仓库内 `roles/` 目录的语义相同；**不要**指到某个角色子文件夹内部）。

详见 oclivenewnew 仓库内 **`creator-docs/getting-started/CREATOR_WORKFLOW.md`**（`OCLIVE_ROLES_DIR` 与加载方式）。

### 桌面版（Tauri）

```bash
npm run tauri:dev    # 开发：先起 Vite，再打开窗口
npm run tauri:build  # 生产安装包 / 可执行文件（需完整 Rust + 平台依赖）
```

`src-tauri/tauri.conf.json` 引用的图标位于 **`src-tauri/icons/`**。若仓库中尚未包含图标文件，请准备一张方形 PNG（建议 ≥512×512），执行 `npx tauri icon path/to/icon.png` 生成全套资源后再打包。

编写器独立软件形态与仓库边界见 **[docs/STANDALONE.md](./docs/STANDALONE.md)**。

## 与 oclivenewnew 联调（简要）

1. 在本编写器中导出 zip 并解压，或使用「写入文件夹」指向某一目录，使该目录作为 roles 根且其下出现 `{roleId}/pipeline.ocblueprint`。  
2. 将 **该 roles 根** 配置为 **`OCLIVE_ROLES_DIR`**。  
3. 在 oclivenewnew 中通过 **`load_role`** 加载；权威校验以运行时为准。

## 脚本

| 命令 | 作用 |
|------|------|
| `scripts/start.bat`（Windows） | 交互选 Tauri 或浏览器；`scripts/start.bat tauri` / `scripts/start.bat web` 跳过询问 |
| `npm run dev` | 仅起 Vite（无 `--open`；`tauri dev` 的前置命令与此相同，避免双开浏览器） |
| `npm run dev:browser` | 浏览器开发 + 自动打开 `localhost:5173` |
| `npm run build` | 生产构建（`dist/`，供 Tauri `distDir` 使用） |
| `npm test` | Vitest（导入/导出 roundtrip、记忆与身份模板、路径安全、Stable v4 / v2 兼容校验与包检查） |
| `npm run test:character-cards` | 运行不含第三方正文的 Character Card 自动化矩阵：规范容器、字段映射、已观察平台方言及恶意/损坏输入；生成式中性夹具进入普通本地测试 |
| `npm run audit:character-cards` | 对 `OCLIVE_CHARACTER_CARD_CORPUS` 指定的本机样本目录执行离线转换巡检；可用 `OCLIVE_CHARACTER_CARD_AUDIT_REPORT` 输出不含角色正文的 JSON 结构报告。第三方样本不进入仓库或普通 CI |
| `npm run test:e2e` | Playwright 冒烟（需先 `npm run build`；首次可执行 `npm run test:e2e:install` 安装浏览器） |
| `npm run tauri:dev` | Tauri 开发窗口 |
| `npm run tauri:build` | Tauri 打包（安装包 / 可执行文件） |
| `npm run cargo:build` | 仅编译 `src-tauri`（不跑完整 `tauri build` 安装器） |
| `npm run wasm:build` | （可选）安装 [wasm-pack](https://rustwasm.github.io/wasm-pack/installer/) 后，在**本仓库根目录**执行 `node scripts/wasm-pack-build.mjs`，默认将相邻 **`../oclivenewnew/kernel/crates/oclive_validation_wasm`** 输出到 `src/wasm/pkg/`。可用 **`OCLIVE_VALIDATION_WASM_CRATE`**、**`OCLIVE_VALIDATION_CRATE`**、**`OCLIVE_WASM_OUT`** 覆盖路径。未构建时保留占位 stub，回退 TypeScript 校验 |
| `npm run contract:json-keys` | 对比 `jsonKeys.ts` 与相邻克隆的 **oclivenewnew** `kernel/crates/oclive_validation/src/json_keys.rs` 顶层键；不一致时非零退出（见 [CONTRIBUTING.md](./CONTRIBUTING.md)） |

## 源码布局（简要）

| 路径 | 说明 |
|------|------|
| `src/composables/usePackEditor.ts` | 编辑区状态、持久化、导入/导出、校验与简单表单同步 |
| `src/components/pack/` | 开始页、简单/高级创作面板、导出确认与情绪图控件 |
| `src/lib/` | zip/文件夹导出、`importPack`、契约校验、`simpleCreation`、`exportPrepare`、`knowledgeFiles` / `knowledgeFrontMatter` / `knowledgeHitPreview`（知识路径、front matter、命中预览）等 |
| `scripts/wasm-pack-build.mjs` | `npm run wasm:build`：调用 wasm-pack 并支持环境变量覆盖路径 |
| `e2e/` | Playwright 冒烟用例；`playwright.config.ts` 使用 `vite preview` |

## 实现要点（维护者）

- **JSON 解析**：`parsePackDocuments`（`src/lib/packChecks.ts`）为单一入口；**运行全部检查**（`runAllPackChecks`）与 **导出前置**（`prepareExportPayload` → `exportPrepare.ts`）都基于它，避免对同一段 manifest/settings 文本重复 `JSON.parse`。
- **导出前置**：`usePackEditor` 内 `tryBuildExportPayload()` 统一「简单模式写回 → 可选全量检查 → 取 roleId」；底部 **操作反馈** 区分成功（绿）与失败（红），由 `lastMessage` + `lastMessageIsError` 驱动。
- **无障碍**：高级创作 Tab 条支持 **左右方向键** 切换、`Home` / `End` 跳首尾（焦点在 Tab 列表上时）。
- **开发双开浏览器**：`beforeDevCommand` 使用 `npm run dev`（`vite` 无 `--open`）；需要自动打开浏览器时用 **`npm run dev:browser`** 或 **`scripts/start.bat`** 选「仅浏览器」。

## 发布 / 联调前自检

1. `npm ci`（或 `npm install`）  
2. `npm test` → `npm run build`  
3. 若需 E2E：`npm run test:e2e:install` 后 `npm run test:e2e`（仅验证静态页；日常改 UI 不必跑）  
4. 桌面壳：`npm run tauri:dev` 验证窗口与「写入文件夹」；发布安装包用 `npm run tauri:build`  

将导出得到的 `{roleId}/` 放入 oclive 的 **roles 根**，并设置 **`OCLIVE_ROLES_DIR`** 后在运行时侧验证（见上文「与 oclivenewnew 联调」）。

## CI

推送或 PR 至 `main` / `master` 时，GitHub Actions 会按 **`.github/oclive-validation-ref`** 锁定的提交检出 `oclivenewnew` 并执行 **`npm run wasm:build`**（需 **`wasm32-unknown-unknown`** 与 **wasm-pack**），再 **`npm test`**、**`npm run build`**、**Playwright 冒烟**（`npm run test:e2e`，**Ubuntu 与 Windows 矩阵各跑一遍**）与 **`cargo build --manifest-path src-tauri/Cargo.toml`**（双系统 + Tauri；Linux 额外安装 WebKit 构建依赖）。也可在 Actions 中 **手动运行** 同一工作流。

## 校验策略

- **默认**：与 `oclivenewnew` 共享 crate **`oclive_validation`** 的 TypeScript 侧检查；若已执行 **`npm run wasm:build`**，则「运行全部检查」优先调用 wasm 中的 **`validateManifestWasm`**（与 Rust **`validate_disk_manifest`** 同源）。  
- **权威校验**仍以运行时 **`load_role`** 为准。路线图见 **`creator-docs/role-pack/EDITOR_VALIDATION_ROADMAP.md`**（两仓库不合并，仅共享校验 crate）。

## 许可证

MIT，见本仓库根目录 `LICENSE`。
