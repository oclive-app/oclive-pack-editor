import JSZip from 'jszip'
import {
  buildCreatorMessageFileContent,
  ROLE_PACK_CREATOR_MESSAGE_FILENAME,
  type CreatorMessageExportMode,
} from './rolePackCreatorMessage'
import { mergedSceneIds, rolePackRelativePaths } from './packLayout'
import { normalizeKnowledgePath, type KnowledgeMarkdownFile } from './knowledgeFiles'
import {
  buildBlueprintFromLegacy,
  mergeEditorPreservedBlueprintFields,
  PIPELINE_BLUEPRINT_FILENAME,
  REPLY_QUALITY_ANCHOR_REL_PATH,
  serializeBlueprint,
} from './blueprintV2'
import { mergeEditorReplyQualityAnchor } from './replyQualityAnchorPreset'
import {
  buildSceneDescription,
  buildSceneJson,
  type SceneEditorEntry,
} from './scenePackUser'
import { normalizeUserIdentityTemplatePath } from './userIdentities'
import { ADULT_EXTENSION_FILENAME } from './adultExtension'

export type ExportableManifest = Record<string, unknown>
export type ExportableSettings = Record<string, unknown>
export type RolePackTextFile = { path: string; content: string }
export type RolePackBinaryFile = { relPath: string; file: File }

function normalizeSafeRoleRelativePath(path: string): string | null {
  const rel = path.replace(/\\/g, '/').replace(/^\/+/, '')
  if (!rel || rel.split('/').some((part) => !part || part === '.' || part === '..')) {
    return null
  }
  return rel
}

/**
 * Collect binary outputs with one collision policy for zip, browser-folder,
 * Tauri-folder and export validation.
 *
 * Editor-managed text outputs and catalog assets win over stale preserved
 * copies loaded from an existing pack.
 */
export function collectRolePackBinaryFilesForExport(
  roleId: string,
  managedPaths: Iterable<string>,
  extra?: Partial<PackExtraFiles>,
): RolePackBinaryFile[] {
  const id = roleId.trim()
  const prefix = `${id}/`
  const seen = new Set<string>()
  for (const path of managedPaths) {
    const normalized = path.replace(/\\/g, '/').replace(/^\/+/, '')
    const rel = normalized.startsWith(prefix) ? normalized.slice(prefix.length) : normalized
    const safe = normalizeSafeRoleRelativePath(rel)
    if (safe) seen.add(safe)
  }

  const catalog = extra?.catalogAssets?.length
    ? extra.catalogAssets
    : (extra?.emotionImages ?? []).map((file) => ({
        relPath: `assets/images/${file.name}`,
        file,
      }))
  const output: RolePackBinaryFile[] = []
  for (const candidate of [...catalog, ...(extra?.preservedFiles ?? [])]) {
    const relPath = normalizeSafeRoleRelativePath(candidate.relPath)
    if (!relPath || seen.has(relPath)) continue
    seen.add(relPath)
    output.push({ relPath, file: candidate.file })
  }
  return output
}

const KNOWLEDGE_PLACEHOLDER = `在此目录放置世界观 Markdown（可选）。
运行时契约见 oclivenewnew 仓库 creator-docs/role-pack/WORLDVIEW_KNOWLEDGE.md
`

function sceneFilesForExport(
  sid: string,
  entries: SceneEditorEntry[] | undefined,
): { sceneJson: string; description: string } {
  const entry = entries?.find((e) => e.sceneId.trim() === sid)
  if (entry) {
    return {
      sceneJson: buildSceneJson(entry),
      description: buildSceneDescription(entry),
    }
  }
  return {
    sceneJson: buildSceneJson({
      sceneId: sid,
      displayName: sid,
      activitySetting: '',
      scenePrompt: '',
    }),
    description: buildSceneDescription({
      sceneId: sid,
      displayName: sid,
      activitySetting: '',
      scenePrompt: '',
    }),
  }
}

export type PackExtraFiles = {
  /** 可选：`roles/{id}/author.json` 全文 */
  authorJson?: string
  /** 可选：`roles/{id}/ui.json` 全文 */
  uiConfigJson?: string
  /** 对应 roles/{id}/core_personality.txt */
  corePersonality: string
  /** 兼容旧路径：有内容时写入 knowledge/world.md（含 front matter） */
  worldviewMarkdown: string
  /** 多知识文件（world.md + lore/*.md 等）；优先于 worldviewMarkdown */
  knowledgeMarkdownFiles: KnowledgeMarkdownFile[]
  /** 置于 assets/images/ 下，文件名应与 oclive 情绪资源命名一致（如 happy.png） */
  emotionImages: File[]
  /** catalog 相对路径 → 文件（含 live2d model3 等） */
  catalogAssets?: Array<{ relPath: string; file: File }>
  /** 写入 roles/{id}/creator_message.txt，随包分发；见 `creatorMessageMode` */
  creatorMessage?: string
  /** unified：全文只取首条非空行；per_module：每行一条（多模块拼接时汇总展示） */
  creatorMessageMode?: CreatorMessageExportMode
  /** 写入 prompts/reply_quality_anchor.md（人类可读镜像；v4 运行时 SSOT 为 runtime_config） */
  replyQualityAnchorMarkdown?: string
  /** 为 true 时若 settings 无锚点则写入编辑器默认锚点 */
  includeDefaultReplyQualityAnchor?: boolean
  /** 可选：`roles/{id}/config.json` 全文 */
  configJson?: string
  /** 可选：`roles/{id}/voice_profile.json` 全文 */
  voiceProfileJson?: string
  /** 可选：`roles/{id}/prompts/deep_capsule.txt` 全文 */
  deepCapsuleText?: string
  /** 可选：`roles/{id}/prompts/system.md` 创作辅助全文 */
  systemPromptMarkdown?: string
  /** 可选：`roles/{id}/polish_prompt.md` 全文 */
  polishPromptMarkdown?: string
  /** Optional Chat Pro adult-role extension; exported inside the same role pack. */
  adultExtensionJson?: string
  /** 可选：`roles/{id}/portrait_catalog.json` 全文（A2 SSOT） */
  portraitCatalogJson?: string
  /** 可选：`roles/{id}/user_identities/index.json` 全文 */
  userIdentitiesIndexJson?: string
  /** 可选：`roles/{id}/memory_seed.json` 全文；创作者维护、运行时只读 */
  memorySeedJson?: string
  /** 可选：`roles/{id}/user_identities/*.md` 模板全文 */
  userIdentityFiles?: RolePackTextFile[]
  /** 导入包中编写器不理解但路径安全的文件；再次导出时原样保留。 */
  preservedFiles?: RolePackBinaryFile[]
  /** 蓝图中不由编写器编辑的顶层字段。 */
  preservedBlueprintFields?: Record<string, unknown>
  /** 用户场景编辑（scenes/{id}/scene.json + description.txt） */
  sceneEditorEntries?: SceneEditorEntry[]
}

function worldMdBody(body: string): string {
  const t = body.trim()
  if (!t) return ''
  if (t.startsWith('---')) return `${t}\n`
  return `---\nid: world_intro\ntags: []\n---\n\n${t}\n`
}

/** Build path → UTF-8 file contents for a role pack under the roles root. */
export function buildRolePackFiles(
  roleId: string,
  manifest: ExportableManifest,
  settings: ExportableSettings,
  extra?: Partial<PackExtraFiles>,
): Map<string, string> {
  const id = roleId.trim()
  const m: ExportableManifest = { ...manifest, id }

  const settingsForBlueprint = extra?.includeDefaultReplyQualityAnchor
    ? mergeEditorReplyQualityAnchor(settings, true)
    : { ...settings }

  const anchorFromSettings =
    typeof settingsForBlueprint.reply_quality_anchor === 'string'
      ? String(settingsForBlueprint.reply_quality_anchor)
      : ''
  const anchorBody =
    extra?.replyQualityAnchorMarkdown?.trim() ||
    anchorFromSettings.trim() ||
    ''

  const targetSchemaVersion =
    extra?.preservedBlueprintFields?.schema_version === 2 ? 2 : 4
  const blueprint = mergeEditorPreservedBlueprintFields(
    buildBlueprintFromLegacy(m, settingsForBlueprint, targetSchemaVersion),
    extra?.preservedBlueprintFields,
  )
  blueprint.meta.id = id
  const files = new Map<string, string>()

  files.set(`${id}/${PIPELINE_BLUEPRINT_FILENAME}`, serializeBlueprint(blueprint))

  const scenes = mergedSceneIds(m['scenes'] as string[] | undefined, [])

  let hasManagedPrompt = false
  if (anchorBody) {
    files.set(`${id}/${REPLY_QUALITY_ANCHOR_REL_PATH}`, `${anchorBody.trim()}\n`)
    hasManagedPrompt = true
  }
  const deepCapsule = extra?.deepCapsuleText?.trim()
  if (deepCapsule) {
    files.set(`${id}/prompts/deep_capsule.txt`, `${deepCapsule}\n`)
    hasManagedPrompt = true
  }
  const systemPrompt = extra?.systemPromptMarkdown?.trim()
  if (systemPrompt) {
    files.set(`${id}/prompts/system.md`, `${systemPrompt}\n`)
    hasManagedPrompt = true
  }
  if (!hasManagedPrompt) {
    files.set(
      `${id}/prompts/.oclive_placeholder.txt`,
      '可选：在此目录放置 reply_quality_anchor.md 等创作辅助 Markdown。\n',
    )
  }

  const configRaw = extra?.configJson?.trim()
  if (configRaw) {
    files.set(`${id}/config.json`, configRaw.endsWith('\n') ? configRaw : `${configRaw}\n`)
  }

  const catalogRaw = extra?.portraitCatalogJson?.trim()
  if (catalogRaw) {
    files.set(
      `${id}/portrait_catalog.json`,
      catalogRaw.endsWith('\n') ? catalogRaw : `${catalogRaw}\n`,
    )
  }

  const uiRaw = extra?.uiConfigJson?.trim()
  if (uiRaw) {
    files.set(`${id}/ui.json`, uiRaw.endsWith('\n') ? uiRaw : `${uiRaw}\n`)
  }

  const authorRaw = extra?.authorJson?.trim()
  if (authorRaw) {
    files.set(`${id}/author.json`, authorRaw.endsWith('\n') ? authorRaw : `${authorRaw}\n`)
  }

  const uiIndexRaw = extra?.userIdentitiesIndexJson?.trim()
  if (uiIndexRaw) {
    files.set(
      `${id}/user_identities/index.json`,
      uiIndexRaw.endsWith('\n') ? uiIndexRaw : `${uiIndexRaw}\n`,
    )
  }

  const voiceProfileRaw = extra?.voiceProfileJson?.trim()
  if (voiceProfileRaw) {
    files.set(
      `${id}/voice_profile.json`,
      voiceProfileRaw.endsWith('\n') ? voiceProfileRaw : `${voiceProfileRaw}\n`,
    )
  }

  const polishPromptRaw = extra?.polishPromptMarkdown?.trim()
  if (polishPromptRaw) {
    files.set(`${id}/polish_prompt.md`, `${polishPromptRaw}\n`)
  }

  const adultRaw = extra?.adultExtensionJson?.trim()
  if (adultRaw) {
    files.set(
      `${id}/${ADULT_EXTENSION_FILENAME}`,
      adultRaw.endsWith('\n') ? adultRaw : `${adultRaw}\n`,
    )
  }

  const memorySeedRaw = extra?.memorySeedJson?.trim()
  if (memorySeedRaw) {
    files.set(
      `${id}/memory_seed.json`,
      memorySeedRaw.endsWith('\n') ? memorySeedRaw : `${memorySeedRaw}\n`,
    )
  }

  for (const identity of extra?.userIdentityFiles ?? []) {
    const rel = normalizeUserIdentityTemplatePath(identity.path)
    if (!rel) continue
    const content = identity.content.trimEnd()
    if (content) files.set(`${id}/${rel}`, `${content}\n`)
  }

  const core = (extra?.corePersonality ?? '').trim()
  files.set(
    `${id}/core_personality.txt`,
    core ? `${core}\n` : '（请填写人设、语气与说话习惯。）\n',
  )

  const echoBody = buildCreatorMessageFileContent(
    extra?.creatorMessage ?? '',
    extra?.creatorMessageMode ?? 'unified',
  )
  if (echoBody) {
    files.set(`${id}/${ROLE_PACK_CREATOR_MESSAGE_FILENAME}`, echoBody)
  }

  const world = worldMdBody(extra?.worldviewMarkdown ?? '')
  const docs = extra?.knowledgeMarkdownFiles ?? []
  if (docs.length > 0) {
    for (const d of docs) {
      const p = normalizeKnowledgePath(d.path)
      const body = worldMdBody(d.content)
      if (!body.trim()) continue
      files.set(`${id}/${p}`, body)
    }
  } else if (world) {
    files.set(`${id}/knowledge/world.md`, world)
  }
  if (![...files.keys()].some((k) => k.startsWith(`${id}/knowledge/`) && k.endsWith('.md'))) {
    // keep directory semantic for empty knowledge packs
    files.set(`${id}/knowledge/.oclive_placeholder.txt`, KNOWLEDGE_PLACEHOLDER)
  } else {
    files.delete(`${id}/knowledge/.oclive_placeholder.txt`)
  }

  for (const sid of scenes) {
    const { sceneJson, description } = sceneFilesForExport(sid, extra?.sceneEditorEntries)
    files.set(`${id}/scenes/${sid}/scene.json`, sceneJson)
    files.set(`${id}/scenes/${sid}/description.txt`, description)
  }

  return files
}

export async function buildRolePackZipBlob(
  roleId: string,
  manifest: ExportableManifest,
  settings: ExportableSettings,
  extra?: Partial<PackExtraFiles>,
): Promise<Blob> {
  const files = buildRolePackFiles(roleId, manifest, settings, extra)
  const zip = new JSZip()
  for (const [path, content] of files) {
    zip.file(path, content)
  }
  const id = roleId.trim()
  for (const { relPath, file } of collectRolePackBinaryFilesForExport(
    id,
    files.keys(),
    extra,
  )) {
    zip.file(`${id}/${relPath}`, await file.arrayBuffer())
  }
  return zip.generateAsync({ type: 'blob' })
}

export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function suggestedZipName(roleId: string, ocpak: boolean): string {
  const safe = roleId.trim().replace(/[^\w\-]+/g, '_') || 'role'
  return ocpak ? `${safe}.ocpak` : `${safe}-role-pack.zip`
}

export { rolePackRelativePaths, mergedSceneIds }
