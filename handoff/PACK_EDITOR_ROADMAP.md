# 编写器能力路线图（立绘 catalog · 视觉舞台）

**状态**：2026-08-20 与 RFC 及当前实现对齐；**代码分阶段见** [PORTRAIT_VISUAL_PRESENTATION_IMPLEMENTATION_PLAN.md](../oclivenewnew/handoff/PORTRAIT_VISUAL_PRESENTATION_IMPLEMENTATION_PLAN.md)（路径随本机 monorepo 根调整）。

**RFC**： [RFC_PORTRAIT_FACILITY.md](../oclivenewnew/creator-docs/rfc/RFC_PORTRAIT_FACILITY.md) · [RFC_VISUAL_PRESENTATION_FACILITY.md](../oclivenewnew/creator-docs/rfc/RFC_VISUAL_PRESENTATION_FACILITY.md)

---

## 已收敛（v0.3 现状）

| 项 | 说明 |
|----|------|
| 立绘标签 | 内核 `Emotion` **7 类**；`pick_portrait_emotion` ALLOWED 同上 |
| 前端 | `emotion-assets.ts` + `CharacterInfo` 文件名候选 |
| 编写器 | 简单/高级共用 `EmotionAssetsControl`（批量 pick/append） |
| 导出 | `assets/images/{原文件名}` |

**下一共识**：文件名 **不再** SSOT；**catalog `id` + AI 表现导演**（第 3 设施 RFC）。

---

## Phase A — 简单创作 · 7 槽（编写器 Phase 2）

| 能力 | 说明 |
|------|------|
| UI | 7 固定槽（happy…shy）；无 append / 无簇 |
| 导出 | 生成 `config.json` → `portrait_catalog` 7 条 + `enabled: true` |
| 命名 | 文件名任意；槽位绑定 `id` + 默认 `desc` |
| 检查 | 缺槽警告（可配置是否阻断导出） |

**内核依赖**：主仓 Phase 1 catalog 读取（可先 JSON 手测）。

---

## Phase B — 高级创作 · catalog 编辑（编写器 Phase 2）

| 能力 | 说明 |
|------|------|
| 簇 | 追加条目、`cluster` 标签、多 `desc` |
| 预览 | 条目列表 + 缺失 tag 提示（非文件名） |
| 导出 | 完整 `portrait_catalog.assets[]` |

**暂缓合入内核 Phase 3 前**：高级包在主程序仍可按 legacy 文件名显示。

---

## Phase C — 角色舞台 · 视觉表现（编写器 Phase 4+）

| 能力 | 说明 |
|------|------|
| UI | 高级折叠：`visual_presentation.enabled`、backend、Live2D/3D 资源路径 |
| 校验 | backend 与 catalog `kind` 一致性提示 |
| 发行版 | 导出备注「需 Chat Pro / Theater profile」 |

**内核依赖**：主仓 Phase 4–5。

---

## Phase D — 分级导出（多发行版 · 原 Phase C）

| Profile | 立绘 catalog | 视觉表现 |
|---------|--------------|----------|
| `vscode-lite` | 7 槽或精简 catalog | off |
| `desktop-full` | 完整 catalog | image / live2d 可选 |
| `theater` | 完整 + 多 kind | stage_full |

落点：`exportPack.ts` profile 分支 + UI 单选（与 [VSCODE_DISTRIBUTION.md](../oclivenewnew/creator-docs/role-pack/VSCODE_DISTRIBUTION.md) 对齐）。

---

## Phase F — 成人角色扩展（实现已落地 · 内测推进）

成人扩展现在是角色工程中的独立页面。只有完整基础角色包通过校验后才能进入；页面编辑成人状态人设、对话指导、节奏和各基础场景走向，统一写入根文件 `adult_extension.json`，并随完整包导入、草稿保存和导出。简单编辑、高级编辑与成人扩展共享同一个规范化数据模型，不生成独立 DLC 包。

首发边界：外部角色卡转换不判断或生成成人扩展；持久化、重置、错误隔离、前后端上限和实际内容效果继续在内测验证，不阻塞基础编写器与 Character Card 转换发布。

---

## Phase G — 角色语音侧车（实现已落地 · 内测推进）

高级创作可编辑 `voice_profile.json`，只表达随角色携带的语音建议，不覆盖 Chat Pro 的全局 TTS、声线安装和设备设置。真实播报、取消/重试、长回复切分、设备兼容与人工听感在内测推进；不内置或分发未经授权的克隆声线，也不作为基础编写器首发阻断项。

---

## 优先级（2026-08 共识）

1. 冻结基础角色包编辑、导出和 Character Card 转换边界，完成编写器与 Chat Pro 配套发布。
2. 普通本地门禁运行中性生成式格式矩阵；另用本机、不入库的公开样本持续巡检 V1/V2/V3、PNG/APNG/CHARX，只按重复出现的真实失败补兼容。
3. R18 与语音在内测推进配置、设备与人工体验验证，不扩大首发承诺。
4. 主仓 Phase 4–5 + 编写器 Phase C（Live2D / Theater）按运行时成熟度继续推进。

---

## 废弃说明

原 roadmap **Phase B「情绪族 / 扩展 Emotion 枚举」** 由 **portrait_catalog + AI 选 id** 取代，**不**扩展 `Emotion` 七类枚举。
