/**
 * 高级创作界面：白话说明与「常改键」提示（不写进 JSON，避免破坏校验）。
 */

export const ADV_OVERVIEW = [
  '这一页直接编辑角色包里的文本与 JSON，适合想精细控制、或简单创作里找不到的选项。',
  '看不懂代码也没关系：先看每个分区标题旁的问号，再展开「一般在改哪些」；需要时再展开本页下方的「重点」折叠块（默认收起，不占地方）看字段说明与常见问题。键名（英文）请保持和示例一致，逗号、引号成对，保存前可用「检查与导出」里的校验。',
] as const

export const ADV_MANIFEST = [
  '这一份是角色的「身份证 + 展示信息」：叫什么、有哪些场景、和用户是什么关系等。游戏/应用读角色时先看它。',
  '键名大多是固定的英文单词，相当于表格列名。你可以改里面的文字、数字、列表；不要随意删掉整段结构，除非你清楚后果。',
  '需要写给自己看的备注，可以用以下划线开头的名字自建字段（例如 _note），运行时一般会忽略。',
] as const

export const ADV_SETTINGS = [
  '这一段是 pipeline.ocblueprint 中面向角色创作者开放的理想配置：描述希望怎样生成回复，不选择实际模型。',
  '实际后端、基础模型、GGUF、本机路径和机器参数始终由 Chat Pro 设置页管理；这里主要调整 inference_profile、记忆与演化等可移植数值。',
  '专家模型路由（expert_routing.json）请在 A.I.Live 主应用「插件与后端管理 → 架构图」中配置，不在本编写器编辑。',
  '简单创作里有一部分同款选项；不确定字段含义时先看问号说明并在导出前运行检查。',
] as const

export const ADV_CORE_TXT = [
  '这里是「核心性格档案」：性格、说话习惯、禁忌等，会进入对话提示；运行时 AI 不得改写该正文。',
  '「可变性格档案」仅存运行时，由模型在对话后更新；你只能通过 evolution（如 max_change_per_event）调强弱。',
  '用自然语言写即可，不必写代码。段落之间空行有助于阅读；过长可能影响单次请求长度，可按需精简。',
] as const

export const ADV_CREATOR_MESSAGE = [
  '写给玩家看的短寄语，会出现在启动器等位置（只读展示）。与简单创作共用同一内容。',
  '「整包一句」只取第一条非空行；「按行多条」适合多条随机寄语。',
] as const

export const ADV_WORLD_KNOWLEDGE = [
  '每个知识文件是一段 Markdown，顶上有几行「前言区」（front matter）用 --- 包住，用来写 id、标签、场景、权重等。',
  '正文是角色世界里的常识或设定；检索时会按标签、场景、权重等参与打分。路径一般放在 knowledge/ 下。',
  '下面的「预览」只是在编写器里估算哪些条目可能更相关，和运行时略有差异，以实际对话为准。',
] as const

export const ADV_KNOWLEDGE_PREVIEW = [
  '输入玩家一句话里可能出现的词，看看哪些知识条目可能排前面。临时权重滑块只在预览里生效，用来试调参。',
] as const

export const ADV_EMOTION_IMAGES = [
  '把立绘或表情图放到包里，供界面按情绪标签显示。文件名与映射若在别处配置，需与这里选中的资源一致。',
  '支持常见图片格式。可先选图再导出，或在外部放好文件后写入文件夹。',
] as const

/** manifest 里创作者最常动到的键（非完整 schema） */
export const MANIFEST_KEY_GUIDE: readonly { key: string; say: string }[] = [
  { key: 'id', say: '角色内部 id，通常和文件夹名一致' },
  { key: 'name / version / author / description', say: '展示名、版本、作者、简介' },
  { key: 'scenes', say: '有哪些场景（字符串数组）' },
  { key: 'default_personality', say: '性格七维 0～1；选 profile 人格来源时多为视图，仍建议填写' },
  { key: 'user_relations / default_relation', say: '用户身份（好友/恋人等）与默认身份' },
  { key: 'min_runtime_version', say: '可选，最低 oclive 版本，太低会拒绝加载' },
  { key: 'knowledge', say: '是否启用知识库与文件匹配规则等' },
  { key: 'life_trajectory / life_schedule', say: '可选，异地心声、日程等进阶设定' },
  { key: '以 _ 开头的键', say: '给你自己看的备注，运行时通常忽略' },
]

/** settings 里常改项说明 */
export const SETTINGS_KEY_GUIDE: readonly { key: string; say: string }[] = [
  { key: 'schema_version', say: '兼容层契约版本号，勿随意改' },
  { key: 'inference_profile.generation', say: '温度、top_p 与理想输出长度' },
  { key: 'inference_profile.context', say: '最低与理想上下文预算' },
  { key: 'inference_profile.reasoning', say: '即时、自适应或深度推理倾向' },
  { key: 'inference_profile.performance_intent', say: '延迟、均衡或质量优先等可移植意图' },
  { key: 'memory_config / evolution', say: '记忆与演化相关参数' },
  { key: 'identity_binding / interaction_mode', say: '身份与场景绑定、交互模式' },
  { key: 'remote_presence', say: '异地相关默认开关等' },
  { key: 'plugin_backends.*（非 LLM）', say: 'memory / emotion / event / prompt 等周边模块后端类型' },
]

/** 知识文件 front matter 字段 */
export const KNOWLEDGE_META_GUIDE: readonly { key: string; say: string }[] = [
  { key: 'id', say: '本条知识的唯一 id' },
  { key: 'tags', say: '关键词标签，便于检索命中' },
  { key: 'scenes', say: '限定在哪些场景更相关，可留空表示不限制' },
  { key: 'weight', say: '权重，越大越容易被强调' },
  { key: 'event_hints', say: '与事件类型相关的提示词' },
]

/** 逐项：字段含义 + 创作者可改范围（权限） */
export type CreatorScopeRow = {
  field: string
  meaning: string
  scope: string
}

export const MANIFEST_MERGE_NOTE =
  '与蓝图运行段的关系：门面（id、name、scenes、user_relations 等）主要在 manifest；演化、身份模式、记忆、知识开关等若在运行段也有定义，会按引擎规则合并。实际模型与 GGUF 不属于角色门面，由 Chat Pro 设置页统一管理。'

export const MANIFEST_FIELD_SCOPE_GUIDE: readonly CreatorScopeRow[] = [
  {
    field: 'id',
    meaning: '角色内部 id，通常与导出目录名一致。',
    scope: '可改，但必须与文件夹名、引用路径一致；乱改会导致加载失败。',
  },
  {
    field: 'name / version / author / description',
    meaning: '展示名、版本号、作者、简介。',
    scope: '可任意改文案；不影响引擎结构。',
  },
  {
    field: 'scenes',
    meaning: '场景 id 列表（JSON 数组）。',
    scope: '可增删场景 id；id 建议与包内 scenes/ 子目录一致（若有）。',
  },
  {
    field: 'default_personality',
    meaning: '性格七维，长度 7 的数组，每项 0～1。',
    scope:
      '可逐项调小数；顺序对应：倔强、黏人、敏感、强势、宽容、话多、温暖。若 evolution.personality_source 为 profile，运行时展示条多为从正文归纳的视图，包内仍写入作默认与参考。',
  },
  {
    field: 'user_relations',
    meaning: '「用户身份」集合：每种关系一个键（自定义英文 id，如 friend、lover）。',
    scope: '可新增/删除身份键；至少保留一个；键名建议小写+下划线。',
  },
  {
    field: 'user_relations.<身份键>.display_name',
    meaning: '该身份在界面或提示里的显示名称（如「好友」「恋人」）。',
    scope: '可任意改中文或英文短名。',
  },
  {
    field: 'user_relations.<身份键>.prompt_hint',
    meaning: '告诉模型「你和用户是什么关系」的提示句。',
    scope: '可写多句、可改语气；直接影响对话里对关系的理解。',
  },
  {
    field: 'user_relations.<身份键>.favor_multiplier',
    meaning: '该身份下好感变化乘数。',
    scope: '正数即可；>1 好感涨得快，<1 更慢（具体以引擎为准）。',
  },
  {
    field: 'user_relations.<身份键>.initial_favorability',
    meaning: '切换到该身份时的初始好感（0～100）。',
    scope: '可改；用于开局或切身份时的起点。',
  },
  {
    field: 'default_relation',
    meaning: '默认选中的身份键，必须是 user_relations 里已存在的键。',
    scope: '可改为任意已有键（如从 friend 改为 lover）；不能填不存在的键。',
  },
  {
    field: 'min_runtime_version',
    meaning: '可选，要求玩家的 oclive 最低版本（semver）。',
    scope: '可设如 "0.2.0"；不填则不做版本门槛。',
  },
  {
    field: 'knowledge（manifest 内）',
    meaning: '是否启用知识库、glob 匹配哪些 md。',
    scope: '可改；若 settings.json 里也写了 knowledge，一般以 settings 为准。',
  },
  {
    field: 'life_trajectory / life_schedule',
    meaning: '异地心声、虚拟日程等进阶内容。',
    scope: '可改；需对照 oclive README_MANIFEST，改错会影响叙事与时间线。',
  },
  {
    field: 'dev_only',
    meaning: '若为 true，角色可作为调试包隐藏于列表（视启动器规则）。',
    scope: '可开关；面向创作者调试。',
  },
  {
    field: '以 _ 开头的键',
    meaning: '仅给自己看的备忘或说明。',
    scope: '可任意添加；运行时通常忽略。',
  },
]

export const SETTINGS_MERGE_NOTE =
  '这里是编写器对 pipeline.ocblueprint 创作者向运行段的兼容视图。identity_binding、evolution、memory_config、knowledge 与 inference_profile 会写入蓝图；模型、GGUF、实际后端和机器参数请在 Chat Pro 设置页管理。'

export const SETTINGS_FIELD_SCOPE_GUIDE: readonly CreatorScopeRow[] = [
  {
    field: 'schema_version',
    meaning: 'settings 契约版本，用于日后迁移。',
    scope: '一般保持 1；仅当官方升级说明要求时再改。',
  },
  {
    field: 'inference_profile.generation',
    meaning: '角色希望采用的采样方式与理想输出长度。',
    scope: '只调 temperature、top_p 与输出 token 预算；不填写模型名、GGUF 或本机路径。宿主仍可按安全上限收敛。',
  },
  {
    field: 'inference_profile.context / reasoning',
    meaning: '角色希望获得的上下文预算与推理强度。',
    scope: '填写可移植理想值；实际能力取决于 Chat Pro 中选定的模型与当前设备。',
  },
  {
    field: 'inference_profile.performance_intent',
    meaning: '延迟、均衡、质量及缓存/收敛偏好。',
    scope: '属于运行意图，不保证每个后端都支持；不得借此指定实际推理后端。',
  },
  {
    field: 'evolution.event_impact_factor',
    meaning: '事件对好感、关系以及（profile 模式下）可变人设档案演化的强度系数。',
    scope: '可在引擎允许范围内调（简单创作约 0.05～5）；过大可能导致数值或档案波动过激。',
  },
  {
    field: 'evolution.personality_source',
    meaning: 'vector：传统七维增量；profile：人设档案为核心，七维仅视图。',
    scope: 'profile 时「可变人设」由运行时模型维护，编写器不能手写该档案，只能调 evolution 数值影响强弱。',
  },
  {
    field: 'evolution.ai_analysis_interval',
    meaning: '与演化/分析相关的间隔（回合等）。',
    scope: '进阶；不熟悉可保留模板默认。',
  },
  {
    field: 'evolution.max_change_per_event / max_total_change',
    meaning: '单次与累计允许的变化上限；在 profile 模式下主要约束 LLM 更新可变档案时的「步子」与长期漂移提醒。',
    scope: '可微调；过小几乎不动档案，过大易戏剧化。',
  },
  {
    field: 'identity_binding',
    meaning: '用户身份是否与场景绑定。',
    scope: 'global：全场景共用一套身份键；per_scene：可按场景使用不同身份键（与 manifest.user_relations 配合）。',
  },
  {
    field: 'memory_config.scene_weight_multiplier',
    meaning: '记忆检索中「场景」维度的整体倍率。',
    scope: '正数；调大更强调当前场景相关记忆。',
  },
  {
    field: 'memory_config.topic_weights',
    meaning: '按场景、主题细分的记忆权重表。',
    scope: '可增删键；场景名须与合并后的场景列表一致，否则「检查」可能报错。',
  },
  {
    field: 'interaction_mode',
    meaning: '默认交互模式：immersive（沉浸）或 pure_chat（偏纯对话）。',
    scope: '包内默认值；玩家运行时仍可改，导出仍以这里为包默认。',
  },
  {
    field: 'remote_presence.default_enabled',
    meaning: '安装后「异地心声」是否默认勾选。',
    scope: '仅默认开关；异地文案大段仍在 manifest（如 life_trajectory）。',
  },
  {
    field: 'autonomous_scene',
    meaning: '虚拟时间推进后是否按规则自动更新角色场景等。',
    scope: '进阶；需对照 README 与场景配置，改错会影响切场景逻辑。',
  },
  {
    field: 'plugin_backends.memory / emotion / event / prompt',
    meaning: '记忆、情绪、事件、提示词等子系统的插件后端类型。',
    scope: 'builtin / builtin_v2 / remote；remote 需自建服务与文档约定，创作者一般保持 builtin。',
  },
  {
    field: 'knowledge.enabled',
    meaning: '是否启用知识库 Markdown 检索。',
    scope: '可开关；与 manifest.knowledge 同时存在时以合并规则为准（编写器侧通常 settings 优先）。',
  },
  {
    field: 'knowledge.glob',
    meaning: '扫描知识文件的路径 glob。',
    scope: '须以 knowledge/ 开头；可收窄或放宽匹配范围。',
  },
  {
    field: '_oclive_creator_guide（若存在）',
    meaning: '模板里自带的创作者说明对象。',
    scope: '仅文档；可保留或删除；运行时忽略。',
  },
]

export const KNOWLEDGE_FILE_SCOPE_GUIDE: readonly CreatorScopeRow[] = [
  {
    field: '文件路径（如 knowledge/world.md）',
    meaning: '包内相对路径，决定导出后文件落点。',
    scope: '可改名但需同步修改引用；world.md 常与简单创作「世界观」同步。',
  },
  {
    field: 'Front matter：id',
    meaning: '本条知识条目 id。',
    scope: '可改；需唯一、便于检索去重。',
  },
  {
    field: 'Front matter：tags',
    meaning: '关键词标签列表。',
    scope: '可增删；影响关键词命中。',
  },
  {
    field: 'Front matter：scenes',
    meaning: '限定在哪些场景更相关。',
    scope: '可留空=不限制；填了则与场景 id 一致。',
  },
  {
    field: 'Front matter：weight',
    meaning: '检索加权。',
    scope: '正数；越大越容易被强调。',
  },
  {
    field: 'Front matter：event_hints',
    meaning: '与事件类型相关的提示。',
    scope: '可增删关键词；用于事件相关检索。',
  },
  {
    field: '正文（--- 以下）',
    meaning: '世界观与设定正文，Markdown。',
    scope: '可任意写；过长时注意包体积与检索片段长度。',
  },
]

export const EMOTION_ASSET_SCOPE_GUIDE: readonly CreatorScopeRow[] = [
  {
    field: '七种基础表情',
    meaning: '开心、难过、生气等，每种选一张代表图。',
    scope: '可反复更换图片；导出后对话时按情绪切换。',
  },
  {
    field: '同种情绪再多几张',
    meaning: '同一种情绪下的变体，例如「开心但很克制」。',
    scope: '点「再追加一张表情」，只回答：哪种情绪、有多强、选哪张图；不用自己写英文 id。',
  },
  {
    field: '清空列表',
    meaning: '去掉编写器里已选的表情记录。',
    scope: '不会删除你电脑上已导出的文件夹里的文件。',
  },
]

export const CORE_PERSONALITY_SCOPE_GUIDE: readonly CreatorScopeRow[] = [
  {
    field: '整体内容',
    meaning: '「核心性格档案」：性格、口癖、关系观、禁忌等长文，会进入主对话相关提示；运行时不可被模型改写。',
    scope: '可完全自定义自然语言；不需要 JSON；建议分段写清。',
  },
  {
    field: '长度与结构',
    meaning: '过长会占用模型上下文。',
    scope: '可写长文；若对话异常可考虑精简或拆重点条列。',
  },
]

export const CREATOR_MSG_SCOPE_GUIDE: readonly CreatorScopeRow[] = [
  {
    field: '导出模式（单选）',
    meaning: '整包一句：只取首条有效行；按行多条：每行一条随机寄语。',
    scope: '可随时切换；切换后请用「检查与导出」确认导出内容符合预期。',
  },
  {
    field: '正文',
    meaning: '展示给玩家的短句。',
    scope: '可任意修改；注意模式对「行」的解释不同（空行、多行）。',
  },
]

/** 命中预览区：控件含义（本地近似，非运行时） */
export const KNOWLEDGE_PREVIEW_SCOPE_GUIDE: readonly CreatorScopeRow[] = [
  {
    field: '关键词输入',
    meaning: '模拟用户消息里可能出现的词，多个词用空格分隔即可。',
    scope: '可任意试不同组合；用于看排序，不写入角色包。',
  },
  {
    field: '预览条件：场景',
    meaning: '可选，填 scene id 参与场景匹配判断。',
    scope: '可与 manifest / 知识头信息里的场景 id 对照调试。',
  },
  {
    field: '仅预览匹配该场景',
    meaning: '勾选后只保留场景匹配的知识条目参与预览。',
    scope: '调试用开关；不影响导出文件。',
  },
  {
    field: '临时权重滑块',
    meaning: '只改预览里的加权，不改包内真实 weight。',
    scope: '可试调参；还原/清空后恢复。',
  },
]
