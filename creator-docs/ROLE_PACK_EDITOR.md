# 角色包编辑器（编写器）

桌面版 **oclive-pack-editor**（Tauri）侧栏 **「角色包」** 入口：

1. **打开角色包目录**：选择含 **`pipeline.ocblueprint`** 的 v2 角色包根目录（与 `ROLE_PACK_SPEC` 一致）。legacy `manifest.json` 包须先用 `oclive pack migrate-to-blueprint` 迁移。
2. **表单 / JSON**：表单编辑常用字段与七维、`plugin_backends` 六槽 + `agent`（编辑器内拆为「角色门面 meta 视图」与「运行时 settings 视图」）；JSON 模式直接改全文；切回表单前会校验 JSON 语法。
3. **校验**：构建 v2 蓝图并走 **`validate_blueprint_v2_json`**（桌面 Tauri，与 `pack validate` 默认 profile 同源）；浏览器开发时回退 TypeScript 子集检查。
4. **回复质量锚点**：运行时 SSOT 为蓝图 **`meta.reply_quality_anchor`**（空则沿用内核 `DEFAULT_REPLY_QUALITY_ANCHOR`）。导出时**双写**：JSON 保留在 `pipeline.ocblueprint` → `meta`，并可选镜像至 **`prompts/reply_quality_anchor.md`**（人类可读，非运行时真源）。预设见 `replyQualityAnchorPreset.ts`。
5. **记忆与身份边界**：高级创作分别编辑只读种子 **`memory_seed.json`** 与 **`user_identities/*.md` + `index.json`**。前者只提供创作者预置事件，不是运行时长期/短期记忆；后者可独立于角色核心人设搬运。
6. **保存**：校验通过后可写回 **`pipeline.ocblueprint`**（及 `prompts/reply_quality_anchor.md`、`config.json`、`memory_seed.json`、`user_identities/` 等附属文件）；不保留 legacy 三件套。保存时保留主应用写入的扩展字段、未知 `meta` 字段和多实例 `slot_registry`；仅对编写器实际编辑的 slot 类型更新 backend/plugin。zip / ocpak 导入后，路径安全且不由编写器直接编辑的卫星文件会在再次导出时透传。

构建编写器 Tauri 壳时，需在同级目录提供 **oclivenewnew** 仓库（`../../oclivenewnew/kernel/crates/oclive_validation`），与 CI 浅克隆布局一致。

权威格式见主仓：`creator-docs/role-pack/ROLE_PACK_SPEC.md`。

## 专家路由配置

- **运行时权威**：`roles/{id}/blueprint/includes/expert_routing.json`，由专家路由专用加载器读取；它不是蓝图通用 `includes[]` 的合法 target。
- **配置入口**：**A.I.Live（oclivenewnew）** → **Ctrl+Shift+F** → 插件与后端管理 → **架构图** → **专家模型设施**（齿轮）→ 保存路由。
- **编写器不负责**生成或校验 `expert_routing.json`（无对应编辑页）。
- 文档：[OCLIVE_ARCHITECTURE_OVERVIEW § 专家模型设施子模块](https://github.com/linkaiheng2233-cyber/oclivenewnew/blob/main/creator-docs/getting-started/OCLIVE_ARCHITECTURE_OVERVIEW.md)、[ROLE_PACK_SPEC §2.6](https://github.com/linkaiheng2233-cyber/oclivenewnew/blob/main/creator-docs/role-pack/ROLE_PACK_SPEC.md)。

## 保存与蓝图扩展字段

| 字段 | 典型来源 | 编写器保存后 |
|------|----------|----------------|
| `meta` / `slot_registry` | 编写器表单或 JSON 视图 | 更新编写器管理字段；未知 meta 字段和多实例 slot **保留** |
| `includes` | 主应用或手工编辑蓝图 | **保留**（若保存前已存在） |
| `groups` | 主应用架构图 | **保留** |
| `expert_overlay` | 主应用或手工 | **保留** |
| `runtime_config` | 主应用或手工 | **保留** |

> 编写器当前编辑器契约为 v2。遇到 v3 / dual-core 蓝图时，编写器会阻止按 v2 编辑保存；应先使用主应用完成 v3 集成配置。

卫星文件（如 `blueprint/includes/expert_routing.json`）不在编写器保存流程中删除；请勿在不了解包结构时手动删除 `blueprint/` 目录。
