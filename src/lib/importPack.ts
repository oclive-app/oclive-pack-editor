/**
 * 从 .zip / .ocpak 导入角色包，用于编辑或另存为新包。
 */
import JSZip from 'jszip'
import {
  mergedSceneIds,
  type RolePackBinaryFile,
  type RolePackTextFile,
} from './exportPack'
import { normalizeKnowledgePath, type KnowledgeMarkdownFile } from './knowledgeFiles'
import {
  parseSceneFromDisk,
  type SceneEditorEntry,
} from './scenePackUser'
import {
  blueprintToLegacyParts,
  isLegacyRolePackLayout,
  isV2RolePackLayout,
  parseBlueprintJson,
  pickEditorPreservedBlueprintFields,
  PIPELINE_BLUEPRINT_FILENAME,
  REPLY_QUALITY_ANCHOR_REL_PATH,
} from './blueprintV2'
import { ADULT_EXTENSION_FILENAME } from './adultExtension'
export type ImportedRolePack = {
  roleId: string
  manifestJson: string
  settingsJson: string
  corePersonality: string
  worldviewMarkdown: string
  knowledgeMarkdownFiles: KnowledgeMarkdownFile[]
  /** 从包内 assets/images 解压出的文件，便于再次导出 */
  emotionImageFiles: File[]
  /** roles/{id}/portrait_catalog.json 全文（可选） */
  portraitCatalogJson: string
  /** roles/{id}/config.json 全文（可选） */
  configJson: string
  /** Optional Chat Pro adult-role extension. */
  adultExtensionJson: string
  /** roles/{id}/creator_message.txt 全文（可含多行，与导出模式一致） */
  creatorMessage: string
  /** roles/{id}/ui.json（可选） */
  uiJson: string
  /** roles/{id}/author.json（可选） */
  authorJson: string
  /** roles/{id}/memory_seed.json（可选，只读初始记忆） */
  memorySeedJson?: string
  /** roles/{id}/user_identities/*.md 模板 */
  userIdentityFiles?: RolePackTextFile[]
  /** roles/{id}/user_identities/index.json */
  userIdentitiesIndexJson?: string
  preservedFiles?: RolePackBinaryFile[]
  preservedBlueprintFields?: Record<string, unknown>
  /** 从 scenes/{id}/ 还原的用户场景编辑态 */
  sceneEditorEntries: SceneEditorEntry[]
}

function normalizeZipPath(p: string): string {
  return p.replace(/\\/g, '/').replace(/^\/+/, '')
}

/** 拒绝 zip-slip：路径段中不得出现 `.` / `..`，且必须落在 roleId 之下。 */
export function isSafePathUnderRole(fullPath: string, roleId: string): boolean {
  const p = normalizeZipPath(fullPath)
  const prefix = `${roleId}/`
  if (!p.startsWith(prefix)) return false
  const segments = p.split('/').filter((s) => s.length > 0)
  if (segments.length < 2 || segments[0] !== roleId) return false
  for (const s of segments) {
    if (s === '.' || s === '..') return false
  }
  return true
}

function isValidRoleId(id: string): boolean {
  if (!id || id === '.' || id === '..') return false
  if (id.includes('/') || id.includes('\\') || id.includes('\0')) return false
  return true
}

function isSafeAssetImageEntry(path: string, roleId: string, prefix: string): boolean {
  if (!path.startsWith(prefix) || path.endsWith('/')) return false
  if (!isSafePathUnderRole(path, roleId)) return false
  const base = path.slice(prefix.length)
  if (!base || base.includes('/') || base.includes('\\')) return false
  if (base === '.' || base === '..') return false
  return true
}

/** 解析 zip：优先 v2 / Stable v4 `pipeline.ocblueprint`；legacy manifest 需迁移。 */
export async function importRolePackFromZip(file: File): Promise<ImportedRolePack> {
  const zip = await JSZip.loadAsync(file)
  const names = Object.keys(zip.files).filter((n) => !zip.files[n].dir)
  const normNames = names.map(normalizeZipPath)

  if (isLegacyRolePackLayout(normNames) && !isV2RolePackLayout(normNames)) {
    throw new Error(
      '压缩包为 legacy manifest.json 格式。请先用 oclive pack migrate-to-blueprint 迁移，或在编写器重新导出蓝图包。',
    )
  }

  const blueprintPath = normNames.find((n) =>
    /(^|\/)[^/]+\/pipeline\.ocblueprint$/.test(n),
  )
  if (!blueprintPath) {
    throw new Error('压缩包内未找到「角色文件夹/pipeline.ocblueprint」结构。')
  }

  const blueprintSegments = blueprintPath.split('/').filter(Boolean)
  if (blueprintSegments.some((s) => s === '.' || s === '..')) {
    throw new Error('压缩包内 blueprint 路径非法（含 . 或 .. 段）。')
  }
  const roleId = blueprintSegments[0]!
  if (!isValidRoleId(roleId)) {
    throw new Error('角色目录名非法。')
  }
  if (!isSafePathUnderRole(blueprintPath, roleId)) {
    throw new Error('压缩包内 blueprint 路径非法。')
  }

  const readText = async (rel: string): Promise<string> => {
    const p = `${roleId}/${rel}`.replace(/\/+/g, '/')
    if (!isSafePathUnderRole(p, roleId)) return ''
    const entry = zip.file(p)
    if (!entry) return ''
    return (await entry.async('string')) as string
  }

  const blueprintRaw = await readText(PIPELINE_BLUEPRINT_FILENAME)
  if (!blueprintRaw.trim()) throw new Error('pipeline.ocblueprint 为空')

  const bp = parseBlueprintJson(blueprintRaw)
  const preservedBlueprintFields = pickEditorPreservedBlueprintFields(bp)
  const { manifest, settings } = blueprintToLegacyParts(bp)
  const anchorFromMeta =
    typeof settings.reply_quality_anchor === 'string'
      ? String(settings.reply_quality_anchor).trim()
      : ''
  const anchorMd = await readText(REPLY_QUALITY_ANCHOR_REL_PATH)
  if (!anchorFromMeta && anchorMd.trim()) {
    settings.reply_quality_anchor = anchorMd.trim()
  }

  const manifestJson = `${JSON.stringify(manifest, null, 2)}\n`
  let settingsJson = `${JSON.stringify(settings, null, 2)}\n`

  const corePersonality = await readText('core_personality.txt')

  const creatorMessageRaw = await readText('creator_message.txt')
  /** 保留全文（多行）以便与「按模块各一句」导出一致 */
  const creatorMessage = creatorMessageRaw.replace(/\r\n/g, '\n').replace(/\n+$/, '')

  const uiJson = (await readText('ui.json')).trim()
  const authorJson = (await readText('author.json')).trim()
  const memorySeedJson = await readText('memory_seed.json')
  const userIdentitiesIndexJson = await readText('user_identities/index.json')
  const userIdentityFiles: RolePackTextFile[] = []
  for (const n of names) {
    const path = normalizeZipPath(n)
    if (!path.startsWith(`${roleId}/user_identities/`) || !path.endsWith('.md')) continue
    if (!isSafePathUnderRole(path, roleId)) continue
    const entry = zip.file(path)
    if (!entry) continue
    userIdentityFiles.push({
      path: path.slice(`${roleId}/`.length),
      content: (await entry.async('string')) as string,
    })
  }
  userIdentityFiles.sort((a, b) => a.path.localeCompare(b.path))

  const knowledgeMarkdownFiles: KnowledgeMarkdownFile[] = []
  for (const n of names) {
    const path = normalizeZipPath(n)
    if (!path.startsWith(`${roleId}/knowledge/`) || !path.endsWith('.md')) continue
    if (!isSafePathUnderRole(path, roleId)) continue
    const entry = zip.file(path)
    if (!entry) continue
    const content = (await entry.async('string')) as string
    knowledgeMarkdownFiles.push({
      path: normalizeKnowledgePath(path.slice(`${roleId}/`.length)),
      content: content.endsWith('\n') ? content : `${content}\n`,
    })
  }
  knowledgeMarkdownFiles.sort((a, b) => a.path.localeCompare(b.path))
  const worldMain =
    knowledgeMarkdownFiles.find((x) => x.path === 'knowledge/world.md') ??
    knowledgeMarkdownFiles.find((x) => x.path === 'knowledge/lore.md') ??
    knowledgeMarkdownFiles[0]
  const worldviewMarkdown = worldMain?.content ?? ''

  const emotionImageFiles: File[] = []
  const prefix = `${roleId}/assets/images/`
  for (const n of names) {
    const path = normalizeZipPath(n)
    if (!isSafeAssetImageEntry(path, roleId, prefix)) continue
    const entry = zip.file(path)
    if (!entry) continue
    const blob = await entry.async('blob')
    const base = path.slice(prefix.length)
    emotionImageFiles.push(new File([blob], base, { type: blob.type || 'image/png' }))
  }

  const portraitCatalogJson = await readText('portrait_catalog.json')
  const configJson = await readText('config.json')
  const adultExtensionJson = await readText(ADULT_EXTENSION_FILENAME)

  const sceneIds = mergedSceneIds(
    Array.isArray(manifest.scenes) ? (manifest.scenes as string[]) : [],
    [],
  )
  const sceneEditorEntries: SceneEditorEntry[] = []
  for (const sid of sceneIds) {
    const sceneJson = await readText(`scenes/${sid}/scene.json`)
    const description = await readText(`scenes/${sid}/description.txt`)
    sceneEditorEntries.push(parseSceneFromDisk(sid, sceneJson, description))
  }

  const knownExact = new Set([
    PIPELINE_BLUEPRINT_FILENAME,
    'core_personality.txt',
    'memory_seed.json',
    'creator_message.txt',
    'ui.json',
    'author.json',
    'config.json',
    ADULT_EXTENSION_FILENAME,
    'portrait_catalog.json',
    'user_identities/index.json',
    REPLY_QUALITY_ANCHOR_REL_PATH,
  ])
  const preservedFiles: RolePackBinaryFile[] = []
  for (const n of names) {
    const path = normalizeZipPath(n)
    if (!isSafePathUnderRole(path, roleId)) continue
    const rel = path.slice(`${roleId}/`.length)
    if (
      knownExact.has(rel) ||
      rel.startsWith('knowledge/') ||
      rel.startsWith('assets/images/') ||
      rel.startsWith('scenes/') ||
      rel.startsWith('user_identities/')
    ) {
      continue
    }
    const entry = zip.file(path)
    if (!entry) continue
    const blob = await entry.async('blob')
    const base = rel.split('/').pop() ?? 'file'
    preservedFiles.push({
      relPath: rel,
      file: new File([blob], base, { type: blob.type || 'application/octet-stream' }),
    })
  }

  const seenAssetNames = new Set(emotionImageFiles.map((f) => f.name))
  if (portraitCatalogJson.trim()) {
    try {
      const parsed = JSON.parse(portraitCatalogJson) as {
        assets?: Array<{ path?: string }>
      }
      for (const a of parsed.assets ?? []) {
        const rel = (a.path ?? '').trim()
        if (!rel) continue
        const full = `${roleId}/${rel}`.replace(/\/+/g, '/')
        if (!isSafePathUnderRole(full, roleId)) continue
        const base = rel.split('/').pop() ?? ''
        if (!base || seenAssetNames.has(base)) continue
        const entry = zip.file(full)
        if (!entry) continue
        const blob = await entry.async('blob')
        emotionImageFiles.push(new File([blob], base, { type: blob.type || 'application/octet-stream' }))
        seenAssetNames.add(base)
      }
    } catch {
      /* ignore malformed catalog */
    }
  }

  return {
    roleId,
    manifestJson: manifestJson.endsWith('\n') ? manifestJson : `${manifestJson}\n`,
    settingsJson: settingsJson.endsWith('\n') ? settingsJson : `${settingsJson}\n`,
    corePersonality,
    worldviewMarkdown,
    knowledgeMarkdownFiles,
    emotionImageFiles,
    portraitCatalogJson,
    configJson,
    adultExtensionJson,
    creatorMessage,
    uiJson,
    authorJson,
    memorySeedJson,
    userIdentityFiles,
    userIdentitiesIndexJson,
    preservedFiles,
    preservedBlueprintFields,
    sceneEditorEntries,
  }
}

/** 导入成功后附在状态栏的短提示（与 oclive-launcher / 简单创作「对话推理」一致）。 */
export function importedPackBrainHint(settingsJson: string): string {
  try {
    const s = JSON.parse(settingsJson) as { plugin_backends?: { llm?: string } }
    if (s.plugin_backends?.llm === 'remote') {
      return '（云端 LLM：运行 oclive 时请在 oclive-launcher 填写 Remote LLM URL。）'
    }
  } catch {
    /* ignore */
  }
  return '（推理方式可在简单创作「对话推理」或 oclive-launcher 中调整。）'
}
