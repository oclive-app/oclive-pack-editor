/**
 * `pipeline.ocblueprint` editor contract.
 *
 * v4 is the Stable default. Imported v2 packs keep schema_version 2 on
 * round-trip; frozen v3 remains intentionally non-editable.
 */

export const PIPELINE_BLUEPRINT_FILENAME = 'pipeline.ocblueprint'
export const REPLY_QUALITY_ANCHOR_REL_PATH = 'prompts/reply_quality_anchor.md'

export type BlueprintIncludeEntry = {
  id?: string
  path: string
  target: string
  mode: 'merge' | 'replace'
}

export type BlueprintSlotGroupEntry = {
  label: string
  description?: string
  type: string
  members: string[]
}

export type BlueprintExpertOverlay = {
  routing_path?: string
  [key: string]: unknown
}

export type BlueprintExtensionDeclaration = {
  capability: string
  provider?: string
  required?: boolean
  config_schema_version: number
  config_ref: string
}

export type BlueprintDocument = {
  schema_version: 2 | 4
  meta: Record<string, unknown>
  slot_registry: Record<string, BlueprintSlotEntry>
  includes?: BlueprintIncludeEntry[]
  expert_overlay?: BlueprintExpertOverlay
  groups?: Record<string, BlueprintSlotGroupEntry>
  runtime_config?: Record<string, unknown>
  extensions?: Record<string, BlueprintExtensionDeclaration>
}

/** @deprecated Use `BlueprintDocument`; kept for source compatibility. */
export type BlueprintV2 = BlueprintDocument

const EDITOR_PRESERVED_BLUEPRINT_KEYS = [
  'schema_version',
  'meta',
  'slot_registry',
  'includes',
  'groups',
  'expert_overlay',
  'runtime_config',
  'extensions',
] as const

const EDITOR_MANAGED_META_KEYS = [
  'id',
  'name',
  'version',
  'author',
  'description',
  'personality',
  'relations',
  'default_relation',
  'scenes',
  'evolution',
  'memory_config',
  'identity_binding',
  'dev_only',
  'knowledge',
  'min_runtime_version',
  'life_trajectory',
  'life_schedule',
  'interaction_mode',
  'remote_presence',
  'autonomous_scene',
  'reply_quality_anchor',
  'featured',
  'preset_order',
  'creator_message_to_downloader',
] as const

export function pickEditorPreservedBlueprintFields(
  blueprint: BlueprintDocument,
): Record<string, unknown> {
  const source = blueprint as unknown as Record<string, unknown>
  const result: Record<string, unknown> = {}
  for (const key of EDITOR_PRESERVED_BLUEPRINT_KEYS) {
    if (source[key] !== undefined && source[key] !== null) result[key] = source[key]
  }
  return result
}

/**
 * Return every safe role-relative payload path declared by the blueprint.
 *
 * Import/export callers use this as the single TypeScript contract for
 * `includes[].path` and Stable v4 `extensions.*.config_ref`; the payload
 * remains opaque to the editor.
 */
export function blueprintReferencedFilePaths(blueprint: BlueprintDocument): string[] {
  const paths = new Set<string>()
  for (const include of Array.isArray(blueprint.includes) ? blueprint.includes : []) {
    if (typeof include?.path === 'string' && isSafeBlueprintRelativePath(include.path)) {
      paths.add(include.path)
    }
  }
  if (blueprint.schema_version === 4 && isRecord(blueprint.extensions)) {
    for (const declaration of Object.values(blueprint.extensions)) {
      if (
        isRecord(declaration)
        && typeof declaration.config_ref === 'string'
        && isSafeBlueprintRelativePath(declaration.config_ref)
      ) {
        paths.add(declaration.config_ref)
      }
    }
  }
  return [...paths]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Reapply fields the legacy-shaped editor does not model without discarding user edits.
 * Multi-instance slot registries retain every original instance; the first instance of each
 * editable type receives backend/plugin changes from the simple editor.
 */
export function mergeEditorPreservedBlueprintFields(
  blueprint: BlueprintDocument,
  preserved?: Record<string, unknown>,
): BlueprintDocument {
  if (!preserved) return blueprint

  if (preserved.schema_version === 2 || preserved.schema_version === 4) {
    blueprint.schema_version = preserved.schema_version
  }

  if (isRecord(preserved.meta)) {
    const mergedMeta: Record<string, unknown> = { ...preserved.meta }
    for (const key of EDITOR_MANAGED_META_KEYS) {
      const value = blueprint.meta[key]
      if (value === undefined || value === null) delete mergedMeta[key]
      else mergedMeta[key] = value
    }
    blueprint.meta = mergedMeta
  }

  if (isRecord(preserved.slot_registry)) {
    const original = preserved.slot_registry as Record<string, BlueprintSlotEntry>
    const merged: Record<string, BlueprintSlotEntry> = {}
    for (const [key, value] of Object.entries(original)) {
      if (isRecord(value)) merged[key] = { ...(value as BlueprintSlotEntry) }
    }
    for (const [generatedKey, generated] of Object.entries(blueprint.slot_registry)) {
      const target = Object.entries(merged).find(([, entry]) => entry.type === generated.type)
      if (!target) {
        merged[generatedKey] = generated
        continue
      }
      if (generated.type === 'complex_emotion' || generated.type === 'llm') continue
      const [targetKey, current] = target
      merged[targetKey] = {
        ...current,
        backend: generated.backend,
        plugin: generated.plugin,
        local_memory_provider_id: generated.local_memory_provider_id,
      }
    }
    blueprint.slot_registry = merged
  }

  for (const key of ['includes', 'groups', 'expert_overlay', 'extensions'] as const) {
    const value = preserved[key]
    if (value !== undefined && value !== null) {
      ;(blueprint as unknown as Record<string, unknown>)[key] = value
    }
  }
  if (isRecord(preserved.runtime_config)) {
    const generatedRuntime = blueprint.runtime_config ?? {}
    blueprint.runtime_config = {
      ...preserved.runtime_config,
      ...generatedRuntime,
    }
  }
  if (
    blueprint.schema_version === 2
    && !Object.prototype.hasOwnProperty.call(preserved, 'runtime_config')
  ) {
    delete blueprint.runtime_config
  }
  return blueprint
}

export type BlueprintSlotEntry = {
  type: string
  label: string
  backend: string
  position: number
  plugin?: string | null
  plugins?: string[] | null
  model?: string | null
  url?: string | null
  local_memory_provider_id?: string | null
}

const BLUEPRINT_ROOT_KEYS = new Set([
  'schema_version',
  'meta',
  'slot_registry',
  'includes',
  'expert_overlay',
  'groups',
  'runtime_config',
  'extensions',
])

const SLOT_KEYS = new Set([
  'type',
  'label',
  'backend',
  'position',
  'plugin',
  'plugins',
  'model',
  'url',
  'local_memory_provider_id',
])

const SLOT_TYPES = [
  'memory',
  'emotion',
  'event',
  'prompt',
  'llm',
  'agent',
  'complex_emotion',
] as const

const GROUP_SLOT_TYPES = SLOT_TYPES.filter((type) => type !== 'complex_emotion')

const SLOT_BACKENDS: Record<string, readonly string[]> = {
  memory: ['builtin', 'remote', 'directory', 'local', 'none'],
  emotion: ['builtin', 'remote', 'directory', 'none'],
  event: ['builtin', 'remote', 'directory', 'none'],
  prompt: ['builtin', 'remote', 'directory', 'none'],
  llm: ['ollama', 'remote', 'directory', 'none'],
  agent: ['builtin', 'remote', 'directory', 'none'],
  complex_emotion: ['builtin', 'remote', 'directory'],
}

const GROUP_KEYS = new Set(['label', 'description', 'type', 'members'])
const INCLUDE_KEYS = new Set(['id', 'path', 'target', 'mode'])
const INCLUDE_TARGETS = new Set([
  'meta.personality',
  'meta.life_trajectory',
  'meta.life_schedule',
  'expert_overlay',
])
const RUNTIME_CONFIG_KEYS = new Set([
  'interaction_mode',
  'memory_config',
  'reply_quality_anchor',
  'remote_fallback_to_builtin',
  'dual_core',
  'identity_binding',
  'evolution',
  'ollama_model',
  'remote_presence',
  'autonomous_scene',
  'inference_profile',
])

const INFERENCE_PROFILE_KEYS = new Set([
  'generation',
  'context',
  'reasoning',
  'performance_intent',
])
const INFERENCE_GENERATION_KEYS = new Set([
  'temperature',
  'top_p',
  'preferred_output_tokens',
  'maximum_output_tokens',
])
const INFERENCE_CONTEXT_KEYS = new Set(['preferred_tokens', 'minimum_tokens'])
const INFERENCE_REASONING_KEYS = new Set(['mode', 'effort'])
const INFERENCE_PERFORMANCE_KEYS = new Set([
  'priority',
  'prefer_prefix_cache',
  'prefer_model_residency',
  'allow_context_reduction',
  'allow_output_reduction',
])
const EXTENSION_KEYS = new Set([
  'capability',
  'provider',
  'required',
  'config_schema_version',
  'config_ref',
])

type PluginBackendsShape = {
  memory?: string
  emotion?: string
  event?: string
  prompt?: string
  llm?: string
  agent?: string
  directory_plugins?: Record<string, string>
  local_memory_provider_id?: string
}

function backendSnake(v: unknown): string {
  if (typeof v === 'string' && v.trim()) return v.trim()
  return 'builtin'
}

export function pluginBackendsToSlotRegistry(
  pb: PluginBackendsShape,
): Record<string, BlueprintSlotEntry> {
  const dir = pb.directory_plugins ?? {}
  const entry = (
    slotType: string,
    backend: string,
    position: number,
  ): BlueprintSlotEntry => ({
    type: slotType,
    label: slotType,
    backend,
    position,
    plugin:
      slotType === 'memory'
        ? dir.memory ?? null
        : slotType === 'emotion'
          ? dir.emotion ?? null
          : slotType === 'event'
            ? dir.event ?? null
            : slotType === 'prompt'
              ? dir.prompt ?? null
              : slotType === 'llm'
                ? dir.llm ?? null
                : slotType === 'agent'
                  ? dir.agent ?? null
                  : null,
    plugins: null,
    model: null,
    url: null,
    local_memory_provider_id:
      slotType === 'memory' ? pb.local_memory_provider_id ?? null : null,
  })

  return {
    memory: entry('memory', backendSnake(pb.memory), 0),
    emotion: entry('emotion', backendSnake(pb.emotion), 0),
    complex_emotion: {
      type: 'complex_emotion',
      label: 'Complex emotion',
      backend: 'builtin',
      position: 1,
      plugin: null,
      plugins: null,
      model: null,
      url: null,
      local_memory_provider_id: null,
    },
    event: entry('event', backendSnake(pb.event), 0),
    prompt: entry('prompt', backendSnake(pb.prompt), 0),
    llm: entry('llm', backendSnake(pb.llm ?? 'ollama'), 0),
    agent: entry('agent', backendSnake(pb.agent), 0),
  }
}

function slotRegistryToPluginBackends(
  reg: Record<string, BlueprintSlotEntry>,
): PluginBackendsShape {
  const pick = (type: string): BlueprintSlotEntry | undefined =>
    Object.values(reg).find((e) => e.type === type)

  const dir: Record<string, string> = {}
  for (const [key, e] of Object.entries(reg)) {
    if (e.plugin?.trim()) {
      if (e.type === 'memory' && !dir.memory) dir.memory = e.plugin
      if (e.type === 'emotion' && !dir.emotion) dir.emotion = e.plugin
      if (e.type === 'event' && !dir.event) dir.event = e.plugin
      if (e.type === 'prompt' && !dir.prompt) dir.prompt = e.plugin
      if (e.type === 'agent' && !dir.agent) dir.agent = e.plugin
    }
    void key
  }

  const mem = pick('memory')
  return {
    memory: mem?.backend ?? 'builtin',
    emotion: pick('emotion')?.backend ?? 'builtin',
    event: pick('event')?.backend ?? 'builtin',
    prompt: pick('prompt')?.backend ?? 'builtin',
    // The editor exposes only a portable Ollama fallback. The imported LLM
    // route itself remains in preservedBlueprintFields and is not rewritten.
    llm: 'ollama',
    agent: pick('agent')?.backend ?? 'builtin',
    directory_plugins: Object.keys(dir).length ? dir : undefined,
    local_memory_provider_id: mem?.local_memory_provider_id ?? undefined,
  }
}

/** 从 legacy-shaped editor state 构建蓝图（新包默认 Stable v4）。 */
export function buildBlueprintFromLegacy(
  manifest: Record<string, unknown>,
  settings: Record<string, unknown>,
  schemaVersion: 2 | 4 = 4,
): BlueprintDocument {
  const model = schemaVersion === 2
    ? settings.ollama_model ?? settings.model ?? manifest.ollama_model
    : undefined

  const personality = Array.isArray(manifest.default_personality)
    ? manifest.default_personality
    : manifest.personality

  const meta: Record<string, unknown> = {
    id: manifest.id,
    name: manifest.name,
    version: manifest.version,
    author: manifest.author,
    description: manifest.description,
    personality,
    relations: manifest.user_relations ?? manifest.relations,
    default_relation: manifest.default_relation,
    scenes: manifest.scenes,
    dev_only: manifest.dev_only,
    knowledge: manifest.knowledge ?? settings.knowledge,
  }

  if (manifest.min_runtime_version != null) meta.min_runtime_version = manifest.min_runtime_version
  if (manifest.life_trajectory != null) meta.life_trajectory = manifest.life_trajectory
  if (manifest.life_schedule != null) meta.life_schedule = manifest.life_schedule
  const anchor =
    typeof settings.reply_quality_anchor === 'string'
      ? String(settings.reply_quality_anchor).trim()
      : typeof manifest.reply_quality_anchor === 'string'
        ? String(manifest.reply_quality_anchor).trim()
        : ''
  if (manifest.featured != null) meta.featured = manifest.featured
  if (manifest.preset_order != null) meta.preset_order = manifest.preset_order
  if (manifest.creator_message_to_downloader != null) {
    meta.creator_message_to_downloader = manifest.creator_message_to_downloader
  }

  const runtimeValues: Record<string, unknown> = {
    interaction_mode: settings.interaction_mode ?? manifest.interaction_mode,
    memory_config: settings.memory_config ?? manifest.memory_config,
    reply_quality_anchor: anchor || undefined,
    remote_fallback_to_builtin:
      settings.remote_fallback_to_builtin ?? manifest.remote_fallback_to_builtin,
    identity_binding: settings.identity_binding ?? manifest.identity_binding,
    evolution: settings.evolution ?? manifest.evolution,
    ollama_model: model,
    remote_presence: settings.remote_presence ?? manifest.remote_presence,
    autonomous_scene: settings.autonomous_scene ?? manifest.autonomous_scene,
    inference_profile: settings.inference_profile,
  }

  if (schemaVersion === 2) {
    for (const key of RUNTIME_CONFIG_KEYS) {
      if (
        key === 'dual_core'
        || key === 'remote_fallback_to_builtin'
        || key === 'inference_profile'
      ) continue
      const value = runtimeValues[key]
      if (value !== undefined && value !== null) meta[key] = value
    }
  }

  const settingsBackends = (settings.plugin_backends ?? {}) as PluginBackendsShape
  const pb: PluginBackendsShape = {
    ...settingsBackends,
    ...(settingsBackends.directory_plugins
      ? { directory_plugins: { ...settingsBackends.directory_plugins } }
      : {}),
  }
  if (settings.local_memory_provider_id && !pb.local_memory_provider_id) {
    pb.local_memory_provider_id = String(settings.local_memory_provider_id)
  }
  if (schemaVersion === 4) {
    pb.llm = 'ollama'
    if (pb.directory_plugins) {
      delete pb.directory_plugins.llm
      if (Object.keys(pb.directory_plugins).length === 0) delete pb.directory_plugins
    }
  }

  const runtimeConfig: Record<string, unknown> = {}
  if (schemaVersion === 4) {
    for (const key of RUNTIME_CONFIG_KEYS) {
      if (key === 'dual_core') continue
      const value = runtimeValues[key]
      if (value !== undefined && value !== null) runtimeConfig[key] = value
    }
  }

  return {
    schema_version: schemaVersion,
    meta,
    slot_registry: pluginBackendsToSlotRegistry(pb),
    ...(schemaVersion === 4 && Object.keys(runtimeConfig).length
      ? { runtime_config: runtimeConfig }
      : {}),
  }
}

function validateInferenceProfile(value: unknown, errors: string[]): void {
  const prefix = 'runtime_config.inference_profile'
  if (!isRecord(value)) {
    errors.push(`${prefix} 须为对象`)
    return
  }
  for (const key of Object.keys(value)) {
    if (!INFERENCE_PROFILE_KEYS.has(key)) errors.push(`${prefix} 含未知字段「${key}」`)
  }

  const validateObject = (
    section: unknown,
    sectionName: string,
    allowed: ReadonlySet<string>,
  ): Record<string, unknown> | null => {
    if (section == null) return null
    if (!isRecord(section)) {
      errors.push(`${prefix}.${sectionName} 须为对象`)
      return null
    }
    for (const key of Object.keys(section)) {
      if (!allowed.has(key)) errors.push(`${prefix}.${sectionName} 含未知字段「${key}」`)
    }
    return section
  }
  const validateNumber = (
    section: Record<string, unknown> | null,
    path: string,
    min: number,
    max: number,
    integer = false,
    exclusiveMin = false,
  ): void => {
    const field = path.split('.').at(-1) ?? path
    const raw = section?.[field]
    if (raw == null) return
    const valid =
      typeof raw === 'number'
      && Number.isFinite(raw)
      && (!integer || Number.isInteger(raw))
      && (exclusiveMin ? raw > min : raw >= min)
      && raw <= max
    if (!valid) errors.push(`${prefix}.${path} 数值范围非法`)
  }

  const generation = validateObject(value.generation, 'generation', INFERENCE_GENERATION_KEYS)
  validateNumber(generation, 'generation.temperature', 0, 2)
  validateNumber(generation, 'generation.top_p', 0, 1, false, true)
  validateNumber(generation, 'generation.preferred_output_tokens', 1, 32_768, true)
  validateNumber(generation, 'generation.maximum_output_tokens', 1, 32_768, true)
  const preferredOutput = generation?.preferred_output_tokens
  const maximumOutput = generation?.maximum_output_tokens
  if (
    typeof preferredOutput === 'number'
    && typeof maximumOutput === 'number'
    && preferredOutput > maximumOutput
  ) {
    errors.push(`${prefix}.generation.preferred_output_tokens 不得大于 maximum_output_tokens`)
  }

  const context = validateObject(value.context, 'context', INFERENCE_CONTEXT_KEYS)
  validateNumber(context, 'context.preferred_tokens', 1, 262_144, true)
  validateNumber(context, 'context.minimum_tokens', 1, 262_144, true)
  const preferredContext = context?.preferred_tokens
  const minimumContext = context?.minimum_tokens
  if (
    typeof preferredContext === 'number'
    && typeof minimumContext === 'number'
    && minimumContext > preferredContext
  ) {
    errors.push(`${prefix}.context.minimum_tokens 不得大于 preferred_tokens`)
  }

  const reasoning = validateObject(value.reasoning, 'reasoning', INFERENCE_REASONING_KEYS)
  if (
    reasoning?.mode != null
    && !['instant', 'adaptive', 'deep'].includes(String(reasoning.mode))
  ) {
    errors.push(`${prefix}.reasoning.mode 枚举非法`)
  }
  validateNumber(reasoning, 'reasoning.effort', 0, 1)

  const performance = validateObject(
    value.performance_intent,
    'performance_intent',
    INFERENCE_PERFORMANCE_KEYS,
  )
  if (
    performance?.priority != null
    && !['latency', 'balanced', 'quality'].includes(String(performance.priority))
  ) {
    errors.push(`${prefix}.performance_intent.priority 枚举非法`)
  }
  for (const key of [
    'prefer_prefix_cache',
    'prefer_model_residency',
    'allow_context_reduction',
    'allow_output_reduction',
  ]) {
    if (performance?.[key] != null && typeof performance[key] !== 'boolean') {
      errors.push(`${prefix}.performance_intent.${key} 须为布尔值`)
    }
  }
}

/** Explicit v2 builder retained for compatibility and v2 round-trip tests. */
export function buildBlueprintV2FromLegacy(
  manifest: Record<string, unknown>,
  settings: Record<string, unknown>,
): BlueprintDocument {
  return buildBlueprintFromLegacy(manifest, settings, 2)
}

export function serializeBlueprint(bp: BlueprintDocument): string {
  return `${JSON.stringify(bp, null, 2)}\n`
}

/** @deprecated Use `serializeBlueprint`. */
export const serializeBlueprintV2 = serializeBlueprint

/** 将 v2 蓝图拆回编写器使用的 manifest/settings 形状（JSON 编辑器 / 表单）。 */
export function blueprintToLegacyParts(bp: BlueprintDocument): {
  manifest: Record<string, unknown>
  settings: Record<string, unknown>
} {
  const meta = { ...bp.meta }
  const manifest: Record<string, unknown> = {
    id: meta.id,
    name: meta.name,
    version: meta.version,
    author: meta.author,
    description: meta.description,
    default_personality: meta.personality,
    user_relations: meta.relations,
    default_relation: meta.default_relation,
    scenes: meta.scenes,
    evolution: meta.evolution,
    memory_config: meta.memory_config,
    identity_binding: meta.identity_binding,
    dev_only: meta.dev_only,
    knowledge: meta.knowledge,
    life_trajectory: meta.life_trajectory,
    life_schedule: meta.life_schedule,
    min_runtime_version: meta.min_runtime_version,
    creator_message_to_downloader: meta.creator_message_to_downloader,
    featured: meta.featured,
    preset_order: meta.preset_order,
  }
  const plugin_backends = slotRegistryToPluginBackends(bp.slot_registry)
  const settings: Record<string, unknown> = {
    schema_version: 1,
    identity_binding: meta.identity_binding ?? 'per_scene',
    interaction_mode: meta.interaction_mode ?? 'immersive',
    evolution: meta.evolution,
    memory_config: meta.memory_config,
    remote_presence: meta.remote_presence,
    autonomous_scene: meta.autonomous_scene,
    plugin_backends,
  }
  if (typeof meta.reply_quality_anchor === 'string' && meta.reply_quality_anchor.trim()) {
    settings.reply_quality_anchor = meta.reply_quality_anchor
  }
  if (bp.runtime_config) {
    const { ollama_model: _hostOwnedModel, ...creatorRuntime } = bp.runtime_config
    Object.assign(settings, creatorRuntime)
  }
  return { manifest, settings }
}

export function parseBlueprintJson(raw: string): BlueprintDocument {
  const v = JSON.parse(raw) as BlueprintDocument
  if (v.schema_version !== 2 && v.schema_version !== 4) {
    if ((v as { schema_version?: number }).schema_version === 3) {
      throw new Error(
        '检测到冻结的 v3 / dual-core Beta 蓝图；编写器仅编辑 v2 与 Stable v4。',
      )
    }
    throw new Error(
      `pipeline.ocblueprint schema_version 须为 2 或 4（当前 ${v.schema_version}）`,
    )
  }
  if (!v.meta || typeof v.meta !== 'object') {
    throw new Error('pipeline.ocblueprint 缺少 meta')
  }
  if (!v.slot_registry || typeof v.slot_registry !== 'object') {
    throw new Error('pipeline.ocblueprint 缺少 slot_registry')
  }
  return v
}

/** @deprecated Use `parseBlueprintJson`. */
export const parseBlueprintV2Json = parseBlueprintJson

/** v2 / v4 蓝图最小校验（编写器 TS 兜底；完整校验走 Tauri / pack validate）。 */
export function validateBlueprintTypescript(
  bp: BlueprintDocument,
  roleId?: string,
): string[] {
  const errors: string[] = []
  const root = bp as unknown as Record<string, unknown>
  if (bp.schema_version !== 2 && bp.schema_version !== 4) {
    errors.push(`schema_version 须为 2 或 4（当前 ${bp.schema_version}）`)
  }
  for (const key of Object.keys(root)) {
    if (!BLUEPRINT_ROOT_KEYS.has(key)) errors.push(`pipeline.ocblueprint 含未知顶层字段「${key}」`)
  }

  const id = String(bp.meta.id ?? '').trim()
  if (!id) errors.push('meta.id 不能为空')
  if (roleId && id && roleId.trim() !== id) {
    errors.push(`meta.id（${id}）与目录名（${roleId}）不一致`)
  }

  const slotEntries = Object.entries(bp.slot_registry)
  if (slotEntries.length === 0) errors.push('slot_registry 不能为空')
  const positions = new Set<string>()
  let llmCount = 0
  for (const [key, slot] of slotEntries) {
    if (!key.trim()) {
      errors.push('slot_registry 键名不能为空')
      continue
    }
    if (!isRecord(slot)) {
      errors.push(`slot_registry[${key}] 须为对象`)
      continue
    }
    for (const field of Object.keys(slot)) {
      if (!SLOT_KEYS.has(field)) errors.push(`slot_registry[${key}] 含未知字段「${field}」`)
    }

    const type = typeof slot.type === 'string' ? slot.type.trim() : ''
    const label = typeof slot.label === 'string' ? slot.label.trim() : ''
    const backend = typeof slot.backend === 'string' ? slot.backend.trim() : ''
    const position = slot.position
    if (!label) errors.push(`slot_registry[${key}].label 不能为空`)
    if (!(SLOT_TYPES as readonly string[]).includes(type)) {
      errors.push(`slot_registry[${key}].type「${type}」非法`)
      continue
    }
    if (!Number.isInteger(position) || Number(position) < 0) {
      errors.push(`slot_registry[${key}].position 须为非负整数`)
    } else {
      const positionKey = `${type}:${position}`
      if (positions.has(positionKey)) {
        errors.push(`slot_registry：type「${type}」下 position ${position} 重复`)
      }
      positions.add(positionKey)
    }
    if (type === 'llm') llmCount += 1

    const allowedBackends = SLOT_BACKENDS[type] ?? []
    if (!allowedBackends.includes(backend)) {
      errors.push(
        `slot_registry[${key}]：type「${type}」的 backend「${backend}」非法（允许: ${allowedBackends.join(', ')}）`,
      )
    }

    const hasPlugin = typeof slot.plugin === 'string' && slot.plugin.trim().length > 0
    if (slot.plugin != null && typeof slot.plugin !== 'string') {
      errors.push(`slot_registry[${key}].plugin 须为字符串或 null`)
    }
    if (slot.plugins != null && !Array.isArray(slot.plugins)) {
      errors.push(`slot_registry[${key}].plugins 须为字符串数组或 null`)
    } else if (
      Array.isArray(slot.plugins)
      && slot.plugins.some((plugin) => typeof plugin !== 'string')
    ) {
      errors.push(`slot_registry[${key}].plugins 须为字符串数组或 null`)
    }
    for (const optionalField of ['model', 'url', 'local_memory_provider_id'] as const) {
      if (slot[optionalField] != null && typeof slot[optionalField] !== 'string') {
        errors.push(`slot_registry[${key}].${optionalField} 须为字符串或 null`)
      }
    }
    const plugins = Array.isArray(slot.plugins)
      ? slot.plugins.filter((plugin): plugin is string => typeof plugin === 'string' && plugin.trim().length > 0)
      : []
    if (type !== 'agent' && hasPlugin && plugins.length > 0) {
      errors.push(`slot_registry[${key}]：非 agent 槽位不得同时包含 plugin 与 plugins`)
    }
    if (type === 'agent' && backend !== 'directory' && plugins.length > 0) {
      errors.push(`slot_registry[${key}]：agent 非 directory 后端不得包含 plugins`)
    }
    if (backend === 'directory' && !hasPlugin && plugins.length === 0) {
      errors.push(`slot_registry[${key}]：directory 后端须指定 plugin 或 plugins`)
    }
    if (type === 'llm' && backend === 'ollama' && typeof slot.model === 'string' && !slot.model.trim()) {
      errors.push(`slot_registry[${key}]：ollama 槽位的 model 若存在则不得为空`)
    }
  }
  if (llmCount === 0) errors.push('slot_registry 须至少包含一个 type: llm 实例')

  const memberOwners = new Map<string, string>()
  const groups = bp.groups
  if (groups != null && !isRecord(groups)) {
    errors.push('groups 须为对象')
  }
  for (const [groupId, group] of Object.entries(isRecord(groups) ? groups : {})) {
    if (!groupId.trim()) {
      errors.push('groups 键名不能为空')
      continue
    }
    if (!isRecord(group)) {
      errors.push(`groups[${groupId}] 须为对象`)
      continue
    }
    for (const field of Object.keys(group)) {
      if (!GROUP_KEYS.has(field)) errors.push(`groups[${groupId}] 含未知字段「${field}」`)
    }
    const label = typeof group.label === 'string' ? group.label.trim() : ''
    const type = typeof group.type === 'string' ? group.type.trim() : ''
    const members = Array.isArray(group.members) ? group.members : []
    if (!label) errors.push(`groups[${groupId}].label 不能为空`)
    if (!(GROUP_SLOT_TYPES as readonly string[]).includes(type)) {
      errors.push(`groups[${groupId}].type「${type}」非法`)
    }
    if (members.length === 0) errors.push(`groups[${groupId}].members 不能为空`)
    for (const memberValue of members) {
      const member = typeof memberValue === 'string' ? memberValue.trim() : ''
      if (!member) {
        errors.push(`groups[${groupId}].members 含空键名`)
        continue
      }
      const slot = bp.slot_registry[member]
      if (!slot) {
        errors.push(`groups[${groupId}].members 引用未知 slot_registry 键「${member}」`)
        continue
      }
      if (slot.type.trim() !== type) {
        errors.push(`groups[${groupId}].members「${member}」与 groups.type「${type}」不一致`)
      }
      const previous = memberOwners.get(member)
      if (previous) errors.push(`slot_registry 键「${member}」同时属于 groups「${previous}」与「${groupId}」`)
      memberOwners.set(member, groupId)
    }
  }

  const includes = root.includes
  if (includes != null && !Array.isArray(includes)) {
    errors.push('includes 须为数组')
  } else {
    for (const [index, includeValue] of (includes ?? []).entries()) {
      if (!isRecord(includeValue)) {
        errors.push(`includes[${index}] 须为对象`)
        continue
      }
      for (const field of Object.keys(includeValue)) {
        if (!INCLUDE_KEYS.has(field)) errors.push(`includes[${index}] 含未知字段「${field}」`)
      }
      if (includeValue.id != null && typeof includeValue.id !== 'string') {
        errors.push(`includes[${index}].id 须为字符串`)
      }
      const path = typeof includeValue.path === 'string' ? includeValue.path.trim() : ''
      const target = typeof includeValue.target === 'string' ? includeValue.target.trim() : ''
      const mode = typeof includeValue.mode === 'string' ? includeValue.mode.trim() : ''
      if (!path) errors.push(`includes[${index}].path 不能为空`)
      if (
        path.includes('\\')
        || path.startsWith('/')
        || path.includes('..')
        || path.includes('//')
        || !/^[A-Za-z0-9_./-]+$/.test(path)
      ) {
        errors.push(`includes[${index}].path 须为包内安全相对路径`)
      }
      if (
        !INCLUDE_TARGETS.has(target)
        && !/^slot_registry\.[^.]+(?:\.[^.]+)*$/.test(target)
      ) {
        errors.push(`includes[${index}].target「${target}」非法`)
      }
      if (mode !== 'merge' && mode !== 'replace') {
        errors.push(`includes[${index}].mode「${mode}」非法（允许: merge, replace）`)
      }
    }
  }

  if (bp.expert_overlay != null && !isRecord(bp.expert_overlay)) {
    errors.push('expert_overlay 须为对象')
  }

  if (bp.runtime_config != null) {
    if (!isRecord(bp.runtime_config)) {
      errors.push('runtime_config 须为对象')
    } else {
      for (const key of Object.keys(bp.runtime_config)) {
        if (!RUNTIME_CONFIG_KEYS.has(key)) errors.push(`runtime_config 含未知字段「${key}」`)
      }
      const dualCore = bp.runtime_config.dual_core
      if (dualCore != null) {
        if (bp.schema_version === 4) {
          errors.push('runtime_config.dual_core 仅属于冻结 v3，Stable v4 不接受该字段')
        }
        if (!isRecord(dualCore)) {
          errors.push('runtime_config.dual_core 须为对象')
        } else {
          for (const key of Object.keys(dualCore)) {
            if (key !== 'enabled') errors.push(`runtime_config.dual_core 含未知字段「${key}」`)
          }
        }
      }
      if (bp.runtime_config.inference_profile != null) {
        if (bp.schema_version !== 4) {
          errors.push('runtime_config.inference_profile 仅属于 Stable v4')
        }
        validateInferenceProfile(bp.runtime_config.inference_profile, errors)
      }
    }
  }

  if (bp.schema_version === 2 && bp.extensions != null) {
    errors.push('extensions 仅属于 Stable v4，schema_version 2 不接受该字段')
  }
  if (bp.extensions != null && !isRecord(bp.extensions)) {
    errors.push('extensions 须为对象')
  }
  for (const [instanceId, declaration] of Object.entries(
    isRecord(bp.extensions) ? bp.extensions : {},
  )) {
    const label = `extensions[${instanceId}]`
    if (!isNamespacedId(instanceId)) {
      errors.push(`${label} 实例 id 须为至少两段的小写命名空间`)
    }
    if (!isRecord(declaration)) {
      errors.push(`${label} 须为对象`)
      continue
    }
    for (const key of Object.keys(declaration)) {
      if (!EXTENSION_KEYS.has(key)) errors.push(`${label} 含未知字段「${key}」`)
    }
    if (!isNamespacedId(declaration.capability)) {
      errors.push(`${label}.capability 须为至少两段的小写命名空间`)
    }
    if (declaration.provider != null && !isNamespacedId(declaration.provider)) {
      errors.push(`${label}.provider 须为至少两段的小写命名空间`)
    }
    if (declaration.required != null && typeof declaration.required !== 'boolean') {
      errors.push(`${label}.required 须为布尔值`)
    }
    if (
      !Number.isInteger(declaration.config_schema_version)
      || Number(declaration.config_schema_version) <= 0
    ) {
      errors.push(`${label}.config_schema_version 须为大于 0 的整数`)
    }
    const configRef =
      typeof declaration.config_ref === 'string' ? declaration.config_ref.trim() : ''
    const expectedPrefix = `blueprint/extensions/${instanceId}/`
    if (
      !isSafeBlueprintRelativePath(configRef)
      || !configRef.endsWith('.json')
      || !configRef.startsWith(expectedPrefix)
    ) {
      errors.push(`${label}.config_ref 须为 ${expectedPrefix} 下的安全 JSON 相对路径`)
    }
  }

  return errors
}

/** @deprecated Use `validateBlueprintTypescript`. */
export const validateBlueprintV2Typescript = validateBlueprintTypescript

function isNamespacedId(value: unknown): value is string {
  return (
    typeof value === 'string'
    && value.length <= 160
    && /^[a-z0-9_-]+(?:\.[a-z0-9_-]+)+$/.test(value)
  )
}

function isSafeBlueprintRelativePath(value: string): boolean {
  return (
    value.length > 0
    && !value.includes('\\')
    && !value.startsWith('/')
    && !value.includes('..')
    && !value.includes('//')
    && /^[A-Za-z0-9_./-]+$/.test(value)
  )
}

export function isLegacyRolePackLayout(paths: string[]): boolean {
  return paths.some((p) => /(^|\/)manifest\.json$/.test(p.replace(/\\/g, '/')))
}

export function isV2RolePackLayout(paths: string[]): boolean {
  return paths.some((p) =>
    p.replace(/\\/g, '/').endsWith(`/${PIPELINE_BLUEPRINT_FILENAME}`),
  )
}

/** 测试与示例 zip 用的最小 Stable v4 蓝图 JSON 文本。 */
export function minimalBlueprintJsonForRole(roleId: string, name = 'H'): string {
  const bp = buildBlueprintFromLegacy(
    {
      id: roleId,
      name,
      scenes: ['home'],
      user_relations: { f: { favor_multiplier: 1, initial_favorability: 40 } },
      default_relation: 'f',
    },
    { schema_version: 1, plugin_backends: { llm: 'ollama' } },
  )
  return serializeBlueprint(bp)
}
