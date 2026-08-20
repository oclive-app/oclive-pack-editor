<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { isTauriRuntime } from '../../lib/exportFolder'
import type { PackDraftMeta } from '../../lib/draftStorage'
import { NEW_PACK_PRESET_IDS, type NewPackPresetId } from '../../lib/newPackPresets'

const props = defineProps<{
  rolesRootPath: string
  selectableRoles: { roleId: string; displayName: string; needsMigration: boolean }[]
  availableRoles: { roleId: string; displayName: string; needsMigration: boolean }[]
  selectedRoleId: string
  workspaceBusy: boolean
  workspaceMessage: string
  workspaceMessageIsError: boolean
  marketComposePaste: string
  draftMeta: PackDraftMeta | null
}>()

const selectedRoleId = defineModel<string>('selectedRoleId', { required: true })
const marketComposePaste = defineModel<string>('marketComposePaste', { required: true })

const emit = defineEmits<{
  pickRolesRoot: []
  scanRoles: []
  loadSelectedRole: []
  createNewPack: [presetId: NewPackPresetId]
  continueDraft: []
  discardDraft: []
  importPack: [e: Event]
  importCharacterCard: [e: Event]
  applyMarketCompose: []
}>()

const { t } = useI18n()

const isTauri = computed(() => isTauriRuntime())
const selectedPreset = ref<NewPackPresetId>('blank')
const presetOptions = computed(() =>
  NEW_PACK_PRESET_IDS.map((id) => ({
    id,
    title: String(t(`packEditor.draft.presets.${id}.title`)),
    description: String(t(`packEditor.draft.presets.${id}.desc`)),
  })),
)

const roleSelectHint = computed(() => {
  if (!props.rolesRootPath.trim()) return String(t('packEditor.rolesWorkspace.hints.pickRoot'))
  if (!props.availableRoles.length) return String(t('packEditor.rolesWorkspace.hints.empty'))
  if (!props.selectableRoles.length) return String(t('packEditor.rolesWorkspace.hints.onlyLegacy'))
  return ''
})

function formatDraftTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

function openRole(roleId: string): void {
  selectedRoleId.value = roleId
  emit('loadSelectedRole')
}
</script>

<template>
  <div class="roles-workspace view-stack">
    <section class="rw-card rw-entry-card" :aria-label="String(t('packEditor.draft.aria'))">
      <p class="section-kicker">{{ t('packEditor.draft.kicker') }}</p>
      <h2 class="rw-h2">{{ t('packEditor.draft.title') }}</h2>
      <p class="rw-lead">{{ t('packEditor.draft.lead') }}</p>

      <div v-if="draftMeta" class="rw-draft-box">
        <div class="rw-draft-info">
          <span class="rw-draft-name">{{ draftMeta.roleName }}</span>
          <span class="rw-draft-meta">
            {{ draftMeta.roleId }} · {{ formatDraftTime(draftMeta.savedAt) }} ·
            {{ draftMeta.creationMode === 'simple' ? t('packEditor.nav.simple') : t('packEditor.nav.advanced') }}
          </span>
        </div>
        <div class="rw-draft-actions">
          <button type="button" class="rw-btn rw-btn--primary" @click="emit('continueDraft')">
            {{ t('packEditor.draft.continue') }}
          </button>
          <button type="button" class="rw-btn" @click="emit('discardDraft')">
            {{ t('packEditor.draft.discard') }}
          </button>
        </div>
      </div>
      <p v-else class="rw-hint rw-draft-empty">{{ t('packEditor.draft.empty') }}</p>

      <fieldset class="rw-presets">
        <legend>{{ t('packEditor.draft.presetTitle') }}</legend>
        <p class="rw-hint rw-preset-lead">{{ t('packEditor.draft.presetLead') }}</p>
        <div class="rw-preset-grid">
          <label
            v-for="preset in presetOptions"
            :key="preset.id"
            class="rw-preset"
            :class="{ 'rw-preset--selected': selectedPreset === preset.id }"
          >
            <input v-model="selectedPreset" type="radio" name="new-pack-preset" :value="preset.id" />
            <span>
              <strong>{{ preset.title }}</strong>
              <small>{{ preset.description }}</small>
            </span>
          </label>
        </div>
      </fieldset>

      <div class="rw-entry-actions">
        <button
          type="button"
          class="rw-btn rw-btn--accent rw-btn--wide"
          @click="emit('createNewPack', selectedPreset)"
        >
          {{ t('packEditor.draft.createNew') }}
        </button>
      </div>
      <p class="rw-hint rw-entry-note">{{ t('packEditor.draft.afterPick') }}</p>

      <div class="rw-character-card-import">
        <div>
          <h3>{{ t('packEditor.characterCardImport.title') }}</h3>
          <p>{{ t('packEditor.characterCardImport.desc') }}</p>
        </div>
        <label class="rw-btn rw-btn--file rw-btn--primary">
          <input
            type="file"
            accept=".json,.png,.apng,.charx,application/json,image/png,image/apng"
            class="rw-file-input"
            @change="emit('importCharacterCard', $event)"
          />
          {{ t('packEditor.characterCardImport.button') }}
        </label>
      </div>
      <p class="rw-hint rw-character-card-note">{{ t('packEditor.characterCardImport.note') }}</p>
    </section>

    <section class="rw-card" :aria-label="String(t('packEditor.rolesWorkspace.aria'))">
      <div class="rw-card-heading">
        <div>
          <p class="section-kicker">{{ t('packEditor.rolesWorkspace.kicker') }}</p>
          <h2 class="rw-h2">
            {{ t(isTauri ? 'packEditor.rolesWorkspace.title' : 'packEditor.rolesWorkspace.browserTitle') }}
          </h2>
          <p class="rw-lead">
            {{ t(isTauri ? 'packEditor.rolesWorkspace.lead' : 'packEditor.rolesWorkspace.browserLead') }}
          </p>
        </div>
        <span class="rw-mode-badge" :class="{ 'rw-mode-badge--desktop': isTauri }">
          <span class="rw-mode-dot" aria-hidden="true"></span>
          {{ t(isTauri ? 'packEditor.rolesWorkspace.modeDesktop' : 'packEditor.rolesWorkspace.modeBrowser') }}
        </span>
      </div>

      <div v-if="!isTauri" class="rw-browser-note" role="status">
        <span class="rw-browser-icon" aria-hidden="true">↥</span>
        <span>
          <strong>{{ t('packEditor.rolesWorkspace.browserNoteTitle') }}</strong>
          {{ t('packEditor.rolesWorkspace.browserNote') }}
        </span>
      </div>

      <div v-if="isTauri" class="rw-row">
        <label class="rw-label">{{ t('packEditor.rolesWorkspace.rootLabel') }}</label>
        <div class="rw-root-bar">
          <code class="rw-path">{{ rolesRootPath || t('packEditor.rolesWorkspace.rootUnset') }}</code>
          <button
            type="button"
            class="rw-btn rw-btn--primary"
            :disabled="workspaceBusy || !isTauri"
            @click="emit('scanRoles')"
          >
            {{ t('packEditor.rolesWorkspace.scan') }}
          </button>
          <button type="button" class="rw-btn" :disabled="workspaceBusy || !isTauri" @click="emit('pickRolesRoot')">
            {{ t('packEditor.rolesWorkspace.chooseOtherRoot') }}
          </button>
        </div>
      </div>

      <div v-if="isTauri" class="rw-row">
        <div class="rw-role-heading">
          <span class="rw-label">{{ t('packEditor.rolesWorkspace.roleLabel') }}</span>
          <span v-if="availableRoles.length" class="rw-role-count">
            {{ t('packEditor.rolesWorkspace.foundCount', { count: availableRoles.length }) }}
          </span>
        </div>
        <p v-if="roleSelectHint" class="rw-hint">{{ roleSelectHint }}</p>
        <div v-else class="rw-role-grid" role="list">
          <article
            v-for="role in availableRoles"
            :key="role.roleId"
            class="rw-role-card"
            :class="{
              'rw-role-card--selected': selectedRoleId === role.roleId,
              'rw-role-card--legacy': role.needsMigration,
            }"
            role="listitem"
          >
            <div class="rw-role-copy">
              <strong>{{ role.displayName }}</strong>
              <code>{{ role.roleId }}</code>
            </div>
            <span class="rw-role-status" :class="{ 'rw-role-status--legacy': role.needsMigration }">
              {{ t(role.needsMigration
                ? 'packEditor.rolesWorkspace.migrationRequired'
                : 'packEditor.rolesWorkspace.editable') }}
            </span>
            <button
              type="button"
              class="rw-btn rw-btn--primary"
              :disabled="workspaceBusy || role.needsMigration"
              @click="openRole(role.roleId)"
            >
              {{ t(role.needsMigration
                ? 'packEditor.rolesWorkspace.migrationRequired'
                : 'packEditor.rolesWorkspace.openThisRole') }}
            </button>
          </article>
        </div>
      </div>

      <p
        v-if="workspaceMessage"
        class="rw-status"
        :class="{ 'rw-status--err': workspaceMessageIsError }"
        role="status"
      >
        {{ workspaceMessage }}
      </p>

      <details v-if="isTauri" class="rw-import-fallback">
        <summary>{{ t('packEditor.rolesWorkspace.archiveFallback') }}</summary>
        <label class="rw-btn rw-btn--file">
          <input
            type="file"
            accept=".zip,.ocpak,application/zip"
            class="rw-file-input"
            @change="emit('importPack', $event)"
          />
          {{ t('packEditor.start.import.button') }}
        </label>
      </details>
      <div v-else class="rw-secondary rw-secondary--browser">
        <label class="rw-btn rw-btn--file rw-btn--primary">
          <input
            type="file"
            accept=".zip,.ocpak,application/zip"
            class="rw-file-input"
            @change="emit('importPack', $event)"
          />
          {{ t('packEditor.start.import.button') }}
        </label>
      </div>
    </section>

    <details class="rw-details">
      <summary class="rw-details-sum">{{ t('packEditor.start.kickers.community') }}</summary>
      <section class="market-compose-wrap" :aria-label="String(t('packEditor.start.marketCompose.aria'))">
        <h2 class="mc-h2">{{ t('packEditor.start.marketCompose.title') }}</h2>
        <p class="mc-lead">{{ t('packEditor.start.marketCompose.lead') }}</p>
        <textarea
          v-model="marketComposePaste"
          class="mc-textarea"
          rows="8"
          spellcheck="false"
          :placeholder="String(t('packEditor.start.marketCompose.placeholder'))"
        />
        <div class="mc-actions">
          <button type="button" class="mc-btn primary" @click="emit('applyMarketCompose')">
            {{ t('packEditor.start.marketCompose.apply') }}
          </button>
        </div>
      </section>
    </details>
  </div>
</template>

<style scoped>
.rw-card {
  padding: 1.1rem 1.25rem 1.2rem;
  border-radius: var(--fluent-radius-lg);
  border: 1px solid var(--fluent-border-stroke);
  background: color-mix(in srgb, var(--fluent-bg-card) 88%, transparent);
  box-shadow: var(--fluent-shadow-card);
}

.rw-h2 {
  margin: 0 0 0.45rem;
  font-size: 1.05rem;
}

.rw-lead {
  margin: 0 0 1rem;
  font-size: 0.85rem;
  color: var(--fluent-text-secondary);
  line-height: 1.55;
}
.rw-character-card-import {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--fluent-border-stroke);
}
.rw-character-card-import h3 {
  margin: 0;
  font-size: 0.9rem;
}
.rw-character-card-import p {
  margin: 0.3rem 0 0;
  color: var(--fluent-text-secondary);
  font-size: 0.78rem;
  line-height: 1.45;
}
.rw-character-card-note {
  margin-top: 0.45rem !important;
}
@media (max-width: 640px) {
  .rw-character-card-import {
    align-items: stretch;
    flex-direction: column;
  }
}

.rw-card-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.rw-card-heading > div {
  min-width: 0;
}

.rw-mode-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  flex: 0 0 auto;
  padding: 0.3rem 0.55rem;
  border: 1px solid var(--pack-glass-border);
  border-radius: 999px;
  background: var(--pack-glass-fill-subtle);
  color: var(--fluent-text-secondary);
  font-size: 0.72rem;
  font-weight: 600;
}

.rw-mode-dot {
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 50%;
  background: var(--fluent-text-secondary);
}

.rw-mode-badge--desktop {
  color: var(--fluent-accent);
  border-color: color-mix(in srgb, var(--fluent-accent) 35%, var(--pack-glass-border));
}

.rw-mode-badge--desktop .rw-mode-dot {
  background: var(--fluent-accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--fluent-accent) 14%, transparent);
}

.rw-browser-note {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  margin: 0 0 1rem;
  padding: 0.75rem 0.85rem;
  border: 1px solid color-mix(in srgb, var(--fluent-accent) 24%, var(--pack-glass-border));
  border-radius: var(--fluent-radius-lg);
  background: color-mix(in srgb, var(--fluent-accent-subtle) 28%, transparent);
  font-size: 0.82rem;
  line-height: 1.45;
}

.rw-browser-note strong {
  display: block;
  margin-bottom: 0.18rem;
  color: var(--fluent-text-primary);
}

.rw-browser-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.8rem;
  height: 1.8rem;
  flex: 0 0 auto;
  border-radius: 50%;
  background: color-mix(in srgb, var(--fluent-accent) 14%, transparent);
  color: var(--fluent-accent);
  font-weight: 700;
}

.rw-row {
  margin-bottom: 0.85rem;
}

.rw-label {
  display: block;
  margin-bottom: 0.35rem;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--fluent-text-secondary);
}

.rw-root-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  align-items: center;
}

.rw-path {
  flex: 1;
  min-width: min(100%, 12rem);
  padding: 0.4rem 0.55rem;
  border-radius: var(--fluent-radius);
  background: var(--fluent-bg-subtle);
  font-size: 0.75rem;
  word-break: break-all;
}

.rw-btn {
  padding: 0.4rem 0.75rem;
  border-radius: var(--fluent-radius);
  border: 1px solid var(--pack-glass-border);
  background: var(--pack-glass-fill-strong);
  color: var(--fluent-text-primary);
  font-size: 0.78rem;
  cursor: pointer;
}

.rw-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.rw-btn--primary {
  background: var(--fluent-accent);
  border-color: var(--fluent-accent);
  color: #fff;
}

.rw-btn--accent {
  border-color: color-mix(in srgb, var(--rail-accent-editor) 40%, var(--pack-glass-border));
}

.rw-btn--wide {
  width: 100%;
  justify-content: center;
}

.rw-entry-card {
  margin-bottom: 0.75rem;
}

.rw-draft-box {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.85rem;
  padding: 0.65rem 0.75rem;
  border-radius: var(--fluent-radius);
  border: 1px solid var(--pack-glass-border);
  background: var(--pack-glass-fill-subtle);
}

.rw-draft-info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: min(100%, 12rem);
}

.rw-draft-name {
  font-weight: 600;
  font-size: 0.9rem;
}

.rw-draft-meta {
  font-size: 0.75rem;
  color: var(--fluent-text-secondary);
}

.rw-draft-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.rw-draft-empty {
  margin-bottom: 0.75rem;
}

.rw-presets {
  min-width: 0;
  margin: 0 0 0.85rem;
  padding: 0;
  border: 0;
}

.rw-presets legend {
  margin-bottom: 0.15rem;
  padding: 0;
  font-size: 0.82rem;
  font-weight: 700;
}

.rw-preset-lead {
  margin: 0 0 0.6rem;
}

.rw-preset-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.55rem;
}

.rw-preset {
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
  min-width: 0;
  padding: 0.65rem;
  border: 1px solid var(--pack-glass-border);
  border-radius: var(--fluent-radius-lg);
  background: var(--pack-glass-fill-subtle);
  cursor: pointer;
}

.rw-preset--selected {
  border-color: color-mix(in srgb, var(--rail-accent-editor) 58%, var(--pack-glass-border));
  background: color-mix(in srgb, var(--rail-accent-editor-bg) 72%, transparent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--rail-accent-editor) 12%, transparent);
}

.rw-preset input {
  margin: 0.18rem 0 0;
  accent-color: var(--rail-accent-editor);
}

.rw-preset span {
  display: grid;
  gap: 0.18rem;
  min-width: 0;
}

.rw-preset strong {
  font-size: 0.82rem;
}

.rw-preset small {
  color: var(--fluent-text-secondary);
  font-size: 0.74rem;
  line-height: 1.4;
}

.rw-entry-actions {
  margin-bottom: 0.45rem;
}

.rw-entry-note {
  margin-top: 0;
}

.rw-role-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.rw-role-heading .rw-label {
  margin: 0;
}

.rw-role-count {
  color: var(--fluent-text-secondary);
  font-size: 0.72rem;
}

.rw-role-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 15rem), 1fr));
  gap: 0.6rem;
  margin-top: 0.55rem;
}

.rw-role-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.55rem 0.75rem;
  min-width: 0;
  padding: 0.75rem;
  border: 1px solid var(--pack-glass-border);
  border-radius: var(--fluent-radius-lg);
  background: var(--pack-glass-fill-subtle);
}

.rw-role-card--selected {
  border-color: color-mix(in srgb, var(--fluent-accent) 48%, var(--pack-glass-border));
}

.rw-role-card--legacy {
  opacity: 0.78;
}

.rw-role-copy {
  display: grid;
  gap: 0.18rem;
  min-width: 0;
}

.rw-role-copy strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rw-role-copy code {
  overflow: hidden;
  color: var(--fluent-text-secondary);
  font-size: 0.72rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rw-role-status {
  justify-self: end;
  padding: 0.16rem 0.4rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--fluent-accent) 12%, transparent);
  color: var(--fluent-accent);
  font-size: 0.66rem;
  font-weight: 700;
}

.rw-role-status--legacy {
  background: color-mix(in srgb, var(--fluent-danger, #c75555) 10%, transparent);
  color: var(--fluent-danger, #c75555);
}

.rw-role-card .rw-btn {
  grid-column: 1 / -1;
  justify-self: start;
}

.rw-btn--file {
  position: relative;
  cursor: pointer;
}

.rw-file-input {
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

.rw-hint,
.rw-status {
  margin: 0.45rem 0 0;
  font-size: 0.78rem;
  color: var(--fluent-text-secondary);
}

.rw-status--err {
  color: var(--fluent-danger-text, #c62828);
}

.rw-secondary {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-top: 1rem;
  padding-top: 0.85rem;
  border-top: 1px solid var(--pack-glass-border);
}

.rw-secondary--browser {
  margin-top: 0;
  padding-top: 0;
  border-top: 0;
}

.rw-secondary--browser .rw-btn--file {
  min-width: min(100%, 14rem);
  padding: 0.55rem 0.9rem;
  text-align: center;
  font-weight: 600;
}

.rw-import-fallback {
  margin-top: 0.9rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--pack-glass-border);
}

.rw-import-fallback summary {
  margin-bottom: 0.65rem;
  color: var(--fluent-text-secondary);
  font-size: 0.76rem;
  cursor: pointer;
}

@media (max-width: 620px) {
  .rw-card-heading {
    flex-direction: column;
    gap: 0.2rem;
  }

  .rw-preset-grid {
    grid-template-columns: 1fr;
  }
}

.rw-details {
  margin-top: 0.75rem;
  padding: 0.65rem 0.85rem;
  border-radius: var(--fluent-radius-lg);
  border: 1px solid var(--fluent-border-stroke);
  background: color-mix(in srgb, var(--fluent-bg-card) 72%, transparent);
}

.rw-details-sum {
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--fluent-text-secondary);
}

.section-kicker {
  margin: 0 0 0.6rem;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--fluent-accent);
}

.mc-h2 {
  margin: 0 0 0.5rem;
  font-size: 1.05rem;
  font-weight: 600;
}

.mc-lead {
  margin: 0 0 0.85rem;
  font-size: 0.8125rem;
  color: var(--fluent-text-secondary);
  line-height: 1.55;
}

.mc-textarea {
  width: 100%;
  box-sizing: border-box;
  margin-bottom: 0.65rem;
  padding: 0.6rem 0.75rem;
  font-size: 0.78rem;
  font-family: ui-monospace, monospace;
  border-radius: var(--fluent-radius);
  border: 1px solid var(--fluent-border-control);
  background: var(--fluent-bg-subtle);
  color: var(--fluent-text-primary);
  min-height: 140px;
}

.mc-btn.primary {
  padding: 0.5rem 1rem;
  border-radius: var(--fluent-radius);
  border: none;
  background: var(--fluent-accent);
  color: #fff;
  cursor: pointer;
  font-weight: 600;
}
</style>
