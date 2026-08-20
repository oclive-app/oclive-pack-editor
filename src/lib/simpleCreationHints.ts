/**
 * 简单创作：大白话说明（供 HelpHint 问号气泡），说明「写什么、会进哪个文件、对运行时有什么影响」。
 */

/** 整个「基础」分区：简单创作在干什么 */
export const SIMPLE_BASE_INTRO = [
  '简单创作用表单代替手写 JSON：你填的每一项，保存或导出时会写进角色包里的对应文件。',
  '本页可填：角色信息、情绪立绘、世界观与知识边界。理想推理数值、场景和进阶文件请到「高级」页签；实际模型与 GGUF 在 Chat Pro 设置页选择。',
] as const

/** 核心性格档案（core_personality.txt） */
export const SIMPLE_CORE_PERSONALITY = [
  '这一大段是「核心性格档案」：写入 core_personality.txt，进入对话提示；运行时 AI 不得改写该正文。',
  '另有「可变性格档案」仅存运行时数据库，全由模型在对话后维护；你只能通过 evolution（如单轮变化步长）调强弱，不能手写那份可变正文。',
  '用平常话写性格、口癖、雷区、关系即可；不必写代码。留空或太短，角色可能只剩 manifest 里几行干巴巴的信息。',
] as const

/** 创作者公告：两种导出方式 */
export const SIMPLE_CREATOR_MESSAGE_MODE = [
  '「整包一句」：导出时只取你填的第一条非空行，合成一条寄语；适合只想留一句感谢或说明。',
  '「按行多条」：每一非空行是一条独立寄语，启动器可以分条展示或随机抽一条；适合多作者、多模块各留一句。',
  '无论哪种，对话里的 AI 都不会读这个文件；它只给下载包的人在启动器里看。',
] as const

/** 创作者公告输入框 */
export const SIMPLE_CREATOR_MESSAGE_BODY = [
  '写你想对「后来下载这个包的人」说的话：使用提示、致谢、版本说明都可以。每行最长 160 字（超出导出时可能被截断或校验提示）。',
] as const

/** 「进阶」折叠块总述 */
export const SIMPLE_ADV_FOLD = [
  '展开后可编辑角色信息、性格数字、用户关系、世界观与知识库；实际推理后端、模型和 GGUF 不写入角色包，在 Chat Pro 设置页统一选择。',
  '不确定时可以先只改左边展示名和场景；右边涉及对话算法，改完建议在试聊里跑几句再导出。',
] as const

/** manifest 分区标题 */
export const SIMPLE_MANIFEST_INTRO = [
  '这一列会写入 pipeline.ocblueprint 的 meta：相当于角色的「名片 + 规则摘要」。启动器、列表页、以及运行时都会先读它来决定叫什么、有哪些场景、默认性格、和你的关系等。',
] as const

export const SIMPLE_FIELD_ROLE_ID = [
  '英文小写 + 下划线最稳妥，通常和导出文件夹名一致。改 ID 等于换「身份证号」，旧路径、书签可能失效；已定稿发给别人后尽量不要改。',
] as const

export const SIMPLE_FIELD_DISPLAY_NAME = [
  '玩家在各种界面里看到的称呼，可以是中文。不影响程序里的 id，只影响显示。',
] as const

export const SIMPLE_FIELD_VERSION_AUTHOR = [
  '版本号方便你区分第几次发布；作者名会出现在包信息里。两者都不影响对话怎么算，只影响展示与追溯。',
] as const

export const SIMPLE_FIELD_DESCRIPTION = [
  '一两句简介，用在列表、详情里让人快速懂这个角色。不会直接当成长篇设定喂给模型；长篇请写在上方「核心性格档案」。',
] as const

export const SIMPLE_FIELD_MIN_RUNTIME = [
  '若填写，旧版 oclive 低于这个版本会拒绝加载，避免用到不支持的字段。留空表示不限制。一般跟着编写器或文档推荐版本填即可。',
] as const

export const SIMPLE_FIELD_SCENES = [
  '多个场景用英文逗号分隔（如 home, school）。这些 id 要和知识库、剧情里用到的场景名一致，否则「换场景」时匹配不到。',
  '场景越多，后面可选的「在哪聊天」越丰富；新手可以先只填一个 home。',
] as const

export const SIMPLE_TRAITS = [
  '七个 0～1 的数字描述默认性格倾向：会写进 manifest，供运行时调语气或相关系统使用。',
  '人格来源选「档案」时，按设计七维多为从正文归纳的视图；滑条仍写入包内作为默认与参考。',
  '不是「越大越好」：按人设微调即可；全 0.5 表示中性起点。',
] as const

export const SIMPLE_USER_RELATION = [
  '简单模式只维护「一种你和角色的关系」：身份键是英文 id（如 friend），对外称呼是给人看的（如「好友」），语气提示会进提示词，影响 AI 怎么称呼你、多亲昵。',
  '初始好感与倍率影响好感数值的起点和涨得快慢；倍率过大可能让数值飘得很快，建议小步调整。',
  '若包里有多种身份键，保存时简单模式会合并成这一套；要保留多身份请用高级创作。',
] as const

export const SIMPLE_WORLDVIEW = [
  '有内容时会生成 knowledge/world.md，作为世界观摘要参与知识检索。留空则可能用占位说明。',
  '和高级创作里的知识文件是同一套体系，避免两处写两套互相矛盾的设定。',
] as const

export const SIMPLE_KNOWLEDGE = [
  '勾选「启用知识库 Markdown 检索」后，运行时才会按 glob 去扫包里的 .md 并参与检索打分；关掉则相当于不用这套知识。',
  'glob 决定匹配哪些路径，须以 knowledge/ 开头，例如 knowledge/**/*.md。改得太窄会漏文件，太宽可能把无关笔记也扫进来。',
] as const

/** settings 分区标题 */
export const SIMPLE_SETTINGS_INTRO = [
  '这一列会写入 blueprint 的创作者向运行视图，主要描述事件影响、身份绑定与记忆/情绪等周边模块；实际主 LLM、模型和 GGUF 由 Chat Pro 管理。',
] as const

export const SIMPLE_BRAIN_LLM = [
  '简单角色包只保留 Ollama 作为缺省兜底，不在包内选择实际模型。',
  '请在 Chat Pro 设置页统一选择实际后端、基础模型与 GGUF；换电脑时角色包不需要跟着改本机路径。',
  '高级创作里的 inference_profile 只描述理想采样、预算和推理倾向，也不会覆盖 Chat Pro 的实际选择。',
] as const

export const SIMPLE_SCHEMA_VERSION = [
  'schema 版本号表示 settings 契约版本，和引擎内置规则对齐。不要随意改大改小；除非文档说明要升级，否则保持默认即可。',
] as const

export const SIMPLE_EVENT_IMPACT = [
  '事件影响系数：剧情里的事件（例如约会、冲突）对好感、状态等的影响强度。数值越大，同样事件带来的变化越明显。',
  '人格来源为「档案」时，事件对七维的直接增量会弱化，变化更多通过模型更新「可变性格档案」体现。',
  '建议每次只改一点（例如 0.05），用试聊感受再导出。',
] as const

/** evolution.personality_source */
export const SIMPLE_PERSONALITY_SOURCE = [
  '经典（vector）：仍以七维增量等方式为主驱动性格变化。',
  '档案（profile）：以「核心性格档案」为锁定的基底；运行时的「可变性格档案」由模型维护，包内只配 evolution，不可手写那份可变正文。',
] as const

/** evolution.max_change_per_event */
export const SIMPLE_MAX_CHANGE_PER_EVENT = [
  '约束模型单轮更新「可变性格档案」的步长语义（概念上类似「每次允许挪多远」）；过小易显呆板，过大可能不稳。常用约 0.01～0.5。',
  '经典模式下该键仍存在；若主要用档案模式，可更关注此项与上面的档案说明。',
] as const

export const SIMPLE_IDENTITY_BINDING = [
  '按场景（per_scene）：不同场景下可以记住不同的「你是谁、关系如何」等，适合多场景剧情。',
  '全局（global）：所有场景共用一套身份记忆，更简单；纯聊天向角色常用这个。',
] as const

export const SIMPLE_INTERACTION_MODE = [
  '沉浸（immersive）：更偏剧情与场景代入，系统会更多考虑场景、事件等上下文。',
  '纯聊（pure_chat）：更偏日常对话，少一些剧情向的包袱。按你想要的体验选即可。',
] as const

export const SIMPLE_SCENE_WEIGHT = [
  '场景记忆权重倍率：当前场景相关记忆在拼进提示时乘的权重。调大更「活在当下」；调小更平均地参考过去场景。',
] as const

export const SIMPLE_REMOTE_PRESENCE = [
  '「异地心声」类功能是否默认开启（若包与引擎支持）。开启后可能与远程在线、日程等联动；不需要可以关掉以简化行为。',
] as const

export const SIMPLE_PLUGIN_BACKENDS = [
  'memory / emotion / event / prompt 四类插件决定：记忆怎么存、情绪怎么判、事件怎么算、系统提示怎么组。一般全部选 builtin 即可。',
  'builtin_v2 是新一版内置实现；remote 需要你自己部署对应服务。不确定时保持 builtin，除非你按文档接了远程。',
  '实际主 LLM、基础模型与 GGUF 由 Chat Pro 设置页统一管理；这里的四项只是角色包周边模块。',
] as const
