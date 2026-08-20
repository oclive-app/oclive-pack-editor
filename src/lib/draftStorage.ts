import type { CreatorMessageExportMode } from './rolePackCreatorMessage'
import type { AuthorRecRow } from './authorPack'
import type { KnowledgeMarkdownFile } from './knowledgeFiles'
import type { RolePackTextFile } from './exportPack'
import type { UiConfig } from '../types/uiConfig'
import type { ExportProfile, PortraitAssetKind, PortraitSlotId } from './portraitCatalog'
import type { WorldKnowledgeTexts } from './worldKnowledgeUser'
import type { SceneEditorEntry } from './scenePackUser'
import type { EditorViewId } from '../composables/useEditorViewState'
import { parseJson } from './packChecks'

export const DRAFT_STORAGE_KEY = 'oclive-pack-editor-draft-v2'

/** @deprecated v1 key — read-only migration */
const DRAFT_STORAGE_KEY_V1 = 'oclive-pack-editor-draft-v1'

export type PortraitSlotDraftMeta = {
  fileName: string
}

export type PortraitExtraDraftMeta = {
  id: string
  path: string
  desc: string
  tags: string[]
  kind: PortraitAssetKind
  cluster?: string
  fileName?: string
}

export type PackDraftSnapshot = {
  version: 2
  savedAt: string
  creationMode: 'simple' | 'advanced'
  advancedTab: 'manifest' | 'settings' | 'core' | 'config' | 'memory' | 'identities' | 'world' | 'scenes' | 'prompts' | 'voice' | 'ui' | 'author' | 'images'
  manifestText: string
  settingsText: string
  corePersonalityText: string
  adultExtensionJson?: string
  memorySeedJson?: string
  configJsonText?: string
  voiceProfileJson?: string
  deepCapsuleText?: string
  systemPromptMarkdown?: string
  polishPromptMarkdown?: string
  userIdentityFiles?: RolePackTextFile[]
  userIdentitiesIndexJson?: string
  preservedBlueprintFields?: Record<string, unknown>
  worldviewMarkdown: string
  knowledgeMarkdownFiles: KnowledgeMarkdownFile[]
  creatorMessageToOthers: string
  creatorMessageMode: CreatorMessageExportMode
  creatorMessageToDownloaderManifest: string
  authorSummary: string
  authorDetailMarkdown: string
  authorRecommendedRows: AuthorRecRow[]
  authorIncludeSuggestedUi: boolean
  authorSuggestedBackendsJson: string
  uiConfig: UiConfig
  uiJsonSource?: string
  authorJsonSource?: string
  /** Slot id → picked file name (no binary). */
  portraitSlotMeta?: Partial<Record<PortraitSlotId, PortraitSlotDraftMeta>>
  portraitExtraMeta?: PortraitExtraDraftMeta[]
  worldKnowledgeTexts?: WorldKnowledgeTexts
  extraKnowledgeFiles?: Array<{ path: string; content: string }>
  sceneEditorEntries?: SceneEditorEntry[]
  /** @deprecated 旧草稿曾用侧栏「场景」页；恢复时映射为 advanced + scenes 页签 */
  editorView?: EditorViewId | 'scenes'
  visualPresentationEnabled?: boolean
  visualPresentationBackend?: string
  visualPresentationLive2dModel?: string
  exportProfile?: ExportProfile
}

type PackDraftSnapshotV1 = Omit<PackDraftSnapshot, 'version' | 'portraitSlotMeta' | 'portraitExtraMeta' | 'visualPresentationEnabled' | 'visualPresentationBackend' | 'visualPresentationLive2dModel' | 'exportProfile'> & {
  version: 1
}

export type PackDraftMeta = {
  roleId: string
  roleName: string
  savedAt: string
  creationMode: 'simple' | 'advanced'
}

export function draftMetaFromSnapshot(snapshot: PackDraftSnapshot): PackDraftMeta {
  const m = parseJson<Record<string, unknown>>(snapshot.manifestText, 'manifest.json')
  const roleId = m.ok && typeof m.value.id === 'string' ? m.value.id.trim() : 'my_role_id'
  const roleName =
    m.ok && typeof m.value.name === 'string' && m.value.name.trim()
      ? m.value.name.trim()
      : roleId
  return {
    roleId,
    roleName,
    savedAt: snapshot.savedAt,
    creationMode: snapshot.creationMode,
  }
}

function normalizeV1ToV2(raw: PackDraftSnapshotV1): PackDraftSnapshot {
  return {
    ...raw,
    version: 2,
    portraitSlotMeta: {},
    portraitExtraMeta: [],
    visualPresentationEnabled: false,
    visualPresentationBackend: 'image',
    visualPresentationLive2dModel: '',
    exportProfile: 'desktop-full',
  }
}

function parseStoredDraft(raw: string): PackDraftSnapshot | null {
  try {
    const parsed = JSON.parse(raw) as PackDraftSnapshot | PackDraftSnapshotV1
    if (parsed?.version === 2) {
      if (typeof parsed.manifestText !== 'string' || typeof parsed.settingsText !== 'string') {
        return null
      }
      return parsed
    }
    if (parsed?.version === 1) {
      if (typeof parsed.manifestText !== 'string' || typeof parsed.settingsText !== 'string') {
        return null
      }
      return normalizeV1ToV2(parsed)
    }
    return null
  } catch {
    return null
  }
}

export function readDraftSnapshot(): PackDraftSnapshot | null {
  try {
    const rawV2 = localStorage.getItem(DRAFT_STORAGE_KEY)
    if (rawV2?.trim()) {
      return parseStoredDraft(rawV2)
    }
    const rawV1 = localStorage.getItem(DRAFT_STORAGE_KEY_V1)
    if (rawV1?.trim()) {
      return parseStoredDraft(rawV1)
    }
    return null
  } catch {
    return null
  }
}

export function readDraftMeta(): PackDraftMeta | null {
  const snapshot = readDraftSnapshot()
  return snapshot ? draftMetaFromSnapshot(snapshot) : null
}

export function saveDraftSnapshot(snapshot: PackDraftSnapshot): void {
  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(snapshot))
  localStorage.removeItem(DRAFT_STORAGE_KEY_V1)
}

export function clearDraftSnapshot(): void {
  localStorage.removeItem(DRAFT_STORAGE_KEY)
  localStorage.removeItem(DRAFT_STORAGE_KEY_V1)
}

export function hasDraftSnapshot(): boolean {
  return readDraftSnapshot() != null
}

/** Restore placeholder `File` from draft metadata (no binary). */
export function placeholderFileFromMeta(fileName: string, kind: PortraitAssetKind = 'image'): File {
  const type =
    kind === 'live2d'
      ? 'application/json'
      : kind === 'rig3d'
        ? 'model/gltf-binary'
        : 'image/png'
  return new File([], fileName, { type })
}
