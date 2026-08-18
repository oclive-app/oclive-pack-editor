/**
 * 高级创作：「常见问题 → 展开看改法」(改进前 / 改进后对照)
 * 荧光笔：对 highlightAfter / highlightBefore 中的片段在示例里加亮（便于对照学习）。
 */

export type AdvFaqItem = {
  id: string
  /** 大白话问句（当标题点） */
  question: string
  /** 人话解释，尽量短、好懂 */
  plainExplain: string
  beforeCode: string
  afterCode: string
  /** 在「改进后」里要高亮的片段（可多个；会合并区间避免重叠歧义） */
  highlightAfter?: readonly string[]
  /** 在「改进前」里要高亮的片段（可选） */
  highlightBefore?: readonly string[]
}

/** 把代码按「要高亮的子串」切成片段，用于 <mark> */
export function buildHighlightSegments(
  code: string,
  tokens: readonly string[] | undefined,
): { text: string; hl: boolean }[] {
  if (!code) return [{ text: '（这里为空）', hl: false }]
  if (!tokens?.length) return [{ text: code, hl: false }]
  const ranges: { start: number; end: number }[] = []
  for (const t of tokens) {
    if (!t) continue
    const i = code.indexOf(t)
    if (i !== -1) ranges.push({ start: i, end: i + t.length })
  }
  if (!ranges.length) return [{ text: code, hl: false }]
  ranges.sort((a, b) => a.start - b.start)
  const merged: { start: number; end: number }[] = []
  for (const r of ranges) {
    const last = merged[merged.length - 1]
    if (!last || r.start > last.end) merged.push({ ...r })
    else last.end = Math.max(last.end, r.end)
  }
  const out: { text: string; hl: boolean }[] = []
  let pos = 0
  for (const r of merged) {
    if (r.start > pos) out.push({ text: code.slice(pos, r.start), hl: false })
    out.push({ text: code.slice(r.start, r.end), hl: true })
    pos = r.end
  }
  if (pos < code.length) out.push({ text: code.slice(pos), hl: false })
  return out
}

export const MANIFEST_FAQ: readonly AdvFaqItem[] = [
  {
    id: 'm-rename',
    question: '角色显示名字想换一个，要改哪一行？',
    plainExplain:
      '找带「name」的那一行就行。只改两个引号中间的字，外面的英文 name 和逗号别动。',
    beforeCode: `"name": "旧展示名",`,
    afterCode: `"name": "新展示名",`,
    highlightAfter: ['新展示名'],
    highlightBefore: ['旧展示名'],
  },
  {
    id: 'm-scenes',
    question: '想多加一个场景（比如咖啡馆），怎么写？',
    plainExplain:
      '找到 scenes 那一行，方括号里用英文逗号隔开多个场景 id。id 最好和文件夹 scenes/ 下面一致。',
    beforeCode: `"scenes": ["home", "school"],`,
    afterCode: `"scenes": ["home", "school", "cafe"],`,
    highlightAfter: ['cafe'],
  },
  {
    id: 'm-new-relation',
    question: '我想加一种「恋人」身份，和用户自定义关系，怎么加？',
    plainExplain:
      '在 user_relations 里多写一块：左边键名自己取（英文小写比较好），右边四行照抄改字。最后检查 default_relation 是不是你想默认进门的那种。',
    beforeCode: `"user_relations": {
  "friend": {
    "display_name": "好友",
    "prompt_hint": "你们是好朋友",
    "favor_multiplier": 1.0,
    "initial_favorability": 50
  }
},
"default_relation": "friend",`,
    afterCode: `"user_relations": {
  "friend": {
    "display_name": "好友",
    "prompt_hint": "你们是好朋友",
    "favor_multiplier": 1.0,
    "initial_favorability": 50
  },
  "lover": {
    "display_name": "恋人",
    "prompt_hint": "你们在交往，说话可以更亲昵。",
    "favor_multiplier": 1.15,
    "initial_favorability": 65
  }
},
"default_relation": "lover",`,
    highlightAfter: ['lover', '"恋人"', '"你们在交往'],
    highlightBefore: ['"default_relation": "friend"'],
  },
  {
    id: 'm-default-rel',
    question: '身份已经写好了，只想改「默认一进来是哪个」？',
    plainExplain: '只动 default_relation 引号里的键名，必须和上面 user_relations 里已有的一致。',
    beforeCode: `"default_relation": "lover",`,
    afterCode: `"default_relation": "friend",`,
    highlightAfter: ['friend'],
    highlightBefore: ['lover'],
  },
  {
    id: 'm-personality',
    question: '七维性格想微调，数字怎么改？',
    plainExplain:
      '找 default_personality，一共 7 个小数，都在 0～1 之间。顺序固定：倔强、黏人、敏感、强势、宽容、话多、温暖。',
    beforeCode: `"default_personality": [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],`,
    afterCode: `"default_personality": [0.4, 0.6, 0.5, 0.3, 0.7, 0.5, 0.6],`,
    highlightAfter: ['0.4', '0.6', '0.3', '0.7'],
  },
  {
    id: 'm-knowledge',
    question: '想在 manifest 里先开关知识库，怎么写？',
    plainExplain:
      'enabled 管开不开；glob 管扫哪些 md。若你同时在 settings 里也写了 knowledge，以后加载时往往听 settings 的，两处最好写一致。',
    beforeCode: `"knowledge": {
  "enabled": false,
  "glob": "knowledge/**/*.md"
},`,
    afterCode: `"knowledge": {
  "enabled": true,
  "glob": "knowledge/**/*.md"
},`,
    highlightAfter: ['true'],
    highlightBefore: ['false'],
  },
  {
    id: 'm-note',
    question: '想给自己留句备忘，不影响玩家，行吗？',
    plainExplain: '可以。自己建一个以下划线开头的键，写啥都行，游戏里一般会忽略。',
    beforeCode: `(没有这行)`, 
    afterCode: `"_我的备忘": "发布前换封面",`,
    highlightAfter: ['_我的备忘', '发布前换封面'],
  },
]

export const SETTINGS_FAQ: readonly AdvFaqItem[] = [
  {
    id: 's-inference-profile',
    question: '想给角色写一套理想推理参数，改哪里？',
    plainExplain:
      '在 inference_profile 里填写采样、输出长度、上下文与推理倾向。这些是角色包的可移植理想值；实际后端、模型和 GGUF 始终由 Chat Pro 设置页决定。',
    beforeCode: `(没有这个对象)`,
    afterCode: `"inference_profile": {
  "generation": {
    "temperature": 0.8,
    "preferred_output_tokens": 1024,
    "maximum_output_tokens": 2048
  },
  "context": {
    "minimum_tokens": 8192,
    "preferred_tokens": 16384
  },
  "reasoning": {
    "mode": "adaptive",
    "effort": 0.6
  }
},`,
    highlightAfter: ['inference_profile', 'temperature', 'preferred_tokens', 'adaptive'],
  },
  {
    id: 's-evolution',
    question: '事件对好感影响太强或太弱，想调一调？',
    plainExplain:
      '事件强度主要看 evolution.event_impact_factor（数字大 → 事件对「档案演化」更明显）。另可配合 max_change_per_event 控制单轮更新「可变性格档案」的步子。若 personality_source=profile，可变档案全文由对话模型维护，创作者不能手写，只能通过上述数值调强弱。',
    beforeCode: `"evolution": {
  "event_impact_factor": 1.0,
  "ai_analysis_interval": 15,
  "max_change_per_event": 0.05,
  "max_total_change": 0.5
},`,
    afterCode: `"evolution": {
  "event_impact_factor": 1.2,
  "ai_analysis_interval": 15,
  "max_change_per_event": 0.05,
  "max_total_change": 0.5
},`,
    highlightAfter: ['1.2'],
    highlightBefore: ['1.0'],
  },
  {
    id: 's-personality-profile',
    question: '想让核心性格档案当轴心、七维只当参考？',
    plainExplain:
      '在 evolution 里加 "personality_source": "profile"。「可变性格档案」在运行时由模型根据对话更新；七维多为从核心正文归纳的视图。能调的是 event_impact_factor、max_change_per_event 等，不能预设可变档案正文。',
    beforeCode: `"evolution": {
  "event_impact_factor": 1.0,
  "max_change_per_event": 0.05
},`,
    afterCode: `"evolution": {
  "personality_source": "profile",
  "event_impact_factor": 1.0,
  "max_change_per_event": 0.05,
  "max_total_change": 0.5
},`,
    highlightAfter: ['profile'],
    highlightBefore: [],
  },
  {
    id: 's-identity-binding',
    question: '身份想「全场景一套」还是「按场景换」？',
    plainExplain:
      'global = 全局一套身份；per_scene = 可以按场景换（manifest 里要多配几种身份）。按你故事需要选。',
    beforeCode: `"identity_binding": "global",`,
    afterCode: `"identity_binding": "per_scene",`,
    highlightAfter: ['per_scene'],
    highlightBefore: ['global'],
  },
  {
    id: 's-memory',
    question: '记忆里场景影响想加强一点，调哪个？',
    plainExplain:
      'memory_config.scene_weight_multiplier 调大，场景相关记忆会更被强调。下面 topic_weights 是进阶细调。',
    beforeCode: `"memory_config": {
  "scene_weight_multiplier": 1.0,
  "topic_weights": {
    "home": { "日常": 1.0 }
  }
},`,
    afterCode: `"memory_config": {
  "scene_weight_multiplier": 1.2,
  "topic_weights": {
    "home": { "日常": 1.0 }
  }
},`,
    highlightAfter: ['1.2'],
    highlightBefore: ['1.0'],
  },
  {
    id: 's-mode',
    question: '默认想偏「沉浸」还是「纯聊天」？',
    plainExplain:
      'immersive 偏沉浸扮演；pure_chat 偏少旁白。玩家以后还能在软件里改，这里只是包里的默认值。',
    beforeCode: `"interaction_mode": "pure_chat",`,
    afterCode: `"interaction_mode": "immersive",`,
    highlightAfter: ['immersive'],
    highlightBefore: ['pure_chat'],
  },
  {
    id: 's-remote-presence',
    question: '希望玩家一打开时「异地心声」默认就勾上，改哪？',
    plainExplain:
      'remote_presence.default_enabled 改成 true。大段异地文案还是在 manifest，这里只管默认勾不勾。',
    beforeCode: `"remote_presence": {
  "default_enabled": false
},`,
    afterCode: `"remote_presence": {
  "default_enabled": true
},`,
    highlightAfter: ['true'],
    highlightBefore: ['false'],
  },
  {
    id: 's-llm-backend',
    question: '对话一定要走本机吗？「remote」是啥？',
    plainExplain:
      '平时写 ollama 就行。改成 remote 表示要走远程 HTTP 模型，还得配环境变量，零基础建议先别动，等有需要再看官方文档。',
    beforeCode: `"llm": "ollama"`,
    afterCode: `"llm": "remote"`,
    highlightAfter: ['remote'],
    highlightBefore: ['ollama'],
  },
  {
    id: 's-knowledge',
    question: '在 settings 里开关知识库、改扫描路径，怎么写？',
    plainExplain:
      '和 manifest 里的 knowledge 会合并，通常以 settings 为准；两处都写时请保持一致，避免自己搞混。',
    beforeCode: `"knowledge": {
  "enabled": false,
  "glob": "knowledge/**/*.md"
},`,
    afterCode: `"knowledge": {
  "enabled": true,
  "glob": "knowledge/**/*.md"
},`,
    highlightAfter: ['true'],
    highlightBefore: ['false'],
  },
]

export const CORE_FAQ: readonly AdvFaqItem[] = [
  {
    id: 'c-habits',
    question: '核心性格档案里，怎么写「说话习惯」比较好？',
    plainExplain:
      '就当给朋友写备忘录：口癖、急的时候怎么说、对陌生人 vs 熟人。不用代码格式，分段写最清楚。',
    beforeCode: `（还没写习惯，只有一句性格）`,
    afterCode: `口癖：句尾爱加「…嗯？」。
着急时会重复同一句话。
对陌生人短句礼貌，对熟人会多吐槽两句。`,
    highlightAfter: ['口癖', '着急时', '陌生人'],
  },
  {
    id: 'c-taboo',
    question: '怕模型乱说话，想加「禁忌」怎么写？',
    plainExplain:
      '用几条「不要…」列出来就行，越具体越好。这样主对话更稳。',
    beforeCode: `（没有写禁忌）`,
    afterCode: `禁忌：
- 不编造用户没提过的隐私。
- 不用侮辱性称呼叫用户。`,
    highlightAfter: ['禁忌', '不编造'],
  },
]

export const CREATOR_MSG_FAQ: readonly AdvFaqItem[] = [
  {
    id: 'u-one',
    question: '只想导出一句寄语给玩家，怎么写？',
    plainExplain:
      '选「整包一句」模式，然后第一行写你想说的话就行。下面空行或第二行可能不会导出，别指望当正文。',
    beforeCode: `第一行：感谢游玩
第二行：这行可能不会被导出`,
    afterCode: `感谢游玩，祝对话愉快！`,
    highlightAfter: ['感谢游玩，祝对话愉快！'],
  },
  {
    id: 'u-multi',
    question: '想好多条随机寄语，一行一条，怎么弄？',
    plainExplain:
      '选「按行多条」，每一行单独是一条。别用空行隔开当「一条」，按行算。',
    beforeCode: `今天也要开心呀`,
    afterCode: `今天也要开心呀
谢谢支持
欢迎回来`,
    highlightAfter: ['谢谢支持', '欢迎回来'],
  },
]

export const KNOWLEDGE_FILE_FAQ: readonly AdvFaqItem[] = [
  {
    id: 'kf-new',
    question: '第一次写知识文件，最少要长什么样？',
    plainExplain:
      '上下各三条横线中间写头信息，下面写正文。id、tags 之类可以照抄再改词。',
    beforeCode: `（空文件）`,
    afterCode: `---
id: my_note
tags: 关键词一, 关键词二
scenes: [home]
weight: 1.0
---

这里写世界观正文，支持 Markdown。`,
    highlightAfter: ['id: my_note', 'weight: 1.0', '世界观正文'],
  },
  {
    id: 'kf-tags',
    question: '想让人更容易搜到这条知识，改哪里？',
    plainExplain:
      '改 tags 那一行，多个词用英文逗号隔开。weight 大一点也会更「显眼」（在检索里）。',
    beforeCode: `tags: 咖啡`,
    afterCode: `tags: 咖啡, 排队, 晚高峰`,
    highlightAfter: ['排队', '晚高峰'],
    highlightBefore: ['咖啡'],
  },
  {
    id: 'kf-weight',
    question: '想让这条知识在检索里更「重」一点？',
    plainExplain:
      '调 weight，数字越大越容易被强调（和别的条目比）。别调到离谱，先小步试。',
    beforeCode: `weight: 1.0`,
    afterCode: `weight: 1.4`,
    highlightAfter: ['1.4'],
    highlightBefore: ['1.0'],
  },
]

export const KNOWLEDGE_PREVIEW_FAQ: readonly AdvFaqItem[] = [
  {
    id: 'kp-keywords',
    question: '预览里关键词框要怎么填才有用？',
    plainExplain:
      '假装你是玩家，打几个可能出现在对话里的词，用空格分开。用来猜哪条知识会排前面。',
    beforeCode: `（关键词为空）`,
    afterCode: `地铁 车站 晚高峰`,
    highlightAfter: ['地铁', '晚高峰'],
  },
  {
    id: 'kp-scene',
    question: '想看在某个场景下哪些知识更相关？',
    plainExplain:
      '在「预览条件：场景」里填场景 id（和 manifest 里一致）。需要更严可以勾选「仅预览匹配该场景」。',
    beforeCode: `（场景条件为空）`,
    afterCode: `场景：cafe`,
    highlightAfter: ['cafe'],
  },
  {
    id: 'kp-slider',
    question: '临时权重滑块会改我包里的文件吗？',
    plainExplain:
      '不会。只影响这个预览窗口里的分数，用来试手感。点还原或清空就回到默认。',
    beforeCode: `（未拖动滑块）`,
    afterCode: `（拖动后仅预览分数变化，不写回知识文件）`,
    highlightAfter: ['不写回'],
  },
]

export const IMAGES_FAQ: readonly AdvFaqItem[] = [
  {
    id: 'im-first',
    question: '第一次往包里放情绪图，点哪个？',
    plainExplain:
      '点「选择图片」会换掉当前列表；只想加图用「追加」。最后记得导出 / 写入文件夹。',
    beforeCode: `（还没有选任何图）`,
    afterCode: `（已选择若干张 → 摘要里会显示数量与文件名）`,
    highlightAfter: ['已选择'],
  },
  {
    id: 'im-manual',
    question: '我自己往文件夹里拷了图，还要注意啥？',
    plainExplain:
      '文件名要和游戏或配置里引用的一致；编写器列表只是帮你打包，不会自动重命名。',
    beforeCode: `happy.png（随便起名）`,
    afterCode: `emotion_happy.png（与映射配置一致）`,
    highlightAfter: ['emotion_happy.png', '一致'],
  },
]
