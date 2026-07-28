import { DEFAULT_CORE_PERSONALITY_TEXT } from '../defaults'
import type { CreatorMessageExportMode } from './rolePackCreatorMessage'
import { emptyAuthorRecRow, parseAuthorImport, type AuthorRecRow } from './authorPack'
import type { ImportedRolePack } from './importPack'
import type { RolePackBinaryFile, RolePackTextFile } from './exportPack'
import { normalizeKnowledgePath, type KnowledgeMarkdownFile } from './knowledgeFiles'
import {
  parseConfigJson,
  parsePortraitCatalogJson,
  slotFilesFromEmotionImages,
  type PortraitCatalogEntry,
  type PortraitSlotFileMap,
} from './portraitCatalog'
import { parseUiConfigJson } from './uiConfig'
import type { UiConfig } from '../types/uiConfig'
import type { SceneEditorEntry } from '../lib/scenePackUser'

export type ApplyLoadedPackInput = {
  roleId: string
  manifestJson: string
  settingsJson: string
  corePersonality?: string
  worldviewMarkdown?: string
  knowledgeMarkdownFiles?: KnowledgeMarkdownFile[]
  emotionImageFiles?: File[]
  portraitCatalogJson?: string
  configJson?: string
  adultExtensionJson?: string
  creatorMessage?: string
  uiJson?: string
  authorJson?: string
  memorySeedJson?: string
  userIdentityFiles?: RolePackTextFile[]
  userIdentitiesIndexJson?: string
  preservedFiles?: RolePackBinaryFile[]
  preservedBlueprintFields?: Record<string, unknown>
  sceneEditorEntries?: SceneEditorEntry[]
}

export type ApplyLoadedPackTargets = {
  manifestText: { value: string }
  settingsText: { value: string }
  corePersonalityText: { value: string }
  worldviewMarkdown: { value: string }
  knowledgeMarkdownFiles: { value: KnowledgeMarkdownFile[] }
  emotionImageFiles: { value: File[] }
  portraitSlotFiles: { value: PortraitSlotFileMap }
  portraitExtraEntries: { value: PortraitCatalogEntry[] }
  visualPresentationEnabled: { value: boolean }
  visualPresentationBackend: { value: string }
  visualPresentationLive2dModel: { value: string }
  adultExtensionJson?: { value: string }
  creatorMessageToOthers: { value: string }
  creatorMessageMode: { value: CreatorMessageExportMode }
  uiConfig: UiConfig
  authorSummary: { value: string }
  authorDetailMarkdown: { value: string }
  authorRecommendedRows: { value: AuthorRecRow[] }
  authorIncludeSuggestedUi: { value: boolean }
  authorSuggestedBackendsJson: { value: string }
  memorySeedJson?: { value: string }
  userIdentityFiles?: { value: RolePackTextFile[] }
  userIdentitiesIndexJson?: { value: string }
  preservedFiles?: { value: RolePackBinaryFile[] }
  preservedBlueprintFields?: { value: Record<string, unknown> }
  applyKnowledgeBundle?: (files: KnowledgeMarkdownFile[], legacyWorldBody?: string) => void
  applySceneEditorEntries?: (entries: SceneEditorEntry[]) => void
  syncFormsFromJson: () => void
}

export function importedPackToApplyInput(imp: ImportedRolePack): ApplyLoadedPackInput {
  return {
    roleId: imp.roleId,
    manifestJson: imp.manifestJson,
    settingsJson: imp.settingsJson,
    corePersonality: imp.corePersonality,
    worldviewMarkdown: imp.worldviewMarkdown,
    knowledgeMarkdownFiles: imp.knowledgeMarkdownFiles,
    emotionImageFiles: imp.emotionImageFiles,
    portraitCatalogJson: imp.portraitCatalogJson,
    configJson: imp.configJson,
    adultExtensionJson: imp.adultExtensionJson,
    creatorMessage: imp.creatorMessage,
    uiJson: imp.uiJson,
    authorJson: imp.authorJson,
    memorySeedJson: imp.memorySeedJson,
    userIdentityFiles: imp.userIdentityFiles,
    userIdentitiesIndexJson: imp.userIdentitiesIndexJson,
    preservedFiles: imp.preservedFiles,
    preservedBlueprintFields: imp.preservedBlueprintFields,
    sceneEditorEntries: imp.sceneEditorEntries,
  }
}

/** 将 zip 导入或磁盘加载结果写入编写器状态（与 usePackEditor.onImportPack 共用）。 */
export function applyLoadedPackToEditor(input: ApplyLoadedPackInput, targets: ApplyLoadedPackTargets): void {
  targets.manifestText.value = input.manifestJson
  targets.settingsText.value = input.settingsJson
  targets.corePersonalityText.value =
    (input.corePersonality ?? '').trim() || DEFAULT_CORE_PERSONALITY_TEXT
  targets.worldviewMarkdown.value = input.worldviewMarkdown ?? ''
  if (targets.memorySeedJson) targets.memorySeedJson.value = input.memorySeedJson ?? ''
  if (targets.userIdentityFiles) {
    targets.userIdentityFiles.value = (input.userIdentityFiles ?? []).map((f) => ({ ...f }))
  }
  if (targets.userIdentitiesIndexJson) {
    targets.userIdentitiesIndexJson.value = input.userIdentitiesIndexJson ?? ''
  }
  if (targets.preservedFiles) targets.preservedFiles.value = input.preservedFiles ?? []
  if (targets.preservedBlueprintFields) {
    targets.preservedBlueprintFields.value = { ...(input.preservedBlueprintFields ?? {}) }
  }
  targets.knowledgeMarkdownFiles.value = (input.knowledgeMarkdownFiles ?? []).map((d) => ({
    path: normalizeKnowledgePath(d.path),
    content: d.content,
  }))
  const files = input.emotionImageFiles ?? []
  if (input.portraitCatalogJson?.trim()) {
    const parsed = parsePortraitCatalogJson(input.portraitCatalogJson)
    const next: PortraitSlotFileMap = {}
    for (const id of Object.keys(parsed.slotFiles)) {
      const hint = parsed.slotFiles[id as keyof PortraitSlotFileMap]?.name
      const blob = files.find((f) => f.name === hint)
      if (blob) next[id as keyof PortraitSlotFileMap] = blob
    }
    targets.portraitSlotFiles.value = next
    targets.portraitExtraEntries.value = parsed.extraEntries.map((e) => {
      const name = e.path.split('/').pop() ?? ''
      const blob = files.find((f) => f.name === name)
      return { ...e, file: blob ?? e.file }
    })
    targets.emotionImageFiles.value = files
  } else {
    targets.portraitSlotFiles.value = slotFilesFromEmotionImages(files)
    targets.portraitExtraEntries.value = []
    targets.emotionImageFiles.value = files
  }
  const cfg = parseConfigJson(input.configJson)
  targets.visualPresentationEnabled.value = cfg.visual.enabled
  targets.visualPresentationBackend.value = cfg.visual.backend
  targets.visualPresentationLive2dModel.value = cfg.visual.live2dModel ?? ''
  if (targets.adultExtensionJson)
    targets.adultExtensionJson.value = input.adultExtensionJson ?? ''
  targets.creatorMessageToOthers.value = input.creatorMessage ?? ''
  Object.assign(targets.uiConfig, parseUiConfigJson(input.uiJson?.trim() || '{}'))

  if (input.authorJson?.trim()) {
    const pa = parseAuthorImport(input.authorJson)
    if (pa) {
      targets.authorSummary.value = pa.summary
      targets.authorDetailMarkdown.value = pa.detailMarkdown
      targets.authorRecommendedRows.value =
        pa.rows.length > 0 ? pa.rows : [emptyAuthorRecRow()]
      targets.authorIncludeSuggestedUi.value = pa.includeSuggestedUi
      targets.authorSuggestedBackendsJson.value = pa.suggestedPluginBackendsJson
      if (pa.suggestedUi) {
        Object.assign(targets.uiConfig, parseUiConfigJson(JSON.stringify(pa.suggestedUi)))
      }
    }
  } else {
    targets.authorSummary.value = ''
    targets.authorDetailMarkdown.value = ''
    targets.authorRecommendedRows.value = [emptyAuthorRecRow()]
    targets.authorIncludeSuggestedUi.value = false
    targets.authorSuggestedBackendsJson.value = ''
  }

  if (targets.applyKnowledgeBundle) {
    targets.applyKnowledgeBundle(
      targets.knowledgeMarkdownFiles.value,
      input.worldviewMarkdown ?? '',
    )
  }

  if (targets.applySceneEditorEntries && input.sceneEditorEntries) {
    targets.applySceneEditorEntries(input.sceneEditorEntries)
  }

  targets.syncFormsFromJson()
}

/** 检测 blueprint 是否含编写器不编辑的扩展字段（导出 rebuild 可能丢失）。 */
export function blueprintHasEditorExtensions(blueprintJson: string): boolean {
  try {
    const bp = JSON.parse(blueprintJson) as Record<string, unknown>
    if (Array.isArray(bp.includes) && bp.includes.length > 0) return true
    if (bp.groups != null && typeof bp.groups === 'object') return true
    if (bp.expert_overlay != null) return true
  } catch {
    /* ignore */
  }
  return false
}
