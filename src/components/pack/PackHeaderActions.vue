<script setup lang="ts">
import { useI18n } from 'vue-i18n'

defineProps<{
  folderExportOk: boolean
  showSaveDraft?: boolean
}>()

const requireChecksBeforeExport = defineModel<boolean>('requireChecksBeforeExport', {
  default: false,
})

const emit = defineEmits<{
  runValidate: []
  saveDraft: []
  exportOcpak: []
  exportFolder: []
}>()

const { t } = useI18n()
</script>

<template>
  <div class="pack-header-actions" role="group" :aria-label="String(t('packEditor.headerActions.aria'))">
    <button
      v-if="showSaveDraft"
      type="button"
      class="pha-btn pha-btn--save"
      :title="String(t('packEditor.headerActions.saveDraftTitle'))"
      :aria-label="String(t('packEditor.headerActions.saveDraftAria'))"
      @click="emit('saveDraft')"
    >
      {{ t('packEditor.headerActions.saveDraft') }}
    </button>
    <button
      type="button"
      class="pha-btn pha-btn--check"
      :title="String(t('packEditor.headerActions.checkTitle'))"
      :aria-label="String(t('packEditor.headerActions.checkAria'))"
      @click="emit('runValidate')"
    >
      {{ t('packEditor.headerActions.check') }}
    </button>

    <button
      type="button"
      class="pha-btn pha-btn--export-main"
      :title="String(t('packEditor.check.exportOcpak'))"
      @click="emit('exportOcpak')"
    >
      {{ t('packEditor.headerActions.exportOcpak') }}
    </button>
    <button
      v-if="folderExportOk"
      type="button"
      class="pha-btn pha-btn--export-folder"
      :title="String(t('packEditor.headerActions.exportFolderTitle'))"
      @click="emit('exportFolder')"
    >
      {{ t('packEditor.headerActions.exportFolder') }}
    </button>
    <label class="pha-check" :title="String(t('packChecks.sub'))">
      <input v-model="requireChecksBeforeExport" type="checkbox" />
      <span>{{ t('packChecks.requireBeforeExport') }}</span>
    </label>
  </div>
</template>

<style scoped>
.pack-header-actions {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
}

.pha-btn {
  padding: 0.35rem 0.65rem;
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

.pha-btn:hover {
  background: var(--fluent-bg-subtle);
  border-color: var(--fluent-text-secondary);
}

.pha-btn:focus-visible {
  outline: none;
  box-shadow:
    var(--fluent-shadow-soft),
    var(--pack-glass-inset),
    0 0 0 2px rgba(255, 255, 255, 0.92),
    0 0 0 4px var(--fluent-border-focus);
}

.pha-btn:active {
  transform: scale(0.98);
}

.pha-btn--check {
  border-color: color-mix(in srgb, var(--fluent-accent) 35%, var(--pack-glass-border));
}

.pha-btn--save {
  border-color: color-mix(in srgb, var(--rail-accent-editor) 35%, var(--pack-glass-border));
}

.pha-btn--export-main {
  background: var(--fluent-accent);
  color: #fff;
  border-color: var(--fluent-accent);
}

.pha-btn--export-main:hover {
  background: var(--fluent-accent-hover);
  border-color: var(--fluent-accent-hover);
  color: #fff;
}

.pha-btn--export-folder {
  border-color: color-mix(in srgb, var(--fluent-accent) 35%, var(--pack-glass-border));
}

.pha-check {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-left: 0.15rem;
  padding: 0.2rem 0.45rem;
  font-size: 0.72rem;
  color: var(--fluent-text-secondary);
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}

.pha-check input {
  margin: 0;
  accent-color: var(--fluent-accent);
}
</style>
