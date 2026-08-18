/**
 * 简单创作：表单字段写入 manifest/settings JSON，创作者无需直接编辑代码。
 * 未知字段在合并时保留；简单模式仅维护「一个用户身份」槽（多身份请用高级创作）。
 */

export const PERSONALITY_KEYS = [
  'stubbornness',
  'clinginess',
  'sensitivity',
  'assertiveness',
  'forgiveness',
  'talkativeness',
  'warmth',
] as const

export const PERSONALITY_LABELS_ZH: Record<(typeof PERSONALITY_KEYS)[number], string> = {
  stubbornness: '倔强',
  clinginess: '黏人',
  sensitivity: '敏感',
  assertiveness: '强势',
  forgiveness: '宽容',
  talkativeness: '话多',
  warmth: '温暖',
}

export type PluginBackendOpt = 'builtin' | 'builtin_v2' | 'remote' | 'directory'
/** 与 manifest `evolution.personality_source` 一致 */
export type PersonalitySourceOpt = 'vector' | 'profile'

/** 与 `KnowledgePackConfigDisk` / PACK_VERSIONING 默认一致 */
export const DEFAULT_KNOWLEDGE_GLOB = 'knowledge/**/*.md'

export type SimpleManifestForm = {
  id: string
  name: string
  version: string
  author: string
  description: string
  /** 最低 oclive 版本（semver，如 0.2.0）；空字符串表示不写 manifest.min_runtime_version */
  minRuntimeVersion: string
  /** 逗号分隔，如 home, school */
  scenesCsv: string
  defaultPersonality: number[]
  relationKey: string
  relationDisplayName: string
  relationPromptHint: string
  relationInitialFavorability: number
  relationFavorMultiplier: number
  /** manifest/settings 合并后 `knowledge.enabled`（settings 优先） */
  knowledgeEnabled: boolean
  /** 须以 `knowledge/` 开头；见 PACK_VERSIONING */
  knowledgeGlob: string
  /** manifest `creator_message_to_downloader`：导入者在主程序可见的一句话 */
  creatorMessageToDownloader: string
  /** 蓝图 meta.featured：是否在预设列表突出展示 */
  featured: boolean
  /** 蓝图 meta.preset_order：预设排序（越小越靠前；0 表示不写） */
  presetOrder: number
}

export type SimpleSettingsForm = {
  schemaVersion: number
  eventImpactFactor: number
  /** `vector`：七维增量为主；`profile`：核心性格档案 + 运行时可变档案（模型维护），七维多为视图 */
  personalitySource: PersonalitySourceOpt
  /** evolution.max_change_per_event；profile 下约束模型更新可变档案的单轮步长语义 */
  maxChangePerEvent: number
  identityBinding: 'global' | 'per_scene'
  interactionMode: 'immersive' | 'pure_chat'
  remoteDefaultEnabled: boolean
  sceneWeightMultiplier: number
  pluginMemory: PluginBackendOpt
  pluginEmotion: PluginBackendOpt
  pluginEvent: PluginBackendOpt
  pluginPrompt: PluginBackendOpt
  /** `plugin_backends.directory_plugins.*`，仅当对应模块为 `directory` 时使用 */
  directoryPluginMemory: string
  directoryPluginEmotion: string
  directoryPluginEvent: string
  directoryPluginPrompt: string
}

const DEFAULT_PERSONALITY = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]

export function defaultSimpleManifestForm(): SimpleManifestForm {
  return {
    id: 'my_role_id',
    name: '示例角色',
    version: '1.0.0',
    author: '',
    description: '一句话简介',
    minRuntimeVersion: '',
    scenesCsv: 'home',
    defaultPersonality: [...DEFAULT_PERSONALITY],
    relationKey: 'friend',
    relationDisplayName: '好友',
    relationPromptHint: '你们是好朋友',
    relationInitialFavorability: 50,
    relationFavorMultiplier: 1,
    knowledgeEnabled: true,
    knowledgeGlob: DEFAULT_KNOWLEDGE_GLOB,
    creatorMessageToDownloader: '',
    featured: false,
    presetOrder: 0,
  }
}

function readKnowledgeBlock(rec: Record<string, unknown>): { enabled: boolean; glob: string } | null {
  const k = rec.knowledge
  if (k === null || typeof k !== 'object' || Array.isArray(k)) return null
  const o = k as Record<string, unknown>
  const enabled = typeof o.enabled === 'boolean' ? o.enabled : true
  const g = typeof o.glob === 'string' ? o.glob.trim() : ''
  const glob = g || DEFAULT_KNOWLEDGE_GLOB
  return { enabled, glob }
}

/** settings.knowledge 覆盖 manifest.knowledge（与 mergeManifestWithSettings 一致） */
export function knowledgeFromPackRecords(
  manifest: Record<string, unknown>,
  settings: Record<string, unknown>,
): { enabled: boolean; glob: string } {
  return (
    readKnowledgeBlock(settings) ??
    readKnowledgeBlock(manifest) ?? { enabled: true, glob: DEFAULT_KNOWLEDGE_GLOB }
  )
}

export function normalizeKnowledgeGlob(raw: string): string {
  const t = raw.trim()
  if (!t) return DEFAULT_KNOWLEDGE_GLOB
  if (t.startsWith('knowledge/')) return t
  return `knowledge/${t.replace(/^\/+/, '')}`
}

export function defaultSimpleSettingsForm(): SimpleSettingsForm {
  return {
    schemaVersion: 1,
    eventImpactFactor: 1,
    personalitySource: 'vector',
    maxChangePerEvent: 0.05,
    identityBinding: 'per_scene',
    interactionMode: 'immersive',
    remoteDefaultEnabled: false,
    sceneWeightMultiplier: 1.2,
    pluginMemory: 'builtin',
    pluginEmotion: 'builtin',
    pluginEvent: 'builtin',
    pluginPrompt: 'builtin',
    directoryPluginMemory: '',
    directoryPluginEmotion: '',
    directoryPluginEvent: '',
    directoryPluginPrompt: '',
  }
}

function clampPersonality(v: number[]): number[] {
  return PERSONALITY_KEYS.map((_, i) => {
    const x = v[i]
    if (!Number.isFinite(x)) return 0.5
    return Math.max(0, Math.min(1, x))
  })
}

/** 从已解析的 manifest 提取简单表单（多身份时以 default_relation 为主，否则取第一个键） */
export function manifestRecordToSimpleForm(m: Record<string, unknown>): SimpleManifestForm {
  const rels = (m.user_relations ?? {}) as Record<string, Record<string, unknown>>
  const keys = Object.keys(rels).filter((k) => k.trim())
  const dr = String(m.default_relation ?? '').trim()
  const primaryKey =
    dr && keys.includes(dr) ? dr : keys.length ? keys[0]! : 'friend'
  const ur = rels[primaryKey] ?? {}
  const dp = Array.isArray(m.default_personality)
    ? clampPersonality(m.default_personality as number[])
    : [...DEFAULT_PERSONALITY]
  const scenes = Array.isArray(m.scenes) ? (m.scenes as string[]).map((s) => String(s).trim()).filter(Boolean) : ['home']

  const kOnly = knowledgeFromPackRecords(m, {})

  return {
    id: String(m.id ?? '').trim() || 'my_role_id',
    name: String(m.name ?? '').trim() || '示例角色',
    version: String(m.version ?? '').trim() || '1.0.0',
    author: String(m.author ?? ''),
    description: String(m.description ?? ''),
    minRuntimeVersion:
      typeof m.min_runtime_version === 'string' ? String(m.min_runtime_version).trim() : '',
    scenesCsv: scenes.join(', '),
    defaultPersonality: dp,
    relationKey: primaryKey || 'friend',
    relationDisplayName: String(ur.display_name ?? '好友'),
    relationPromptHint: String(ur.prompt_hint ?? ''),
    relationInitialFavorability: Number.isFinite(ur.initial_favorability as number)
      ? Math.max(0, Math.min(100, Number(ur.initial_favorability)))
      : 50,
    relationFavorMultiplier: Number.isFinite(ur.favor_multiplier as number)
      ? Math.max(0.01, Number(ur.favor_multiplier))
      : 1,
    knowledgeEnabled: kOnly.enabled,
    knowledgeGlob: kOnly.glob,
    creatorMessageToDownloader:
      typeof m.creator_message_to_downloader === 'string'
        ? String(m.creator_message_to_downloader)
        : '',
    featured: Boolean(m.featured),
    presetOrder: Number.isFinite(m.preset_order as number) ? Number(m.preset_order) : 0,
  }
}

function parsePluginBackendOpt(raw: unknown): PluginBackendOpt {
  const s = String(raw ?? '')
    .trim()
    .toLowerCase()
  if (s === 'directory') return 'directory'
  if (s === 'builtin_v2') return 'builtin_v2'
  if (s === 'remote') return 'remote'
  return 'builtin'
}

export function settingsRecordToSimpleForm(s: Record<string, unknown>): SimpleSettingsForm {
  const evo = (s.evolution ?? {}) as Record<string, unknown>
  const mem = (s.memory_config ?? {}) as Record<string, unknown>
  const rp = (s.remote_presence ?? {}) as Record<string, unknown>
  const pb = (s.plugin_backends ?? {}) as Record<string, unknown>
  const dp = (pb.directory_plugins ?? {}) as Record<string, unknown>

  const eif = Number(evo.event_impact_factor)
  const mce = Number(evo.max_change_per_event)
  const swm = Number(mem.scene_weight_multiplier)
  const psRaw = String(evo.personality_source ?? '').toLowerCase()
  const personalitySource: PersonalitySourceOpt = psRaw === 'profile' ? 'profile' : 'vector'

  return {
    schemaVersion: Number.isFinite(s.schema_version as number) ? Number(s.schema_version) : 1,
    eventImpactFactor: Number.isFinite(eif) ? Math.max(0.05, Math.min(5, eif)) : 1,
    personalitySource,
    maxChangePerEvent: Number.isFinite(mce) ? Math.max(0.01, Math.min(0.5, mce)) : 0.05,
    identityBinding: s.identity_binding === 'global' ? 'global' : 'per_scene',
    interactionMode: s.interaction_mode === 'pure_chat' ? 'pure_chat' : 'immersive',
    remoteDefaultEnabled: Boolean(rp.default_enabled),
    sceneWeightMultiplier: Number.isFinite(swm) ? Math.max(0.1, swm) : 1.2,
    pluginMemory: parsePluginBackendOpt(pb.memory),
    pluginEmotion: parsePluginBackendOpt(pb.emotion),
    pluginEvent: parsePluginBackendOpt(pb.event),
    pluginPrompt: parsePluginBackendOpt(pb.prompt),
    directoryPluginMemory: String(dp.memory ?? '').trim(),
    directoryPluginEmotion: String(dp.emotion ?? '').trim(),
    directoryPluginEvent: String(dp.event ?? '').trim(),
    directoryPluginPrompt: String(dp.prompt ?? '').trim(),
  }
}

/** 将简单表单合并进现有 manifest JSON 字符串，保留其他键。简单模式将 user_relations 重写为单键。 */
export function applySimpleManifestToJson(currentJson: string, form: SimpleManifestForm): string {
  let base: Record<string, unknown>
  try {
    base = JSON.parse(currentJson) as Record<string, unknown>
  } catch {
    base = {}
  }

  const scenes = form.scenesCsv
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean)
  if (scenes.length === 0) scenes.push('home')

  const key = form.relationKey.trim() || 'friend'

  base.id = form.id.trim()
  base.name = form.name.trim()
  base.version = form.version.trim()
  base.author = form.author.trim()
  base.description = form.description.trim()
  const minRt = form.minRuntimeVersion.trim()
  if (minRt) {
    base.min_runtime_version = minRt
  } else {
    delete base.min_runtime_version
  }
  base.scenes = scenes
  base.default_personality = clampPersonality(form.defaultPersonality)
  base.default_relation = key
  base.user_relations = {
    [key]: {
      display_name: form.relationDisplayName.trim() || key,
      prompt_hint: form.relationPromptHint.trim(),
      favor_multiplier: form.relationFavorMultiplier,
      initial_favorability: form.relationInitialFavorability,
    },
  }

  base.knowledge = {
    enabled: form.knowledgeEnabled,
    glob: normalizeKnowledgeGlob(form.knowledgeGlob),
  }

  const dl = String(form.creatorMessageToDownloader ?? '').trim()
  if (dl) {
    base.creator_message_to_downloader = dl
  } else {
    delete base.creator_message_to_downloader
  }

  if (form.featured) {
    base.featured = true
  } else {
    delete base.featured
  }
  if (form.presetOrder > 0) {
    base.preset_order = Math.floor(form.presetOrder)
  } else {
    delete base.preset_order
  }

  return JSON.stringify(base, null, 2) + '\n'
}

export function applySimpleSettingsToJson(
  currentJson: string,
  form: SimpleSettingsForm,
  knowledge: { enabled: boolean; glob: string },
): string {
  let base: Record<string, unknown>
  try {
    base = JSON.parse(currentJson) as Record<string, unknown>
  } catch {
    base = {}
  }

  base.schema_version = form.schemaVersion
  // 模型、GGUF 与实际主 LLM 后端由 Chat Pro 设置页管理。简单创作只声明
  // 可移植的 Ollama 兜底，不把本机选择固化进角色包。
  delete base.model
  delete base.ollama_model
  base.identity_binding = form.identityBinding
  base.interaction_mode = form.interactionMode
  const evoPrev =
    base.evolution && typeof base.evolution === 'object'
      ? (base.evolution as Record<string, unknown>)
      : {}
  base.evolution = {
    ...evoPrev,
    event_impact_factor: form.eventImpactFactor,
    personality_source: form.personalitySource,
    ai_analysis_interval: Number(evoPrev.ai_analysis_interval) || 15,
    max_change_per_event: form.maxChangePerEvent,
    max_total_change: Number(evoPrev.max_total_change) || 0.5,
  }
  const memPrev =
    base.memory_config && typeof base.memory_config === 'object'
      ? (base.memory_config as Record<string, unknown>)
      : {}
  base.memory_config = {
    ...memPrev,
    scene_weight_multiplier: form.sceneWeightMultiplier,
  }
  base.remote_presence = {
    ...((base.remote_presence as object) ?? {}),
    default_enabled: form.remoteDefaultEnabled,
  }
  const pb: Record<string, unknown> = {
    memory: form.pluginMemory,
    emotion: form.pluginEmotion,
    event: form.pluginEvent,
    prompt: form.pluginPrompt,
    llm: 'ollama',
  }
  const dir: Record<string, string> = {}
  if (form.pluginMemory === 'directory' && form.directoryPluginMemory.trim()) {
    dir.memory = form.directoryPluginMemory.trim()
  }
  if (form.pluginEmotion === 'directory' && form.directoryPluginEmotion.trim()) {
    dir.emotion = form.directoryPluginEmotion.trim()
  }
  if (form.pluginEvent === 'directory' && form.directoryPluginEvent.trim()) {
    dir.event = form.directoryPluginEvent.trim()
  }
  if (form.pluginPrompt === 'directory' && form.directoryPluginPrompt.trim()) {
    dir.prompt = form.directoryPluginPrompt.trim()
  }
  if (Object.keys(dir).length > 0) {
    pb.directory_plugins = dir
  }
  base.plugin_backends = pb

  base.knowledge = {
    enabled: knowledge.enabled,
    glob: normalizeKnowledgeGlob(knowledge.glob),
  }

  return JSON.stringify(base, null, 2) + '\n'
}

/** 当前 manifest 是否包含多个用户身份（简单模式会覆盖为单身份） */
export function countUserRelationKeys(manifestJson: string): number {
  try {
    const m = JSON.parse(manifestJson) as { user_relations?: Record<string, unknown> }
    return Object.keys(m.user_relations ?? {}).length
  } catch {
    return 0
  }
}
