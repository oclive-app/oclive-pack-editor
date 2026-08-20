<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { type EditorViewId, useEditorViewState } from './composables/useEditorViewState'
import { usePackEditor } from './composables/usePackEditor'
import { usePackShellPreferences } from './composables/usePackShellPreferences'
import { useRolesWorkspace } from './composables/useRolesWorkspace'
import { setAppLocale, getLocalePreference, type AppLocale } from './i18n'
import PackHeaderActions from './components/pack/PackHeaderActions.vue'
import PackShellMenu from './components/pack/PackShellMenu.vue'
import PackConfirmDialog from './components/pack/PackConfirmDialog.vue'
import CharacterCardModeDialog from './components/pack/CharacterCardModeDialog.vue'
import PackExportCreatorMessageDialog, {
  type ExportCreatorMessageKind,
} from './components/pack/PackExportCreatorMessageDialog.vue'
import PackToastBar from './components/pack/PackToastBar.vue'
import RolesWorkspacePanel from './components/pack/RolesWorkspacePanel.vue'
import {
  clearDraftSnapshot,
  readDraftMeta,
  readDraftSnapshot,
  saveDraftSnapshot,
  type PackDraftMeta,
} from './lib/draftStorage'
import type { NewPackPresetId } from './lib/newPackPresets'

const AdvancedCreationPanel = defineAsyncComponent(() => import('./components/pack/AdvancedCreationPanel.vue'))
const SimpleCreationPanel = defineAsyncComponent(() => import('./components/pack/SimpleCreationPanel.vue'))
const AdultExtensionPanel = defineAsyncComponent(() => import('./components/pack/AdultExtensionPanel.vue'))

const {
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
  validationErrors,
  lastMessage,
  lastMessageIsError,
  characterCardImportReport,
  requireChecksBeforeExport,
  syncFormWarning,
  creationMode,
  advancedTab,
  simpleM,
  simpleS,
  emotionImageSummary,
  multiRelationWarning,
  hasPortraitPlaceholderFiles,
  portraitSlotFiles,
  portraitExtraEntries,
  creatorMessageToOthers,
  creatorMessageMode,
  authorSummary,
  authorDetailMarkdown,
  authorRecommendedRows,
  authorIncludeSuggestedUi,
  authorSuggestedBackendsJson,
  uiConfig,
  folderExportOk,
  manifestRoleId,
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
  exportZip,
  exportFolder,
  flushSimpleToJson,
  applyMarketComposeJson,
  applyLoadedPackTargets,
  bindPackSession,
  captureDraftSnapshot,
  restoreDraftSnapshot,
} = usePackEditor()

const marketComposePaste = ref('')

const {
  rolesRootPath,
  availableRoles,
  selectableRoles,
  selectedRoleId,
  packSession,
  loadedRoleName,
  loadedRoleId,
  workspaceBusy,
  workspaceMessage,
  workspaceMessageIsError,
  pickRolesRoot,
  scanRoles,
  loadSelectedRole,
  resetToNewPack,
} = useRolesWorkspace(applyLoadedPackTargets)

bindPackSession(packSession)

const draftMeta = ref<PackDraftMeta | null>(readDraftMeta())

function refreshDraftMeta(): void {
  draftMeta.value = readDraftMeta()
}

onMounted(() => {
  refreshDraftMeta()
})

const showSaveDraft = computed(
  () =>
    packSession.value !== 'idle' &&
    (editorView.value === 'simple'
      || editorView.value === 'advanced'
      || editorView.value === 'adult'),
)

const { themePreference, setTheme, bumpScale, scaleLabel } = usePackShellPreferences()

const { t } = useI18n()
const uiLocale = ref<AppLocale>(getLocalePreference())

const writebackOpen = ref(false)
let writebackResolve: ((v: 'overwrite' | 'saveAsNew' | 'cancel') => void) | null = null

const characterCardModeOpen = ref(false)
const exportCreatorOpen = ref(false)
const pendingExportKind = ref<ExportCreatorMessageKind | null>(null)
const pendingExportSaveAs = ref(false)

function beginExport(kind: ExportCreatorMessageKind, saveAs = false): void {
  flushSimpleToJson()
  pendingExportKind.value = kind
  pendingExportSaveAs.value = saveAs
  exportCreatorOpen.value = true
}

function onExportCreatorCancel(): void {
  exportCreatorOpen.value = false
  pendingExportKind.value = null
  pendingExportSaveAs.value = false
}

async function onExportCreatorConfirm(payload: { enabled: boolean; message: string }): Promise<void> {
  exportCreatorOpen.value = false
  creatorMessageToOthers.value = payload.enabled ? payload.message.trim() : ''
  creatorMessageMode.value = 'per_module'
  const kind = pendingExportKind.value
  const saveAs = pendingExportSaveAs.value
  pendingExportKind.value = null
  pendingExportSaveAs.value = false
  if (!kind) return
  if (kind === 'ocpak') await exportZip(true, saveAs)
  else await executeExportFolder()
}

function onLocaleChange(v: AppLocale) {
  uiLocale.value = v
  setAppLocale(v)
}

function onApplyMarketCompose() {
  const r = applyMarketComposeJson(marketComposePaste.value)
  if (r.ok) {
    marketComposePaste.value = ''
    packSession.value = 'new'
    goEditorView('simple')
  }
}

const { editorView, shouldMountView } = useEditorViewState()

const editorNav = computed((): { id: EditorViewId; label: string; icon: string }[] => [
  { id: 'start', label: String(t('packEditor.nav.start')), icon: '🏠' },
  { id: 'simple', label: String(t('packEditor.nav.simple')), icon: '📝' },
  { id: 'advanced', label: String(t('packEditor.nav.advanced')), icon: '⚙️' },
  { id: 'adult', label: String(t('packEditor.nav.adult')), icon: '18+' },
])

async function goEditorView(id: EditorViewId) {
  if ((id === 'simple' || id === 'advanced' || id === 'adult') && packSession.value === 'idle') {
    lastMessage.value = String(t('packEditor.draft.pickFirst'))
    lastMessageIsError.value = true
    editorView.value = 'start'
    return
  }
  if (id === 'adult' && !(await canEnterAdultEditor()))
    return
  editorView.value = id
  if (id === 'simple') creationMode.value = 'simple'
  if (id === 'advanced') creationMode.value = 'advanced'
}

const viewTitle = computed(() => {
  const id = editorView.value
  if (id === 'start') return String(t('packEditor.titles.start'))
  if (id === 'simple') return String(t('packEditor.titles.simple'))
  if (id === 'advanced') return String(t('packEditor.titles.advanced'))
  if (id === 'adult') return String(t('packEditor.titles.adult'))
  return ''
})

const headerSubtitle = computed(() => {
  if (packSession.value === 'loaded' && loadedRoleName.value && editorView.value !== 'start') {
    return String(t('packEditor.shell.editingLoaded', { name: loadedRoleName.value }))
  }
  if (packSession.value === 'new' && draftMeta.value && editorView.value !== 'start') {
    return String(t('packEditor.shell.editingDraft', { name: draftMeta.value.roleName }))
  }
  if (editorView.value === 'start') return String(t('packEditor.shell.startSub'))
  return String(t('packEditor.shell.subMuted'))
})

async function onHeaderValidate(): Promise<void> {
  flushSimpleToJson()
  await runValidate()
}

function onSaveDraft(showToast = true): void {
  flushSimpleToJson()
  const snapshot = captureDraftSnapshot()
  snapshot.editorView = editorView.value
  saveDraftSnapshot(snapshot)
  refreshDraftMeta()
  if (showToast) {
    lastMessage.value = String(t('packEditor.draft.saved', { name: draftMeta.value?.roleName ?? '' }))
    lastMessageIsError.value = false
  }
}

function autoSaveDraftOnLeaveEditView(prev: EditorViewId | undefined): void {
  if (prev !== 'simple' && prev !== 'advanced' && prev !== 'adult') return
  if (packSession.value === 'idle') return
  onSaveDraft(false)
}

watch(editorView, (_view, prev) => {
  autoSaveDraftOnLeaveEditView(prev)
})

function onContinueDraft(): void {
  const snapshot = readDraftSnapshot()
  if (!snapshot) {
    refreshDraftMeta()
    lastMessage.value = String(t('packEditor.draft.missing'))
    lastMessageIsError.value = true
    return
  }
  restoreDraftSnapshot(snapshot)
  packSession.value = 'new'
  refreshDraftMeta()
  lastMessage.value = String(
    t('packEditor.draft.continued', { name: draftMeta.value?.roleName ?? snapshot.manifestText.slice(0, 20) }),
  )
  lastMessageIsError.value = false
  if (snapshot.editorView === 'scenes' || snapshot.advancedTab === 'scenes') {
    advancedTab.value = 'scenes'
    goEditorView('advanced')
  } else {
    goEditorView(snapshot.editorView ?? snapshot.creationMode)
  }
}

function onDiscardDraft(): void {
  if (!window.confirm(String(t('packEditor.draft.discardConfirm')))) return
  clearDraftSnapshot()
  refreshDraftMeta()
  lastMessage.value = String(t('packEditor.draft.discarded'))
  lastMessageIsError.value = false
}

async function onExportOcpak(): Promise<void> {
  beginExport('ocpak')
}

function onExportOcpakAs(): void {
  beginExport('ocpak', true)
}

function promptWriteback(): Promise<'overwrite' | 'saveAsNew' | 'cancel'> {
  return new Promise((resolve) => {
    writebackResolve = resolve
    writebackOpen.value = true
  })
}

function closeWriteback(choice: 'overwrite' | 'saveAsNew' | 'cancel') {
  writebackOpen.value = false
  writebackResolve?.(choice)
  writebackResolve = null
}

async function onExportFolder(): Promise<void> {
  beginExport('folder')
}

async function executeExportFolder(): Promise<void> {
  const root = rolesRootPath.value.trim()
  if (packSession.value === 'loaded' && root) {
    const choice = await promptWriteback()
    if (choice === 'cancel') return
    if (choice === 'overwrite') {
      await exportFolder({ rolesRootPath: root, roleIdOverride: loadedRoleId.value || manifestRoleId.value })
      return
    }
    const suggested = `${manifestRoleId.value || loadedRoleId.value}_copy`
    const newId = window.prompt(String(t('packEditor.writeback.newRoleIdPrompt')), suggested)?.trim()
    if (!newId) return
    await exportFolder({ rolesRootPath: root, roleIdOverride: newId })
    return
  }
  await exportFolder(root ? { rolesRootPath: root } : undefined)
}

async function onWorkspaceLoadRole() {
  const r = await loadSelectedRole()
  if (r.ok) {
    lastMessage.value = workspaceMessage.value
    lastMessageIsError.value = workspaceMessageIsError.value
  }
}

async function onWorkspaceImportPack(e: Event) {
  await onImportPack(e)
  if (!lastMessageIsError.value) {
    packSession.value = 'loaded'
  }
}

async function onWorkspaceImportCharacterCard(e: Event) {
  characterCardModeOpen.value = false
  await onImportCharacterCard(e)
  if (!lastMessageIsError.value) {
    packSession.value = 'new'
    characterCardModeOpen.value = true
  }
}

function onCharacterCardModeSelect(mode: 'simple' | 'advanced'): void {
  characterCardModeOpen.value = false
  void goEditorView(mode)
}

function onCharacterCardModeCancel(): void {
  characterCardModeOpen.value = false
}

function onCreateNewPack(presetId: NewPackPresetId) {
  resetToNewPack(presetId)
  packSession.value = 'new'
  lastMessage.value = String(t('packEditor.rolesWorkspace.createdNew'))
  lastMessageIsError.value = false
  goEditorView('simple')
}
</script>

<template>
  <div class="app fluent-page editor-shell">
    <aside class="editor-rail" :aria-label="String(t('packEditor.aria.nav'))">
      <button
        v-for="item in editorNav"
        :key="item.id"
        type="button"
        class="rail-btn rail-btn--accent-editor"
        :class="{ active: editorView === item.id }"
        @click="goEditorView(item.id)"
      >
        <span class="rail-ico" aria-hidden="true">{{ item.icon }}</span>
        <span class="rail-lbl">{{ item.label }}</span>
      </button>
    </aside>

    <div class="editor-main">
      <nav class="mobile-nav" :aria-label="String(t('packEditor.aria.nav'))">
        <button
          v-for="item in editorNav"
          :key="'m-' + item.id"
          type="button"
          class="mobile-nav-btn"
          :class="{ active: editorView === item.id }"
          @click="goEditorView(item.id)"
        >
          {{ item.icon }} {{ item.label }}
        </button>
      </nav>

      <header class="shell-header">
        <div class="shell-header-row">
          <div class="shell-header-copy">
            <p class="kicker">{{ t("packEditor.header.kicker") }}</p>
            <h1 class="shell-h1">{{ viewTitle }}</h1>
          </div>
          <div class="shell-header-tools" role="toolbar" :aria-label="String(t('packEditor.header.toolsAria'))">
            <PackHeaderActions
              v-model:require-checks-before-export="requireChecksBeforeExport"
              :folder-export-ok="folderExportOk"
              :show-save-draft="showSaveDraft"
              @run-validate="onHeaderValidate"
              @save-draft="() => onSaveDraft()"
              @export-ocpak="onExportOcpak"
              @export-ocpak-as="onExportOcpakAs"
              @export-folder="onExportFolder"
            />
            <PackShellMenu
              :locale="uiLocale"
              :theme="themePreference"
              @update:locale="onLocaleChange"
              @update:theme="setTheme"
            />
            <div class="shell-scale" :aria-label="String(t('packEditor.header.scaleAria'))">
              <button type="button" class="shell-tool-btn" :title="String(t('packEditor.header.shrink'))" :aria-label="String(t('packEditor.header.shrinkAria'))" @click="bumpScale(-1)">
                A−
              </button>
              <span class="shell-scale-value" :title="String(t('packEditor.header.relativeScaleTitle', { label: scaleLabel }))">{{ scaleLabel }}</span>
              <button type="button" class="shell-tool-btn" :title="String(t('packEditor.header.enlarge'))" :aria-label="String(t('packEditor.header.enlargeAria'))" @click="bumpScale(1)">
                A+
              </button>
            </div>
          </div>
        </div>
        <p class="sub" :class="{ 'sub-muted': editorView !== 'start' && packSession === 'loaded' }">
          {{ headerSubtitle }}
        </p>
      </header>

      <PackToastBar
        :message="lastMessage"
        :is-error="lastMessageIsError"
        :validation-errors="validationErrors"
      />

      <!-- 开始：roles 工作区 -->
      <RolesWorkspacePanel
        v-show="editorView === 'start'"
        v-model:selected-role-id="selectedRoleId"
        v-model:market-compose-paste="marketComposePaste"
        :roles-root-path="rolesRootPath"
        :selectable-roles="selectableRoles"
        :available-roles="availableRoles"
        :workspace-busy="workspaceBusy"
        :workspace-message="workspaceMessage"
        :workspace-message-is-error="workspaceMessageIsError"
        :draft-meta="draftMeta"
        @pick-roles-root="pickRolesRoot"
        @scan-roles="scanRoles"
        @load-selected-role="onWorkspaceLoadRole"
        @create-new-pack="onCreateNewPack"
        @continue-draft="onContinueDraft"
        @discard-draft="onDiscardDraft"
        @import-pack="onWorkspaceImportPack"
        @import-character-card="onWorkspaceImportCharacterCard"
        @apply-market-compose="onApplyMarketCompose"
      />

      <PackConfirmDialog
        :open="writebackOpen"
        :role-id="loadedRoleId || manifestRoleId"
        :roles-root-path="rolesRootPath"
        @overwrite="closeWriteback('overwrite')"
        @save-as-new="closeWriteback('saveAsNew')"
        @cancel="closeWriteback('cancel')"
      />

      <CharacterCardModeDialog
        :open="characterCardModeOpen"
        :report="characterCardImportReport"
        @simple="onCharacterCardModeSelect('simple')"
        @advanced="onCharacterCardModeSelect('advanced')"
        @cancel="onCharacterCardModeCancel"
      />

      <PackExportCreatorMessageDialog
        :open="exportCreatorOpen"
        :export-kind="pendingExportKind"
        :initial-message="creatorMessageToOthers"
        @confirm="onExportCreatorConfirm"
        @cancel="onExportCreatorCancel"
      />

      <!-- 简单创作 -->
      <div v-if="shouldMountView('simple')" v-show="editorView === 'simple'" class="view-stack">
        <SimpleCreationPanel
          v-model:core-personality="corePersonalityText"
          v-model:world-knowledge-texts="worldKnowledgeTexts"
          :simple-m="simpleM"
          :simple-s="simpleS"
          :sync-form-warning="syncFormWarning"
          :multi-relation-warning="multiRelationWarning"
          :portrait-placeholder-warning="hasPortraitPlaceholderFiles"
          :emotion-summary="emotionImageSummary"
          :portrait-slot-files="portraitSlotFiles"
          :portrait-extra-entries="portraitExtraEntries"
          :character-card-import-report="characterCardImportReport"
          @portrait-slot-pick="onPortraitSlotPick"
          @portrait-slot-clear="onPortraitSlotClear"
          @portrait-clear-all="clearPortraitSlots"
          @portrait-extra-add="addPortraitExtraEntry"
          @portrait-extra-remove="removePortraitExtraEntry"
          @portrait-extra-apply-choices="applyPortraitExtraUserChoices"
        />
      </div>

      <!-- 高级创作 -->
      <div v-if="shouldMountView('advanced')" v-show="editorView === 'advanced'" class="view-stack">
        <AdvancedCreationPanel
          v-model:manifest-text="manifestText"
          v-model:settings-text="settingsText"
          v-model:core-personality="corePersonalityText"
          v-model:memory-seed-json="memorySeedJson"
          v-model:config-json-text="configJsonText"
          v-model:voice-profile-json="voiceProfileJson"
          v-model:deep-capsule-text="deepCapsuleText"
          v-model:system-prompt-markdown="systemPromptMarkdown"
          v-model:polish-prompt-markdown="polishPromptMarkdown"
          v-model:creator-message="creatorMessageToOthers"
          v-model:author-summary="authorSummary"
          v-model:author-detail-markdown="authorDetailMarkdown"
          v-model:author-recommended-rows="authorRecommendedRows"
          v-model:author-include-suggested-ui="authorIncludeSuggestedUi"
          v-model:author-suggested-backends-json="authorSuggestedBackendsJson"
          v-model:user-identity-files="userIdentityFiles"
          v-model:user-identities-index-json="userIdentitiesIndexJson"
          v-model:world-knowledge-texts="worldKnowledgeTexts"
          v-model:scene-editor-entries="sceneEditorEntries"
          v-model:advanced-tab="advancedTab"
          :manifest-role-id="manifestRoleId"
          :emotion-summary="emotionImageSummary"
          :portrait-slot-files="portraitSlotFiles"
          :portrait-extra-entries="portraitExtraEntries"
          :ui-config="uiConfig"
          @portrait-slot-pick="onPortraitSlotPick"
          @portrait-slot-clear="onPortraitSlotClear"
          @portrait-clear-all="clearPortraitSlots"
          @portrait-extra-apply-choices="applyPortraitExtraUserChoices"
          @portrait-extra-add="addPortraitExtraEntry"
          @portrait-extra-remove="removePortraitExtraEntry"
        />
      </div>

      <div v-if="shouldMountView('adult')" v-show="editorView === 'adult'" class="view-stack">
        <AdultExtensionPanel
          v-model="adultExtensionJson"
          :scene-ids="sceneEditorEntries.map((entry) => entry.sceneId)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.shell-locale-select {
  padding: 6px 10px;
  border-radius: 10px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.14));
  background: var(--surface-2, rgba(255, 255, 255, 0.06));
  color: var(--text-1, #fff);
  font-size: 12px;
}
.app {
  margin: 0;
  padding: 0;
  max-width: none;
  font-family: var(--fluent-font);
  color: var(--fluent-text-primary);
}

.editor-shell {
  display: flex;
  min-height: 0;
  height: 100%;
  max-height: 100%;
  overflow: hidden;
  /* 页面底纹在全局 body/:root，避免重复叠渐变 */
  background: transparent;
}

/* 与 oclive-launcher 侧栏：宽度、图标格、毛玻璃与描边一致 */
.editor-rail {
  width: calc(2.75rem + 1rem);
  box-sizing: border-box;
  flex-shrink: 0;
  align-self: stretch;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.45rem;
  padding: 1rem 0.5rem;
  border-right: 1px solid var(--fluent-border-stroke);
  background: color-mix(in srgb, var(--fluent-bg-card) 78%, transparent);
  backdrop-filter: blur(10px) saturate(110%);
  -webkit-backdrop-filter: blur(10px) saturate(110%);
  box-shadow:
    var(--fluent-shadow-soft),
    inset -1px 0 0 color-mix(in srgb, var(--fluent-border-stroke) 60%, transparent);
  position: sticky;
  top: 0;
  max-height: 100%;
  overflow-y: auto;
}

.rail-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 2.75rem;
  gap: 0.3rem;
  padding: 0.1rem 0;
  border: none;
  border-radius: 0;
  background: transparent;
  color: var(--fluent-text-secondary);
  cursor: pointer;
  font-size: 0.65rem;
  font-weight: 500;
  transition:
    color var(--motion-fast) var(--ease-out),
    transform var(--motion-fast) var(--ease-out);
  will-change: transform;
}

.rail-btn:hover {
  color: var(--fluent-text-primary);
  transform: translateY(-1px);
}

.rail-btn:hover .rail-ico {
  background: var(--fluent-bg-subtle);
  color: var(--fluent-text-primary);
}

.rail-btn.active {
  color: var(--fluent-text-primary);
}

.rail-btn.active .rail-ico {
  background: color-mix(in srgb, var(--fluent-accent-subtle) 70%, rgba(255, 255, 255, 0.12));
  color: var(--fluent-accent);
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--fluent-accent) 26%, transparent),
    0 0 10px color-mix(in srgb, var(--fluent-accent) 20%, transparent);
}

.rail-btn--accent-editor.active .rail-ico {
  background: var(--rail-accent-editor-bg);
  color: var(--rail-accent-editor);
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--rail-accent-editor) 28%, transparent),
    0 0 10px color-mix(in srgb, var(--rail-accent-editor) 18%, transparent);
}

.rail-btn:focus-visible {
  outline: none;
}

.rail-btn:focus-visible .rail-ico {
  box-shadow: 0 0 0 2px var(--fluent-border-focus);
}

.rail-ico {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  flex-shrink: 0;
  border-radius: var(--fluent-radius);
  font-size: 1.25rem;
  line-height: 1;
  transition:
    background var(--motion-fast) var(--ease-out),
    color var(--motion-fast) var(--ease-out),
    box-shadow var(--motion-med) var(--ease-out),
    transform var(--motion-fast) var(--ease-out);
  will-change: transform;
}

.rail-lbl {
  line-height: 1.15;
  text-align: center;
  max-width: 2.75rem;
}

.editor-main {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  max-width: min(1080px, calc(100vw - 4.75rem));
  padding: clamp(0.85rem, 2.2vw, 1.25rem) clamp(0.75rem, 3vw, 1.35rem) clamp(1.5rem, 4vw, 2.5rem);
  margin: 0 auto;
  width: 100%;
}

.shell-header {
  margin-bottom: 1.25rem;
  padding: 1.1rem 1.25rem 1.2rem;
  border-radius: var(--fluent-radius-lg);
  background: color-mix(in srgb, var(--fluent-bg-card) 82%, transparent);
  backdrop-filter: blur(9px) saturate(106%);
  -webkit-backdrop-filter: blur(9px) saturate(106%);
  border: 1px solid var(--fluent-border-stroke);
  border-left: 3px solid var(--rail-accent-editor);
  box-shadow: var(--fluent-shadow-card);
  position: relative;
  z-index: 30;
  overflow: visible;
}

.shell-header-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem 1rem;
  margin-bottom: 0.35rem;
}

.shell-header-copy {
  flex: 1;
  min-width: min(100%, 14rem);
}

.shell-header-tools {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem 0.65rem;
}

.shell-scale {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.15rem 0.35rem;
  border-radius: var(--fluent-radius-lg);
  border: 1px solid var(--pack-glass-border);
  background: var(--pack-glass-fill-subtle);
  box-shadow: var(--fluent-shadow-soft), var(--pack-glass-inset);
}

.shell-scale-value {
  min-width: 2.75rem;
  text-align: center;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--fluent-text-secondary);
  font-variant-numeric: tabular-nums;
}

.shell-tool-btn {
  padding: 0.35rem 0.55rem;
  min-height: 30px;
  border-radius: var(--fluent-radius);
  border: 1px solid var(--pack-glass-border);
  background: var(--pack-glass-fill-strong);
  backdrop-filter: var(--pack-glass-blur);
  -webkit-backdrop-filter: var(--pack-glass-blur);
  color: var(--fluent-text-primary);
  cursor: pointer;
  font-size: 0.78rem;
  font-weight: 500;
  font-family: var(--fluent-font);
  box-shadow: var(--fluent-shadow-soft), var(--pack-glass-inset);
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    transform 0.1s ease;
}

.shell-tool-btn:hover {
  background: var(--fluent-bg-subtle);
  border-color: var(--fluent-text-secondary);
}

.shell-tool-btn:focus-visible {
  outline: none;
  box-shadow:
    var(--fluent-shadow-soft),
    var(--pack-glass-inset),
    0 0 0 2px rgba(255, 255, 255, 0.92),
    0 0 0 4px var(--fluent-border-focus);
}

.shell-tool-btn:active {
  transform: scale(0.98);
}

.shell-theme-btn {
  padding: 0.35rem 0.65rem;
}

.kicker {
  margin: 0;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--fluent-accent);
}

.shell-h1 {
  margin: 0.35rem 0 0;
  font-size: 1.55rem;
  font-weight: 650;
  letter-spacing: -0.025em;
  line-height: 1.2;
}

.sub {
  margin: 0.65rem 0 0;
  color: var(--fluent-text-secondary);
  font-size: 0.875rem;
  line-height: 1.55;
  max-width: 52rem;
}

.sub-muted {
  opacity: 0.95;
}

.view-stack {
  animation: viewIn 0.2s ease;
}

@keyframes viewIn {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.view-stack--check .actions {
  margin-top: 0.5rem;
}

.import-wrap {
  padding: 1rem 1.15rem 1.125rem;
  border-radius: var(--fluent-radius-lg);
  background: color-mix(in srgb, var(--fluent-bg-card) 82%, transparent);
  backdrop-filter: blur(9px) saturate(106%);
  -webkit-backdrop-filter: blur(9px) saturate(106%);
  border: 1px solid var(--fluent-border-stroke);
  box-shadow: var(--fluent-shadow-card);
}

.section-kicker {
  margin: 0 0 0.6rem;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--fluent-accent);
}

.import-bar {
  margin-top: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.65rem 1rem;
}

.import-btn {
  display: inline-block;
  padding: 0.5rem 1rem;
  border-radius: var(--fluent-radius);
  border: 1px solid var(--fluent-accent);
  background: var(--pack-glass-fill-strong);
  backdrop-filter: var(--pack-glass-blur);
  -webkit-backdrop-filter: var(--pack-glass-blur);
  color: var(--fluent-accent);
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  box-shadow: var(--fluent-shadow-soft), var(--pack-glass-inset);
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    transform 0.1s ease;
}

.import-btn:hover {
  background: var(--fluent-accent-subtle);
  border-color: var(--fluent-accent-hover);
  color: var(--fluent-accent-hover);
}

.import-btn:focus-visible {
  outline: none;
  box-shadow:
    var(--fluent-shadow-soft),
    var(--pack-glass-inset),
    0 0 0 2px rgba(255, 255, 255, 0.92),
    0 0 0 4px var(--fluent-border-focus);
}

.import-btn:active {
  transform: scale(0.985);
}

.import-hint {
  font-size: 0.8125rem;
  color: var(--fluent-text-secondary);
}

.market-compose-wrap {
  margin-top: 1rem;
  padding: 1rem 1.15rem 1.2rem;
  border-radius: var(--fluent-radius-lg);
  background: color-mix(in srgb, var(--fluent-bg-card) 82%, transparent);
  backdrop-filter: blur(9px) saturate(106%);
  -webkit-backdrop-filter: blur(9px) saturate(106%);
  border: 1px solid var(--fluent-border-stroke);
  box-shadow: var(--fluent-shadow-card);
}

.mc-h2 {
  margin: 0 0 0.5rem;
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--fluent-text-primary);
}

.mc-lead {
  margin: 0 0 0.85rem;
  font-size: 0.8125rem;
  color: var(--fluent-text-secondary);
  line-height: 1.55;
  max-width: 62ch;
}

.mc-textarea {
  width: 100%;
  box-sizing: border-box;
  margin-bottom: 0.65rem;
  padding: 0.6rem 0.75rem;
  font-size: 0.78rem;
  font-family: ui-monospace, monospace;
  line-height: 1.45;
  border-radius: var(--fluent-radius);
  border: 1px solid var(--fluent-border-control);
  background: var(--fluent-bg-subtle);
  color: var(--fluent-text-primary);
  resize: vertical;
  min-height: 140px;
}

.mc-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.mc-btn.primary {
  padding: 0.5rem 1rem;
  min-height: 32px;
  border-radius: var(--fluent-radius);
  border: none;
  background: var(--fluent-accent);
  color: #fff;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 600;
  font-family: var(--fluent-font);
  box-shadow:
    var(--fluent-shadow-soft),
    0 1px 0 color-mix(in srgb, #fff 18%, transparent);
  transition:
    background 0.15s ease,
    transform 0.1s ease,
    box-shadow 0.15s ease;
}

.mc-btn.primary:hover {
  background: var(--fluent-accent-hover);
}

.mc-btn.primary:focus-visible {
  outline: none;
  box-shadow:
    var(--fluent-shadow-soft),
    0 0 0 2px rgba(255, 255, 255, 0.92),
    0 0 0 4px var(--fluent-border-focus);
}

.mc-btn.primary:active {
  transform: scale(0.985);
}

.quick-card {
  margin-top: 1rem;
  padding: 1rem 1.15rem 1.2rem;
  border-radius: var(--fluent-radius-lg);
  background: color-mix(in srgb, var(--fluent-bg-card) 82%, transparent);
  backdrop-filter: blur(9px) saturate(106%);
  -webkit-backdrop-filter: blur(9px) saturate(106%);
  border: 1px solid var(--fluent-border-stroke);
  border-left: 3px solid color-mix(in srgb, var(--rail-accent-editor) 65%, var(--fluent-border-stroke));
  box-shadow: var(--fluent-shadow-card);
}

.quick-lead {
  margin: 0 0 1rem;
  font-size: 0.875rem;
  color: var(--fluent-text-secondary);
  line-height: 1.5;
}

.quick-hint-ico {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.05rem;
  height: 1.05rem;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--fluent-border-control) 85%, transparent);
  font-size: 0.62rem;
  font-weight: 700;
  color: var(--fluent-text-secondary);
  vertical-align: middle;
}

.quick-actions {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 11rem), 1fr));
  gap: 0.75rem;
}

.quick-tile {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  padding: 1rem 1rem 1.1rem;
  border-radius: var(--fluent-radius-lg);
  border: 1px solid var(--pack-glass-border);
  background: var(--pack-glass-fill-subtle);
  backdrop-filter: var(--pack-glass-blur);
  -webkit-backdrop-filter: var(--pack-glass-blur);
  cursor: pointer;
  font-family: var(--fluent-font);
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    background 0.15s ease,
    transform 0.1s ease;
}

.quick-tile:hover {
  border-color: color-mix(in srgb, var(--fluent-accent) 35%, var(--pack-glass-border));
  box-shadow: var(--fluent-shadow-soft), var(--pack-glass-inset);
  background: var(--pack-glass-fill-strong);
}

.quick-tile:focus-visible {
  outline: none;
  border-color: color-mix(in srgb, var(--fluent-accent) 45%, var(--pack-glass-border));
  box-shadow:
    var(--fluent-shadow-soft),
    var(--pack-glass-inset),
    0 0 0 2px rgba(255, 255, 255, 0.92),
    0 0 0 4px var(--fluent-border-focus),
    0 0 14px color-mix(in srgb, var(--fluent-accent) 18%, transparent);
}

.quick-tile:active {
  transform: scale(0.992);
}

.quick-tile-accent {
  border-color: color-mix(in srgb, var(--fluent-accent) 28%, var(--fluent-border-stroke));
  background: color-mix(in srgb, var(--fluent-accent-subtle) 55%, transparent);
}

.quick-tile-ico {
  font-size: 1.5rem;
  margin-bottom: 0.35rem;
}

.quick-tile-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--fluent-text-primary);
  margin-bottom: 0.25rem;
}

.quick-tile-desc {
  font-size: 0.78rem;
  color: var(--fluent-text-secondary);
  line-height: 1.4;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
  align-items: center;
}

.actions button {
  padding: 0.5rem 1rem;
  min-height: 32px;
  border-radius: var(--fluent-radius);
  border: 1px solid transparent;
  background: var(--fluent-accent);
  color: #fff;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  font-family: var(--fluent-font);
  box-shadow:
    var(--fluent-shadow-soft),
    0 1px 0 color-mix(in srgb, #fff 18%, transparent);
  transition:
    background 0.15s ease,
    transform 0.1s ease,
    box-shadow 0.15s ease;
}

.actions button:hover {
  background: var(--fluent-accent-hover);
}

.actions button:focus-visible {
  outline: none;
  box-shadow:
    var(--fluent-shadow-soft),
    0 0 0 2px rgba(255, 255, 255, 0.92),
    0 0 0 4px var(--fluent-border-focus);
}

.actions button:active:not(:disabled) {
  transform: scale(0.985);
}

.actions button.secondary {
  background: var(--pack-glass-fill-strong);
  backdrop-filter: var(--pack-glass-blur);
  -webkit-backdrop-filter: var(--pack-glass-blur);
  color: var(--fluent-text-primary);
  border-color: var(--pack-glass-border);
  box-shadow: var(--fluent-shadow-soft), var(--pack-glass-inset);
}

.actions button.secondary:hover {
  background: var(--fluent-bg-subtle);
  border-color: var(--fluent-text-secondary);
}

.errors-block {
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  background: var(--fluent-danger-bg);
  border: 1px solid var(--fluent-danger-border);
  border-radius: var(--fluent-radius-lg);
  font-size: 0.875rem;
  color: var(--fluent-danger-text);
}

.errors-block strong {
  color: var(--fluent-danger-text);
}

.errors-block ul {
  margin: 0.35rem 0 0 1.1rem;
  padding: 0;
}

.hint.muted {
  color: var(--fluent-text-secondary);
  font-size: 0.875rem;
}

.post-actions-hint {
  margin-top: 0.75rem;
}

.feedback-msg {
  margin-top: 0.75rem;
  font-size: 0.875rem;
  line-height: 1.5;
  padding: 0.5rem 0.75rem;
  border-radius: var(--fluent-radius-lg);
}

.feedback-msg--ok {
  color: var(--fluent-success-text);
  background: rgba(16, 124, 16, 0.08);
  border: 1px solid rgba(16, 124, 16, 0.35);
}

.feedback-msg--err {
  color: var(--fluent-danger-text);
  background: var(--fluent-danger-bg);
  border: 1px solid var(--fluent-danger-border);
}

.mobile-nav {
  display: none;
}

.mobile-nav-btn {
  padding: 0.4rem 0.65rem;
  border-radius: var(--fluent-radius-lg);
  border: 1px solid var(--pack-glass-border);
  background: var(--pack-glass-fill-strong);
  backdrop-filter: var(--pack-glass-blur);
  -webkit-backdrop-filter: var(--pack-glass-blur);
  color: var(--fluent-text-primary);
  font-size: 0.78rem;
  font-weight: 500;
  cursor: pointer;
  box-shadow: var(--fluent-shadow-soft), var(--pack-glass-inset);
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.mobile-nav-btn:hover {
  background: var(--fluent-bg-subtle);
}

.mobile-nav-btn.active {
  border-color: color-mix(in srgb, var(--rail-accent-editor) 42%, var(--pack-glass-border));
  background: var(--rail-accent-editor-bg);
  color: var(--rail-accent-editor);
  font-weight: 600;
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--rail-accent-editor) 28%, transparent),
    0 0 10px color-mix(in srgb, var(--rail-accent-editor) 14%, transparent);
}

@media (max-width: 720px) {
  .editor-rail {
    display: none;
  }

  .editor-main {
    max-width: min(1080px, calc(100vw - 1.25rem));
    padding-left: clamp(0.65rem, 4vw, 1rem);
    padding-right: clamp(0.65rem, 4vw, 1rem);
  }

  .shell-header-tools {
    width: 100%;
    justify-content: flex-start;
  }

  .mobile-nav {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
    margin-bottom: 0.85rem;
    padding: 0.35rem 0;
    border-bottom: 1px solid var(--pack-glass-border);
    background: var(--pack-glass-fill);
    backdrop-filter: var(--pack-glass-blur);
    -webkit-backdrop-filter: var(--pack-glass-blur);
  }

  .editor-main {
    padding: 1rem 0.85rem 2rem;
  }
}
</style>
