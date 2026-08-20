import { computed, onMounted, ref } from 'vue'
import { open } from '@tauri-apps/plugin-dialog'
import {
  applyLoadedPackToEditor,
  blueprintHasEditorExtensions,
  type ApplyLoadedPackTargets,
} from '../lib/applyLoadedPackToEditor'
import { isTauriRuntime } from '../lib/exportFolder'
import {
  catalogAssetsToFiles,
  invokeFindRolesRootForEditor,
  invokeGuessDefaultRolesRoot,
  invokeListRolePacksUnderRolesRoot,
  invokeLoadRolePackForEditor,
  preservedPayloadsToFiles,
  type RolePackListEntry,
} from '../lib/rolePackEditorApi'
import { parseJson } from '../lib/packChecks'
import { emptyAuthorRecRow } from '../lib/authorPack'
import { parseSceneFromDisk, type SceneEditorEntry } from '../lib/scenePackUser'
import { parseBlueprintJson, pickEditorPreservedBlueprintFields } from '../lib/blueprintV2'
import { buildNewPackPreset, type NewPackPresetId } from '../lib/newPackPresets'
import { worldKnowledgeTextsToFiles } from '../lib/worldKnowledgeUser'
import { buildSimpleConfigJson } from '../lib/portraitCatalog'
import { defaultUiConfig } from '../types/uiConfig'

const ROLES_ROOT_KEY = 'oclive-pack-editor-roles-root'
const LEGACY_LAST_ROLES_ROOT_KEY = 'oclive-pack-editor-last-roles-root'

export type PackSession = 'idle' | 'new' | 'loaded'

function readStoredRolesRoot(): string {
  try {
    const primary = localStorage.getItem(ROLES_ROOT_KEY)
    if (primary?.trim()) return primary.trim()
    const legacy = localStorage.getItem(LEGACY_LAST_ROLES_ROOT_KEY)
    if (legacy?.trim()) return legacy.trim()
  } catch {
    /* ignore */
  }
  return ''
}

function persistRolesRoot(path: string): void {
  const trimmed = path.trim()
  if (!trimmed) return
  try {
    localStorage.setItem(ROLES_ROOT_KEY, trimmed)
    localStorage.setItem(LEGACY_LAST_ROLES_ROOT_KEY, trimmed)
  } catch {
    /* ignore */
  }
}

async function guessDefaultRolesRoot(): Promise<string | null> {
  if (!isTauriRuntime()) return null
  try {
    return await invokeGuessDefaultRolesRoot()
  } catch {
    return null
  }
}

export function useRolesWorkspace(applyTargets: ApplyLoadedPackTargets) {
  const rolesRootPath = ref('')
  const availableRoles = ref<RolePackListEntry[]>([])
  const selectedRoleId = ref('')
  const packSession = ref<PackSession>('idle')
  const loadedRoleDir = ref('')
  const loadedRoleName = ref('')
  const loadedRoleId = ref('')
  const workspaceBusy = ref(false)
  const workspaceMessage = ref('')
  const workspaceMessageIsError = ref(false)

  const selectedRole = computed(() =>
    availableRoles.value.find((r) => r.roleId === selectedRoleId.value),
  )

  const selectableRoles = computed(() => availableRoles.value.filter((r) => !r.needsMigration))

  function setWorkspaceFeedback(text: string, isError: boolean): void {
    workspaceMessage.value = text
    workspaceMessageIsError.value = isError
  }

  async function populateRolesFromRoot(root: string): Promise<void> {
    const normalizedRoot = await invokeFindRolesRootForEditor(root)
    rolesRootPath.value = normalizedRoot
    persistRolesRoot(normalizedRoot)
    availableRoles.value = await invokeListRolePacksUnderRolesRoot(normalizedRoot)
    if (
      selectedRoleId.value &&
      !availableRoles.value.some((role) => role.roleId === selectedRoleId.value)
    ) {
      selectedRoleId.value = ''
    }
    if (!selectedRoleId.value && selectableRoles.value.length === 1) {
      selectedRoleId.value = selectableRoles.value[0]!.roleId
    }
  }

  async function scanRoles(): Promise<void> {
    let root = rolesRootPath.value.trim()
    if (!root) {
      const guessed = await guessDefaultRolesRoot()
      if (!guessed) {
        availableRoles.value = []
        setWorkspaceFeedback('未自动找到 roles 目录，请点击“选择其他目录”指定一次。', true)
        return
      }
      root = guessed
      rolesRootPath.value = guessed
      persistRolesRoot(guessed)
    }
    if (!isTauriRuntime()) {
      setWorkspaceFeedback('浏览器版请使用桌面版绑定 roles 目录。', true)
      return
    }
    workspaceBusy.value = true
    setWorkspaceFeedback('', false)
    try {
      await populateRolesFromRoot(root)
    } catch (e) {
      const guessed = await guessDefaultRolesRoot()
      if (guessed?.trim() && guessed.trim() !== root) {
        try {
          await populateRolesFromRoot(guessed.trim())
          setWorkspaceFeedback('检测到上次保存的目录已失效，已自动切换到当前 roles 目录。', false)
          return
        } catch {
          // Preserve the original error because it identifies the stale user-selected path.
        }
      }
      setWorkspaceFeedback(e instanceof Error ? e.message : String(e), true)
    } finally {
      workspaceBusy.value = false
    }
  }

  async function pickRolesRoot(): Promise<void> {
    if (!isTauriRuntime()) {
      setWorkspaceFeedback('绑定 roles 目录需要桌面版 Tauri。', true)
      return
    }
    const picked = await open({
      directory: true,
      multiple: false,
      defaultPath: rolesRootPath.value.trim() || undefined,
    })
    if (picked === null) return
    const path = Array.isArray(picked) ? picked[0]! : picked
    rolesRootPath.value = path
    await scanRoles()
  }

  function resetToNewPack(presetId: NewPackPresetId = 'blank'): void {
    if (applyTargets.characterCardImportReport) {
      applyTargets.characterCardImportReport.value = null
    }
    const preset = buildNewPackPreset(presetId)
    applyTargets.manifestText.value = preset.manifestText
    applyTargets.settingsText.value = preset.settingsText
    applyTargets.corePersonalityText.value = preset.corePersonalityText
    if (applyTargets.adultExtensionJson) applyTargets.adultExtensionJson.value = ''
    if (applyTargets.memorySeedJson) applyTargets.memorySeedJson.value = ''
    if (applyTargets.configJsonText) {
      applyTargets.configJsonText.value = buildSimpleConfigJson(
        false,
        { enabled: false, backend: 'image' },
      )
    }
    if (applyTargets.voiceProfileJson) applyTargets.voiceProfileJson.value = ''
    if (applyTargets.deepCapsuleText) applyTargets.deepCapsuleText.value = ''
    if (applyTargets.systemPromptMarkdown) applyTargets.systemPromptMarkdown.value = ''
    if (applyTargets.polishPromptMarkdown) applyTargets.polishPromptMarkdown.value = ''
    if (applyTargets.userIdentityFiles) applyTargets.userIdentityFiles.value = []
    if (applyTargets.userIdentitiesIndexJson) applyTargets.userIdentitiesIndexJson.value = ''
    if (applyTargets.preservedFiles) applyTargets.preservedFiles.value = []
    if (applyTargets.preservedBlueprintFields) applyTargets.preservedBlueprintFields.value = {}
    const knowledgeFiles = worldKnowledgeTextsToFiles(preset.worldKnowledgeTexts)
    applyTargets.worldviewMarkdown.value = preset.worldKnowledgeTexts.dialogueWorldview
    applyTargets.knowledgeMarkdownFiles.value = knowledgeFiles
    applyTargets.applyKnowledgeBundle?.(knowledgeFiles, '')
    applyTargets.applySceneEditorEntries?.(preset.sceneEditorEntries)
    applyTargets.emotionImageFiles.value = []
    applyTargets.portraitSlotFiles.value = {}
    applyTargets.portraitExtraEntries.value = []
    applyTargets.visualPresentationEnabled.value = false
    applyTargets.visualPresentationBackend.value = 'image'
    applyTargets.visualPresentationLive2dModel.value = ''
    applyTargets.creatorMessageToOthers.value = ''
    if (applyTargets.uiJsonSource) applyTargets.uiJsonSource.value = ''
    if (applyTargets.authorJsonSource) applyTargets.authorJsonSource.value = ''
    Object.assign(applyTargets.uiConfig, defaultUiConfig())
    applyTargets.authorSummary.value = ''
    applyTargets.authorDetailMarkdown.value = ''
    applyTargets.authorRecommendedRows.value = [emptyAuthorRecRow()]
    applyTargets.authorIncludeSuggestedUi.value = false
    applyTargets.authorSuggestedBackendsJson.value = ''
    packSession.value = 'new'
    loadedRoleDir.value = ''
    loadedRoleName.value = ''
    loadedRoleId.value = ''
    applyTargets.syncFormsFromJson()
    setWorkspaceFeedback('', false)
  }

  async function loadSelectedRole(): Promise<{ ok: boolean; displayName?: string }> {
    const role = selectedRole.value
    if (!role) {
      setWorkspaceFeedback('请先选择角色包。', true)
      return { ok: false }
    }
    if (role.needsMigration) {
      setWorkspaceFeedback('该目录为 legacy manifest.json，请先用 oclive pack migrate-to-blueprint 迁移。', true)
      return { ok: false }
    }
    workspaceBusy.value = true
    setWorkspaceFeedback('', false)
    try {
      const load = await invokeLoadRolePackForEditor(role.absPath)
      const manifestJson = load.manifestText.endsWith('\n')
        ? load.manifestText
        : `${load.manifestText}\n`
      const settingsJson =
        load.settingsText != null && load.settingsText !== ''
          ? load.settingsText.endsWith('\n')
            ? load.settingsText
            : `${load.settingsText}\n`
          : applyTargets.settingsText.value

      const corePersonality = load.corePersonalityText ?? ''
      const creatorMessage = load.creatorMessageText ?? ''
      const uiJson = load.uiText ?? ''
      const authorJson = load.authorText ?? ''
      const blueprintRaw = load.blueprintText
      const catalogFiles = catalogAssetsToFiles(load.catalogAssets ?? [])
      const preservedFiles = preservedPayloadsToFiles(load.preservedFiles ?? [])
      const editorPreservedFiles = preservedFiles.filter(
        (entry) => ![
          'voice_profile.json',
          'prompts/deep_capsule.txt',
          'prompts/system.md',
          'polish_prompt.md',
        ].includes(entry.relPath),
      )

      const sceneIds =
        load.mergedSceneIds?.length > 0 ? load.mergedSceneIds : ['home']
      const sceneFileById = new Map((load.sceneFiles ?? []).map((file) => [file.sceneId, file]))
      const sceneEditorEntries: SceneEditorEntry[] = sceneIds.map((sid) => {
        const file = sceneFileById.get(sid)
        return parseSceneFromDisk(
          sid,
          file?.sceneJsonText ?? '',
          file?.descriptionText ?? '',
        )
      })

      applyLoadedPackToEditor(
        {
          roleId: role.roleId,
          manifestJson,
          settingsJson,
          corePersonality,
          creatorMessage: creatorMessage.replace(/\r\n/g, '\n').replace(/\n+$/, ''),
          uiJson,
          authorJson,
          memorySeedJson: load.memorySeedText ?? '',
          userIdentityFiles: load.userIdentityFiles ?? [],
          userIdentitiesIndexJson: load.userIdentitiesIndexText ?? '',
          preservedBlueprintFields: blueprintRaw.trim()
            ? pickEditorPreservedBlueprintFields(parseBlueprintJson(blueprintRaw))
            : {},
          preservedFiles: editorPreservedFiles,
          portraitCatalogJson: load.portraitCatalogText ?? '',
          configJson: load.configText ?? '',
          adultExtensionJson: load.adultExtensionText ?? '',
          voiceProfileJson: load.voiceProfileText ?? '',
          deepCapsuleText: load.deepCapsuleText ?? '',
          systemPromptMarkdown: load.systemPromptText ?? '',
          polishPromptMarkdown: load.polishPromptText ?? '',
          emotionImageFiles: catalogFiles,
          sceneEditorEntries,
        },
        applyTargets,
      )

      packSession.value = 'loaded'
      loadedRoleDir.value = role.absPath
      loadedRoleId.value = role.roleId
      loadedRoleName.value = role.displayName

      if (blueprintRaw.trim() && blueprintHasEditorExtensions(blueprintRaw)) {
        setWorkspaceFeedback(
          `已加载「${role.displayName}」。包内 includes/groups/extensions 声明及其引用文件会无损保留；编写器当前只读这些扩展字段。`,
          false,
        )
      } else {
        setWorkspaceFeedback(`已加载「${role.displayName}」，请到简单或高级编辑。`, false)
      }
      return { ok: true, displayName: role.displayName }
    } catch (e) {
      setWorkspaceFeedback(e instanceof Error ? e.message : String(e), true)
      return { ok: false }
    } finally {
      workspaceBusy.value = false
    }
  }

  onMounted(async () => {
    const stored = readStoredRolesRoot()
    if (stored) {
      rolesRootPath.value = stored
    } else if (isTauriRuntime()) {
      const guessed = await guessDefaultRolesRoot()
      if (guessed) {
        rolesRootPath.value = guessed
        persistRolesRoot(guessed)
      }
    }
    if (rolesRootPath.value && isTauriRuntime()) {
      await scanRoles()
    }
  })

  return {
    rolesRootPath,
    availableRoles,
    selectableRoles,
    selectedRoleId,
    packSession,
    loadedRoleDir,
    loadedRoleName,
    loadedRoleId,
    workspaceBusy,
    workspaceMessage,
    workspaceMessageIsError,
    pickRolesRoot,
    scanRoles,
    loadSelectedRole,
    resetToNewPack,
    setWorkspaceFeedback,
  }
}

export function parseRoleIdFromManifest(manifestText: string): string {
  const m = parseJson<Record<string, unknown>>(manifestText, 'manifest.json')
  if (!m.ok) return ''
  const id = m.value.id
  return typeof id === 'string' ? id.trim() : ''
}
