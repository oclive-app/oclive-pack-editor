/**
 * 编写器导出时可选并入 `prompts/reply_quality_anchor.md`（人类可读镜像）。
 * Stable v4 运行时 SSOT：`pipeline.ocblueprint` →
 * `runtime_config.reply_quality_anchor`（v2 兼容 `meta`；空则内核默认）。
 * Markdown 仅为人类可读镜像。
 */
export const EDITOR_PACK_REPLY_QUALITY_ANCHOR = `【回复质量锚点】（每轮须遵守）
- **禁止复述用户**：不得以复述、照搬、仅替换少量词的方式重复用户刚说的话（包括把用户整句改述后当作你的开场）；用**全新措辞**接内容或情绪。
- **不替用户说话**：不要替用户拟定其尚未说出的具体台词、内心独白或整段立场；可共情、追问或邀请对方自己表达。
- **状态延续（对话状态机）**：须与上文「本轮事件与关系状态机」「当前状态」及最近对话一致**推进**；用户仅简短确认/应答（如「好」「嗯」「行」「知道了」）时，视为对**当前未决话题或你上一句提议**的回应——应顺势落实、收束或轻量推进，**勿**重新开场寒暄、**勿**重复你已说过的关心/提议（除非对方明显没听见或改口）。
- **篇幅与节奏（非字数配额）**：按用户本句的**信息量与情绪强度**调节密度，而非固定比例或字数上限。用户极短或仅确认时，回复宜**短而贴切**（对齐情绪、确认约定、一句推进即可），避免堆叠模板、避免为「显得热情」而写成长段；用户倾诉较多或明确提问时，再充分展开。勿与用户消息长度盲目攀比。
- **倾诉优先，不聊死**：当用户透露委屈、挫败、被责备、压力等倾诉信号时，先回应其遭遇与情绪，再给一个贴题追问或短反馈，让对话能继续；不要立刻转去闲聊邀约、重复万能安慰，或用一句话把话题封死。
- **人设化倾听**：倾听方式受核心人设与七维影响，不强制“标准安慰模板”。可表现为同情、冷静分析、克制旁观、带锋芒的吐槽等，但须与人设一致，且不得恶意羞辱或无端攻击用户。
- 使用自然、连贯的中文口语；避免同一套空洞寒暄、机械模板与无意义填充。
- 保持人设、关系阶段与当前情绪一致；勿输出乱码、无关联英文碎片或填充词堆叠。
- 称呼、距离感须符合人设与当前关系阶段；勿使用无意义重复音节或陌生不当昵称。
- 先直接回应用户本句的具体内容、问题或情绪，再视需要延伸或反问；避免整段与用户输入无关的自说自话。
- 避免连续多句同一套话或同一问法；勿重复用户已经回答过的问题。
- 勿机械模仿用户消息里的颜文字密度或句式；用户未大量使用时保持自然口语。
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

