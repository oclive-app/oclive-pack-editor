import { computed, onBeforeUnmount, onMounted, reactive, ref, watch, type Ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { save } from '@tauri-apps/plugin-dialog'
import { i18n } from '../i18n'
import {
  DEFAULT_CORE_PERSONALITY_TEXT,
  DEFAULT_MANIFEST_JSON,
  DEFAULT_SETTINGS_JSON,
} from '../defaults'
import {
  buildRolePackZipBlob,
  suggestedZipName,
  triggerDownload,
  type PackExtraFiles,
} from '../lib/exportPack'
import {
  arrayBufferToBase64,
  confirmOverwriteExistingRoleDir,
  isFolderExportSupported,
  isTauriRuntime,
  pickRolesRootAndWritePack,
  writePackToRolesRootPath,
} from '../lib/exportFolder'
import { readLastOcpakPath, rememberOcpakPath } from '../lib/ocpakSaveTarget'
import { importRolePackFromZip, importedPackBrainHint } from '../lib/importPack'
import {
  importCharacterCard,
  type CharacterCardConversionReport,
} from '../lib/characterCardImport'
import {
  applyLoadedPackToEditor,
  importedPackToApplyInput,
  type ApplyLoadedPackTargets,
} from '../lib/applyLoadedPackToEditor'
import { prepareExportPayload } from '../lib/exportPrepare'
import { validateExportPackDirectory } from '../lib/exportValidate'
import { formatExportDirectoryBlockedMessage, validateRoleIdForExport } from '../lib/exportErrorMessages'
import {
  mergeEditorReplyQualityAnchor,
  shouldPromptReplyQualityAnchor,
} from '../lib/replyQualityAnchorPreset'
import { parseJson, runAllPackChecks } from '../lib/packChecks'
import type { PackSession } from './useRolesWorkspace'
import { normalizeKnowledgePath, type KnowledgeMarkdownFile } from '../lib/knowledgeFiles'
import { validateKnowledgeFiles } from '../lib/knowledgeFrontMatter'
import {
  emptyWorldKnowledgeTexts,
  mergeWorldKnowledgeExportFiles,
  parseWorldKnowledgeFromFiles,
  worldKnowledgeHasContent,
  type WorldKnowledgeTexts,
} from '../lib/worldKnowledgeUser'
import {
  mergeSceneEntriesForIds,
  parseSceneIdList,
  sceneEntriesToIdList,
  type SceneEditorEntry,
} from '../lib/scenePackUser'
import { mergeMarketComposeIntoEditor, parseMarketComposeV1 } from '../lib/marketComposeImport'
import {
  patchManifestCreatorMessageToDownloader,
  readManifestCreatorMessageToDownloader,
} from '../lib/manifestCreatorDownloader'
import type { CreatorMessageExportMode } from '../lib/rolePackCreatorMessage'
import type { RolePackBinaryFile, RolePackTextFile } from '../lib/exportPack'
import { validateMemorySeedJson } from '../lib/memorySeed'
import { validateUserIdentityBundle } from '../lib/userIdentities'
import {
  applyExportProfile,
  buildPortraitCatalogJson,
  buildSimpleConfigJson,
  mergeManagedConfigJson,
  collectCatalogBinaryAssets,
  emotionFilesFromCatalog,
  parseConfigJson,
  parsePortraitCatalogJson,
  PORTRAIT_SLOT_TAG,
  SIMPLE_PORTRAIT_SLOT_IDS,
  slotFilesFromEmotionImages,
  type ExportProfile,
  type PortraitCatalogEntry,
  type PortraitSlotFileMap,
  type PortraitSlotId,
} from '../lib/portraitCatalog'
import { runPortraitCatalogChecks } from '../lib/portraitCatalogValidate'
import {
  buildExtraEntryFromUserChoices,
  type ExtraEmotionUserChoices,
} from '../lib/portraitExtraUser'
import {
  buildAuthorJsonDisk,
  emptyAuthorRecRow,
  type AuthorRecRow,
} from '../lib/authorPack'
import { mergeUiConfigJson } from '../lib/uiConfig'
import { defaultUiConfig, type UiConfig } from '../types/uiConfig'
import {
  applySimpleManifestToJson,
  applySimpleSettingsToJson,
  countUserRelationKeys,
  defaultSimpleManifestForm,
  defaultSimpleSettingsForm,
  knowledgeFromPackRecords,
  manifestRecordToSimpleForm,
  settingsRecordToSimpleForm,
  type SimpleManifestForm,
  type SimpleSettingsForm,
} from '../lib/simpleCreation'
import {
  placeholderFileFromMeta,
  type PackDraftSnapshot,
  type PortraitExtraDraftMeta,
  type PortraitSlotDraftMeta,
} from '../lib/draftStorage'
import { validateAdultExtension } from '../lib/adultExtension'

const STORAGE_REQUIRE_CHECKS = 'oclive-pack-editor-require-checks-before-export'
const STORAGE_CREATION_MODE = 'oclive-pack-editor-creation-mode'
const STORAGE_CREATOR_MSG_MODE = 'oclive-pack-editor-creator-msg-mode'

/** 简单模式表单 → JSON 防抖：避免每次按键都整表序列化，减轻大字段输入卡顿。 */
const SIMPLE_JSON_DEBOUNCE_MS = 220

export type ExportFolderWriteOptions = {
  rolesRootPath: string
  roleIdOverride?: string
}

export function usePackEditor() {
  const manifestText = ref(DEFAULT_MANIFEST_JSON)
  const settingsText = ref(DEFAULT_SETTINGS_JSON)
  const corePersonalityText = ref(DEFAULT_CORE_PERSONALITY_TEXT)
  const adultExtensionJson = ref('')
  /** 创作者维护的只读初始记忆；与运行时 LTM/STM 分离。 */
  const memorySeedJson = ref('')
  const configJsonText = ref(
    buildSimpleConfigJson(false, { enabled: false, backend: 'image' }),
  )
  const voiceProfileJson = ref('')
  const deepCapsuleText = ref('')
  const systemPromptMarkdown = ref('')
  const polishPromptMarkdown = ref('')
  const userIdentityFiles = ref<RolePackTextFile[]>([])
  const userIdentitiesIndexJson = ref('')
  const preservedFiles = ref<RolePackBinaryFile[]>([])
  const preservedBlueprintFields = ref<Record<string, unknown>>({})
  const worldviewMarkdown = ref('')
  const worldKnowledgeTexts = ref<WorldKnowledgeTexts>(emptyWorldKnowledgeTexts())
  const extraKnowledgeFiles = ref<KnowledgeMarkdownFile[]>([])
  const sceneEditorEntries = ref<SceneEditorEntry[]>([mergeSceneEntriesForIds(['home'], [])[0]!])
  let syncingScenes = false
  const knowledgeMarkdownFiles = ref<KnowledgeMarkdownFile[]>([])
  const emotionImageFiles = ref<File[]>([])
  const portraitSlotFiles = ref<PortraitSlotFileMap>({})
  const portraitExtraEntries = ref<PortraitCatalogEntry[]>([])
  const visualPresentationEnabled = ref(false)
  const visualPresentationBackend = ref('image')
  const visualPresentationLive2dModel = ref('')
  const exportProfile = ref<ExportProfile>('desktop-full')

  function syncEmotionFilesFromSlots(): void {
    emotionImageFiles.value = emotionFilesFromCatalog(
      portraitSlotFiles.value,
      portraitExtraEntries.value,
    )
  }

  function applyPortraitSlotsFromImport(
    catalogJson: string | undefined,
    files: File[],
    configJson?: string,
  ): void {
    if (catalogJson?.trim()) {
      const parsed = parsePortraitCatalogJson(catalogJson)
      const next: PortraitSlotFileMap = {}
      for (const id of Object.keys(parsed.slotFiles) as PortraitSlotId[]) {
        const pathHint = parsed.slotFiles[id]?.name
        const blob = files.find((f) => f.name === pathHint)
        if (blob) next[id] = blob
      }
      portraitSlotFiles.value = next
      portraitExtraEntries.value = parsed.extraEntries.map((e) => {
        const name = e.path.split('/').pop() ?? ''
        const blob = files.find((f) => f.name === name)
        return {
          ...e,
          file: blob ?? e.file,
        }
      })
    } else {
      portraitSlotFiles.value = slotFilesFromEmotionImages(files)
      portraitExtraEntries.value = []
    }
    const cfg = parseConfigJson(configJson)
    visualPresentationEnabled.value = cfg.visual.enabled
    visualPresentationBackend.value = cfg.visual.backend
    visualPresentationLive2dModel.value = cfg.visual.live2dModel ?? ''
    syncEmotionFilesFromSlots()
  }
  /** 随包写入 creator_message.txt，供启动器只读展示（仅编写器可编辑） */
  const creatorMessageToOthers = ref('')
  /** unified：全文只导出首条非空行；per_module：每行一条（多模块各写一句时汇总） */
  const creatorMessageMode = ref<CreatorMessageExportMode>('unified')
  /** manifest `creator_message_to_downloader`：高级创作独立编辑，与 manifest 文本双向同步 */
  const creatorMessageToDownloaderManifest = ref('')
  const authorSummary = ref('')
  const authorDetailMarkdown = ref('')
  const authorRecommendedRows = ref<AuthorRecRow[]>([emptyAuthorRecRow()])
  const authorIncludeSuggestedUi = ref(false)
  const authorSuggestedBackendsJson = ref('')
  const uiJsonSource = ref('')
  const authorJsonSource = ref('')

  const validationErrors = ref<string[]>([])
  /** 最近一次检查是否用 wasm；`null` 表示本会话尚未跑过检查 */
  const validationLastUsedWasm = ref<boolean | null>(null)
  const lastMessage = ref('')
  /** 与 lastMessage 配套：错误类文案为 true，成功提示为 false */
  const lastMessageIsError = ref(false)
  const characterCardImportReport = ref<CharacterCardConversionReport | null>(null)
  const requireChecksBeforeExport = ref(false)
  /** 简单模式表单与 JSON 不一致时（JSON 无法解析）提示 */
  const syncFormWarning = ref('')
  /** 最近一次「写入文件夹」的 roles 根路径（桌面版 Tauri）。 */
  const lastExportedRolesRoot = ref('')

  /** 由 App 绑定：idle 时拒绝「检查角色包」 */
  let packSessionRef: Ref<PackSession> | null = null

  function bindPackSession(session: Ref<PackSession>): void {
    packSessionRef = session
  }

  function noActivePackForCheck(): boolean {
    return packSessionRef?.value === 'idle'
  }

  function pe(key: string, params?: Record<string, unknown>): string {
    return i18n.global.t(key, params ?? {})
  }

  const creationMode = ref<'simple' | 'advanced'>('simple')
  const advancedTab = ref<'manifest' | 'settings' | 'core' | 'config' | 'memory' | 'identities' | 'world' | 'scenes' | 'prompts' | 'voice' | 'ui' | 'author' | 'images'>('manifest')

  const simpleM = reactive<SimpleManifestForm>(defaultSimpleManifestForm())
  const simpleS = reactive<SimpleSettingsForm>(defaultSimpleSettingsForm())
  const uiConfig = reactive<UiConfig>(defaultUiConfig())

  const multiRelationWarning = computed(
    () => creationMode.value === 'simple' && countUserRelationKeys(manifestText.value) > 1,
  )

  const emotionImageSummary = computed(() => {
    const n = emotionImageFiles.value.length
    if (n === 0) return pe('packEditor.feedback.emotionSummaryNone')
    return pe('packEditor.feedback.emotionSummarySelected', { n })
  })

  const hasPortraitPlaceholderFiles = computed(() => {
    for (const f of Object.values(portraitSlotFiles.value)) {
      if (f && f.size === 0) return true
    }
    return portraitExtraEntries.value.some((e) => e.file != null && e.file.size === 0)
  })

  /** 与 manifest 同步写入 settings.knowledge；运行时合并以 settings 为准 */
  const simpleKnowledgeForSettings = computed(() => {
    const enabled =
      worldKnowledgeHasContent(worldKnowledgeTexts.value) ||
      extraKnowledgeFiles.value.some((f) => f.content.trim())
    return {
      enabled: enabled || simpleM.knowledgeEnabled,
      glob: simpleM.knowledgeGlob.trim() || 'knowledge/**/*.md',
    }
  })

  function syncKnowledgeFilesFromWorldTexts(): void {
    knowledgeMarkdownFiles.value = mergeWorldKnowledgeExportFiles(
      worldKnowledgeTexts.value,
      extraKnowledgeFiles.value,
    )
    worldviewMarkdown.value = worldKnowledgeTexts.value.dialogueWorldview
  }

  function sceneIdsFromEditorState(): string[] {
    if (creationMode.value === 'simple') {
      return parseSceneIdList(simpleM.scenesCsv)
    }
    const m = parseJson<Record<string, unknown>>(manifestText.value, 'manifest.json')
    if (m.ok && Array.isArray(m.value.scenes)) {
      return parseSceneIdList(m.value.scenes as string[])
    }
    return ['home']
  }

  function syncSceneEntriesFromManifest(): void {
    const ids = sceneIdsFromEditorState()
    sceneEditorEntries.value = mergeSceneEntriesForIds(ids, sceneEditorEntries.value)
  }

  function patchManifestScenes(ids: string[]): void {
    const m = parseJson<Record<string, unknown>>(manifestText.value, 'manifest.json')
    if (!m.ok) return
    const next = { ...m.value, scenes: ids }
    manifestText.value = `${JSON.stringify(next, null, 2)}\n`
  }

  function syncManifestScenesFromEntries(): void {
    let ids = sceneEntriesToIdList(sceneEditorEntries.value)
    if (ids.length === 0) ids = ['home']
    if (creationMode.value === 'simple') {
      const csv = ids.join(', ')
      if (simpleM.scenesCsv !== csv) simpleM.scenesCsv = csv
      scheduleSimpleToJson()
    } else {
      patchManifestScenes(ids)
    }
  }

  function migrateLegacySceneSetting(body: string): void {
    const trimmed = body.trim()
    if (!trimmed) return
    syncSceneEntriesFromManifest()
    const first = sceneEditorEntries.value[0]
    if (first && !first.activitySetting.trim()) {
      first.activitySetting = trimmed
    }
  }

  function applySceneEditorEntries(entries: SceneEditorEntry[]): void {
    syncingScenes = true
    sceneEditorEntries.value = entries.length
      ? entries.map((e) => ({ ...e }))
      : mergeSceneEntriesForIds(['home'], [])
    syncManifestScenesFromEntries()
    syncingScenes = false
  }

  function applyKnowledgeBundle(files: KnowledgeMarkdownFile[], legacyWorldBody = ''): void {
    const { texts, extraFiles, legacySceneSettingBody } = parseWorldKnowledgeFromFiles(files)
    if (legacyWorldBody.trim() && !texts.dialogueWorldview.trim()) {
      texts.dialogueWorldview = legacyWorldBody.trim()
    }
    worldKnowledgeTexts.value = texts
    extraKnowledgeFiles.value = extraFiles
    syncKnowledgeFilesFromWorldTexts()
    if (legacySceneSettingBody.trim()) {
      migrateLegacySceneSetting(legacySceneSettingBody)
    }
  }

  function packExtra(): Partial<PackExtraFiles> {
    syncKnowledgeFilesFromWorldTexts()
    const docs = knowledgeMarkdownFiles.value.filter((d) => d.content.trim())
    const authorJson = buildAuthorJsonDisk({
      summary: authorSummary.value,
      detailMarkdown: authorDetailMarkdown.value,
      rows: authorRecommendedRows.value,
      includeSuggestedUi: authorIncludeSuggestedUi.value,
      uiConfig,
      suggestedPluginBackendsJson: authorSuggestedBackendsJson.value,
      currentRaw: authorJsonSource.value,
    })
    const profiled = applyExportProfile(
      exportProfile.value,
      Object.keys(portraitSlotFiles.value).length > 0,
      {
        enabled: visualPresentationEnabled.value,
        backend: visualPresentationBackend.value,
        live2dModel: visualPresentationLive2dModel.value,
      },
      portraitSlotFiles.value,
      portraitExtraEntries.value,
    )
    const slotMap = profiled.slotFiles
    const extras = profiled.extraEntries
    const hasCatalog = Object.keys(slotMap).length > 0 || extras.length > 0
    return {
      uiConfigJson: mergeUiConfigJson(uiJsonSource.value, uiConfig),
      corePersonality: corePersonalityText.value,
      worldviewMarkdown: worldviewMarkdown.value,
      knowledgeMarkdownFiles: docs,
      emotionImages: emotionFilesFromCatalog(slotMap, extras),
      catalogAssets: collectCatalogBinaryAssets(slotMap, extras),
      creatorMessage: creatorMessageToOthers.value,
      creatorMessageMode: creatorMessageMode.value,
      configJson: mergeManagedConfigJson(
        configJsonText.value,
        profiled.portraitEnabled && hasCatalog,
        profiled.visual,
      ),
      ...(voiceProfileJson.value.trim() ? { voiceProfileJson: voiceProfileJson.value } : {}),
      ...(deepCapsuleText.value.trim() ? { deepCapsuleText: deepCapsuleText.value } : {}),
      ...(systemPromptMarkdown.value.trim()
        ? { systemPromptMarkdown: systemPromptMarkdown.value }
        : {}),
      ...(polishPromptMarkdown.value.trim()
        ? { polishPromptMarkdown: polishPromptMarkdown.value }
        : {}),
      ...(adultExtensionJson.value.trim()
        ? { adultExtensionJson: adultExtensionJson.value }
        : {}),
      ...(hasCatalog
        ? { portraitCatalogJson: buildPortraitCatalogJson(slotMap, extras) }
        : {}),
      ...(authorJson ? { authorJson } : {}),
      ...(memorySeedJson.value.trim() ? { memorySeedJson: memorySeedJson.value } : {}),
      ...(userIdentityFiles.value.length ? { userIdentityFiles: userIdentityFiles.value } : {}),
      ...(userIdentitiesIndexJson.value.trim()
        ? { userIdentitiesIndexJson: userIdentitiesIndexJson.value }
        : {}),
      ...(preservedFiles.value.length ? { preservedFiles: preservedFiles.value } : {}),
      ...(Object.keys(preservedBlueprintFields.value).length
        ? { preservedBlueprintFields: preservedBlueprintFields.value }
        : {}),
      sceneEditorEntries: sceneEditorEntries.value.map((e) => ({ ...e })),
    }
  }

  watch(sceneEditorEntries, () => {
    if (syncingScenes) return
    syncingScenes = true
    syncManifestScenesFromEntries()
    syncingScenes = false
  }, { deep: true })

  watch(
    () => simpleM.scenesCsv,
    () => {
      if (creationMode.value !== 'simple' || syncingScenes) return
      syncingScenes = true
      syncSceneEntriesFromManifest()
      syncingScenes = false
    },
  )

  watch(manifestText, () => {
    if (creationMode.value !== 'advanced' || syncingScenes) return
    syncingScenes = true
    syncSceneEntriesFromManifest()
    syncingScenes = false
  })

  watch(worldKnowledgeTexts, syncKnowledgeFilesFromWorldTexts, { deep: true })

  watch(configJsonText, (raw) => {
    try {
      const parsed = JSON.parse(raw) as unknown
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return
    } catch {
      return
    }
    const config = parseConfigJson(raw)
    visualPresentationEnabled.value = config.visual.enabled
    visualPresentationBackend.value = config.visual.backend
    visualPresentationLive2dModel.value = config.visual.live2dModel ?? ''
  })

  watch(
    manifestText,
    () => {
      const next = readManifestCreatorMessageToDownloader(manifestText.value)
      if (creatorMessageToDownloaderManifest.value !== next) {
        creatorMessageToDownloaderManifest.value = next
      }
    },
    { immediate: true },
  )

  watch(creatorMessageToDownloaderManifest, (v) => {
    const next = patchManifestCreatorMessageToDownloader(manifestText.value, v)
    if (next !== manifestText.value) {
      manifestText.value = next
    }
  })

  let simpleJsonDebounceTimer: ReturnType<typeof setTimeout> | undefined

  function cancelDebouncedSimpleToJson(): void {
    if (simpleJsonDebounceTimer !== undefined) {
      clearTimeout(simpleJsonDebounceTimer)
      simpleJsonDebounceTimer = undefined
    }
  }

  /**
   * 简单模式：立即将表单写入 manifest/settings 文本（并取消待执行的防抖）。
   * 导出或运行检查前应调用，避免读到未落盘的表单。
   */
  function flushSimpleToJson(): void {
    cancelDebouncedSimpleToJson()
    if (creationMode.value === 'simple') applySimpleToJson()
  }

  function scheduleSimpleToJson(): void {
    if (creationMode.value !== 'simple') return
    cancelDebouncedSimpleToJson()
    simpleJsonDebounceTimer = setTimeout(() => {
      simpleJsonDebounceTimer = undefined
      applySimpleToJson()
    }, SIMPLE_JSON_DEBOUNCE_MS)
  }

  function syncFormsFromJson(): void {
    cancelDebouncedSimpleToJson()
    syncFormWarning.value = ''
    const errs: string[] = []
    const m = parseJson<Record<string, unknown>>(manifestText.value, 'manifest.json')
    if (!m.ok) errs.push(m.error)
    else Object.assign(simpleM, manifestRecordToSimpleForm(m.value))

    const s = parseJson<Record<string, unknown>>(settingsText.value, 'settings.json')
    if (!s.ok) errs.push(s.error)
    else Object.assign(simpleS, settingsRecordToSimpleForm(s.value))

    if (m.ok && s.ok) {
      const k = knowledgeFromPackRecords(m.value, s.value)
      if (!worldKnowledgeHasContent(worldKnowledgeTexts.value)) {
        simpleM.knowledgeEnabled = k.enabled
        simpleM.knowledgeGlob = k.glob || 'knowledge/**/*.md'
      }
    }

    if (m.ok && !syncingScenes) {
      syncingScenes = true
      syncSceneEntriesFromManifest()
      syncingScenes = false
    }

    if (errs.length) syncFormWarning.value = errs.join(' ')
  }

  function applySimpleToJson(): void {
    manifestText.value = applySimpleManifestToJson(manifestText.value, simpleM)
    settingsText.value = applySimpleSettingsToJson(
      settingsText.value,
      simpleS,
      simpleKnowledgeForSettings.value,
    )
  }

  watch(
    () => simpleM,
    scheduleSimpleToJson,
    { deep: true },
  )
  watch(
    () => simpleS,
    scheduleSimpleToJson,
    { deep: true },
  )

  watch(creationMode, (mode, prev) => {
    try {
      localStorage.setItem(STORAGE_CREATION_MODE, mode)
    } catch {
      /* ignore */
    }
    if (prev === 'simple' && mode === 'advanced') {
      flushSimpleToJson()
    }
    if (mode === 'simple') syncFormsFromJson()
  })

  function loadPersistedChecks(): void {
    try {
      const v = localStorage.getItem(STORAGE_REQUIRE_CHECKS)
      if (v === 'false') requireChecksBeforeExport.value = false
      else if (v === 'true') requireChecksBeforeExport.value = true
      const cm = localStorage.getItem(STORAGE_CREATION_MODE)
      if (cm === 'advanced' || cm === 'simple') creationMode.value = cm
      const em = localStorage.getItem(STORAGE_CREATOR_MSG_MODE)
      if (em === 'unified' || em === 'per_module') creatorMessageMode.value = em
    } catch {
      /* ignore */
    }
  }

  onMounted(() => {
    loadPersistedChecks()
    try {
      const lr = localStorage.getItem('oclive-pack-editor-last-roles-root')
      if (lr) lastExportedRolesRoot.value = lr
    } catch {
      /* ignore */
    }
    // Avoid parsing large JSON texts at cold start when user is in advanced mode.
    // When switching to simple mode, the creationMode watcher will sync again.
    if (creationMode.value === 'simple') {
      syncFormsFromJson()
    }
  })

  onBeforeUnmount(() => {
    cancelDebouncedSimpleToJson()
  })

  function persistRequireChecks(): void {
    try {
      localStorage.setItem(STORAGE_REQUIRE_CHECKS, requireChecksBeforeExport.value ? 'true' : 'false')
    } catch {
      /* ignore */
    }
  }

  watch(requireChecksBeforeExport, persistRequireChecks)

  watch(creatorMessageMode, (m) => {
    try {
      localStorage.setItem(STORAGE_CREATOR_MSG_MODE, m)
    } catch {
      /* ignore */
    }
  })

  const folderExportOk = computed(() => isFolderExportSupported())

  /** manifest 视图中的角色 id，供导出与工作区写回使用。 */
  const manifestRoleId = computed(() => {
    const m = parseJson<Record<string, unknown>>(manifestText.value, 'manifest.json')
    if (!m.ok) return ''
    const id = m.value.id
    return typeof id === 'string' ? id : ''
  })

  async function collectBaseValidationState(): Promise<{
    errors: string[]
    wasmUsed: boolean
    ok: boolean
  }> {
    flushSimpleToJson()
    const r = await runAllPackChecks(manifestText.value, settingsText.value)
    const kErrs = validateKnowledgeFiles(knowledgeMarkdownFiles.value)
    const memoryErrs = validateMemorySeedJson(memorySeedJson.value)
    const identityErrs = validateUserIdentityBundle(
      userIdentitiesIndexJson.value,
      userIdentityFiles.value,
    )
    const portrait = runPortraitCatalogChecks(
      portraitSlotFiles.value,
      portraitExtraEntries.value,
      Object.keys(portraitSlotFiles.value).length > 0,
    )
    const errors = [
      ...r.errors,
      ...kErrs,
      ...memoryErrs,
      ...identityErrs,
      ...portrait.errors,
    ]
    return {
      errors,
      wasmUsed: r.wasmUsed,
      ok:
        r.ok &&
        kErrs.length === 0 &&
        memoryErrs.length === 0 &&
        identityErrs.length === 0 &&
        portrait.errors.length === 0,
    }
  }

  async function collectValidationState(): Promise<{
    errors: string[]
    wasmUsed: boolean
    ok: boolean
  }> {
    const base = await collectBaseValidationState()
    const adultErrs = validateAdultExtension(
      adultExtensionJson.value,
      sceneIdsFromEditorState(),
    )
    return {
      errors: [...base.errors, ...adultErrs],
      wasmUsed: base.wasmUsed,
      ok: base.ok && adultErrs.length === 0,
    }
  }

  async function canEnterAdultEditor(): Promise<boolean> {
    if (noActivePackForCheck())
      return false
    const base = await collectBaseValidationState()
    if (!base.ok) {
      validationErrors.value = base.errors
      validationLastUsedWasm.value = base.wasmUsed
      setFeedback(pe('packEditor.adult.baseInvalid', { count: base.errors.length }), true)
    }
    return base.ok
  }

  async function runValidate(): Promise<void> {
    if (noActivePackForCheck()) {
      validationErrors.value = [pe('packEditor.feedback.noActivePack')]
      validationLastUsedWasm.value = null
      setFeedback(pe('packEditor.feedback.noActivePack'), true)
      return
    }
    const v = await collectValidationState()
    validationErrors.value = v.errors
    validationLastUsedWasm.value = v.wasmUsed
    if (v.ok) {
      setFeedback(pe('packEditor.feedback.validatePass'), false)
    } else {
      setFeedback(pe('packEditor.feedback.validateFail', { count: v.errors.length }), true)
    }
  }

  async function checksPassForExport(): Promise<boolean> {
    if (!requireChecksBeforeExport.value) return true
    if (noActivePackForCheck()) {
      validationErrors.value = [pe('packEditor.feedback.noActivePack')]
      validationLastUsedWasm.value = null
      setFeedback(pe('packEditor.feedback.noActivePack'), true)
      return false
    }
    const v = await collectValidationState()
    validationErrors.value = v.errors
    validationLastUsedWasm.value = v.wasmUsed
    return v.ok
  }

  async function onImportPack(e: Event): Promise<void> {
    const inp = e.target as HTMLInputElement
    const f = inp.files?.[0]
    setFeedback('', false)
    if (!f) return
    try {
      const imp = await importRolePackFromZip(f)
      applyLoadedPackToEditor(importedPackToApplyInput(imp), applyLoadedPackTargets)
      applyPortraitSlotsFromImport(imp.portraitCatalogJson, imp.emotionImageFiles, imp.configJson)
      setFeedback(
        pe('packEditor.feedback.importSuccess', {
          roleId: imp.roleId,
          hint: importedPackBrainHint(imp.settingsJson),
        }),
        false,
      )
    } catch (err) {
      setFeedback(
        pe('packEditor.feedback.importFail', {
          err: err instanceof Error ? err.message : String(err),
        }),
        true,
      )
    }
    inp.value = ''
  }

  async function onImportCharacterCard(e: Event): Promise<void> {
    const inp = e.target as HTMLInputElement
    const file = inp.files?.[0]
    setFeedback('', false)
    if (!file) return
    try {
      const converted = await importCharacterCard(file)
      applyLoadedPackToEditor(converted.input, applyLoadedPackTargets)
      characterCardImportReport.value = converted.report
      applyPortraitSlotsFromImport(
        converted.input.portraitCatalogJson ?? '',
        converted.input.emotionImageFiles ?? [],
        converted.input.configJson ?? '',
      )
      creationMode.value = 'simple'
      flushSimpleToJson()
      setFeedback(
        pe('packEditor.feedback.characterCardImportSuccess', {
          roleId: converted.report.roleId,
          format: converted.report.sourceFormat.toUpperCase(),
        }),
        false,
      )
    } catch (err) {
      characterCardImportReport.value = null
      setFeedback(
        pe('packEditor.feedback.characterCardImportFail', {
          err: err instanceof Error ? err.message : String(err),
        }),
        true,
      )
    }
    inp.value = ''
  }

  function onPortraitSlotPick(id: string, e: Event): void {
    if (!(SIMPLE_PORTRAIT_SLOT_IDS as readonly string[]).includes(id))
      return
    const slotId = id as PortraitSlotId
    const inp = e.target as HTMLInputElement
    const f = inp.files?.[0]
    if (!f) return
    portraitSlotFiles.value = { ...portraitSlotFiles.value, [slotId]: f }
    syncEmotionFilesFromSlots()
    inp.value = ''
  }

  function onPortraitSlotClear(id: string): void {
    if (!(SIMPLE_PORTRAIT_SLOT_IDS as readonly string[]).includes(id))
      return
    const slotId = id as PortraitSlotId
    const next = { ...portraitSlotFiles.value }
    delete next[slotId]
    portraitSlotFiles.value = next
    syncEmotionFilesFromSlots()
  }

  function clearPortraitSlots(): void {
    portraitSlotFiles.value = {}
    portraitExtraEntries.value = portraitExtraEntries.value.filter(
      (e) => e.kind !== 'image',
    )
    syncEmotionFilesFromSlots()
  }

  function addPortraitExtraEntry(): void {
    const entry = buildExtraEntryFromUserChoices(
      {
        clusterMode: 'builtin',
        clusterTag: 'happy',
        customClusterLabel: '',
        intensity: 'mild',
      },
      portraitExtraEntries.value.map((e) => e.id),
    )
    portraitExtraEntries.value = [...portraitExtraEntries.value, entry]
  }

  function applyPortraitExtraUserChoices(
    index: number,
    choices: ExtraEmotionUserChoices,
    file?: File,
  ): void {
    const prev = portraitExtraEntries.value[index]
    if (!prev) return
    const built = buildExtraEntryFromUserChoices(
      choices,
      portraitExtraEntries.value.filter((_, i) => i !== index).map((e) => e.id),
      file ?? prev.file,
    )
    updatePortraitExtraEntry(index, built)
  }

  function updatePortraitExtraEntry(index: number, patch: Partial<PortraitCatalogEntry>): void {
    const prev = portraitExtraEntries.value[index]
    if (!prev) return
    const next = [...portraitExtraEntries.value]
    const merged = { ...prev, ...patch }
    if (patch.file) {
      merged.kind = 'image'
      merged.path = `assets/images/${patch.file.name}`
    }
    next[index] = merged
    portraitExtraEntries.value = next
    syncEmotionFilesFromSlots()
  }

  function removePortraitExtraEntry(index: number): void {
    const next = [...portraitExtraEntries.value]
    next.splice(index, 1)
    portraitExtraEntries.value = next
    syncEmotionFilesFromSlots()
  }

  function addAuthorRecommendedRow(): void {
    authorRecommendedRows.value = [
      ...authorRecommendedRows.value,
      emptyAuthorRecRow(),
    ]
  }

  function removeAuthorRecommendedRow(index: number): void {
    if (authorRecommendedRows.value.length <= 1) return
    const next = [...authorRecommendedRows.value]
    next.splice(index, 1)
    authorRecommendedRows.value = next
  }

  function addKnowledgeFile(path = 'knowledge/lore.md'): void {
    const p = normalizeKnowledgePath(path)
    if (knowledgeMarkdownFiles.value.some((x) => x.path === p)) return
    knowledgeMarkdownFiles.value = [...knowledgeMarkdownFiles.value, { path: p, content: '' }]
  }

  function updateKnowledgeFile(index: number, patch: Partial<KnowledgeMarkdownFile>): void {
    const prev = knowledgeMarkdownFiles.value[index]
    if (!prev) return
    const path = patch.path !== undefined ? normalizeKnowledgePath(patch.path) : prev.path
    const content = patch.content !== undefined ? patch.content : prev.content
    const next = [...knowledgeMarkdownFiles.value]
    next[index] = { path, content }
    applyKnowledgeBundle(next)
  }

  function removeKnowledgeFile(index: number): void {
    const prev = knowledgeMarkdownFiles.value[index]
    if (!prev) return
    const next = [...knowledgeMarkdownFiles.value]
    next.splice(index, 1)
    applyKnowledgeBundle(next)
  }

  /** 导出 zip / 写文件夹前：若尚未配置 `reply_quality_anchor`，询问是否并入编写器推荐文案。 */
  function applyReplyQualityAnchorPrompt(
    settings: Record<string, unknown>,
  ): Record<string, unknown> {
    if (!shouldPromptReplyQualityAnchor(settings)) {
      return { ...settings }
    }
    const include = window.confirm(pe('packEditor.replyQualityAnchorConfirm'))
    return mergeEditorReplyQualityAnchor(settings, include)
  }

  /**
   * 导出前：简单模式写回 JSON →（可选）全量检查 → 解析 payload。
   */
  async function tryBuildExportPayload():
    Promise<
      | { ok: true; roleId: string; manifest: Record<string, unknown>; settings: Record<string, unknown> }
      | { ok: false; message: string }
    > {
    flushSimpleToJson()
    if (!(await checksPassForExport())) {
      return {
        ok: false,
        message: pe('packEditor.feedback.exportBlockedByChecks'),
      }
    }
    const payload = prepareExportPayload(manifestText.value, settingsText.value)
    if (!payload.ok) return payload
    const dirCheck = await validateExportPackDirectory(
      payload.roleId,
      payload.manifest,
      payload.settings,
      packExtra(),
    )
    if (!dirCheck.ok) {
      return {
        ok: false,
        message: formatExportDirectoryBlockedMessage(dirCheck.errors),
      }
    }
    return payload
  }

  function setFeedback(text: string, isError: boolean): void {
    lastMessage.value = text
    lastMessageIsError.value = isError
  }

  /**
   * 粘贴 oclive-plugin-market「模块组合」页复制的 JSON，合并进简单创作（人设长文 / 世界观 / 身份提示）。
   */
  function applyMarketComposeJson(raw: string): { ok: boolean; message: string } {
    const p = parseMarketComposeV1(raw.trim())
    if (!p.ok) {
      setFeedback(p.error, true)
      return { ok: false, message: p.error }
    }
    const merged = mergeMarketComposeIntoEditor(p.data, {
      corePersonalityText: corePersonalityText.value,
      worldviewMarkdown: worldviewMarkdown.value,
      relationPromptHint: simpleM.relationPromptHint,
    })
    corePersonalityText.value = merged.corePersonalityText
    worldviewMarkdown.value = merged.worldviewMarkdown
    simpleM.relationPromptHint = merged.relationPromptHint
    creationMode.value = 'simple'
    flushSimpleToJson()
    setFeedback(pe('packEditor.feedback.marketComposeApplied'), false)
    return { ok: true, message: pe('packEditor.feedback.marketComposeOk') }
  }

  async function exportZip(ocpak: boolean, saveAs = false): Promise<void> {
    setFeedback('', false)
    const built = await tryBuildExportPayload()
    if (!built.ok) {
      setFeedback(built.message, true)
      return
    }
    let { roleId, manifest, settings } = built
    settings = applyReplyQualityAnchorPrompt(settings)
    try {
      const blob = await buildRolePackZipBlob(roleId, manifest, settings, packExtra())
      const name = suggestedZipName(roleId, ocpak)

      if (!isTauriRuntime()) {
        triggerDownload(blob, name)
        setFeedback(pe('packEditor.feedback.exportZipSuccess', { name, roleId }), false)
        return
      }

      const saveOptions = {
        defaultPath: readLastOcpakPath() ?? name,
        filters: [{ name: 'OCLive Role Pack', extensions: ['ocpak'] }],
      }
      let target = saveAs ? null : readLastOcpakPath()
      let usedDialog = false
      if (!target) {
        const picked = await save(saveOptions)
        if (picked === null) return
        target = picked
        usedDialog = true
      }

      const writeTo = async (path: string): Promise<void> => {
        const base64 = arrayBufferToBase64(await blob.arrayBuffer())
        await invoke('write_export_zip_file', { path, base64 })
      }

      try {
        await writeTo(target)
      } catch (error) {
        if (usedDialog) throw error
        const picked = await save(saveOptions)
        if (picked === null) return
        target = picked
        await writeTo(target)
      }

      rememberOcpakPath(target)
      setFeedback(pe('packEditor.feedback.exportZipSaved', { name, roleId, path: target }), false)
    } catch (e) {
      setFeedback(
        pe('packEditor.feedback.exportZipFail', {
          err: e instanceof Error ? e.message : String(e),
        }),
        true,
      )
    }
  }

  const applyLoadedPackTargets: ApplyLoadedPackTargets = {
    manifestText,
    settingsText,
    corePersonalityText,
    adultExtensionJson,
    memorySeedJson,
    configJsonText,
    voiceProfileJson,
    deepCapsuleText,
    systemPromptMarkdown,
    polishPromptMarkdown,
    userIdentityFiles,
    userIdentitiesIndexJson,
    preservedFiles,
    preservedBlueprintFields,
    characterCardImportReport,
    worldviewMarkdown,
    knowledgeMarkdownFiles,
    emotionImageFiles,
    portraitSlotFiles,
    portraitExtraEntries,
    visualPresentationEnabled,
    visualPresentationBackend,
    visualPresentationLive2dModel,
    creatorMessageToOthers,
    creatorMessageMode,
    uiConfig,
    uiJsonSource,
    authorJsonSource,
    authorSummary,
    authorDetailMarkdown,
    authorRecommendedRows,
    authorIncludeSuggestedUi,
    authorSuggestedBackendsJson,
    applyKnowledgeBundle,
    applySceneEditorEntries,
    syncFormsFromJson,
  }

  async function exportFolder(writeOptions?: ExportFolderWriteOptions): Promise<void> {
    setFeedback('', false)
    const built = await tryBuildExportPayload()
    if (!built.ok) {
      setFeedback(built.message, true)
      return
    }
    let { roleId, manifest, settings } = built
    if (writeOptions?.roleIdOverride?.trim()) {
      roleId = writeOptions.roleIdOverride.trim()
      manifest = { ...manifest, id: roleId }
      const overrideErr = validateRoleIdForExport(roleId)
      if (overrideErr) {
        setFeedback(overrideErr, true)
        return
      }
    }
    settings = applyReplyQualityAnchorPrompt(settings)
    try {
      if (writeOptions?.rolesRootPath.trim()) {
        const root = writeOptions.rolesRootPath.trim()
        if (!(await confirmOverwriteExistingRoleDir(root, roleId))) {
          return
        }
        await writePackToRolesRootPath(
          root,
          roleId,
          manifest,
          settings,
          packExtra(),
        )
        lastExportedRolesRoot.value = writeOptions.rolesRootPath.trim()
        try {
          localStorage.setItem('oclive-pack-editor-last-roles-root', writeOptions.rolesRootPath.trim())
          localStorage.setItem('oclive-pack-editor-roles-root', writeOptions.rolesRootPath.trim())
        } catch {
          /* ignore */
        }
        setFeedback(
          pe('packEditor.feedback.exportFolderSuccessPath', {
            roleId,
            root: writeOptions.rolesRootPath.trim(),
          }),
          false,
        )
        return
      }
      const result = await pickRolesRootAndWritePack(roleId, manifest, settings, packExtra())
      if (!result.wrote) return
      if (result.rolesRootPath) {
        lastExportedRolesRoot.value = result.rolesRootPath
        try {
          localStorage.setItem('oclive-pack-editor-last-roles-root', result.rolesRootPath)
          localStorage.setItem('oclive-pack-editor-roles-root', result.rolesRootPath)
        } catch {
          /* ignore */
        }
      }
      setFeedback(pe('packEditor.feedback.exportFolderSuccessPick', { roleId }), false)
    } catch (e) {
      setFeedback(
        pe('packEditor.feedback.exportFolderFail', {
          err: e instanceof Error ? e.message : String(e),
        }),
        true,
      )
    }
  }

  function capturePortraitSlotMeta(): Partial<Record<string, PortraitSlotDraftMeta>> {
    const out: Partial<Record<string, PortraitSlotDraftMeta>> = {}
    for (const [id, f] of Object.entries(portraitSlotFiles.value)) {
      if (f?.name) out[id] = { fileName: f.name }
    }
    return out
  }

  function capturePortraitExtraMeta(): PortraitExtraDraftMeta[] {
    return portraitExtraEntries.value.map((e) => ({
      id: e.id,
      path: e.path,
      desc: e.desc,
      tags: [...e.tags],
      kind: e.kind,
      cluster: e.cluster,
      fileName: e.file?.name,
    }))
  }

  function captureDraftSnapshot(): PackDraftSnapshot {
    flushSimpleToJson()
    return {
      version: 2,
      savedAt: new Date().toISOString(),
      creationMode: creationMode.value,
      advancedTab: advancedTab.value,
      manifestText: manifestText.value,
      settingsText: settingsText.value,
      corePersonalityText: corePersonalityText.value,
      adultExtensionJson: adultExtensionJson.value,
      memorySeedJson: memorySeedJson.value,
      configJsonText: configJsonText.value,
      voiceProfileJson: voiceProfileJson.value,
      deepCapsuleText: deepCapsuleText.value,
      systemPromptMarkdown: systemPromptMarkdown.value,
      polishPromptMarkdown: polishPromptMarkdown.value,
      userIdentityFiles: userIdentityFiles.value.map((f) => ({ ...f })),
      userIdentitiesIndexJson: userIdentitiesIndexJson.value,
      preservedBlueprintFields: { ...preservedBlueprintFields.value },
      worldKnowledgeTexts: { ...worldKnowledgeTexts.value },
      extraKnowledgeFiles: extraKnowledgeFiles.value.map((d) => ({
        path: d.path,
        content: d.content,
      })),
      worldviewMarkdown: worldviewMarkdown.value,
      knowledgeMarkdownFiles: knowledgeMarkdownFiles.value.map((d) => ({
        path: d.path,
        content: d.content,
      })),
      creatorMessageToOthers: creatorMessageToOthers.value,
      creatorMessageMode: creatorMessageMode.value,
      creatorMessageToDownloaderManifest: creatorMessageToDownloaderManifest.value,
      authorSummary: authorSummary.value,
      authorDetailMarkdown: authorDetailMarkdown.value,
      authorRecommendedRows: authorRecommendedRows.value.map((r) => ({ ...r })),
      authorIncludeSuggestedUi: authorIncludeSuggestedUi.value,
      authorSuggestedBackendsJson: authorSuggestedBackendsJson.value,
      uiConfig: { ...uiConfig },
      uiJsonSource: uiJsonSource.value,
      authorJsonSource: authorJsonSource.value,
      portraitSlotMeta: capturePortraitSlotMeta(),
      portraitExtraMeta: capturePortraitExtraMeta(),
      visualPresentationEnabled: visualPresentationEnabled.value,
      visualPresentationBackend: visualPresentationBackend.value,
      visualPresentationLive2dModel: visualPresentationLive2dModel.value,
      exportProfile: exportProfile.value,
      sceneEditorEntries: sceneEditorEntries.value.map((e) => ({ ...e })),
    }
  }

  function restoreDraftSnapshot(snapshot: PackDraftSnapshot): void {
    characterCardImportReport.value = null
    cancelDebouncedSimpleToJson()
    manifestText.value = snapshot.manifestText
    settingsText.value = snapshot.settingsText
    corePersonalityText.value = snapshot.corePersonalityText
    adultExtensionJson.value = snapshot.adultExtensionJson ?? ''
    memorySeedJson.value = snapshot.memorySeedJson ?? ''
    configJsonText.value = snapshot.configJsonText
      ?? buildSimpleConfigJson(false, { enabled: false, backend: 'image' })
    voiceProfileJson.value = snapshot.voiceProfileJson ?? ''
    deepCapsuleText.value = snapshot.deepCapsuleText ?? ''
    systemPromptMarkdown.value = snapshot.systemPromptMarkdown ?? ''
    polishPromptMarkdown.value = snapshot.polishPromptMarkdown ?? ''
    userIdentityFiles.value = (snapshot.userIdentityFiles ?? []).map((f) => ({ ...f }))
    userIdentitiesIndexJson.value = snapshot.userIdentitiesIndexJson ?? ''
    preservedFiles.value = []
    preservedBlueprintFields.value = { ...(snapshot.preservedBlueprintFields ?? {}) }
    if (snapshot.worldKnowledgeTexts) {
      worldKnowledgeTexts.value = {
        dialogueWorldview: snapshot.worldKnowledgeTexts.dialogueWorldview ?? '',
        knowledgeBoundary: snapshot.worldKnowledgeTexts.knowledgeBoundary ?? '',
      }
      extraKnowledgeFiles.value = (snapshot.extraKnowledgeFiles ?? []).map((d) => ({
        path: normalizeKnowledgePath(d.path),
        content: d.content,
      }))
      syncKnowledgeFilesFromWorldTexts()
      const legacyScene = (snapshot.worldKnowledgeTexts as { sceneSetting?: string }).sceneSetting
      if (legacyScene?.trim()) migrateLegacySceneSetting(legacyScene)
    } else {
      applyKnowledgeBundle(
        snapshot.knowledgeMarkdownFiles.map((d) => ({
          path: normalizeKnowledgePath(d.path),
          content: d.content,
        })),
        snapshot.worldviewMarkdown,
      )
    }
    emotionImageFiles.value = []
    const slotMeta = snapshot.portraitSlotMeta ?? {}
    const nextSlots: PortraitSlotFileMap = {}
    for (const [id, meta] of Object.entries(slotMeta)) {
      if (meta?.fileName && id in PORTRAIT_SLOT_TAG) {
        nextSlots[id as PortraitSlotId] = placeholderFileFromMeta(meta.fileName, 'image')
      }
    }
    portraitSlotFiles.value = nextSlots
    portraitExtraEntries.value = (snapshot.portraitExtraMeta ?? []).map((e) => ({
      id: e.id,
      path: e.path,
      desc: e.desc,
      tags: e.tags,
      kind: e.kind,
      cluster: e.cluster,
      file: e.fileName ? placeholderFileFromMeta(e.fileName, e.kind) : undefined,
    }))
    visualPresentationEnabled.value = snapshot.visualPresentationEnabled ?? false
    visualPresentationBackend.value = snapshot.visualPresentationBackend ?? 'image'
    visualPresentationLive2dModel.value = snapshot.visualPresentationLive2dModel ?? ''
    exportProfile.value = snapshot.exportProfile ?? 'desktop-full'
    syncEmotionFilesFromSlots()
    creatorMessageToOthers.value = snapshot.creatorMessageToOthers
    creatorMessageMode.value = snapshot.creatorMessageMode
    creatorMessageToDownloaderManifest.value = snapshot.creatorMessageToDownloaderManifest
    authorSummary.value = snapshot.authorSummary
    authorDetailMarkdown.value = snapshot.authorDetailMarkdown
    authorRecommendedRows.value =
      snapshot.authorRecommendedRows.length > 0
        ? snapshot.authorRecommendedRows.map((r) => ({ ...r }))
        : [emptyAuthorRecRow()]
    authorIncludeSuggestedUi.value = snapshot.authorIncludeSuggestedUi
    authorSuggestedBackendsJson.value = snapshot.authorSuggestedBackendsJson
    Object.assign(uiConfig, snapshot.uiConfig)
    uiJsonSource.value = snapshot.uiJsonSource ?? ''
    authorJsonSource.value = snapshot.authorJsonSource ?? ''
    creationMode.value = snapshot.creationMode
    advancedTab.value = snapshot.advancedTab === 'settings' ? 'manifest' : snapshot.advancedTab
    if (snapshot.sceneEditorEntries?.length) {
      applySceneEditorEntries(snapshot.sceneEditorEntries)
    } else {
      syncSceneEntriesFromManifest()
    }
    syncFormsFromJson()
    validationErrors.value = []
    validationLastUsedWasm.value = null
  }

  return {
    manifestText,
    settingsText,
    corePersonalityText,
    adultExtensionJson,
    memorySeedJson,
    configJsonText,
    voiceProfileJson,
    deepCapsuleText,
    systemPromptMarkdown,
    polishPromptMarkdown,
    userIdentityFiles,
    userIdentitiesIndexJson,
    worldKnowledgeTexts,
    sceneEditorEntries,
    worldviewMarkdown,
    knowledgeMarkdownFiles,
    emotionImageFiles,
    portraitSlotFiles,
    portraitExtraEntries,
    visualPresentationEnabled,
    visualPresentationBackend,
    visualPresentationLive2dModel,
    exportProfile,
    creatorMessageToOthers,
    creatorMessageMode,
    creatorMessageToDownloaderManifest,
    authorSummary,
    authorDetailMarkdown,
    authorRecommendedRows,
    authorIncludeSuggestedUi,
    authorSuggestedBackendsJson,
    validationErrors,
    validationLastUsedWasm,
    lastExportedRolesRoot,
    lastMessage,
    lastMessageIsError,
    characterCardImportReport,
    requireChecksBeforeExport,
    syncFormWarning,
    creationMode,
    advancedTab,
    simpleM,
    simpleS,
    uiConfig,
    multiRelationWarning,
    hasPortraitPlaceholderFiles,
    emotionImageSummary,
    folderExportOk,
    manifestRoleId,
    bindPackSession,
    runValidate,
    canEnterAdultEditor,
    onImportPack,
    onImportCharacterCard,
    onPortraitSlotPick,
    onPortraitSlotClear,
    clearPortraitSlots,
    addPortraitExtraEntry,
    applyPortraitExtraUserChoices,
    removePortraitExtraEntry,
    addAuthorRecommendedRow,
    removeAuthorRecommendedRow,
    addKnowledgeFile,
    updateKnowledgeFile,
    removeKnowledgeFile,
    exportZip,
    exportFolder,
    /** 简单模式：立即同步表单 → JSON（供切页前调用） */
    flushSimpleToJson,
    /** 市场「模块组合」JSON → 合并进简单创作 */
    applyMarketComposeJson,
    applyLoadedPackTargets,
    captureDraftSnapshot,
    restoreDraftSnapshot,
  }
}
