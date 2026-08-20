/**
 * 编写器导出时可选并入 `prompts/reply_quality_anchor.md`（人类可读镜像）。
 * Stable v4 运行时 SSOT：`pipeline.ocblueprint` →
 * `runtime_config.reply_quality_anchor`（v2 兼容 `meta`；空则内核默认）。
 * Markdown 仅为人类可读镜像。
 */
export const EDITOR_PACK_REPLY_QUALITY_ANCHOR = `【角色表现优化】（每轮须遵守）
- **身份稳定**：外观、年龄、经历与核心性格以角色档案为准；切换场景只改变角色此刻在哪里、在做什么，不改变角色是谁。
- **分清性格底色与触发特征**：平时优先表现角色的常态；害羞、嘴硬、暴躁、疏离等强特征只在档案写明的条件出现时增强，勿把一个醒目标签机械演成每轮固定开场。
- **反应与行动优先**：先给出符合人设的态度、小动作或新信息，再按需要追问或展开；避免把回复写成脱离角色的通用说明。
- **口语有呼吸感**：开场和句式自然变化，可用一句短反应接一两句展开；用户信息少时简洁，倾诉、追问或剧情信息多时再充分回应，勿为显得热情而注水。
- **关心短而贴题**：一次只承接当前话题中的一个具体点；勿把互不相关的提醒、建议和问题打包输出，也勿重复上一轮已经表达过的关心。
`

export function shouldPromptReplyQualityAnchor(settings: Record<string, unknown>): boolean {
  const v = settings['reply_quality_anchor']
  if (v === undefined || v === null) return true
  if (typeof v === 'string') return v.trim() === ''
  return false
}

export function mergeEditorReplyQualityAnchor(
  settings: Record<string, unknown>,
  include: boolean,
): Record<string, unknown> {
  if (!include) return { ...settings }
  return {
    ...settings,
    reply_quality_anchor: EDITOR_PACK_REPLY_QUALITY_ANCHOR,
  }
}

/** 预设分类（用于下拉分组） */
export type ReplyAnchorCategory = 'default' | 'concise' | 'detailed' | 'roleplay'

export type ReplyAnchorPresetItem = {
  id: string
  category: ReplyAnchorCategory
  /** i18n key under `packEditor.rolePack.anchor.presets` */
  labelKey: string
  body: string
}

const ANCHOR_CONCISE = `【回复质量锚点】（简洁模式）
- 先直接回应用户本句，再视需要一句追问或收束；用户极短确认时回复宜短。
- 禁止复述用户原句；不替用户编造未说出的台词。
- 保持人设与关系阶段一致；自然口语，避免模板堆砌。
`

const ANCHOR_DETAILED = `【回复质量锚点】（详细模式）
- 在贴题前提下可充分展开：解释背景、给出步骤或情绪承接，但仍须先对准用户本句核心。
- 禁止复述用户原句；不替用户编造未说出的立场或整段独白。
- 倾诉信号时先承接情绪再给可继续对话的轻量推进；避免空洞万能安慰。
- 保持人设、关系与情绪一致；避免乱码与无意义填充。
`

const ANCHOR_ROLEPLAY = `【回复质量锚点】（角色扮演模式）
- 以第一人称沉浸扮演，但不得替用户说话或抢写用户台词。
- 先回应用户本句的动作/情绪/对白，再顺势推进场景；勿脱离上下文自说自话。
- 篇幅随戏量调节：短打戏短回，长对手戏可充分但忌注水重复。
- 保持人设边界：可带刺或冷淡，但不得恶意羞辱用户。
`

/** 编写器内可选锚点正文（与导出默认 `EDITOR_PACK_REPLY_QUALITY_ANCHOR` 并列） */
export const REPLY_ANCHOR_PRESETS: ReplyAnchorPresetItem[] = [
  {
    id: 'editor_default',
    category: 'default',
    labelKey: 'editorDefault',
    body: EDITOR_PACK_REPLY_QUALITY_ANCHOR,
  },
  { id: 'concise', category: 'concise', labelKey: 'concise', body: ANCHOR_CONCISE },
  { id: 'detailed', category: 'detailed', labelKey: 'detailed', body: ANCHOR_DETAILED },
  { id: 'roleplay', category: 'roleplay', labelKey: 'roleplay', body: ANCHOR_ROLEPLAY },
]

export const REPLY_ANCHOR_CATEGORY_ORDER: ReplyAnchorCategory[] = [
  'default',
  'concise',
  'detailed',
  'roleplay',
]

export function getReplyAnchorPresetById(id: string): ReplyAnchorPresetItem | undefined {
  return REPLY_ANCHOR_PRESETS.find((p) => p.id === id)
}

/** 若当前正文与某预设完全一致则返回其 id，否则 `custom` */
export function matchReplyAnchorPresetId(anchorText: string): string {
  const t = anchorText.trim()
  for (const p of REPLY_ANCHOR_PRESETS) {
    if (p.body.trim() === t) return p.id
  }
  return 'custom'
}

