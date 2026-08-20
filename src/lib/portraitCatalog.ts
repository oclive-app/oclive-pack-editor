/** B1 + A2：7 固定槽 id SSOT（与主仓 SIMPLE_PORTRAIT_SLOT_IDS 对齐）。 */
export const SIMPLE_PORTRAIT_SLOT_IDS = [
  'happy_default',
  'sad_default',
  'angry_default',
  'neutral_default',
  'excited_default',
  'confused_default',
  'shy_default',
] as const

export type PortraitSlotId = (typeof SIMPLE_PORTRAIT_SLOT_IDS)[number]

export const PORTRAIT_SLOT_TAG: Record<PortraitSlotId, string> = {
  happy_default: 'happy',
  sad_default: 'sad',
  angry_default: 'angry',
  neutral_default: 'neutral',
  excited_default: 'excited',
  confused_default: 'confused',
  shy_default: 'shy',
}

export type PortraitAssetKind = 'image' | 'live2d' | 'rig3d' | 'procedural'

export type PortraitCatalogEntry = {
  id: string
  path: string
  desc: string
  tags: string[]
  kind: PortraitAssetKind
  cluster?: string
  file?: File
}

export type PortraitSlotFileMap = Partial<Record<PortraitSlotId, File>>

export type VisualPresentationConfig = {
  enabled: boolean
  backend: string
  live2dModel?: string
}

export function isUnsafeAssetPath(path: string): boolean {
  const p = path.trim()
  if (!p) return true
  if (p.startsWith('/') || p.startsWith('\\')) return true
  if (p.includes('..')) return true
  if (p.includes('\\')) return true
  return false
}

export function entryFromSlot(id: PortraitSlotId, file: File): PortraitCatalogEntry {
  const tag = PORTRAIT_SLOT_TAG[id]
  return {
    id,
    path: `assets/images/${file.name}`,
    desc: tag,
    tags: [tag],
    kind: 'image',
    file,
  }
}

/** 7 固定槽 + 高级额外条目 → portrait_catalog.json */
export function buildPortraitCatalogJson(
  slotFiles: PortraitSlotFileMap,
  extraEntries: PortraitCatalogEntry[] = [],
): string {
  const slotAssets = SIMPLE_PORTRAIT_SLOT_IDS.flatMap((id) => {
    const file = slotFiles[id]
    if (!file) return []
    const e = entryFromSlot(id, file)
    return [serializeAsset(e)]
  })
  const extraAssets = extraEntries
    .filter((e) => e.id.trim() && e.path.trim())
    .filter((e) => !(SIMPLE_PORTRAIT_SLOT_IDS as readonly string[]).includes(e.id))
    .map(serializeAsset)
  const assets = [...slotAssets, ...extraAssets]
  return `${JSON.stringify({ schema_version: 1, assets }, null, 2)}\n`
}

function serializeAsset(e: PortraitCatalogEntry): Record<string, unknown> {
  const out: Record<string, unknown> = {
    id: e.id.trim(),
    path: e.path.trim(),
    desc: e.desc.trim() || e.id,
    tags: e.tags.filter(Boolean),
    kind: e.kind,
  }
  if (e.cluster?.trim()) out.cluster = e.cluster.trim()
  return out
}

export function buildSimpleConfigJson(
  portraitEnabled = true,
  visual?: VisualPresentationConfig,
): string {
  const visualBlock: Record<string, unknown> | undefined = visual
    ? {
        enabled: visual.enabled,
        backend: visual.backend,
        ...(visual.live2dModel?.trim()
          ? { resources: { live2d_model: visual.live2dModel.trim() } }
          : {}),
      }
    : undefined
  return `${JSON.stringify({
    reply_post_processor: {
      enabled: false,
      backend: 'builtin',
      builtin: { profile: 'standard' },
    },
    portrait_catalog: { enabled: portraitEnabled },
    ...(visualBlock ? { visual_presentation: visualBlock } : {}),
  }, null, 2)}\n`
}

/**
 * 把编写器负责的立绘/视觉开关合并进现有 config.json。
 * 其余设施与未知字段原样保留，避免高级编辑或跨版本导入后被覆盖。
 */
export function mergeManagedConfigJson(
  currentRaw: string,
  portraitEnabled: boolean,
  visual: VisualPresentationConfig,
): string {
  let root: Record<string, unknown>
  try {
    const parsed = JSON.parse(currentRaw) as unknown
    root = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? { ...(parsed as Record<string, unknown>) }
      : {}
  } catch {
    root = {}
  }

  const portraitPrevious =
    root.portrait_catalog && typeof root.portrait_catalog === 'object'
      ? (root.portrait_catalog as Record<string, unknown>)
      : {}
  root.portrait_catalog = { ...portraitPrevious, enabled: portraitEnabled }

  const visualPrevious =
    root.visual_presentation && typeof root.visual_presentation === 'object'
      ? (root.visual_presentation as Record<string, unknown>)
      : {}
  const resourcesPrevious =
    visualPrevious.resources && typeof visualPrevious.resources === 'object'
      ? (visualPrevious.resources as Record<string, unknown>)
      : {}
  const resources = { ...resourcesPrevious }
  if (visual.live2dModel?.trim()) resources.live2d_model = visual.live2dModel.trim()
  else delete resources.live2d_model
  root.visual_presentation = {
    ...visualPrevious,
    enabled: visual.enabled,
    backend: visual.backend,
    ...(Object.keys(resources).length ? { resources } : {}),
  }

  return `${JSON.stringify(root, null, 2)}\n`
}

export function parseConfigJson(raw: string | undefined): {
  portraitEnabled: boolean
  visual: VisualPresentationConfig
} {
  const defaults: VisualPresentationConfig = { enabled: false, backend: 'image' }
  if (!raw?.trim()) {
    return { portraitEnabled: false, visual: defaults }
  }
  try {
    const root = JSON.parse(raw) as Record<string, unknown>
    const pc = root.portrait_catalog as { enabled?: boolean } | undefined
    const vp = root.visual_presentation as {
      enabled?: boolean
      backend?: string
      resources?: { live2d_model?: string }
    } | undefined
    return {
      portraitEnabled: pc?.enabled === true,
      visual: {
        enabled: vp?.enabled === true,
        backend: typeof vp?.backend === 'string' ? vp.backend : 'image',
        live2dModel:
          typeof vp?.resources?.live2d_model === 'string'
            ? vp.resources.live2d_model
            : undefined,
      },
    }
  } catch {
    return { portraitEnabled: false, visual: defaults }
  }
}

export function slotFilesFromEmotionImages(files: File[]): PortraitSlotFileMap {
  const out: PortraitSlotFileMap = {}
  for (const id of SIMPLE_PORTRAIT_SLOT_IDS) {
    const tag = PORTRAIT_SLOT_TAG[id]
    const match = files.find((f) => {
      const base = f.name.replace(/\.[^.]+$/, '').toLowerCase()
      return base === tag || base === id.replace('_default', '')
    })
    if (match) out[id] = match
  }
  return out
}

export function emotionFilesFromSlotMap(slotFiles: PortraitSlotFileMap): File[] {
  const seen = new Set<string>()
  const out: File[] = []
  for (const id of SIMPLE_PORTRAIT_SLOT_IDS) {
    const f = slotFiles[id]
    if (f && !seen.has(f.name)) {
      seen.add(f.name)
      out.push(f)
    }
  }
  return out
}

export type CatalogAssetFile = { relPath: string; file: File }

/** Slot + extra files with catalog-relative paths (live2d → assets/live2d/…). */
export function collectCatalogBinaryAssets(
  slotFiles: PortraitSlotFileMap,
  extraEntries: PortraitCatalogEntry[],
): CatalogAssetFile[] {
  const seen = new Set<string>()
  const out: CatalogAssetFile[] = []
  for (const id of SIMPLE_PORTRAIT_SLOT_IDS) {
    const f = slotFiles[id]
    const rel = `assets/images/${f?.name ?? ''}`
    if (f && !seen.has(rel)) {
      seen.add(rel)
      out.push({ relPath: rel, file: f })
    }
  }
  for (const e of extraEntries) {
    const rel = e.path.trim()
    const f = e.file
    if (f && rel && !seen.has(rel)) {
      seen.add(rel)
      out.push({ relPath: rel, file: f })
    }
  }
  return out
}

export function emotionFilesFromCatalog(
  slotFiles: PortraitSlotFileMap,
  extraEntries: PortraitCatalogEntry[],
): File[] {
  const seen = new Set<string>()
  const out: File[] = []
  for (const f of emotionFilesFromSlotMap(slotFiles)) {
    if (!seen.has(f.name)) {
      seen.add(f.name)
      out.push(f)
    }
  }
  for (const e of extraEntries) {
    const f = e.file
    if (f && !seen.has(f.name)) {
      seen.add(f.name)
      out.push(f)
    }
  }
  return out
}

export type ParsedPortraitCatalog = {
  slotFiles: PortraitSlotFileMap
  extraEntries: PortraitCatalogEntry[]
}

export function parsePortraitCatalogJson(raw: string): ParsedPortraitCatalog {
  let parsed: {
    assets?: Array<{
      id?: string
      path?: string
      desc?: string
      tags?: string[]
      kind?: string
      cluster?: string
    }>
  }
  try {
    parsed = JSON.parse(raw) as typeof parsed
  } catch {
    return { slotFiles: {}, extraEntries: [] }
  }
  const slotFiles: PortraitSlotFileMap = {}
  const extraEntries: PortraitCatalogEntry[] = []
  for (const a of parsed.assets ?? []) {
    const id = (a.id ?? '').trim()
    const path = (a.path ?? '').trim()
    if (!id || !path) continue
    const name = path.split('/').pop() ?? ''
    if (!name) continue
    const kind = (a.kind ?? 'image') as PortraitAssetKind
    const entry: PortraitCatalogEntry = {
      id,
      path,
      desc: (a.desc ?? '').trim() || id,
      tags: Array.isArray(a.tags) ? a.tags.map(String) : [],
      kind: ['image', 'live2d', 'rig3d', 'procedural'].includes(kind) ? kind : 'image',
      cluster: a.cluster?.trim() || undefined,
      file: new File([], name, { type: 'image/png' }),
    }
    if (id in PORTRAIT_SLOT_TAG) {
      slotFiles[id as PortraitSlotId] = entry.file!
    } else {
      extraEntries.push(entry)
    }
  }
  return { slotFiles, extraEntries }
}

export type PortraitCatalogValidationIssue = {
  level: 'error' | 'warning'
  message: string
}

/** TS 镜像主仓 validate_portrait_catalog_files 子集（id 唯一、path 安全、缺槽警告）。 */
export function validatePortraitCatalogState(
  slotFiles: PortraitSlotFileMap,
  extraEntries: PortraitCatalogEntry[],
  portraitEnabled: boolean,
): PortraitCatalogValidationIssue[] {
  const issues: PortraitCatalogValidationIssue[] = []
  const ids = new Set<string>()

  /** 未选图的额外条目视为编辑中草稿，不参与导出校验。 */
  const completeExtras = extraEntries.filter((e) => e.path.trim())
  const allEntries: PortraitCatalogEntry[] = [
    ...SIMPLE_PORTRAIT_SLOT_IDS.flatMap((id) => {
      const f = slotFiles[id]
      return f ? [entryFromSlot(id, f)] : []
    }),
    ...completeExtras,
  ]

  for (const e of allEntries) {
    if (!e.id.trim()) {
      issues.push({ level: 'error', message: 'portrait_catalog：存在空 id 条目' })
      continue
    }
    if (ids.has(e.id)) {
      issues.push({ level: 'error', message: `portrait_catalog：重复 id「${e.id}」` })
    }
    ids.add(e.id)
    if (!e.path.trim()) {
      issues.push({ level: 'error', message: `portrait_catalog：id「${e.id}」缺少 path` })
    } else if (isUnsafeAssetPath(e.path)) {
      issues.push({ level: 'error', message: `portrait_catalog：id「${e.id}」path 不安全` })
    }
  }

  if (portraitEnabled && allEntries.length === 0) {
    issues.push({
      level: 'warning',
      message: 'portrait_catalog 启用但尚无 assets 条目',
    })
  }

  if (portraitEnabled) {
    for (const id of SIMPLE_PORTRAIT_SLOT_IDS) {
      if (!slotFiles[id]) {
        issues.push({
          level: 'warning',
          message: `portrait_catalog 启用时缺少简单包固定 id「${id}」`,
        })
      }
    }
  }

  return issues
}

export type ExportProfile = 'desktop-full' | 'vscode-lite' | 'theater'

/** 按发行版 profile 调整 config / catalog 导出形状（Sprint D）。 */
export function applyExportProfile(
  profile: ExportProfile,
  portraitEnabled: boolean,
  visual: VisualPresentationConfig,
  slotFiles: PortraitSlotFileMap,
  extraEntries: PortraitCatalogEntry[],
): {
  portraitEnabled: boolean
  visual: VisualPresentationConfig
  slotFiles: PortraitSlotFileMap
  extraEntries: PortraitCatalogEntry[]
} {
  switch (profile) {
    case 'vscode-lite':
      return {
        portraitEnabled: portraitEnabled && Object.keys(slotFiles).length > 0,
        visual: { enabled: false, backend: 'image' },
        slotFiles,
        extraEntries: [],
      }
    case 'theater':
      return {
        portraitEnabled,
        visual: {
          enabled: visual.enabled || portraitEnabled,
          backend: visual.backend === 'image' ? 'live2d' : visual.backend,
          live2dModel: visual.live2dModel,
        },
        slotFiles,
        extraEntries,
      }
    default:
      return { portraitEnabled, visual, slotFiles, extraEntries }
  }
}
